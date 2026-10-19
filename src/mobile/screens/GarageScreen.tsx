import React, { useState } from "react";
import {
  Package,
  ListTodo,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  MapPin,
  ChevronRight,
  Car,
  Wrench,
  Check,
} from "lucide-react";
import { Vehicle, GaragePart, ToFixTask } from "../../types";

interface GarageScreenProps {
  vehicle: Vehicle;
  vehicles: Vehicle[];
  garageParts: GaragePart[];
  toFixTasks: ToFixTask[];
  onSelectVehicle: (v: Vehicle) => void;
  onSelectPart: (part: GaragePart) => void;
  onAddPart: () => void;
  onInstallPart: (part: GaragePart) => void;
  onSelectTask: (task: ToFixTask) => void;
  onAddTask: () => void;
  onToggleTaskStatus: (taskId: string, currentStatus: string) => void;
  onOpenAiDiagnostic?: () => void;
}

export const GarageScreen: React.FC<GarageScreenProps> = ({
  vehicle,
  vehicles,
  garageParts,
  toFixTasks,
  onSelectVehicle,
  onSelectPart,
  onAddPart,
  onInstallPart,
  onSelectTask,
  onAddTask,
  onToggleTaskStatus,
  onOpenAiDiagnostic,
}) => {
  const [activeSegment, setActiveSegment] = useState<"inventory" | "to_fix">("inventory");
  const [searchQuery, setSearchQuery] = useState("");
  const [partStatusFilter, setPartStatusFilter] = useState<"all" | "in_stock" | "installed">("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");

  // Parts for this vehicle or common
  const vehicleParts = garageParts.filter(
    (p) => p.vehicleId === vehicle.id || p.vehicleId === "all"
  );
  const filteredParts = vehicleParts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      partStatusFilter === "all" || p.status === partStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const inStockCount = vehicleParts.filter((p) => p.status === "in_stock").length;

  // Tasks for this vehicle
  const vehicleTasks = toFixTasks.filter((t) => t.vehicleId === vehicle.id);
  const pendingTasks = vehicleTasks.filter((t) => t.status !== "completed");
  const filteredTasks = vehicleTasks.filter((t) => {
    const matchesPriority =
      taskPriorityFilter === "all" || t.priority === taskPriorityFilter;
    return matchesPriority;
  });

  return (
    <div className="flex flex-col w-full pb-10 bg-neutral-100 text-neutral-900 select-none">
      {/* Top Header */}
      <div className="px-4 pt-4 pb-3 border-b border-neutral-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
              <span>Гараж</span>
              <span className="text-xs font-mono text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-lg">
                Склад & To-Fix
              </span>
            </h2>
            <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-red-600" />
              <span>{vehicle.make} {vehicle.model}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={activeSegment === "inventory" ? onAddPart : onAddTask}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/30 transition cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{activeSegment === "inventory" ? "Деталь" : "Задача"}</span>
            </button>
          </div>
        </div>

        {/* 2 Segment Tabs: Склад запчастей vs Список To-Fix */}
        <div className="mt-3 grid grid-cols-2 p-1 bg-neutral-200/70 rounded-2xl border border-neutral-200">
          <button
            onClick={() => setActiveSegment("inventory")}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeSegment === "inventory"
                ? "bg-white text-neutral-900 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Склад запчастей</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeSegment === "inventory"
                  ? "bg-red-100 text-red-700 font-bold"
                  : "bg-neutral-200 text-neutral-600"
              }`}
            >
              {inStockCount}
            </span>
          </button>

          <button
            onClick={() => setActiveSegment("to_fix")}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeSegment === "to_fix"
                ? "bg-white text-neutral-900 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Список To-Fix</span>
            {pendingTasks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-100 text-amber-800 font-bold">
                {pendingTasks.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SEGMENT 1: СКЛАД ЗАПЧАСТЕЙ */}
      {activeSegment === "inventory" && (
        <div className="p-4 space-y-3.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск по артикулу SKU, названию или бренду..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl bg-white border border-neutral-200/90 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-red-500 transition shadow-xs"
            />
          </div>

          {/* Status filters */}
          <div className="flex gap-1.5 text-xs overflow-x-auto no-scrollbar">
            {[
              { id: "all", label: "Все детали" },
              { id: "in_stock", label: `В наличии (${inStockCount})` },
              { id: "installed", label: "Установленные" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setPartStatusFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                  partStatusFilter === f.id
                    ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                    : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Parts list */}
          <div className="space-y-2.5">
            {filteredParts.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-neutral-200/90 shadow-xs space-y-2">
                <Package className="w-8 h-8 text-neutral-400 mx-auto" />
                <div className="text-xs font-bold text-neutral-700">
                  Запчастей не найдено
                </div>
                <p className="text-[11px] text-neutral-500">
                  Добавьте новые запчасти на склад вашего гаража
                </p>
                <button
                  onClick={onAddPart}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold cursor-pointer"
                >
                  + Внести на склад
                </button>
              </div>
            ) : (
              filteredParts.map((part) => (
                <div
                  key={part.id}
                  onClick={() => onSelectPart(part)}
                  className="p-3.5 rounded-3xl bg-white border border-neutral-200/90 hover:border-neutral-300 transition cursor-pointer active:scale-[0.99] space-y-2 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
                            part.status === "in_stock"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : "bg-neutral-100 text-neutral-600 border-neutral-200"
                          }`}
                        >
                          {part.status === "in_stock" ? "В наличии" : "Установлено"}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {part.brand}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-neutral-900 mt-1 truncate">
                        {part.name}
                      </h4>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-neutral-900">
                        {(part.purchasePrice * part.quantity).toLocaleString("ru-RU")} ₽
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        {part.quantity} шт.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 pt-1.5 border-t border-neutral-100">
                    <span>SKU: {part.partNumber}</span>
                    {part.location && (
                      <span className="flex items-center gap-1 text-neutral-600">
                        <MapPin className="w-3 h-3 text-red-600" />
                        <span>{part.location}</span>
                      </span>
                    )}
                  </div>

                  {part.status === "in_stock" && (
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onInstallPart?.(part);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Wrench className="w-3 h-3 text-red-600" />
                        <span>Установить на авто</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SEGMENT 2: СПИСОК TO-FIX */}
      {activeSegment === "to_fix" && (
        <div className="p-4 space-y-3.5">
          {/* AI Banner */}
          <div
            onClick={onOpenAiDiagnostic}
            className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-white to-white border border-amber-300 flex items-center justify-between cursor-pointer active:scale-[0.99] transition shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 border border-amber-200">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-900">
                  Garage AI Rev Assistant
                </h4>
                <p className="text-[10px] text-neutral-500">
                  Анализ симптомов, стуков и кодов ошибок
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-600" />
          </div>

          {/* Priority filter buttons */}
          <div className="flex gap-1.5 text-xs overflow-x-auto no-scrollbar">
            {[
              { id: "all", label: "Все дефекты" },
              { id: "high", label: "Срочные" },
              { id: "medium", label: "Внимание" },
              { id: "low", label: "Плановые" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setTaskPriorityFilter(p.id as any)}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                  taskPriorityFilter === p.id
                    ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                    : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Tasks list */}
          <div className="space-y-2.5">
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-neutral-200/90 shadow-xs space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="text-xs font-bold text-neutral-800">
                  Список To-Fix чист
                </div>
                <p className="text-[11px] text-neutral-500">
                  Все известные неполадки и задачи по автомобилю устранены
                </p>
                <button
                  onClick={onAddTask}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold cursor-pointer"
                >
                  + Зафиксировать проблему
                </button>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isCompleted = task.status === "completed";
                return (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className={`p-3.5 rounded-3xl border transition cursor-pointer active:scale-[0.99] flex items-start gap-3 shadow-xs ${
                      isCompleted
                        ? "bg-neutral-50 border-neutral-200 opacity-60"
                        : "bg-white border-neutral-200/90 hover:border-neutral-300"
                    }`}
                  >
                    {/* Checkbox toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTaskStatus?.(task.id, task.status);
                      }}
                      className="mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition cursor-pointer shrink-0 border-neutral-300 hover:border-emerald-500 bg-neutral-50"
                    >
                      {isCompleted && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
                            task.priority === "high"
                              ? "bg-rose-100 text-rose-700 border-rose-200"
                              : task.priority === "medium"
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-neutral-100 text-neutral-600 border-neutral-200"
                          }`}
                        >
                          {task.priority === "high"
                            ? "Срочно"
                            : task.priority === "medium"
                            ? "Средний"
                            : "Низкий"}
                        </span>

                        {task.estimatedCost && (
                          <span className="text-[11px] font-mono font-bold text-neutral-900">
                            ~{task.estimatedCost.toLocaleString("ru-RU")} ₽
                          </span>
                        )}
                      </div>

                      <h4
                        className={`text-xs font-bold mt-1.5 leading-snug ${
                          isCompleted
                            ? "line-through text-neutral-400"
                            : "text-neutral-900"
                        }`}
                      >
                        {task.title}
                      </h4>

                      {task.description && (
                        <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1 leading-normal">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-2 text-[10px] text-neutral-400 flex items-center justify-between">
                        <span>{task.category}</span>
                        <span className="text-red-600 font-semibold flex items-center gap-0.5">
                          Подробнее <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
