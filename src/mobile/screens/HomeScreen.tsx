import React, { useState } from "react";
import {
  Bell,
  Sun,
  Moon,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Gauge,
  Fuel,
  CheckCircle2,
  Wrench,
  Wallet,
  FileText,
  MoreHorizontal,
  Car as CarIcon,
  Plus,
  ArrowRight,
  Check,
  Edit2,
  ScanBarcode,
} from "lucide-react";
import { formatGarageCurrency } from "../currency";
import { formatDistance } from "../units";
import {
  Vehicle,
  ServiceRecord,
  FuelRecord,
  OemScheduleItem,
  ToFixTask,
  GaragePart,
} from "../../types";
import { LicensePlateBadge } from "../../components/LicensePlateBadge";
import { MobileScreenId, QuickActionType } from "../types";
import { ThemeMode } from "../theme";
import { VehicleModelRenderer, getVehicleModelSpec } from "../../components/VehicleModelRenderer";

// Quick actions are hidden on the home screen for now; keep the markup for later.
const SHOW_QUICK_ACTIONS = false;

interface HomeScreenProps {
  currentVehicle: Vehicle;
  allVehicles: Vehicle[];
  onSelectVehicle: (v: Vehicle) => void;
  serviceRecords: ServiceRecord[];
  fuelRecords: FuelRecord[];
  oemSchedules: OemScheduleItem[];
  toFixTasks: ToFixTask[];
  garageParts: GaragePart[];
  onNavigate: (screen: MobileScreenId) => void;
  onOpenQuickAction: (initialType?: QuickActionType) => void;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onUpdateMileage: (mileage: number) => void;
  unreadNotificationsCount?: number;
  onOpenAddVehicle?: () => void;
  onOpenServiceBook?: () => void;
  onOpenReminders?: () => void;
  onOpenAiMechanic?: () => void;
  onOpenScanReceipt?: () => void;
  onOpenScanBarcode?: () => void;
  onOpenAddService?: () => void;
  themeMode?: ThemeMode;
  onToggleTheme?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  currentVehicle,
  allVehicles,
  onSelectVehicle,
  serviceRecords,
  fuelRecords,
  oemSchedules,
  toFixTasks,
  garageParts,
  onNavigate,
  onOpenQuickAction,
  onOpenNotifications,
  onOpenProfile,
  onUpdateMileage,
  unreadNotificationsCount = 0,
  onOpenAddVehicle,
  onOpenServiceBook,
  onOpenReminders,
  onOpenAiMechanic,
  onOpenScanReceipt,
  onOpenScanBarcode,
  onOpenAddService,
  themeMode = "light",
  onToggleTheme,
}) => {
  const isDark = themeMode === "dark";
  const [showQuickMileageModal, setShowQuickMileageModal] = useState(false);
  const [showVehicleSwitcherModal, setShowVehicleSwitcherModal] = useState(false);
  const [newMileageInput, setNewMileageInput] = useState(
    String(currentVehicle.currentMileage)
  );
  const [isKeyInfoExpanded, setIsKeyInfoExpanded] = useState(true);
  const visualModel = getVehicleModelSpec(currentVehicle);

  // Cycle vehicles
  const currentVehicleIndex = (allVehicles || []).findIndex((v) => v.id === currentVehicle.id);
  const handlePrevVehicle = () => {
    if (!allVehicles || allVehicles.length === 0) return;
    const prevIndex = (currentVehicleIndex - 1 + allVehicles.length) % allVehicles.length;
    onSelectVehicle?.(allVehicles[prevIndex]);
  };
  const handleNextVehicle = () => {
    if (!allVehicles || allVehicles.length === 0) return;
    const nextIndex = (currentVehicleIndex + 1) % allVehicles.length;
    onSelectVehicle?.(allVehicles[nextIndex]);
  };

  // Car records
  const vehicleServices = serviceRecords.filter(
    (r) => r.vehicleId === currentVehicle.id
  );
  const vehicleFuel = fuelRecords.filter(
    (f) => f.vehicleId === currentVehicle.id
  );
  const lastVehicleFuel = [...vehicleFuel].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
  const lastVehicleService = [...vehicleServices].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
  const fmtRub = formatGarageCurrency;
  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("ru-RU") : "");
  const fmtLiters = (n: number) =>
    n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Financial calculations
  const totalServiceCost = vehicleServices.reduce(
    (sum, r) => sum + (r.totalCost || 0),
    0
  );
  const totalFuelCost = vehicleFuel.reduce(
    (sum, f) => sum + (f.totalCost || 0),
    0
  );
  const totalExpenses = totalServiceCost + totalFuelCost;

  // Latest service and fuel
  const latestService = [...vehicleServices].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];

  const latestFuel = [...vehicleFuel].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];

  // Format date helper
  const formatDateRu = (dateStr?: string) => {
    if (!dateStr) return "07.06.2026";
    const [y, m, d] = dateStr.split("-");
    if (d && m && y) return `${d}.${m}.${y}`;
    return dateStr;
  };

  return (
    <div
      className={`flex flex-col w-full pb-14 select-none min-h-screen transition-colors duration-200 ${
        isDark ? "bg-[#0d131d] text-white" : "bg-[#F4F5F8] text-[#0F172A]"
      }`}
    >
      {/* 1. TOP HEADER */}
      <header
        className={`sticky top-0 z-30 flex items-center justify-between px-4 py-3 backdrop-blur-md border-b transition-colors duration-200 ${
          isDark
            ? "bg-[#0d131d]/90 border-[#1f2c3f]"
            : "bg-white/90 border-[#E2E8F0]"
        }`}
      >
        <div className="flex items-center gap-2">
          <img src="/garage-ai-mark.png" alt="GarageAI" className="w-8 h-8 rounded-xl object-contain" />
          <h1 className="text-base font-black tracking-tight leading-none">
            Garage<span className="text-red-500">AI</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Barcode / VIN Camera Scanner Button */}
          <button
            id="home-btn-barcode-scan"
            onClick={() => {
              if (typeof onOpenScanBarcode === "function") {
                onOpenScanBarcode();
              } else if (typeof onNavigate === "function") {
                onNavigate("scan_barcode");
              }
            }}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer relative active:scale-95 ${
              isDark
                ? "bg-[#17202e] border-[#243044] text-red-400 hover:text-red-300 hover:border-red-500/40"
                : "bg-white border-neutral-200 text-red-600 hover:bg-neutral-50 shadow-xs"
            }`}
            title="Сканер штрихкодов запчастей и VIN"
          >
            <ScanBarcode className="w-4 h-4" />
          </button>

          {/* Notifications Button */}
          <button
            id="home-btn-notifications"
            onClick={onOpenNotifications}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer relative active:scale-95 ${
              isDark
                ? "bg-[#17202e] border-[#243044] text-slate-300 hover:text-white"
                : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-xs"
            }`}
            title="Уведомления"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center shadow-xs">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Theme Switcher Toggle (Dark / Light) */}
          <button
            id="home-btn-theme-toggle"
            onClick={onToggleTheme}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
              isDark
                ? "bg-[#17202e] border-[#243044] text-amber-400 hover:text-amber-300"
                : "bg-white border-neutral-200 text-slate-700 hover:bg-neutral-50 shadow-xs"
            }`}
            title={isDark ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Settings Button */}
          <button
            id="home-btn-settings"
            onClick={() => onNavigate("settings")}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
              isDark
                ? "bg-[#17202e] border-[#243044] text-slate-300 hover:text-white"
                : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-xs"
            }`}
            title="Настройки"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. CAR SWITCHER SUB-HEADER */}
      <div
        className={`flex items-center justify-between px-4 py-2 border-b transition-colors duration-200 ${
          isDark
            ? "bg-[#101724] border-[#1b2535] text-slate-400"
            : "bg-[#FAFAFC] border-[#E8ECF2] text-slate-600"
        }`}
      >
        <button
          onClick={handlePrevVehicle}
          className="p-1 hover:text-red-500 transition cursor-pointer active:scale-90"
          title="Предыдущий автомобиль"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowVehicleSwitcherModal(true)}
          className="text-xs font-semibold hover:text-red-500 transition cursor-pointer flex items-center gap-1"
        >
          <span>Мои автомобили</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        </button>

        <button
          onClick={handleNextVehicle}
          className="p-1 hover:text-red-500 transition cursor-pointer active:scale-90"
          title="Следующий автомобиль"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 pt-3 flex flex-col gap-3">
        {currentVehicle.id !== "empty-garage" && <>
        {/* 3. VEHICLE HEADER INFO & PLATE */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-black tracking-tight leading-tight">
              {currentVehicle.make} {currentVehicle.model}
            </h2>
            <div
              className={`text-xs mt-0.5 font-medium ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {currentVehicle.year} • {currentVehicle.engine} • Бензин • {currentVehicle.driveType || "4x4"}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {currentVehicle.licensePlate && (
              <LicensePlateBadge plate={currentVehicle.licensePlate} />
            )}
          </div>
        </div>

        {/* 4. CAR VISUAL */}
        <div
          className={`relative w-full h-52 rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 border ${
            isDark
              ? "bg-[radial-gradient(circle_at_50%_25%,#28374d_0%,#141d2b_43%,#0d131d_100%)] border-[#222f42]"
              : "bg-white border-[#E2E8F0] shadow-xs"
          }`}
        >
          {visualModel ? (
            <VehicleModelRenderer key={`${currentVehicle.id}-${currentVehicle.colorHex || "default"}`} vehicle={currentVehicle} className="vehicle-card-renderer" />
          ) : (
            <CarIcon className="absolute inset-0 m-auto w-20 h-20 text-slate-500" strokeWidth={1.2} />
          )}

          <div
            className={`absolute inset-0 bg-gradient-to-t ${
              isDark
                ? "from-[#0d131d] via-transparent to-transparent opacity-60"
                : "from-black/40 via-transparent to-transparent opacity-40"
            }`}
          />
          <button
            type="button"
            aria-label="Открыть профиль автомобиля"
            onClick={() => onNavigate("vehicle_profile")}
            className="absolute inset-0 z-0 rounded-2xl"
          />

        </div>

        {/* 5. THREE STAT BADGES (Пробег, Топливо, Состояние) */}
        <div className="grid grid-cols-3 gap-2">
          {/* Badge 1: Пробег */}
          <button
            type="button"
            aria-label="Изменить текущий пробег"
            onClick={() => {
              setNewMileageInput(String(currentVehicle.currentMileage));
              setShowQuickMileageModal(true);
            }}
            className={`p-3 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ${
              isDark
                ? "bg-[#17202e] border-[#243044] hover:border-[#2d3d57]"
                : "bg-white border-[#E2E8F0] shadow-xs hover:border-neutral-300"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-md bg-red-500/15 text-red-500 flex items-center justify-center">
                <Gauge className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[10px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Пробег
              </span>
            </div>
            <div className="text-sm font-black font-mono tracking-tight leading-none">
              {formatDistance(currentVehicle.currentMileage)}
            </div>
            <div className={`text-[9px] mt-1 truncate ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Обновлён 07.06.2026
            </div>
          </button>

          {/* Badge 2: Топливо */}
          <button
            type="button"
            aria-label="Открыть дневник заправок"
            onClick={() => onNavigate("fuel")}
            className={`p-3 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ${
              isDark
                ? "bg-[#17202e] border-[#243044] hover:border-[#2d3d57]"
                : "bg-white border-[#E2E8F0] shadow-xs hover:border-neutral-300"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-md bg-amber-500/15 text-amber-500 flex items-center justify-center">
                <Fuel className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[10px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Топливо
              </span>
            </div>
            <div className="text-sm font-black tracking-tight leading-none">
              Бензин
            </div>
            <div className={`text-[9px] mt-1 truncate ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              АИ-95
            </div>
          </button>

          {/* Badge 3: Состояние */}
          <button
            type="button"
            aria-label="Открыть список работ по автомобилю"
            onClick={() => onNavigate("repair")}
            className={`p-3 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ${
              isDark
                ? "bg-[#17202e] border-[#243044] hover:border-[#2d3d57]"
                : "bg-white border-[#E2E8F0] shadow-xs hover:border-neutral-300"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-md bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[10px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Состояние
              </span>
            </div>
            <div className="text-sm font-black tracking-tight text-emerald-500 leading-none flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>В норме</span>
            </div>
            <div className={`text-[9px] mt-1 truncate ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Нет срочных работ
            </div>
          </button>
        </div>

        </>}

        {/* 7. QUICK ACTIONS (Быстрые действия) */}
        {SHOW_QUICK_ACTIONS && (
        <div className="pt-1">
          <div className="text-sm font-extrabold tracking-tight mb-2.5">
            Быстрые действия
          </div>

          <div className="grid grid-cols-5 gap-2">
            {/* 1. Добавить ремонт */}
            <button
              onClick={() => {
                if (typeof onOpenAddService === "function") {
                  onOpenAddService();
                } else if (typeof onOpenQuickAction === "function") {
                  onOpenQuickAction("service");
                }
              }}
              className="flex flex-col items-center gap-1.5 text-center cursor-pointer group"
            >
              <div className="w-13 h-13 rounded-2xl bg-red-500/15 text-red-500 flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-all">
                <Wrench className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-semibold leading-tight ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Добавить ремонт
              </span>
            </button>

            {/* 2. Заправка */}
            <button
              onClick={() => onOpenQuickAction?.("fuel")}
              className="flex flex-col items-center gap-1.5 text-center cursor-pointer group"
            >
              <div className="w-13 h-13 rounded-2xl bg-blue-500/15 text-blue-500 flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-all">
                <Fuel className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-semibold leading-tight ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Заправка
              </span>
            </button>

            {/* 3. Добавить расход */}
            <button
              onClick={() => onOpenQuickAction?.("expense")}
              className="flex flex-col items-center gap-1.5 text-center cursor-pointer group"
            >
              <div className="w-13 h-13 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-all">
                <Wallet className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-semibold leading-tight ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Добавить расход
              </span>
            </button>

            {/* 4. Заметка */}
            <button
              onClick={() => onOpenQuickAction?.("problem")}
              className="flex flex-col items-center gap-1.5 text-center cursor-pointer group"
            >
              <div className="w-13 h-13 rounded-2xl bg-purple-500/15 text-purple-500 flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-all">
                <FileText className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-semibold leading-tight ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Заметка
              </span>
            </button>

            {/* 5. Ещё */}
            <button
              onClick={() => onOpenQuickAction?.()}
              className="flex flex-col items-center gap-1.5 text-center cursor-pointer group"
            >
              <div className={`w-13 h-13 rounded-2xl flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-all ${
                isDark ? "bg-[#1c2637] text-slate-300" : "bg-neutral-200 text-neutral-700"
              }`}>
                <MoreHorizontal className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-semibold leading-tight ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Ещё
              </span>
            </button>
          </div>
        </div>
        )}

        {/* 8. KEY INFORMATION (Ключевая информация) */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-extrabold tracking-tight">
              Ключевая информация
            </div>
            <button
              aria-label={isKeyInfoExpanded ? "Свернуть ключевую информацию" : "Развернуть ключевую информацию"}
              aria-expanded={isKeyInfoExpanded}
              onClick={() => setIsKeyInfoExpanded(!isKeyInfoExpanded)}
              className={`p-1 rounded-md transition cursor-pointer ${
                isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-neutral-200 text-slate-600"
              }`}
            >
              {isKeyInfoExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {isKeyInfoExpanded && (
            <div className="grid grid-cols-2 gap-2.5">
              {/* Card 1: Следующее ТО */}
              <div
                onClick={() => onNavigate?.("repair")}
                className={`p-3.5 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all active:scale-[0.99] ${
                  isDark
                    ? "bg-[#17202e] border-[#243044] hover:border-[#2d3d57]"
                    : "bg-white border-[#E2E8F0] shadow-xs"
                }`}
              >
                <div>
                  <div className={`text-[11px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Следующее ТО
                  </div>
                  <div className="text-base font-black tracking-tight mt-0.5">
                    Через 4 000 км
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-neutral-200"}`}>
                    <div className="w-1/2 h-full bg-red-500 rounded-full" />
                  </div>
                  <div className={`flex justify-between text-[9px] font-mono mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    <span>202 000 км</span>
                    <span>210 000 км</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Последняя заправка */}
              <div
                onClick={() => onNavigate?.("expenses")}
                className={`p-3.5 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all active:scale-[0.99] ${
                  isDark
                    ? "bg-[#17202e] border-[#243044] hover:border-[#2d3d57]"
                    : "bg-white border-[#E2E8F0] shadow-xs"
                }`}
              >
                <div>
                  <div className={`text-[11px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Последняя заправка
                  </div>
                  <div className="text-base font-black tracking-tight mt-0.5">
                    {lastVehicleFuel ? fmtDate(lastVehicleFuel.date) : "—"}
                  </div>
                </div>

                <div className="mt-2">
                  <div className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    {lastVehicleFuel
                      ? `${fmtLiters(lastVehicleFuel.liters)} л • ${lastVehicleFuel.station || "—"}`
                      : "Нет данных о заправках"}
                  </div>
                  <div className="text-[10px] text-blue-500 font-bold mt-0.5">
                    {lastVehicleFuel?.fuelType || ""}
                  </div>
                </div>
              </div>

              {/* Card 3: Последняя работа */}
              <div
                onClick={() => onNavigate?.("vehicle_profile")}
                className={`p-3.5 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all active:scale-[0.99] ${
                  isDark
                    ? "bg-[#17202e] border-[#243044] hover:border-[#2d3d57]"
                    : "bg-white border-[#E2E8F0] shadow-xs"
                }`}
              >
                <div>
                  <div className={`text-[11px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Последняя работа
                  </div>
                  <div className="text-base font-black tracking-tight mt-0.5">
                    {lastVehicleService ? fmtDate(lastVehicleService.date) : "—"}
                  </div>
                </div>

                <div className="mt-2">
                  <div className="text-xs font-bold text-red-500 truncate">
                    {lastVehicleService ? lastVehicleService.title : "Нет записей"}
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {lastVehicleService?.category || ""}
                  </div>
                </div>
              </div>

              {/* Card 4: Общие расходы */}
              <div
                onClick={() => onNavigate?.("expenses")}
                className={`p-3.5 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all active:scale-[0.99] ${
                  isDark
                    ? "bg-[#17202e] border-[#243044] hover:border-[#2d3d57]"
                    : "bg-white border-[#E2E8F0] shadow-xs"
                }`}
              >
                <div>
                  <div className={`text-[11px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Общие расходы
                  </div>
                  <div className="text-base font-black font-mono tracking-tight mt-0.5 text-emerald-500">
                    {fmtRub(totalExpenses)}
                  </div>
                </div>

                <div className="mt-2">
                  <div className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    За всё время
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {vehicleServices.length} работ • {vehicleFuel.length} заправок
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QUICK MILEAGE MODAL */}
      {showQuickMileageModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div
            className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl transition-all ${
              isDark ? "bg-[#17202e] border-[#243044] text-white" : "bg-white border-neutral-200 text-neutral-900"
            }`}
          >
            <div className="text-base font-black mb-1">Обновить одометр</div>
            <div className={`text-xs mb-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {currentVehicle.make} {currentVehicle.model} ({currentVehicle.licensePlate})
            </div>

            <div className="relative mb-4">
              <input
                type="number"
                value={newMileageInput}
                onChange={(e) => setNewMileageInput(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border text-xl font-bold font-mono focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  isDark ? "bg-[#0d131d] border-[#243044] text-white" : "bg-neutral-50 border-neutral-300 text-neutral-900"
                }`}
                placeholder="206000"
                autoFocus
              />
              <span className="absolute right-4 top-3.5 text-sm font-semibold text-neutral-400">
                км
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowQuickMileageModal(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isDark ? "bg-[#0d131d] hover:bg-slate-800 text-slate-300" : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                }`}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = parseInt(newMileageInput, 10);
                  if (!isNaN(val) && val > 0) {
                    onUpdateMileage?.(val);
                    setShowQuickMileageModal(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-red-600/30"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VEHICLE SWITCHER MODAL */}
      {showVehicleSwitcherModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div
            className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl transition-all ${
              isDark ? "bg-[#17202e] border-[#243044] text-white" : "bg-white border-neutral-200 text-neutral-900"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-black">Мой гараж</div>
              {onOpenAddVehicle && (
                <button
                  onClick={() => {
                    setShowVehicleSwitcherModal(false);
                    onOpenAddVehicle?.();
                  }}
                  className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Добавить авто</span>
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto mb-4">
              {(allVehicles || []).map((v) => {
                const isSelected = v.id === currentVehicle.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => {
                      onSelectVehicle?.(v);
                      setShowVehicleSwitcherModal(false);
                    }}
                    className={`p-3 rounded-2xl border flex items-center justify-between text-left transition cursor-pointer ${
                      isSelected
                        ? "border-red-500 bg-red-500/10"
                        : isDark
                        ? "border-[#243044] bg-[#0d131d] hover:border-slate-600"
                        : "border-neutral-200 bg-neutral-50 hover:border-neutral-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-100 shrink-0">
                        <VehicleModelRenderer vehicle={v} className="!aspect-square" />
                      </div>
                      <div>
                        <div className="text-sm font-bold leading-tight">
                          {v.make} {v.model}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          {v.year} • {formatDistance(v.currentMileage)}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-red-500 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowVehicleSwitcherModal(false)}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                isDark ? "bg-[#0d131d] hover:bg-slate-800 text-slate-300" : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
              }`}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
