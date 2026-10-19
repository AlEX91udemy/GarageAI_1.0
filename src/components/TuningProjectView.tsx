import React, { useState } from "react";
import {
  Gauge,
  Plus,
  Layers,
  ChevronDown,
  ChevronUp,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { Vehicle, TuningStage } from "../types";

interface TuningProjectViewProps {
  vehicle: Vehicle;
  /** Все этапы тюнинга (все автомобили) — компонент сам фильтрует по vehicle.id */
  stages: TuningStage[];
  onCreateStage: (stage: TuningStage) => void;
  onUpdateStage: (stage: TuningStage) => void;
  onDeleteStage: (stageId: string) => void;
}

export const TuningProjectView: React.FC<TuningProjectViewProps> = ({
  vehicle,
  stages: allStages,
  onCreateStage,
  onUpdateStage,
  onDeleteStage,
}) => {
  // Показываем только этапы текущего автомобиля — данные приходят с сервера.
  const stages = allStages.filter((s) => s.vehicleId === vehicle.id);



  const [showAddModal, setShowAddModal] = useState(false);
  const [isStageListCollapsed, setIsStageListCollapsed] = useState(false);
  const [selectedTuningMetric, setSelectedTuningMetric] = useState<"readiness" | "spent" | "budget" | null>(null);  const [newStage, setNewStage] = useState("Подвеска и тормоза");
  const [newTitle, setNewTitle] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newCost, setNewCost] = useState(10000);

  const totalPlanned = stages.reduce((sum, s) => sum + s.estimatedBudget, 0);
  const totalSpent = stages.reduce(
    (sum, s) => sum + (s.actualCost || (s.status === "completed" ? s.estimatedBudget : 0)),
    0
  );
  const completedCount = stages.filter((s) => s.status === "completed").length;

  const handleToggleStatus = (stage: TuningStage) => {
    const nextStatus =
      stage.status === "planned"
        ? "in_progress"
        : stage.status === "in_progress"
        ? "completed"
        : "planned";
    onUpdateStage({
      ...stage,
      status: nextStatus,
      actualCost: nextStatus === "completed" ? stage.actualCost || stage.estimatedBudget : stage.actualCost,
    });
  };

  const handleAddUpgrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const item: TuningStage = {
      id: "ts-" + crypto.randomUUID(),
      vehicleId: vehicle.id,
      stageName: newStage.trim(),
      title: newTitle.trim(),
      brand: newBrand.trim(),
      sku: newSku.trim(),
      description: "",
      estimatedBudget: Number(newCost) || 0,
      actualCost: 0,
      status: "planned",
      parts: [],
    };

    onCreateStage(item);
    setShowAddModal(false);
    setNewTitle("");
    setNewBrand("");
    setNewSku("");
  };

  const handleDeleteStage = (stageId: string) => {
    onDeleteStage(stageId);
  };

  const readinessPercent = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;
  const spentPercent = totalPlanned > 0 ? Math.min(100, Math.round((totalSpent / totalPlanned) * 100)) : 0;
  const remainingBudget = Math.max(0, totalPlanned - totalSpent);
  void readinessPercent; void spentPercent; void remainingBudget;

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
            <Gauge className="w-4 h-4" />
            <span>Проектный гараж & Тюнинг</span>
          </div>
          <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
            Stage-план доработок • {vehicle.make} {vehicle.model}
          </h2>
          <p className="text-xs text-neutral-500">
            План модификаций, контроль бюджета проекта и статус установки
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-blue-600/25"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить доработку</span>
        </button>
      </div>

      {/* Selectable Progress & Budget Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Готовность проекта */}
        <button
          type="button"
          onClick={() => {
            setSelectedTuningMetric((prev) => (prev === "readiness" ? null : "readiness"));
            if (isStageListCollapsed) setIsStageListCollapsed(false);
          }}
          className={`rounded-3xl p-4 border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between select-none active:scale-95 ${
            selectedTuningMetric === "readiness"
              ? "bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500 shadow-md scale-[1.01]"
              : "bg-white hover:bg-neutral-50 border-neutral-200/80 shadow-sm hover:border-emerald-200"
          }`}
          title="Нажмите, чтобы выделить этапы готовности проекта"
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <span className="text-[11px] font-semibold text-neutral-600 truncate">
              Готовность проекта
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase transition shrink-0 ${
                selectedTuningMetric === "readiness"
                  ? "bg-emerald-600 text-white"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {selectedTuningMetric === "readiness" ? "Активен ✓" : "Фильтр"}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-neutral-900 font-mono mt-1 flex items-baseline gap-1.5">
            <span>{Math.round((completedCount / (stages.length || 1)) * 100)}%</span>
            <span className="text-xs font-bold text-emerald-600 font-sans">
              ({completedCount}/{stages.length})
            </span>
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">
            Установлено {completedCount} из {stages.length} этапов
          </div>
        </button>

        {/* 2. Фактически потрачено */}
        <button
          type="button"
          onClick={() => {
            setSelectedTuningMetric((prev) => (prev === "spent" ? null : "spent"));
            if (isStageListCollapsed) setIsStageListCollapsed(false);
          }}
          className={`rounded-3xl p-4 border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between select-none active:scale-95 ${
            selectedTuningMetric === "spent"
              ? "bg-blue-50/90 border-blue-400 ring-2 ring-blue-500 shadow-md scale-[1.01]"
              : "bg-white hover:bg-neutral-50 border-neutral-200/80 shadow-sm hover:border-blue-200"
          }`}
          title="Нажмите, чтобы выделить фактически потраченные средства"
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <span className="text-[11px] font-semibold text-neutral-600 truncate">
              Фактически потрачено
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase transition shrink-0 ${
                selectedTuningMetric === "spent"
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {selectedTuningMetric === "spent" ? "Активен ✓" : "Фильтр"}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-mono mt-1">
            {totalSpent.toLocaleString("ru-RU")} ₽
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">
            по установленным компонентам
          </div>
        </button>

        {/* 3. Общий бюджет проекта */}
        <button
          type="button"
          onClick={() => {
            setSelectedTuningMetric((prev) => (prev === "budget" ? null : "budget"));
            if (isStageListCollapsed) setIsStageListCollapsed(false);
          }}
          className={`rounded-3xl p-4 border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between select-none active:scale-95 ${
            selectedTuningMetric === "budget"
              ? "bg-purple-50/90 border-purple-400 ring-2 ring-purple-500 shadow-md scale-[1.01]"
              : "bg-white hover:bg-neutral-50 border-neutral-200/80 shadow-sm hover:border-purple-200"
          }`}
          title="Нажмите, чтобы выделить плановый бюджет проекта"
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <span className="text-[11px] font-semibold text-neutral-600 truncate">
              Общий бюджет проекта
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase transition shrink-0 ${
                selectedTuningMetric === "budget"
                  ? "bg-purple-600 text-white"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {selectedTuningMetric === "budget" ? "Активен ✓" : "Фильтр"}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-neutral-900 font-mono mt-1">
            {totalPlanned.toLocaleString("ru-RU")} ₽
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">
            плановый объем инвестиций
          </div>
        </button>
      </div>

      {/* Unified Tuning Project Stages Block (Sampled after Active Tasks To-Fix) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-blue-200/80 shadow-sm transition-all duration-200">
        <div
          onClick={() => setIsStageListCollapsed((prev) => !prev)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsStageListCollapsed((prev) => !prev);
              }}
              className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200/60 flex items-center justify-center transition cursor-pointer shadow-xs active:scale-95 shrink-0"
              title={!isStageListCollapsed ? "Свернуть этапы тюнинга" : "Развернуть этапы тюнинга"}
            >
              <Gauge className="w-4 h-4 text-blue-600 stroke-[2.2]" />
            </button>
            <div>
              <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <span>Этапы тюнинг-проекта</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full font-mono">
                  {stages.length}
                </span>
              </h4>
              <p className="text-[11px] text-neutral-500">
                {isStageListCollapsed
                  ? "Список компонентов свернут (нажмите, чтобы развернуть)"
                  : `Установлено ${completedCount} из ${stages.length} этапов • План модификаций`}
              </p>
              {selectedTuningMetric && !isStageListCollapsed && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-neutral-900 text-white inline-flex items-center gap-1.5">
                    <span>
                      {selectedTuningMetric === "readiness" && `Выделено: Установленные этапы (${completedCount} шт.)`}
                      {selectedTuningMetric === "spent" && `Выделено: Фактические затраты (${totalSpent.toLocaleString("ru-RU")} ₽)`}
                      {selectedTuningMetric === "budget" && `Выделено: Общий бюджет (${totalPlanned.toLocaleString("ru-RU")} ₽)`}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTuningMetric(null);
                      }}
                      className="hover:text-red-300 ml-1 font-bold text-xs cursor-pointer"
                      title="Сбросить выделение"
                    >
                      ×
                    </button>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm border border-blue-200/60">
              {!isStageListCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Свернуть</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Развернуть ({stages.length})</span>
                </>
              )}
            </span>
          </div>
        </div>

        {!isStageListCollapsed && (
          <div className="space-y-3 pt-3 mt-3 border-t border-blue-100">
            {stages.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-neutral-200/80 shadow-sm space-y-2">
                <Layers className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-neutral-800">
                  В проекте пока нет этапов тюнинга
                </h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Нажмите «Добавить доработку», чтобы запланировать новый компонент или тюнинг-кит.
                </p>
              </div>
            ) : (
              stages.map((stage) => {
                const isInstalled = stage.status === "completed";
                const isInProgress = stage.status === "in_progress";

                // Highlighting logic based on selected metric
                const isHighlightedByMetric =
                  selectedTuningMetric === null ||
                  (selectedTuningMetric === "readiness" && isInstalled) ||
                  (selectedTuningMetric === "spent" && ((stage.actualCost || 0) > 0 || isInstalled)) ||
                  (selectedTuningMetric === "budget");

                const isDimmed = selectedTuningMetric !== null && !isHighlightedByMetric;

                return (
                  <div
                    key={stage.id}
                    className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all duration-200 shadow-sm flex flex-col gap-3 ${
                      isDimmed
                        ? "opacity-40 grayscale-[25%] border-neutral-200/60"
                        : selectedTuningMetric === "readiness" && isInstalled
                        ? "border-emerald-400 ring-2 ring-emerald-500/50 bg-emerald-50/30 scale-[1.005]"
                        : selectedTuningMetric === "spent" && ((stage.actualCost || 0) > 0 || isInstalled)
                        ? "border-blue-400 ring-2 ring-blue-500/50 bg-blue-50/30 scale-[1.005]"
                        : selectedTuningMetric === "budget"
                        ? "border-purple-300 ring-1 ring-purple-400/40 bg-purple-50/20"
                        : isInstalled
                        ? "border-emerald-300 bg-emerald-50/10 hover:border-emerald-400"
                        : isInProgress
                        ? "border-amber-300 bg-amber-50/10 hover:border-amber-400"
                        : "border-neutral-200/80 hover:border-neutral-300"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              isInstalled
                                ? "bg-emerald-100 text-emerald-800"
                                : isInProgress
                                ? "bg-amber-100 text-amber-800"
                                : "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            {isInstalled ? "Установлено" : isInProgress ? "В работе" : "Запланировано"}
                          </span>
                          <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md font-medium">
                            {stage.stageName}                          </span>
                          {stage.brand && (
                            <span className="text-[11px] text-neutral-600 font-medium">
                              Бренд: <strong className="text-neutral-800">{stage.brand}</strong>
                            </span>
                          )}
                          {stage.sku && (
                            <span className="text-[11px] font-mono text-red-700 bg-red-50 border border-red-200/60 px-2 py-0.5 rounded-md font-bold">
                              {stage.sku}
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-neutral-900 mt-1">
                          {stage.title}
                        </h4>

                        {stage.description && (
                          <p className="text-xs text-neutral-600 mt-0.5">
                            {stage.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                        <div className="text-left sm:text-right font-mono">
                          <div className="text-[10px] text-neutral-400">
                            {isInstalled ? "Потрачено" : "План"}
                          </div>
                          <div className="text-sm sm:text-base font-extrabold text-neutral-900">
                            {(stage.actualCost || stage.estimatedBudget).toLocaleString("ru-RU")} ₽
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(stage)}


                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0 ${
                              isInstalled
                                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                                : isInProgress
                                ? "bg-amber-500 text-white hover:bg-amber-600"
                                : "bg-neutral-900 text-white hover:bg-neutral-800"
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {isInstalled ? "Установлен ✓" : isInProgress ? "Завершить" : "Начать"}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteStage(stage.id)}

                            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                            title="Удалить доработку"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Add Upgrade Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900">
              Добавить модификацию в проект
            </h3>

            <form onSubmit={handleAddUpgrade} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Категория проекта / Stage
                </label>
                <input
                  type="text"
                  placeholder="Подвеска, Тормоза, ДВС Stage 1, Свет, Музыка..."
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Наименование компонента
                </label>
                <input
                  type="text"
                  placeholder="например: Койловеры BC Racing с регулировкой жесткости"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Бренд
                  </label>
                  <input
                    type="text"
                    placeholder="Brembo, Bilstein, Thule"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Артикул / Модель
                  </label>
                  <input
                    type="text"
                    placeholder="BC-V1-BR"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Планируемый бюджет (₽)
                </label>
                <input
                  type="number"
                  value={newCost}
                  onChange={(e) => setNewCost(Number(e.target.value))}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl"
                >
                  Добавить в проект
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
