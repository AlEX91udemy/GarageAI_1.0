import React, { useEffect } from "react";
import { Sparkles, ShieldCheck } from "lucide-react";

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1800);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      onClick={onFinish}
      className="relative flex flex-col items-center justify-between h-full w-full bg-gradient-to-b from-neutral-950 via-neutral-900 to-black p-8 text-white select-none cursor-pointer overflow-hidden"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top micro badge */}
      <div className="pt-8 flex items-center gap-1.5 text-xs text-neutral-400 font-mono tracking-widest uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
        GARAGE OPERATING SYSTEM v2.0
      </div>

      {/* Center hero logo */}
      <div className="flex flex-col items-center text-center z-10">
        <div className="relative mb-6">
          <div className="w-22 h-22 rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-neutral-950 border border-red-500/40 flex items-center justify-center shadow-2xl shadow-red-600/40">
            <span className="text-3xl font-black tracking-tighter text-white">GH</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center text-amber-400 shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white mb-2">
          Garage<span className="text-red-500">Hub</span>
        </h1>
        <p className="text-xs text-neutral-400 tracking-wide max-w-xs leading-relaxed">
          Цифровой гараж, телеметрия обслуживания и AI-диагностика вашего автомобиля
        </p>
      </div>

      {/* Bottom loading indicator */}
      <div className="w-full max-w-xs flex flex-col items-center pb-6">
        <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full animate-[pulse_1.2s_ease-in-out_infinite]" style={{ width: "85%" }} />
        </div>
        <div className="flex items-center justify-between w-full text-[11px] text-neutral-500 font-mono">
          <span>Синхронизация с автомобилем...</span>
          <span className="text-neutral-400">OK</span>
        </div>
      </div>
    </div>
  );
};
