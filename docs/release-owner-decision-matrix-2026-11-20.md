# Матрица решений по релизу — 20.11.2026

Текущий итог: **NO-GO** для публичного запуска. Локальная проверка и уже развернутые health-контракты проходят, но внешние доказательства ниже обязательны до открытия публичного трафика.

| Гейт | Текущее решение | Что уже закрыто | Что остаётся | Доступные варианты | Выбранный вариант |
| --- | --- | --- | --- | --- | --- |
| Vertex и агенты | Vertex основной, paid-agent allowlist пуст | Cloud Run revision `garageai-agents-00061-jus` прошла Vertex и authenticated agent smoke через `eu`; прежняя revision сохранена для rollback | Требуется явное отдельное разрешение владельца на платных агентов, список администраторов и лимит 50 SGD | 1) выдать письменное разрешение и задать allowlist/лимит; 2) оставить платных агентов выключенными; 3) отдельно разрешить OpenRouter как fallback | 2 до отдельного разрешения; вариант 3 не разрешён |
| Email login | Проверка через тестовый mailbox | Запрос к production API отвечает без раскрытия существования аккаунта; rate limits и one-time challenge покрыты тестами | Ручные результаты: доставка, код принят/отклонён, logout, replay, expiry | 1) владелец выполняет smoke; 2) отложить email gate и оставить NO-GO | 1, mailbox доступен владельцу |
| OCR и mobile | OCR считается beta | Есть локальный fallback, автоматические scanner-тесты и benchmark | 30+ обезличенных документов с ground truth; iOS/Android smoke | 1) передать набор и устройства; 2) принять OCR только как beta | 2 до получения набора и device smoke |
| DNS/Cloudflare | Поддерживается только `garageai.site` и текущий Worker-домен | Manual Wrangler deploy, dry-run и public health проходят; `www`/`ww` не публикуются | Исторический build `2087658f-d332-49a3-ab78-b664d56b0725` не отдал первичный лог через GitHub integration | 1) получить dashboard log и починить CI; 2) оставить manual deploy и зафиксировать CI blocker | 2 принято как согласованный обход; aliases не добавлять |
| Каталог | Неподтверждённые конфигурации provisional | Матрица применимости и audit проходят, но статус сохраняется консервативным | OEM-владелец должен подтвердить источники для promotion | 1) добавить OEM evidence; 2) оставить provisional | 2 до появления OEM evidence |
| Legacy/privacy | Владелец — владелец проекта | Runbook и 30-дневный restricted backup описаны | Письменный provenance/privacy sign-off и процедура удаления | 1) подписать provenance и retention; 2) оставить gate открытым | 1 требуется |
| Git history | Владелец разрешил публикацию 20.11.2026 | Обновлены шесть веток, проверены все 48. Защита `main` восстановлена, Gitleaks и CI прошли | GitHub хранит служебные ссылки закрытых PR. Для удаления требуется решение поддержки | Дождаться ответа на отправленную заявку GitHub Support | Публикация завершена. Удаление старых ссылок остаётся открытым |
| Observation | 48 часов | Пороговые значения определены | Собрать фактические метрики после допустимого rollout | 1) 24 часа; 2) 48 часов; 3) 72 часа | 2: 5xx <1%, нет P0/P1 и незакрытых DB/email/AI ошибок, p95 <=2s, spend <=50 SGD, rollback revision сохранена |
| Финальный Go/No-Go | NO-GO | Локальные проверки и public health проходят | Закрыть Git, email, Vertex, OCR/mobile и observation | 1) ограниченная beta с закрытым allowlist; 2) публичный запуск после всех гейтов | 1 только для ограниченной аудитории; 2 после evidence | 2 не выбран до закрытия гейтов |

## Что требуется от владельца проекта

1. Выполнить ручной email smoke в тестовом ящике и передать только пять результатов: доставка; код принят/отклонён; logout работает/нет; повторный код принят/отклонён; истёкший код принят/отклонён.
2. Передать обезличенный regression-set минимум из 30 документов с ground truth и организовать iOS/Android smoke.
3. Для каталога назначить владельца OEM-источников либо оставить все неподтверждённые конфигурации `provisional`.
4. Подписать provenance/retention для legacy bundle: backup в закрытом хранилище 30 дней, затем удаление после fresh clone, Gitleaks и ротации. Черновик подтверждения и список незаполненных фактов находятся в [`docs/legacy-privacy-signoff.md`](legacy-privacy-signoff.md); ответственным за удаление указан Сабуров Алексей Маратович.
5. Дождаться ответа GitHub Support по отправленной заявке на служебные ссылки закрытых PR и записать результат в [отчёт о релизе](release-evidence-2026-11-14.md#git-history-remediation--2026-11-20).
6. После успешного Vertex smoke явно разрешить платные агенты и месячный лимит 50 SGD; до этого лимит 0 SGD.

## Что можно закрыть без дополнительного решения

- Локальные проверки: lint, tests, build, config check, dependency audit, catalog audit, recommendation matrix, Python syntax и Wrangler dry-run.
- Публичный apex health: `https://garageai.site/api/health` возвращает только безопасные `status` и `timestamp`; анонимный `/api/data` остаётся защищённым.
- `www.garageai.site` и `ww.garageai.site` не добавляются в DNS и origin allowlist по утверждённому решению.
- Платные агенты и OpenRouter остаются выключенными; production traffic не расширяется.
- Cloudflare Workers Builds считается документированным CI blocker: публикация выполняется manual Wrangler из корня репозитория, а обязательные dry-run, GitHub quality checks и production health проходят.
