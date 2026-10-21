import React from "react";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  Package,
  Wrench,
  DollarSign,
  Share2,
} from "lucide-react";
import { ToFixTask, Vehicle } from "../../types";
import { formatGarageCurrency } from "../currency";

interface ProblemDetailScreenProps {
  task: ToFixTask;
  vehicle: Vehicle;
  onBack: () => void;
  onResolve: (taskId: string) => void;
  onScheduleRepair: (task: ToFixTask) => void;
}

export const ProblemDetailScreen: React.FC<ProblemDetailScreenProps> = ({
  task,
  vehicle,
  onBack,
  onResolve,
  onScheduleRepair,
}) => {
  const isHigh = task.priority === "high";

  return (
    <div className="flex flex-col w-full pb-10 bg-neutral-100 text-neutral-900 select-none">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-neutral-200/80 shadow-xs">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад к списку</span>
        </button>

        <span className="text-xs font-bold text-neutral-800">
          Диагностика дефекта
        </span>

        <span
          className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
            isHigh
              ? "bg-brand-soft text-brand-hover border border-brand-border"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}
        >
          {task.priority.toUpperCase()}
        </span>
      </div>

      {/* Main problem card */}
      <div className="p-4 space-y-3.5">
        <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle
              className={`w-5 h-5 ${isHigh ? "text-brand-strong" : "text-amber-600"}`}
            />
            <span className="text-xs font-mono text-neutral-500 uppercase">
              {task.category}
            </span>
          </div>

          <h2 className="text-xl font-black text-neutral-900 tracking-tight leading-snug">
            {task.title}
          </h2>

          <div className="mt-3 flex items-center justify-between pt-3 border-t border-neutral-100 text-xs text-neutral-500">
            <span>Статус: <strong className="text-neutral-800">{task.status === "completed" ? "Устранено" : "Требует ремонта"}</strong></span>
            {task.estimatedCost && (
              <span className="font-mono text-neutral-900 font-bold">
                Оценка: ~{formatGarageCurrency(task.estimatedCost)}
              </span>
            )}
          </div>
        </div>

        {/* Symptoms and description */}
        <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-xs space-y-2">
          <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wide">
            Симптомы и описание
          </h3>
          <p className="text-xs text-neutral-700 leading-relaxed">
            {task.description || "Симптомы зафиксированы при визуальном осмотре и диагностике автомобиля."}
          </p>

          {/* Diagnostic Code snippet simulation */}
          <div className="mt-3 p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
            <div className="text-[10px] font-mono text-neutral-500 mb-1">
              БОРТОВАЯ ДИАГНОСТИКА:
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-brand-strong">
                P0171 / O2 Sensor Fuel Trim System Too Lean
              </span>
              <span className="text-[10px] text-neutral-500 font-mono bg-white px-2 py-0.5 rounded border border-neutral-200">
                OBD-II Verified
              </span>
            </div>
          </div>
        </div>

        {/* Linked garage part */}
        {task.linkedPartSku && (
          <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-xs space-y-2">
            <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wide">
              Деталь на складе гаража
            </h3>
            <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Package className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="text-xs font-bold text-neutral-900">
                    Запчасть подготовлена
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500">
                    Артикул: {task.linkedPartSku}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                В НАЛИЧИИ
              </span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => onScheduleRepair?.(task)}
            className="w-full py-3.5 px-4 rounded-2xl bg-brand-strong hover:bg-brand text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-strong/30 active:scale-[0.98] transition cursor-pointer"
          >
            <Wrench className="w-4 h-4" />
            <span>Записать в журнал ремонта / ТО</span>
          </button>

          <button
            onClick={() => {
              onResolve?.(task.id);
              onBack?.();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800 font-semibold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Отметить устранённой</span>
          </button>
        </div>
      </div>
    </div>
  );
};
