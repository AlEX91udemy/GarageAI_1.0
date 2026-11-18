import React from "react";
import { ArrowLeft, Camera, ChevronRight } from "lucide-react";
import type { TuningStage, Vehicle } from "../../types";
import { TuningProjectView } from "../../components/TuningProjectView";

interface ProjectDetailScreenProps {
  vehicle: Vehicle;
  stages: TuningStage[];
  onCreateStage: (stage: TuningStage) => void;
  onUpdateStage: (stage: TuningStage) => void;
  onDeleteStage: (stageId: string) => void;
  onBack: () => void;
  onOpenBeforeAfter: () => void;
}

export const ProjectDetailScreen: React.FC<ProjectDetailScreenProps> = ({
  vehicle,
  stages,
  onCreateStage,
  onUpdateStage,
  onDeleteStage,
  onBack,
  onOpenBeforeAfter,
}) => (
  <div className="flex flex-col w-full pb-10 text-white">
    <div className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-neutral-800/80">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white cursor-pointer active:scale-95"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Назад</span>
      </button>
      <span className="text-xs font-bold text-neutral-400">Тюнинг-проект</span>
      <button
        type="button"
        onClick={onOpenBeforeAfter}
        className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-brand-on-dark hover:text-white cursor-pointer"
        title="Сравнение До / После"
        aria-label="Фотосравнение до и после"
      >
        <Camera className="w-4 h-4" />
      </button>
    </div>

    <div className="p-4">
      <TuningProjectView
        vehicle={vehicle}
        stages={stages}
        onCreateStage={onCreateStage}
        onUpdateStage={onUpdateStage}
        onDeleteStage={onDeleteStage}
      />
      <button
        type="button"
        onClick={onOpenBeforeAfter}
        className="mt-4 w-full p-3.5 rounded-2xl bg-gradient-to-r from-brand-deep/40 to-neutral-900 border border-brand/30 flex items-center justify-between cursor-pointer hover:border-brand/50 transition active:scale-[0.99]"
      >
        <span className="flex items-center gap-2.5 text-xs font-bold text-white">
          <Camera className="w-5 h-5 text-brand-on-dark" />
          Фотосравнение До / После
        </span>
        <ChevronRight className="w-4 h-4 text-brand-on-dark" />
      </button>
    </div>
  </div>
);
