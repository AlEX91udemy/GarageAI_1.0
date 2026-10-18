import React from "react";
import {
  Fuel,
  TrendingDown,
  Plus,
  MapPin,
} from "lucide-react";
import { FuelRecord, Vehicle } from "../../types";

interface FuelScreenProps {
  vehicle: Vehicle;
  fuelRecords: FuelRecord[];
  onAddFuelRecord: (record: FuelRecord) => void;
  onOpenQuickFuel: () => void;
}

export const FuelScreen: React.FC<FuelScreenProps> = ({
  vehicle,
  fuelRecords,
  onOpenQuickFuel,
}) => {
  const carFuel = fuelRecords
    .filter((f) => f.vehicleId === vehicle.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Metrics
  const totalLiters = carFuel.reduce((sum, f) => sum + f.liters, 0);
  const totalCost = carFuel.reduce((sum, f) => sum + f.totalCost, 0);
  const avgPrice = totalLiters > 0 ? totalCost / totalLiters : 59.5;

  const validConsumptions = carFuel
    .map((f) => f.calculatedConsumption)
    .filter((c): c is number => typeof c === "number" && c > 0);

  const avgConsumption =
    validConsumptions.length > 0
      ? validConsumptions.reduce((a, b) => a + b, 0) / validConsumptions.length
      : 10.2;

  const costPerKm = (avgConsumption * avgPrice) / 100;

  return (
    <div className="flex flex-col w-full pb-10 bg-neutral-100 text-neutral-900 select-none">
      {/* Header */}
      <div className="px-4 pt-3.5 pb-3 flex items-center justify-between gap-2 bg-white/90 backdrop-blur-md border-b border-neutral-200/80 sticky top-0 z-20 shadow-xs">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black text-neutral-900 tracking-tight leading-tight truncate">
            Топливо и расход
          </h2>
          <p className="text-xs text-neutral-500 truncate mt-0.5">
            {vehicle.make} {vehicle.model} · {carFuel.length} заправок
          </p>
        </div>

        <button
          onClick={onOpenQuickFuel}
          className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 transition cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
          <span>Заправка</span>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Key Telemetry Tiles */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3.5 rounded-2xl bg-white border border-neutral-200/90 shadow-xs">
            <div className="text-[11px] text-neutral-500 font-medium">
              Средний расход
            </div>
            <div className="text-2xl font-black text-neutral-900 font-mono mt-0.5 flex items-baseline gap-1">
              <span>{avgConsumption.toFixed(1)}</span>
              <span className="text-xs font-sans text-neutral-500 font-normal">
                л / 100 км
              </span>
            </div>
            <div className="text-[10px] text-emerald-600 flex items-center gap-1 mt-1 font-semibold">
              <TrendingDown className="w-3 h-3" />
              <span>В пределах нормы</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-neutral-200/90 shadow-xs">
            <div className="text-[11px] text-neutral-500 font-medium">
              Стоимость 1 км пути
            </div>
            <div className="text-2xl font-black text-neutral-900 font-mono mt-0.5 flex items-baseline gap-1">
              <span>{costPerKm.toFixed(2)}</span>
              <span className="text-xs font-sans text-neutral-500 font-normal">
                ₽ / км
              </span>
            </div>
            <div className="text-[10px] text-neutral-500 mt-1">
              АИ-95 (~{avgPrice.toFixed(1)} ₽/л)
            </div>
          </div>
        </div>

        {/* Total stats strip */}
        <div className="p-3.5 rounded-2xl bg-white border border-neutral-200/90 shadow-xs flex justify-between items-center text-xs">
          <div>
            <div className="text-[10px] text-neutral-500">Всего бензина</div>
            <div className="font-mono font-bold text-neutral-900 mt-0.5">
              {totalLiters.toFixed(1)} л
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-neutral-500">Сумма чеков</div>
            <div className="font-mono font-bold text-emerald-600 mt-0.5">
              {totalCost.toLocaleString("ru-RU")} ₽
            </div>
          </div>
        </div>

        {/* Visual Consumption Graph / Trend Bars */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/90 shadow-xs space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wide">
              Динамика расхода (л / 100 км)
            </h3>
            <span className="text-[10px] font-mono text-neutral-400">Последние заправки</span>
          </div>

          {/* Simple crisp mobile bar chart */}
          <div className="flex items-end justify-between h-28 pt-4 pb-1 gap-2 border-b border-neutral-100">
            {carFuel.slice(0, 5).reverse().map((f, i) => {
              const val = f.calculatedConsumption || 10.2;
              const heightPct = Math.min(100, Math.max(20, (val / 15) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] font-mono text-neutral-700 font-bold">
                    {val.toFixed(1)}
                  </span>
                  <div className="w-full max-w-[28px] bg-neutral-100 rounded-t-lg relative overflow-hidden" style={{ height: `${heightPct}%` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-600 to-emerald-500 rounded-t-lg" />
                  </div>
                  <span className="text-[9px] text-neutral-400 font-mono">
                    {f.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* History of Fuel Fill-ups */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
            История заправок
          </h3>

          <div className="space-y-2">
            {carFuel.map((fuel) => (
              <div
                key={fuel.id}
                className="p-3 rounded-2xl bg-white border border-neutral-200/90 shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Fuel className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-900">
                      {fuel.liters} л • {fuel.fuelType}
                    </div>
                    <div className="text-[10px] text-neutral-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-neutral-400" />
                      <span>{fuel.station || "АЗС"}</span>
                      <span>•</span>
                      <span>{fuel.mileage.toLocaleString("ru-RU")} км</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-mono font-bold text-neutral-900">
                    {fuel.totalCost.toLocaleString("ru-RU")} ₽
                  </div>
                  <div className="text-[9px] text-neutral-400 font-mono">
                    {fuel.pricePerLiter} ₽/л • {fuel.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
