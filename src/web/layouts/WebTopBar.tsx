import React from "react";
import {
  Bell,
  Sun,
  Moon,
  ScanBarcode,
  Smartphone,
} from "lucide-react";

interface WebTopBarProps {
  onOpenNotifications: () => void;
  onToggleTheme: () => void;
  onOpenScan?: () => void;
  onSwitchToMobile?: () => void;
  theme?: "light" | "dark";
  unreadCount?: number;
}

export const WebTopBar: React.FC<WebTopBarProps> = ({
  onOpenNotifications,
  onToggleTheme,
  onOpenScan,
  onSwitchToMobile,
  theme = "dark",
  unreadCount = 0,
}) => {
  const isDark = theme === "dark";

  return (
    <header
      className={`sticky top-0 z-30 h-16 flex items-center justify-between px-6 border-b backdrop-blur-md ${
        isDark
          ? "bg-[#17202E]/95 border-[#243044] text-slate-200"
          : "bg-white/95 border-slate-200 text-slate-900"
      }`}
    >
      <div />

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

