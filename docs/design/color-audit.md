# Аудит соответствия цветовой палитре

Дата: **21.10.2026**  
Область проверки: текущее рабочее дерево, UI-код и брендовые ассеты.  
Статус: **исходный аудит; исправления выполнены 21.10.2026**.

Актуальный результат миграции: [`color-migration-report.md`](./color-migration-report.md).

Каноническая палитра: [`color-palette.md`](./color-palette.md) и [`color-palette.json`](./color-palette.json).

В текущем рабочем дереве веб-оболочка уже переведена на `#EF3038` (mark) и `#B91C1C` (action). Поэтому аудит фиксирует остатки миграции в мобильных экранах, старых компонентах и ассетах, а не требует отката уже сделанных изменений.

## Вердикт

Основа проекта уже читается правильно: тёмный сине-графитовый интерфейс, красный акцент, холодные нейтрали. Но палитра реализована в нескольких параллельных системах:

1. Лаймовый бренд живёт в favicon, splash screen и мобильных токенах, хотя логотип и интерфейс красные.
2. Фиолетовый, циан и розовый используются как декоративные акценты в карточках и кнопках, а не только в графиках.
3. Брендовые ассеты используют несколько старых красных, хотя веб-оболочка уже переходит на `#EF3038` и `#B91C1C`.
4. Тёмная тема собрана из примерно 30 близких, но разных hex-значений.
5. Красный реализован тремя способами: Tailwind-классы `red-500/600`, CSS-переопределения на `#B91C1C` и новый mark-акцент `#EF3038`.
6. Опасные и критичные состояния смешивают красный и розовый.

## 1. Лаймовый бренд

Лайм — главный визуальный конфликт. В логотипе и рабочем интерфейсе бренд красный, а favicon, splash screen и мобильные токены — лаймовые.

| Элемент | Где | Что не так | Канон |
|---|---|---|---|
| Splash screen | [`SplashScreen.tsx:21`](../../src/mobile/screens/SplashScreen.tsx), `:25`, `:36`, `:46` | Лаймовое свечение, точка, слово `AI` и прогресс-бар | `brand.red.500` / `brand.red.700` |
| Favicon | [`favicon.svg:4`](../../public/favicon.svg), `:6` | Лаймовый дом и точка | Красный знак |
| Мобильные токены | [`theme.ts:34`](../../src/mobile/theme.ts), `:35`, `:36`, `:38` | `brand.primary`, `glow`, `dark` и gradient заданы лаймом | Красная шкала из палитры |

## 2. Фиолетовый, циан и розовый в UI

Эти цвета допустимы в графиках и категориальных легендах, но сейчас они стали акцентами карточек, кнопок и иконок.

| Элемент | Где | Что не так |
|---|---|---|
| Карточки тюнинга | [`TuningProjectView.tsx:209`](../../src/components/TuningProjectView.tsx), `:210`, `:221`, `:346` | Фиолетовая рамка, фон и активная кнопка |
| Быстрое действие «Тюнинг» | [`HomeScreen.tsx:488`](../../src/mobile/screens/HomeScreen.tsx) | Фиолетовая иконка |
| Блок безопасности в профиле | [`ProfileScreen.tsx:188`](../../src/mobile/screens/ProfileScreen.tsx) | Фиолетовая иконка |
| Before / After | [`BeforeAfterScreen.tsx:50`](../../src/mobile/screens/BeforeAfterScreen.tsx), `:59`, `:180`, `:184`, `:188` | Циановые переключатели и маркеры |
| Карточка камеры в проекте | [`ProjectDetailScreen.tsx:76`](../../src/mobile/screens/ProjectDetailScreen.tsx), `:218`, `:221`, `:231` | Циановая рамка, иконка и стрелка |
| Метрики автомобиля | [`VehicleProfileScreen.tsx:139`](../../src/mobile/screens/VehicleProfileScreen.tsx), `:140`, `:151`, `:152` | Фиолетовая и циановая метрики |
| Инструкция установки приложения | [`InstallPcModal.tsx:147`](../../src/components/InstallPcModal.tsx), `:211`, `:217`, `:223`, `:229`, `:235` | Циановые шаги и акценты |
| Выбранный чип в Dashboard | [`Dashboard.tsx:552`](../../src/components/Dashboard.tsx) | Фиолетовое выделение |
| Категории расходов | [`ExpensesFuelView.tsx:23`](../../src/components/ExpensesFuelView.tsx), `:24`, `:25` | Фиолетовый, розовый и циан используются как категориальные цвета |

Для категорий это допустимо, если они остаются только в графике и легенде. Если те же цвета используются в чипах и кнопках, их нужно заменить на `chart.*` или нейтральные токены.

## 3. Брендовые ассеты: старые красные

Веб-оболочка уже использует канонические `#EF3038` (mark) и `#B91C1C` (action). При этом в ассетах и старых компонентах остаются `#E5232E`, `#F5222D`, `#FC0E0E`, `#CC2323`, `#D32F2F`, `#B71C1C`, а также Tailwind-красные `#EF4444` и `#DC2626`.

| Ассет | Где | Красный |
|---|---|---|
| Растровые логотипы | `garage-ai-mark.png`, `garageai-wordmark.png`, `icon-512.png`, `apple-touch-icon.png` | `#CC2323`, `#FC0E0E` |
| PDF-экспорт | [`serviceBookPdfExport.ts`](../../src/utils/serviceBookPdfExport.ts) | `#D32F2F`, `#B71C1C` |

Для action-кнопок канон — `#B91C1C`. Для логотипа, иконок и активных состояний на тёмном — `#EF3038`. Остальные красные из таблицы выше считаются legacy.

## 4. Тёмные и светлые поверхности

В коде около 30 близких тёмных hex-значений. Из-за этого одинаковые по смыслу панели выглядят по-разному.

| Элемент | Где | Что не так |
|---|---|---|
| Корневые CSS-токены | [`index.css:7`](../../src/index.css) ... `:23` | Светлая канва `#F3F4F6` вместо `#F4F5F8`; тёмные `#15191F`, `#20262E`, `#3C4654` вместо `#0D131D`, `#17202E`, `#243044` |
| Web shell | [`WebApp.tsx:132`](../../src/web/WebApp.tsx), `:138`, `:196`, `:221`, `:506` | `#06090E`, `#0B0E14` |
| Web top bar | [`WebTopBar.tsx:48`](../../src/web/layouts/WebTopBar.tsx), `:88` | `#0B0E14`, `#0F172A` |
| Web sidebar | [`WebSidebar.tsx:46`](../../src/web/layouts/WebSidebar.tsx) | `#0B0E14` |
| Auth gate | [`AuthGate.tsx:28`](../../src/components/AuthGate.tsx), `:51`, `:54`, `:70`, `:101`, `:112` | `#06090E`, `#0B0E14`, `#111827` |
| Install PC modal | [`InstallPcModal.tsx:59`](../../src/components/InstallPcModal.tsx), `:62`, `:124`, `:167`, `:291` ... `:324` | `#111722`, `#16202E`, `#131B26` |
| Service log | [`ServiceLogView.tsx:114`](../../src/components/ServiceLogView.tsx) | `#1A2333`, `#222E42`, `#2F3D54` |
| Dashboard hover | [`Dashboard.tsx:195`](../../src/components/Dashboard.tsx), `:226`, `:256` | `#1C2738` |
| App shell | [`App.tsx:930`](../../src/App.tsx), `:1063` | `#06090E`, `#131B26` |
| Mobile preview shell | [`MobileApp.tsx:877`](../../src/mobile/MobileApp.tsx) | `#06090E` |
| PWA theme-color | [`index.html:12`](../../index.html) | `#171B1A` — зелёно-чёрный, не сине-графитовый |
| Светлые подложки | [`HomeScreen.tsx:258`](../../src/mobile/screens/HomeScreen.tsx), [`NotificationsScreen.tsx:131`](../../src/mobile/screens/NotificationsScreen.tsx) | `#FAFAFC` вместо `#F8FAFC` |

## 5. Красный: три реализации

Веб-оболочка уже переведена на `#EF3038` и `#B91C1C`. При этом мобильные экраны, Dashboard, CarHeader и старые компоненты всё ещё используют Tailwind-классы `red-500/600` (`#EF4444` / `#DC2626`) и градиенты с `rose`.

| Место | Что происходит |
|---|---|
| [`index.css:13`](../../src/index.css), `:23` | `--app-accent` равен `#B91C1C` на светлом и `#EF4444` на тёмном |
| [`index.css`](../../src/index.css), блок `--app-brand-mark` | Добавлен `#EF3038` для иконок, градиентов и CTA-хрома веб-оболочки |
| [`index.css`](../../src/index.css), блок `.app-main .bg-red-600` | Фон кнопок перекрашивается в `#B91C1C`, но тень `shadow-red-600` остаётся `#DC2626` |
| [`index.css`](../../src/index.css), блок `.app-main .text-red-500` | Текст `text-red-500` перекрашивается в `#B91C1C`; в тёмной теме — в `#FDA4A4` |
| [`Dashboard.tsx:163`](../../src/components/Dashboard.tsx) | Градиент `from-red-600 via-rose-600 to-red-700`; розовый не входит в палитру |
| [`Dashboard.tsx:198`](../../src/components/Dashboard.tsx), `:216` | `red-50` / `red-600` в бейджах и иконках |
| [`CarHeader.tsx:243`](../../src/components/CarHeader.tsx), `:447`, `:617`, `:711` | Кнопки на `red-600` |
| [`MobileBottomBar.tsx`](../../src/mobile/navigation/MobileBottomBar.tsx) | Активная навигация и центральная кнопка на `red-500` / `red-600` |
| [`HomeScreen.tsx:702`](../../src/mobile/screens/HomeScreen.tsx) | Кнопка на `red-600` |
| [`AuthGate.tsx:29`](../../src/components/AuthGate.tsx), `:76`, `:87`, `:101`, `:112`, `:159` | Остаточный `#EF4444` в loader, активных вкладках, focus-border и hover |
| [`App.tsx:927`](../../src/App.tsx) | `selection:bg-red-500` |

Это не обязательно визуальная ошибка в каждом месте, но это три конкурирующие реализации одного цвета. Для новых элементов используйте `brand.mark` и `brand.red.700` из палитры.

## 6. Опасные состояния: красный и розовый

Критичные и ошибочные состояния используют и `red`, и `rose`. Это делает интерфейс менее предсказуемым.

| Элемент | Где | Цвет |
|---|---|---|
| Мобильные статусы | [`theme.ts:62`](../../src/mobile/theme.ts) ... `:64` | `rose-500` |
| Критичные работы | [`RepairScreen.tsx:49`](../../src/mobile/screens/RepairScreen.tsx), `:122`, `:139`, `:245` | `rose-100/600/700` |
| To-Fix | [`ToFixScreen.tsx:120`](../../src/mobile/screens/ToFixScreen.tsx), `:129` | `rose-500` |
| Сканер чеков | [`ScanReceiptScreen.tsx:27`](../../src/mobile/screens/ScanReceiptScreen.tsx), `:29` | `rose-500/600` |
| Профиль | [`ProfileScreen.tsx:213`](../../src/mobile/screens/ProfileScreen.tsx), `:216` | `rose-600` |
| Сервис | [`ServiceScreen.tsx:166`](../../src/mobile/screens/ServiceScreen.tsx), `:192`, `:206` | `rose-600/700` |

Канон для danger — `#EF3038`, сильный вариант — `#B91C1C`, на тёмном — `#F87171`.

## 7. Что не считается проблемой

Следующие цвета не нужно приводить к UI-палитре:

- окраска автомобилей в [`mockData.ts`](../../src/mockData.ts), [`vehicleVisuals.ts`](../../src/mobile/vehicleVisuals.ts) и [`Car3DViewer.tsx`](../../src/components/Car3DViewer.tsx);
- цвета 3D-моделей и иллюстраций в [`VehicleModelRenderer.tsx`](../../src/components/VehicleModelRenderer.tsx);
- белые, чёрные и прозрачные оверлеи;
- статусные зелёный, янтарный и синий, если они используются именно для статусов.

## Приоритет исправлений

1. **P0:** splash screen, favicon и мобильные токены — убрать лайм.
2. **P0:** брендовые ассеты — свести старые красные к `#EF3038` / `#B91C1C`.
3. **P1:** фиолетовые и циановые акценты в карточках и кнопках.
4. **P1:** тёмные поверхности — свести к четырём токенам.
5. **P2:** красный и розовый в danger-состояниях.
6. **P2:** PDF-экспорт и `theme-color`.

Ни один из пунктов выше в рамках этого аудита не исправлялся.
