import React from "react";
import {
  Layers,
  Plus,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Wrench,
} from "lucide-react";
import { Vehicle } from "../../types";
import { CURRENCY_SYMBOLS, getGarageCurrency } from "../currency";

export interface TuningProject {
  id: string;
  vehicleId: string;
  title: string;
  category: string;
  status: "planning" | "in_progress" | "completed";
  progressPct: number;
  spent: number;
  budget: number;
  stagesCount: number;
  completedStages: number;
  description: string;
  updatedAt: string;
}

interface ProjectsScreenProps {
  vehicle: Vehicle;
  projects: TuningProject[];
  onSelectProject: (project: TuningProject) => void;
  onAddProject: () => void;
}

export const ProjectsScreen: React.FC<ProjectsScreenProps> = ({
  vehicle,
  projects,
  onSelectProject,
  onAddProject,
}) => {
  return (
    <div className="flex flex-col w-full pb-8 text-white select-none">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-neutral-800/80">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Тюнинг-проекты
          </h2>
          <p className="text-xs text-neutral-400">
            Доработки, этапы Stage и кастом {vehicle.make} {vehicle.model}
          </p>
        </div>

        <button
          onClick={onAddProject}
          className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/30 transition cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Проект</span>
        </button>
      </div>

      <div className="p-4 space-y-3.5">
        {projects.map((proj) => {
          const isDone = proj.status === "completed";

          return (
            <div
              key={proj.id}
              onClick={() => onSelectProject?.(proj)}
              className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition active:scale-[0.99] cursor-pointer shadow-lg space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 inline-block mb-1">
                    {proj.category}
                  </span>
                  <h3 className="text-base font-black text-white tracking-tight">
                    {proj.title}
                  </h3>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                    isDone
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                  }`}
                >
                  {isDone ? "ЗАВЕРШЕН" : "В РАБОТЕ"}
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Прогресс</span>
                  <span className="font-mono font-bold text-white">
                    {proj.progressPct}%
                  </span>
                </div>
                <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${proj.progressPct}%` }}
                  />
                </div>
              </div>

              {/* Budget & Stages */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 text-xs">
                <div>
                  <div className="text-[10px] text-neutral-400">Бюджет проекта:</div>
                  <div className="font-mono font-bold text-white mt-0.5">
                    {proj.spent.toLocaleString("ru-RU")} / {proj.budget.toLocaleString("ru-RU")} {CURRENCY_SYMBOLS[getGarageCurrency()]}
                  </div>
                </div>

                <div className="text-right flex items-center gap-1 text-red-400 font-semibold">
                  <span>{proj.completedStages}/{proj.stagesCount} этапов</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
