# План готовности GarageAI к публичному релизу

Статус на 13.11.2026: проект готов для ограниченной beta, но не допущен к публичному production-релизу. Внешние действия выполняются только из контролируемой среды с отдельными доступами и согласованием.

## Этап 0 — управляемые кодом гейты

- [x] Не раскрывать конфигурацию хранилища в публичном health endpoint; PostgreSQL-проверку подтверждать реальными durable CRUD-сценариями.
- [x] Сверить актуальный deployment status в README и runbook, не смешивая исторические и текущие статусы.
- [x] Реализовать self-service удаление аккаунта: повторная проверка пароля, CSRF, удаление гаража, сессий и email challenges, очистка локального кеша, тесты.
- [x] Не выдавать локальный справочник за подтверждённую комплектацию: при выборе поколения показать обязательную сверку двигателя, КПП, привода и года по VIN/официальной документации.
- [x] Проверять deployment-конфигурацию в CI: `.env.example` содержит обязательные runtime-переменные без credential defaults, контракт запускается через `npm run config:check`.
- [x] Добавить post-deploy health contract (`npm run release:verify-health`), который не допускает публичную выдачу конфигурационных/tenant-полей.
- [ ] Подтвердить полный набор тестов в CI для точного commit SHA текущей ветки.

### CI evidence — product commit `e3fa304`

- GitHub Actions run `43425837718`: Node.js checks (включая deployment-конфигурацию, PostgreSQL, HTTP integration, Docker, Cloudflare dry run и public-health gate) и Python dependency security audit прошли.
- Gitleaks заблокировал run: шесть исторических `tokenHash`/`csrfSecret` в `data/sessions.json` из коммитов `433a567` и `b24b8e5`. Эти значения не являются ложными срабатываниями и не должны добавляться в allowlist.
- Workers Builds в Cloudflare также завершился ошибкой; локальный и CI dry run прошли, а причина требует просмотра лога в аккаунте Cloudflare.
- 13.11.2026 read-only проверка публичного Worker вернула устаревший контракт с `storageProvider: "postgresql"`; текущая ветка это поле не выдаёт. Внешний Worker необходимо обновить проверенным SHA и затем выполнить `npm run release:verify-health`.
- 13.11.2026 Worker опубликован штатной командой `npm run cloudflare:deploy`: версия `47687c82-a35f-4164-ba5e-01ee3a57fac1` получает 100% трафика; предыдущая версия `cc7100e9-aa51-4509-94ad-fc2531cf240f` доступна для rollback. Health gate всё ещё находит `storageProvider`, поэтому устарел именно подключённый Cloud Run API origin. Откат Worker не выполнялся: доступность не ухудшилась, а проблема не внесена этим deploy.
- 13.11.2026 backend revision `garageai-web-canary-00008-hal` развёрнута без traffic, прошла tagged HTTPS health gate, затем получила 100% traffic. Публичный Worker health gate теперь зелёный и не возвращает `storageProvider`; rollback revision `garageai-web-canary-00006-dqm` осталась `Ready`. Read-only запрос error-логов новой revision за 30 минут не вернул записей уровня `ERROR`.

## Этап 1 — выпуск и наблюдение

- [ ] Открыть PR, дождаться зелёного CI: Node, PostgreSQL, HTTP integration, Docker, Python audit и Gitleaks.
- [x] Развернуть точный проверенный backend на private/tagged canary и выполнить Cloud SQL health smoke без переключения traffic.
- [x] Развернуть текущий backend на Cloud Run API origin и подтвердить `GARAGE_PUBLIC_URL=https://garageai-1-0.sambur91.workers.dev npm run release:verify-health` после переключения traffic.
- [ ] Задокументировать окно наблюдения: ошибки, latency, Cloud SQL connections/CPU/storage, логи и rollback.
- [ ] Подтвердить доставку production email-кода в независимый mailbox.

## Этап 2 — данные и privacy

- [ ] Независимо подтвердить происхождение legacy bundle и результаты import/reconciliation.
- [ ] Согласовать уведомления и провести coordinated Git history rewrite; до него сохранить легитимные данные вне репозитория и ротировать затронутые ключи.
  - Runbook подготовки: [`docs/git-history-secret-remediation.md`](../docs/git-history-secret-remediation.md).
- [ ] Утвердить реквизиты оператора, retention и процедуру обработки запросов субъектов данных.

## Этап 3 — предметные данные и AI

- [ ] Не повышать статус fitment-рекомендаций выше `provisional` без источников; добавить авторитетные evidence для модификаций.
- [ ] Проверить Cloud Run OIDC/IAM, Secret Manager и Vertex AI на private agents service; сохранять agents disabled для обычных пользователей до результата.

## Негейтирующие улучшения

- [x] Разбить frontend bundle: entry chunk сокращён примерно с 643 KB до 216 KB; `/`, `/app` и legal pages загружаются отдельно, крупнейший chunk — mobile app 395 KB.
