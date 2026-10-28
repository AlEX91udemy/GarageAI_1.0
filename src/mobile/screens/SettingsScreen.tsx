import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { GARAGE_CURRENCY_KEY, getGarageCurrency, type GarageCurrency } from "../currency";
import { DISTANCE_UNIT_KEY, VOLUME_UNIT_KEY } from "../units";
import { type DarkVariant, type ThemeMode } from "../theme";
import {
  NOTIFY_AI_KEY,
  NOTIFY_SERVICE_KEY,
  notifyGarageSettingsChanged,
} from "../settings";

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
    onThemeChange?.("dark");
  };

  const isDark = themeMode === "dark";
  const variantActive = (variant: DarkVariant) => isDark && darkVariant === variant;
  const panelClass = isDark
    ? "bg-[#17202e] border-[#243044]"
    : "bg-white border-neutral-200/90 shadow-xs";
  const dividerClass = isDark ? "border-[#243044]/70" : "border-neutral-200/70";
  const headingClass = isDark ? "text-slate-400" : "text-neutral-500";
  const labelClass = isDark ? "text-slate-300" : "text-neutral-700";
  const mutedClass = isDark ? "text-slate-400" : "text-neutral-500";
  const controlClass = isDark
    ? "bg-[#0d131d] border-[#243044]"
    : "bg-neutral-50 border-neutral-200";
  const inactiveControlClass = isDark
    ? "text-slate-400 hover:text-white"
    : "text-neutral-500 hover:text-neutral-900";

  return (
    <div
      className={`flex flex-col w-full pb-10 select-none transition-colors ${
        isDark ? "bg-[#0d131d] text-white" : "bg-[#F4F5F8] text-[#0F172A]"
      }`}
    >
      {/* Header */}
      <div
        className={`sticky top-0 z-30 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b transition-colors ${
          isDark
            ? "bg-[#0d131d]/90 border-[#243044]/80"
            : "bg-white/90 border-neutral-200/80"
        }`}
      >
        <button
          onClick={onBack}
          className={`flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95 ${
            isDark ? "text-slate-300 hover:text-white" : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад</span>
        </button>
        <span className={`text-xs font-bold ${isDark ? "text-white" : "text-neutral-900"}`}>
          Параметры Гаража
        </span>
        <div className="w-8" />
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* Units */}
        <div className={`p-4 rounded-2xl border space-y-3 ${panelClass}`}>
          <h3 className={`font-bold uppercase tracking-wider text-[11px] ${headingClass}`}>
            Единицы измерения
          </h3>

          <div className="flex justify-between items-center py-1">
            <span className={labelClass}>Расстояние и одометр:</span>
            <div className={`flex rounded-xl p-0.5 border ${controlClass}`}>
              <button
                onClick={() => {
                  setDistanceUnit("km");
                  localStorage.setItem(DISTANCE_UNIT_KEY, "km");
                }}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                    distanceUnit === "km" ? "bg-brand-strong text-white" : inactiveControlClass
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
                    distanceUnit === "mi" ? "bg-brand-strong text-white" : inactiveControlClass
                }`}
              >
                Мили (mi)
              </button>
            </div>
          </div>

          <div className={`flex justify-between items-center py-1 border-t ${dividerClass}`}>
            <span className={labelClass}>Объем топлива:</span>
            <div className={`flex rounded-xl p-0.5 border ${controlClass}`}>
              <button
                onClick={() => {
                  setVolumeUnit("l");
                  localStorage.setItem(VOLUME_UNIT_KEY, "l");
                }}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                    volumeUnit === "l" ? "bg-brand-strong text-white" : inactiveControlClass
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
                    volumeUnit === "gal" ? "bg-brand-strong text-white" : inactiveControlClass
                }`}
              >
                Галлоны (Gal)
              </button>
            </div>
          </div>

          <div className={`flex justify-between items-center py-1 border-t ${dividerClass}`}>
            <span className={labelClass}>Валюта:</span>
            <div className={`flex rounded-xl p-0.5 border ${controlClass}`}>
              {(["rub", "usd", "eur"] as GarageCurrency[]).map((cur, idx) => (
                <button
                  key={cur}
                  onClick={() => {
                    setCurrency(cur);
                    localStorage.setItem(GARAGE_CURRENCY_KEY, cur);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                    currency === cur ? "bg-brand-strong text-white" : inactiveControlClass
                  }`}
                >
                  {cur === "rub" ? "₽" : cur === "usd" ? "$" : "€"}
                </button>
              ))}
            </div>
          </div>
          <p className={`text-[10px] pt-1 ${mutedClass}`}>
            Выбор влияет на пробег, объём топлива и подписи расчётов в приложении.
          </p>
        </div>

        {/* Notifications */}
        <div className={`p-4 rounded-2xl border space-y-3 ${panelClass}`}>
          <h3 className={`font-bold uppercase tracking-wider text-[11px] ${headingClass}`}>
            Уведомления
          </h3>

          <div className="flex justify-between items-center">
            <div>
              <div className={`font-bold ${isDark ? "text-white" : "text-neutral-900"}`}>Напоминания о регламенте ТО</div>
              <div className={`text-[10px] ${mutedClass}`}>
                За 1 500 км до плановой замены жидкостей
              </div>
            </div>
            <input
              type="checkbox"
              checked={notifyService}
              onChange={(e) => {
                setNotifyService(e.target.checked);
                localStorage.setItem(NOTIFY_SERVICE_KEY, String(e.target.checked));
                notifyGarageSettingsChanged();
              }}
              className="w-4 h-4 accent-brand-strong rounded cursor-pointer"
            />
          </div>

          <div className={`flex justify-between items-center pt-2 border-t ${dividerClass}`}>
            <div>
              <div className={`font-bold ${isDark ? "text-white" : "text-neutral-900"}`}>Garage AI Рекомендации</div>
              <div className={`text-[10px] ${mutedClass}`}>
                Предиктивный анализ рисков и поломок
              </div>
            </div>
            <input
              type="checkbox"
              checked={notifyAi}
              onChange={(e) => {
                setNotifyAi(e.target.checked);
                localStorage.setItem(NOTIFY_AI_KEY, String(e.target.checked));
                notifyGarageSettingsChanged();
              }}
              className="w-4 h-4 accent-brand-strong rounded cursor-pointer"
            />
          </div>
          <p className={`text-[10px] pt-1 ${mutedClass}`}>
            Отключённые категории не показываются в списке уведомлений.
          </p>
        </div>

        {/* Theme */}
        <div className={`p-4 rounded-2xl border space-y-2 ${panelClass}`}>
          <h3 className={`font-bold uppercase tracking-wider text-[11px] ${headingClass}`}>
            Стиль оформления
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onThemeChange?.("light")}
              aria-pressed={!isDark}
              title="Светлый фон и светлые карточки"
              className={`p-2.5 rounded-xl border text-center font-bold text-[11px] transition cursor-pointer ${
                !isDark
                  ? "bg-brand-strong text-white border-brand shadow-md shadow-brand-strong/30"
                  : `${controlClass} ${inactiveControlClass}`
              }`}
            >
              Light
            </button>
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
                aria-pressed={variantActive(th.id)}
                title={
                  th.id === "dark_racing"
                    ? "Тёмно-синяя тема с красным акцентом"
                    : th.id === "carbon"
                      ? "Графитовая тема с оранжевым акцентом"
                      : "Чёрная OLED тема с красным акцентом"
                }
                className={`p-2.5 rounded-xl border text-center font-bold text-[11px] transition cursor-pointer ${
                  variantActive(th.id)
                    ? "bg-brand-strong text-white border-brand shadow-md shadow-brand-strong/30"
                    : `${controlClass} ${inactiveControlClass}`
                }`}
              >
                {th.label}
              </button>
            ))}
          </div>
          <p className={`text-[10px] pt-1 ${mutedClass}`}>
            Light — белые карточки. Dark Racing — тёмно-синяя схема. Carbon Black — графитовая с оранжевым акцентом. OLED Midnight — почти чёрная с красным акцентом.
          </p>
        </div>

        {/* About App */}
        <div className={`p-4 rounded-2xl border text-center space-y-1 ${panelClass}`}>
          <div className={`font-black text-sm ${isDark ? "text-white" : "text-neutral-900"}`}>Garage AI Mobile OS</div>
          <div className={`text-[10px] font-mono ${mutedClass}`}>
            Версия 2.4.0 (Build 882) • Automotive Edition
          </div>
          <div className={`text-[10px] pt-1 ${isDark ? "text-slate-400" : "text-neutral-600"}`}>
            Разработано для мобильных платформ iOS & Android
          </div>
        </div>
      </div>
    </div>
  );
};

