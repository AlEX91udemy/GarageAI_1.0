import React, { useState } from "react";
import {
  Fuel,
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  Plus,
  Calendar,
  Gauge,
  DollarSign,
  ChevronRight,
  ArrowDownRight,
  Zap,
} from "lucide-react";
import { Vehicle, ServiceRecord, FuelRecord } from "../types";

// Palette for expense category chart slices and badges
const CATEGORY_PALETTE = [
  { hex: "#10b981", bg: "bg-emerald-500", text: "text-emerald-700", ring: "ring-emerald-400" },
  { hex: "#EF3038", bg: "bg-brand", text: "text-brand-strong", ring: "ring-brand-border" },
  { hex: "#3b82f6", bg: "bg-blue-500", text: "text-blue-700", ring: "ring-blue-400" },
  { hex: "#f59e0b", bg: "bg-amber-500", text: "text-amber-700", ring: "ring-amber-400" },
  { hex: "#8b5cf6", bg: "bg-chart-5", text: "text-chart-5-strong", ring: "ring-chart-5" },
  { hex: "#ec4899", bg: "bg-chart-7", text: "text-chart-7-strong", ring: "ring-chart-7" },
  { hex: "#06b6d4", bg: "bg-chart-6", text: "text-chart-6-strong", ring: "ring-chart-6" },
  { hex: "#6b7280", bg: "bg-neutral-500", text: "text-neutral-700", ring: "ring-neutral-400" },
];

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInRadians: number) {
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeDonutArc(
  x: number,
  y: number,
  radius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const startOuter = polarToCartesian(x, y, radius, startAngle);
  const endOuter = polarToCartesian(x, y, radius, endAngle);
  const startInner = polarToCartesian(x, y, innerRadius, endAngle);
  const endInner = polarToCartesian(x, y, innerRadius, startAngle);

  const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";

  return [
    "M",
    startOuter.x.toFixed(2),
    startOuter.y.toFixed(2),
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    1,
    endOuter.x.toFixed(2),
    endOuter.y.toFixed(2),
    "L",
    startInner.x.toFixed(2),
    startInner.y.toFixed(2),
    "A",
    innerRadius,
    innerRadius,
    0,
    largeArcFlag,
    0,
    endInner.x.toFixed(2),
    endInner.y.toFixed(2),
    "Z",
  ].join(" ");
}

interface ExpensesFuelViewProps {
  vehicle: Vehicle;
  serviceRecords: ServiceRecord[];
  fuelRecords: FuelRecord[];
  onAddFuelRecord: (record: FuelRecord) => void;
  onOpenAddService: () => void;
}

export const ExpensesFuelView: React.FC<ExpensesFuelViewProps> = ({
  vehicle,
  serviceRecords,
  fuelRecords,
  onAddFuelRecord,
  onOpenAddService,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "fuel_log">("overview");
  const [showAddFuelModal, setShowAddFuelModal] = useState(false);
  const [chartMode, setChartMode] = useState<"pie" | "bar">("pie");
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<
    "cost_per_km" | "fuel_cost_km" | "service_total" | "fuel_total" | null
  >(null);

  // New Fuel form state
  const [fuelDate, setFuelDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [fuelMileage, setFuelMileage] = useState(vehicle.currentMileage);
  const [liters, setLiters] = useState(50);
  const [pricePerLiter, setPricePerLiter] = useState(59.5);
  const [fuelType, setFuelType] = useState("АИ-95");
  const [isFullTank, setIsFullTank] = useState(true);
  const [station, setStation] = useState("Лукойл");

  const currentServices = serviceRecords.filter(
    (r) => r.vehicleId === vehicle.id
  );
  const currentFuels = fuelRecords.filter((f) => f.vehicleId === vehicle.id);

  // Totals
  const totalServiceCost = currentServices.reduce((s, r) => s + r.totalCost, 0);
  const totalFuelCost = currentFuels.reduce((s, f) => s + f.totalCost, 0);
  const totalExpenses = totalServiceCost + totalFuelCost;

  // Category breakdown
  const categoryTotals: Record<string, number> = {
    "Топливо": totalFuelCost,
    "ТО и жидкости": 0,
    "Подвеска и тормоза": 0,
    "Трансмиссия и ДВС": 0,
    "Электрика и датчики": 0,
    "Шины и диски": 0,
    "Другое": 0,
  };

  currentServices.forEach((record) => {
    if (record.category === "ТО и замена жидкостей") {
      categoryTotals["ТО и жидкости"] += record.totalCost;
    } else if (
      record.category === "Подвеска и рулевое" ||
      record.category === "Тормозная система"
    ) {
      categoryTotals["Подвеска и тормоза"] += record.totalCost;
    } else if (
      record.category === "Трансмиссия и сцепление" ||
      record.category === "Двигатель"
    ) {
      categoryTotals["Трансмиссия и ДВС"] += record.totalCost;
    } else if (record.category === "Электрика и датчики") {
      categoryTotals["Электрика и датчики"] += record.totalCost;
    } else if (record.category === "Шины и диски") {
      categoryTotals["Шины и диски"] += record.totalCost;
    } else {
      categoryTotals["Другое"] += record.totalCost;
    }
  });

  const categoryEntries = Object.entries(categoryTotals).filter(
    ([_, val]) => val > 0
  );

  // Mileage span
  const allRecordedMileages = [
    ...currentServices.map((s) => s.mileage),
    ...currentFuels.map((f) => f.mileage),
  ].filter((m) => typeof m === "number" && m > 0);

  const minKm =
    allRecordedMileages.length > 0
      ? Math.min(...allRecordedMileages)
      : Math.max(0, vehicle.currentMileage - 30000);
  const kmDelta = vehicle.currentMileage - minKm;
  const trackedKm =
    kmDelta > 0
      ? kmDelta
      : vehicle.currentMileage > 0
      ? vehicle.currentMileage
      : 1;

  const costPerKm = (totalExpenses / trackedKm).toFixed(2);
  const fuelCostPerKm = (totalFuelCost / trackedKm).toFixed(2);

  // Avg fuel consumption strictly from recorded consumption logs
  const fuelsWithConsumption = currentFuels.filter(
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
      : currentFuels.length > 0
      ? "—"
      : "0.0";

  const totalFuelLiters = currentFuels
    .reduce((s, f) => s + f.liters, 0)
    .toFixed(0);

  const isCategoryHighlightedByMetric = (cat: string) => {
    if (!selectedMetric) return false;
    if (selectedMetric === "cost_per_km") return true;
    if (selectedMetric === "fuel_cost_km" || selectedMetric === "fuel_total")
      return cat === "Топливо";
    if (selectedMetric === "service_total") return cat !== "Топливо";
    return false;
  };

  const isCategoryActive = (cat: string) => {
    if (hoveredCategory) return hoveredCategory === cat;
    if (selectedMetric) return isCategoryHighlightedByMetric(cat);
    return false;
  };

  const isAnyCategoryFilterActive =
    hoveredCategory !== null || selectedMetric !== null;

  // Handle Save Fuel
  const handleSaveFuel = (e: React.FormEvent) => {
    e.preventDefault();

    const totalCost = Math.round(Number(liters) * Number(pricePerLiter));

    // Calculate consumption from previous fuel record if full tank
    let calculatedConsumption: number | undefined = undefined;
    const sortedExistingFuels = [...currentFuels].sort(
      (a, b) => b.mileage - a.mileage
    );
    if (sortedExistingFuels.length > 0) {
      const prev = sortedExistingFuels[0];
      const deltaKm = Number(fuelMileage) - prev.mileage;
      if (deltaKm > 0) {
        calculatedConsumption = Number(((Number(liters) / deltaKm) * 100).toFixed(1));
      }
    }

    const newFuelRecord: FuelRecord = {
      id: "fuel-" + crypto.randomUUID(),
      vehicleId: vehicle.id,
      date: fuelDate,
      mileage: Number(fuelMileage),
      liters: Number(liters),
      pricePerLiter: Number(pricePerLiter),
      totalCost,
      fuelType,
      isFullTank,
      station,
      calculatedConsumption,
    };

    onAddFuelRecord(newFuelRecord);
    setShowAddFuelModal(false);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Финансовая аналитика и учёт топлива
          </div>
          <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
            Аналитика затрат
          </h2>
          <p className="text-xs text-neutral-500">
            Всего учтено расходов на сумму{" "}
            <strong className="text-neutral-900 font-mono">
              {totalExpenses.toLocaleString("ru-RU")} ₽
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowAddFuelModal(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95"
          >
            <Fuel className="w-4 h-4" />
            <span>Добавить заправку</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "overview"
              ? "bg-neutral-900 text-white shadow-sm"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          Общая аналитика и диаграммы
        </button>
        <button
          onClick={() => setActiveTab("fuel_log")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "fuel_log"
              ? "bg-neutral-900 text-white shadow-sm"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          <Fuel className="w-3.5 h-3.5" />
          <span>Журнал заправок ({currentFuels.length})</span>
        </button>
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-4">
          {/* Kilvo Key Performance Selectable Metric Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Полная стоимость 1 км */}
            <button
              type="button"
              onClick={() =>
                setSelectedMetric((prev) =>
                  prev === "cost_per_km" ? null : "cost_per_km"
                )
              }
              className={`rounded-3xl p-4 border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between select-none active:scale-95 ${
                selectedMetric === "cost_per_km"
                  ? "bg-neutral-900 text-white border-neutral-900 ring-2 ring-neutral-700 shadow-md scale-[1.01]"
                  : "bg-white hover:bg-neutral-50 border-neutral-200/80 shadow-sm hover:border-neutral-300"
              }`}
              title="Нажмите, чтобы выделить все категории расходов в структуре затрат"
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className={`text-[11px] font-semibold truncate ${selectedMetric === "cost_per_km" ? "text-neutral-300" : "text-neutral-600"}`}>
                  Полная стоимость 1 км
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase transition shrink-0 ${
                    selectedMetric === "cost_per_km"
                      ? "bg-neutral-700 text-white"
                      : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {selectedMetric === "cost_per_km" ? "Активен ✓" : "Фильтр"}
                </span>
              </div>
              <div className={`text-xl font-extrabold font-mono mt-1 ${selectedMetric === "cost_per_km" ? "text-white" : "text-neutral-900"}`}>
                {costPerKm} ₽
              </div>
              <div className={`text-[10px] mt-0.5 ${selectedMetric === "cost_per_km" ? "text-neutral-400" : "text-neutral-400"}`}>
                Сервис + бензин (все категории)
              </div>
            </button>

            {/* 2. Стоимость топлива на 1 км */}
            <button
              type="button"
              onClick={() =>
                setSelectedMetric((prev) =>
                  prev === "fuel_cost_km" ? null : "fuel_cost_km"
                )
              }
              className={`rounded-3xl p-4 border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between select-none active:scale-95 ${
                selectedMetric === "fuel_cost_km"
                  ? "bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500 shadow-md scale-[1.01]"
                  : "bg-white hover:bg-neutral-50 border-neutral-200/80 shadow-sm hover:border-emerald-200"
              }`}
              title="Нажмите, чтобы выделить категорию «Топливо» в структуре затрат"
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="text-[11px] text-neutral-600 font-semibold truncate">
                  Стоимость топлива на 1 км
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase transition shrink-0 ${
                    selectedMetric === "fuel_cost_km"
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {selectedMetric === "fuel_cost_km" ? "Активен ✓" : "Топливо"}
                </span>
              </div>
              <div className="text-xl font-extrabold text-emerald-600 font-mono mt-1">
                {fuelCostPerKm} ₽
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">
                {avgConsumption !== "—" && avgConsumption !== "0.0"
                  ? `при расходе ~${avgConsumption} л/100км`
                  : currentFuels.length > 0
                  ? "расчёт от 2-х заправок"
                  : "нет данных о заправках"}
              </div>
            </button>

            {/* 3. Сумма ремонтов и ТО */}
            <button
              type="button"
              onClick={() =>
                setSelectedMetric((prev) =>
                  prev === "service_total" ? null : "service_total"
                )
              }
              className={`rounded-3xl p-4 border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between select-none active:scale-95 ${
                selectedMetric === "service_total"
                  ? "bg-brand-soft/90 border-brand-light ring-2 ring-brand-border shadow-md scale-[1.01]"
                  : "bg-white hover:bg-neutral-50 border-neutral-200/80 shadow-sm hover:border-brand-border"
              }`}
              title="Нажмите, чтобы выделить статьи ТО и ремонтов в структуре затрат"
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="text-[11px] text-neutral-600 font-semibold truncate">
                  Сумма ремонтов и ТО
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase transition shrink-0 ${
                    selectedMetric === "service_total"
                      ? "bg-brand-strong text-white"
                      : "bg-brand-soft-strong text-brand-hover"
                  }`}
                >
                  {selectedMetric === "service_total" ? "Активен ✓" : "Ремонты"}
                </span>
              </div>
              <div className="text-xl font-extrabold text-brand-strong font-mono mt-1">
                {totalServiceCost.toLocaleString("ru-RU")} ₽
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">
                {currentServices.length} заказ-нарядов
              </div>
            </button>

            {/* 4. Всего заправлено */}
            <button
              type="button"
              onClick={() =>
                setSelectedMetric((prev) =>
                  prev === "fuel_total" ? null : "fuel_total"
                )
              }
              className={`rounded-3xl p-4 border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between select-none active:scale-95 ${
                selectedMetric === "fuel_total"
                  ? "bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500 shadow-md scale-[1.01]"
                  : "bg-white hover:bg-neutral-50 border-neutral-200/80 shadow-sm hover:border-emerald-200"
              }`}
              title="Нажмите, чтобы выделить заправки в структуре затрат"
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="text-[11px] text-neutral-600 font-semibold truncate">
                  Всего заправлено
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase transition shrink-0 ${
                    selectedMetric === "fuel_total"
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {selectedMetric === "fuel_total" ? "Активен ✓" : "Топливо"}
                </span>
              </div>
              <div className="text-xl font-extrabold text-emerald-600 font-mono mt-1 flex items-baseline gap-1">
                {totalFuelLiters}{" "}
                <span className="text-xs font-normal text-emerald-700 font-sans">литров</span>
              </div>
              <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                на {totalFuelCost.toLocaleString("ru-RU")} ₽ ({currentFuels.length} заправок)
              </div>
            </button>
          </div>

          {/* Category Breakdown with Working Pie / Donut Chart and Bar Toggle */}
          <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Структура затрат по категориям
                </h3>
                <p className="text-xs text-neutral-500">
                  Доля каждой группы расходов в общем бюджете
                </p>
              </div>

              {/* Interactive View Switchers */}
              <div className="flex items-center self-start sm:self-auto">
                <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs">
                  <button
                    id="pie-chart-mode-btn"
                    type="button"
                    onClick={() => setChartMode("pie")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                      chartMode === "pie"
                        ? "bg-white text-neutral-900 shadow-xs font-bold"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                    title="Круговая диаграмма расходов"
                  >
                    <PieIcon className="w-3.5 h-3.5 text-neutral-700" />
                    <span>Круговая</span>
                  </button>
                  <button
                    id="bar-chart-mode-btn"
                    type="button"
                    onClick={() => setChartMode("bar")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                      chartMode === "bar"
                        ? "bg-white text-neutral-900 shadow-xs font-bold"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                    title="Линейная диаграмма расходов"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-neutral-700" />
                    <span>Полоса</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Active Metric Highlight Notification Banner */}
            {selectedMetric && (
              <div className="flex items-center justify-between p-2.5 px-3.5 rounded-2xl bg-neutral-900 text-white text-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="font-medium">
                    {selectedMetric === "cost_per_km" &&
                      "Выделены все категории (Полная стоимость 1 км)"}
                    {selectedMetric === "fuel_cost_km" &&
                      "Выделена категория «Топливо» (Стоимость топлива на 1 км)"}
                    {selectedMetric === "service_total" &&
                      "Выделены категории обслуживания и ремонта (Сумма ремонтов и ТО)"}
                    {selectedMetric === "fuel_total" &&
                      "Выделена категория «Топливо» (Всего заправлено)"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMetric(null)}
                  className="text-neutral-300 hover:text-white font-semibold cursor-pointer underline text-[11px] shrink-0 ml-2"
                >
                  Сбросить выделение
                </button>
              </div>
            )}

            {categoryEntries.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-xs">
                Расходы еще не добавлены. Заправьте автомобиль или добавьте заказ-наряд, чтобы увидеть диаграмму.
              </div>
            ) : chartMode === "pie" ? (
              /* Circular (Pie / Donut) Diagram */
              <div className="py-2">
                <div className="relative w-60 h-60 sm:w-64 sm:h-64 mx-auto flex items-center justify-center">
                  <svg viewBox="0 0 280 280" className="w-full h-full drop-shadow-xs">
                    {(() => {
                      if (categoryEntries.length === 1) {
                        const [cat] = categoryEntries[0];
                        const color = CATEGORY_PALETTE[0];
                        const isHovered = isCategoryActive(cat);
                        return (
                          <circle
                            cx="140"
                            cy="140"
                            r="88"
                            stroke={color.hex}
                            strokeWidth={isHovered ? "42" : "36"}
                            fill="none"
                            className="cursor-pointer transition-all duration-300"
                            onMouseEnter={() => setHoveredCategory(cat)}
                            onMouseLeave={() => setHoveredCategory(null)}
                          />
                        );
                      }

                      let currentAngle = -Math.PI / 2;
                      return categoryEntries.map(([cat, amount], idx) => {
                        const sliceAngle =
                          totalExpenses > 0 ? (amount / totalExpenses) * 2 * Math.PI : 0;
                        const startAngle = currentAngle;
                        const endAngle = currentAngle + sliceAngle;
                        currentAngle = endAngle;

                        const color = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
                        const isHovered = isCategoryActive(cat);
                        const isDimmed = isAnyCategoryFilterActive && !isHovered;
                        const pct =
                          totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : "0";

                        const path = describeDonutArc(
                          140,
                          140,
                          isHovered ? 112 : 105,
                          isHovered ? 66 : 70,
                          startAngle,
                          endAngle
                        );

                        return (
                          <path
                            key={cat}
                            d={path}
                            fill={color.hex}
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            className="cursor-pointer transition-all duration-200"
                            style={{
                              opacity: isDimmed ? 0.25 : 1,
                              filter: isHovered
                                ? "drop-shadow(0 4px 12px rgba(0,0,0,0.25))"
                                : "none",
                            }}
                            onMouseEnter={() => setHoveredCategory(cat)}
                            onMouseLeave={() => setHoveredCategory(null)}
                            onClick={() =>
                              setHoveredCategory((prev) => (prev === cat ? null : cat))
                            }
                          >
                            <title>{`${cat}: ${amount.toLocaleString("ru-RU")} ₽ (${pct}%)`}</title>
                          </path>
                        );
                      });
                    })()}
                  </svg>

                  {/* Centered statistics indicator */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                    {hoveredCategory &&
                    categoryEntries.some(([c]) => c === hoveredCategory) ? (
                      (() => {
                        const activeItem = categoryEntries.find(
                          ([c]) => c === hoveredCategory
                        )!;
                        const idx = categoryEntries.findIndex(
                          ([c]) => c === hoveredCategory
                        );
                        const color = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
                        const pct =
                          totalExpenses > 0
                            ? ((activeItem[1] / totalExpenses) * 100).toFixed(1)
                            : "0";
                        return (
                          <div className="animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                                style={{ backgroundColor: color.hex }}
                              />
                              <span className="text-xs font-bold text-neutral-700 truncate max-w-[130px]">
                                {hoveredCategory}
                              </span>
                            </div>
                            <div className="text-xl sm:text-2xl font-black text-neutral-900 font-mono tracking-tight leading-none">
                              {activeItem[1].toLocaleString("ru-RU")} ₽
                            </div>
                            <div className="mt-1">
                              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200/80">
                                {pct}% от бюджета
                              </span>
                            </div>
                          </div>
                        );
                      })()
                    ) : selectedMetric ? (
                      <div className="animate-in fade-in zoom-in-95 duration-150">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                          {selectedMetric === "cost_per_km" && "Полная стоимость"}
                          {selectedMetric === "fuel_cost_km" && "Топливо на 1 км"}
                          {selectedMetric === "service_total" && "Сумма сервиса"}
                          {selectedMetric === "fuel_total" && "Всего заправлено"}
                        </span>
                        <div className="text-xl sm:text-2xl font-black text-neutral-900 font-mono tracking-tight mt-0.5 leading-none">
                          {selectedMetric === "cost_per_km" && `${costPerKm} ₽/км`}
                          {selectedMetric === "fuel_cost_km" && `${fuelCostPerKm} ₽/км`}
                          {selectedMetric === "service_total" &&
                            `${totalServiceCost.toLocaleString("ru-RU")} ₽`}
                          {selectedMetric === "fuel_total" && `${totalFuelLiters} л`}
                        </div>
                        <div className="mt-1">
                          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200/80">
                            {selectedMetric === "cost_per_km" && "Все расходы (100%)"}
                            {selectedMetric === "fuel_cost_km" &&
                              `${totalFuelCost.toLocaleString("ru-RU")} ₽ (${
                                totalExpenses > 0
                                  ? ((totalFuelCost / totalExpenses) * 100).toFixed(1)
                                  : 0
                              }%)`}
                            {selectedMetric === "service_total" &&
                              `${currentServices.length} заказ-нарядов`}
                            {selectedMetric === "fuel_total" &&
                              `на ${totalFuelCost.toLocaleString("ru-RU")} ₽`}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                          Всего затрат
                        </span>
                        <div className="text-xl sm:text-2xl font-black text-neutral-900 font-mono tracking-tight mt-0.5 leading-none">
                          {totalExpenses.toLocaleString("ru-RU")} ₽
                        </div>
                        <span className="text-[11px] text-neutral-500 font-semibold block mt-1">
                          {categoryEntries.length}{" "}
                          {categoryEntries.length === 1 ? "категория" : "категорий"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Linear Segmented Bar View */
              <div className="space-y-1.5 py-1">
                <div className="w-full h-3 rounded-full overflow-hidden flex bg-neutral-100">
                  {categoryEntries.map(([cat, amount], idx) => {
                    const color = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
                    const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                    const isHovered = isCategoryActive(cat);
                    const isDimmed = isAnyCategoryFilterActive && !isHovered;
                    return (
                      <div
                        key={cat}
                        style={{ width: `${pct}%`, opacity: isDimmed ? 0.25 : 1 }}
                        onMouseEnter={() => setHoveredCategory(cat)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        className={`${color.bg} transition-all cursor-pointer ${
                          isHovered ? "brightness-110" : ""
                        }`}
                        title={`${cat}: ${amount.toLocaleString("ru-RU")} ₽ (${pct.toFixed(1)}%)`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category breakdown table with interactive highlight syncing */}
            {categoryEntries.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {categoryEntries.map(([cat, amount], idx) => {
                  const color = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
                  const pct =
                    totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : "0";
                  const isHovered = isCategoryActive(cat);
                  const isDimmed = isAnyCategoryFilterActive && !isHovered;

                  return (
                    <div
                      key={cat}
                      onMouseEnter={() => setHoveredCategory(cat)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      onClick={() =>
                        setHoveredCategory((prev) => (prev === cat ? null : cat))
                      }
                      className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition cursor-pointer select-none ${
                        isDimmed
                          ? "opacity-35 grayscale-[30%] bg-neutral-50 border-neutral-100 hover:opacity-100 hover:grayscale-0"
                          : selectedMetric === "cost_per_km"
                          ? "bg-blue-50/90 border-blue-400 ring-2 ring-blue-400/60 scale-[1.01] shadow-xs"
                          : (selectedMetric === "fuel_cost_km" || selectedMetric === "fuel_total") &&
                            cat === "Топливо"
                          ? "bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/70 scale-[1.02] shadow-sm"
                          : selectedMetric === "service_total" && cat !== "Топливо"
                          ? "bg-brand-soft/90 border-brand-light ring-2 ring-brand-border/60 scale-[1.01] shadow-xs"
                          : isHovered
                          ? "bg-neutral-100 border-neutral-300 ring-2 ring-neutral-400/30 scale-[1.01]"
                          : "bg-neutral-50 border-neutral-100 hover:bg-neutral-100/70"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-3 h-3 rounded-full shrink-0 shadow-xs ${color.bg}`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-neutral-800 truncate text-xs sm:text-sm">
                              {cat}
                            </span>
                            {selectedMetric === "cost_per_km" && (
                              <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">
                                ✓ 1 км
                              </span>
                            )}
                            {selectedMetric === "fuel_cost_km" && cat === "Топливо" && (
                              <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                                ✓ {fuelCostPerKm} ₽/км
                              </span>
                            )}
                            {selectedMetric === "fuel_total" && cat === "Топливо" && (
                              <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                                ✓ {totalFuelLiters} л
                              </span>
                            )}
                            {selectedMetric === "service_total" && cat !== "Топливо" && (
                              <span className="text-[9px] font-bold text-brand-hover bg-brand-soft-strong px-1.5 py-0.5 rounded-full">
                                ✓ Ремонты / ТО
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right font-mono shrink-0 ml-2">
                        <span className="font-bold text-neutral-900 text-xs sm:text-sm">
                          {amount.toLocaleString("ru-RU")} ₽
                        </span>{" "}
                        <span className="text-neutral-400 text-[10px] sm:text-[11px]">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Fuel Log Table */
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Журнал заправок
              </h3>
              <p className="text-xs text-neutral-500">
                Хронология заправок, расход на 100 км и цены топлива
              </p>
            </div>
            <button
              onClick={() => setShowAddFuelModal(true)}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
            >
              + Заправить
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-100 text-neutral-600 font-semibold text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-xl">Дата</th>
                  <th className="py-2.5 px-3">Пробег</th>
                  <th className="py-2.5 px-3">Топливо</th>
                  <th className="py-2.5 px-3 text-right">Объем</th>
                  <th className="py-2.5 px-3 text-right">Цена/л</th>
                  <th className="py-2.5 px-3 text-right">Сумма</th>
                  <th className="py-2.5 px-3 text-right rounded-r-xl">Расход</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-800">
                {currentFuels.map((fuel) => (
                  <tr key={fuel.id} className="hover:bg-neutral-50">
                    <td className="py-3 px-3 font-medium font-mono">{fuel.date}</td>
                    <td className="py-3 px-3 font-mono font-bold">
                      {fuel.mileage.toLocaleString("ru-RU")} км
                    </td>
                    <td className="py-3 px-3">
                      <span className="bg-neutral-100 px-2 py-0.5 rounded text-[11px] font-semibold">
                        {fuel.fuelType}
                      </span>{" "}
                      <span className="text-neutral-500 text-[11px]">
                        {fuel.station || ""}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      {fuel.liters.toFixed(1)} л
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-neutral-600">
                      {fuel.pricePerLiter.toFixed(2)} ₽
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold text-neutral-900">
                      {fuel.totalCost.toLocaleString("ru-RU")} ₽
                    </td>
                    <td className="py-3 px-3 text-right">
                      {fuel.calculatedConsumption ? (
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {fuel.calculatedConsumption} л/100км
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Fuel Modal */}
      {showAddFuelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <Fuel className="w-5 h-5 text-emerald-600" />
              <span>Добавить заправку</span>
            </h3>

            <form onSubmit={handleSaveFuel} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Дата заправки
                  </label>
                  <input
                    type="date"
                    value={fuelDate}
                    onChange={(e) => setFuelDate(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Текущий пробег (км)
                  </label>
                  <input
                    type="number"
                    value={fuelMileage}
                    onChange={(e) => setFuelMileage(Number(e.target.value))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Залито литров
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={liters}
                    onChange={(e) => setLiters(Number(e.target.value))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Цена за 1 литр (₽)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={pricePerLiter}
                    onChange={(e) => setPricePerLiter(Number(e.target.value))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Тип топлива
                  </label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="АИ-92">АИ-92</option>
                    <option value="АИ-95">АИ-95</option>
                    <option value="АИ-98">АИ-98</option>
                    <option value="АИ-100">АИ-100</option>
                    <option value="ДТ (Дизель)">ДТ (Дизель)</option>
                    <option value="Газ (LPG/CNG)">Газ (LPG/CNG)</option>
                    <option value="Электро (кВт*ч)">Электро (кВт*ч)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Сеть АЗС
                  </label>
                  <input
                    type="text"
                    placeholder="Лукойл, Газпромнефть, Роснефть..."
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="fullTankCheckbox"
                  checked={isFullTank}
                  onChange={(e) => setIsFullTank(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <label
                  htmlFor="fullTankCheckbox"
                  className="font-medium text-neutral-700 cursor-pointer text-xs"
                >
                  Заправка до полного бака (для расчета расхода)
                </label>
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl text-right">
                <div className="text-[11px] text-emerald-800">Итоговая сумма:</div>
                <div className="text-xl font-extrabold text-emerald-900 font-mono">
                  {Math.round(Number(liters) * Number(pricePerLiter)).toLocaleString("ru-RU")} ₽
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFuelModal(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
