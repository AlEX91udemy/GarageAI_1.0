import React, { useRef, useState } from "react";
import { WebSidebar } from "./layouts/WebSidebar";
import { WebTopBar } from "./layouts/WebTopBar";
import {
  Vehicle,
  ServiceRecord,
  FuelRecord,
  OemScheduleItem,
  ToFixTask,
  GaragePart,
  TuningStage,
  ReminderRecord,
} from "../types";

// Существующие компоненты разделов (перенесены из мобильной версии 1:1)
import { Dashboard } from "../components/Dashboard";
import { ServiceLogView } from "../components/ServiceLogView";
import { OemScheduleView } from "../components/OemScheduleView";
import { ExpensesFuelView } from "../components/ExpensesFuelView";

/**
 * Разделы веб-версии повторяют мобильную навигацию:
 * Главная · История (регламент + записи) · Расходы · Профиль (+ Настройки).
 * Склад запчастей и Тюнинг в мобильной версии недоступны, поэтому их нет и здесь.
 */
type ActiveView = "dashboard" | "history" | "expenses" | "profile" | "settings";

export interface WebAppProps {
  vehicles: Vehicle[];
  activeVehicleId: string;
  setActiveVehicleId: (id: string) => void;
  serviceRecords: ServiceRecord[];
  fuelRecords: FuelRecord[];
  oemSchedules: OemScheduleItem[];
  garageParts: GaragePart[];
  toFixTasks: ToFixTask[];
  tuningStages: TuningStage[];
  reminders: ReminderRecord[];
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenAddService: () => void;
  onOpenScanReceipt: () => void;
  onOpenAiMechanic: () => void;
  onOpenServiceBook: () => void;
  onOpenReminders: () => void;
  onOpenAddVehicle: () => void;
  onUpdateMileage: (mileage: number) => void;
  onSaveServiceRecord: (record: ServiceRecord, usedPartIds?: string[], completedTaskId?: string) => void;
  onDeleteServiceRecord: (recordId: string) => void;
  onAddFuelRecord: (record: FuelRecord) => void;
  onMarkOemDone: (item: OemScheduleItem) => void;
  onSaveOemScheduleItems: (items: OemScheduleItem[]) => void;
  /** Добавление одного пункта регламента (в отличие от полного сохранения списка) */
  onAddOemScheduleItem?: (item: OemScheduleItem) => void;
  onInstallPartInService: (part: GaragePart) => void;
  onAddGaragePart: (part: GaragePart) => void;
  onUpdateGaragePart: (part: GaragePart) => void;
  onDeleteGaragePart: (partId: string) => void;
  onAddToFixTask: (task: ToFixTask) => void;
  onUpdateToFixTask: (task: ToFixTask) => void;
  onCompleteToFixTask: (taskId: string) => void;
  onAddTuningStage: (stage: TuningStage) => void;
  onUpdateTuningStage: (stage: TuningStage) => void;
  onDeleteTuningStage: (stageId: string) => void;
  onAddReminder: (reminder: ReminderRecord) => void;
  onUpdateReminder: (reminder: ReminderRecord) => void;
  onDeleteReminder: (reminderId: string) => void;
  onAddVehicle: (vehicle: Vehicle) => void;
  onSaveVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (vehicleId: string) => void;
  onUpdateVehicleColor: (color: string) => void;
  onUpdateVehicleModel3d: (url: string) => void;
  onImportBackup: (jsonString: string) => void;
  onExportBackup: () => string;
  /** Дополнительные действия веб-оболочки */
  onOpenEditVehicle?: () => void;
  onOpenBackup?: () => void;
  onSwitchToMobile?: () => void;
}

const VIEW_TITLES: Record<ActiveView, string> = {
  dashboard: "Главная",
  history: "История обслуживания",
  expenses: "Расходы",
  profile: "Профиль владельца",
  settings: "Настройки",
};

export const WebApp: React.FC<WebAppProps> = (props) => {
  const {
    vehicles,
    activeVehicleId,
    setActiveVehicleId,
    serviceRecords,
    fuelRecords,
    oemSchedules,
    toFixTasks,
    reminders,
    theme,
    onToggleTheme,
    onOpenAddService,
    onOpenScanReceipt,
    onOpenAiMechanic,
    onOpenServiceBook,
    onOpenReminders,
    onOpenAddVehicle,
    onDeleteServiceRecord,
    onAddFuelRecord,
    onMarkOemDone,
    onSaveOemScheduleItems,
    onAddOemScheduleItem,
    onImportBackup,
    onExportBackup,
    onOpenEditVehicle,
    onOpenBackup,
    onSwitchToMobile,
  } = props;

  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [historyTab, setHistoryTab] = useState<"upcoming" | "history">("upcoming");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const isDark = theme === "dark";
  const currentVehicle = vehicles.find((v) => v.id === activeVehicleId) || vehicles[0];

  /* ----------------------------- Пустой гараж ----------------------------- */
  if (!currentVehicle) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-6 ${
          isDark ? "bg-[#06090e] text-white" : "bg-slate-50 text-slate-900"
        }`}
      >
        <div
          className={`w-full max-w-lg rounded-2xl border p-8 text-center shadow-2xl ${
            isDark
              ? "bg-[#0B0E14] border-[#1E293B] shadow-black/40"
              : "bg-white border-slate-200 shadow-slate-200/60"
          }`}
        >
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-[#F97316] to-[#EF4444] flex items-center justify-center font-black text-sm text-white shadow-sm">
            GH
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight">
            Добро пожаловать в Garage<span className="text-[#F97316]">Hub</span>
          </h1>
          <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Добавьте первый автомобиль — и весь журнал обслуживания, регламент ТО
            и расходы будут собраны в одном месте.
          </p>

          <ul
            className={`mt-6 space-y-2 text-left text-sm ${
              isDark ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {[
              "История ремонтов и замен с чеками",
              "Напоминания о регламентном обслуживании",
              "Учёт расходов на топливо и запчасти",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#EF4444] shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={onOpenAddVehicle}
            className="mt-7 w-full px-6 py-3 bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold rounded-lg transition"
          >
            Добавить автомобиль
          </button>
        </div>
      </div>
    );
  }

  const currentRecords = serviceRecords.filter((r) => r.vehicleId === currentVehicle.id);
  const currentFuel = fuelRecords.filter((f) => f.vehicleId === currentVehicle.id);
  const currentSchedules = oemSchedules.filter(
    (s) => s.vehicleId === currentVehicle.id || s.vehicleId === "all"
  );
  const currentTasks = toFixTasks.filter((t) => t.vehicleId === currentVehicle.id);
  const currentReminders = reminders.filter(
    (r) => r.vehicleId === currentVehicle.id || r.vehicleId === "all"
  );

  const totalSpent =
    currentRecords.reduce((sum, r) => sum + (r.totalCost || 0), 0) +
    currentFuel.reduce((sum, f) => sum + (f.totalCost || 0), 0);

  const cardClass = `rounded-xl border p-6 ${
    isDark ? "bg-[#0B0E14] border-[#1E293B]" : "bg-white border-slate-200"
  }`;
  const ghostButton = `px-4 py-2 rounded-lg text-sm font-semibold border transition ${
    isDark
      ? "bg-[#111827] border-[#1E293B] text-slate-200 hover:border-[#EF4444]/40"
      : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
  }`;

  const handleExport = () => {
    const data = onExportBackup?.();
    if (!data) return;
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `garagehub-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /* ------------------------------- История -------------------------------- */
  const renderHistory = () => (
    <div className="space-y-5">
      <div
        className={`inline-flex items-center gap-1 p-1 rounded-xl border ${
          isDark ? "bg-[#0B0E14] border-[#1E293B]" : "bg-white border-slate-200"
        }`}
      >
        {(
          [
            { id: "upcoming", label: `Предстоящие (${currentSchedules.length})` },
            { id: "history", label: `История (${currentRecords.length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setHistoryTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              historyTab === tab.id
                ? "bg-[#EF4444] text-[#06090e] shadow-sm"
                : isDark
                ? "text-slate-400 hover:text-slate-200"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {historyTab === "upcoming" ? (
        <OemScheduleView
          vehicle={currentVehicle}
          schedules={currentSchedules}
          onMarkDone={onMarkOemDone}
          onAddScheduleItem={(item) =>
            onAddOemScheduleItem ? onAddOemScheduleItem(item) : onSaveOemScheduleItems([item])
          }
          onUpdateSchedules={onSaveOemScheduleItems}
        />
      ) : (
        <ServiceLogView
          vehicle={currentVehicle}
          records={currentRecords}
          onAddRecord={onOpenAddService}
          onScanReceipt={onOpenScanReceipt}
          onDeleteRecord={onDeleteServiceRecord}
        />
      )}
    </div>
  );

  /* ------------------------------- Профиль -------------------------------- */
  const renderProfile = () => (
    <div className="space-y-6 max-w-3xl">
      <section className={cardClass}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#F97316] to-[#EF4444] flex items-center justify-center font-black text-lg text-white shadow-sm">
            {currentVehicle.make[0]}
            {currentVehicle.model[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black tracking-tight">
              {currentVehicle.make} {currentVehicle.model}
            </h2>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {currentVehicle.year}
              {currentVehicle.licensePlate ? ` • ${currentVehicle.licensePlate}` : ""} •{" "}
              {currentVehicle.currentMileage.toLocaleString("ru-RU")} км
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Синхронизировано с сервером
            </p>
          </div>
          {onOpenEditVehicle && (
            <button
              onClick={onOpenEditVehicle}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#F97316] hover:bg-[#EA580C] text-white transition"
            >
              Редактировать
            </button>
          )}
        </div>
      </section>

      <section className={cardClass}>
        <h3
          className={`text-xs font-bold uppercase tracking-wider ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          Статистика автопарка
        </h3>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Автомобилей", value: String(vehicles.length) },
            { label: "Записей ТО", value: String(serviceRecords.length) },
            { label: "Пробег", value: `${currentVehicle.currentMileage.toLocaleString("ru-RU")} км` },
            { label: "Расходы", value: `${totalSpent.toLocaleString("ru-RU")} ₽` },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-lg border p-3 ${
                isDark ? "bg-[#111827] border-[#1E293B]" : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                {item.label}
              </div>
              <div className="mt-1 text-base font-black font-mono tabular-nums">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`${cardClass} p-0 overflow-hidden`}>
        {[
          { label: "Электронная сервисная книжка", action: onOpenServiceBook },
          { label: "Напоминания (ОСАГО, КАСКО, ТО, налог)", action: onOpenReminders },
          { label: "Резервная копия и синхронизация", action: onOpenBackup },
          { label: "Garage AI: диагностика", action: onOpenAiMechanic },
          { label: "Параметры автомобиля", action: onOpenEditVehicle },
          { label: "Добавить автомобиль", action: onOpenAddVehicle },
          { label: "Мобильная версия", action: onSwitchToMobile },
        ]
          .filter((item) => Boolean(item.action))
          .map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left text-sm font-semibold transition border-b last:border-b-0 ${
                isDark
                  ? "border-[#1E293B] text-slate-200 hover:bg-[#111827]"
                  : "border-slate-100 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>{item.label}</span>
              <span className={isDark ? "text-slate-500" : "text-slate-400"}>→</span>
            </button>
          ))}
      </section>
    </div>
  );

  /* ------------------------------ Настройки ------------------------------- */
  const renderSettings = () => (
    <div className="space-y-6 max-w-3xl">
      <section className={cardClass}>
        <h2 className="text-base font-bold tracking-tight">Стиль оформления</h2>
        <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Тема применяется ко всем разделам.
        </p>
        <div className="mt-4 flex gap-2">
          {(["light", "dark"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                if (theme !== mode) onToggleTheme();
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
                theme === mode
                  ? "bg-[#EF4444] border-[#EF4444] text-[#06090e]"
                  : ghostButton
              }`}
            >
              {mode === "light" ? "Светлая" : "Тёмная"}
            </button>
          ))}
        </div>
      </section>

      <section className={cardClass}>
        <h2 className="text-base font-bold tracking-tight">Данные и резервные копии</h2>
        <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Экспорт текущего автомобиля в JSON или синхронизация с сервером.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={handleExport} className={ghostButton}>
            Экспорт в JSON
          </button>
          <button onClick={() => importInputRef.current?.click()} className={ghostButton}>
            Импорт из JSON
          </button>
          {onOpenBackup && (
            <button
              onClick={onOpenBackup}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#EF4444] text-[#06090e] hover:bg-[#F87171] transition"
            >
              Синхронизация с сервером
            </button>
          )}
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              const text = await file.text();
              onImportBackup(text);
            } finally {
              event.target.value = "";
            }
          }}
        />
      </section>

      {onSwitchToMobile && (
        <section className={cardClass}>
          <h2 className="text-base font-bold tracking-tight">Клиентские приложения</h2>
          <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Откройте предпросмотр мобильной версии приложения.
          </p>
          <button onClick={onSwitchToMobile} className={`mt-4 ${ghostButton}`}>
            Мобильная версия
          </button>
        </section>
      )}

      <section className={`${cardClass} text-center`}>
        <div className="text-sm font-black">Garage AI Web</div>
        <div className={`mt-1 text-[11px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          Автомобильная редакция • Синхронизация с мобильным приложением
        </div>
      </section>
    </div>
  );

  const renderView = () => {
    switch (activeView) {
      case "dashboard":
        return (
          <Dashboard
            vehicle={currentVehicle}
            serviceRecords={currentRecords}
            fuelRecords={currentFuel}
            oemSchedules={currentSchedules}
            toFixTasks={currentTasks}
            onOpenAddService={onOpenAddService}
            onOpenHistory={() => {
              setHistoryTab("history");
              setActiveView("history");
            }}
            onOpenAiDiagnostic={onOpenAiMechanic}
            onOpenExpenses={() => setActiveView("expenses")}
            onOpenScanReceipt={onOpenScanReceipt}
            onOpenOemSchedule={() => {
              setHistoryTab("upcoming");
              setActiveView("history");
            }}
            onOpenInventoryToFix={onOpenReminders}
            onOpenServiceBook={onOpenServiceBook}
            showGarageBoard={false}
          />
        );

      case "history":
        return renderHistory();

      case "expenses":
        return (
          <ExpensesFuelView
            vehicle={currentVehicle}
            serviceRecords={currentRecords}
            fuelRecords={currentFuel}
            onAddFuelRecord={onAddFuelRecord}
            onOpenAddService={onOpenAddService}
          />
        );

      case "profile":
        return renderProfile();

      case "settings":
        return renderSettings();

      default:
        return null;
    }
  };

  return (
    <div
      className={`min-h-screen flex ${
        isDark ? "bg-[#06090e] text-slate-200" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Sidebar */}
      <WebSidebar
        activeView={activeView}
        onNavigate={(view) => setActiveView(view as ActiveView)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        theme={theme}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarCollapsed ? "ml-20" : "ml-64"
        }`}
      >
        {/* Top Bar */}
        <WebTopBar
          currentVehicle={currentVehicle}
          allVehicles={vehicles}
          onSelectVehicle={(v) => setActiveVehicleId(v.id)}
          onOpenNotifications={onOpenReminders}
          onToggleTheme={onToggleTheme}
          onOpenAddVehicle={onOpenAddVehicle}
          onOpenEditVehicle={onOpenEditVehicle}
          onOpenScan={onOpenScanReceipt}
          onSwitchToMobile={onSwitchToMobile}
          theme={theme}
          unreadCount={currentReminders.length}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto px-6 py-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h1 className="text-xl font-black tracking-tight">
                {VIEW_TITLES[activeView]}
              </h1>
              {activeView !== "profile" && activeView !== "settings" && (
                <span className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  {currentVehicle.make} {currentVehicle.model}
                </span>
              )}
            </div>
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
};
