import React, { useState } from "react";
import {
  Calendar,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Plus,
  Loader2,
  Gauge,
  Sliders,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Filter,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import { Vehicle, OemScheduleItem, MaintenanceCategory } from "../types";
import { authenticatedFetch } from "../api";

interface OemScheduleViewProps {
  vehicle: Vehicle;
  schedules: OemScheduleItem[];
  onMarkDone: (item: OemScheduleItem) => void;
  onAddScheduleItem: (item: OemScheduleItem) => void;
  onUpdateSchedules: (items: OemScheduleItem[]) => void;
}

export const OemScheduleView: React.FC<OemScheduleViewProps> = ({
  vehicle,
  schedules,
  onMarkDone,
  onAddScheduleItem,
  onUpdateSchedules,
}) => {
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "overdue" | "soon" | "ok">("all");
  const [isScheduleListCollapsed, setIsScheduleListCollapsed] = useState(false);

  // New item form state
  const [newTitle, setNewTitle] = useState("");
  const [newIntervalKm, setNewIntervalKm] = useState(10000);
  const [newIntervalMonths, setNewIntervalMonths] = useState(12);
  const [newCategory, setNewCategory] = useState<MaintenanceCategory>("ТО и замена жидкостей");
  const [newDescription, setNewDescription] = useState("");

  const vehicleSchedules = schedules.filter((s) => s.vehicleId === vehicle.id);

  // Calculate status for each item
  const scheduleStatuses = vehicleSchedules.map((item) => {
    const lastKm = item.lastDoneKm ?? 0;
    const kmPassed = vehicle.currentMileage - lastKm;
    const kmRemaining = item.intervalKm - kmPassed;
    const percent = Math.min(100, Math.max(0, Math.round((kmPassed / item.intervalKm) * 100)));

    let status: "ok" | "soon" | "overdue" = "ok";
    if (kmPassed >= item.intervalKm) {
      status = "overdue";
    } else if (kmPassed >= item.intervalKm * 0.8 || kmRemaining <= 2000) {
      status = "soon";
    }

    return {
      ...item,
      kmPassed,
      kmRemaining,
      percent,
      status,
    };
  });

  const overdueCount = scheduleStatuses.filter((s) => s.status === "overdue").length;
  const soonCount = scheduleStatuses.filter((s) => s.status === "soon").length;

  // Request OEM schedule from Gemini 3.8 Flash via /api/ai/oem-schedule
  const handleAiGenerateOem = async () => {
    setIsAiGenerating(true);
    setAiError(null);
    try {
      const response = await authenticatedFetch("/api/ai/oem-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          engine: vehicle.engine,
          currentMileage: vehicle.currentMileage,
        }),
      });

      if (!response.ok) {
        throw new Error("Ошибка связи с сервером AI");
      }

      const data = await response.json();
      if (data.items && Array.isArray(data.items)) {
        const generatedItems: OemScheduleItem[] = data.items.map(
          (aiItem: any, idx: number) => ({
            id: `oem-${vehicle.id}-${Date.now()}-${idx}`,
            vehicleId: vehicle.id,
            title: aiItem.title,
            category: (aiItem.category as MaintenanceCategory) || "ТО и замена жидкостей",
            intervalKm: aiItem.intervalKm || 10000,
            intervalMonths: aiItem.intervalMonths || 12,
            lastDoneKm: Math.max(0, vehicle.currentMileage - (aiItem.intervalKm / 2)),
            lastDoneDate: "2025-10-01",
            notes: aiItem.notes || "Сгенерировано по регламенту завода",
          })
        );

        // Replace or merge with existing
        onUpdateSchedules(generatedItems);
      }
    } catch (err) {
      console.error(err);
      setAiError("Не удалось загрузить рекомендации OEM. Проверьте подключение к серверу.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: OemScheduleItem = {
      id: `oem-${Date.now()}`,
      vehicleId: vehicle.id,
      title: newTitle.trim(),
      category: newCategory,
      intervalKm: Number(newIntervalKm),
      intervalMonths: Number(newIntervalMonths),
      lastDoneKm: vehicle.currentMileage,
      lastDoneDate: new Date().toISOString().split("T")[0],
      notes: newDescription.trim() || undefined,
    };

    onAddScheduleItem(newItem);
    setShowAddModal(false);
    setNewTitle("");
    setNewDescription("");
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Заводской регламент
          </div>
          <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
            Регламент ТО
          </h2>
          <p className="text-xs text-neutral-500">
            Ориентиры интервалов замены для двигателя {vehicle.engine} при пробеге{" "}
            <strong className="text-neutral-900 font-mono">
              {vehicle.currentMileage.toLocaleString("ru-RU")} км
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleAiGenerateOem}
            disabled={isAiGenerating}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isAiGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Запрашиваем регламент...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>AI-генератор регламента</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-2xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/25"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить пункт</span>
          </button>
        </div>
      </div>

      {aiError && (
        <div className="p-3 bg-brand-soft border border-brand-border text-brand-hover text-xs rounded-2xl font-medium flex items-center justify-between">
          <span>{aiError}</span>
          <button
            type="button"
            onClick={() => setAiError(null)}
            className="text-brand-strong hover:text-brand-hover font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Overview Stats Cards (Clickable Filters) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => {
            setStatusFilter((prev) => (prev === "overdue" ? "all" : "overdue"));
            setIsScheduleListCollapsed(false);
          }}
          className={`relative rounded-3xl p-4 border text-left transition-all duration-200 cursor-pointer flex items-center gap-3 select-none ${
            statusFilter === "overdue"
              ? "bg-brand-soft/80 border-brand-light ring-2 ring-brand-border shadow-md scale-[1.01]"
              : "bg-white hover:bg-neutral-50 border-neutral-200/80 shadow-sm hover:border-brand-border"
          }`}
          title={statusFilter === "overdue" ? "Нажмите, чтобы сбросить фильтр" : "Показать только требующие внимания"}
        >
          <div className="flex min-w-0 items-start gap-3 pr-14">
            <div className="w-10 h-10 rounded-2xl bg-brand-soft-strong text-brand-strong flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-neutral-500 font-medium">Требуют внимания сейчас</div>
              <div className="text-lg font-extrabold text-brand-strong font-mono">
                {overdueCount} {overdueCount === 1 ? "пункт" : "пунктов"}
              </div>
            </div>
          </div>
          <span
            className={`absolute right-4 top-4 text-[10px] font-bold px-2 py-1 rounded-full uppercase transition ${
              statusFilter === "overdue"
                ? "bg-brand-strong text-white"
                : "bg-neutral-100 text-neutral-500 hover:bg-brand-soft-strong hover:text-brand-hover"
            }`}
          >
            {statusFilter === "overdue" ? "Активен ✓" : "Фильтр"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter((prev) => (prev === "soon" ? "all" : "soon"));
            setIsScheduleListCollapsed(false);
          }}
          className={`relative rounded-3xl p-4 border text-left transition-all duration-200 cursor-pointer flex items-center gap-3 select-none ${
            statusFilter === "soon"
              ? "bg-amber-50/80 border-amber-400 ring-2 ring-amber-500 shadow-md scale-[1.01]"
              : "bg-white hover:bg-neutral-50 border-neutral-200/80 shadow-sm hover:border-amber-200"
          }`}
          title={statusFilter === "soon" ? "Нажмите, чтобы сбросить фильтр" : "Показать позиции, где скоро замена"}
        >
          <div className="flex min-w-0 items-start gap-3 pr-14">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-neutral-500 font-medium">Скоро замена (до 2 000 км)</div>
              <div className="text-lg font-extrabold text-amber-600 font-mono">
                {soonCount} {soonCount === 1 ? "пункт" : "пунктов"}
              </div>
            </div>
          </div>
          <span
            className={`absolute right-4 top-4 text-[10px] font-bold px-2 py-1 rounded-full uppercase transition ${
              statusFilter === "soon"
                ? "bg-amber-600 text-white"
                : "bg-neutral-100 text-neutral-500 hover:bg-amber-100 hover:text-amber-700"
            }`}
          >
            {statusFilter === "soon" ? "Активен ✓" : "Фильтр"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter((prev) => (prev === "ok" ? "all" : "ok"));
            setIsScheduleListCollapsed(false);
          }}
          className={`relative rounded-3xl p-4 border text-left transition-all duration-200 cursor-pointer flex items-center gap-3 select-none ${
            statusFilter === "ok"
              ? "bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500 shadow-md scale-[1.01]"
              : "bg-white hover:bg-neutral-50 border-neutral-200/80 shadow-sm hover:border-emerald-200"
          }`}
          title={statusFilter === "ok" ? "Нажмите, чтобы сбросить фильтр" : "Показать позиции в пределах нормы"}
        >
          <div className="flex min-w-0 items-start gap-3 pr-14">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-neutral-500 font-medium">В пределах нормы</div>
              <div className="text-lg font-extrabold text-emerald-600 font-mono">
                {scheduleStatuses.length - overdueCount - soonCount} пунктов
              </div>
            </div>
          </div>
          <span
            className={`absolute right-4 top-4 text-[10px] font-bold px-2 py-1 rounded-full uppercase transition ${
              statusFilter === "ok"
                ? "bg-emerald-600 text-white"
                : "bg-neutral-100 text-neutral-500 hover:bg-emerald-100 hover:text-emerald-700"
            }`}
          >
            {statusFilter === "ok" ? "Активен ✓" : "Фильтр"}
          </span>
        </button>
      </div>

      {/* Unified Monolithic Schedule Block with Stepper Timeline (Matching To-Fix Design System) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-emerald-200/80 shadow-sm transition-all duration-200">
        <div
          onClick={() => setIsScheduleListCollapsed((prev) => !prev)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsScheduleListCollapsed((prev) => !prev);
              }}
              className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200/80 flex items-center justify-center transition cursor-pointer shadow-xs active:scale-95 shrink-0"
              title={!isScheduleListCollapsed ? "Свернуть регламент" : "Развернуть регламент"}
            >
              <TrendingUp className="w-4 h-4 text-emerald-600 stroke-[2.2]" />
            </button>
            <div>
              <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <span>Регламентные позиции</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                  statusFilter === "overdue"
                    ? "bg-brand-soft-strong text-brand-hover"
                    : statusFilter === "soon"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}>
                  {scheduleStatuses.filter((item) => (statusFilter === "all" ? true : item.status === statusFilter)).length}
                </span>
              </h4>
              <p className="text-[11px] text-neutral-500">
                {statusFilter !== "all" ? (
                  <span className="flex items-center gap-1">
                    <Filter className="w-3 h-3 text-emerald-600 inline" />
                    <span>
                      Фильтр:{" "}
                      <strong className="text-neutral-900">
                        {statusFilter === "overdue"
                          ? "Требуют внимания сейчас"
                          : statusFilter === "soon"
                          ? "Скоро замена (до 2 000 км)"
                          : "В пределах нормы"}
                      </strong>
                    </span>
                  </span>
                ) : isScheduleListCollapsed ? (
                  "Список задач регламента свернут (нажмите, чтобы развернуть)"
                ) : (
                  "План предстоящих регламентных работ по авто"
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {statusFilter !== "all" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setStatusFilter("all");
                }}
                className="text-xs font-semibold px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <RotateCcw className="w-3 h-3 text-neutral-500" />
                <span className="hidden sm:inline">Сбросить фильтр</span>
              </button>
            )}

            <span className="text-xs font-semibold px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm border border-emerald-200/60">
              {!isScheduleListCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Свернуть</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>
                    Развернуть (
                    {
                      scheduleStatuses.filter((item) =>
                        statusFilter === "all" ? true : item.status === statusFilter
                      ).length
                    }
                    )
                  </span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Content within the monolithic block (identical to To-Fix tasks layout) */}
        {!isScheduleListCollapsed && (
          <div className="space-y-3 pt-3 mt-3 border-t border-emerald-100">
            {scheduleStatuses.filter((item) => (statusFilter === "all" ? true : item.status === statusFilter)).length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-neutral-200/80 shadow-sm space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-neutral-800">
                  Нет позиций в выбранном статусе
                </h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Все пункты регламента в этой категории чисты или перемещены в другие статусы.
                </p>
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className="mt-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Показать все пункты ({scheduleStatuses.length})
                </button>
              </div>
            ) : (
              scheduleStatuses
                .filter((item) => {
                  if (statusFilter === "all") return true;
                  return item.status === statusFilter;
                })
                .map((item) => {
                  const isOverdue = item.status === "overdue";
                  const isSoon = item.status === "soon";

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all duration-200 shadow-sm flex flex-col gap-3 ${
                        isOverdue
                          ? "border-brand-light bg-brand-soft/20"
                          : isSoon
                          ? "border-amber-300 bg-amber-50/10"
                          : "border-emerald-300 bg-emerald-50/10 hover:border-emerald-400"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                isOverdue
                                  ? "bg-brand-soft-strong text-brand-hover"
                                  : isSoon
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {isOverdue
                                ? `Просрочено на ${Math.abs(item.kmRemaining).toLocaleString("ru-RU")} км`
                                : isSoon
                                ? `Скоро: осталось ${item.kmRemaining.toLocaleString("ru-RU")} км`
                                : `В норме (ещё ${item.kmRemaining.toLocaleString("ru-RU")} км)`}
                            </span>
                            <span className="text-[11px] font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md">
                              Интервал: ~{item.intervalKm.toLocaleString("ru-RU")} км
                            </span>
                            <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md font-medium">
                              {item.category}
                            </span>
                          </div>

                          <h4 className="text-base font-bold text-neutral-900 mt-1">
                            {item.title}
                          </h4>

                          {item.notes && (
                            <p className="text-xs text-neutral-600 mt-0.5">
                              {item.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                          <div className="text-left sm:text-right font-mono">
                            <div className="text-[10px] text-neutral-400">Износ</div>
                            <div
                              className={`text-sm font-extrabold ${
                                isOverdue
                                  ? "text-brand-strong"
                                  : isSoon
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {item.percent}%
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onMarkDone(item)}
                            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Отметить замену</span>
                          </button>
                        </div>
                      </div>

                      {/* Progress bar visual & details */}
                      <div className="mt-1 pt-2.5 border-t border-neutral-100/90 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between text-xs font-mono gap-1">
                          <span className="text-neutral-500">
                            Прошло с прошлой замены:{" "}
                            <strong className="text-neutral-900">
                              {item.kmPassed.toLocaleString("ru-RU")} км
                            </strong>
                          </span>
                          <span className="text-neutral-500">
                            Интервал:{" "}
                            <strong className="text-neutral-900">
                              {item.intervalKm.toLocaleString("ru-RU")} км
                            </strong>{" "}
                            ({item.intervalMonths} мес.)
                          </span>
                        </div>

                        <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              isOverdue
                                ? "bg-brand-strong"
                                : isSoon
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, item.percent)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-neutral-400">
                          <span>
                            Последний раз: {item.lastDoneDate || "при покупке"} ({item.lastDoneKm?.toLocaleString("ru-RU") || 0} км)
                          </span>
                          <span>
                            Остаток ресурса: {item.kmRemaining.toLocaleString("ru-RU")} км
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

      {/* Modal to add manual schedule item */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900">
              Добавить пункт в регламент ТО
            </h3>

            <form onSubmit={handleAddNewItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Наименование процедуры
                </label>
                <input
                  type="text"
                  placeholder="например: Замена тормозной жидкости DOT-4"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Интервал (км)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={newIntervalKm}
                    onChange={(e) => setNewIntervalKm(Number(e.target.value))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Интервал (месяцев)
                  </label>
                  <input
                    type="number"
                    value={newIntervalMonths}
                    onChange={(e) => setNewIntervalMonths(Number(e.target.value))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Категория
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as MaintenanceCategory)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="ТО и замена жидкостей">ТО и замена жидкостей</option>
                  <option value="Двигатель">Двигатель</option>
                  <option value="Трансмиссия и сцепление">Трансмиссия и сцепление</option>
                  <option value="Тормозная система">Тормозная система</option>
                  <option value="Подвеска и рулевое">Подвеска и рулевое</option>
                  <option value="Шины и диски">Шины и диски</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Рекомендации производителя / примечания
                </label>
                <textarea
                  rows={2}
                  placeholder="Допуск масла, спецификация жидкости, артикул фильтра..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs"
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
                  className="px-5 py-2 bg-brand-strong hover:bg-brand text-white font-bold rounded-xl"
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
