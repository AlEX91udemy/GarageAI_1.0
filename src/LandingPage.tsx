import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Bell,
  BookOpen,
  BrainCircuit,
  CarFront,
  CheckCircle2,
  FileDown,
  FileText,
  Fuel,
  Moon,
  ScanLine,
  Sun,
} from "lucide-react";
import {
  readThemePreference,
  saveThemePreference,
  applyThemePreference,
} from "./themePreference";

interface ScanDemoPreset {
  id: "service" | "fuel";
  tabLabel: string;
  docType: string;
  merchant: string;
  date: string;
  mileage: string;
  rawLines: string[];
  extractedItems: Array<{ name: string; code: string; price: string }>;
  total: string;
  targetBadge: string;
  targetColor: string;
}

const SCAN_PRESETS: ScanDemoPreset[] = [
  {
    id: "service",
    tabLabel: "Заказ-наряд СТО",
    docType: "Акт выполненных работ № 4812",
    merchant: "Fit Service • Автоцентр",
    date: "14.05.2026",
    mileage: "74 850 км",
    rawLines: [
      "Заказ-наряд № 4812 от 14.05.2026",
      "А/М: Toyota Camry XV70 • Пробег: 74 850 км",
      "1. Замена масла ДВС и фильтра ...... 1 800 ₽",
      "2. Масло Toyota 5W-30 5л [08880-80845] . 5 900 ₽",
      "3. Фильтр масляный [04152-YZZA1] ... 1 100 ₽",
      "4. Колодки передние Advics [SN135] . 6 100 ₽",
    ],
    extractedItems: [
      { name: "Замена масла ДВС и фильтра", code: "Услуга СТО", price: "1 800 ₽" },
      { name: "Масло моторное Toyota 5W-30", code: "08880-80845", price: "5 900 ₽" },
      { name: "Фильтр масляный OEM", code: "04152-YZZA1", price: "1 100 ₽" },
      { name: "Колодки передние Advics", code: "SN135", price: "6 100 ₽" },
    ],
    total: "14 900 ₽",
    targetBadge: "→ В сервисную книжку",
    targetColor: "text-[#3B82F6]",
  },
  {
    id: "fuel",
    tabLabel: "Чек АЗС",
    docType: "Кассовый чек АЗС № 0412",
    merchant: "АЗС Лукойл № 412",
    date: "18.05.2026",
    mileage: "85 120 км",
    rawLines: [
      "ООО «ЛУКОЙЛ-Центрнефтепродукт»",
      "Дата: 18.05.2026 14:32 • ТРК № 4",
      "Топливо: Бензин АИ-95 ЭКТО",
      "Объём: 45.00 л × 58.90 ₽/л",
      "ТРК №4 · Карта лояльности",
      "ИТОГО К ОПЛАТЕ: 2 650.50 ₽",
    ],
    extractedItems: [
      { name: "АИ-95 ЭКТО", code: "45.00 л × 58.90 ₽", price: "2 650 ₽" },
      { name: "АЗС Лукойл №412 · ТРК №4", code: "Пробег: 85 120 км", price: "Чек ФНС" },
    ],
    total: "2 650 ₽",
    targetBadge: "→ В учёт топлива и расходов",
    targetColor: "text-[#10B981]",
  },
];

export function LandingPage() {
  const [isDark, setIsDark] = useState<boolean>(
    () => readThemePreference() === "dark"
  );

  const [activePresetId, setActivePresetId] = useState<ScanDemoPreset["id"]>("service");
  const [scanCycle, setScanCycle] = useState(0);

  useEffect(() => {
    const next = isDark ? "dark" : "light";
    saveThemePreference(next);
    applyThemePreference(next);
  }, [isDark]);

  const activePreset =
    SCAN_PRESETS.find((p) => p.id === activePresetId) || SCAN_PRESETS[0];

  const triggerScanDemo = (id?: ScanDemoPreset["id"]) => {
    if (id) setActivePresetId(id);
    setScanCycle((c) => c + 1);
  };

  return (
    <div className="min-h-screen bg-[#F4F5F8] text-[#0F172A] dark:bg-[#0D131D] dark:text-[#F8FAFC] transition-colors">
      {/* Шапка */}
      <header className="sticky top-0 z-40 border-b border-[#E2E8F0] bg-[#FFFFFF] dark:border-[#243044] dark:bg-[#17202E]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a
            href="/"
            className="flex items-center gap-2.5 font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] whitespace-nowrap shrink-0"
            aria-label="GarageAI — на главную"
          >
            <img
              src="/garage-ai-mark.png"
              alt="GarageAI логотип"
              className="h-10 w-10 rounded-xl border border-[#E2E8F0] bg-white object-contain p-0.5 shadow-xs dark:border-[#243044]"
            />
            <span className="text-lg">
              Garage<span className="text-[#EF3038]">AI</span>
            </span>
          </a>

          <nav
            aria-label="Навигация"
            className="hidden items-center gap-6 text-sm font-medium text-[#536171] dark:text-[#94A3B8] md:flex"
          >
            <a
              href="#ocr-scanner"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-[#EF3038] dark:hover:text-[#EF3038] whitespace-nowrap font-semibold"
            >
              <ScanLine className="h-4 w-4 text-[#EF3038]" />
              <span>OCR-сканер</span>
            </a>
            <a
              href="#workspace"
              className="transition-colors hover:text-[#0F172A] dark:hover:text-[#F8FAFC] whitespace-nowrap"
            >
              Возможности
            </a>
            <a
              href="#ai-mechanic"
              className="transition-colors hover:text-[#0F172A] dark:hover:text-[#F8FAFC] whitespace-nowrap"
            >
              AI-механик
            </a>
            <a
              href="#how-it-works"
              className="transition-colors hover:text-[#0F172A] dark:hover:text-[#F8FAFC] whitespace-nowrap"
            >
              Как это работает
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
              title={isDark ? "Светлая тема" : "Тёмная тема"}
              className="garage-btn-anim inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#536171] hover:text-[#0F172A] dark:border-[#243044] dark:bg-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]"
            >
              {isDark ? <Sun className="h-4 w-4 text-[#F59E0B]" /> : <Moon className="h-4 w-4" />}
            </button>
            <a
              href="/app?view=mobile"
              className="garage-btn-anim inline-flex items-center gap-2 rounded-lg bg-[#B91C1C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#991B1B] whitespace-nowrap"
            >
              <span>Открыть мобильное приложение</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* =================================================================
            ПЕРВЫЙ ЭКРАН: АКЦЕНТ НА СКАНЕРЕ ДОКУМЕНТОВ + ЖИВАЯ АНИМАЦИЯ OCR
           ================================================================= */}
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Левая колонка: коротко, крупно, читаемо */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="lg:col-span-5"
            >
              <div className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#EF3038] dark:border-[#243044] dark:bg-[#17202E]">
                <ScanLine className="h-3.5 w-3.5" />
                <span>Умный OCR-сканер заказ-нарядов и чеков</span>
              </div>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] sm:text-4xl lg:text-[40px] lg:leading-[1.15]">
                Сфотографируйте заказ-наряд СТО или чек АЗС —{" "}
                <span className="text-[#EF3038]">данные сами встанут в учёт</span>
              </h1>

              <p className="mt-3.5 text-sm leading-relaxed text-[#536171] dark:text-[#94A3B8] sm:text-base">
                GarageAI помогает вести обслуживание, расходы, топливо и детали, а AI-механик подсказывает, что проверить дальше.
              </p>

              {/* 3 коротких факта */}
              <div className="mt-7 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] p-3.5 shadow-sm dark:border-[#243044] dark:bg-[#17202E]">
                  <div className="font-mono text-lg font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                    OCR + AI
                  </div>
                  <div className="mt-1 text-xs leading-relaxed text-[#536171] dark:text-[#94A3B8]">
                    Читает работы, цены и артикулы
                  </div>
                </div>
                <div className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] p-3.5 shadow-sm dark:border-[#243044] dark:bg-[#17202E]">
                  <div className="font-mono text-lg font-extrabold text-[#10B981]">
                    1 клик
                  </div>
                  <div className="mt-1 text-xs leading-relaxed text-[#536171] dark:text-[#94A3B8]">
                    Сохранение в историю авто
                  </div>
                </div>
                <div className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] p-3.5 shadow-sm dark:border-[#243044] dark:bg-[#17202E]">
                  <div className="font-mono text-lg font-extrabold text-[#3B82F6]">
                    PDF
                  </div>
                  <div className="mt-1 text-xs leading-relaxed text-[#536171] dark:text-[#94A3B8]">
                    Готовая сервисная книжка
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Правая колонка: Интерактивный демо-сканер документов */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:col-span-7"
              id="ocr-scanner"
            >
              <div
                aria-label="Демонстрационный интерактивный сканер документов GarageAI"
                className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] shadow-sm dark:border-[#243044] dark:bg-[#17202E]"
              >
                {/* Верхняя панель превью */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 dark:border-[#243044] dark:bg-[#1E293B]">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md border border-[#EF3038]/40 bg-[#EF3038]/10 px-2 py-0.5 text-xs font-bold text-[#EF3038]">
                      ДЕМО-РЕЖИМ
                    </span>
                    <span className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      Интерактивный OCR-сканер документов
                    </span>
                  </div>

                  {/* Переключатель типа документа: только Заказ-наряд СТО и Чек АЗС */}
                  <div className="flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] p-1 dark:border-[#243044] dark:bg-[#17202E]">
                    {SCAN_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => triggerScanDemo(preset.id)}
                        className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          activePresetId === preset.id
                            ? "bg-[#B91C1C] text-white"
                            : "text-[#536171] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]"
                        }`}
                      >
                        {preset.tabLabel}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Тело сканера: Слева "Документ под сканером", Справа "Распознанный результат" */}
                <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-12">
                  {/* Левая часть: Фото документа с простой линией сканера */}
                  <div className="md:col-span-5 flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 relative overflow-hidden dark:border-[#243044] dark:bg-[#1E293B]">
                    {/* Спокойная линия сканирования */}
                    <motion.div
                      key={`beam-${activePreset.id}-${scanCycle}`}
                      initial={{ y: 0, opacity: 0.7 }}
                      animate={{ y: [0, 195, 0] }}
                      transition={{
                        duration: 3.2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="pointer-events-none absolute left-3 right-3 top-9 h-0.5 bg-[#EF3038]/80"
                    />

                    <div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#536171] dark:text-[#94A3B8]">
                        <span className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-[#EF3038]" />
                          Исходный документ
                        </span>
                        <span className="font-mono">JPG • OCR</span>
                      </div>

                      {/* Имитация бумажного чека / заказ-наряда */}
                      <div className="mt-2.5 rounded-lg border border-dashed border-[#E2E8F0] bg-[#FFFFFF] p-3 font-mono text-[11px] leading-relaxed text-[#0F172A] dark:border-[#243044] dark:bg-[#17202E] dark:text-[#F8FAFC]">
                        <div className="border-b border-[#E2E8F0] pb-1.5 font-bold text-[#EF3038] dark:border-[#243044]">
                          {activePreset.merchant}
                        </div>
                        <div className="mt-2 space-y-1 text-[10px] text-[#536171] dark:text-[#94A3B8]">
                          {activePreset.rawLines.map((line, i) => (
                            <div key={i} className="truncate">
                              {line}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Правая часть: Распознанные поля */}
                  <div className="md:col-span-7 flex flex-col justify-between">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${activePreset.id}-${scanCycle}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-3"
                      >
                        {/* Шапка результата */}
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 dark:border-[#243044] dark:bg-[#1E293B]">
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#10B981]">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Распознано автоматически</span>
                            </div>
                            <p className="mt-0.5 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                              {activePreset.docType} • {activePreset.date}
                            </p>
                          </div>
                          <span className="rounded border border-[#E2E8F0] bg-[#FFFFFF] px-2 py-1 font-mono text-xs font-bold text-[#0F172A] dark:border-[#243044] dark:bg-[#17202E] dark:text-[#F8FAFC]">
                            {activePreset.mileage}
                          </span>
                        </div>

                        {/* Список распознанных позиций с артикулами */}
                        <div className="space-y-1.5">
                          {activePreset.extractedItems.map((item) => (
                            <div
                              key={item.name}
                              className="flex items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2 text-xs dark:border-[#243044] dark:bg-[#17202E]"
                            >
                              <div className="min-w-0">
                                <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] block truncate">
                                  {item.name}
                                </span>
                                <span className="font-mono text-[11px] text-[#536171] dark:text-[#94A3B8]">
                                  {item.code}
                                </span>
                              </div>
                              <span className="shrink-0 font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                                {item.price}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Итог распознавания */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0] pt-3 dark:border-[#243044]">
                      <span className="text-xs font-medium text-[#536171] dark:text-[#94A3B8]">
                        Итоговая сумма документа
                      </span>
                      <div className="flex items-center gap-2.5">
                        <span className={`text-xs font-bold ${activePreset.targetColor}`}>
                          {activePreset.targetBadge}
                        </span>
                        <span className="font-mono text-lg font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                          {activePreset.total}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* =================================================================
            КОМПАКТНАЯ ВИЗУАЛЬНАЯ СЕТКА (5 КАРТОЧЕК В ЕДИНОМ СТИЛЕ)
           ================================================================= */}
        <section
          id="workspace"
          className="border-t border-[#E2E8F0] bg-[#FFFFFF] py-12 dark:border-[#243044] dark:bg-[#17202E]"
        >
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.18 }}
            transition={{ duration: 0.45, delay: 0, ease: "easeOut" }}
            className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#EF3038]">
                  Все модули в одной системе
                </span>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] sm:text-3xl">
                  От скана документа до полного контроля авто
                </h2>
              </div>
              <a
                href="/app"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#B91C1C] hover:underline dark:text-[#EF3038]"
              >
                <span>Перейти в рабочее пространство</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            {/* 5 карточек модулей в едином формате */}
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* 1. Рабочее пространство */}
              <article className="garage-card-anim flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 dark:border-[#243044] dark:bg-[#1E293B]">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFFFFF] text-[#EF3038] border border-[#E2E8F0] dark:bg-[#17202E] dark:border-[#243044]">
                      <CarFront className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#536171] dark:text-[#94A3B8]">
                      Сводка по авто
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Рабочее пространство
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#536171] dark:text-[#94A3B8]">
                    Пробег, ближайшее ТО, расходы и быстрые действия по автомобилю на одном экране.
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#E2E8F0] pt-3 text-xs dark:border-[#243044]">
                  <span className="text-[#536171] dark:text-[#94A3B8]">
                    Пробег, ТО и расходы
                  </span>
                  <span className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    Актуальные данные
                  </span>
                </div>
              </article>

              {/* 2. Сервисная книжка */}
              <article
                id="service-book"
                className="garage-card-anim flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 dark:border-[#243044] dark:bg-[#1E293B]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFFFFF] text-[#3B82F6] border border-[#E2E8F0] dark:bg-[#17202E] dark:border-[#243044]">
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#3B82F6]">
                      <FileDown className="h-3.5 w-3.5" /> PDF-выписка
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Сервисная книжка
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#536171] dark:text-[#94A3B8]">
                    Хронология всех ТО с быстрым поиском по артикулам запчастей, прикреплёнными заказ-нарядами и экспортом в PDF.
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#E2E8F0] pt-3 text-xs dark:border-[#243044]">
                  <span className="text-[#536171] dark:text-[#94A3B8]">
                    Поиск по OEM-артикулу и работам
                  </span>
                  <span className="font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Полная история обслуживания
                  </span>
                </div>
              </article>

              {/* 3. Учёт топлива и расходов */}
              <article
                id="expenses-fuel"
                className="garage-card-anim flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 dark:border-[#243044] dark:bg-[#1E293B]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFFFFF] text-[#10B981] border border-[#E2E8F0] dark:bg-[#17202E] dark:border-[#243044]">
                      <Fuel className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#10B981]">
                      Аналитика владения
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Учёт топлива и расходов
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#536171] dark:text-[#94A3B8]">
                    Учёт заправок до полного бака, реальный расход по сезонам и расчёт полной стоимости 1 км пробега.
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#E2E8F0] pt-3 text-xs dark:border-[#243044]">
                  <span className="text-[#536171] dark:text-[#94A3B8]">
                    Стоимость километра
                  </span>
                  <span className="font-mono font-bold text-[#10B981]">
                    7.40 ₽ / км
                  </span>
                </div>
              </article>

              {/* 4. AI-механик */}
              <article
                id="ai-mechanic"
                className="garage-card-anim flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 dark:border-[#243044] dark:bg-[#1E293B]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFFFFF] text-[#F59E0B] border border-[#E2E8F0] dark:bg-[#17202E] dark:border-[#243044]">
                      <BrainCircuit className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#F59E0B]">
                      Диагностика
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    AI-механик
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#536171] dark:text-[#94A3B8]">
                    Разбор симптомов, стуков и кодов OBD-II с учётом вашего двигателя, текущего пробега и прошлых замен.
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#E2E8F0] pt-3 text-xs dark:border-[#243044]">
                  <span className="text-[#536171] dark:text-[#94A3B8]">
                    Чек-лист перед поездкой
                  </span>
                  <span className="font-mono font-semibold text-[#F59E0B]">
                    → В план работ
                  </span>
                </div>
              </article>

              {/* 5. Напоминания и регламент ТО */}
              <article
                id="reminders"
                className="garage-card-anim flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 md:col-span-2 lg:col-span-2 dark:border-[#243044] dark:bg-[#1E293B]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFFFFF] text-[#F59E0B] border border-[#E2E8F0] dark:bg-[#17202E] dark:border-[#243044]">
                      <Bell className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#F59E0B]">
                      Контроль интервалов ТО и ОСАГО
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Напоминания и регламент ТО
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#536171] dark:text-[#94A3B8]">
                    Автоматический расчёт остатка пробега до замены масла, фильтров, колодок, ГРМ и напоминания по датам страховки.
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#E2E8F0] pt-3 text-xs dark:border-[#243044]">
                  <span className="text-[#536171] dark:text-[#94A3B8]">
                    Расчёт по пробегу и датам
                  </span>
                  <span className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    ТО, ОСАГО и сезонные работы
                  </span>
                </div>
              </article>
            </div>
          </motion.div>
        </section>

        {/* =================================================================
            КАК РАБОТАЕТ ПРИЛОЖЕНИЕ (3 КОРОТКИХ ШАГА С ЕДИНОЙ АНИМАЦИЕЙ)
           ================================================================= */}
        <section
          id="how-it-works"
          className="border-t border-[#E2E8F0] bg-[#F4F5F8] py-12 dark:border-[#243044] dark:bg-[#0D131D]"
        >
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.18 }}
            transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
            className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
              Как работает приложение
            </h2>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Сфотографируйте документ",
                  text: "Загрузите фото заказ-наряда автосервиса или кассового чека АЗС.",
                },
                {
                  step: "02",
                  title: "Проверьте распознанные строки",
                  text: "OCR автоматически выделит дату, работы, артикулы запчастей или литры топлива.",
                },
                {
                  step: "03",
                  title: "Сохраните запись в историю авто",
                  text: "Подтвердите данные — заказ-наряд сразу пополнит сервисную книжку, а чек с заправки обновит статистику топлива и расходов.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="garage-card-anim rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 dark:border-[#243044] dark:bg-[#17202E]"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#B91C1C] font-mono text-xs font-bold text-white">
                    {item.step}
                  </span>
                  <h3 className="mt-3 text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#536171] dark:text-[#94A3B8]">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

      </main>

    </div>
  );
}
