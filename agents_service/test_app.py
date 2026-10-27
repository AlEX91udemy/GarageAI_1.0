"""Focused security tests for the paid agent execution endpoint."""
import asyncio
import os
import unittest
from unittest.mock import patch

from fastapi import HTTPException

from agents_service.app import AgentRequest, run_agents


class AgentEndpointAuthTests(unittest.TestCase):
    def test_disabled_when_api_token_is_not_configured(self):
        with patch.dict(os.environ, {"AGENTS_API_TOKEN": ""}, clear=False):
            with self.assertRaises(HTTPException) as ctx:
                asyncio.run(run_agents(AgentRequest(task="review project"), None))
        self.assertEqual(ctx.exception.status_code, 503)

    def test_rejects_missing_token(self):
        with patch.dict(os.environ, {"AGENTS_API_TOKEN": "expected-secret"}, clear=False):
            with self.assertRaises(HTTPException) as ctx:
                asyncio.run(run_agents(AgentRequest(task="review project"), None))
        self.assertEqual(ctx.exception.status_code, 401)

    def test_rejects_wrong_token(self):
        with patch.dict(os.environ, {"AGENTS_API_TOKEN": "expected-secret"}, clear=False):
            with self.assertRaises(HTTPException) as ctx:
                asyncio.run(run_agents(AgentRequest(task="review project"), "wrong-secret"))
        self.assertEqual(ctx.exception.status_code, 401)

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
                asyncio.run(run_agents(AgentRequest(task="review project"), "expected-secret"))
        self.assertEqual(ctx.exception.status_code, 503)
        self.assertIn("GEMINI_API_KEY", str(ctx.exception.detail))


if __name__ == "__main__":
    unittest.main()
