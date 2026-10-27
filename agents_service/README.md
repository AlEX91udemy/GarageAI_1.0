# GarageAI agents

Мультиагентный сервис использует Google GenAI SDK напрямую, без Google ADK runtime. Это позволяет применять исправленную OpenTelemetry API без конфликта ограничений ADK.

- `architect` — архитектура и риски;
- `developer` — изменения в коде;
- `qa` — тесты и регрессии;
- `ops` — Cloud Run, секреты, логи и поддержка.

Агенты работают в режиме предложений: они не изменяют файлы и не запускают команды. Для анализа API передаёт ограниченный снимок исходников (до 40 файлов и 45 000 символов), исключая runtime-данные, lock-файлы и виртуальные окружения; некоторые строки с назначениями секретов маскируются. Это не заменяет хранение секретов вне репозитория.

## Запуск в PowerShell

Из корня репозитория:

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r agents_service\requirements.txt
python -m uvicorn agents_service.app:app --host 0.0.0.0 --port 8080
```

Ключ `GEMINI_API_KEY` берётся из `.env` в корне проекта. Для Vertex AI настройте Application Default Credentials и `GOOGLE_GENAI_USE_VERTEXAI=1`.

**Защита API:** `POST /agents/run` требует секрет `AGENTS_API_TOKEN` и ограничен пятью авторизованными запросами в минуту на IP (ограничение локально для одного экземпляра сервиса). Если переменная не задана, запуск платных агентов отключён (503); при отсутствии/неверном заголовке `X-Agents-Token` возвращается 401. Не встраивайте токен во frontend или публичный репозиторий. Для Cloud Run храните его в Secret Manager и передавайте только от доверенного backend-сервиса. Ограничьте ingress/IAM: токен — дополнительная защита, а не замена IAM.

Локально создайте токен и задайте его в текущем PowerShell-сеансе:

```powershell
$env:AGENTS_API_TOKEN = python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Проверка:

```powershell
Invoke-RestMethod http://127.0.0.1:8080/health
```

Пример задачи для всех агентов:

```powershell
$body = @{ task = 'Проверь готовность GarageAI к выпуску новой функции диагностики' } | ConvertTo-Json
$headers = @{ 'X-Agents-Token' = $env:AGENTS_API_TOKEN }
Invoke-RestMethod http://127.0.0.1:8080/agents/run -Method Post -Headers $headers -ContentType 'application/json' -Body $body
```

Можно выбрать роли: `architect`, `developer`, `qa`, `ops`, `argon_reviewer`.
