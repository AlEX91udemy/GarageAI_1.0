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
  Check,
  ScanBarcode,
  Search,
  Package,
  ListTodo,
  Sparkles,
  Layers,
  ScanLine,
  Copy,
  AlertTriangle,
} from "lucide-react";
import {
  Vehicle,
  ServiceRecord,
  FuelRecord,
  OemScheduleItem,
  ToFixTask,
  GaragePart,
  CAR_PAINT_PRESETS,
} from "../../types";
import { LicensePlateBadge } from "../../components/LicensePlateBadge";
import { MobileScreenId, QuickActionType } from "../types";
import { ThemeMode } from "../theme";
import { VehicleModelRenderer, getVehicleModelSpec } from "../../components/VehicleModelRenderer";
import { paintPresetToAssetColor } from "../vehicleVisuals";

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
  onOpenSearch?: () => void;
  onMarkOemDone?: (item: OemScheduleItem) => void;
  themeMode?: ThemeMode;
  onToggleTheme?: () => void;
  onUpdateColor?: (colorHex: string) => void;
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
  onUpdateMileage,
  unreadNotificationsCount = 3,
  onOpenAddVehicle,
  onOpenReminders,
  onOpenScanReceipt,
  onOpenScanBarcode,
  onOpenAddService,
  onOpenSearch,
  onMarkOemDone,
  themeMode = "dark",
  onToggleTheme,
  onUpdateColor,
}) => {
  const isDark = themeMode === "dark";
  const [showQuickMileageModal, setShowQuickMileageModal] = useState(false);
  const [showVehicleSwitcherModal, setShowVehicleSwitcherModal] = useState(false);
  const [newMileageInput, setNewMileageInput] = useState(
    String(currentVehicle.currentMileage)
  );
  const [isKeyInfoExpanded, setIsKeyInfoExpanded] = useState(true);
  const [copiedVin, setCopiedVin] = useState(false);
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
  const vehicleParts = garageParts.filter(
    (p) => p.vehicleId === currentVehicle.id || p.vehicleId === "all"
  );
  const inStockParts = vehicleParts.filter((p) => p.status === "in_stock");
  const stockValue = inStockParts.reduce(
    (sum, p) => sum + p.purchasePrice * p.quantity,
    0
  );
  const pendingTasks = toFixTasks.filter(
    (t) => t.vehicleId === currentVehicle.id && t.status !== "completed"
  );

  // OEM Schedule & Health Score calculation
  const vehicleOem = oemSchedules.filter(
    (s) => s.vehicleId === currentVehicle.id || s.vehicleId === "all"
  );
  const oemStatusList = vehicleOem
    .map((item) => {
      const lastDone = item.lastDoneKm || 0;
      const kmDriven = Math.max(0, currentVehicle.currentMileage - lastDone);
      const kmRemaining = item.intervalKm - kmDriven;
      const wearRatio = Math.min(1.25, kmDriven / Math.max(1, item.intervalKm));
      const wearPct = Math.min(100, Math.round((kmDriven / Math.max(1, item.intervalKm)) * 100));
      const status: "overdue" | "soon" | "ok" =
        kmRemaining <= 0 ? "overdue" : kmRemaining <= 2000 ? "soon" : "ok";
      return { item, lastDone, kmDriven, kmRemaining, wearRatio, wearPct, status };
    })
    .sort((a, b) => a.kmRemaining - b.kmRemaining);

  const overdueOem = oemStatusList.filter((x) => x.status === "overdue");
  const soonOem = oemStatusList.filter((x) => x.status === "soon");
  const nearestOem = oemStatusList[0];

  const healthScore =
    oemStatusList.length > 0
      ? Math.max(
          15,
          Math.min(
            100,
            Math.round(
              100 -
                (oemStatusList.reduce((acc, x) => acc + Math.min(1, x.wearRatio), 0) /
                  oemStatusList.length) *
                  45 -
                overdueOem.length * 14 -
                soonOem.length * 5
            )
          )
        )
      : 96;

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

  // Cost per km & Avg Fuel Consumption
  const mileagePoints = [
    ...vehicleServices.map((r) => r.mileage),
    ...vehicleFuel.map((f) => f.mileage),
  ].filter((m) => Number.isFinite(m));
  const minMileage =
    mileagePoints.length > 0
      ? Math.min(...mileagePoints)
      : Math.max(0, currentVehicle.currentMileage - 30000);
  const trackedKm = Math.max(1, currentVehicle.currentMileage - minMileage);
  const costPerKm = totalExpenses > 0 ? (totalExpenses / trackedKm).toFixed(2) : "0.00";

  const validFuel = vehicleFuel.filter(
    (f) => f.calculatedConsumption && f.calculatedConsumption > 0
  );
  const avgConsumption =
    validFuel.length > 0
      ? (
          validFuel.reduce((s, f) => s + (f.calculatedConsumption || 0), 0) /
          validFuel.length
        ).toFixed(1)
      : "9.8";

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

  const handleCopyVin = () => {
    if (!currentVehicle.vin) return;
    navigator.clipboard?.writeText(currentVehicle.vin).catch(() => {});
    setCopiedVin(true);
    setTimeout(() => setCopiedVin(false), 1800);
  };

  const urgentNotificationItems = [
    ...overdueOem.map((o) => o.item.title),
    ...soonOem.map((o) => o.item.title),
    ...pendingTasks.map((t) => t.title),
  ];
  const activeRemindersCount = urgentNotificationItems.length || unreadNotificationsCount;

  return (
    <div
      className={`flex flex-col w-full pb-14 select-none min-h-screen transition-colors duration-200 ${
        isDark ? "bg-[#0d131d] text-white" : "bg-[#F4F5F8] text-[#0F172A]"
      }`}
    >
      {/* 1. TOP HEADER */}
      <header
        className={`sticky top-0 z-30 flex items-center justify-between gap-2 px-4 py-2.5 backdrop-blur-md border-b transition-colors duration-200 ${
          isDark
            ? "bg-[#0d131d]/90 border-[#1f2c3f]"
            : "bg-white/90 border-[#E2E8F0]"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center font-black text-xs text-white shadow-sm shadow-red-600/30 shrink-0">
            GH
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black tracking-tight leading-tight whitespace-nowrap truncate">
              Garage<span className="text-red-500">Hub</span>
            </h1>
            <span
              className={`block text-[10px] font-medium leading-tight truncate ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Цифровой кокпит авто
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Global Search Button */}
          {onOpenSearch && (
            <button
              id="home-btn-search"
              onClick={onOpenSearch}
              className={`w-9 h-9 rounded-xl border inline-flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 ${
                isDark
                  ? "bg-[#17202e] border-[#243044] text-slate-300 hover:text-white"
                  : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-xs"
              }`}
              title="Глобальный поиск по гаражу"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

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
            className={`w-9 h-9 rounded-xl border inline-flex items-center justify-center transition-all cursor-pointer relative active:scale-95 shrink-0 ${
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
            className={`w-9 h-9 rounded-xl border inline-flex items-center justify-center transition-all cursor-pointer relative active:scale-95 shrink-0 ${
              isDark
                ? "bg-[#17202e] border-[#243044] text-slate-300 hover:text-white"
                : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-xs"
            }`}
            title="Уведомления"
          >
            <Bell className="w-4 h-4" />
            {activeRemindersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-[10px] font-bold font-mono text-white flex items-center justify-center shadow-xs">
                {activeRemindersCount}
              </span>
            )}
          </button>

          {/* Theme Switcher Toggle (Dark / Light) */}
          <button
            id="home-btn-theme-toggle"
            onClick={onToggleTheme}
            className={`w-9 h-9 rounded-xl border inline-flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 ${
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
            className={`w-9 h-9 rounded-xl border inline-flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 ${
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
        className={`flex items-center justify-between px-4 py-1.5 border-b transition-colors duration-200 ${
          isDark
            ? "bg-[#101724] border-[#1b2535] text-slate-400"
            : "bg-[#FAFAFC] border-[#E8ECF2] text-slate-600"
        }`}
      >
        <button
          onClick={handlePrevVehicle}
          className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:text-red-500 transition cursor-pointer active:scale-90 shrink-0"
          title="Предыдущий автомобиль"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowVehicleSwitcherModal(true)}
          className="text-xs font-semibold hover:text-red-500 transition cursor-pointer inline-flex items-center justify-center gap-1.5 py-1 whitespace-nowrap"
        >
          <span>Мои автомобили</span>
          <span className="font-mono text-[10px] opacity-75">
            ({Math.max(1, currentVehicleIndex + 1)}/{Math.max(1, (allVehicles || []).length)})
          </span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        </button>

        <button
          onClick={handleNextVehicle}
          className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:text-red-500 transition cursor-pointer active:scale-90 shrink-0"
          title="Следующий автомобиль"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 pt-3 flex flex-col gap-3">
        {/* 3. VEHICLE HEADER INFO & PLATE */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-xl font-black tracking-tight leading-tight truncate">
              {currentVehicle.make} {currentVehicle.model}
            </h2>
            <div
              className={`text-xs mt-0.5 font-medium flex flex-wrap items-center gap-1.5 ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              <span className="font-mono">{currentVehicle.year}</span>
              <span>·</span>
              <span>{currentVehicle.engine}</span>
              <span>·</span>
              <span>{currentVehicle.transmission}</span>
              {currentVehicle.driveType && (
                <>
                  <span>·</span>
                  <span>{currentVehicle.driveType}</span>
                </>
              )}
            </div>
            {currentVehicle.vin && (
              <button
                type="button"
                onClick={handleCopyVin}
                className={`mt-1 inline-flex items-center gap-1 text-[11px] font-mono transition cursor-pointer ${
                  copiedVin
                    ? "text-emerald-500 font-bold"
                    : isDark
                    ? "text-slate-500 hover:text-slate-300"
                    : "text-slate-400 hover:text-slate-700"
                }`}
                title="Скопировать VIN"
              >
                <span>VIN: {currentVehicle.vin}</span>
                {copiedVin ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3 opacity-70" />
                )}
              </button>
            )}
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {currentVehicle.licensePlate && (
              <LicensePlateBadge plate={currentVehicle.licensePlate} />
            )}
            <button
              onClick={() => {
                setNewMileageInput(String(currentVehicle.currentMileage));
                setShowQuickMileageModal(true);
              }}
              className="text-[11px] font-bold text-red-500 hover:text-red-400 transition cursor-pointer"
            >
              Изменить пробег
            </button>
          </div>
        </div>

        {/* 4. CAR VISUAL */}
        <div
          className={`relative w-full h-48 rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 border ${
            isDark
              ? "bg-[radial-gradient(circle_at_50%_25%,#28374d_0%,#141d2b_43%,#0d131d_100%)] border-[#222f42]"
              : "bg-white border-[#E2E8F0] shadow-xs"
          }`}
        >
          {visualModel ? (
            <VehicleModelRenderer
              key={`${currentVehicle.id}-${currentVehicle.colorHex || "default"}`}
              vehicle={currentVehicle}
              className="vehicle-card-renderer"
            />
          ) : (
            <CarIcon className="absolute inset-0 m-auto w-20 h-20 text-slate-500" strokeWidth={1.2} />
          )}

          <div
            className={`absolute inset-0 bg-gradient-to-t ${
              isDark
                ? "from-[#0d131d] via-transparent to-transparent opacity-60"
                : "from-black/35 via-transparent to-transparent opacity-35"
            }`}
          />
          <button
            type="button"
            aria-label="Открыть профиль автомобиля"
            onClick={() => onNavigate("vehicle_profile")}
            className="absolute inset-0 z-0 rounded-2xl"
          />
          {onUpdateColor && (
            <div
              className="absolute bottom-2.5 left-3 z-10 flex items-center gap-1 px-2 py-1 rounded-xl bg-black/55 backdrop-blur-md border border-white/10"
              role="group"
              aria-label="Быстрый выбор цвета кузова"
            >
              {CAR_PAINT_PRESETS.map((preset) => {
                const isSelected =
                  paintPresetToAssetColor(currentVehicle.colorHex) ===
                  paintPresetToAssetColor(preset.hex);
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateColor(preset.hex);
                    }}
                    title={preset.name}
                    aria-label={`Цвет кузова: ${preset.name}`}
                    aria-pressed={isSelected}
                    className={`!w-4 !h-4 !min-w-0 !min-h-0 !p-0 rounded-full border transition cursor-pointer shrink-0 ${
                      isSelected
                        ? "border-white ring-2 ring-red-500 scale-110"
                        : "border-white/30 opacity-80 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: preset.hex }}
                  />
                );
              })}
            </div>
          )}
          <div className="absolute bottom-2.5 right-3 z-10 pointer-events-none flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-black/55 text-white backdrop-blur-md border border-white/10">
            <span>Профиль и кузов</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
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
            className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer active:scale-[0.98] min-w-0 ${
              isDark
                ? "bg-[#17202e] border-[#243044] hover:border-[#2d3d57]"
                : "bg-white border-[#E2E8F0] shadow-xs hover:border-neutral-300"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-5 h-5 rounded-md bg-red-500/15 text-red-500 flex items-center justify-center shrink-0">
                <Gauge className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[10px] font-medium truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Пробег
              </span>
            </div>
            <div className="text-[13px] font-black font-mono tracking-tight leading-none whitespace-nowrap truncate">
              {currentVehicle.currentMileage.toLocaleString("ru-RU")} км
            </div>
            <div className={`text-[9px] font-mono mt-1 truncate ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Обн. {formatDateRu(currentVehicle.lastMileageUpdate)}
            </div>
          </button>

          {/* Badge 2: Топливо */}
          <button
            type="button"
            aria-label="Добавить запись о заправке"
            onClick={() => onOpenQuickAction("fuel")}
            className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer active:scale-[0.98] min-w-0 ${
              isDark
                ? "bg-[#17202e] border-[#243044] hover:border-[#2d3d57]"
                : "bg-white border-[#E2E8F0] shadow-xs hover:border-neutral-300"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-5 h-5 rounded-md bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                <Fuel className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[10px] font-medium truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Расход
              </span>
            </div>
            <div className="text-[13px] font-black font-mono tracking-tight leading-none whitespace-nowrap truncate">
              {avgConsumption} л/100
            </div>
            <div className={`text-[9px] font-mono mt-1 truncate ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              {costPerKm} ₽/км · АИ-95
            </div>
          </button>

          {/* Badge 3: Состояние / Индекс ресурса */}
          <button
            type="button"
            aria-label="Открыть список работ по автомобилю"
            onClick={() => onNavigate("repair")}
            className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer active:scale-[0.98] min-w-0 ${
              isDark
                ? "bg-[#17202e] border-[#243044] hover:border-[#2d3d57]"
                : "bg-white border-[#E2E8F0] shadow-xs hover:border-neutral-300"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                  overdueOem.length > 0
                    ? "bg-amber-500/15 text-amber-500"
                    : "bg-emerald-500/15 text-emerald-500"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[10px] font-medium truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Ресурс
              </span>
            </div>
            <div
              className={`text-[13px] font-black font-mono tracking-tight leading-none flex items-center gap-1 whitespace-nowrap truncate ${
                overdueOem.length > 0 ? "text-amber-500" : "text-emerald-500"
              }`}
            >
              <span>{healthScore}%</span>
              <span className="text-[10px] font-sans font-bold">
                {overdueOem.length > 0 ? "ТО" : "Норма"}
              </span>
            </div>
            <div className={`text-[9px] mt-1 truncate ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              {overdueOem.length > 0
                ? `${overdueOem.length} требуют замены`
                : soonOem.length > 0
                ? `${soonOem.length} скоро по плану`
                : "Все узлы в норме"}
            </div>
          </button>
        </div>

        {/* 6. REMINDERS & MAINTENANCE FORECAST CARD */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isDark
              ? "bg-[#17202e] border-[#243044]"
              : "bg-white border-[#E2E8F0] shadow-xs"
          }`}
        >
          <button
            type="button"
            aria-label="Открыть напоминания по автомобилю"
            onClick={() => {
              if (typeof onOpenReminders === "function") {
                onOpenReminders();
              } else if (typeof onNavigate === "function") {
                onNavigate("notifications");
              }
            }}
            className="w-full flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0 shadow-sm ${
                  overdueOem.length > 0
                    ? "bg-red-600 shadow-red-600/30"
                    : "bg-amber-500 shadow-amber-500/20"
                }`}
              >
                {overdueOem.length > 0 ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black tracking-tight leading-tight">
                  {urgentNotificationItems.length > 0
                    ? `${urgentNotificationItems.length} ${
                        urgentNotificationItems.length === 1
                          ? "плановая задача"
                          : urgentNotificationItems.length < 5
                          ? "плановые задачи"
                          : "плановых задач"
                      }`
                    : "Все регламенты соблюдены"}
                </div>
                <div className={`text-xs mt-0.5 truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {urgentNotificationItems.length > 0
                    ? `Приоритет: ${urgentNotificationItems.slice(0, 2).join(", ")}`
                    : "Следующая проверка по расписанию ОЕМ"}
                </div>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-red-500 shrink-0" />
          </button>

          {/* Quick 1-tap OEM completion if there is an overdue item */}
          {overdueOem.length > 0 && onMarkOemDone && (
            <div
              className={`mt-2.5 pt-2.5 border-t flex items-center justify-between gap-2 ${
                isDark ? "border-[#243044]" : "border-neutral-100"
              }`}
            >
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-rose-500 font-bold block">
                  Просрочено на {Math.abs(overdueOem[0].kmRemaining).toLocaleString("ru-RU")} км
                </span>
                <span className="text-xs font-bold truncate block">
                  {overdueOem[0].item.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onMarkOemDone(overdueOem[0].item)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Выполнено</span>
              </button>
            </div>
          )}
        </div>

        {/* 7. QUICK ACTIONS (Быстрые действия) */}
        <div className="pt-0.5">
          <div className="text-sm font-extrabold tracking-tight mb-2">
            Быстрые действия
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {/* 1. Добавить ремонт */}
            <button
              onClick={() => {
                if (typeof onOpenAddService === "function") {
                  onOpenAddService();
                } else if (typeof onOpenQuickAction === "function") {
                  onOpenQuickAction("service");
                }
              }}
              className="flex flex-col items-center justify-start gap-1.5 text-center cursor-pointer group min-w-0"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-500 flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-all shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-semibold leading-tight whitespace-nowrap truncate w-full ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Запись ТО
              </span>
            </button>

            {/* 2. Заправка */}
            <button
              onClick={() => onOpenQuickAction?.("fuel")}
              className="flex flex-col items-center justify-start gap-1.5 text-center cursor-pointer group min-w-0"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-500 flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-all shrink-0">
                <Fuel className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-semibold leading-tight whitespace-nowrap truncate w-full ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Заправка
              </span>
            </button>

            {/* 3. Чек OCR */}
            <button
              onClick={() => {
                if (typeof onOpenScanReceipt === "function") {
                  onOpenScanReceipt();
                } else {
                  onOpenQuickAction?.("scan_receipt");
                }
              }}
              className="flex flex-col items-center justify-start gap-1.5 text-center cursor-pointer group min-w-0"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-all shrink-0">
                <ScanLine className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-semibold leading-tight whitespace-nowrap truncate w-full ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Скан чека
              </span>
            </button>

            {/* 4. Деталь на склад */}
            <button
              onClick={() => onOpenQuickAction?.("part")}
              className="flex flex-col items-center justify-start gap-1.5 text-center cursor-pointer group min-w-0"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-all shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-semibold leading-tight whitespace-nowrap truncate w-full ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Запчасть
              </span>
            </button>

            {/* 5. Ещё */}
            <button
              onClick={() => onOpenQuickAction?.()}
              className="flex flex-col items-center justify-start gap-1.5 text-center cursor-pointer group min-w-0"
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-all shrink-0 ${
                  isDark ? "bg-[#1c2637] text-slate-300" : "bg-neutral-200 text-neutral-700"
                }`}
              >
                <MoreHorizontal className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-semibold leading-tight whitespace-nowrap truncate w-full ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Ещё
              </span>
            </button>
          </div>
        </div>

        {/* 8. ГАРАЖ И ИНСТРУМЕНТЫ (4-Card Mobile Bento Hub) */}
        <div className="pt-0.5">
          <div className="text-sm font-extrabold tracking-tight mb-2">
            Разделы гаража
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Склад запчастей */}
            <button
              type="button"
              onClick={() => onNavigate("garage")}
              className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition cursor-pointer active:scale-[0.98] ${
                isDark
                  ? "bg-[#17202e] border-[#243044] hover:border-[#2d3d57]"
                  : "bg-white border-[#E2E8F0] shadow-xs"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold tracking-tight truncate">
                  Склад деталей
                </div>
                <div className={`text-[10px] font-mono mt-0.5 truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {inStockParts.length} шт. · {stockValue.toLocaleString("ru-RU")} ₽
                </div>
              </div>
            </button>

            {/* Список To-Fix */}
            <button
              type="button"
              onClick={() => onNavigate("to_fix")}
              className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition cursor-pointer active:scale-[0.98] ${
                isDark
                  ? "bg-[#17202e] border-[#243044] hover:border-[#2d3d57]"
                  : "bg-white border-[#E2E8F0] shadow-xs"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                <ListTodo className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold tracking-tight truncate">
                  План ремонта
                </div>
                <div className={`text-[10px] font-mono mt-0.5 truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {pendingTasks.length} {pendingTasks.length === 1 ? "задача" : "задач"} To-Fix
                </div>
              </div>
            </button>

            {/* AI Диагностика */}
            <button
              type="button"
              onClick={() => onNavigate("ai_diagnostics")}
              className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition cursor-pointer active:scale-[0.98] ${
                isDark
                  ? "bg-[#17202e] border-[#243044] hover:border-[#2d3d57]"
                  : "bg-white border-[#E2E8F0] shadow-xs"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold tracking-tight truncate">
                  AI-Диагностика
                </div>
                <div className={`text-[10px] mt-0.5 truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Разбор симптомов
                </div>
              </div>
            </button>

            {/* Тюнинг-проекты */}
            <button
              type="button"
              onClick={() => onNavigate("projects")}
              className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition cursor-pointer active:scale-[0.98] ${
                isDark
                  ? "bg-[#17202e] border-[#243044] hover:border-[#2d3d57]"
                  : "bg-white border-[#E2E8F0] shadow-xs"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold tracking-tight truncate">
                  Тюнинг и До/После
                </div>
                <div className={`text-[10px] mt-0.5 truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Этапы доработок
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 9. KEY INFORMATION (Ключевая информация — полностью динамическая) */}
        <div className="pt-0.5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-extrabold tracking-tight">
              Ключевая информация
            </div>
            <button
              aria-label={isKeyInfoExpanded ? "Свернуть ключевую информацию" : "Развернуть ключевую информацию"}
              aria-expanded={isKeyInfoExpanded}
              onClick={() => setIsKeyInfoExpanded(!isKeyInfoExpanded)}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
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
                  <div className="text-base font-black font-mono tracking-tight mt-0.5">
                    {nearestOem
                      ? nearestOem.kmRemaining <= 0
                        ? "Срочно ТО"
                        : `Через ${nearestOem.kmRemaining.toLocaleString("ru-RU")} км`
                      : "По графику"}
                  </div>
                  {nearestOem && (
                    <div className={`text-[10px] truncate mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {nearestOem.item.title}
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-2.5">
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-neutral-200"}`}>
                    <div
                      className={`h-full rounded-full ${
                        nearestOem && nearestOem.kmRemaining <= 0
                          ? "bg-rose-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${nearestOem ? nearestOem.wearPct : 45}%` }}
                    />
                  </div>
                  <div className={`flex justify-between text-[9px] font-mono mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    <span>{currentVehicle.currentMileage.toLocaleString("ru-RU")} км</span>
                    <span>
                      {(nearestOem
                        ? (nearestOem.item.lastDoneKm || 0) + nearestOem.item.intervalKm
                        : currentVehicle.currentMileage + 5000
                      ).toLocaleString("ru-RU")}{" "}
                      км
                    </span>
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
                  <div className="text-base font-black font-mono tracking-tight mt-0.5">
                    {latestFuel ? formatDateRu(latestFuel.date) : "Нет записей"}
                  </div>
                </div>

                <div className="mt-2">
                  <div className={`text-xs font-semibold font-mono ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    {latestFuel
                      ? `${latestFuel.liters} л · ${latestFuel.totalCost.toLocaleString("ru-RU")} ₽`
                      : "Добавьте заправку"}
                  </div>
                  <div className="text-[10px] text-blue-500 font-bold mt-0.5 truncate">
                    {latestFuel ? `${latestFuel.station || "АЗС"} · ${latestFuel.fuelType}` : "Дневник топлива"}
                  </div>
                </div>
              </div>

              {/* Card 3: Последняя работа */}
              <div
                onClick={() => onNavigate?.("service")}
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
                  <div className="text-base font-black font-mono tracking-tight mt-0.5">
                    {latestService ? formatDateRu(latestService.date) : "Нет записей"}
                  </div>
                </div>

                <div className="mt-2">
                  <div className="text-xs font-bold text-red-500 truncate">
                    {latestService ? latestService.title : "Плановое ТО"}
                  </div>
                  <div className={`text-[10px] font-mono mt-0.5 truncate ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {latestService
                      ? `${latestService.totalCost.toLocaleString("ru-RU")} ₽ · ${latestService.category}`
                      : "Журнал обслуживания"}
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
                    {totalExpenses.toLocaleString("ru-RU")} ₽
                  </div>
                </div>

                <div className="mt-2">
                  <div className={`text-xs font-medium font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {costPerKm} ₽/км пробега
                  </div>
                  <div className={`text-[10px] font-mono mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {vehicleServices.length} работ · {vehicleFuel.length} заправок
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
                        <div className={`text-[10px] font-mono mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          {v.year} · {v.currentMileage.toLocaleString("ru-RU")} км
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
