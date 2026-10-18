import React, { useState } from "react";
import {
  AlertTriangle,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { ToFixTask, Vehicle } from "../../types";

interface ToFixScreenProps {
  vehicle: Vehicle;
  tasks: ToFixTask[];
  onSelectTask: (task: ToFixTask) => void;
  onAddTask: () => void;
  onOpenAiDiagnostic: () => void;
  onToggleTaskStatus: (taskId: string, currentStatus: string) => void;
}

export const ToFixScreen: React.FC<ToFixScreenProps> = ({
  vehicle,
  tasks,
  onSelectTask,
  onAddTask,
  onOpenAiDiagnostic,
  onToggleTaskStatus,
}) => {
  const [filterPriority, setFilterPriority] = useState<
    "all" | "high" | "medium" | "low"
  >("all");

  const carTasks = tasks.filter((t) => t.vehicleId === vehicle.id);
  const filtered = carTasks.filter((t) => {
    if (filterPriority === "all") return true;
    return t.priority === filterPriority;
  });

  return (
    <div className="flex flex-col w-full pb-8 bg-neutral-100 text-neutral-900 select-none">
      {/* Header */}
      <div className="px-4 pt-3.5 pb-3 flex items-center justify-between gap-2 bg-white/90 backdrop-blur-md border-b border-neutral-200/80 sticky top-0 z-20 shadow-xs">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black text-neutral-900 tracking-tight leading-tight truncate">
            План ремонта (To-Fix)
          </h2>
          <p className="text-xs text-neutral-500 truncate mt-0.5">
            {carTasks.filter((t) => t.status !== "completed").length} неисправностей в очереди
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenAiDiagnostic}
            className="h-9 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 border border-amber-500/30 text-xs font-bold inline-flex items-center justify-center gap-1 transition cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>AI</span>
          </button>
          <button
            onClick={onAddTask}
            className="h-9 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold inline-flex items-center justify-center gap-1 shadow-md shadow-red-600/30 transition cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
            <span>Проблема</span>
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: "all", label: "Все" },
          { id: "high", label: "Срочно" },
          { id: "medium", label: "Средний" },
          { id: "low", label: "Наблюдение" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterPriority(f.id as any)}
            className={`h-8 px-3 rounded-xl text-xs font-bold whitespace-nowrap inline-flex items-center justify-center transition cursor-pointer shrink-0 ${
              filterPriority === f.id
                ? "bg-red-600 text-white shadow-xs"
                : "bg-white text-neutral-600 border border-neutral-200 hover:text-neutral-900"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="px-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white border border-neutral-200 text-center flex flex-col items-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
            <div className="text-sm font-bold text-neutral-900 mb-1">
              Отлично! Нет активных проблем
            </div>
            <p className="text-xs text-neutral-500 max-w-xs">
              GarageHub не обнаружил незакрытых замечаний для {vehicle.make} {vehicle.model}.
            </p>
          </div>
        ) : (
          filtered.map((task) => {
            const isCompleted = task.status === "completed";
            const isHigh = task.priority === "high";

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask?.(task)}
                className={`p-4 rounded-2xl border transition active:scale-[0.99] cursor-pointer ${
                  isCompleted
                    ? "bg-neutral-900/50 border-neutral-850 opacity-60"
                    : isHigh
                    ? "bg-rose-500/10 border-rose-500/30"
                    : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isHigh
                          ? "bg-rose-500/25 text-rose-300 border border-rose-500/40"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {task.priority.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {task.category}
                    </span>
                  </div>

                  {task.estimatedCost && (
                    <div className="text-xs font-bold text-neutral-200 font-mono">
                      ~{task.estimatedCost.toLocaleString("ru-RU")} ₽
                    </div>
                  )}
                </div>

                <h3
                  className={`text-sm font-bold leading-tight ${
                    isCompleted ? "line-through text-neutral-400" : "text-white"
                  }`}
                >
                  {task.title}
                </h3>

                {task.description && (
                  <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                    {task.description}
                  </p>
                )}

                {task.linkedPartSku && (
                  <div className="mt-2 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md inline-block border border-emerald-500/20">
                    📦 Запчасть на складе: {task.linkedPartSku}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-neutral-800/80 text-[11px] text-neutral-400">
                  <span>Срок: {task.dueDate || "По плану"}</span>
                  <div className="flex items-center gap-1 text-red-400 font-semibold">
                    <span>Подробнее</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
