# GarageAI agents

Четыре агента Google ADK анализируют репозиторий и возвращают план работы:

- `architect` — архитектура и риски;
- `developer` — изменения в коде;
- `qa` — тесты и регрессии;
- `ops` — Cloud Run, секреты, логи и поддержка.

Агенты работают в режиме предложений: они не изменяют файлы и не запускают команды.

## Запуск в PowerShell

Из корня репозитория:

```powershell
.\.venv-adk\Scripts\Activate.ps1
python -m pip install -r agents_service\requirements.txt
python -m uvicorn agents_service.app:app --host 0.0.0.0 --port 8080
```

Ключ `GEMINI_API_KEY` берётся из `.env` в корне проекта. Для Vertex AI настройте Application Default Credentials и `GOOGLE_GENAI_USE_VERTEXAI=1`.

Проверка:

```powershell
Invoke-RestMethod http://127.0.0.1:8080/health
```

Пример задачи для всех агентов:

```powershell
$body = @{ task = 'Проверь готовность GarageAI к выпуску новой функции диагностики' } | ConvertTo-Json
Invoke-RestMethod http://127.0.0.1:8080/agents/run -Method Post -ContentType 'application/json' -Body $body
```

Можно выбрать отдельных агентов: `architect`, `developer`, `qa`, `ops`.
