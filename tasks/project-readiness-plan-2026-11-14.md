# GarageAI: оценка готовности и план улучшений

Дата проверки: 14.11.2026

## Решение о готовности

Кодовая часть прошла основной CI на `e3fa304d4c959cb05a80e094d2134809b9aea7ce`: Node.js, PostgreSQL, сборки контейнеров, каталог и Python security jobs успешны. Общий CI завершился ошибкой Gitleaks из-за реальных исторических данных сессий. Дополнительно код подтверждает, что успешная регистрация сбрасывает общий с login IP-счётчик, поэтому серия успешных регистраций не получает устойчивого ограничения. Публичный запуск не следует объявлять готовым, пока этот пробел, privacy/security gate, подтверждение email-доставки и эксплуатационное наблюдение не закрыты.

По журналу от 13.11 revision `garageai-web-canary-00008-hal` обслуживает 100% API-трафика Worker, то есть это уже активный маршрут, а не canary с малой долей трафика. После rollout зафиксированы зелёный публичный health gate и 30 минут без Cloud Run ERROR. До изменения доступа нужно проверить, является ли такая внешняя доступность намеренной и ограничены ли регистрация и аудитория. В этом аудите production-конфигурация не менялась.

## Подтверждённые результаты

- Зафиксированная CI-база `e3fa304` не включает текущие изменения OCR и каталога/recommendations в рабочем дереве. Текущий HEAD на момент аудита `ff9f877`; локальные незакоммиченные изменения требуют полного CI на итоговом SHA перед релизом.
- CI run `43425837718` на SHA `e3fa304`: Node.js tests/typecheck/build, Worker dry run, web и agents container builds, catalog audit, PostgreSQL schema/migration/persistence/importer/smoke/HTTP integration, npm audits прошли; Python syntax/authentication/dependency audit прошли. Secret scanning завершился ошибкой на исторических данных. Этот run предшествует текущей auth/OCR/catalog работе.
- Прямой TypeScript check, `scripts/check-env-example.mjs` (35 ключей), `scripts/audit-postgres-schema.mjs` и `npm audit --omit=dev` прошли в локальном окружении. Production dependency audit сообщил 0 известных уязвимостей.
- В рамках продолжения аудита реализован утверждённый registration flow: обязательный email, pending-аккаунт, challenge verification, отдельная quota 5/IP/15 минут, миграция 003 и обновлённые web/mobile формы. Добавлены storage/client/HTTP contract tests; production mailbox и live PostgreSQL gates ещё не запускались.
- Изолированный локальный HTTP smoke на собранном backend прошёл: `/api/health` = 200; пять регистраций с одного IP = 202, шестая = 429; login до подтверждения = 403 `EMAIL_NOT_VERIFIED`; неверный код = 401; корректный код = 200 с session cookie; повторное использование кода = 401. Smoke использовал временное test JSON-хранилище и capture-файл, production данные не затрагивались.
- Полный локальный Vitest suite на текущем дереве прошёл: 28 test files, 161 tests. Scanner/auth subset также прошёл: 3 files, 31 tests. Catalog audit завершился с кодом 0: 110 записей проверены, но 100 остаются provisional и 10 partially_verified из-за отсутствия авторитетных evidence; это не является production catalog acceptance.
- Команды, изменяющие данные автомобиля и его журнал (пробег, параметры, цвет/3D-модель, добавление/удаление автомобиля, сервисные записи, заправки, регламент, детали, задачи, тюнинг, напоминания и backup import), проходят общий confirmVehicleCommand перед локальной и серверной записью. Это подтверждено TypeScript-проверкой и unit/UI тестами; полный Vitest suite на текущем дереве прошёл.
- Импорт данных 18 пользователей и 18 гаражей, preflight, PostgreSQL smoke и restore rehearsal описаны в deployment record от 11.11; источник импортированного legacy bundle всё ещё требует независимого подтверждения.
- Email-code request к production API и отправка Resend приняли запрос 12.11 (HTTP 200); получение письма в независимом mailbox не подтверждено. В deployment log от 11.11 домен Resend отмечен Verified, DKIM TXT и `send` CNAME видны в публичном DNS.
- История Git содержит удалённые из текущего дерева `data/sessions.json` и `data/garage_store.json`. Gitleaks подтвердил реальные исторические `tokenHash`/`csrfSecret`; не добавлять эти находки в allowlist.
- В локальном окружении конфигурационная проверка, schema contract, production-сборки Vite/esbuild и catalog audit завершились успешно. CI на `e3fa304` успешно прошёл соответствующие проверки, кроме отдельного Gitleaks job.
- CI run `43425837718` не равен полному зелёному статусу: итоговый conclusion `failure`. PR status проверить не удалось (GitHub API вернул 401).
- Повторная проверка текущего рабочего дерева: `tsc --noEmit`, env example (35 ключей), PostgreSQL schema contract, полный Vitest (28 файлов/161 тест) и `git diff --check` прошли. CI результаты относятся только к SHA `e3fa304`, который не содержит текущие auth/OCR/catalog изменения.
- Подготовлен [`gcp-production-rollout.md`](../docs/gcp-production-rollout.md) с лимитами расходов, порядком деплоя Cloud Run/Cloud SQL/private agents, smoke gates и rollback. В текущем окружении `gcloud` отсутствует и сессия Google Cloud не аутентифицирована, поэтому команды rollout не выполнялись и production readiness ими не подтверждена.
- Финальный прогон текущего дерева: `tsc --noEmit`, `scripts/check-env-example.mjs`, `scripts/audit-postgres-schema.mjs`, полный Vitest, catalog audit, production builds и `git diff --check` прошли. Эти локальные результаты не заменяют полный CI на итоговом SHA.
- Дополнительно прошёл локальный tenant-isolation HTTP integration test: 1 файл, 13 тестов. Scanner/source helper scripts прошли `node --check`.
- Read-only Cloud Run evidence получена через gcloud: service IAM сейчас содержит `allUsers` для `roles/run.invoker`; revision `garageai-web-canary-00008-hal` обслуживает 100% трафика, latest ready revision — `00011-xit`, а tags `release-20261113` и `agents-smoke` существуют. Billing для проекта включён. Это подтверждает внешний маршрут, но не подтверждает корректность его назначения или release SHA.
- GCP preflight остановился до deployment: скрипт сообщил, что обязательные APIs (Run, Artifact Registry, Cloud Build, Secret Manager, SQL Admin, Vertex AI, Logging, Monitoring) не обнаружены как enabled в текущем gcloud context. Никакие API, IAM, billing или secrets не изменялись.

## P0 — до объявления публичного запуска

### 1. Проверить фактическую доступность и назначение текущего трафика

Подтвердить, что 100% Worker API traffic на revision `00008-hal` ожидаемы; проверить доступность, мониторинг и процедуру остановки трафика. Сопоставить revision/container digest с проверенным commit SHA.

**Готово, когда:** владелец подтвердил назначение маршрута и ожидаемую аудиторию; deployed artifact связан с проверенным SHA, rollback/stop procedure документирована.

Операционный порядок и бюджетные ограничения описаны в [GCP production rollout runbook](../docs/gcp-production-rollout.md). Перед выполнением команд нужно сохранить точный SHA, image digest, Cloud Run revision и Worker version.

### 2. Реализовать утверждённый режим регистрации и закрыть обход лимита

Решение владельца (2026-11-14): открытая регистрация с обязательным подтверждением email; не более 5 новых аккаунтов с одного IP за 15 минут. Серверный и клиентский поток переведён на pending-аккаунт без сессии, email challenge и отдельную registration quota. Осталось подтвердить HTTP-flow на JSON/PostgreSQL, реальную proxy-цепочку и production delivery.

Реализовано: валидированный нормализованный email; pending-аккаунт без сессии; одноразовый код с TTL и лимитом попыток; запрет входа до подтверждения; выдача сессии после успешной проверки; отдельная квота регистрации в JSON и PostgreSQL; fail-closed при недоступности PostgreSQL; web/mobile переход к экрану кода; миграция 003 с backfill legacy email accounts.

Для IP-лимитов проверить реальную цепочку Cloudflare Worker → Cloud Run, значение `TRUSTED_PROXY_HOPS` и наблюдаемый `req.ip`; тестом подтвердить, что поддельный `X-Forwarded-For` не позволяет обходить квоту. Worker создаёт upstream Request из входящего Request без явной нормализации этого заголовка. `.env.example` задаёт `0`, README и deployment runbook рекомендуют `1`; фактическое production-значение неизвестно. Не считать подделку заголовка подтверждённым обходом, пока не проверена deployed цепочка.

**Готово, когда:** HTTP-тест подтверждает пять принятых регистраций и 429 на шестой запрос с того же IP; успешный signup не сбрасывает quota; неправильный, просроченный и повторно использованный код не выдают сессию; корректный код выдаёт сессию; существующий аккаунт сохраняет вход. Покрыты JSON/PostgreSQL bucket paths, PostgreSQL fail-closed и обе клиентские формы. Proxy test фиксирует поведение spoofed `X-Forwarded-For` при реальной модели Worker → Cloud Run. Миграция 003 применена и проверена контролируемо до rollout. Сейчас добавлены storage/client contract tests; серверный HTTP и production mailbox gates остаются обязательными.

### 3. Устранить исторические данные сессий из Git history

Следовать [`docs/git-history-secret-remediation.md`](../docs/git-history-secret-remediation.md): сначала backup и подтверждение легитимных данных вне Git, затем контролируемая ротация затронутых live sessions/secrets, согласование clones/forks/CI caches, mirror rewrite и Gitleaks scan без allowlist. Не переписывать историю и не отзывать production-сессии в рамках обычного локального аудита.

**Готово, когда:** старый файл сессий отсутствует во всех согласованных refs, активные затронутые сессии отозваны, Gitleaks зелёный, backup/restore подтверждены и разработчики перешли на новую историю.

### 4. Закрыть release CI gate на итоговом SHA

После устранения истории запустить полный workflow на merge/deploy SHA. Для `e3fa304` все Node и Python jobs прошли, кроме Gitleaks; текущие незакоммиченные OCR/catalog изменения этой проверкой не покрыты. Сохранить run URL, SHA, deployed artifact digest и результат secret scan. Не считать run `43425837718` зелёным целиком.

**Готово, когда:** обязательные jobs завершились success для точного кода/артефакта, предназначенного к развёртыванию.

### 5. Подтвердить production email и продолжить наблюдение

На выделенном тестовом аккаунте подтвердить получение кода в независимом inbox и полный request/verify/logout flow; проверить повторное применение, срок действия и лимиты. Для revision `00008-hal` дополнить 30-минутную проверку согласованным окном, записав 5xx, latency, Cloud SQL connections/CPU/storage, email failures, Cloud Run logs и доступность rollback. Не включать в логи коды, email payload или персональные данные.

**Готово, когда:** письмо получено и flow пройден, наблюдение зафиксировано по заранее согласованному окну/порогам, rollback revision остаётся доступной.

### 6. Закрыть источник legacy data и privacy-процессы

Независимо подтвердить происхождение bundle, ownership reconciliation и counts для 18 пользователей/18 гаражей. Утвердить оператора, retention, удаление аккаунта и обработку запросов субъектов данных; проверка должна учитывать, что исторический runtime JSON присутствует в Git.

**Готово, когда:** оператор подписал reconciliation evidence и privacy/retention процедуры, конфликтующих или ownerless записей нет.

## P1 — первый цикл после release gates

1. **IAM/private agents:** проверить Cloud Run OIDC audience, invoker policy, Secret Manager и Vertex permissions; agents оставить выключенными для обычных пользователей до live smoke.
2. **Наблюдаемость:** алерты по 5xx, latency, auth abuse, DB pool, email и AI provider; request ID без VIN, номеров, гаражного payload и токенов; runbook, ответственный, RTO/RPO и регулярный restore drill.
3. **Каталог:** сохранять `provisional` при недостатке авторитетных evidence; проверять двигатель, КПП, привод, кузов, год, топливо и полную конфигурацию. CI catalog audit прошёл, но это не подтверждает правильность каждой записи источниками производителя.
4. **Документация статуса:** связать release SHA, container digest, Cloud Run revision, Worker version, health gate и окно наблюдения в единой записи.
5. **OCR и сканирование:** текущие изменения распознавания VIN/СТС/чеков требуют полного scanner gate до включения в релиз. Использовать [план проверки сканеров](scanner-verification-plan-2026-11-14.md): regression set минимум 30 обезличенных файлов, точность по заданным метрикам, негативные входы/лимиты, ручной mobile/desktop smoke, нагрузочная проверка и подтверждение human review перед записью. Автоматический typecheck сам по себе не подтверждает точность распознавания.
6. **Каталог и рекомендации:** новые рекомендации/реестр источников требуют тестов происхождения, применимости и безопасного поведения при недоступности источников. Проверка ссылок через авторизованный refresh сейчас хранится в памяти процесса; она не подтверждает содержимое документов и не должна трактоваться как проверка каталожных фактов. До релизного решения подтвердить, что каждый safety/urgent совет имеет корректную ссылку и не создаёт ложного утверждения о fitment или интервале обслуживания. Для `GET /api/knowledge/recommendations` добавить серверный allowlist технических полей, ограничение длины JSON/параметров и тест, что VIN, госномер, фото-URL и произвольные поля не принимаются и не попадают в URL или proxy logs.
7. **Публичные knowledge-маршруты:** `GET /api/knowledge/sources` и `GET /api/knowledge/recommendations` доступны без сессии. Локально закрыто в текущем дереве: строгий allowlist полей `vehicle` и query-параметров, отклонение невалидного JSON и `NaN`, диапазоны года/пробега, лимит `q`, ограничение длины текстовых полей, rate limit на `POST /api/knowledge/sources/refresh`, а ответ источников явно помечает статусы как `instance-local`. Осталось до релиза: вынести refresh statuses в PostgreSQL/кэш с TTL либо сохранить их как отдельное instance-local состояние с наблюдаемостью, добавить метрики ошибок/таймаутов и проверить поведение на deployed proxy.

## P2 — качество продукта

- Измерить frontend загрузку и время до интерактивности на целевых мобильных сетях; повторить bundle analysis после последних изменений.
- Для OCR/AI вести размеченную оценку field accuracy, WER/CER, стоимости и latency; сохранять human review перед записью результатов.
- Показывать неопределённость рекомендаций, не выдавать AI-ответы за подтверждённую диагностику или fitment.

## Рекомендуемая последовательность

1. Подтвердить назначение и ожидаемую аудиторию уже работающего 100%-го Worker API маршрута.
2. Завершено в коде: сценарий регистрации из P0.2 переведён на email verification и quota; проверить его HTTP-тестом на JSON/PostgreSQL, применить миграцию 003 контролируемым job и подтвердить доверенную IP-цепочку/spoofing.
3. Согласованно закрыть Git history и ротацию затронутых сессий.
4. Получить полностью зелёный CI на точном release/deploy SHA.
5. Пройти scanner gate и проверить catalog/recommendations claims для точного SHA.
6. Проверить inbox delivery и провести production observation window.
7. Завершить legacy ownership/privacy evidence.
8. После этого принимать решение о публичном запуске и включении private agents.

До прохождения этих пунктов готовность публичного запуска не подтверждена.
