import React, { useState } from "react";
import {
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Wrench,
  Tag,
  MapPin,
  Calendar,
  DollarSign,
  ArrowRight,
  Lightbulb,
  Sparkles,
  ListTodo,
  ChevronDown,
  ChevronUp,
  Info,
  Copy,
  Check,
} from "lucide-react";
import { Vehicle, GaragePart, ToFixTask, MaintenanceCategory } from "../types";
import { POPULAR_WORK_SUGGESTIONS, getWorkHint, WorkSuggestion } from "../workHints";

interface GarageInventoryToFixViewProps {
  vehicle: Vehicle;
  garageParts: GaragePart[];
  toFixTasks: ToFixTask[];
  onAddPart: (part: GaragePart) => void;
  onUpdatePartStatus: (partId: string, status: "in_stock" | "installed" | "ordered") => void;
  onAddTask: (task: ToFixTask) => void;
  onCompleteTask: (taskId: string) => void;
  onInstallInService: (part: GaragePart) => void;
}

export const GarageInventoryToFixView: React.FC<GarageInventoryToFixViewProps> = ({
  vehicle,
  garageParts,
  toFixTasks,
  onAddPart,
  onUpdatePartStatus,
  onAddTask,
  onCompleteTask,
  onInstallInService,
}) => {
  const [activeTab, setActiveTab] = useState<"inventory" | "to_fix">("to_fix");
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showRecommendedSection, setShowRecommendedSection] = useState(true);
  const [isToFixListCollapsed, setIsToFixListCollapsed] = useState(false);
  const [isInventoryListCollapsed, setIsInventoryListCollapsed] = useState(false);
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

  // New Part form
  const [partName, setPartName] = useState("");
  const [partBrand, setPartBrand] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [partPrice, setPartPrice] = useState(1500);
  const [partLocation, setPartLocation] = useState("Полка А2");
  const [partCategory, setPartCategory] = useState<MaintenanceCategory>("ТО и замена жидкостей");

  // New Task form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [taskCost, setTaskCost] = useState(4000);
  const [taskTargetMileage, setTaskTargetMileage] = useState(vehicle.currentMileage + 2000);
  const [taskCategory, setTaskCategory] = useState<MaintenanceCategory>("Подвеска и рулевое");
  const [taskWorkHint, setTaskWorkHint] = useState("");
  const [suggestionCategory, setSuggestionCategory] = useState<string>("Все");

  const vehicleParts = garageParts.filter(
    (p) => p.vehicleId === vehicle.id || p.vehicleId === "all"
  );
  const inStockParts = vehicleParts.filter((p) => p.status === "in_stock");
  const vehicleTasks = toFixTasks.filter((t) => t.vehicleId === vehicle.id);

  const pendingTasks = vehicleTasks.filter((t) => t.status !== "completed");
  const completedTasks = vehicleTasks.filter((t) => t.status === "completed");

  const totalInventoryValue = inStockParts.reduce(
    (sum, p) => sum + p.purchasePrice,
    0
  );
  const totalEstimatedRepairs = pendingTasks.reduce(
    (sum, t) => sum + (t.estimatedCost || 0),
    0
  );

  const handleSavePart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partName.trim()) return;

    const newPart: GaragePart = {
      id: "gp-" + Date.now(),
      vehicleId: vehicle.id,
      name: partName.trim(),
      brand: partBrand.trim() || "OEM",
      partNumber: partNumber.trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      quantity: 1,
      purchasePrice: Number(partPrice),
      purchaseDate: new Date().toISOString().split("T")[0],
      location: partLocation.trim() || "В багажнике",
      status: "in_stock",
      category: partCategory,
    };

    onAddPart(newPart);
    setShowAddPartModal(false);
    setPartName("");
    setPartBrand("");
    setPartNumber("");
  };

  const applySuggestion = (s: WorkSuggestion) => {
    setTaskTitle(s.title);
    setTaskPriority(s.priority);
    setTaskCost(s.estimatedCost);
    setTaskTargetMileage(vehicle.currentMileage + s.mileageDeltaKm);
    setTaskCategory(s.category);
    setTaskDesc(s.symptoms);
    setTaskWorkHint(s.hint);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const finalHint = taskWorkHint.trim() || getWorkHint(taskTitle.trim(), taskCategory);

    const newTask: ToFixTask = {
      id: "tf-" + Date.now(),
      vehicleId: vehicle.id,
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      priority: taskPriority,
      estimatedCost: Number(taskCost),
      targetMileage: Number(taskTargetMileage),
      status: "pending",
      category: taskCategory,
      createdAt: new Date().toISOString().split("T")[0],
      workHint: finalHint,
    };

    onAddTask(newTask);
    setShowAddTaskModal(false);
    setTaskTitle("");
    setTaskDesc("");
    setTaskWorkHint("");
  };

  const handleQuickAddSuggestion = (s: WorkSuggestion) => {
    const newTask: ToFixTask = {
      id: "tf-" + Date.now(),
      vehicleId: vehicle.id,
      title: s.title,
      description: s.symptoms,
      priority: s.priority,
      estimatedCost: s.estimatedCost,
      targetMileage: vehicle.currentMileage + s.mileageDeltaKm,
      status: "pending",
      category: s.category,
      createdAt: new Date().toISOString().split("T")[0],
      workHint: s.hint,
    };
    onAddTask(newTask);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-red-600 uppercase tracking-wider">
            Гаражное управление (GarageHub)
          </div>
          <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
            Склад запчастей и список To-Fix
          </h2>
          <p className="text-xs text-neutral-500">
            Запасные части в гараже: <strong className="text-neutral-900">{inStockParts.length} шт</strong> на сумму{" "}
            <strong className="text-neutral-900 font-mono">{totalInventoryValue.toLocaleString("ru-RU")} ₽</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeTab === "inventory" ? (
            <button
              onClick={() => setShowAddPartModal(true)}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Положить деталь на склад</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAddTaskModal(true)}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить задачу в To-Fix</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
        <button
          onClick={() => setActiveTab("to_fix")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === "to_fix"
              ? "bg-neutral-900 text-white shadow-sm"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>План предстоящих задач To-Fix ({pendingTasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("inventory")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === "inventory"
              ? "bg-neutral-900 text-white shadow-sm"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Склад запчастей в гараже ({inStockParts.length})</span>
        </button>
      </div>

      {/* Tab 1: To-Fix tasks */}
      {activeTab === "to_fix" ? (
        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold">
                !
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-950">
                  Запланировано ремонтов на сумму ~{totalEstimatedRepairs.toLocaleString("ru-RU")} ₽
                </h4>
                <p className="text-xs text-amber-800">
                  Вы можете перенести любую задачу сразу в выполненный ремонт с автозаполнением журнала.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddTaskModal(true)}
              className="px-3.5 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-500 transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Новая задача</span>
            </button>
          </div>

          {/* Recommended Works and Hints Banner */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-amber-200/80 shadow-sm transition-all duration-200">
            <div
              onClick={() => setShowRecommendedSection((prev) => !prev)}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRecommendedSection((prev) => !prev);
                  }}
                  className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200/60 flex items-center justify-center transition cursor-pointer shadow-xs active:scale-95 shrink-0"
                  title={showRecommendedSection ? "Свернуть подсказки" : "Развернуть подсказки"}
                >
                  <Sparkles className="w-4 h-4 text-amber-600 stroke-[2.2]" />
                </button>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                    <span>Подсказки и рекомендованные работы</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                      для {vehicle.model}
                    </span>
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    {showRecommendedSection
                      ? "Типовые регламентные операции с готовыми подсказками мастера и расчётом бюджета"
                      : "Рекомендации свернуты (нажмите, чтобы развернуть список работ)"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm border border-amber-200/60">
                  {showRecommendedSection ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Свернуть</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Развернуть (14)</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {showRecommendedSection && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-3 mt-3 border-t border-amber-100">
                {POPULAR_WORK_SUGGESTIONS.slice(0, 6).map((item) => {
                  const alreadyInTasks = pendingTasks.some(
                    (t) => t.title.toLowerCase().includes(item.title.toLowerCase().slice(0, 15))
                  );

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-neutral-50 hover:bg-amber-50/30 border border-neutral-200/70 transition flex flex-col justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md truncate">
                            {item.category}
                          </span>
                          <span className="font-mono font-bold text-neutral-900 text-[11px]">
                            ~{item.estimatedCost.toLocaleString("ru-RU")} ₽
                          </span>
                        </div>
                        <h5 className="font-bold text-neutral-900 mt-1.5 leading-snug">
                          {item.title}
                        </h5>
                        <p className="text-[11px] text-neutral-600 mt-1 line-clamp-2">
                          💡 {item.hint}
                        </p>
                      </div>

                      <div className="pt-2.5 mt-2 border-t border-neutral-200/60 flex items-center justify-between">
                        <span className="text-[10px] text-neutral-400 font-mono">
                          +{item.mileageDeltaKm.toLocaleString("ru-RU")} км
                        </span>
                        {alreadyInTasks ? (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> В плане
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleQuickAddSuggestion(item)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
                          >
                            <Plus className="w-3 h-3" /> В план
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unified Active To-Fix Tasks Block */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-blue-200/80 shadow-sm transition-all duration-200">
            <div
              onClick={() => setIsToFixListCollapsed((prev) => !prev)}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsToFixListCollapsed((prev) => !prev);
                  }}
                  className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200/60 flex items-center justify-center transition cursor-pointer shadow-xs active:scale-95 shrink-0"
                  title={!isToFixListCollapsed ? "Свернуть задачи" : "Развернуть задачи"}
                >
                  <ListTodo className="w-4 h-4 text-blue-600 stroke-[2.2]" />
                </button>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                    <span>Активные задачи To-Fix</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full font-mono">
                      {pendingTasks.length}
                    </span>
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    {isToFixListCollapsed
                      ? "Список задач свернут (нажмите, чтобы развернуть)"
                      : "План предстоящих работ по авто"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm border border-blue-200/60">
                  {!isToFixListCollapsed ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Свернуть</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Развернуть ({pendingTasks.length})</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {!isToFixListCollapsed && (
              <div className="space-y-3 pt-3 mt-3 border-t border-blue-100">
              {pendingTasks.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-neutral-200/80 shadow-sm">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-neutral-800">
                    Все задачи выполнены!
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    В списке To-Fix нет отложенных неисправностей. Воспользуйтесь подсказками выше, чтобы запланировать следующее ТО.
                  </p>
                </div>
              ) : (
                pendingTasks.map((task) => {
                  const isHigh = task.priority === "high";
                  const isMed = task.priority === "medium";
                  const hintText = task.workHint || getWorkHint(task.title, task.category);

                  return (
                    <div
                      key={task.id}
                      className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all duration-200 shadow-sm flex flex-col gap-3 ${
                        isHigh
                          ? "border-blue-300 bg-blue-50/25 ring-1 ring-blue-400/40"
                          : isMed
                          ? "border-blue-200 bg-blue-50/15"
                          : "border-blue-200/70 bg-blue-50/5"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-blue-100 text-blue-800 border border-blue-200/80"
                            >
                              {isHigh ? "Высокий приоритет" : isMed ? "Средний приоритет" : "Активная задача"}
                            </span>
                            {task.targetMileage && (
                              <span className="text-[11px] font-mono text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md font-semibold">
                                Цель: ~{task.targetMileage.toLocaleString("ru-RU")} км
                              </span>
                            )}
                            <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md font-medium">
                              {task.category}
                            </span>
                          </div>

                          <h4 className="text-base font-bold text-neutral-900 mt-1">
                            {task.title}
                          </h4>

                          {task.description && (
                            <p className="text-xs text-neutral-600 mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                          {task.estimatedCost && (
                            <div className="text-left sm:text-right font-mono">
                              <div className="text-[10px] text-neutral-400">Бюджет</div>
                              <div className="text-sm font-extrabold text-neutral-900">
                                ~{task.estimatedCost.toLocaleString("ru-RU")} ₽
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => onCompleteTask(task.id)}
                            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Выполнено</span>
                          </button>
                        </div>
                      </div>

                      {/* Work Hint Callout for this task */}
                      <div className="mt-1 pt-2.5 border-t border-neutral-100/90 flex items-start gap-2 bg-blue-50/70 border border-blue-200/50 rounded-2xl p-2.5 sm:p-3 text-xs">
                        <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="font-bold text-blue-950">Подсказка по работам: </span>
                          <span className="text-neutral-700 leading-relaxed">
                            {hintText}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
          </div>

          {/* Completed tasks accordion */}
          {completedTasks.length > 0 && (
            <div className="pt-4">
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Выполненные задачи ({completedTasks.length})
              </div>
              <div className="space-y-2 opacity-60">
                {completedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 bg-neutral-100 rounded-2xl flex items-center justify-between text-xs line-through text-neutral-500"
                  >
                    <span>{t.title}</span>
                    <span className="font-mono">~{t.estimatedCost} ₽</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Tab 2: Inventory in Garage */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-3xl p-4 border border-neutral-200/80 shadow-sm">
              <div className="text-[11px] text-neutral-500">Запчастей в наличии</div>
              <div className="text-xl font-extrabold text-neutral-900 font-mono mt-0.5">
                {inStockParts.length} шт
              </div>
            </div>

            <div className="bg-white rounded-3xl p-4 border border-neutral-200/80 shadow-sm">
              <div className="text-[11px] text-neutral-500">Стоимость запасов</div>
              <div className="text-xl font-extrabold text-red-600 font-mono mt-0.5">
                {totalInventoryValue.toLocaleString("ru-RU")} ₽
              </div>
            </div>

            <div className="bg-white rounded-3xl p-4 border border-neutral-200/80 shadow-sm">
              <div className="text-[11px] text-neutral-500">Установлено на авто</div>
              <div className="text-xl font-extrabold text-emerald-600 font-mono mt-0.5">
                {vehicleParts.filter((p) => p.status === "installed").length} шт
              </div>
            </div>
          </div>

          {/* Unified Inventory List Block */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-blue-200/80 shadow-sm transition-all duration-200">
            <div
              onClick={() => setIsInventoryListCollapsed((prev) => !prev)}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsInventoryListCollapsed((prev) => !prev);
                  }}
                  className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200/60 flex items-center justify-center transition cursor-pointer shadow-xs active:scale-95 shrink-0"
                  title={!isInventoryListCollapsed ? "Свернуть список запчастей" : "Развернуть список запчастей"}
                >
                  <Package className="w-4 h-4 text-blue-600 stroke-[2.2]" />
                </button>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                    <span>Детали и расходники на складе</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full font-mono">
                      {vehicleParts.length}
                    </span>
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    {isInventoryListCollapsed
                      ? "Список деталей свернут (нажмите, чтобы развернуть)"
                      : "Запасные части в наличии и установленные"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm border border-blue-200/60">
                  {!isInventoryListCollapsed ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Свернуть</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Развернуть ({vehicleParts.length})</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Parts list */}
            {!isInventoryListCollapsed && (
              <div className="space-y-3 pt-3 mt-3 border-t border-blue-100">
              {vehicleParts.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-neutral-200/80 shadow-sm">
                  <Package className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-neutral-800">
                    Склад пуст
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Добавьте купленные про запас масла, фильтры или детали подвески.
                  </p>
                </div>
              ) : (
                vehicleParts.map((part) => {
                  const isInStock = part.status === "in_stock";

                  return (
                    <div
                      key={part.id}
                      className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all duration-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        !isInStock ? "opacity-60 bg-neutral-50" : "border-neutral-200/80"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`font-semibold ${
                              isInStock
                                ? "text-emerald-700"
                                : "text-neutral-500"
                            }`}
                          >
                            {isInStock ? "В наличии на складе" : "Установлено на авто"}
                          </span>
                          <span aria-hidden="true" className="text-neutral-300">·</span>
                          <button
                            type="button"
                            onClick={() => handleCopySku(part.partNumber)}
                            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-red-600 hover:underline cursor-pointer"
                            title="Скопировать артикул (SKU)"
                          >
                            <span>{part.partNumber}</span>
                            {copiedSku === part.partNumber ? (
                              <span className="inline-flex items-center gap-0.5 text-emerald-600 font-sans text-[11px]">
                                <Check className="w-3.5 h-3.5" /> Скопировано
                              </span>
                            ) : (
                              <Copy className="w-3 h-3 opacity-60" />
                            )}
                          </button>
                        </div>

                        <h4 className="text-base font-bold text-neutral-900 mt-1">
                          {part.brand} {part.name}
                        </h4>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                            <span>{part.location || "В гараже"}</span>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">Куплено: {part.purchaseDate}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                        <div className="text-left sm:text-right font-mono">
                          <div className="text-[10px] text-neutral-400">Цена покупки</div>
                          <div className="text-sm font-extrabold text-neutral-900">
                            {part.purchasePrice.toLocaleString("ru-RU")} ₽
                          </div>
                        </div>

                        {isInStock && (
                          <button
                            onClick={() => onInstallInService(part)}
                            className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-red-600/20 active:scale-95"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Установить в ремонт</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
          </div>
        </div>
      )}

      {/* Add Part Modal */}
      {showAddPartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900">
              Положить запчасть на склад в гараже
            </h3>

            <form onSubmit={handleSavePart} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Наименование детали
                </label>
                <input
                  type="text"
                  placeholder="например: Фильтр масляный, тормозные колодки"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Производитель (Бренд)
                  </label>
                  <input
                    type="text"
                    placeholder="Mann, Brembo, Motul, CTR"
                    value={partBrand}
                    onChange={(e) => setPartBrand(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Артикул / Каталожный номер (SKU)
                  </label>
                  <input
                    type="text"
                    placeholder="W 67/1, 09.A432.11"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Цена покупки (₽)
                  </label>
                  <input
                    type="number"
                    value={partPrice}
                    onChange={(e) => setPartPrice(Number(e.target.value))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Место хранения в гараже
                  </label>
                  <input
                    type="text"
                    placeholder="Полка 2, Багажник, Стеллаж..."
                    value={partLocation}
                    onChange={(e) => setPartLocation(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPartModal(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl"
                >
                  Сохранить на склад
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <span>Добавить задачу в план To-Fix</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  С подсказками мастера и автоматическим расчётом бюджета
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTaskModal(false)}
                className="w-7 h-7 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            {/* Quick Work Hints Selector */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  Подсказки по частым работам:
                </span>
                <span className="text-[10px] text-amber-700">нажмите для автозаполнения</span>
              </div>

              {/* Category selector pills */}
              <div className="flex gap-1 overflow-x-auto pb-1">
                {["Все", "Подвеска", "Тормоза", "ТО", "Трансмиссия", "Двигатель"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSuggestionCategory(cat)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition cursor-pointer ${
                      suggestionCategory === cat
                        ? "bg-amber-600 text-white"
                        : "bg-white/80 hover:bg-white text-neutral-700 border border-amber-200/60"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Suggestions grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {POPULAR_WORK_SUGGESTIONS.filter((s) => {
                  if (suggestionCategory === "Все") return true;
                  if (suggestionCategory === "Подвеска") return s.category.includes("Подвеска");
                  if (suggestionCategory === "Тормоза") return s.category.includes("Тормозная");
                  if (suggestionCategory === "ТО") return s.category.includes("ТО");
                  if (suggestionCategory === "Трансмиссия") return s.category.includes("Трансмиссия");
                  if (suggestionCategory === "Двигатель") return s.category.includes("Двигатель");
                  return true;
                }).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className="text-left p-2 rounded-xl border border-amber-200/70 hover:border-amber-500 hover:bg-white bg-white/70 transition group cursor-pointer"
                  >
                    <div className="font-semibold text-neutral-900 text-[11px] group-hover:text-amber-800 truncate">
                      {s.title}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-0.5 font-mono">
                      <span>~{s.estimatedCost.toLocaleString("ru-RU")} ₽</span>
                      <span className="text-amber-700 font-sans font-medium">+{s.mileageDeltaKm} км</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Что нужно сделать / отремонтировать
                </label>
                <input
                  type="text"
                  list="tasks-hints-list"
                  placeholder="например: Замена сайлентблоков переднего подрамника"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-amber-500 focus:outline-none transition"
                  required
                />
                <datalist id="tasks-hints-list">
                  {POPULAR_WORK_SUGGESTIONS.map((s) => (
                    <option key={s.id} value={s.title} />
                  ))}
                </datalist>
              </div>

              {/* Dynamic live tip display */}
              {(taskWorkHint || (taskTitle.trim().length > 3 && getWorkHint(taskTitle))) && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-800">Подсказка по работам: </span>
                    <span className="text-neutral-700 leading-relaxed">
                      {taskWorkHint || getWorkHint(taskTitle, taskCategory)}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Категория работ
                  </label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value as any)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="Подвеска и рулевое">Подвеска и рулевое</option>
                    <option value="Тормозная система">Тормозная система</option>
                    <option value="ТО и замена жидкостей">ТО и замена жидкостей</option>
                    <option value="Двигатель">Двигатель</option>
                    <option value="Трансмиссия и сцепление">Трансмиссия и сцепление</option>
                    <option value="Электрика">Электрика</option>
                    <option value="Кузов и салон">Кузов и салон</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Приоритет
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="high">Высокий (Срочно)</option>
                    <option value="medium">Средний (В ближайшее ТО)</option>
                    <option value="low">Низкий (Косметика/Планово)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Примерный бюджет (₽)
                  </label>
                  <input
                    type="number"
                    value={taskCost}
                    onChange={(e) => setTaskCost(Number(e.target.value))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Целевой пробег (км)
                  </label>
                  <input
                    type="number"
                    value={taskTargetMileage}
                    onChange={(e) => setTaskTargetMileage(Number(e.target.value))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Примечание / Симптомы
                </label>
                <textarea
                  rows={2}
                  placeholder="Появился люфт при проезде неровностей..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Собственная подсказка / Совет мастера (необязательно)
                </label>
                <input
                  type="text"
                  placeholder="Особые указания сервису или артикулы сопутствующих болтов"
                  value={taskWorkHint}
                  onChange={(e) => setTaskWorkHint(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl cursor-pointer shadow-sm active:scale-95"
                >
                  Создать задачу
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
