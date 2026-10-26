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
  ChevronDown,
  Plus,
} from "lucide-react";
import { Vehicle } from "../../types";

interface WebSidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onLogout?: () => void;
  theme?: "light" | "dark";
  currentVehicle: Vehicle;
  allVehicles: Vehicle[];
  onSelectVehicle: (v: Vehicle) => void;
  onOpenAddVehicle?: () => void;
  onOpenEditVehicle?: () => void;
}

export const WebSidebar: React.FC<WebSidebarProps> = ({
  activeView,
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
  onLogout,
  theme = "dark",
  currentVehicle,
  allVehicles,
  onSelectVehicle,
  onOpenAddVehicle,
  onOpenEditVehicle,
}) => {
  const isDark = theme === "dark";
  const [showVehicleList, setShowVehicleList] = React.useState(false);

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

      {!isCollapsed && (
        <div className="px-3 pt-3">
          <button type="button" onClick={() => setShowVehicleList((v) => !v)} className={`w-full flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition ${isDark ? "bg-[#1E293B] border-[#243044] hover:border-[#EF3038]/40" : "bg-slate-50 border-slate-200 hover:border-slate-300"}`}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
              {currentVehicle.id === "empty-garage" ? <Plus className="w-4 h-4" /> : <span className="text-[10px] font-bold">{currentVehicle.make[0]}{currentVehicle.model[0]}</span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold">{currentVehicle.id === "empty-garage" ? "Добавить автомобиль" : `${currentVehicle.make} ${currentVehicle.model}`}</span>
              <span className="block truncate text-[10px] text-slate-500">{currentVehicle.id === "empty-garage" ? "Профиль автомобиля" : `${currentVehicle.currentMileage.toLocaleString("ru-RU")} км`}</span>
            </span>
            <ChevronDown className={`w-4 h-4 shrink-0 transition ${showVehicleList ? "rotate-180" : ""}`} />
          </button>
          {showVehicleList && (
            <div className={`mt-2 rounded-xl border p-1 shadow-lg ${isDark ? "bg-[#1E293B] border-[#243044]" : "bg-white border-slate-200"}`}>
              {allVehicles.map((vehicle) => (
                <button key={vehicle.id} type="button" onClick={() => { onSelectVehicle(vehicle); setShowVehicleList(false); }} className={`w-full rounded-lg px-2.5 py-2 text-left text-xs ${vehicle.id === currentVehicle.id ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300" : "hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
                  <span className="block font-semibold truncate">{vehicle.make} {vehicle.model}</span>
                  <span className="text-[10px] text-slate-500">{vehicle.currentMileage.toLocaleString("ru-RU")} км</span>
                </button>
              ))}
              {(onOpenAddVehicle || onOpenEditVehicle) && <div className="mt-1 border-t border-slate-200/70 pt-1 dark:border-slate-700">
                {onOpenAddVehicle && <button type="button" onClick={() => { onOpenAddVehicle(); setShowVehicleList(false); }} className="w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"><Plus className="mr-1 inline h-3.5 w-3.5" />Добавить автомобиль</button>}
                {onOpenEditVehicle && currentVehicle.id !== "empty-garage" && <button type="button" onClick={() => { onOpenEditVehicle(); setShowVehicleList(false); }} className="w-full rounded-lg px-2.5 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-700">Параметры автомобиля</button>}
              </div>}
            </div>
          )}
        </div>
      )}

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

