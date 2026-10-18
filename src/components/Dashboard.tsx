import React, { useState } from "react";
import {
  Plus,
  History,
  Wallet,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  Camera,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Wrench,
  Lightbulb,
  Copy,
  Check,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  Vehicle,
  ServiceRecord,
  FuelRecord,
  ToFixTask,
  OemScheduleItem,
} from "../types";
import { getWorkHint } from "../workHints";

interface DashboardProps {
  vehicle: Vehicle;
  serviceRecords: ServiceRecord[];
  fuelRecords: FuelRecord[];
  toFixTasks: ToFixTask[];
  oemSchedules: OemScheduleItem[];
  onOpenAddService: () => void;
  onOpenHistory: () => void;
  onOpenAiDiagnostic: () => void;
  onOpenExpenses: () => void;
  onOpenScanReceipt: () => void;
  onOpenOemSchedule: () => void;
  onOpenInventoryToFix: () => void;
  onOpenServiceBook: () => void;
  onMarkOemDone?: (item: OemScheduleItem) => void;
  onOpenCommandPalette?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  vehicle,
  serviceRecords,
  fuelRecords,
  toFixTasks,
  oemSchedules,
  onOpenAddService,
  onOpenHistory,
  onOpenAiDiagnostic,
  onOpenExpenses,
  onOpenScanReceipt,
  onOpenOemSchedule,
  onOpenInventoryToFix,
  onOpenServiceBook,
  onMarkOemDone,
  onOpenCommandPalette,
}) => {
  const [isKilvoCollapsed, setIsKilvoCollapsed] = useState(false);
  const [isOemCollapsed, setIsOemCollapsed] = useState(false);
  const [isToFixCollapsed, setIsToFixCollapsed] = useState(false);
  const [isRecentCollapsed, setIsRecentCollapsed] = useState(false);
  const [showKilvoAllList, setShowKilvoAllList] = useState(false);
  const [showAllRecentList, setShowAllRecentList] = useState(false);
  const [selectedKilvoMetric, setSelectedKilvoMetric] = useState<
    "cost_per_km" | "fuel_cost_km" | "service_total" | "fuel_total" | null
  >(null);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  const handleCopySku = async (sku: string) => {
    if (!sku) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(sku);
      }
      setCopiedSku(sku);
      setTimeout(() => setCopiedSku(null), 1800);
    } catch {
      setCopiedSku(sku);
      setTimeout(() => setCopiedSku(null), 1800);
    }
  };

  const currentVehicleRecords = serviceRecords.filter(
    (r) => r.vehicleId === vehicle.id
  );
  const currentFuelRecords = fuelRecords.filter(
    (f) => f.vehicleId === vehicle.id
  );

  // Financial calculations
  const totalServiceCost = currentVehicleRecords.reduce(
    (sum, r) => sum + r.totalCost,
    0
  );
  const totalFuelCost = currentFuelRecords.reduce(
    (sum, f) => sum + f.totalCost,
    0
  );
  const totalExpenses = totalServiceCost + totalFuelCost;
  const totalFuelLiters = currentFuelRecords.reduce(
    (sum, f) => sum + (f.liters || 0),
    0
  );

  // Approximate mileage span tracked across services and fuel logs
  const allRecordedMileages = [
    ...currentVehicleRecords.map((r) => r.mileage),
    ...currentFuelRecords.map((f) => f.mileage),
  ].filter((m) => typeof m === "number" && m > 0);

  const minMileage =
    allRecordedMileages.length > 0
      ? Math.min(...allRecordedMileages)
      : Math.max(0, vehicle.currentMileage - 30000);
  const kmDelta = vehicle.currentMileage - minMileage;
  const mileageTracked =
    kmDelta > 0
      ? kmDelta
      : vehicle.currentMileage > 0
      ? vehicle.currentMileage
      : 1;

  const costPerKm = (totalExpenses / mileageTracked).toFixed(2);
  const fuelCostPerKm = (totalFuelCost / mileageTracked).toFixed(2);

  // Average fuel consumption computed strictly from verified logs
  const fuelsWithConsumption = currentFuelRecords.filter(
    (f) =>
      typeof f.calculatedConsumption === "number" && f.calculatedConsumption > 0
  );
  const avgConsumption =
    fuelsWithConsumption.length > 0
      ? (
          fuelsWithConsumption.reduce(
            (sum, f) => sum + (f.calculatedConsumption || 0),
            0
          ) / fuelsWithConsumption.length
        ).toFixed(1)
      : currentFuelRecords.length > 0
      ? "—"
      : "0.0";

  // Recent 3 services
  const recentServices = [...currentVehicleRecords]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  // Urgent pending tasks
  const pendingTasks = toFixTasks.filter(
    (t) => t.vehicleId === vehicle.id && t.status !== "completed"
  );

  // OEM Maintenance Health & Forecast calculations
  const vehicleOemItems = oemSchedules
    .filter((i) => i.vehicleId === vehicle.id)
    .map((item) => {
      const lastKm = item.lastDoneKm ?? 0;
      const diffKm = Math.max(0, vehicle.currentMileage - lastKm);
      const remainingKm = item.intervalKm - diffKm;
      const wearPct = Math.min(
        100,
        Math.max(0, Math.round((diffKm / item.intervalKm) * 100))
      );
      const isOverdue = diffKm >= item.intervalKm;
      const isSoon = !isOverdue && (wearPct >= 80 || remainingKm <= 2000);
      return {
        ...item,
        diffKm,
        remainingKm,
        wearPct,
        isOverdue,
        isSoon,
      };
    })
    .sort((a, b) => b.wearPct - a.wearPct);

  const overdueOemCount = vehicleOemItems.filter((i) => i.isOverdue).length;
  const soonOemCount = vehicleOemItems.filter((i) => i.isSoon).length;
  const avgWearPct =
    vehicleOemItems.length > 0
      ? Math.round(
          vehicleOemItems.reduce((s, i) => s + i.wearPct, 0) /
            vehicleOemItems.length
        )
      : 20;
  const healthIndexPct = Math.max(5, 100 - Math.round(avgWearPct * 0.65) - overdueOemCount * 12);

  const pendingToFixCost = pendingTasks.reduce(
    (s, t) => s + (t.estimatedCost || 0),
    0
  );
  const estimatedDueOemCost = (overdueOemCount + soonOemCount) * 6500;
  const upcomingServiceBudget = pendingToFixCost + estimatedDueOemCost;

  return (
    <div className="dashboard space-y-6 pb-12">
      {/* Section Header with Command Search Trigger */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 dark:border-[#1f2937] pb-3.5">
        <div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Бортовой кокпит · {vehicle.make} {vehicle.model}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Главное по автомобилю
          </h2>
        </div>

        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#1f2937] bg-white dark:bg-[#111827] hover:border-slate-300 dark:hover:border-slate-700 text-xs text-slate-500 dark:text-slate-400 transition cursor-pointer w-full sm:w-auto"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              <span>Быстрый поиск по артикулам, ТО и задачам...</span>
            </span>
            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#161f30] text-slate-600 dark:text-slate-300">
              ⌘K
            </span>
          </button>
        )}
      </div>

      {/* 4-Column Ownership Telemetry Strip (Tabular Numerals) */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-[#1f2937] space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsKilvoCollapsed((prev) => !prev)}
              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#161f30] text-slate-700 dark:text-slate-200 flex items-center justify-center transition shrink-0 cursor-pointer"
              title={isKilvoCollapsed ? "Развернуть телеметрию" : "Свернуть телеметрию"}
            >
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </button>
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Экономика владения · отслеживается {mileageTracked.toLocaleString("ru-RU")} км
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Телеметрия стоимости километра и затрат
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isKilvoCollapsed && (
              <button
                type="button"
                onClick={() => setShowKilvoAllList((prev) => !prev)}
                className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold px-3 py-1.5 bg-slate-100 dark:bg-[#161f30] rounded-lg transition cursor-pointer hidden sm:inline-flex items-center gap-1"
              >
                {showKilvoAllList ? "Скрыть детализацию" : "Детализация"}
              </button>
            )}
            <button
              type="button"
              onClick={onOpenExpenses}
              className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>Все расходы</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsKilvoCollapsed((prev) => !prev)}
              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#161f30] text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
              title={isKilvoCollapsed ? "Развернуть" : "Свернуть"}
            >
              {isKilvoCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {!isKilvoCollapsed && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Metric 1: Total Cost per 1 km */}
              <button
                type="button"
                onClick={() => {
                  setSelectedKilvoMetric((prev) =>
                    prev === "cost_per_km" ? null : "cost_per_km"
                  );
                  setShowKilvoAllList(true);
                }}
                className={`rounded-xl p-3.5 border text-left transition cursor-pointer flex flex-col justify-between ${
                  selectedKilvoMetric === "cost_per_km"
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-red-600/20 dark:border-red-500"
                    : "bg-slate-50 dark:bg-[#161f30] hover:border-slate-300 dark:hover:border-slate-700 border-slate-200 dark:border-[#1f2937]"
                }`}
              >
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  Полная стоимость 1 км
                </div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums mt-1.5 text-slate-900 dark:text-white">
                  {costPerKm} ₽
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate font-mono tabular-nums">
                  {totalExpenses.toLocaleString("ru-RU")} ₽ суммарно
                </div>
              </button>

              {/* Metric 2: Fuel Cost per 1 km */}
              <button
                type="button"
                onClick={() => {
                  setSelectedKilvoMetric((prev) =>
                    prev === "fuel_cost_km" ? null : "fuel_cost_km"
                  );
                  setShowKilvoAllList(true);
                }}
                className={`rounded-xl p-3.5 border text-left transition cursor-pointer flex flex-col justify-between ${
                  selectedKilvoMetric === "fuel_cost_km"
                    ? "bg-emerald-50 border-emerald-500 dark:bg-emerald-500/15 dark:border-emerald-500"
                    : "bg-slate-50 dark:bg-[#161f30] hover:border-slate-300 dark:hover:border-slate-700 border-slate-200 dark:border-[#1f2937]"
                }`}
              >
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  Топливо на 1 км пути
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1.5">
                  {fuelCostPerKm} ₽
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate font-mono tabular-nums">
                  средний расход ~{avgConsumption} л/100км
                </div>
              </button>

              {/* Metric 3: Total Service & Repairs */}
              <button
                type="button"
                onClick={() => {
                  setSelectedKilvoMetric((prev) =>
                    prev === "service_total" ? null : "service_total"
                  );
                  setShowKilvoAllList(true);
                }}
                className={`rounded-xl p-3.5 border text-left transition cursor-pointer flex flex-col justify-between ${
                  selectedKilvoMetric === "service_total"
                    ? "bg-red-50 border-red-500 dark:bg-red-500/15 dark:border-red-500"
                    : "bg-slate-50 dark:bg-[#161f30] hover:border-slate-300 dark:hover:border-slate-700 border-slate-200 dark:border-[#1f2937]"
                }`}
              >
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  Затраты на ТО и ремонт
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-red-600 dark:text-red-400 font-mono tabular-nums mt-1.5">
                  {totalServiceCost.toLocaleString("ru-RU")} ₽
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate font-mono tabular-nums">
                  {currentVehicleRecords.length} записей в журнале
                </div>
              </button>

              {/* Metric 4: Total Fuel Refueled */}
              <button
                type="button"
                onClick={() => {
                  setSelectedKilvoMetric((prev) =>
                    prev === "fuel_total" ? null : "fuel_total"
                  );
                  setShowKilvoAllList(true);
                }}
                className={`rounded-xl p-3.5 border text-left transition cursor-pointer flex flex-col justify-between ${
                  selectedKilvoMetric === "fuel_total"
                    ? "bg-emerald-50 border-emerald-500 dark:bg-emerald-500/15 dark:border-emerald-500"
                    : "bg-slate-50 dark:bg-[#161f30] hover:border-slate-300 dark:hover:border-slate-700 border-slate-200 dark:border-[#1f2937]"
                }`}
              >
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  Затраты на топливо
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums mt-1.5">
                  {totalFuelCost.toLocaleString("ru-RU")} ₽
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate font-mono tabular-nums">
                  {totalFuelLiters.toLocaleString("ru-RU")} л · {currentFuelRecords.length} АЗС
                </div>
              </button>
            </div>

            {showKilvoAllList && (
              <div className="pt-3 border-t border-slate-200 dark:border-[#1f2937] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Последние операции по выбранной метрике
                    </span>
                    {selectedKilvoMetric && (
                      <button
                        type="button"
                        onClick={() => setSelectedKilvoMetric(null)}
                        className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                      >
                        Сбросить фильтр ×
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onOpenExpenses}
                    className="text-red-600 dark:text-red-400 hover:underline font-semibold cursor-pointer"
                  >
                    Открыть аналитику расходов →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                  {(selectedKilvoMetric !== "fuel_cost_km" &&
                  selectedKilvoMetric !== "fuel_total"
                    ? currentVehicleRecords.slice(0, 4)
                    : []
                  ).map((rec) => (
                    <div
                      key={rec.id}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-[#1f2937] bg-slate-50 dark:bg-[#161f30] flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {rec.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          {rec.date} · {rec.category}
                        </div>
                      </div>
                      <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white shrink-0 ml-2">
                        {rec.totalCost.toLocaleString("ru-RU")} ₽
                      </div>
                    </div>
                  ))}

                  {(selectedKilvoMetric !== "service_total"
                    ? currentFuelRecords.slice(0, 4)
                    : []
                  ).map((fuel) => (
                    <div
                      key={fuel.id}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-[#1f2937] bg-slate-50 dark:bg-[#161f30] flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          АЗС {fuel.station || "Заправка"} · {fuel.liters} л
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          {fuel.date} · {fuel.fuelType}
                        </div>
                      </div>
                      <div className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                        {fuel.totalCost.toLocaleString("ru-RU")} ₽
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Focused 4-Card Quick Action Grid */}
      <div className="dashboard-actions grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Action 1: Primary Add Service Record */}
        <button
          type="button"
          onClick={onOpenAddService}
          className="text-left p-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white transition cursor-pointer flex flex-col justify-between min-h-[140px] group border border-red-500"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <ArrowUpRight className="w-4 h-4 opacity-80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
          </div>
          <div className="mt-3">
            <div className="text-base font-bold leading-snug">
              Записать ремонт или ТО
            </div>
            <div className="text-xs text-red-100 mt-1 leading-snug">
              Работы, запчасти с артикулами и чеки
            </div>
          </div>
        </button>

        {/* Action 2: OCR Receipt Scanner */}
        <button
          type="button"
          onClick={onOpenScanReceipt}
          className="text-left p-4 rounded-2xl bg-white dark:bg-[#111827] hover:border-red-500 border border-slate-200 dark:border-[#1f2937] text-slate-900 dark:text-white transition cursor-pointer flex flex-col justify-between min-h-[140px] group"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono text-slate-400">OCR · AI</span>
          </div>
          <div className="mt-3">
            <div className="text-base font-bold leading-snug">
              Сканер чеков и заказ-нарядов
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Распознавание сумм, работ и OEM-номеров по фото
            </div>
          </div>
        </button>

        {/* Action 3: AI Diagnostic Assistant */}
        <button
          type="button"
          onClick={onOpenAiDiagnostic}
          className="text-left p-4 rounded-2xl bg-white dark:bg-[#111827] hover:border-amber-500 border border-slate-200 dark:border-[#1f2937] text-slate-900 dark:text-white transition cursor-pointer flex flex-col justify-between min-h-[140px] group"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
              По истории авто
            </span>
          </div>
          <div className="mt-3">
            <div className="text-base font-bold leading-snug">
              AI-диагностика поломки
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Опишите стук, ошибку или симптом для разбора
            </div>
          </div>
        </button>

        {/* Action 4: Official Service Book & History */}
        <button
          type="button"
          onClick={onOpenServiceBook}
          className="text-left p-4 rounded-2xl bg-white dark:bg-[#111827] hover:border-slate-400 border border-slate-200 dark:border-[#1f2937] text-slate-900 dark:text-white transition cursor-pointer flex flex-col justify-between min-h-[140px] group"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#161f30] text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {currentVehicleRecords.length} ТО · PDF
            </span>
          </div>
          <div className="mt-3">
            <div className="text-base font-bold leading-snug">
              Сервисная книжка и PDF
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Официальная выписка для печати или продажи авто
            </div>
          </div>
        </button>
      </div>

      {/* Two Columns: Wear & Next Service Forecast + To-Fix Priority Board */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Column 1: Wear & Next Service Forecast (OEM Schedule) */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-[#1f2937] flex flex-col justify-between h-full">
          <div className="flex-1 flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-3.5">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOemCollapsed((prev) => !prev)}
                  className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition shrink-0 cursor-pointer"
                  title={isOemCollapsed ? "Развернуть регламент" : "Свернуть регламент"}
                >
                  <ShieldCheck className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Индекс ресурса узлов</span>
                    <span>·</span>
                    <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                      {healthIndexPct}%
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Шкала ресурса и регламент ТО
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenOemSchedule}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer whitespace-nowrap"
                >
                  Весь регламент
                </button>
                <button
                  type="button"
                  onClick={() => setIsOemCollapsed((prev) => !prev)}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#161f30] text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
                >
                  {isOemCollapsed ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {!isOemCollapsed && (
              <div className="space-y-2.5 flex-1">
                {vehicleOemItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-[#1f2937] bg-slate-50 dark:bg-[#161f30]"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </span>
                      <span
                        className={`font-mono tabular-nums font-semibold shrink-0 ${
                          item.isOverdue
                            ? "text-red-600 dark:text-red-400"
                            : item.isSoon
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {item.isOverdue
                          ? `Просрочено (+${Math.abs(item.remainingKm).toLocaleString("ru-RU")} км)`
                          : item.isSoon
                          ? `Осталось ${item.remainingKm.toLocaleString("ru-RU")} км`
                          : `Запас ${item.remainingKm.toLocaleString("ru-RU")} км`}
                      </span>
                    </div>

                    {/* Wear Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-[#1f2937] rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          item.isOverdue
                            ? "bg-red-500"
                            : item.isSoon
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${item.wearPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-mono tabular-nums">
                      <span>
                        Прошло {item.diffKm.toLocaleString("ru-RU")} из{" "}
                        {item.intervalKm.toLocaleString("ru-RU")} км ({item.wearPct}%)
                      </span>
                      {onMarkOemDone && (item.isOverdue || item.isSoon) && (
                        <button
                          type="button"
                          onClick={() => onMarkOemDone(item)}
                          className="font-sans font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                        >
                          Записать замену →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isOemCollapsed && (
            <div className="pt-3 mt-3 border-t border-slate-200 dark:border-[#1f2937] flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Двигатель: {vehicle.engine}
              </span>
              <button
                type="button"
                onClick={onOpenOemSchedule}
                className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Настроить интервалы →
              </button>
            </div>
          )}
        </div>

        {/* Column 2: To-Fix Priority Board & Upcoming Budget Forecast */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-[#1f2937] flex flex-col justify-between h-full">
          <div className="flex-1 flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-3.5">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsToFixCollapsed((prev) => !prev)}
                  className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center transition shrink-0 cursor-pointer"
                  title={isToFixCollapsed ? "Развернуть план работ" : "Свернуть план работ"}
                >
                  <Layers className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Прогноз бюджета ТО</span>
                    <span>·</span>
                    <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                      ~{upcomingServiceBudget.toLocaleString("ru-RU")} ₽
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    План работ To-Fix и склад гаража
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenInventoryToFix}
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer whitespace-nowrap"
                >
                  В гараж
                </button>
                <button
                  type="button"
                  onClick={() => setIsToFixCollapsed((prev) => !prev)}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#161f30] text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
                >
                  {isToFixCollapsed ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {!isToFixCollapsed && (
              <div className="space-y-2.5 flex-1">
                {pendingTasks.length > 0 ? (
                  pendingTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-[#161f30] border border-slate-200 dark:border-[#1f2937] flex flex-col gap-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="font-bold text-slate-900 dark:text-white truncate">
                              {task.title}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {task.category}
                            </span>
                          </div>
                          {task.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </div>

                        {task.estimatedCost && (
                          <span className="text-xs font-bold text-slate-900 dark:text-white font-mono tabular-nums shrink-0">
                            ~{task.estimatedCost.toLocaleString("ru-RU")} ₽
                          </span>
                        )}
                      </div>

                      <div className="pt-1.5 border-t border-slate-200/70 dark:border-[#1f2937] flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-snug">
                          {task.workHint || getWorkHint(task.title, task.category)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 rounded-xl bg-slate-50 dark:bg-[#161f30] border border-slate-200 dark:border-[#1f2937] text-center text-xs text-slate-500 flex-1 flex items-center justify-center">
                    Все запланированные задачи To-Fix выполнены
                  </div>
                )}
              </div>
            )}
          </div>

          {!isToFixCollapsed && (
            <div className="pt-3 mt-3 border-t border-slate-200 dark:border-[#1f2937] flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Активных задач: {pendingTasks.length}
              </span>
              <button
                type="button"
                onClick={onOpenInventoryToFix}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Открыть склад и задачи →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Repairs Ledger with One-Click SKU Copy */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-[#1f2937]">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsRecentCollapsed((prev) => !prev)}
              className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center transition shrink-0 cursor-pointer"
              title={isRecentCollapsed ? "Развернуть журнал" : "Свернуть журнал"}
            >
              <History className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Недавние записи в сервисном журнале
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Хронология обслуживания, пробеги и установленные артикулы (нажмите на артикул для копирования)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenHistory}
              className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
            >
              <span>Весь журнал ({currentVehicleRecords.length})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsRecentCollapsed((prev) => !prev)}
              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#161f30] text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
            >
              {isRecentCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {!isRecentCollapsed && (
          <>
            <div className="divide-y divide-slate-200/80 dark:divide-[#1f2937]">
              {(showAllRecentList ? currentVehicleRecords : recentServices).map(
                (record) => (
                  <div
                    key={record.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      {/* Unboxed Metadata Line */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        <span>{record.date}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {record.mileage.toLocaleString("ru-RU")} км
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-sans">{record.category}</span>
                        {record.serviceCenter && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-sans">{record.serviceCenter}</span>
                          </>
                        )}
                      </div>

                      <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                        {record.title}
                      </div>

                      {record.parts.length > 0 && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <span>Артикулы:</span>
                          {record.parts.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleCopySku(p.partNumber || p.name)}
                              className="inline-flex items-center gap-1 font-mono text-xs text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                              title="Скопировать артикул запчасти"
                            >
                              <span>{p.brand}</span>
                              <span className="font-bold underline decoration-dotted underline-offset-2">
                                {p.partNumber || p.name}
                              </span>
                              {copiedSku === (p.partNumber || p.name) ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3 opacity-60" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 gap-1">
                      <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                        {record.totalCost.toLocaleString("ru-RU")} ₽
                      </div>
                      {record.receiptImages && record.receiptImages.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Чек в архиве
                        </span>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>

            {currentVehicleRecords.length > 3 && (
              <div className="pt-3 border-t border-slate-200 dark:border-[#1f2937] text-center">
                <button
                  type="button"
                  onClick={() => setShowAllRecentList((prev) => !prev)}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  {showAllRecentList
                    ? "Свернуть до 3 последних записей"
                    : `Показать все записи в журнале (${currentVehicleRecords.length})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
