# Технический аудит Garage AI

## Текущее состояние

- Frontend: React 19 + Vite + TypeScript; каскадный выбор автомобиля реализован в `src/components/CarCascadeSelector.tsx` и питается от `src/carCatalog.ts`.
- Backend: Express в `server.ts`, JSON persistence в `data/garage_store.json`, атомарная запись и существующие CRUD маршруты для автомобилей, ТО, топлива, склада и задач.
- AI: Gemini endpoints `/api/ai/diagnose`, `/api/ai/oem-schedule`, `/api/ai/part-lookup`, OCR чека. Диагностика получает профиль `Vehicle` и историю обслуживания.
- Визуалы: существующие изображения и 3D assets в `public/images` и `public/models`; новый каталог их не дублирует.

## Изменения

- Добавлен нормализованный слой `src/catalog`: Brand, Model, Generation, Modification, Engine, Transmission, BodyType, Drivetrain, FuelType, Source и KnowledgeChunk.
- Существующий legacy-каталог преобразуется в 19 брендов, 55 моделей, 110 поколений, 1 065 технических комбинаций модификаций, 219 двигателей и 60 коробок. Неподтверждённые технические поля имеют `null` и source confidence `low`.
- Добавлены REST endpoints каскада, поиска, метаданных, модификации, provisional TOP-100 и knowledge search.
- Диагностический prompt получает до пяти релевантных knowledge chunks с provenance и правилами безопасности.
- Расширена валидация кузова, уникальность ID и проверка ссылок на автомобиль в операциях ТО/топлива/задач.

## Риски и ограничения

Статистика продаж РФ за 2025–2026 и официальные руководства производителей не были загружены в репозиторий, поэтому endpoint `/api/vehicles/top100` помечен `provisional: true` и не является подтверждённым рейтингом. Для production-RAG нужно импортировать документы, разбить их на chunks и повысить confidence после cross-check.

## Phase 2: Evidence Layer

`src/catalog/types.ts` содержит `ModificationEvidence`: источник привязан к конкретному claim (`engine`, `transmission`, `drivetrain`, `body`, `year`, `fuel`, `full_configuration`) и точной области конфигурации. `src/catalog/verification.ts` содержит детерминированный `verifyModification()` и таблицу Tier по типу источника. Без полной high-confidence full-configuration evidence запись остаётся `provisional` или `partially_verified`; authoritative contradiction делает её `invalid`. Текущий `modificationEvidence` намеренно пуст, поэтому audit показывает 110 provisional, 110 missing evidence и 0 verified.

