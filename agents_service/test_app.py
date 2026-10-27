"""Focused security tests for the paid agent execution endpoint."""
import asyncio
import os
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from starlette.requests import Request

import re

from agents_service.app import AgentRequest, run_agents, _agent_request_windows, _repo_snapshot


def make_request(client_ip: str = "127.0.0.1") -> Request:
    return Request({
        "type": "http",
        "method": "POST",
        "path": "/agents/run",
        "headers": [],
        "client": (client_ip, 12345),
        "server": ("testserver", 80),
        "scheme": "http",
        "query_string": b"",
    })


class AgentEndpointAuthTests(unittest.TestCase):
    def setUp(self):
        _agent_request_windows.clear()

    def test_snapshot_contains_source_but_excludes_runtime_data(self):
        snapshot = _repo_snapshot()
        self.assertIn("--- FILE: server.ts ---", snapshot)
        self.assertIn("import express from", snapshot)
        self.assertIn("function requireAuth", snapshot)
        self.assertIn("async def run_agents", snapshot)
        self.assertIn("password: string", snapshot)
        included_files = re.findall(r"^--- FILE: (.+) ---$", snapshot, flags=re.MULTILINE)
        self.assertNotIn("data/garage_store.json", included_files)
        self.assertNotIn("package-lock.json", included_files)
        self.assertLessEqual(len(snapshot), 46000)

    def test_disabled_when_api_token_is_not_configured(self):
        with patch.dict(os.environ, {"AGENTS_API_TOKEN": ""}, clear=False):
            with self.assertRaises(HTTPException) as ctx:
                asyncio.run(run_agents(AgentRequest(task="review project"), make_request(), None))
        self.assertEqual(ctx.exception.status_code, 503)

    def test_rejects_missing_token(self):
        with patch.dict(os.environ, {"AGENTS_API_TOKEN": "expected-secret"}, clear=False):
            with self.assertRaises(HTTPException) as ctx:
                asyncio.run(run_agents(AgentRequest(task="review project"), make_request(), None))
        self.assertEqual(ctx.exception.status_code, 401)

    def test_rejects_wrong_token(self):
        with patch.dict(os.environ, {"AGENTS_API_TOKEN": "expected-secret"}, clear=False):
            with self.assertRaises(HTTPException) as ctx:
                asyncio.run(run_agents(AgentRequest(task="review project"), make_request(), "wrong-secret"))
        self.assertEqual(ctx.exception.status_code, 401)

    def test_rate_limit_blocks_sixth_authorized_request(self):
        with patch.dict(
            os.environ,
            {
                "AGENTS_API_TOKEN": "expected-secret",
                "GEMINI_API_KEY": "",
                "GOOGLE_GENAI_USE_VERTEXAI": "",
            },
            clear=False,
        ):
            for _ in range(5):
                with self.assertRaises(HTTPException) as ctx:
                    asyncio.run(run_agents(AgentRequest(task="review project"), make_request("192.0.2.1"), "expected-secret"))
                self.assertEqual(ctx.exception.status_code, 503)
            with self.assertRaises(HTTPException) as ctx:
                asyncio.run(run_agents(AgentRequest(task="review project"), make_request("192.0.2.1"), "expected-secret"))
        self.assertEqual(ctx.exception.status_code, 429)
        self.assertIn("Retry-After", ctx.exception.headers)

    def test_orchestrator_runs_selected_agents_with_source_snapshot(self):
        calls = []

        async def fake_run_agent(agent, name, prompt):
            calls.append((name, prompt))
            return f"{name} result"

        with patch.dict(
            os.environ,
            {
                "AGENTS_API_TOKEN": "expected-secret",
                "GEMINI_API_KEY": "",
                "GOOGLE_GENAI_USE_VERTEXAI": "true",
            },
            clear=False,
        ), patch("agents_service.app._build_agents", return_value={
            "architect": object(),
            "qa": object(),
        }), patch("agents_service.app._run_agent", side_effect=fake_run_agent):
            response = asyncio.run(
                run_agents(
                    AgentRequest(task="Audit tenant isolation", agents=["architect", "qa"]),
                    make_request("192.0.2.2"),
                    "expected-secret",
                )
            )

        self.assertEqual(response.task, "Audit tenant isolation")
        self.assertEqual(response.results, {
            "architect": "architect result",
            "qa": "qa result",
        })
        self.assertEqual({name for name, _ in calls}, {"architect", "qa"})
        self.assertTrue(all("Audit tenant isolation" in prompt for _, prompt in calls))
        self.assertTrue(all("--- FILE: server.ts ---" in prompt for _, prompt in calls))

    def test_rate_limit_uses_trusted_caller_identity_when_provided(self):
        from agents_service.app import _allow_agent_request

        with patch.dict(os.environ, {"AGENTS_API_TOKEN": "expected-secret"}, clear=False), patch(
            "agents_service.app._allow_agent_request", return_value=(False, 30)
        ) as rate_limit:
            with self.assertRaises(HTTPException) as ctx:
                asyncio.run(
                    run_agents(
                        AgentRequest(task="review project"),
                        make_request("192.0.2.99"),
                        "expected-secret",
                        "user-abc",
                    )
                )
        self.assertEqual(ctx.exception.status_code, 429)
        rate_limit.assert_called_once_with("user:user-abc")

    def test_rejects_empty_or_duplicate_agent_selections(self):
        with patch.dict(
            os.environ,
            {
                "AGENTS_API_TOKEN": "expected-secret",
                "GEMINI_API_KEY": "",
                "GOOGLE_GENAI_USE_VERTEXAI": "false",
            },
            clear=False,
        ):
            for index, selection in enumerate(([], ["qa", "qa"])):
                with self.subTest(selection=selection):
                    with self.assertRaises(HTTPException) as ctx:
                        asyncio.run(
                            run_agents(
                                AgentRequest(task="review project", agents=selection),
                                make_request(f"192.0.2.{10 + index}"),
                                "expected-secret",
                            )
                        )
                    self.assertEqual(ctx.exception.status_code, 400)

    def test_valid_token_reaches_provider_configuration_check(self):
        with patch.dict(
            os.environ,
            {
                "AGENTS_API_TOKEN": "expected-secret",
                "GEMINI_API_KEY": "",
                "GOOGLE_GENAI_USE_VERTEXAI": "",
            },
            clear=False,
        ):
            with self.assertRaises(HTTPException) as ctx:
                asyncio.run(run_agents(AgentRequest(task="review project"), make_request(), "expected-secret"))
        self.assertEqual(ctx.exception.status_code, 503)
        self.assertIn("GEMINI_API_KEY", str(ctx.exception.detail))


class AgentRunnerLifecycleTests(unittest.IsolatedAsyncioTestCase):
    async def test_runner_closes_and_text_chunks_are_joined_with_newlines(self):
        from types import SimpleNamespace

        from agents_service.app import _run_agent

        class FakeSessionService:
            async def create_session(self, **_kwargs):
                return SimpleNamespace(id="session-1")

        class FakeRunner:
            def __init__(self, **_kwargs):
                self.session_service = FakeSessionService()
                self.closed = False

            async def run_async(self, **_kwargs):
                for value in ("first line", "second line"):
                    yield SimpleNamespace(
                        content=SimpleNamespace(
                            parts=[SimpleNamespace(text=value)]
                        )
                    )

            async def close(self):
                self.closed = True

        runner = FakeRunner()
        with patch("agents_service.app.InMemoryRunner", return_value=runner):
            result = await _run_agent(object(), "qa", "test prompt")

        self.assertEqual(result, "first line\nsecond line")
        self.assertTrue(runner.closed)

    async def test_runner_closes_when_model_execution_raises(self):
        from types import SimpleNamespace

        from agents_service.app import _run_agent

        class FakeSessionService:
            async def create_session(self, **_kwargs):
                return SimpleNamespace(id="session-1")

        class FakeRunner:
            def __init__(self, **_kwargs):
                self.session_service = FakeSessionService()
                self.closed = False

            async def run_async(self, **_kwargs):
                raise RuntimeError("simulated provider failure")
                yield  # Make this an async generator.

            async def close(self):
                self.closed = True

        runner = FakeRunner()
        with patch("agents_service.app.InMemoryRunner", return_value=runner):
            with self.assertRaisesRegex(RuntimeError, "simulated provider failure"):
                await _run_agent(object(), "qa", "test prompt")

        self.assertTrue(runner.closed)


if __name__ == "__main__":
    unittest.main()
