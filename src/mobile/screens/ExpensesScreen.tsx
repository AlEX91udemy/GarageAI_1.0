import React, { useState } from "react";
import {
  Wallet,
  Fuel,
  PieChart,
  BarChart3,
  Plus,
  Calendar,
  Gauge,
  ScanLine,
  Camera,
  ChevronRight,
  Car,
  Droplet,
  Trash2,
} from "lucide-react";
import { Vehicle, ServiceRecord, FuelRecord, GaragePart } from "../../types";

const EXPENSE_COLORS = ["#ef4444", "#f59e0b", "#3b82f6"];

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

function donutArc(startAngle: number, endAngle: number, outer: number, inner: number) {
  const startOuter = polarPoint(140, 140, outer, startAngle);
  const endOuter = polarPoint(140, 140, outer, endAngle);
  const startInner = polarPoint(140, 140, inner, endAngle);
  const endInner = polarPoint(140, 140, inner, startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${startOuter.x} ${startOuter.y} A ${outer} ${outer} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y} L ${startInner.x} ${startInner.y} A ${inner} ${inner} 0 ${largeArc} 0 ${endInner.x} ${endInner.y} Z`;
}

interface ExpensesScreenProps {
  vehicle: Vehicle;
  serviceRecords: ServiceRecord[];
  fuelRecords: FuelRecord[];
  garageParts?: GaragePart[];
  onAddFuel: () => void;
  onAddExpense?: () => void;
  onScanReceipt?: () => void;
  onDeleteFuel?: (recordId: string) => void;
}

export const ExpensesScreen: React.FC<ExpensesScreenProps> = ({
  vehicle,
  serviceRecords,
  fuelRecords,
  garageParts = [],
  onAddFuel,
  onAddExpense,
  onScanReceipt,
  onDeleteFuel,
}) => {
  const [activeTab, setActiveTab] = useState<"summary" | "fuel_log">("summary");
  const [chartMode, setChartMode] = useState<"pie" | "bar">("pie");
  const [selectedMetric, setSelectedMetric] = useState<"cost_per_km" | "fuel_cost_km" | "service_total" | "fuel_total" | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [swipedRecordId, setSwipedRecordId] = useState<string | null>(null);
  const swipeStartX = React.useRef<number | null>(null);

  const vehicleFuel = fuelRecords.filter((f) => f.vehicleId === vehicle.id);
  const vehicleServices = serviceRecords.filter((s) => s.vehicleId === vehicle.id);
  const vehicleParts = garageParts.filter(
    (p) => p.vehicleId === vehicle.id || p.vehicleId === "all"
  );

  // Totals
  const fuelTotal = vehicleFuel.reduce((sum, r) => sum + r.totalCost, 0);
  const serviceTotal = vehicleServices.reduce((sum, r) => sum + r.totalCost, 0);
  const partsTotal = vehicleParts.reduce(
    (sum, p) => sum + p.purchasePrice * p.quantity,
    0
  );
  const grandTotal = fuelTotal + serviceTotal + partsTotal;

  // Average fuel consumption
  const totalLiters = vehicleFuel.reduce((sum, r) => sum + r.liters, 0);
  const validConsumptionRecords = vehicleFuel.filter(
    (f) => f.calculatedConsumption && f.calculatedConsumption > 0
  );
  const avgConsumption =
    validConsumptionRecords.length > 0
      ? (
          validConsumptionRecords.reduce(
            (sum, f) => sum + (f.calculatedConsumption || 0),
            0
          ) / validConsumptionRecords.length
        ).toFixed(1)
      : totalLiters > 0 && vehicle.currentMileage > 0
      ? "9.8"
      : "—";

  // Cost per 1 km, using the same tracked mileage window for all metrics.
  const mileagePoints = [
    ...vehicleServices.map((record) => record.mileage),
    ...vehicleFuel.map((record) => record.mileage),
  ].filter((mileage) => Number.isFinite(mileage));
  const startMileage =
    mileagePoints.length > 0
      ? Math.min(...mileagePoints)
      : Math.max(0, vehicle.currentMileage - 30000);
  const trackedMileage = Math.max(1, vehicle.currentMileage - startMileage);
  const costPerKm = grandTotal > 0 ? (grandTotal / trackedMileage).toFixed(2) : "0.00";
  const fuelCostPerKm = fuelTotal > 0 ? (fuelTotal / trackedMileage).toFixed(2) : "0.00";

  const categories = [
    {
      name: "Топливо",
      cost: fuelTotal,
      color: "bg-red-500",
      textColor: "text-red-600",
      percent: grandTotal ? Math.round((fuelTotal / grandTotal) * 100) : 0,
    },
    {
      name: "Техобслуживание",
      cost: serviceTotal,
      color: "bg-amber-500",
      textColor: "text-amber-600",
      percent: grandTotal ? Math.round((serviceTotal / grandTotal) * 100) : 0,
    },
    {
      name: "Запчасти со склада",
      cost: partsTotal,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      percent: grandTotal ? Math.round((partsTotal / grandTotal) * 100) : 0,
    },
  ];
  const nonEmptyCategories = categories.filter((cat) => cat.cost > 0);
  const isCategoryActive = (name: string) => {
    if (activeCategory) return activeCategory === name;
    if (selectedMetric === "fuel_cost_km" || selectedMetric === "fuel_total") return name === "Топливо";
    if (selectedMetric === "service_total") return name === "Техобслуживание";
    return Boolean(selectedMetric);
  };

  return (
    <div className="flex flex-col w-full pb-10 bg-neutral-100 text-neutral-900 select-none">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-neutral-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
              <span>Расходы</span>
              <span className="text-xs font-mono text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-lg">
                Финансы & Топливо
              </span>
            </h2>
            <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-red-600" />
              <span>{vehicle.make} {vehicle.model}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onScanReceipt && (
              <button
                onClick={onScanReceipt}
                className="p-2 rounded-xl bg-neutral-50 hover:bg-neutral-100 text-red-600 border border-neutral-200 transition cursor-pointer"
                title="Сканировать чек"
              >
                <ScanLine className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onAddFuel}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/30 transition cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Заправка</span>
            </button>
            {onAddExpense && (
              <button
                type="button"
                onClick={onAddExpense}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border border-neutral-200 transition cursor-pointer active:scale-95 text-xs font-bold flex items-center gap-1.5"
                title="Добавить расход"
                aria-label="Добавить расход"
              >
                <Wallet className="w-4 h-4" />
                <span>Расход</span>
              </button>
            )}
          </div>
        </div>

        {/* 2 Tabs: Сводка расходов vs Дневник заправок */}
        <div className="mt-3 grid grid-cols-2 p-1 bg-neutral-200/70 rounded-2xl border border-neutral-200">
          <button
            onClick={() => setActiveTab("summary")}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === "summary"
                ? "bg-white text-neutral-900 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Анализ расходов</span>
          </button>

          <button
            onClick={() => setActiveTab("fuel_log")}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === "fuel_log"
                ? "bg-white text-neutral-900 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <Fuel className="w-3.5 h-3.5" />
            <span>Дневник заправок ({vehicleFuel.length})</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3.5">
        {/* Metric Cards Banner */}
        <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 space-y-3 shadow-xs">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-neutral-500 font-medium">
              Всего зафиксировано расходов:
            </span>
            <span className="text-2xl font-black text-neutral-900 font-mono tracking-tight">
              {grandTotal.toLocaleString("ru-RU")} ₽
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-neutral-100">
            <div className="p-2.5 rounded-2xl bg-neutral-50 border border-neutral-200/60">
              <div className="text-[10px] text-neutral-500 flex items-center gap-1">
                <Fuel className="w-3 h-3 text-red-600" />
                <span>Средний расход</span>
              </div>
              <div className="text-base font-black text-neutral-900 font-mono mt-0.5">
                {avgConsumption} <span className="text-xs font-normal text-neutral-400">л/100км</span>
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-neutral-50 border border-neutral-200/60">
              <div className="text-[10px] text-neutral-500 flex items-center gap-1">
                <Gauge className="w-3 h-3 text-emerald-600" />
                <span>Стоимость 1 км</span>
              </div>
              <div className="text-base font-black text-neutral-900 font-mono mt-0.5">
                {costPerKm} <span className="text-xs font-normal text-neutral-400">₽/км</span>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 1: SUMMARY */}
        {activeTab === "summary" && (
          <div className="space-y-3.5">
            {/* SMART OCR RECEIPT SCANNER BANNER (Identical description moved from Home menu) */}
            {onScanReceipt && (
              <div className="bg-gradient-to-r from-neutral-900 via-neutral-850 to-neutral-900 text-white p-4 rounded-3xl border border-neutral-800 shadow-md flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                      <span>Умный сканер чеков</span>
                      <span className="text-[9px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded-full">
                        OCR + AI
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-300 mt-0.5 leading-snug">
                      Распознает сумму, работы и запчасти с артикулами.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onScanReceipt}
                  className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md shadow-red-600/30 whitespace-nowrap active:scale-95 shrink-0"
                >
                  Скан
                </button>
              </div>
            )}

            {/* Interactive category chart */}
            <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 space-y-3 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Структура расходов</h3>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Нажмите категорию или показатель для подсветки</p>
                </div>
                <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200">
                  <button type="button" onClick={() => setChartMode("pie")} className={`p-1.5 rounded-lg transition ${chartMode === "pie" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-400"}`} title="Круговая диаграмма">
                    <PieChart className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => setChartMode("bar")} className={`p-1.5 rounded-lg transition ${chartMode === "bar" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-400"}`} title="Полосовая диаграмма">
                    <BarChart3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  ["cost_per_km", "Стоимость 1 км", `${costPerKm} ₽`],
                  ["fuel_cost_km", "Топливо / км", `${fuelCostPerKm} ₽`],
                  ["service_total", "ТО и ремонт", `${serviceTotal.toLocaleString("ru-RU")} ₽`],
                  ["fuel_total", "Всего топливо", `${fuelTotal.toLocaleString("ru-RU")} ₽`],
                ].map(([key, label, value]) => (
                  <button key={key} type="button" onClick={() => setSelectedMetric((prev) => prev === key ? null : key as typeof selectedMetric)} className={`rounded-2xl border p-2 text-left transition active:scale-95 ${selectedMetric === key ? "bg-neutral-900 text-white border-neutral-900" : "bg-neutral-50 border-neutral-200 hover:border-neutral-300"}`}>
                    <span className={`block text-[10px] font-semibold ${selectedMetric === key ? "text-neutral-300" : "text-neutral-500"}`}>{label}</span>
                    <span className="block text-sm font-black font-mono mt-0.5">{value}</span>
                  </button>
                ))}
              </div>

              {nonEmptyCategories.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">Расходы ещё не добавлены</div>
              ) : chartMode === "pie" ? (
                <div className="relative w-52 h-52 mx-auto">
                  <svg viewBox="0 0 280 280" className="w-full h-full">
                    {(() => {
                      let angle = -Math.PI / 2;
                      if (nonEmptyCategories.length === 1) {
                        const cat = nonEmptyCategories[0];
                        const active = isCategoryActive(cat.name);
                        const dimmed = Boolean(activeCategory || selectedMetric) && !active;
                        return (
                          <circle
                            cx="140"
                            cy="140"
                            r={active ? 83 : 85}
                            fill="none"
                            stroke={EXPENSE_COLORS[0]}
                            strokeWidth={active ? 46 : 40}
                            opacity={dimmed ? 0.25 : 1}
                            className="cursor-pointer transition-all duration-200"
                            onClick={() => setActiveCategory((prev) => prev === cat.name ? null : cat.name)}
                          />
                        );
                      }
                      return nonEmptyCategories.map((cat, idx) => {
                        const next = angle + (cat.cost / grandTotal) * Math.PI * 2;
                        const active = isCategoryActive(cat.name);
                        const dimmed = Boolean(activeCategory || selectedMetric) && !active;
                        const path = donutArc(angle, next, active ? 108 : 101, active ? 62 : 68);
                        angle = next;
                        return <path key={cat.name} d={path} fill={EXPENSE_COLORS[idx % EXPENSE_COLORS.length]} opacity={dimmed ? 0.25 : 1} className="cursor-pointer transition-all duration-200" onClick={() => setActiveCategory((prev) => prev === cat.name ? null : cat.name)} />;
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-[10px] text-neutral-400">Всего</span>
                    <span className="text-lg font-black font-mono text-neutral-900">{grandTotal.toLocaleString("ru-RU")} ₽</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  {nonEmptyCategories.map((cat, idx) => {
                    const active = isCategoryActive(cat.name);
                    return <button key={cat.name} type="button" onClick={() => setActiveCategory((prev) => prev === cat.name ? null : cat.name)} className="w-full text-left"><div className="flex items-center justify-between text-[11px] mb-1"><span className="font-semibold text-neutral-700">{cat.name}</span><span className="font-mono font-bold">{cat.percent}%</span></div><div className="h-3 rounded-full bg-neutral-100 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${cat.percent}%`, backgroundColor: EXPENSE_COLORS[idx % EXPENSE_COLORS.length], opacity: activeCategory || selectedMetric ? (active ? 1 : 0.25) : 1 }} /></div></button>;
                  })}
                </div>
              )}

              <div className="space-y-1.5 pt-1">
                {categories.map((cat, idx) => <button key={cat.name} type="button" onClick={() => setActiveCategory((prev) => prev === cat.name ? null : cat.name)} className={`w-full flex items-center justify-between text-xs py-1.5 rounded-lg px-1 transition ${activeCategory === cat.name ? "bg-neutral-100" : ""}`}><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: EXPENSE_COLORS[idx % EXPENSE_COLORS.length] }} /><span className="text-neutral-700 font-medium">{cat.name}</span></span><span className="font-mono font-bold text-neutral-900">{cat.cost.toLocaleString("ru-RU")} ₽ <span className="text-[10px] text-neutral-400">({cat.percent}%)</span></span></button>)}
              </div>
            </div>

            {/* AI OCR Scanner banner */}
            {onScanReceipt && (
              <div
                onClick={onScanReceipt}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-neutral-900 to-neutral-850 text-white border border-neutral-800 hover:border-neutral-700 flex items-center justify-between cursor-pointer active:scale-[0.99] transition shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-red-600/20 flex items-center justify-center text-red-400 border border-red-500/30">
                    <ScanLine className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Сканировать кассовый чек
                    </h4>
                    <p className="text-[10px] text-neutral-300">
                      Распознавание бензина, запчастей и услуг автосервиса
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FUEL LOG */}
        {activeTab === "fuel_log" && (
          <div className="space-y-2.5">
            {vehicleFuel.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-neutral-200/90 shadow-xs space-y-2">
                <Fuel className="w-8 h-8 text-neutral-400 mx-auto" />
                <div className="text-xs font-bold text-neutral-700">
                  Нет записей заправок
                </div>
                <p className="text-[11px] text-neutral-500">
                  Фиксируйте каждую заправку для точного расчета расхода топлива
                </p>
                <button
                  onClick={onAddFuel}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold cursor-pointer"
                >
                  + Внести заправку
                </button>
              </div>
            ) : (
              vehicleFuel.map((record) => (
                <div
                  key={record.id}
                  className="relative overflow-hidden rounded-3xl border border-neutral-200/90 shadow-xs"
                  onTouchStart={(event) => { swipeStartX.current = event.touches[0]?.clientX ?? null; }}
                  onTouchEnd={(event) => {
                    const startX = swipeStartX.current;
                    const endX = event.changedTouches[0]?.clientX ?? startX ?? 0;
                    if (startX !== null && startX - endX > 45 && onDeleteFuel) setSwipedRecordId(record.id);
                    if (startX !== null && endX - startX > 45) setSwipedRecordId(null);
                    swipeStartX.current = null;
                  }}
                >
                  {onDeleteFuel && (
                    <button type="button" aria-label="Удалить запись о заправке" onClick={() => { onDeleteFuel(record.id); setSwipedRecordId(null); }} className="absolute inset-y-0 right-0 w-20 bg-red-600 text-white flex flex-col items-center justify-center gap-1 text-[10px] font-bold">
                      <Trash2 className="w-4 h-4" />
                      <span>Удалить</span>
                    </button>
                  )}
                  <div className={`relative z-10 p-3.5 bg-white transition-transform duration-200 space-y-2 ${swipedRecordId === record.id ? "-translate-x-20" : "translate-x-0"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 border border-red-200">
                          {record.fuelType || "АИ-95"}
                        </span>
                        <span className="text-xs font-bold text-neutral-900">
                          {record.station || "АЗС"}
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-1 font-mono flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>{record.date}</span>
                        <span>•</span>
                        <span>{record.mileage.toLocaleString("ru-RU")} км</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-right">
                      <div>
                        <div className="text-xs font-mono font-bold text-neutral-900">
                          {record.totalCost.toLocaleString("ru-RU")} ₽
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          {record.liters} л по {record.pricePerLiter} ₽
                        </div>
                      </div>
                      {onDeleteFuel && (
                        <button
                          type="button"
                          aria-label="Удалить запись о заправке"
                          title="Удалить запись"
                          onClick={() => { onDeleteFuel(record.id); setSwipedRecordId(null); }}
                          className="w-7 h-7 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 flex items-center justify-center transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {record.calculatedConsumption && (
                    <div className="pt-1.5 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                      <span className="text-neutral-500">Расход по этой заправке:</span>
                      <span className="font-mono font-bold text-emerald-600 flex items-center gap-1">
                        <Droplet className="w-3 h-3" />
                        {record.calculatedConsumption} л / 100 км
                      </span>
                    </div>
                  )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
