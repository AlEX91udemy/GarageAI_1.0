"""Focused security tests for the paid agent execution endpoint."""
import asyncio
import os
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from starlette.requests import Request

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
        self.assertNotIn("--- FILE: data/garage_store.json ---", snapshot)
        self.assertNotIn("package-lock.json", snapshot)
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


if __name__ == "__main__":
    unittest.main()
