import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { GARAGE_CURRENCY_KEY, getGarageCurrency, type GarageCurrency } from "../currency";
import { DISTANCE_UNIT_KEY, VOLUME_UNIT_KEY } from "../units";
import { type DarkVariant, type ThemeMode } from "../theme";

const NOTIFY_SERVICE_KEY = "garagehub_notify_service";
const NOTIFY_AI_KEY = "garagehub_notify_ai";

interface SettingsScreenProps {
  onBack: () => void;
  themeMode?: ThemeMode;
  onThemeChange?: (mode: ThemeMode) => void;
  darkVariant?: DarkVariant;
  onDarkVariantChange?: (variant: DarkVariant) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  themeMode,
  onThemeChange,
  darkVariant = "dark_racing",
  onDarkVariantChange,
}) => {
  const [distanceUnit, setDistanceUnit] = useState<"km" | "mi">(() =>
    localStorage.getItem(DISTANCE_UNIT_KEY) === "mi" ? "mi" : "km"
  );
  const [volumeUnit, setVolumeUnit] = useState<"l" | "gal">(() =>
    localStorage.getItem(VOLUME_UNIT_KEY) === "gal" ? "gal" : "l"
  );
  const [currency, setCurrency] = useState<GarageCurrency>(getGarageCurrency);
  const [notifyService, setNotifyService] = useState<boolean>(
    () => localStorage.getItem(NOTIFY_SERVICE_KEY) !== "false"
  );
  const [notifyAi, setNotifyAi] = useState<boolean>(
    () => localStorage.getItem(NOTIFY_AI_KEY) !== "false"
  );
  const handleThemeVariant = (variant: DarkVariant) => {
    onDarkVariantChange?.(variant);
    // All three variants are dark themes — activate dark mode when selected.
    onThemeChange?.("dark");
  };

  // A variant button looks "active" only when the app is currently in dark mode.
  const variantActive = (variant: DarkVariant) => darkVariant === variant;

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
                onClick={() => {
                  setDistanceUnit("km");
                  localStorage.setItem(DISTANCE_UNIT_KEY, "km");
                }}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  distanceUnit === "km" ? "bg-brand-strong text-white" : "text-neutral-500"
                }`}
              >
                Км (km)
              </button>
              <button
                onClick={() => {
                  setDistanceUnit("mi");
                  localStorage.setItem(DISTANCE_UNIT_KEY, "mi");
                }}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  distanceUnit === "mi" ? "bg-brand-strong text-white" : "text-neutral-500"
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
                onClick={() => {
                  setVolumeUnit("l");
                  localStorage.setItem(VOLUME_UNIT_KEY, "l");
                }}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  volumeUnit === "l" ? "bg-brand-strong text-white" : "text-neutral-500"
                }`}
              >
                Литры (L)
              </button>
              <button
                onClick={() => {
                  setVolumeUnit("gal");
                  localStorage.setItem(VOLUME_UNIT_KEY, "gal");
                }}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  volumeUnit === "gal" ? "bg-brand-strong text-white" : "text-neutral-500"
                }`}
              >
                Галлоны (Gal)
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-t border-neutral-800/60">
            <span className="text-neutral-300">Валюта:</span>
            <div className="flex bg-neutral-950 rounded-xl p-0.5 border border-neutral-800">
              {(["rub", "usd", "eur"] as GarageCurrency[]).map((cur, idx) => (
                <button
                  key={cur}
                  onClick={() => {
                    setCurrency(cur);
                    localStorage.setItem(GARAGE_CURRENCY_KEY, cur);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                    currency === cur ? "bg-brand-strong text-white" : "text-neutral-500"
                  }`}
                >
                  {cur === "rub" ? "₽" : cur === "usd" ? "$" : "€"}
                </button>
              ))}
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
              onChange={(e) => {
                setNotifyService(e.target.checked);
                localStorage.setItem(NOTIFY_SERVICE_KEY, String(e.target.checked));
              }}
              className="w-4 h-4 accent-brand-strong rounded cursor-pointer"
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
              onChange={(e) => {
                setNotifyAi(e.target.checked);
                localStorage.setItem(NOTIFY_AI_KEY, String(e.target.checked));
              }}
              className="w-4 h-4 accent-brand-strong rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Theme */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
          <h3 className="font-bold text-neutral-400 uppercase tracking-wider text-[11px]">
            Стиль оформления
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "dark_racing" as DarkVariant, label: "Dark Racing" },
                { id: "carbon" as DarkVariant, label: "Carbon Black" },
                { id: "oled" as DarkVariant, label: "OLED Midnight" },
              ] as { id: DarkVariant; label: string }[]
            ).map((th) => (
              <button
                key={th.id}
                onClick={() => handleThemeVariant(th.id)}
                className={`p-2.5 rounded-xl border text-center font-bold text-[11px] transition cursor-pointer ${
                  variantActive(th.id)
                    ? "bg-brand-strong text-white border-brand shadow-md shadow-brand-strong/30"
                    : "bg-neutral-950 text-neutral-400 border-neutral-800"
                }`}
              >
                {th.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-neutral-500 pt-1">
            Выбранная схема сразу применяется ко всему приложению.
          </p>
        </div>

        {/* About App */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-center space-y-1">
          <div className="font-black text-sm text-white">Garage AI Mobile OS</div>
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

