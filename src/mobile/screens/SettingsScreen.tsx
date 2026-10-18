import React, { useState } from "react";
import {
  ArrowLeft,
  Sliders,
  Bell,
  Moon,
  ShieldCheck,
  Check,
} from "lucide-react";

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const [distanceUnit, setDistanceUnit] = useState<"km" | "mi">("km");
  const [volumeUnit, setVolumeUnit] = useState<"l" | "gal">("l");
  const [currency, setCurrency] = useState<"rub" | "usd" | "eur">("rub");
  const [notifyService, setNotifyService] = useState(true);
  const [notifyAi, setNotifyAi] = useState(true);
  const [theme, setTheme] = useState<"dark_racing" | "carbon" | "oled">("dark_racing");

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

        <span className="text-xs font-bold text-white">Параметры Гаража</span>

        <div className="w-8" />
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* Units */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
          <h3 className="font-bold text-neutral-400 uppercase tracking-wider text-[11px]">
            Единицы измерения
          </h3>

          <div className="flex justify-between items-center py-1">
            <span className="text-neutral-300">Расстояние и одометр:</span>
            <div className="flex bg-neutral-950 rounded-xl p-0.5 border border-neutral-800">
              <button
                onClick={() => setDistanceUnit("km")}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  distanceUnit === "km" ? "bg-red-600 text-white" : "text-neutral-500"
                }`}
              >
                Км (km)
              </button>
              <button
                onClick={() => setDistanceUnit("mi")}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  distanceUnit === "mi" ? "bg-red-600 text-white" : "text-neutral-500"
                }`}
              >
                Мили (mi)
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-t border-neutral-800/60">
            <span className="text-neutral-300">Объем топлива:</span>
            <div className="flex bg-neutral-950 rounded-xl p-0.5 border border-neutral-800">
              <button
                onClick={() => setVolumeUnit("l")}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  volumeUnit === "l" ? "bg-red-600 text-white" : "text-neutral-500"
                }`}
              >
                Литры (L)
              </button>
              <button
                onClick={() => setVolumeUnit("gal")}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  volumeUnit === "gal" ? "bg-red-600 text-white" : "text-neutral-500"
                }`}
              >
                Галлоны (Gal)
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-t border-neutral-800/60">
            <span className="text-neutral-300">Валюта:</span>
            <div className="flex bg-neutral-950 rounded-xl p-0.5 border border-neutral-800">
              <button
                onClick={() => setCurrency("rub")}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  currency === "rub" ? "bg-red-600 text-white" : "text-neutral-500"
                }`}
              >
                ₽
              </button>
              <button
                onClick={() => setCurrency("usd")}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  currency === "usd" ? "bg-red-600 text-white" : "text-neutral-500"
                }`}
              >
                $
              </button>
              <button
                onClick={() => setCurrency("eur")}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  currency === "eur" ? "bg-red-600 text-white" : "text-neutral-500"
                }`}
              >
                €
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
          <h3 className="font-bold text-neutral-400 uppercase tracking-wider text-[11px]">
            Уведомления
          </h3>

          <div className="flex justify-between items-center">
            <div>
              <div className="font-bold text-white">Напоминания о регламенте ТО</div>
              <div className="text-[10px] text-neutral-400">
                За 1 500 км до плановой замены жидкостей
              </div>
            </div>
            <input
              type="checkbox"
              checked={notifyService}
              onChange={(e) => setNotifyService(e.target.checked)}
              className="w-4 h-4 accent-red-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-neutral-800/60">
            <div>
              <div className="font-bold text-white">Garage AI Рекомендации</div>
              <div className="text-[10px] text-neutral-400">
                Предиктивный анализ рисков и поломок
              </div>
            </div>
            <input
              type="checkbox"
              checked={notifyAi}
              onChange={(e) => setNotifyAi(e.target.checked)}
              className="w-4 h-4 accent-red-600 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Theme */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
          <h3 className="font-bold text-neutral-400 uppercase tracking-wider text-[11px]">
            Стиль оформления
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "dark_racing", label: "Dark Racing" },
              { id: "carbon", label: "Carbon Black" },
              { id: "oled", label: "OLED Midnight" },
            ].map((th) => (
              <button
                key={th.id}
                onClick={() => setTheme(th.id as any)}
                className={`p-2.5 rounded-xl border text-center font-bold text-[11px] transition cursor-pointer ${
                  theme === th.id
                    ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30"
                    : "bg-neutral-950 text-neutral-400 border-neutral-800"
                }`}
              >
                {th.label}
              </button>
            ))}
          </div>
        </div>

        {/* About App */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-center space-y-1">
          <div className="font-black text-sm text-white">
            GarageHub Mobile OS
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">
            Версия 2.4.0 (Build 882) • Automotive Edition
          </div>
          <div className="text-[10px] text-neutral-400 pt-1">
            Разработано для мобильных платформ iOS & Android
          </div>
        </div>
      </div>
    </div>
  );
};
