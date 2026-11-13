# План готовности GarageAI к публичному релизу

Статус на 13.11.2026: проект готов для ограниченной beta, но не допущен к публичному production-релизу. Внешние действия выполняются только из контролируемой среды с отдельными доступами и согласованием.

## Этап 0 — управляемые кодом гейты

- [x] Не раскрывать конфигурацию хранилища в публичном health endpoint; PostgreSQL-проверку подтверждать реальными durable CRUD-сценариями.
- [x] Сверить актуальный deployment status в README и runbook, не смешивая исторические и текущие статусы.
- [x] Реализовать self-service удаление аккаунта: повторная проверка пароля, CSRF, удаление гаража, сессий и email challenges, очистка локального кеша, тесты.
- [ ] Подтвердить полный набор тестов в CI для точного commit SHA текущей ветки.

### CI evidence — commit `1a118f0`

- GitHub Actions run `43412170439`: Node.js checks (включая PostgreSQL и HTTP integration) и Python dependency security audit прошли.
- Gitleaks заблокировал run: шесть исторических `tokenHash`/`csrfSecret` в `data/sessions.json` из коммитов `433a567` и `b24b8e5`. Эти значения не являются ложными срабатываниями и не должны добавляться в allowlist.

## Этап 1 — выпуск и наблюдение

- [ ] Открыть PR, дождаться зелёного CI: Node, PostgreSQL, HTTP integration, Docker, Python audit и Gitleaks.
- [ ] Развернуть точный проверенный SHA на private canary и выполнить Cloud SQL preflight/smoke.
- [ ] Задокументировать окно наблюдения: ошибки, latency, Cloud SQL connections/CPU/storage, логи и rollback.
- [ ] Подтвердить доставку production email-кода в независимый mailbox.

## Этап 2 — данные и privacy

- [ ] Независимо подтвердить происхождение legacy bundle и результаты import/reconciliation.
- [ ] Согласовать уведомления и провести coordinated Git history rewrite; до него сохранить легитимные данные вне репозитория и ротировать затронутые ключи.
- [ ] Утвердить реквизиты оператора, retention и процедуру обработки запросов субъектов данных.

## Этап 3 — предметные данные и AI

- [ ] Не повышать статус fitment-рекомендаций выше `provisional` без источников; добавить авторитетные evidence для модификаций.
- [ ] Проверить Cloud Run OIDC/IAM, Secret Manager и Vertex AI на private agents service; сохранять agents disabled для обычных пользователей до результата.

## Негейтирующие улучшения

- [x] Разбить frontend bundle: entry chunk сокращён примерно с 643 KB до 216 KB; `/`, `/app` и legal pages загружаются отдельно, крупнейший chunk — mobile app 395 KB.
