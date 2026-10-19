import React, { useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Activity,
  History,
  Lightbulb,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Vehicle, ServiceRecord, ToFixTask } from "../../types";

interface AiDiagnosticsScreenProps {
  vehicle: Vehicle;
  serviceRecords: ServiceRecord[];
  toFixTasks: ToFixTask[];
  onBack: () => void;
  onAddTask: (task: any) => void;
}

export const AiDiagnosticsScreen: React.FC<AiDiagnosticsScreenProps> = ({
  vehicle,
  serviceRecords,
  toFixTasks,
  onBack,
  onAddTask,
}) => {
  const [activeTab, setActiveTab] = useState<"patterns" | "causes" | "evidence">("patterns");

  const carServices = serviceRecords.filter((r) => r.vehicleId === vehicle.id);

  return (
    <div className="flex flex-col w-full pb-10 text-white select-none">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-neutral-800/80">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Garage AI Core</span>
        </div>

        <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded-full border border-neutral-800">
          v2.4 Online
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* 1. SUMMARY HERO CARD */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-500/15 via-neutral-900 to-neutral-900 border border-amber-500/30 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Анализ состояния бортового журнала
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Риск: СРЕДНИЙ
            </span>
          </div>

          <h2 className="text-base font-bold text-white mb-2 leading-snug">
            Диагностический вердикт для {vehicle.make} {vehicle.model} ({vehicle.year})
          </h2>

          <p className="text-xs text-neutral-300 leading-relaxed">
            На основе анализа {carServices.length} записей ТО, текущего пробега{" "}
            {vehicle.currentMileage.toLocaleString("ru-RU")} км и сезонной нагрузки выявлена необходимость превентивного обслуживания контура охлаждения и подвески.
          </p>
        </div>

        {/* 2. TAB TOGGLE */}
        <div className="flex p-1 bg-neutral-900 rounded-2xl border border-neutral-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab("patterns")}
            className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
              activeTab === "patterns"
                ? "bg-neutral-800 text-white shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Паттерны
          </button>
          <button
            onClick={() => setActiveTab("causes")}
            className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
              activeTab === "causes"
                ? "bg-neutral-800 text-white shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Причины & Риски
          </button>
          <button
            onClick={() => setActiveTab("evidence")}
            className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
              activeTab === "evidence"
                ? "bg-neutral-800 text-white shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            История / Evidence
          </button>
        </div>

        {/* TAB CONTENT */}
        {activeTab === "patterns" && (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Обнаружен повторяющийся паттерн: Охлаждение ДВС</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                С интервалом 40 000–55 000 км антифриз теряет антикоррозийные свойства. Прошлая замена была на 150 000 км. На складе в гараже уже лежат 2 канистры Nissan L248.
              </p>
              <div className="p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-[11px] text-neutral-400">
                💡 <span className="text-neutral-200">Рекомендация:</span> Заменить охлаждающую жидкость до наступления летней жары для защиты теплообменника вариатора.
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
                <Activity className="w-4 h-4 shrink-0" />
                <span>Паттерн ресурса ходовой части</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Стойки стабилизатора и сайлентблоки рычагов на данной платформе служат в среднем 45 000–60 000 км. Замена производилась 8 000 км назад — ресурс в безопасной зеленой зоне.
              </p>
            </div>
          </div>
        )}

        {activeTab === "causes" && (
          <div className="space-y-3">
            {[
              {
                cause: "Деградация ингибиторов коррозии антифриза",
                prob: "Высокая (85%)",
                action: "Ареометр / тест полоски pH",
                cost: "~2 500 ₽ за работу",
              },
              {
                cause: "Загрязнение сот радиатора пухом и пылью",
                prob: "Средняя (60%)",
                action: "Визуальный осмотр со снятием решетки",
                cost: "~3 000 ₽ мойка с разбором",
              },
              {
                cause: "Просадка резинового уплотнения крышки радиатора",
                prob: "Низкая (20%)",
                action: "Проверка давления сброса 0.9 / 1.1 bar",
                cost: "~800 ₽ новая крышка",
              },
            ].map((item, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1.5">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-white">{item.cause}</h4>
                  <span className="text-[10px] font-mono text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10">
                    {item.prob}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400">
                  <span className="text-neutral-500">Метод проверки:</span> {item.action}
                </div>
                <div className="text-[11px] text-neutral-300 font-mono">
                  Ориентир: {item.cost}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "evidence" && (
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Фактические записи из истории авто
            </div>
            {carServices.map((rec) => (
              <div key={rec.id} className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-white">{rec.title}</div>
                  <div className="text-[10px] text-neutral-400">{rec.date} • {rec.mileage.toLocaleString("ru-RU")} км</div>
                </div>
                <div className="font-mono text-neutral-300 font-bold">
                  {rec.totalCost.toLocaleString("ru-RU")} ₽
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action button */}
        <div className="pt-2">
          <button
            onClick={() => {
              onAddTask?.({
                id: "tf-ai-" + Date.now(),
                vehicleId: vehicle.id,
                title: "Проверка системы охлаждения и промывка радиаторов (AI)",
                priority: "medium",
                estimatedCost: 6500,
                category: "ТО и замена жидкостей",
                description: "Добавлено по рекомендации Garage AI Core после анализа ресурса антифриза.",
                status: "pending",
              });
              onBack?.();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Добавить задачу в To-Fix по рекомендации</span>
          </button>
        </div>
      </div>
    </div>
  );
};
