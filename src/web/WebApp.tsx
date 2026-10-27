import React, { useRef, useState } from "react";
import { WebSidebar } from "./layouts/WebSidebar";
import { WebTopBar } from "./layouts/WebTopBar";
import { runGarageAiAgents, type GarageAiAgentName } from "../api";
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
  onLogout?: () => void;
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
    onLogout,
  } = props;

  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [historyTab, setHistoryTab] = useState<"upcoming" | "history">("upcoming");
  const [agentTask, setAgentTask] = useState("");
  const [agentSelection, setAgentSelection] = useState<GarageAiAgentName[]>(["architect", "qa"]);
  const [agentResults, setAgentResults] = useState<Record<string, string> | null>(null);
  const [agentError, setAgentError] = useState("");
  const [agentBusy, setAgentBusy] = useState(false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const isDark = theme === "dark";
  const currentVehicle = vehicles.find((v) => v.id === activeVehicleId) || vehicles[0] || {
    id: "empty-garage",
    make: "Автомобиль",
    model: "не добавлен",
    year: new Date().getFullYear(),
    engine: "",
    transmission: "",
    currentMileage: 0,
    lastMileageUpdate: "",
  };

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
    isDark ? "bg-[#17202E] border-[#243044]" : "bg-white border-slate-200"
  }`;
  const ghostButton = `px-4 py-2 rounded-lg text-sm font-semibold border transition ${
    isDark
      ? "bg-[#0D131D] border-[#243044] text-slate-200 hover:border-[#EF3038]/40"
      : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
  }`;

  const handleExport = () => {
    const data = onExportBackup?.();
    if (!data) return;
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Garage AI-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /* ------------------------------- История -------------------------------- */
  const renderHistory = () => (
    <div className="space-y-5">
      <div
        className={`inline-flex items-center gap-1 p-1 rounded-xl border ${
          isDark ? "bg-[#17202E] border-[#243044]" : "bg-white border-slate-200"
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
                ? "bg-[#B91C1C] text-white shadow-sm"
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
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#B91C1C] to-[#EF3038] flex items-center justify-center font-black text-lg text-white shadow-sm">
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
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#B91C1C] hover:bg-[#991B1B] text-white transition"
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
                isDark ? "bg-[#0D131D] border-[#243044]" : "bg-slate-50 border-slate-200"
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
                  ? "border-[#243044] text-slate-200 hover:bg-[#0D131D]"
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
                  ? "bg-[#B91C1C] border-[#EF3038] text-white"
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
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#B91C1C] text-white hover:bg-[#991B1B] transition"
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

      <section className={cardClass}>
        <h2 className="text-base font-bold tracking-tight">GarageAI — мультиагентный помощник</h2>
        <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Административная функция. Запрос отправляется на закрытый сервер агентов и может расходовать платные AI-кредиты.
          Доступ контролируется серверной allowlist; если вы не назначены администратором, сервер отклонит запуск.
        </p>
        <label className="block mt-4 text-sm font-semibold" htmlFor="garageai-agent-task">Задача для команды агентов</label>
        <textarea
          id="garageai-agent-task"
          value={agentTask}
          onChange={(event) => setAgentTask(event.target.value)}
          maxLength={8000}
          rows={4}
          placeholder="Например: проверь готовность проекта к production и перечисли блокирующие дефекты"
          className={`mt-2 w-full rounded-lg border p-3 text-sm outline-none focus:ring-2 focus:ring-red-500 ${isDark ? "bg-[#0D131D] border-[#243044] text-slate-100" : "bg-white border-slate-200 text-slate-900"}`}
        />
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>Не вставляйте API-ключи, пароли или пользовательские персональные данные.</span>
          <span>{agentTask.length}/8000</span>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {([
            ["architect", "Архитектор"],
            ["developer", "Разработчик"],
            ["qa", "QA / тестирование"],
            ["ops", "DevOps / эксплуатация"],
            ["argon_reviewer", "Финальный ревьюер"],
          ] as Array<[GarageAiAgentName, string]>).map(([name, label]) => (
            <label key={name} className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${isDark ? "border-[#243044]" : "border-slate-200"}`}>
              <input
                type="checkbox"
                checked={agentSelection.includes(name)}
                disabled={!agentSelection.includes(name) && agentSelection.length >= 3}
                onChange={(event) => {
                  setAgentSelection((current) => event.target.checked
                    ? current.length < 3 ? [...current, name] : current
                    : current.filter((item) => item !== name));
                  setAgentError("");
                }}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={agentBusy || agentTask.trim().length < 3 || agentTask.trim().length > 8000 || agentSelection.length === 0}
          onClick={async () => {
            setAgentBusy(true);
            setAgentError("");
            setAgentResults(null);
            try {
              const result = await runGarageAiAgents({ task: agentTask.trim(), agents: agentSelection });
              setAgentResults(result.results);
            } catch (error) {
              setAgentError(error instanceof Error ? error.message : "Не удалось запустить AI-агентов.");
            } finally {
              setAgentBusy(false);
            }
          }}
          className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold bg-[#B91C1C] text-white hover:bg-[#991B1B] disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {agentBusy ? "Агенты работают…" : "Запустить выбранных агентов"}
        </button>
        {agentError && (
          <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
            {agentError}
          </p>
        )}
        {agentResults && (
          <div className="mt-4 space-y-3">
            {Object.entries(agentResults).map(([name, result]) => (
              <article key={name} className={`rounded-lg border p-4 ${isDark ? "border-[#243044] bg-[#0D131D]" : "border-slate-200 bg-slate-50"}`}>
                <h3 className="text-sm font-bold">{name}</h3>
                <pre className="mt-2 whitespace-pre-wrap break-words text-sm font-sans leading-relaxed">{result}</pre>
              </article>
            ))}
          </div>
        )}
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
        isDark ? "bg-[#0D131D] text-slate-200" : "bg-[#F4F5F8] text-slate-900"
      }`}
    >
      {/* Sidebar */}
      <WebSidebar
        activeView={activeView}
        onNavigate={(view) => setActiveView(view as ActiveView)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onLogout={onLogout}
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
            </div>
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
};
