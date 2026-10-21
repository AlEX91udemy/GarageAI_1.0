import React, { useState } from "react";
import {
  ArrowLeft,
  Sliders,
  Columns,
  Sparkles,
  Calendar,
  DollarSign,
  Package,
} from "lucide-react";
import { Vehicle } from "../../types";

interface BeforeAfterScreenProps {
  vehicle: Vehicle;
  onBack: () => void;
}

export const BeforeAfterScreen: React.FC<BeforeAfterScreenProps> = ({
  vehicle,
  onBack,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [viewMode, setViewMode] = useState<"slider" | "side_by_side">("slider");

  // Realistic sample car assets
  const beforePhoto = "/images/nissan_xtrail_t31.jpg";
  const afterPhoto = "/images/bmw_3_series.jpg";

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

        <span className="text-xs font-bold text-neutral-300">
          Сравнение До / После
        </span>

        {/* View mode toggle */}
        <div className="flex bg-neutral-900 rounded-lg p-0.5 border border-neutral-800">
          <button
            onClick={() => setViewMode("slider")}
            className={`p-1.5 rounded-md transition cursor-pointer ${
              viewMode === "slider" ? "bg-neutral-800 text-brand-on-dark" : "text-neutral-500"
            }`}
            title="Интерактивный слайдер"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode("side_by_side")}
            className={`p-1.5 rounded-md transition cursor-pointer ${
              viewMode === "side_by_side" ? "bg-neutral-800 text-brand-on-dark" : "text-neutral-500"
            }`}
            title="Бок о бок"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Visual Interactive Viewport */}
        {viewMode === "slider" ? (
          <div className="relative w-full h-72 rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-2xl select-none">
            {/* After Image (Full background) */}
            <img
              width={640}
              height={384}
              src={afterPhoto}
              alt="После доработок"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
              После (Modified)
            </div>

            {/* Before Image (Clipped overlay) */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ width: `${sliderPosition}%` }}
            >
              <img
                width={640}
                height={384}
                src={beforePhoto}
                alt="До модификации"
                className="w-full h-full object-cover max-w-none"
                style={{ width: "100%", minWidth: "100%" }}
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                До (Stock)
              </div>
            </div>

            {/* Vertical Divider Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] pointer-events-none"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs shadow-xl cursor-ew-resize">
                ⇄
              </div>
            </div>

            {/* Hidden native range input covering whole area */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden border border-neutral-800 h-44">
              <img
                width={640}
                height={352}
                src={beforePhoto}
                alt="До"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-bold text-amber-400">
                ДО ТЮНИНГА (2023)
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden border border-neutral-800 h-44">
              <img
                width={640}
                height={352}
                src={afterPhoto}
                alt="После"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-bold text-emerald-400">
                ПОСЛЕ ТЮНИНГА (2024)
              </div>
            </div>
          </div>
        )}

        <div className="text-center text-[11px] text-neutral-400">
          ↔ Двигайте слайдер пальцем для оценки внешних изменений
        </div>

        {/* Change details */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
          <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wide">
            Параметры модернизации
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="text-[10px] text-neutral-400">Срок проекта</div>
              <div className="font-bold text-white mt-0.5">3.5 месяца</div>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="text-[10px] text-neutral-400">Сумма доработок</div>
              <div className="font-mono font-bold text-emerald-400 mt-0.5">
                45 000 ₽
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-neutral-800/80 text-xs text-neutral-300">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-light" />
              <span>Лифт подвески +30 мм и усиленные пружины</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-light" />
              <span>Светодиодная оптика дальнего света на крыше</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-light" />
              <span>Антихром элементов решетки и защитное покрытие</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
