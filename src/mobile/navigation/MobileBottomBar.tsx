import React from "react";
import {
  Home,
  Plus,
  BookOpen,
  Wallet,
  User,
} from "lucide-react";
import { MobileTab } from "../types";
import { ThemeMode } from "../theme";

export interface MobileBottomBarProps {
  activeTab: MobileTab;
  onSelectTab?: (tab: MobileTab) => void;
  onTabChange?: (tab: MobileTab) => void;
  onOpenQuickAction?: () => void;
  onQuickAction?: () => void;
  themeMode?: ThemeMode;
  badgeCounts?: {
    service?: number;
    repair?: number;
    garage?: number;
  };
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  activeTab,
  onSelectTab,
  onTabChange,
  onOpenQuickAction,
  onQuickAction,
  themeMode = "dark",
  badgeCounts,
}) => {
  const isDark = themeMode === "dark";

  const handleSelect = (tab: MobileTab) => {
    if (onTabChange) onTabChange(tab);
    if (onSelectTab) onSelectTab(tab);
  };

  const handleAction = () => {
    if (onQuickAction) onQuickAction();
    if (onOpenQuickAction) onOpenQuickAction();
  };

  const isHomeActive = activeTab === "home";
  const isHistoryActive = activeTab === "history" || activeTab === "service" || activeTab === "repair";
  const isExpensesActive = activeTab === "expenses";
  const isProfileActive = activeTab === "profile";

  return (
    <div
      className={`sticky bottom-0 z-40 w-full select-none transition-colors duration-200 border-t ${
        isDark
          ? "bg-[#0d131d]/95 backdrop-blur-xl border-[#202c3e] text-white"
          : "bg-white/95 backdrop-blur-xl border-neutral-200/90 text-neutral-900 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
      }`}
    >
      <div className="flex items-center justify-around max-w-md mx-auto relative px-2 py-1.5 pb-2">
        {/* 1. ГЛАВНАЯ */}
        <button
          id="tab-btn-home"
          onClick={() => handleSelect("home")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            isHomeActive
              ? "text-red-500 font-bold scale-105"
              : isDark
              ? "text-slate-400 hover:text-white"
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" strokeWidth={isHomeActive ? 2.5 : 1.9} />
          <span className="text-[11px] font-medium tracking-tight">Главная</span>
        </button>

        {/* 2. ИСТОРИЯ */}
        <button
          id="tab-btn-history"
          onClick={() => handleSelect("history")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            isHistoryActive
              ? "text-red-500 font-bold scale-105"
              : isDark
              ? "text-slate-400 hover:text-white"
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <BookOpen className="w-5 h-5 mb-0.5" strokeWidth={isHistoryActive ? 2.5 : 1.9} />
          <span className="text-[11px] font-medium tracking-tight">История</span>
          {Boolean(badgeCounts?.service) && (
            <span className="absolute top-0.5 right-1 px-1 min-w-3.5 h-3.5 rounded-full bg-red-600 text-white font-black text-[9px] flex items-center justify-center leading-none">
              {badgeCounts?.service}
            </span>
          )}
        </button>

        {/* 3. CENTER PLUS BUTTON */}
        <div className="relative -top-3 flex items-center justify-center">
          <button
            id="tab-btn-quick-action"
            onClick={handleAction}
            className={`w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-red-600/35 transition-all cursor-pointer border-4 ${
              isDark ? "border-[#0d131d]" : "border-[#F4F5F8]"
            }`}
            title="Добавить запись"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* 4. РАСХОДЫ */}
        <button
          id="tab-btn-expenses"
          onClick={() => handleSelect("expenses")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            isExpensesActive
              ? "text-red-500 font-bold scale-105"
              : isDark
              ? "text-slate-400 hover:text-white"
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Wallet className="w-5 h-5 mb-0.5" strokeWidth={isExpensesActive ? 2.5 : 1.9} />
          <span className="text-[11px] font-medium tracking-tight">Расходы</span>
        </button>

        {/* 5. ПРОФИЛЬ */}
        <button
          id="tab-btn-profile"
          onClick={() => handleSelect("profile")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            isProfileActive
              ? "text-red-500 font-bold scale-105"
              : isDark
              ? "text-slate-400 hover:text-white"
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <User className="w-5 h-5 mb-0.5" strokeWidth={isProfileActive ? 2.5 : 1.9} />
          <span className="text-[11px] font-medium tracking-tight">Профиль</span>
        </button>
      </div>
    </div>
  );
};

