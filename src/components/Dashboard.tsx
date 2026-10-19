import React, { useState } from "react";
import {
  Plus,
  History,
  MessageSquareWarning,
  Wallet,
  ArrowUpRight,
  TrendingUp,
  Fuel,
  Sparkles,
  Camera,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Wrench,
  Lightbulb,
} from "lucide-react";
import { Vehicle, ServiceRecord, FuelRecord, ToFixTask, OemScheduleItem } from "../types";
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
}) => {
  // Collapsible section visibility states
  const [isKilvoCollapsed, setIsKilvoCollapsed] = useState(false);
  const [isOemCollapsed, setIsOemCollapsed] = useState(false);
  const [isToFixCollapsed, setIsToFixCollapsed] = useState(false);
  const [isRecentCollapsed, setIsRecentCollapsed] = useState(false);
  const [showKilvoAllList, setShowKilvoAllList] = useState(false);
  const [showAllRecentList, setShowAllRecentList] = useState(false);
  const [selectedKilvoMetric, setSelectedKilvoMetric] = useState<
    "cost_per_km" | "fuel_cost_km" | "service_total" | "fuel_total" | null
  >(null);

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
    (f) => typeof f.calculatedConsumption === "number" && f.calculatedConsumption > 0
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

  // Recent 2 services
  const recentServices = [...currentVehicleRecords]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  // Urgent pending tasks
  const pendingTasks = toFixTasks
    .filter((t) => t.vehicleId === vehicle.id && t.status !== "completed")
    .slice(0, 3);

  return (
    <div className="dashboard space-y-6 pb-12">
      {/* Elevated Section Header with human, natural copywriting */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-end justify-between gap-1 border-b border-neutral-200/60 dark:border-neutral-800/80 pb-3">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            Бортовой журнал
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight mt-0.5">
            Главное по машине
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Быстрые действия, история обслуживания и расходы на содержание
          </p>
        </div>
      </div>

      {/* Primary 4-Card Action Grid: Human-friendly automotive cards */}
      <div className="dashboard-actions grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Card 1: Red vibrant card "Записать ремонт или ТО" */}
        <button
          onClick={onOpenAddService}
          className="relative text-left p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-xl shadow-red-600/25 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between min-h-[150px] sm:min-h-[165px] group overflow-hidden border border-red-500/40"
        >
          {/* Subtle geometric background glow */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />

          <div className="flex items-start justify-between w-full relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] font-bold bg-white/20 backdrop-blur-md text-white px-2.5 py-1 rounded-full flex items-center gap-1">
              <span>+ Новая запись</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
            </span>
          </div>

          <div className="relative z-10 mt-3">
            <div className="text-lg font-black leading-tight tracking-tight">
              Записать ремонт или ТО
            </div>
            <div className="text-xs text-red-100/90 mt-1 font-medium leading-snug">
              Замена масла, колодок, запчасти и прикрепление чеков
            </div>
            <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-[11px] text-red-100/80">
              <span>Внести с чеком или заказ-нарядом</span>
              <span className="font-bold underline">Заполнить →</span>
            </div>
          </div>
        </button>

        {/* Card 2: History */}
        <button
          onClick={onOpenHistory}
          className="relative text-left p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#17202e] hover:bg-neutral-50 dark:hover:bg-[#1c2738] border border-neutral-200/80 dark:border-[#243044] text-neutral-900 dark:text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between min-h-[150px] sm:min-h-[165px] group"
        >
          <div className="flex items-start justify-between w-full">
            <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <History className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition">
              <span>Все заезды</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-lg font-black leading-tight tracking-tight text-neutral-900 dark:text-white">
              История обслуживания
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium leading-snug">
              Что и когда меняли, пробеги, цены и контакты сервисов
            </div>
            <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
              <span>Всего в журнале:</span>
              <span className="font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-md">
                {currentVehicleRecords.length} {currentVehicleRecords.length === 1 ? "запись" : "записей"}
              </span>
            </div>
          </div>
        </button>

        {/* Card 3: AI Assistant */}
        <button
          onClick={onOpenAiDiagnostic}
          className="relative text-left p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#17202e] hover:bg-neutral-50 dark:hover:bg-[#1c2738] border border-neutral-200/80 dark:border-[#243044] text-neutral-900 dark:text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between min-h-[150px] sm:min-h-[165px] group"
        >
          <div className="flex items-start justify-between w-full">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-500/20 border border-amber-300/50 dark:border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span>Умный помощник</span>
            </span>
          </div>

          <div className="mt-3">
            <div className="text-lg font-black leading-tight tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
              <span>Спросить о поломке</span>
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium leading-snug">
              Опишите стук, ошибку или симптом — подскажет причину
            </div>
            <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
              <span>Учитывает историю авто:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                По истории ТО
              </span>
            </div>
          </div>
        </button>

        {/* Card 4: Expenses */}
        <button
          onClick={onOpenExpenses}
          className="relative text-left p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#17202e] hover:bg-neutral-50 dark:hover:bg-[#1c2738] border border-neutral-200/80 dark:border-[#243044] text-neutral-900 dark:text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between min-h-[150px] sm:min-h-[165px] group"
        >
          <div className="flex items-start justify-between w-full">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition">
              <span>Подробнее</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-lg font-black leading-tight tracking-tight text-neutral-900 dark:text-white">
              Расходы на авто
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium leading-snug">
              Бензин, обслуживание, мойки и реальная цена 1 км пути
            </div>
            <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] font-mono">
              <span className="text-neutral-500 dark:text-neutral-400">{costPerKm} ₽ за 1 км</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md">
                {totalExpenses.toLocaleString("ru-RU")} ₽ всего
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* AI Quick Receipt Scanner Banner (OCR) */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-850 to-neutral-900 text-white p-4 sm:p-5 rounded-3xl border border-neutral-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm sm:text-base font-bold flex items-center gap-2">
              <span>Умный сканер чеков и заказ-нарядов</span>
              <span className="text-[10px] bg-red-600 text-white font-bold px-2 py-0.5 rounded-full">
                OCR + AI
              </span>
            </div>
            <p className="text-xs text-neutral-300 mt-0.5">
              Сфотографируйте чек из сервиса или АЗС — нейросеть извлечёт сумму, список работ и запчастей с артикулами.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenScanReceipt}
          className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-2xl transition cursor-pointer shadow-lg shadow-red-600/30 whitespace-nowrap active:scale-95"
        >
          Сканировать чек
        </button>
      </div>

      {/* GarageHub Analytics Bar: Cost of 1 km, Fuel Consumption, Breakdown */}
      <div className="bg-white dark:bg-[#17202e] rounded-3xl p-5 border border-neutral-200/80 dark:border-[#243044] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsKilvoCollapsed((prev) => !prev)}
              className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition shrink-0 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              title={isKilvoCollapsed ? "Развернуть статистику" : "Скрыть список (оставить оглавление)"}
            >
              <TrendingUp className="w-4 h-4" />
            </button>
            <div>
              <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Содержание автомобиля
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                Сколько стоит 1 км пути и куда уходят деньги
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isKilvoCollapsed && (
              <button
                type="button"
                onClick={() => setShowKilvoAllList((prev) => !prev)}
                className="text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white font-semibold px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition cursor-pointer hidden sm:inline-flex items-center gap-1"
                title="Показать / скрыть подробную структуру затрат"
              >
                {showKilvoAllList ? "Скрыть список" : "Весь список"}
              </button>
            )}
            <button
              onClick={onOpenExpenses}
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              Все отчёты <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsKilvoCollapsed((prev) => !prev)}
              className="w-7 h-7 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center transition cursor-pointer"
              title={isKilvoCollapsed ? "Развернуть" : "Скрыть список (оставить оглавление)"}
            >
              {isKilvoCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!isKilvoCollapsed && (
          <>
            {/* Interactive Selectable Metric Buttons (Styled like OEM Schedule) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {/* 1. Полная стоимость 1 км */}
              <button
                type="button"
                onClick={() => {
                  setSelectedKilvoMetric((prev) => (prev === "cost_per_km" ? null : "cost_per_km"));
                  setShowKilvoAllList(true);
                }}
                className={`rounded-2xl p-3.5 border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between select-none active:scale-95 ${
                  selectedKilvoMetric === "cost_per_km"
                    ? "bg-neutral-900 text-white border-neutral-900 ring-2 ring-neutral-700 shadow-md scale-[1.01]"
                    : "bg-neutral-50 hover:bg-neutral-100/80 border-neutral-200/80 shadow-sm hover:border-neutral-300"
                }`}
                title="Нажмите, чтобы выделить полную стоимость 1 км"
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className={`text-[11px] font-semibold truncate ${selectedKilvoMetric === "cost_per_km" ? "text-neutral-300" : "text-neutral-600"}`}>
                    Полная стоимость 1 км
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase transition shrink-0 ${
                      selectedKilvoMetric === "cost_per_km"
                        ? "bg-neutral-700 text-white"
                        : "bg-neutral-200/80 text-neutral-600"
                    }`}
                  >
                    {selectedKilvoMetric === "cost_per_km" ? "Активен ✓" : "Фильтр"}
                  </span>
                </div>
                <div className={`text-lg sm:text-xl font-extrabold font-mono mt-1.5 ${selectedKilvoMetric === "cost_per_km" ? "text-white" : "text-neutral-900"}`}>
                  {costPerKm} ₽
                </div>
                <div className={`text-[10px] mt-0.5 truncate ${selectedKilvoMetric === "cost_per_km" ? "text-neutral-400" : "text-neutral-400"}`}>
                  за {mileageTracked.toLocaleString("ru-RU")} км пробега
                </div>
              </button>

              {/* 2. Стоимость топлива на 1 км */}
              <button
                type="button"
                onClick={() => {
                  setSelectedKilvoMetric((prev) => (prev === "fuel_cost_km" ? null : "fuel_cost_km"));
                  setShowKilvoAllList(true);
                }}
                className={`rounded-2xl p-3.5 border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between select-none active:scale-95 ${
                  selectedKilvoMetric === "fuel_cost_km"
                    ? "bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500 shadow-md scale-[1.01]"
                    : "bg-neutral-50 hover:bg-neutral-100/80 border-neutral-200/80 shadow-sm hover:border-emerald-200"
                }`}
                title="Нажмите, чтобы выделить стоимость топлива на 1 км"
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-[11px] font-semibold text-neutral-600 truncate">
                    Стоимость топлива на 1 км
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase transition shrink-0 ${
                      selectedKilvoMetric === "fuel_cost_km"
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {selectedKilvoMetric === "fuel_cost_km" ? "Активен ✓" : "Топливо"}
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-extrabold text-emerald-600 font-mono mt-1.5">
                  {fuelCostPerKm} ₽
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
                  расход ~{avgConsumption} л/100км
                </div>
              </button>

              {/* 3. Сумма ремонтов и ТО */}
              <button
                type="button"
                onClick={() => {
                  setSelectedKilvoMetric((prev) => (prev === "service_total" ? null : "service_total"));
                  setShowKilvoAllList(true);
                }}
                className={`rounded-2xl p-3.5 border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between select-none active:scale-95 ${
                  selectedKilvoMetric === "service_total"
                    ? "bg-red-50/90 border-red-400 ring-2 ring-red-500 shadow-md scale-[1.01]"
                    : "bg-neutral-50 hover:bg-neutral-100/80 border-neutral-200/80 shadow-sm hover:border-red-200"
                }`}
                title="Нажмите, чтобы выделить сумму ремонтов и ТО"
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-[11px] font-semibold text-neutral-600 truncate">
                    Сумма ремонтов и ТО
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase transition shrink-0 ${
                      selectedKilvoMetric === "service_total"
                        ? "bg-red-600 text-white"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {selectedKilvoMetric === "service_total" ? "Активен ✓" : "Ремонты"}
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-extrabold text-red-600 font-mono mt-1.5">
                  {totalServiceCost.toLocaleString("ru-RU")} ₽
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
                  {currentVehicleRecords.length} записей в сервисной книге
                </div>
              </button>

              {/* 4. Всего заправлено */}
              <button
                type="button"
                onClick={() => {
                  setSelectedKilvoMetric((prev) => (prev === "fuel_total" ? null : "fuel_total"));
                  setShowKilvoAllList(true);
                }}
                className={`rounded-2xl p-3.5 border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between select-none active:scale-95 ${
                  selectedKilvoMetric === "fuel_total"
                    ? "bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500 shadow-md scale-[1.01]"
                    : "bg-neutral-50 hover:bg-neutral-100/80 border-neutral-200/80 shadow-sm hover:border-emerald-200"
                }`}
                title="Нажмите, чтобы выделить данные по заправкам"
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-[11px] font-semibold text-neutral-600 truncate">
                    Всего заправлено
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase transition shrink-0 ${
                      selectedKilvoMetric === "fuel_total"
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {selectedKilvoMetric === "fuel_total" ? "Активен ✓" : "Топливо"}
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-extrabold text-emerald-600 font-mono mt-1.5">
                  {totalFuelLiters.toLocaleString("ru-RU")} л
                </div>
                <div className="text-[10px] text-emerald-700 font-medium mt-0.5 truncate">
                  {totalFuelCost.toLocaleString("ru-RU")} ₽ на {currentFuelRecords.length} заправках
                </div>
              </button>
            </div>

            {/* Expandable full list of expense records and breakdown */}
            {showKilvoAllList && (
              <div className="pt-3 border-t border-neutral-100 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-800">Структура затрат и последние расходы:</span>
                    {selectedKilvoMetric && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-neutral-900 text-white flex items-center gap-1.5">
                        <span>
                          {selectedKilvoMetric === "cost_per_km" && "Выделено: Полная стоимость 1 км"}
                          {selectedKilvoMetric === "fuel_cost_km" && "Выделено: Топливо на 1 км"}
                          {selectedKilvoMetric === "service_total" && "Выделено: Ремонты и ТО"}
                          {selectedKilvoMetric === "fuel_total" && "Выделено: Всего заправлено"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedKilvoMetric(null)}
                          className="hover:text-red-300 ml-1 font-bold text-xs cursor-pointer"
                          title="Сбросить выделение"
                        >
                          ×
                        </button>
                      </span>
                    )}
                  </div>
                  <button
                    onClick={onOpenExpenses}
                    className="text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                  >
                    Подробная аналитика →
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {/* Service expenses */}
                  {currentVehicleRecords.slice(0, 4).map((rec) => {
                    const isServiceSelected = selectedKilvoMetric === "service_total" || selectedKilvoMetric === "cost_per_km";
                    return (
                      <div
                        key={rec.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                          isServiceSelected
                            ? "bg-purple-50/70 border-purple-300 ring-1 ring-purple-400/50"
                            : "bg-neutral-50 border-neutral-100"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-neutral-800 truncate">{rec.title}</div>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            {rec.date} • {rec.category}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-neutral-900 shrink-0 ml-2">
                          {rec.totalCost.toLocaleString("ru-RU")} ₽
                        </div>
                      </div>
                    );
                  })}
                  {/* Fuel expenses */}
                  {currentFuelRecords.slice(0, 4).map((fuel) => {
                    const isFuelSelected = selectedKilvoMetric === "fuel_cost_km" || selectedKilvoMetric === "fuel_total" || selectedKilvoMetric === "cost_per_km";
                    return (
                      <div
                        key={fuel.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                          isFuelSelected
                            ? "bg-emerald-100/70 border-emerald-400 ring-1 ring-emerald-500/50"
                            : "bg-emerald-50/50 border-emerald-100"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-emerald-950 truncate">
                            Заправка: {fuel.station || "АЗС"} ({fuel.liters} л)
                          </div>
                          <div className="text-[10px] text-emerald-700 font-mono">
                            {fuel.date} • {fuel.fuelType}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-emerald-900 shrink-0 ml-2">
                          {fuel.totalCost.toLocaleString("ru-RU")} ₽
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Two Columns: Upcoming OEM Maintenance & To-Fix Tasks (Equal Height in Open State) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {/* Column 1: OEM Maintenance Checklist */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 hover:border-emerald-200 shadow-sm transition-all duration-200 flex flex-col justify-between h-full">
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOemCollapsed((prev) => !prev)}
                  className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition shrink-0 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                  title={isOemCollapsed ? "Развернуть регламент" : "Скрыть список (оставить оглавление)"}
                >
                  <Calendar className="w-4 h-4 text-emerald-600" />
                </button>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900">
                    Регламент ТО (Заводской план)
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Сроки замены по пробегу для {vehicle.model}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenOemSchedule}
                  className="text-xs text-emerald-600 font-semibold hover:underline cursor-pointer"
                >
                  Весь план
                </button>
                <button
                  type="button"
                  onClick={() => setIsOemCollapsed((prev) => !prev)}
                  className="w-7 h-7 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition cursor-pointer"
                  title={isOemCollapsed ? "Развернуть" : "Скрыть список"}
                >
                  {isOemCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isOemCollapsed && (
              <div className="space-y-2.5 flex-1 flex flex-col justify-between">
                {oemSchedules
                  .filter((i) => i.vehicleId === vehicle.id)
                  .slice(0, 3)
                  .map((item) => {
                    const lastKm = item.lastDoneKm ?? 0;
                    const diffKm = vehicle.currentMileage - lastKm;
                    const percent = Math.min(100, Math.round((diffKm / item.intervalKm) * 100));
                    const isOverdue = diffKm >= item.intervalKm;
                    const isSoon = !isOverdue && diffKm >= item.intervalKm * 0.8;

                    return (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-2xl border transition-all ${
                          isOverdue
                            ? "bg-red-50/40 border-red-200"
                            : isSoon
                            ? "bg-amber-50/40 border-amber-200"
                            : "bg-emerald-50/30 border-emerald-200"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-neutral-800 truncate">
                            {item.title}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isOverdue
                                ? "bg-red-100 text-red-700"
                                : isSoon
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {isOverdue ? "Просрочено" : isSoon ? "Скоро" : "В норме"}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-neutral-200 rounded-full h-1.5 mt-2 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              isOverdue
                                ? "bg-red-500"
                                : isSoon
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1 font-mono">
                          <span>Прошло: {diffKm.toLocaleString("ru-RU")} км</span>
                          <span>Регламент: {item.intervalKm.toLocaleString("ru-RU")} км</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {!isOemCollapsed && (
            <div className="pt-3 mt-3 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs text-neutral-500">
                Подобрано для {vehicle.engine}
              </span>
              <button
                onClick={onOpenOemSchedule}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
              >
                Настроить регламент →
              </button>
            </div>
          )}
        </div>

        {/* Column 2: To-Fix Priority Board & Garage Inventory */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 hover:border-blue-200 shadow-sm transition-all duration-200 flex flex-col justify-between h-full">
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsToFixCollapsed((prev) => !prev)}
                  className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition shrink-0 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                  title={isToFixCollapsed ? "Развернуть задачи и склад" : "Скрыть список (оставить оглавление)"}
                >
                  <Layers className="w-4 h-4 text-blue-600" />
                </button>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900">
                    Гараж: Склад запчастей и To-Fix
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Детали в наличии и план предстоящих работ
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenInventoryToFix}
                  className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                >
                  В гараж
                </button>
                <button
                  type="button"
                  onClick={() => setIsToFixCollapsed((prev) => !prev)}
                  className="w-7 h-7 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition cursor-pointer"
                  title={isToFixCollapsed ? "Развернуть" : "Скрыть список"}
                >
                  {isToFixCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isToFixCollapsed && (
              <div className="space-y-2.5 flex-1 flex flex-col justify-between">
                {pendingTasks.length > 0 ? (
                  pendingTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="p-2.5 rounded-2xl bg-blue-50/40 border border-blue-200/80 hover:border-blue-300 transition-all flex flex-col gap-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0 bg-blue-500" />
                            <span className="text-xs font-semibold text-neutral-900 truncate">
                              {task.title}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono shrink-0">
                              To-Fix
                            </span>
                          </div>
                          {task.description && (
                            <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </div>

                        {task.estimatedCost && (
                          <span className="text-xs font-bold text-neutral-900 font-mono shrink-0">
                            ~{task.estimatedCost.toLocaleString("ru-RU")} ₽
                          </span>
                        )}
                      </div>

                      {/* Work Hint Callout */}
                      <div className="pt-1.5 border-t border-blue-200/50 flex items-start gap-1.5 text-[11px] text-blue-950 bg-blue-100/60 rounded-xl px-2 py-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-tight">
                          {task.workHint || getWorkHint(task.title, task.category)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-2xl bg-blue-50/20 border border-blue-100 text-center text-xs text-blue-600 flex-1 flex items-center justify-center">
                    Все задачи To-Fix выполнены!
                  </div>
                )}
              </div>
            )}
          </div>

          {!isToFixCollapsed && (
            <div className="pt-3 mt-3 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs text-neutral-500">
                Гаражные запасы готовы к ТО
              </span>
              <button
                onClick={onOpenInventoryToFix}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                Склад и задачи →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Repairs Timeline */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsRecentCollapsed((prev) => !prev)}
              className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition shrink-0 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              title={isRecentCollapsed ? "Развернуть недавние работы" : "Скрыть список (оставить оглавление)"}
            >
              <Wrench className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Недавние работы в журнале
              </h3>
              <p className="text-xs text-neutral-500">
                Фиксация дат, пробега, запчастей с артикулами и чеков
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenServiceBook}
              className="text-xs font-semibold px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition cursor-pointer hidden sm:flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Сервисная книжка</span>
            </button>
            <button
              onClick={onOpenHistory}
              className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              Все ({currentVehicleRecords.length}) <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsRecentCollapsed((prev) => !prev)}
              className="w-7 h-7 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition cursor-pointer"
              title={isRecentCollapsed ? "Развернуть" : "Скрыть список (оставить оглавление)"}
            >
              {isRecentCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!isRecentCollapsed && (
          <>
            <div className="divide-y divide-neutral-100">
              {(showAllRecentList ? currentVehicleRecords : recentServices).map((record) => (
                <div key={record.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-neutral-500 font-mono">
                        {record.date}
                      </span>
                      <span className="text-neutral-300">•</span>
                      <span className="text-[11px] font-semibold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-md font-mono">
                        {record.mileage.toLocaleString("ru-RU")} км
                      </span>
                      <span className="text-[10px] bg-red-50 text-red-700 font-medium px-2 py-0.5 rounded-md">
                        {record.category}
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm font-bold text-neutral-900 mt-1 truncate">
                      {record.title}
                    </div>

                    {record.parts.length > 0 && (
                      <div className="text-[11px] text-neutral-500 mt-0.5 truncate">
                        Запчасти:{" "}
                        {record.parts
                          .map((p) => `${p.brand} (${p.partNumber || p.name})`)
                          .join(", ")}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs sm:text-sm font-extrabold text-neutral-900 font-mono">
                      {record.totalCost.toLocaleString("ru-RU")} ₽
                    </div>
                    {record.receiptImages && record.receiptImages.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium mt-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Чек прикреплен
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {currentVehicleRecords.length > 3 && (
              <div className="pt-3 border-t border-neutral-100 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllRecentList((prev) => !prev)}
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 cursor-pointer"
                >
                  {showAllRecentList
                    ? "Свернуть до 3 записей"
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
