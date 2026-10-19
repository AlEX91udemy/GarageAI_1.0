import React, { useState } from "react";
import {
  Car,
  Bell,
  Gauge,
  ChevronRight,
  Plus,
  RefreshCw,
  Fuel,
  Wrench,
  CheckCircle,
  AlertTriangle,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Info,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Vehicle, ToFixTask, OemScheduleItem } from "../types";
import { VehicleStage } from "./VehicleStage";
import { DialogFrame } from "./DialogFrame";
import { LicensePlateBadge } from "./LicensePlateBadge";
interface CarHeaderProps {
  vehicle: Vehicle;
  allVehicles: Vehicle[];
  onSelectVehicle: (v: Vehicle) => void;
  onUpdateMileage: (newMileage: number) => void;
  onOpenVehicleModal: () => void;
  onOpenAddVehicle?: () => void;
  onOpenReminders: () => void;
  onUpdateColor?: (newColor: string) => void;
  onUpdateModel3dUrl?: (newUrl: string) => void;
  toFixTasks: ToFixTask[];
  oemSchedules: OemScheduleItem[];
  totalRecordsCount: number;
  compact?: boolean;
  theme?: "light" | "dark";
}

export const CarHeader: React.FC<CarHeaderProps> = ({
  vehicle,
  allVehicles,
  onSelectVehicle,
  onUpdateMileage,
  onOpenVehicleModal,
  onOpenAddVehicle,
  onOpenReminders,
  onUpdateColor,
  onUpdateModel3dUrl,
  toFixTasks,
  oemSchedules,
  totalRecordsCount,
  compact = false,
  theme = "dark",
}) => {
  const [showMileageModal, setShowMileageModal] = useState(false);
  const [tempMileage, setTempMileage] = useState(vehicle.currentMileage);
  const [isSwitchingCar, setIsSwitchingCar] = useState(false);
  const [copiedVin, setCopiedVin] = useState(false);

  React.useEffect(() => {
    setTempMileage(vehicle.currentMileage);
  }, [vehicle.id, vehicle.currentMileage]);
  // Calculate overdue or urgent items
  const highPriorityTasks = toFixTasks.filter(
    (t) => t.vehicleId === vehicle.id && t.status !== "completed" && t.priority === "high"
  );

  const overdueOem = oemSchedules.filter((item) => {
    if (item.vehicleId !== vehicle.id) return false;
    const lastKm = item.lastDoneKm ?? 0;
    return vehicle.currentMileage - lastKm >= item.intervalKm;
  });

  const urgentCount = highPriorityTasks.length + overdueOem.length;
  const topAlertTitle =
    highPriorityTasks.length > 0
      ? highPriorityTasks[0].title
      : overdueOem.length > 0
      ? `Подошёл срок: ${overdueOem[0].title}`
      : "Все ключевые узлы проверены";

  const handleSaveMileage = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempMileage >= 0) {
      onUpdateMileage?.(Number(tempMileage));
      setShowMileageModal(false);
    }
  };

  const handleCopyVin = async () => {
    if (!vehicle.vin) return;
    try {
      if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(vehicle.vin);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = vehicle.vin;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedVin(true);
      setTimeout(() => setCopiedVin(false), 2000);
    } catch (err) {
      console.warn("Clipboard writeText unavailable, fallback used:", err);
      setCopiedVin(true);
      setTimeout(() => setCopiedVin(false), 2000);
    }
  };

  // Human-readable body type in Russian
  const getBodyTypeLabel = (type?: string) => {
    switch (type) {
      case "suv":
        return "Кроссовер / Внедорожник";
      case "sedan":
        return "Седан";
      case "hatchback":
        return "Хэтчбек";
      case "coupe":
        return "Купе";
      default:
        return vehicle.model.toLowerCase().includes("trail") || vehicle.model.toLowerCase().includes("cross")
          ? "Кроссовер / SUV"
          : "Седан";
    }
  };

  // Compact 2-line header for all pages except the dashboard
  const isLight = theme === "light";

  if (compact) {
    return (
      <header
        className={`w-full relative overflow-visible py-2 px-3.5 sm:px-4 rounded-2xl shadow-md border transition-colors ${
          isLight
            ? "light-car-header bg-white text-slate-900 border-slate-200"
            : "bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-white border-neutral-800"
        }`}
      >
        {/* Line 1: Гараж: Nissan X-Trail ... VIN: JN1TBNT31U0048123 */}
        <div className="flex items-center justify-between gap-2 text-xs leading-tight">
          <div className="relative flex items-center min-w-0">
            <button
              aria-expanded={isSwitchingCar} onClick={() => setIsSwitchingCar(!isSwitchingCar)}
              className={`flex items-center gap-1.5 text-xs transition cursor-pointer group ${
                isLight ? "hover:text-red-600" : "hover:text-white"
              }`}
              title="Переключить автомобиль или открыть гараж"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_6px_rgba(239,68,68,0.8)]"
                style={{ backgroundColor: "#dc2626" }}
              />
              <span className={isLight ? "text-slate-500 font-medium" : "text-neutral-400 font-medium"}>
                Гараж:
              </span>
              <span className={`font-bold truncate ${isLight ? "text-slate-900 group-hover:underline" : "text-white group-hover:underline"}`}>
                {vehicle.make} {vehicle.model}
              </span>
              <ChevronRight
                className={`w-3 h-3 transition-transform duration-200 ${
                  isLight ? "text-slate-500" : "text-neutral-400"
                } ${isSwitchingCar ? "rotate-90" : ""}`}
              />
            </button>

            {/* Dropdown if clicked */}
            {isSwitchingCar && (
              <div
                className={`absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-xl p-2 shadow-2xl z-50 backdrop-blur-md border ${
                  isLight
                    ? "bg-white/98 border-slate-200 text-slate-900 shadow-slate-300/50"
                    : "bg-neutral-900/98 border-neutral-700 text-white"
                }`}
              >
                <div className={`flex items-center justify-between px-2.5 py-1 mb-1 border-b ${
                  isLight ? "border-slate-100" : "border-neutral-800"
                }`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${
                    isLight ? "text-slate-500" : "text-neutral-400"
                  }`}>
                    Автопарк гаража ({allVehicles.length})
                  </span>
                  <button
                    onClick={() => {
                      setIsSwitchingCar(false);
                      onOpenVehicleModal?.();
                    }}
                    className="text-[10px] text-red-500 hover:text-red-600 font-semibold cursor-pointer"
                  >
                    Управление
                  </button>
                </div>

                <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
                  {allVehicles.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        onSelectVehicle?.(v);
                        setIsSwitchingCar(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition cursor-pointer ${
                        v.id === vehicle.id
                          ? "bg-red-600/20 text-red-600 border border-red-500/40 font-bold"
                          : isLight
                          ? "hover:bg-slate-100 text-slate-700 border border-transparent"
                          : "hover:bg-neutral-800 text-neutral-300 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: "#dc2626" }}
                        />
                        <span className={`font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                          {v.make} {v.model} {v.generation && `(${v.generation})`}
                        </span>
                      </div>
                      <span className={`text-[11px] font-mono ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                        {v.licensePlate || `${v.year} г.`}
                      </span>
                    </button>
                  ))}
                </div>

                <div className={`pt-1.5 mt-1 border-t flex items-center justify-between ${
                  isLight ? "border-slate-100" : "border-neutral-800"
                }`}>
                  <button
                    onClick={() => {
                      setIsSwitchingCar(false);
                      onOpenAddVehicle?.();
                    }}
                    className="w-full py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Добавить авто в гараж</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: VIN */}
          {vehicle.vin ? (
            <button
              onClick={handleCopyVin}
              className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md border transition cursor-pointer shrink-0 ${
                isLight
                  ? "text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200"
                  : "text-neutral-300 hover:text-white bg-neutral-900/90 hover:bg-neutral-800 border-neutral-800"
              }`}
              title="Нажмите для копирования VIN"
            >
              <span className={isLight ? "text-slate-400 font-medium" : "text-neutral-500 font-medium"}>
                VIN:
              </span>
              <span className={`font-semibold ${isLight ? "text-slate-800" : "text-neutral-200"}`}>
                {vehicle.vin}
              </span>
              {copiedVin ? (
                <Check className="w-3 h-3 text-emerald-500 ml-0.5" />
              ) : (
                <Copy className={`w-3 h-3 ml-0.5 ${isLight ? "text-slate-400" : "text-neutral-400"}`} />
              )}
            </button>
          ) : (
            <span className={`text-[10px] font-mono ${isLight ? "text-slate-400" : "text-neutral-500"}`}>
              VIN не указан
            </span>
          )}
        </div>

        {/* Line 2: Nissan X-Trail T31 ... Кроссовер / Внедорожник */}
        <div className={`flex items-center justify-between gap-2 mt-1 pt-1 border-t text-xs leading-tight ${
          isLight ? "border-slate-100" : "border-neutral-800/60"
        }`}>
          {/* Left: Nissan X-Trail T31 */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`font-extrabold text-sm tracking-tight truncate ${
              isLight ? "text-slate-900" : "text-white"
            }`}>
              {vehicle.make} {vehicle.model}
              {vehicle.generation ? ` ${vehicle.generation}` : ""}
            </span>
            {vehicle.licensePlate && (
              <span className="hidden sm:inline-block">
                <LicensePlateBadge plate={vehicle.licensePlate} size="sm" />
              </span>
            )}
          </div>

          {/* Right: Body type label */}
          <div className={`flex items-center gap-1.5 shrink-0 text-[11px] font-medium ${
            isLight ? "text-slate-500" : "text-neutral-400"
          }`}>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
            <span>{getBodyTypeLabel(vehicle.bodyType)}</span>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className={`vehicle-hero w-full relative pt-3.5 pb-4 px-4 sm:px-5 rounded-3xl shadow-xl border transition-colors ${
        isLight
          ? "light-car-header bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900 border-slate-200"
          : "bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-white border-neutral-800/80"
      }`}
    >
      {/* Top Bar: Multi-Car Switcher & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        {/* Car selector pill */}
        <div className="relative">
          <button
            aria-expanded={isSwitchingCar} onClick={() => setIsSwitchingCar(!isSwitchingCar)}
            className={`flex items-center gap-2 text-xs sm:text-sm font-medium px-3 py-1 rounded-full border transition cursor-pointer backdrop-blur-sm shadow-sm ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300"
                : "bg-neutral-800/90 hover:bg-neutral-700/90 text-neutral-300 border-neutral-700/70"
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"
              style={{ backgroundColor: "#dc2626" }}
            />
            <span className={isLight ? "text-slate-500 font-medium" : "text-neutral-300 font-medium"}>
              Гараж:
            </span>
            <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
              {vehicle.make} {vehicle.model}
            </span>
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isLight ? "text-slate-500" : "text-neutral-400"
              } ${isSwitchingCar ? "rotate-90" : ""}`}
            />
          </button>

          {/* Car switcher dropdown */}
          {isSwitchingCar && (
            <div
              className={`absolute left-0 top-full mt-2 w-80 border rounded-2xl p-2.5 shadow-2xl z-50 backdrop-blur-md ${
                isLight
                  ? "bg-white/98 border-slate-200 text-slate-900 shadow-slate-300/50"
                  : "bg-neutral-900/95 border-neutral-700 text-white"
              }`}
            >
              <div className={`flex items-center justify-between px-3 py-1 mb-1.5 border-b ${
                isLight ? "border-slate-100" : "border-neutral-800"
              }`}>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                  isLight ? "text-slate-500" : "text-neutral-400"
                }`}>
                  Автопарк гаража ({allVehicles.length})
                </span>
                <span className={`text-[10px] font-mono ${isLight ? "text-slate-400" : "text-neutral-500"}`}>
                  Смена авто
                </span>
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {allVehicles.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      onSelectVehicle?.(v);
                      setIsSwitchingCar(false);
                      setTempMileage(v.currentMileage);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition cursor-pointer ${
                      v.id === vehicle.id
                        ? "bg-red-600/20 text-red-600 border border-red-500/50 shadow-inner font-bold"
                        : isLight
                        ? "hover:bg-slate-100 text-slate-700 border border-transparent"
                        : "hover:bg-neutral-800/80 text-neutral-300 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-white/40 shadow-sm"
                        style={{ backgroundColor: "#dc2626" }}
                      />
                      <div>
                        <div className={`font-bold flex items-center gap-1.5 ${
                          isLight ? "text-slate-900" : "text-white"
                        }`}>
                          <span>
                            {v.make} {v.model}
                          </span>
                          {v.generation && (
                            <span className={`text-[10px] font-normal ${
                              isLight ? "text-slate-400" : "text-neutral-400"
                            }`}>
                              ({v.generation})
                            </span>
                          )}
                        </div>
                        <div className={`text-[11px] flex items-center gap-2 mt-0.5 ${
                          isLight ? "text-slate-500" : "text-neutral-400"
                        }`}>
                          <span>{v.year} г.</span>
                          <span>•</span>
                          <span className="font-mono">{v.currentMileage.toLocaleString("ru-RU")} км</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {v.licensePlate ? (
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                          isLight ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-neutral-800 text-neutral-300 border-neutral-700"
                        }`}>
                          {v.licensePlate}
                        </span>
                      ) : (
                        <span className={`text-[10px] ${isLight ? "text-slate-400" : "text-neutral-500"}`}>Без номера</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className={`pt-2 mt-2 border-t flex items-center gap-2 ${
                isLight ? "border-slate-100" : "border-neutral-800"
              }`}>
                <button
                  onClick={() => {
                    setIsSwitchingCar(false);
                    if (onOpenAddVehicle) {
                      onOpenAddVehicle();
                    } else {
                      onOpenVehicleModal?.();
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition cursor-pointer shadow-md shadow-red-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Добавить автомобиль
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Top Badges & Controls */}
        <div className="flex items-center gap-2">
          {/* Quick "+ Авто" button */}
          <button
            onClick={() => {
              if (onOpenAddVehicle) {
                onOpenAddVehicle();
              } else {
                onOpenVehicleModal?.();
              }
            }}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition cursor-pointer active:scale-95 ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-300"
                : "bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-200 hover:text-white border-neutral-700/70"
            }`}
            title="Добавить новый автомобиль в гараж"
          >
            <Plus className="w-3.5 h-3.5 text-red-500" />
            <span>Авто</span>
          </button>

          {/* Vehicle Settings modal */}
          <button
            onClick={() => onOpenVehicleModal?.()}
            title="Параметры автомобиля"
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition cursor-pointer ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-300"
                : "bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-300 hover:text-white border-neutral-700/70"
            }`}
          >
            <Wrench className={`w-3.5 h-3.5 ${isLight ? "text-slate-500" : "text-neutral-400"}`} />
            <span className="hidden sm:inline">Параметры</span>
          </button>
        </div>
      </div>

      {/* Main Vehicle Hero: Two-Column Layout (Data on Left, 3D on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-center">
        {/* Left Column: Passport, Specs, Odometer */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-2">
          {/* Category, Plate, VIN */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-xs font-medium tracking-wide uppercase flex items-center gap-1 px-2 py-0.5 rounded-lg border ${
              isLight
                ? "bg-slate-100 text-slate-700 border-slate-200"
                : "text-neutral-400 bg-neutral-900/90 border-neutral-800"
            }`}>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {getBodyTypeLabel(vehicle.bodyType)}
            </span>

            {vehicle.licensePlate ? (
              <LicensePlateBadge plate={vehicle.licensePlate} size="sm" />
            ) : (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                isLight ? "bg-slate-100 text-slate-500 border-slate-200" : "text-neutral-500 bg-neutral-900 border-neutral-800"
              }`}>
                Госномер не указан
              </span>
            )}

            {vehicle.vin ? (
              <button
                onClick={handleCopyVin}
                className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                  isLight
                    ? "text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200"
                    : "text-neutral-300 bg-neutral-900/90 hover:bg-neutral-800 border-neutral-800"
                }`}
                title="Нажмите, чтобы скопировать VIN"
              >
                <span className={isLight ? "text-slate-400" : "text-neutral-500"}>VIN:</span>
                <span className={`font-bold uppercase ${isLight ? "text-slate-900" : "text-white"}`}>{vehicle.vin}</span>
                {copiedVin ? (
                  <Check className="w-3 h-3 text-emerald-500 ml-0.5" />
                ) : (
                  <Copy className={`w-3 h-3 ml-0.5 ${isLight ? "text-slate-400" : "text-neutral-400"}`} />
                )}
              </button>
            ) : (
              <button
                onClick={() => onOpenVehicleModal?.()}
                className="text-[11px] text-red-500 hover:text-red-600 underline underline-offset-2"
              >
                + Добавить VIN
              </button>
            )}
          </div>

          {/* Heading */}
          <div>
            <h1 className={`text-xl sm:text-2xl font-extrabold tracking-tight leading-tight ${
              isLight ? "text-slate-900" : "text-white"
            }`}>
              {vehicle.make} {vehicle.model}{" "}
              {vehicle.generation && (
                <span className={`font-semibold text-lg sm:text-xl ml-1 ${
                  isLight ? "text-slate-500" : "text-neutral-400"
                }`}>
                  {vehicle.generation}
                </span>
              )}
            </h1>
            <div className={`flex flex-wrap items-center gap-1.5 text-xs mt-0.5 ${
              isLight ? "text-slate-600" : "text-neutral-300"
            }`}>
              <span className={`font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                {totalRecordsCount} ТО в истории
              </span>
              <span className={isLight ? "text-slate-300" : "text-neutral-600"}>•</span>
              <span>{vehicle.year} год</span>
              <span className={isLight ? "text-slate-300" : "text-neutral-600"}>•</span>
              <span>{vehicle.engine}</span>
              {vehicle.driveType && (
                <>
                  <span className={isLight ? "text-slate-300" : "text-neutral-600"}>•</span>
                  <span>{vehicle.driveType}</span>
                </>
              )}
            </div>
          </div>

          {/* Odometer Card with Quick Update */}
          <div className={`flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl ${
            isLight
              ? "bg-slate-50 border border-slate-200 shadow-xs"
              : "bg-neutral-900/85 border border-neutral-800 shadow-inner"
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-red-500 shrink-0 shadow-xs ${
                isLight ? "bg-white border-slate-200" : "bg-neutral-800/90 border-neutral-700/60"
              }`}>
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <div className={`text-[10px] uppercase tracking-wider font-semibold leading-none ${
                  isLight ? "text-slate-500" : "text-neutral-400"
                }`}>
                  Текущий пробег
                </div>
                <div className={`text-lg sm:text-xl font-black font-mono tracking-tight flex items-baseline gap-1 mt-0.5 ${
                  isLight ? "text-slate-900" : "text-white"
                }`}>
                  <span>{vehicle.currentMileage.toLocaleString("ru-RU")}</span>
                  <span className={`text-xs font-normal ${isLight ? "text-slate-500" : "text-neutral-400"}`}>км</span>
                </div>
                <div className={`text-[9px] ${isLight ? "text-slate-400" : "text-neutral-500"}`}>
                  обновлён {vehicle.lastMileageUpdate}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setTempMileage(vehicle.currentMileage);
                  setShowMileageModal(true);
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-red-600/25 active:scale-95"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Обновить пробег</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Built-in body template */}
        <div className="lg:col-span-5 w-full min-w-0">
          <VehicleStage key={`${vehicle.id}-${vehicle.photoUrl || ''}`} vehicle={vehicle}
            onColorChange={onUpdateColor} onModelChange={onUpdateModel3dUrl} />
        </div>
      </div>

      {/* Intelligent Vehicle Telemetry & Due Service Notification */}
      <div className="mt-2.5">
        <button
          onClick={() => onOpenReminders?.()}
          className={`w-full flex items-center justify-between p-2.5 sm:px-3.5 sm:py-2 text-left rounded-2xl border transition-all duration-200 cursor-pointer group shadow-xs ${
            isLight
              ? "bg-amber-50/70 hover:bg-amber-50 border-amber-200/80 text-slate-900"
              : "bg-gradient-to-r from-amber-500/10 via-neutral-900 to-neutral-900/90 hover:from-amber-500/15 hover:to-neutral-850 border-amber-500/30 text-white"
          }`}
          title="Открыть график планового обслуживания и регламент"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <Bell className="w-4 h-4 animate-wiggle" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold flex items-center gap-2">
                <span className={isLight ? "text-slate-900" : "text-white"}>
                  Плановое обслуживание
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 font-bold px-2 py-0.2 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  {urgentCount > 0 ? `${urgentCount} регламентная задача` : "Регламент соблюдён"}
                </span>
              </div>
              <p className={`text-[11px] truncate mt-0.5 ${isLight ? "text-slate-600" : "text-neutral-300"}`}>
                {topAlertTitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-amber-500 shrink-0 ml-2">
            <span className="hidden sm:inline text-[11px]">К регламенту</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
          </div>
        </button>
      </div>

      {/* Mileage update modal */}
      {showMileageModal && (
        <DialogFrame label="Обновить пробег" onClose={() => setShowMileageModal(false)}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-white">
            <h3 className="text-lg font-bold">Обновить пробег</h3>
            <p className="text-xs text-neutral-400 mt-1">
              {vehicle.make} {vehicle.model} ({vehicle.generation || ""})
            </p>

            <form onSubmit={handleSaveMileage} className="mt-4 space-y-4">
              <div>
                <label htmlFor="vehicle-mileage" className="block text-xs font-medium text-neutral-300 mb-1">
                  Текущий пробег (км)
                </label>
                <div className="relative">
                  <input
                    id="vehicle-mileage"
                    type="number"
                    min="0"
                    step="10"
                    value={tempMileage}
                    onChange={(e) => setTempMileage(Number(e.target.value))}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-lg font-mono font-bold text-white focus:outline-none focus:border-red-500"
                    autoFocus
                  />
                  <span className="absolute right-3 top-3 text-xs text-neutral-400">
                    км
                  </span>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowMileageModal(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 rounded-xl hover:bg-neutral-700 transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition cursor-pointer shadow-lg shadow-red-600/30"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </DialogFrame>
      )}

    </header>
  );
};
