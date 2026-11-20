import { useModalFocus } from "./useModalFocus";
import React, { useEffect, useState } from "react";
import {
  X,
  Sparkles,
  MessageSquareWarning,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Cpu,
  Loader2,
  DollarSign,
  Package,
  Plus,
  ArrowRight,
  Lightbulb,
  BookOpen,
} from "lucide-react";
import { Vehicle, ServiceRecord, ToFixTask, DiagnosticResult } from "../types";
import { authenticatedFetch } from "../api";

interface AiMechanicModalProps {
  vehicle: Vehicle;
  serviceRecords: ServiceRecord[];
  selectedServiceRecord?: ServiceRecord;
  onClose: () => void;
  onAddTaskToFix: (task: ToFixTask) => void;
}

export const AiMechanicModal: React.FC<AiMechanicModalProps> = ({
  vehicle,
  serviceRecords,
  selectedServiceRecord,
  onClose,
  onAddTaskToFix,
}) => {
  const [symptomInput, setSymptomInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [taskAdded, setTaskAdded] = useState(false);

  const vehicleRecords = serviceRecords.filter((r) => r.vehicleId === vehicle.id);

  // Quick preset queries
  const presets = [
    "Гул спереди справа на скорости от 60 км/ч, усиливается в левом повороте",
    "Рывки и пинки вариатора при плавном разгоне с места",
    "Свист приводного ремня на холодную при запуске утром",
    "Ошибка Check Engine: код P0420 (эффективность катализатора)",
    "Стук в передней подвеске при проезде мелких неровностей",
  ];

  const handleDiagnose = async (queryText?: string) => {
    const query = queryText ?? symptomInput;
    if (!query.trim() && !selectedServiceRecord) return;

    setIsLoading(true);
    setErrorMsg(null);
    setDiagnosticResult(null);

    // Build context
    const recentHistory = vehicleRecords.slice(0, 5).map((r) => ({
      date: r.date,
      mileage: r.mileage,
      title: r.title,
      parts: r.parts.map((p) => `${p.name} (${p.brand})`),
    }));

    try {
      const response = await authenticatedFetch("/api/ai/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          make: vehicle.make,
          model: vehicle.model,
          generation: vehicle.generation,
          market: vehicle.market,
          year: vehicle.year,
          engine: vehicle.engine,
          transmission: vehicle.transmission,
          driveType: vehicle.driveType,
          fuelType: vehicle.fuelType,
          currentMileage: vehicle.currentMileage,
          symptoms: query || "Разбор выполненного ремонта: " + (selectedServiceRecord?.title || "запись обслуживания"),
          serviceHistory: recentHistory,
          ...(selectedServiceRecord ? {
            selectedServiceRecord: {
              date: selectedServiceRecord.date, mileage: selectedServiceRecord.mileage,
              category: selectedServiceRecord.category, title: selectedServiceRecord.title,
              description: selectedServiceRecord.description, serviceCenter: selectedServiceRecord.serviceCenter,
              parts: (selectedServiceRecord.parts || []).map(({ name, brand, partNumber, quantity }) => ({ name, brand, partNumber, quantity })),
            },
          } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error("Не удалось связаться с сервером AI.");
      }

      const data = await response.json();
      setDiagnosticResult(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Не удалось получить диагностику. Проверьте подключение к серверу.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedServiceRecord) void handleDiagnose("");
  }, [selectedServiceRecord?.id]);

  const handleAddDiagnosisToFix = () => {
    if (!diagnosticResult) return;

    const newTask: ToFixTask = {
      id: "tf-ai-" + Date.now(),
      vehicleId: vehicle.id,
      title: diagnosticResult.primaryDiagnosis || "Устранение неисправности",
      description: [
        diagnosticResult.safetyAssessment ? `Безопасность: ${diagnosticResult.safetyAssessment}` : "",
        diagnosticResult.mechanicTip ? `Рекомендация: ${diagnosticResult.mechanicTip}` : "",
        diagnosticResult.diagnosticSteps?.[0] ? `Первый шаг: ${diagnosticResult.diagnosticSteps[0]}` : "",
      ].filter(Boolean).join(" "),
      priority: diagnosticResult.urgency === "high" ? "high" : diagnosticResult.urgency === "low" ? "low" : "medium",
      status: "pending",
      category: "Другое",
      createdAt: new Date().toISOString().split("T")[0],
    };

    onAddTaskToFix(newTask);
    setTaskAdded(true);
    setTimeout(() => setTaskAdded(false), 3500);
  };

  const dialogRef = useModalFocus(onClose);

  return (
    <div
      ref={dialogRef} role="dialog" aria-modal="true" aria-label="AI-диагностика" tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-neutral-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Fixed Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-neutral-100 shrink-0 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                Garage AI Rev • Диагностический AI-ассистент
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 leading-tight">
                Есть проблема? Разберёмся
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
            title="Закрыть (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 space-y-4">
        {selectedServiceRecord && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            Совет по ремонту от {selectedServiceRecord.date}: <strong>{selectedServiceRecord.title}</strong>
          </div>
        )}
          {/* Car Context Bar */}
        <div className="mt-4 p-3 rounded-2xl bg-neutral-900 text-white flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-semibold text-neutral-300">Контекст авто:</span>
            <span className="font-bold text-white">
              {vehicle.make} {vehicle.model} ({vehicle.year} г.)
            </span>
            <span className="text-neutral-400 font-mono">
              • {vehicle.currentMileage.toLocaleString("ru-RU")} км
            </span>
          </div>
          <span className="text-[11px] text-neutral-400 hidden sm:inline">
            Учтено {vehicleRecords.length} записей из журнала
          </span>
        </div>

        {/* Input Area */}
        <div className="space-y-3 mt-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              {selectedServiceRecord
                ? "Добавьте жалобу после ремонта, если она есть (необязательно):"
                : "Опишите симптомы, посторонний звук или код ошибки OBD-II (DTC):"}
            </label>
            <div className="relative">
              <textarea
                rows={3}
                placeholder={selectedServiceRecord
                  ? "Например: после ремонта появился стук на неровностях"
                  : "Например: появился гул спереди справа на скорости выше 60 км/ч или ошибка P0420"}
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl p-3 text-xs text-neutral-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Quick presets */}
          <div>
            <div className="text-[11px] font-semibold text-neutral-400 mb-1.5">
              Быстрые варианты частых проблем:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSymptomInput(preset);
                    handleDiagnose(preset);
                  }}
                  className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-[11px] transition text-left cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={() => handleDiagnose()}
              disabled={isLoading || (!symptomInput.trim() && !selectedServiceRecord)}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Анализируем историю авто и симптомы...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{selectedServiceRecord ? "Разобрать ремонт" : "Провести диагностику"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Structured Diagnostic Result */}
        {diagnosticResult && (
          <div className="mt-5 space-y-4 border-t border-neutral-100 pt-4">
            <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 space-y-3">
              {/* Primary diagnosis */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase">
                      Вероятный диагноз
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-neutral-900 mt-1">
                    {diagnosticResult.primaryDiagnosis}
                  </h3>
                </div>

                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                    diagnosticResult.urgency === "high"
                      ? "bg-brand-soft-strong text-brand-hover"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {diagnosticResult.urgency === "high" ? "Срочный ремонт" : "Плановый осмотр"}
                </span>
              </div>

              {diagnosticResult.safetyAssessment && (
                <div className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                  diagnosticResult.urgency === "high"
                    ? "border-red-200 bg-red-50 text-red-900"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}>
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <div>
                    <div className="font-bold">Оценка безопасности движения</div>
                    <p className="mt-1 leading-relaxed">{diagnosticResult.safetyAssessment}</p>
                  </div>
                </div>
              )}

              {/* Diagnostic hypotheses */}
              {diagnosticResult.likelyCauses && (
                <div>
                  <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                    Возможные причины:
                  </div>
                  <div className="space-y-1.5">
                    {diagnosticResult.likelyCauses.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-neutral-200/80"
                      >
                        <span className="text-neutral-800 font-medium">{c.cause}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagnostic Steps */}
              {diagnosticResult.diagnosticSteps && (
                <div>
                  <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                    Пошаговая проверка механика:
                  </div>
                  <ul className="space-y-1 text-xs text-neutral-700 list-disc list-inside bg-white p-3 rounded-xl border border-neutral-200/80">
                    {diagnosticResult.diagnosticSteps.map((step, i) => (
                      <li key={i} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Mechanic Tip */}
              {diagnosticResult.mechanicTip && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2 text-xs text-amber-900">
                  <Lightbulb className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span className="leading-relaxed">{diagnosticResult.mechanicTip}</span>
                </div>
              )}

              {diagnosticResult.knowledgeSources && (
                <div className="rounded-xl border border-neutral-200 bg-white p-3 text-xs">
                  <div className="mb-1.5 flex items-center gap-1.5 font-bold text-neutral-600">
                    <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                    Основание ответа
                  </div>
                  {diagnosticResult.knowledgeSources.length === 0 ? (
                    <p className="text-neutral-500">Точная выдержка руководства для этой конфигурации не найдена. Ответ содержит общие рекомендации и диагностические гипотезы.</p>
                  ) : (
                    <ul className="space-y-1.5 text-neutral-600">
                      {diagnosticResult.knowledgeSources.map((source, index) => (
                        <li key={`${source.title}-${index}`}>
                          <span className="font-semibold">{source.evidenceType === "vehicle_document_excerpt" ? "Руководство" : source.evidenceType === "model_series_guidance" ? "Модельная серия" : source.evidenceType === "make_guidance" ? "Марка" : "Общее правило"}:</span>{" "}
                          {source.documentName || source.title}{source.locator ? `, ${source.locator}` : ""}
                          {source.sourceUrl && <a className="ml-1 underline" href={source.sourceUrl} target="_blank" rel="noreferrer">Источник</a>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Action */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <p className="text-xs text-neutral-500">Стоимость и артикулы требуют проверки по региону и комплектации.</p>

                {taskAdded ? (
                  <div className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Добавлено в задачи To-Fix!</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddDiagnosisToFix}
                    className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Добавить в задачи To-Fix</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Footer */}
      <div className="flex justify-end p-3.5 sm:px-6 border-t border-neutral-100 shrink-0 bg-neutral-50/80">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-neutral-200/80 hover:bg-neutral-200 rounded-xl transition cursor-pointer"
        >
          Закрыть
        </button>
      </div>
    </div>
  </div>
);
};
