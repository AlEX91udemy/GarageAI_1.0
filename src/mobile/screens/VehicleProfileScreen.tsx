import React, { useState } from "react";
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  MoreVertical,
  Wrench,
  Fuel,
  Wallet,
  FileText,
  Plus,
  ChevronDown,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Car as CarIcon,
  ChevronRight,
  ExternalLink,
  Edit2,
  Phone,
  MapPin,
  Trash2,
} from "lucide-react";
import {
  Vehicle,
  ServiceRecord,
  FuelRecord,
  OemScheduleItem,
  ToFixTask,
  GaragePart,
} from "../../types";
import { LicensePlateBadge } from "../../components/LicensePlateBadge";
import { VehicleStage } from "../../components/VehicleStage";
import { MobileScreenId } from "../types";
import { ThemeMode } from "../theme";
import { VehicleModelRenderer } from "../../components/VehicleModelRenderer";

interface VehicleProfileScreenProps {
  vehicle: Vehicle;
  onBack: () => void;
  serviceRecords: ServiceRecord[];
  fuelRecords: FuelRecord[];
  oemSchedules: OemScheduleItem[];
  toFixTasks: ToFixTask[];
  garageParts: GaragePart[];
  onNavigate: (screen: MobileScreenId) => void;
  onOpenAddEvent: () => void;
  onEditVehicle: (v: Vehicle) => void;
  onOpenServiceBook?: () => void;
  onOpenReminders?: () => void;
  onOpenAiMechanic?: () => void;
  onUpdateColor?: (color: string) => void;
  themeMode?: ThemeMode;
  initialTab?: "overview" | "works" | "expenses" | "fuel" | "documents";
  onSelectRecord?: (record: ServiceRecord) => void;
  onAddServiceRecord?: () => void;
}

export const VehicleProfileScreen: React.FC<VehicleProfileScreenProps> = ({
  vehicle,
  onBack,
  serviceRecords,
  fuelRecords,
  oemSchedules,
  toFixTasks,
  garageParts,
  onNavigate,
  onOpenAddEvent,
  onEditVehicle,
  onOpenServiceBook,
  onOpenReminders,
  onOpenAiMechanic,
  onUpdateColor,
  themeMode = "dark",
  initialTab = "works",
  onSelectRecord,
  onAddServiceRecord,
}) => {
  const isDark = themeMode === "dark";
  const [activeTab, setActiveTab] = useState<"overview" | "works" | "expenses" | "fuel" | "documents">(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMoreRecords, setShowMoreRecords] = useState(false);
  const [showActionMenuRecordId, setShowActionMenuRecordId] = useState<string | null>(null);

  // Filter service records for this car
  const carServices = serviceRecords.filter((r) => r.vehicleId === vehicle.id);
  const sortedServices = [...carServices].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Fuel records for this car + financial aggregates
  const carFuel = fuelRecords.filter((f) => f.vehicleId === vehicle.id);
  const lastFuel = [...carFuel].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
  const totalExpenses =
    carServices.reduce((sum, r) => sum + (r.totalCost || 0), 0) +
    carFuel.reduce((sum, f) => sum + (f.totalCost || 0), 0);
  const fmtRub = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;
  const fmtFuelDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("ru-RU") : "";
  const fmtLiters = (n: number) =>
    n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Filtered by search query
  const filteredServices = sortedServices.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.category && r.category.toLowerCase().includes(q)) ||
      (r.serviceCenter && r.serviceCenter.toLowerCase().includes(q)) ||
      r.parts.some((p) => p.name.toLowerCase().includes(q) || (p.partNumber && p.partNumber.toLowerCase().includes(q)))
    );
  });

  const displayedServices = showMoreRecords ? filteredServices : filteredServices.slice(0, 5);

  // Helper for category styling & icons
  const getCategoryTheme = (category?: string) => {
    switch (category) {
      case "Система охлаждения":
        return {
          bg: "bg-red-500/15",
          text: "text-red-500",
          icon: <Wrench className="w-5 h-5" />,
        };
      case "Двигатель":
        return {
          bg: isDark ? "bg-slate-700/40" : "bg-neutral-200",
          text: isDark ? "text-slate-300" : "text-neutral-700",
          icon: <Layers className="w-5 h-5" />,
        };
      case "Ходовая часть":
        return {
          bg: "bg-purple-500/15",
          text: "text-purple-400",
          icon: <Wrench className="w-5 h-5" />,
        };
      case "Тормозная система":
        return {
          bg: "bg-blue-600/15",
          text: "text-blue-400",
          icon: <ShieldCheck className="w-5 h-5" />,
        };
      case "Климатическая система":
        return {
          bg: "bg-cyan-500/15",
          text: "text-cyan-400",
          icon: <Sparkles className="w-5 h-5" />,
        };
      default:
        return {
          bg: "bg-red-500/15",
          text: "text-red-500",
          icon: <Wrench className="w-5 h-5" />,
        };
    }
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-");
    if (d && m && y) return `${d}.${m}.${y}`;
    return dateStr;
  };

  return (
    <div
      className={`flex flex-col w-full pb-20 select-none min-h-screen transition-colors duration-200 ${
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
        <div className="flex items-center gap-3">
          <button
            id="vehicle-btn-back"
            onClick={onBack}
            className={`p-1.5 rounded-xl border transition cursor-pointer active:scale-95 ${
              isDark
                ? "bg-[#17202e] border-[#243044] text-slate-300 hover:text-white"
                : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-xs"
            }`}
            title="Назад"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <h1 className="text-base font-black tracking-tight leading-tight">
              {vehicle.make} {vehicle.model}
            </h1>
            <div
              className={`text-xs font-mono font-medium ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {vehicle.year} • {vehicle.licensePlate || "0742УМ"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Vehicle thumbnail */}
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
            <VehicleModelRenderer vehicle={vehicle} className="!aspect-square" />
          </div>

          <button
            id="vehicle-btn-menu"
            onClick={() => onEditVehicle?.(vehicle)}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition cursor-pointer active:scale-95 ${
              isDark
                ? "bg-[#17202e] border-[#243044] text-slate-300 hover:text-white"
                : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-xs"
            }`}
            title="Опции"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </header>
      <div className="p-3">
        <VehicleStage key={vehicle.id} vehicle={vehicle} />
      </div>

      {/* 2. SUB-TABS NAVIGATION (Обзор, Работы, Расходы, Заправки, Документы) */}
      <div
        className={`flex items-center justify-around border-b px-2 overflow-x-auto no-scrollbar transition-colors duration-200 ${
          isDark ? "bg-[#101724] border-[#1b2535]" : "bg-white border-[#E2E8F0]"
        }`}
      >
        <button
          onClick={() => setActiveTab("overview")}
          className={`py-3 px-3 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer ${
            activeTab === "overview"
              ? "text-red-500"
              : isDark
              ? "text-slate-400 hover:text-white"
              : "text-slate-600 hover:text-neutral-900"
          }`}
        >
          <span>Обзор</span>
          {activeTab === "overview" && (
            <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-red-500 rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("works")}
          className={`py-3 px-3 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer ${
            activeTab === "works"
              ? "text-red-500"
              : isDark
              ? "text-slate-400 hover:text-white"
              : "text-slate-600 hover:text-neutral-900"
          }`}
        >
          <span>Работы</span>
          {activeTab === "works" && (
            <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-red-500 rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("expenses")}
          className={`py-3 px-3 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer ${
            activeTab === "expenses"
              ? "text-red-500"
              : isDark
              ? "text-slate-400 hover:text-white"
              : "text-slate-600 hover:text-neutral-900"
          }`}
        >
          <span>Расходы</span>
          {activeTab === "expenses" && (
            <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-red-500 rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("fuel")}
          className={`py-3 px-3 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer ${
            activeTab === "fuel"
              ? "text-red-500"
              : isDark
              ? "text-slate-400 hover:text-white"
              : "text-slate-600 hover:text-neutral-900"
          }`}
        >
          <span>Заправки</span>
          {activeTab === "fuel" && (
            <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-red-500 rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("documents")}
          className={`py-3 px-3 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer ${
            activeTab === "documents"
              ? "text-red-500"
              : isDark
              ? "text-slate-400 hover:text-white"
              : "text-slate-600 hover:text-neutral-900"
          }`}
        >
          <span>Документы</span>
          {activeTab === "documents" && (
            <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-red-500 rounded-t-full" />
          )}
        </button>
      </div>

      {/* 3. CONTENT PER ACTIVE TAB */}
      {activeTab === "works" && (
        <div className="px-4 pt-3 flex flex-col gap-3">
          {/* SEARCH BAR */}
          <div className="flex items-center gap-2">
            <div
              className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl border transition-all ${
                isDark
                  ? "bg-[#17202e] border-[#243044] text-white focus-within:border-red-500"
                  : "bg-white border-[#E2E8F0] text-neutral-900 focus-within:border-red-500 shadow-xs"
              }`}
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по работам, запчастям, СТО..."
                className="bg-transparent border-none outline-none text-xs w-full placeholder:text-slate-400"
              />
            </div>

            <button
              className={`p-2.5 rounded-2xl border flex items-center justify-center transition cursor-pointer ${
                isDark
                  ? "bg-[#17202e] border-[#243044] text-slate-300 hover:text-white"
                  : "bg-white border-[#E2E8F0] text-neutral-700 hover:bg-neutral-50 shadow-xs"
              }`}
              title="Фильтры"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* TIMELINE OF SERVICE RECORDS */}
          <div className="flex flex-col gap-4 mt-1">
            {displayedServices.map((record) => {
              const catTheme = getCategoryTheme(record.category);
              const formattedDate = formatDate(record.date);

              return (
                <div key={record.id} className="flex flex-col gap-1.5">
                  {/* Timeline Header Date & Mileage */}
                  <div className="flex items-center justify-between text-xs font-semibold px-1">
                    <div className="flex items-center gap-2 text-red-500">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span className={`${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        {formattedDate}
                      </span>
                    </div>
                    <div className={`font-mono text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {record.mileage.toLocaleString("ru-RU")} км
                    </div>
                  </div>

                  {/* Card Body */}
                  <div
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer active:scale-[0.99] group ${
                      isDark
                        ? "bg-[#17202e] border-[#243044] hover:border-[#2d3d57]"
                        : "bg-white border-[#E2E8F0] shadow-xs hover:border-neutral-300"
                    }`}
                  >
                    <button
                      type="button"
                      aria-label={`Открыть запись: ${record.title}`}
                      onClick={() => {
                        onSelectRecord?.(record);
                        onNavigate?.("service_detail");
                      }}
                      className="flex flex-1 min-w-0 items-center gap-3 text-left"
                    >
                      {/* Icon */}
                      <div className={`w-11 h-11 rounded-2xl ${catTheme.bg} ${catTheme.text} flex items-center justify-center shrink-0`}>
                        {catTheme.icon}
                      </div>

                      {/* Text info */}
                      <div>
                        <div className="text-sm font-extrabold tracking-tight leading-tight group-hover:text-red-500 transition">
                          {record.title}
                        </div>
                        <div className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          {record.category || "Обслуживание"}
                        </div>
                        <div className={`text-[11px] mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          {record.serviceCenter || "СТО GaragePlus"}
                        </div>
                      </div>
                    </button>

                    {/* Price & Menu */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-sm font-black font-mono tracking-tight">
                        {record.totalCost?.toLocaleString("ru-RU")} ₽
                      </span>
                      <button
                        type="button"
                        aria-label={`Действия для записи: ${record.title}`}
                        aria-expanded={showActionMenuRecordId === record.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowActionMenuRecordId(showActionMenuRecordId === record.id ? null : record.id);
                        }}
                        className={`p-1 rounded-lg transition ${
                          isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {displayedServices.length === 0 && (
              <div
                className={`text-center py-10 rounded-2xl border ${
                  isDark ? "border-[#243044] bg-[#17202e] text-slate-400" : "border-[#E2E8F0] bg-white text-slate-500"
                }`}
              >
                Записей не найдено
              </div>
            )}

            {/* SHOW MORE BUTTON */}
            {filteredServices.length > 5 && !showMoreRecords && (
              <button
                onClick={() => setShowMoreRecords(true)}
                className={`w-full py-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
                  isDark
                    ? "bg-[#17202e] border-[#243044] text-slate-300 hover:text-white"
                    : "bg-white border-[#E2E8F0] text-slate-700 hover:bg-neutral-50 shadow-xs"
                }`}
              >
                <span>Показать больше записей ({filteredServices.length - 5})</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === "overview" && (
        <div className="px-4 pt-3 flex flex-col gap-3">
          {/* Car Hero Banner */}
          <div className={`p-4 rounded-2xl border ${isDark ? "bg-[#17202e] border-[#243044]" : "bg-white border-[#E2E8F0] shadow-xs"}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-lg font-black">{vehicle.make} {vehicle.model}</div>
                <div className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {vehicle.year} • {vehicle.engine}
                </div>
              </div>
              {vehicle.licensePlate && <LicensePlateBadge plate={vehicle.licensePlate} />}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`p-2.5 rounded-xl ${isDark ? "bg-[#0d131d]" : "bg-neutral-50"}`}>
                <span className="text-slate-400 block text-[10px]">VIN</span>
                <span className="font-mono font-bold">{vehicle.vin || "JN1TANT31U0000000"}</span>
              </div>
              <div className={`p-2.5 rounded-xl ${isDark ? "bg-[#0d131d]" : "bg-neutral-50"}`}>
                <span className="text-slate-400 block text-[10px]">Привод</span>
                <span className="font-bold">{vehicle.driveType || "Полный (4WD)"}</span>
              </div>
              <div className={`p-2.5 rounded-xl ${isDark ? "bg-[#0d131d]" : "bg-neutral-50"}`}>
                <span className="text-slate-400 block text-[10px]">Трансмиссия</span>
                <span className="font-bold">{vehicle.transmission || "Вариатор (CVT)"}</span>
              </div>
              <div className={`p-2.5 rounded-xl ${isDark ? "bg-[#0d131d]" : "bg-neutral-50"}`}>
                <span className="text-slate-400 block text-[10px]">Кузов</span>
                <span className="font-bold">{vehicle.bodyType || "Внедорожник 5 дв."}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onOpenServiceBook?.()}
              className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer active:scale-98 ${
                isDark ? "bg-[#17202e] border-[#243044] hover:border-red-500/50" : "bg-white border-[#E2E8F0] shadow-xs"
              }`}
            >
              <FileText className="w-5 h-5 text-red-500 mb-2" />
              <div className="text-xs font-bold">Сервисная книга</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Печать и экспорт</div>
            </button>

            <button
              onClick={() => onOpenReminders?.()}
              className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer active:scale-98 ${
                isDark ? "bg-[#17202e] border-[#243044] hover:border-red-500/50" : "bg-white border-[#E2E8F0] shadow-xs"
              }`}
            >
              <ShieldCheck className="w-5 h-5 text-amber-500 mb-2" />
              <div className="text-xs font-bold">Напоминания</div>
              <div className="text-[10px] text-slate-400 mt-0.5">ОСАГО, ТО, налог</div>
            </button>
          </div>
        </div>
      )}

      {activeTab === "expenses" && (
        <div className="px-4 pt-3 flex flex-col gap-3">
          <div className={`p-4 rounded-2xl border ${isDark ? "bg-[#17202e] border-[#243044]" : "bg-white border-[#E2E8F0] shadow-xs"}`}>
            <div className="text-xs text-slate-400">Всего расходов на автомобиль</div>
            <div className="text-2xl font-black font-mono text-emerald-500 mt-1">
              {fmtRub(totalExpenses)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {carServices.length} записей ТО и ремонтов, {carFuel.length} заправок
            </div>
          </div>
        </div>
      )}

      {activeTab === "fuel" && (
        <div className="px-4 pt-3 flex flex-col gap-3">
          <div className={`p-4 rounded-2xl border ${isDark ? "bg-[#17202e] border-[#243044]" : "bg-white border-[#E2E8F0] shadow-xs"}`}>
            <div className="text-xs text-slate-400">Последняя заправка</div>
            {lastFuel ? (
              <>
                <div className="text-lg font-black mt-1">
                  {fmtFuelDate(lastFuel.date)} • {fmtLiters(lastFuel.liters)} л
                </div>
                <div className="text-xs text-blue-500 font-bold mt-0.5">
                  {lastFuel.station}
                </div>
              </>
            ) : (
              <div className="text-lg font-black mt-1">Нет данных о заправках</div>
            )}
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="px-4 pt-3 flex flex-col gap-3">
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${isDark ? "bg-[#17202e] border-[#243044]" : "bg-white border-[#E2E8F0] shadow-xs"}`}>
            <div>
              <div className="text-xs font-bold">СТС (Свидетельство о регистрации)</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Серия и номер: 77 12 345678</div>
            </div>
            <span className="text-xs text-emerald-500 font-bold">Активно</span>
          </div>

          <div className={`p-4 rounded-2xl border flex items-center justify-between ${isDark ? "bg-[#17202e] border-[#243044]" : "bg-white border-[#E2E8F0] shadow-xs"}`}>
            <div>
              <div className="text-xs font-bold">ОСАГО (Полис страхования)</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Действует до 15.11.2026</div>
            </div>
            <span className="text-xs text-emerald-500 font-bold">Осталось 68 дн.</span>
          </div>
        </div>
      )}

      {/* 4. Action stays inside the scrollable screen, above the app bottom bar */}
      <div
        className={`sticky bottom-0 z-20 px-4 pt-3 pb-4 max-w-md mx-auto w-full ${
          isDark
            ? "bg-gradient-to-t from-[#0d131d] via-[#0d131d]/95 to-transparent"
            : "bg-gradient-to-t from-[#F4F5F8] via-[#F4F5F8]/95 to-transparent"
        }`}
      >
        <button
          onClick={() => {
            if (typeof onAddServiceRecord === "function") {
              onAddServiceRecord();
            } else if (typeof onOpenAddEvent === "function") {
              onOpenAddEvent();
            }
          }}
          className="w-full py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-98 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-red-600/35 transition-all cursor-pointer border border-red-500/40"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Добавить работу</span>
        </button>
      </div>
    </div>
  );
};
