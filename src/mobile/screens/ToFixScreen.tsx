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
import { formatGarageCurrency } from "../currency";

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
    <div className="flex flex-col w-full pb-8 text-white select-none">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-neutral-800/80">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">
            To-Fix Проблемы
          </h2>
          <p className="text-xs text-neutral-400">
            {carTasks.filter((t) => t.status !== "completed").length} неисправностей в очереди
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenAiDiagnostic}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI</span>
          </button>
          <button
            onClick={onAddTask}
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-red-600/30 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Проблема</span>
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: "all", label: "Все" },
          { id: "high", label: "CRITICAL / HIGH" },
          { id: "medium", label: "MEDIUM" },
          { id: "low", label: "LOW / WATCH" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterPriority(f.id as any)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              filterPriority === f.id
                ? "bg-red-600 text-white shadow-sm"
                : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="px-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 rounded-3xl bg-neutral-900 border border-neutral-800 text-center flex flex-col items-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
            <div className="text-sm font-bold text-white mb-1">
              Отлично! Нет активных проблем
            </div>
            <p className="text-xs text-neutral-400 max-w-xs">
              Garage AI не обнаружил незакрытых замечаний для {vehicle.make} {vehicle.model}.
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
                      ~{formatGarageCurrency(task.estimatedCost)}
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
