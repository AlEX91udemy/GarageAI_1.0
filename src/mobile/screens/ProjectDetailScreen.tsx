import React, { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Circle,
  Plus,
  Package,
  Camera,
  Layers,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { TuningProject } from "./ProjectsScreen";
import { Vehicle } from "../../types";

interface ProjectDetailScreenProps {
  project: TuningProject;
  vehicle: Vehicle;
  onBack: () => void;
  onOpenBeforeAfter: () => void;
}

export const ProjectDetailScreen: React.FC<ProjectDetailScreenProps> = ({
  project,
  vehicle,
  onBack,
  onOpenBeforeAfter,
}) => {
  const [activeTab, setActiveTab] = useState<"stages" | "parts" | "timeline">("stages");

  const stages = [
    {
      id: "st-1",
      title: "Этап 1: Дополнительное LED освещение и балка",
      status: "completed",
      cost: 12000,
      date: "Май 2024",
      desc: "Установка светодиодной балки в штатные рейлинги крыши, реле и скрытая кнопка в салоне.",
    },
    {
      id: "st-2",
      title: "Этап 2: Лифт-комплект подвески +30мм",
      status: "completed",
      cost: 16000,
      date: "Июль 2024",
      desc: "Полиуретановые проставки под стойки, удлиненные шпильки, сход-развал 3D.",
    },
    {
      id: "st-3",
      title: "Этап 3: Защита картера и редуктора 4мм алюминий",
      status: "in_progress",
      cost: 17000,
      date: "Сентябрь 2024",
      desc: "Броня MOTODOR на подрамник, раздатку и задний дифференциал.",
    },
  ];

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

        <span className="text-xs font-bold text-neutral-400">Тюнинг-проект</span>

        <button
          onClick={onOpenBeforeAfter}
          className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-cyan-400 hover:text-white cursor-pointer"
          title="Сравнение До / После"
        >
          <Camera className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Project Hero Card */}
        <div className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-3">
          <div>
            <span className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 inline-block mb-1.5">
              {project.category}
            </span>
            <h2 className="text-xl font-black text-white tracking-tight leading-snug">
              {project.title}
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Автомобиль: {vehicle.make} {vehicle.model}
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-xs text-neutral-400">
              <span>Готовность проекта</span>
              <span className="font-mono font-bold text-emerald-400">
                {project.progressPct}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 rounded-full"
                style={{ width: `${project.progressPct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80 text-xs">
            <div>
              <div className="text-[10px] text-neutral-400">Освоено:</div>
              <div className="font-mono font-bold text-white mt-0.5">
                {project.spent.toLocaleString("ru-RU")} ₽
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-neutral-400">Запланировано:</div>
              <div className="font-mono font-bold text-neutral-300 mt-0.5">
                {project.budget.toLocaleString("ru-RU")} ₽
              </div>
            </div>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex p-1 bg-neutral-900 rounded-2xl border border-neutral-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab("stages")}
            className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
              activeTab === "stages"
                ? "bg-neutral-800 text-white shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Этапы ({stages.length})
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
              activeTab === "timeline"
                ? "bg-neutral-800 text-white shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Таймлайн
          </button>
        </div>

        {/* Stages list */}
        {activeTab === "stages" && (
          <div className="space-y-3">
            {stages.map((st) => (
              <div
                key={st.id}
                className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {st.status === "completed" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <h3 className="text-xs font-bold text-white leading-snug">
                      {st.title}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                    {st.cost.toLocaleString("ru-RU")} ₽
                  </span>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed pl-6">
                  {st.desc}
                </p>

                <div className="flex justify-between items-center pl-6 pt-1 text-[10px] font-mono text-neutral-500">
                  <span>{st.date}</span>
                  <span
                    className={`font-semibold ${
                      st.status === "completed" ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {st.status === "completed" ? "Завершено" : "В работе"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timeline representation (Screen 17) */}
        {activeTab === "timeline" && (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-800">
            {stages.map((st) => (
              <div key={st.id} className="relative bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5">
                <div
                  className={`absolute -left-6 top-4 w-3.5 h-3.5 rounded-full border-2 border-neutral-950 ${
                    st.status === "completed" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                  }`}
                />
                <div className="text-[10px] font-mono text-neutral-500 mb-0.5">{st.date}</div>
                <div className="text-xs font-bold text-white">{st.title}</div>
                <div className="text-[11px] text-neutral-400 mt-1">{st.desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* Before / After banner CTA */}
        <div
          onClick={onOpenBeforeAfter}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-neutral-900 border border-cyan-500/30 flex items-center justify-between cursor-pointer hover:border-cyan-500/50 transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-xs font-bold text-white">
                Фотосравнение До / После
              </div>
              <div className="text-[10px] text-neutral-400">
                Интерактивный слайдер трансформации авто
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-cyan-400" />
        </div>
      </div>
    </div>
  );
};
