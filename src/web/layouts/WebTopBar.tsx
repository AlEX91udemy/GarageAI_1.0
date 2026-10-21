import React, { useState } from "react";
import {
  Bell,
  Sun,
  Moon,
  ChevronDown,
  Plus,
  ScanBarcode,
  Smartphone,
} from "lucide-react";
import { Vehicle } from "../../types";
import { LicensePlateBadge } from "../../components/LicensePlateBadge";

interface WebTopBarProps {
  currentVehicle: Vehicle;
  allVehicles: Vehicle[];
  onSelectVehicle: (v: Vehicle) => void;
  onOpenNotifications: () => void;
  onToggleTheme: () => void;
  onOpenAddVehicle?: () => void;
  onOpenEditVehicle?: () => void;
  onOpenScan?: () => void;
  onSwitchToMobile?: () => void;
  theme?: "light" | "dark";
  unreadCount?: number;
}

export const WebTopBar: React.FC<WebTopBarProps> = ({
  currentVehicle,
  allVehicles,
  onSelectVehicle,
  onOpenNotifications,
  onToggleTheme,
  onOpenAddVehicle,
  onOpenEditVehicle,
  onOpenScan,
  onSwitchToMobile,
  theme = "dark",
  unreadCount = 0,
}) => {
  const isDark = theme === "dark";
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);

  return (
    <header
      className={`sticky top-0 z-30 h-16 flex items-center justify-between px-6 border-b backdrop-blur-md ${
        isDark
          ? "bg-[#17202E]/95 border-[#243044] text-slate-200"
          : "bg-white/95 border-slate-200 text-slate-900"
      }`}
    >
      {/* Left: Vehicle Switcher */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowVehicleDropdown(!showVehicleDropdown)}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg border transition-all group ${
              isDark
                ? "bg-[#1E293B] border-[#243044] hover:border-[#EF3038]/40"
                : "bg-slate-50 border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex flex-col items-start">
              <span className="text-sm font-bold tracking-tight">
                {currentVehicle.make} {currentVehicle.model}
              </span>
              <span className={`text-xs font-mono tabular-nums ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                {currentVehicle.currentMileage.toLocaleString("ru-RU")} км
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showVehicleDropdown ? "rotate-180" : ""} ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            />
          </button>

          {/* Dropdown */}
          {showVehicleDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowVehicleDropdown(false)}
              />
              <div
                className={`absolute top-full left-0 mt-2 w-80 rounded-xl border shadow-2xl overflow-hidden z-50 ${
                  isDark
                    ? "bg-[#1E293B] border-[#243044]"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
                  {allVehicles.map((v) => {
                    const isActive = v.id === currentVehicle.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => {
                          onSelectVehicle(v);
                          setShowVehicleDropdown(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                          isActive
                            ? isDark
                              ? "bg-[#EF3038]/10 text-[#EF3038]"
                              : "bg-slate-100 text-slate-900"
                            : isDark
                            ? "hover:bg-[#1E293B] text-slate-300"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-xs shadow-sm"
                          style={{
                            background: v.colorHex || "#64748b",
                          }}
                        >
                          {v.make[0]}
                          {v.model[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm tracking-tight truncate">
                            {v.make} {v.model}
                          </div>
                          <div className={`text-xs font-mono tabular-nums ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            {v.year} • {v.currentMileage.toLocaleString("ru-RU")} км
                          </div>
                        </div>
                        {v.licensePlate && (
                          <LicensePlateBadge plate={v.licensePlate} size="sm" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {(onOpenAddVehicle || onOpenEditVehicle) && (
                  <div className={`p-2 border-t space-y-1 ${isDark ? "border-[#243044]" : "border-slate-200"}`}>
                    {onOpenEditVehicle && (
                      <button
                        onClick={() => {
                          onOpenEditVehicle();
                          setShowVehicleDropdown(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-medium text-sm ${
                          isDark
                            ? "text-slate-300 hover:bg-[#1E293B]"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        Параметры автомобиля
                      </button>
                    )}
                    {onOpenAddVehicle && (
                      <button
                        onClick={() => {
                          onOpenAddVehicle();
                          setShowVehicleDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all font-semibold text-sm bg-[#B91C1C] hover:bg-[#991B1B] text-white"
                      >
                        <Plus className="w-4 h-4" />
                        Добавить автомобиль
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Scan Button */}
        {onOpenScan && (
          <button
            onClick={onOpenScan}
            className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all ${
              isDark
                ? "bg-[#1E293B] border-[#243044] text-slate-400 hover:text-[#EF3038] hover:border-[#EF3038]/40"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
            title="Сканер"
          >
            <ScanBarcode className="w-5 h-5" />
          </button>
        )}

        {onSwitchToMobile && (
          <button
            onClick={onSwitchToMobile}
            className="w-10 h-10 rounded-lg border flex items-center justify-center transition-all bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-[#1E293B] dark:border-[#243044] dark:text-slate-400 dark:hover:text-[#EF3038]"
            title="Открыть мобильную версию"
            aria-label="Открыть мобильную версию"
          >
            <Smartphone className="w-5 h-5" />
          </button>
        )}

        {/* Notifications */}
        <button
          onClick={onOpenNotifications}
          className={`relative w-10 h-10 rounded-lg border flex items-center justify-center transition-all ${
            isDark
              ? "bg-[#1E293B] border-[#243044] text-slate-400 hover:text-slate-200"
              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
          }`}
          title="Уведомления"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#EF3038] text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all ${
            isDark
              ? "bg-[#1E293B] border-[#243044] text-slate-400 hover:text-[#F59E0B]"
              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
          }`}
          title="Переключить тему"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
};

