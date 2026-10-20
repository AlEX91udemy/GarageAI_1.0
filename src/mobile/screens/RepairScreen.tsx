import React, { useState } from "react";
import {
  Wrench,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Sparkles,
  ChevronRight,
  Car,
} from "lucide-react";
import { Vehicle, OemScheduleItem } from "../../types";
import { formatDistance } from "../units";

interface RepairScreenProps {
  vehicle: Vehicle;
  schedules: OemScheduleItem[];
  onMarkDone: (item: OemScheduleItem) => void;
  onAddScheduleItem: () => void;
  onOpenAiDiagnostic?: () => void;
}

export const RepairScreen: React.FC<RepairScreenProps> = ({
  vehicle,
  schedules,
  onMarkDone,
  onAddScheduleItem,
  onOpenAiDiagnostic,
}) => {
  const [statusFilter, setStatusFilter] = useState<"all" | "overdue" | "soon" | "ok">("all");

  const vehicleSchedules = schedules.filter(
    (s) => s.vehicleId === vehicle.id || s.vehicleId === "all"
  );

  const getStatusInfo = (item: OemScheduleItem) => {
    const lastDone = item.lastDoneKm || 0;
    const kmSince = vehicle.currentMileage - lastDone;
    const kmLeft = item.intervalKm - kmSince;
    const percent = Math.min(100, Math.max(0, Math.round((kmSince / item.intervalKm) * 100)));

    let status: "overdue" | "soon" | "ok" = "ok";
    let badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
    let label = "В норме";

    if (kmLeft <= 0) {
      status = "overdue";
      badgeColor = "bg-rose-100 text-rose-700 border-rose-200";
      label = "Просрочено";
    } else if (kmLeft < 1500) {
      status = "soon";
      badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
      label = "Скоро замена";
    }

    return { kmSince, kmLeft, percent, status, badgeColor, label };
  };

  const overdueCount = vehicleSchedules.filter(
    (s) => getStatusInfo(s).status === "overdue"
  ).length;

  const soonCount = vehicleSchedules.filter(
    (s) => getStatusInfo(s).status === "soon"
  ).length;

  const filteredItems = vehicleSchedules.filter((item) => {
    if (statusFilter === "all") return true;
    return getStatusInfo(item).status === statusFilter;
  });

  return (
    <div className="flex flex-col w-full pb-10 bg-neutral-100 text-neutral-900 select-none">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-neutral-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
              <span>Ремонт</span>
              <span className="text-xs font-mono text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-lg">
                Регламент ТО
              </span>
            </h2>
            <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-red-600" />
              <span>{vehicle.make} {vehicle.model} • {formatDistance(vehicle.currentMileage)}</span>
            </div>
          </div>

          <button
            onClick={onAddScheduleItem}
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/30 transition cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Регламент</span>
          </button>
        </div>

        {/* Status filters */}
        <div className="mt-3 flex gap-1.5 text-xs overflow-x-auto no-scrollbar">
          {[
            { id: "all", label: "Все регламенты", count: vehicleSchedules.length },
            { id: "overdue", label: "Срочно", count: overdueCount },
            { id: "soon", label: "Скоро", count: soonCount },
            { id: "ok", label: "В норме" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === f.id
                  ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                  : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              <span>{f.label}</span>
              {Boolean(f.count) && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                    f.id === "overdue"
                      ? "bg-rose-100 text-rose-700"
                      : f.id === "soon"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-neutral-100 text-neutral-700"
                  }`}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3.5">
        {/* Urgent alert if overdue */}
        {overdueCount > 0 && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-rose-900">
                Требуется техническое обслуживание!
              </span>
              <p className="text-[11px] text-rose-700 mt-0.5">
                {overdueCount} {overdueCount === 1 ? "процедура" : "процедуры"} превысили рекомендованный заводом интервал.
              </p>
            </div>
          </div>
        )}

        {/* AI Rev Assistant Diagnostic banner */}
        {onOpenAiDiagnostic && (
          <div
            onClick={onOpenAiDiagnostic}
            className="p-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 text-white border border-red-500/30 flex items-center justify-between cursor-pointer active:scale-[0.99] transition shadow-md shadow-red-600/25"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">
                  Диагностика и регламент завода (AI)
                </h4>
                <p className="text-[10px] text-red-100">
                  Рекомендации по замене узлов для двигателя {vehicle.engine || "авто"}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Schedules list */}
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-neutral-200/90 shadow-xs space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <div className="text-xs font-bold text-neutral-800">
                Все регламентные работы в норме
              </div>
              <p className="text-[11px] text-neutral-500">
                График обслуживания соблюдается в полной мере
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const { kmSince, kmLeft, percent, status, badgeColor, label } =
                getStatusInfo(item);

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-3xl bg-white border border-neutral-200/90 hover:border-neutral-300 transition space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeColor}`}
                        >
                          {label}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-medium">
                          {item.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-neutral-900 mt-1.5">
                        {item.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => onMarkDone(item)}
                      className="px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-emerald-600 hover:text-white text-neutral-800 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 border border-neutral-200"
                      title="Отметить выполненным"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Выполнено</span>
                    </button>
                  </div>

                  {item.description && (
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Progress bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] font-mono text-neutral-500">
                      <span>Интервал: {formatDistance(item.intervalKm)}</span>
                      <span className={status === "overdue" ? "text-rose-600 font-bold" : "text-neutral-700 font-semibold"}>
                        {kmLeft <= 0
                          ? `Просрочено на ${formatDistance(Math.abs(kmLeft))}`
                          : `Осталось: ${formatDistance(kmLeft)}`}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-neutral-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          status === "overdue"
                            ? "bg-rose-600"
                            : status === "soon"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                      <span>Было на {formatDistance(item.lastDoneKm || 0)}</span>
                      <span>{percent}% ресурса</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
