import React from "react";
import {
  Home,
  BookOpen,
  Wallet,
  User,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface WebSidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onLogout?: () => void;
  theme?: "light" | "dark";
}

export const WebSidebar: React.FC<WebSidebarProps> = ({
  activeView,
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
  onLogout,
  theme = "dark",
}) => {
  const isDark = theme === "dark";

  const navItems = [
    { id: "dashboard", label: "Главная", icon: Home },
    { id: "history", label: "История", icon: BookOpen },
    { id: "expenses", label: "Расходы", icon: Wallet },
  ];

  const bottomItems = [
    { id: "profile", label: "Профиль", icon: User },
    { id: "settings", label: "Настройки", icon: Settings },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-screen flex flex-col border-r transition-all duration-300 z-40 ${
        isCollapsed ? "w-20" : "w-64"
      } ${
        isDark
          ? "bg-[#17202E] border-[#243044] text-slate-200"
          : "bg-white border-slate-200 text-slate-900"
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-inherit shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <img src="/garageai-wordmark.png" alt="GarageAI" className="h-auto w-[116px] object-contain object-left" />
          </div>
        )}
        {isCollapsed && (
          <img src="/garage-ai-mark.png" alt="Garage AI" className="w-8 h-8 rounded-lg mx-auto" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                  isActive
                    ? isDark
                      ? "bg-[#EF3038]/10 text-[#EF3038] font-semibold"
                      : "bg-slate-100 text-slate-900 font-semibold"
                    : isDark
                    ? "text-slate-400 hover:bg-[#1E293B] hover:text-slate-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? "scale-110" : "group-hover:scale-105"
                  } transition-transform`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {!isCollapsed && (
                  <span className="text-sm tracking-tight">{item.label}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom section */}
      <div className={`px-3 py-3 border-t border-inherit space-y-1 ${isCollapsed ? "pb-4" : ""}`}>
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                isActive
                  ? isDark
                    ? "bg-[#1E293B] text-slate-200 font-semibold"
                    : "bg-slate-100 text-slate-900 font-semibold"
                  : isDark
                  ? "text-slate-400 hover:bg-[#1E293B] hover:text-slate-200"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon
                className="w-5 h-5 shrink-0 group-hover:scale-105 transition-transform"
                strokeWidth={isActive ? 2.5 : 2}
              />
              {!isCollapsed && (
                <span className="text-sm tracking-tight">{item.label}</span>
              )}
            </button>
          );
        })}

        {onLogout && (
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isDark ? "text-slate-400 hover:bg-red-950/40 hover:text-red-300" : "text-slate-600 hover:bg-red-50 hover:text-red-700"}`}
            title="Выйти"
            aria-label="Выйти"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="text-sm tracking-tight">Выйти</span>}
          </button>
        )}

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={`w-full flex items-center justify-center gap-3 px-3 py-2.5 rounded-lg transition-all mt-2 ${
              isDark
                ? "text-slate-500 hover:bg-[#1E293B] hover:text-slate-300"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            }`}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="text-xs">Свернуть</span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  );
};

