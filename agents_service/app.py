"""Four GarageAI maintenance agents exposed through a small ADK API."""
from __future__ import annotations

import asyncio
import hmac
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, Field
from google.genai import types
from google.adk.agents import LlmAgent
from google.adk.runners import InMemoryRunner

load_dotenv()
REPO_ROOT = Path(__file__).resolve().parents[1]
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
ARGON_MODEL = os.getenv("ARGON_MODEL", "gemini-4-argon")
AGENT_BRIEFS = {
    "architect": "Review GarageAI architecture. Identify risks, dependencies, and an implementation plan. Do not edit files.",
    "developer": "Act as a senior TypeScript and Python developer. Propose a minimal maintainable patch with exact file changes. Do not edit files.",
    "qa": "Act as a QA engineer. Identify regressions and missing coverage, and provide verification commands. Do not edit files.",
    "ops": "Act as a DevOps and support engineer. Review secrets, Cloud Run readiness, logging, and recovery. Provide actionable steps. Do not edit files.",
    "argon_reviewer": "Act as the final production code reviewer. Audit the repository for bugs, security issues, API and authorization errors, data integrity risks, test gaps, and deployment problems. For every finding include severity (critical/high/medium/low), file, line or symbol, cause, fix, and verification command. Do not edit files. Return a concise report.",
}

class AgentRequest(BaseModel):
    task: str = Field(min_length=3, max_length=8000)
    agents: list[str] | None = None

class AgentResponse(BaseModel):
    task: str
    results: dict[str, str]

def _repo_snapshot() -> str:
    allowed = {".ts", ".tsx", ".json", ".md", ".py", ".yml", ".yaml", ".toml"}
    files = []
    for path in REPO_ROOT.rglob("*"):
        if not path.is_file() or {"node_modules", ".venv-adk", ".git"}.intersection(path.parts):
            continue
        if path.suffix in allowed:
            files.append(str(path.relative_to(REPO_ROOT)))
    return "Repository files (sample):\n" + "\n".join(sorted(files)[:250])

def _build_agents() -> dict[str, LlmAgent]:
    return {
        name: LlmAgent(
            name=f"garageai_{name}",
            model=ARGON_MODEL if name == "argon_reviewer" else MODEL,
            mode="task",
            instruction=brief,
        )
        for name, brief in AGENT_BRIEFS.items()
    }

async def _run_agent(agent: LlmAgent, name: str, prompt: str) -> str:
    runner = InMemoryRunner(agent=agent, app_name=f"garageai_{name}")
    session = await runner.session_service.create_session(app_name=f"garageai_{name}", user_id="local-user")
    content = types.Content(role="user", parts=[types.Part(text=prompt)])
    chunks = []
    async for event in runner.run_async(user_id="local-user", session_id=session.id, new_message=content):
        if event.content and event.content.parts:
            chunks.extend(part.text for part in event.content.parts if part.text)
    await runner.close()
    return "\n".join(chunks).strip() or "Агент не вернул текстовый ответ."

app = FastAPI(title="GarageAI Agents", version="1.0.0")

# Per-instance backstop. Cloud Run IAM/ingress remains the primary boundary;
# use a shared limiter if this service is scaled horizontally.
_AGENT_RATE_WINDOW_SECONDS = 60
_AGENT_RATE_LIMIT = 5
_agent_request_windows: dict[str, tuple[float, int]] = {}


def _allow_agent_request(client_ip: str, now: float | None = None) -> tuple[bool, int]:
    import time

    current_time = time.monotonic() if now is None else now
    for key, (started_at, _) in list(_agent_request_windows.items()):
        if current_time - started_at >= _AGENT_RATE_WINDOW_SECONDS:
            _agent_request_windows.pop(key, None)
    window = _agent_request_windows.get(client_ip)
    if window is None and len(_agent_request_windows) >= 10000:
        return False, _AGENT_RATE_WINDOW_SECONDS
    if window is None or current_time - window[0] >= _AGENT_RATE_WINDOW_SECONDS:
        _agent_request_windows[client_ip] = (current_time, 1)
        return True, 0
    if window[1] >= _AGENT_RATE_LIMIT:
        retry_after = max(1, int(_AGENT_RATE_WINDOW_SECONDS - (current_time - window[0])))
        return False, retry_after
    _agent_request_windows[client_ip] = (window[0], window[1] + 1)
    return True, 0

def _env_flag(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}

@app.get("/health")
async def health() -> dict[str, Any]:
    return {"status": "ok", "agents": list(AGENT_BRIEFS), "model": MODEL, "argon_model": ARGON_MODEL}

@app.get("/agents/run")
async def run_agents_help() -> dict[str, Any]:
    return {
        "message": "Для запуска агентов отправьте POST-запрос с JSON-полем task.",
        "agents": list(AGENT_BRIEFS),
        "example": {"task": "Проверь готовность проекта", "agents": ["architect", "qa"]},
    }

@app.post("/agents/run", response_model=AgentResponse)
async def run_agents(
    request: AgentRequest,
    x_agents_token: str | None = Header(default=None, alias="X-Agents-Token"),
) -> AgentResponse:
    # Fail closed: never allow paid model calls unless an application token is configured.
    expected_token = os.getenv("AGENTS_API_TOKEN", "")
    if not expected_token:
        raise HTTPException(503, "Agent API is disabled: configure AGENTS_API_TOKEN.")
    if not x_agents_token or not hmac.compare_digest(x_agents_token, expected_token):
        raise HTTPException(401, "Invalid or missing agent API token.")
    selected = request.agents or list(AGENT_BRIEFS)
    unknown = sorted(set(selected) - set(AGENT_BRIEFS))
    if unknown:
        raise HTTPException(400, f"Unknown agents: {', '.join(unknown)}")
    if not os.getenv("GEMINI_API_KEY") and not _env_flag("GOOGLE_GENAI_USE_VERTEXAI"):
        raise HTTPException(503, "Set GEMINI_API_KEY or configure Vertex AI credentials first.")
    prompt = f"Task: {request.task}\n\n{_repo_snapshot()}"
    agents = _build_agents()
    try:
        values = await asyncio.gather(*(_run_agent(agents[name], name, prompt) for name in selected))
    except Exception as exc:
        # Keep provider credentials and verbose SDK traces out of API responses.
        message = str(exc)
        if "PERMISSION_DENIED" in message or "aiplatform.endpoints.predict" in message:
            raise HTTPException(502, "Vertex AI отклонил запрос: аккаунту ADC нужна роль Vertex AI User в выбранном проекте.") from exc
        if "401" in message or "UNAUTHENTICATED" in message:
            raise HTTPException(502, "Провайдер Gemini отклонил авторизацию. Проверьте выбранный способ входа.") from exc
        raise HTTPException(502, "Провайдер ИИ временно недоступен.") from exc
    return AgentResponse(task=request.task, results=dict(zip(selected, values)))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", os.getenv("AGENTS_PORT", "8080"))))
