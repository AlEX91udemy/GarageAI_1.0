import React, { useLayoutEffect, useState } from "react";
import {
  Vehicle,
  ServiceRecord,
  FuelRecord,
  OemScheduleItem,
  ToFixTask,
  GaragePart,
  ReminderRecord,
} from "../types";
import { MobileTab, MobileScreenId, QuickActionType } from "./types";
import { DarkVariant, ThemeMode, readDarkVariant, saveDarkVariant } from "./theme";
import { readThemePreference, saveThemePreference, applyThemePreference } from "../themePreference";
import { MobileBottomBar } from "./navigation/MobileBottomBar";
import { QuickActionSheet } from "./navigation/QuickActionSheet";

// Screens
import { SplashScreen } from "./screens/SplashScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { AuthScreen } from "./screens/AuthScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { GarageScreen } from "./screens/GarageScreen";
import { VehicleProfileScreen } from "./screens/VehicleProfileScreen";
import { ServiceScreen } from "./screens/ServiceScreen";
import { ServiceDetailScreen } from "./screens/ServiceDetailScreen";
import { RepairScreen } from "./screens/RepairScreen";
import { ExpensesScreen } from "./screens/ExpensesScreen";
import { ToFixScreen } from "./screens/ToFixScreen";
import { ProblemDetailScreen } from "./screens/ProblemDetailScreen";
import { AiDiagnosticsScreen } from "./screens/AiDiagnosticsScreen";
import { FuelScreen } from "./screens/FuelScreen";
import { PartsScreen } from "./screens/PartsScreen";
import { PartDetailScreen } from "./screens/PartDetailScreen";
import { ProjectsScreen, TuningProject } from "./screens/ProjectsScreen";
import { ProjectDetailScreen } from "./screens/ProjectDetailScreen";
import { BeforeAfterScreen } from "./screens/BeforeAfterScreen";
import { AddEventScreen } from "./screens/AddEventScreen";
import { ScanReceiptScreen } from "./screens/ScanReceiptScreen";
import { BarcodeScannerScreen } from "./screens/BarcodeScannerScreen";
import { NotificationsScreen } from "./screens/NotificationsScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { PrefilledScanData } from "./types";
import { buildNotifications } from "../notifications";

// Web modals we can trigger if needed or re-use
import { Smartphone, Monitor, Sparkles, Car } from "lucide-react";

interface MobileAppProps {
  variant?: "preview" | "web";
  vehicles: Vehicle[];
  reminders?: ReminderRecord[];
  currentVehicle: Vehicle;
  onSelectVehicle: (v: Vehicle) => void;
  serviceRecords: ServiceRecord[];
  fuelRecords: FuelRecord[];
  oemSchedules: OemScheduleItem[];
  toFixTasks: ToFixTask[];
  garageParts: GaragePart[];
  onAddServiceRecord: (record: ServiceRecord) => void;
  onDeleteServiceRecord: (id: string) => void;
  onAddFuelRecord: (record: FuelRecord) => void;
  onAddGaragePart: (part: GaragePart) => void;
  onDeleteGaragePart: (id: string) => void;
  onUpdateGaragePart: (part: GaragePart) => void;
  onAddToFixTask: (task: ToFixTask) => void;
  onToggleToFixStatus: (id: string, currentStatus: string) => void;
  onUpdateMileage: (mileage: number) => void;
  onOpenAddVehicleModal: () => void;
  onOpenDataBackupModal: () => void;
  onSwitchToWebView?: () => void;
  onOpenServiceBookModal?: () => void;
  onOpenRemindersModal?: () => void;
  onOpenAiMechanicModal?: () => void;
  onOpenScanReceiptModal?: () => void;
  onOpenAddServiceModal?: (data?: Partial<ServiceRecord>) => void;
  onOpenEditVehicleModal?: () => void;
  onUpdateVehicleColor?: (vehicleId: string, color: string) => void;
  onAuthSuccess?: () => void;
  onLogout?: () => void;
  onDeleteFuelRecord?: (id: string) => void;
}

export const MobileApp: React.FC<MobileAppProps> = ({
  variant = "preview",
  vehicles,
  reminders = [],
  currentVehicle,
  onSelectVehicle,
  serviceRecords,
  fuelRecords,
  oemSchedules,
  toFixTasks,
  garageParts,
  onAddServiceRecord,
  onDeleteServiceRecord,
  onAddFuelRecord,
  onAddGaragePart,
  onDeleteGaragePart,
  onUpdateGaragePart,
  onAddToFixTask,
  onToggleToFixStatus,
  onUpdateMileage,
  onOpenAddVehicleModal,
  onOpenDataBackupModal,
  onSwitchToWebView,
  onOpenServiceBookModal,
  onOpenRemindersModal,
  onOpenAiMechanicModal,
  onOpenScanReceiptModal,
  onOpenAddServiceModal,
  onOpenEditVehicleModal,
  onUpdateVehicleColor,
  onAuthSuccess,
  onLogout,
  onDeleteFuelRecord,
}) => {
  const isWeb = variant === "web";
  // Navigation state
  const [currentScreen, setCurrentScreen] = useState<MobileScreenId>("home");
  const [activeTab, setActiveTab] = useState<MobileTab>("home");
  const generatedNotifications = buildNotifications(currentVehicle, oemSchedules, serviceRecords, toFixTasks, garageParts, reminders);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [deviceFrameMode, setDeviceFrameMode] = useState<"frame" | "full">("frame");

  // App color theme state. Light is the default (Photo 2); dark stays a toggle.
  const [themeMode, setThemeMode] = useState<ThemeMode>(readThemePreference);
  const [darkVariant, setDarkVariant] = useState<DarkVariant>(readDarkVariant);

  useLayoutEffect(() => {
    const html = document.documentElement;
    const wasDark = html.classList.contains("dark");
    const wasLight = html.classList.contains("light");
    applyThemePreference(themeMode);
    return () => {
      html.classList.toggle("dark", wasDark);
      html.classList.toggle("light", wasLight);
    };
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      saveThemePreference(next);
      return next;
    });
  };

  // Selection states for detail screens
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(
    serviceRecords[0] || null
  );
  const [selectedTask, setSelectedTask] = useState<ToFixTask | null>(
    toFixTasks[0] || null
  );
  const [selectedPart, setSelectedPart] = useState<GaragePart | null>(
    garageParts[0] || null
  );
  const [initialQuickActionType, setInitialQuickActionType] = useState<QuickActionType>("service");
  const [prefilledScanData, setPrefilledScanData] = useState<PrefilledScanData | null>(null);

  const handleApplyScanResult = (prefilled: PrefilledScanData) => {
    setPrefilledScanData(prefilled);
    setInitialQuickActionType(prefilled.targetType === "part" ? "part" : "service");
    setCurrentScreen("add_event");
  };

  // Tuning projects state
  const [projects, setProjects] = useState<TuningProject[]>([
    {
      id: "proj-1",
      vehicleId: currentVehicle.id,
      title: "Экспедиционная подготовка & Доп. Свет",
      category: "Overland / Off-Road",
      status: "in_progress",
      progressPct: 72,
      spent: 28000,
      budget: 45000,
      stagesCount: 3,
      completedStages: 2,
      description: "Лифт-комплект +30мм, диодные балки в рейлинги и броня картера.",
      updatedAt: "2024-09-02",
    },
    {
      id: "proj-2",
      vehicleId: currentVehicle.id,
      title: "Stage 1 ЭБУ & Оптимизация вариатора CVT",
      category: "Performance / Chiptuning",
      status: "planning",
      progressPct: 20,
      spent: 5000,
      budget: 35000,
      stagesCount: 4,
      completedStages: 0,
      description: "Прошивка блока управления двигателем, снижение температуры включения вентиляторов.",
      updatedAt: "2024-08-20",
    },
  ]);
  const [selectedProject, setSelectedProject] = useState<TuningProject>(projects[0]);

  // Handle Bottom Bar Tab changes
  const handleTabChange = (tab: MobileTab) => {
    setActiveTab(tab);
    switch (tab) {
      case "home":
        setCurrentScreen("home");
        break;
      case "vehicle":
        setCurrentScreen("vehicle_profile");
        break;
      case "history":
      case "service":
        setCurrentScreen("service");
        break;
      case "repair":
        setCurrentScreen("repair");
        break;
      case "expenses":
        setCurrentScreen("expenses");
        break;
      case "profile":
        setCurrentScreen("profile");
        break;
      case "garage":
        setCurrentScreen("garage");
        break;
    }
  };

  const navigateTo = (screen: MobileScreenId) => {
    setCurrentScreen(screen);
    // sync bottom tab if relevant
    if (screen === "home") setActiveTab("home");
    else if (screen === "service" || screen === "service_detail") setActiveTab("service");
    else if (screen === "repair") setActiveTab("repair");
    else if (screen === "expenses" || screen === "fuel") setActiveTab("expenses");
    else if (
      screen === "garage" ||
      screen === "parts" ||
      screen === "to_fix" ||
      screen === "projects"
    )
      setActiveTab("garage");
  };

  // Handle Quick Action sheet selections
  const handleSelectQuickAction = (action: QuickActionType) => {
    if (action === "scan_receipt") {
      setCurrentScreen("scan_receipt");
    } else if (action === "scan_barcode") {
      setCurrentScreen("scan_barcode");
    } else if (action === "photo") {
      setCurrentScreen("before_after");
    } else {
      setPrefilledScanData(null);
      setInitialQuickActionType(action);
      setCurrentScreen("add_event");
    }
  };

  // Determine if bottom bar should be displayed
  const showBottomBar = [
    "home",
    "vehicle",
    "vehicle_profile",
    "service",
    "repair",
    "expenses",
    "garage",
    "to_fix",
    "fuel",
    "parts",
    "projects",
    "profile",
  ].includes(currentScreen);

  // Render current screen content
  const renderScreen = () => {
    switch (currentScreen) {
      case "splash":
        return <SplashScreen onFinish={() => setCurrentScreen("onboarding")} />;

      case "onboarding":
        return <OnboardingScreen onComplete={() => setCurrentScreen("home")} />;

      case "auth":
        return <AuthScreen onSuccess={() => setCurrentScreen("home")} />;

      case "home":
        if (vehicles.length === 0 && currentVehicle.id === "empty-garage") {
          return (
            <div
              className={`h-full w-full flex-1 flex flex-col items-center justify-center px-6 text-center transition-colors ${
                themeMode === "dark"
                  ? "bg-[#0D131D] text-[#F8FAFC]"
                  : "bg-[#F4F5F8] text-[#0F172A]"
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-[#EF3038]/15 text-[#EF3038] flex items-center justify-center mb-4">
                <Car className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black">Гараж пока пуст</h2>
              <p
                className={`text-sm mt-2 max-w-xs ${
                  themeMode === "dark" ? "text-[#94A3B8]" : "text-[#536171]"
                }`}
              >
                Добавьте первый автомобиль, чтобы вести историю обслуживания и расходы.
              </p>
              <button
                type="button"
                onClick={onOpenAddVehicleModal}
                className="mt-5 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white px-5 py-3 text-sm font-bold transition-colors cursor-pointer"
              >
                Добавить автомобиль
              </button>
            </div>
          );
        }
        return (
          <HomeScreen
            currentVehicle={currentVehicle}
            allVehicles={vehicles}
            onSelectVehicle={onSelectVehicle}
            serviceRecords={serviceRecords}
            fuelRecords={fuelRecords}
            oemSchedules={oemSchedules}
            toFixTasks={toFixTasks}
            garageParts={garageParts}
            onNavigate={navigateTo}
            onOpenQuickAction={(initialType) => {
              if (initialType) setInitialQuickActionType(initialType);
              setIsQuickActionOpen(true);
            }}
            onOpenNotifications={() => navigateTo("notifications")}
            onOpenProfile={() => {
              navigateTo("profile");
            }}
            onUpdateMileage={onUpdateMileage}
            unreadNotificationsCount={generatedNotifications.length}
            onOpenAddVehicle={onOpenAddVehicleModal}
            onOpenServiceBook={onOpenServiceBookModal}
            onOpenReminders={onOpenRemindersModal}
            onOpenAiMechanic={() => navigateTo("ai_diagnostics")}
            onOpenScanReceipt={() => navigateTo("scan_receipt")}
            onOpenScanBarcode={() => {
              setInitialQuickActionType("service");
              setCurrentScreen("scan_barcode");
            }}
            onOpenAddService={() => {
              setPrefilledScanData(null);
              setInitialQuickActionType("service");
              setCurrentScreen("add_event");
            }}
            themeMode={themeMode}
            onToggleTheme={toggleTheme}
          />
        );

      case "garage":
        return (
          <GarageScreen
            vehicle={currentVehicle}
            vehicles={vehicles}
            garageParts={garageParts}
            toFixTasks={toFixTasks}
            onSelectVehicle={(veh) => onSelectVehicle?.(veh)}
            onSelectPart={(p) => {
              setSelectedPart(p);
              setCurrentScreen("part_detail");
            }}
            onAddPart={() => {
              setInitialQuickActionType("part");
              setCurrentScreen("add_event");
            }}
            onInstallPart={(part) => {
              onUpdateGaragePart?.({ ...part, status: "installed" });
              onAddServiceRecord?.({
                id: `srv-part-${Date.now()}`,
                vehicleId: currentVehicle.id,
                date: new Date().toISOString().slice(0, 10),
                mileage: currentVehicle.currentMileage,
                title: `Установка запчасти: ${part.brand} ${part.name}`,
                category: part.category || "Подвеска и рулевое",
                totalCost: part.purchasePrice * part.quantity,
                laborCost: 0,
                description: `Деталь со склада гаража (${part.location || "Бокс"}) установлена на автомобиль.`,
                serviceCenter: "Гараж",
                parts: [
                  {
                    id: part.id,
                    name: part.name,
                    brand: part.brand,
                    partNumber: part.partNumber,
                    quantity: part.quantity,
                    unitPrice: part.purchasePrice,
                  },
                ],
              });
            }}
            onSelectTask={(task) => {
              setSelectedTask(task);
              setCurrentScreen("problem_detail");
            }}
            onAddTask={() => {
              setInitialQuickActionType("problem");
              setCurrentScreen("add_event");
            }}
            onToggleTaskStatus={onToggleToFixStatus}
            onOpenAiDiagnostic={() => setCurrentScreen("ai_diagnostics")}
          />
        );

      case "repair":
        return (
          <RepairScreen
            vehicle={currentVehicle}
            schedules={oemSchedules}
            onMarkDone={(item) => {
              onAddServiceRecord?.({
                id: `srv-${Date.now()}`,
                vehicleId: currentVehicle.id,
                date: new Date().toISOString().slice(0, 10),
                mileage: currentVehicle.currentMileage,
                title: item.title,
                category: (item.category as any) || "ТО и замена жидкостей",
                totalCost: 4500,
                laborCost: 1500,
                description: `Выполнен регламент ОЕМ: ${item.title}.`,
                serviceCenter: "Гараж",
                parts: [],
              });
            }}
            onAddScheduleItem={() => {
              setInitialQuickActionType("service");
              setCurrentScreen("add_event");
            }}
            onOpenAiDiagnostic={() => setCurrentScreen("ai_diagnostics")}
          />
        );

      case "expenses":
        return (
          <ExpensesScreen
            vehicle={currentVehicle}
            serviceRecords={serviceRecords}
            fuelRecords={fuelRecords}
            garageParts={garageParts}
            onAddFuel={() => {
              setInitialQuickActionType("fuel");
              setCurrentScreen("add_event");
            }}
            onScanReceipt={() => setCurrentScreen("scan_receipt")}
            onDeleteFuel={onDeleteFuelRecord}
          />
        );

      case "vehicle":
      case "vehicle_profile":
        return (
          <VehicleProfileScreen
            vehicle={currentVehicle}
            onBack={() => setCurrentScreen("home")}
            serviceRecords={serviceRecords}
            fuelRecords={fuelRecords}
            oemSchedules={oemSchedules}
            toFixTasks={toFixTasks}
            garageParts={garageParts}
            onNavigate={navigateTo}
            onOpenAddEvent={() => {
              setInitialQuickActionType("service");
              setCurrentScreen("add_event");
            }}
            onEditVehicle={() => {
              if (typeof onOpenEditVehicleModal === "function") {
                onOpenEditVehicleModal();
              } else if (typeof onOpenAddVehicleModal === "function") {
                onOpenAddVehicleModal();
              }
            }}
            onOpenServiceBook={onOpenServiceBookModal}
            onOpenReminders={onOpenRemindersModal}
            onOpenAiMechanic={onOpenAiMechanicModal}
            onUpdateColor={(color) => {
              if (typeof onUpdateVehicleColor === "function") {
                onUpdateVehicleColor(currentVehicle.id, color);
              }
            }}
            themeMode={themeMode}
            onSelectRecord={(rec) => {
              setSelectedRecord(rec);
              setCurrentScreen("service_detail");
            }}
            onAddServiceRecord={() => {
              setInitialQuickActionType("service");
              setCurrentScreen("add_event");
            }}
          />
        );

      case "service":
        return (
          <ServiceScreen
            vehicle={currentVehicle}
            records={serviceRecords}
            oemSchedules={oemSchedules}
            onSelectRecord={(rec) => {
              setSelectedRecord(rec);
              setCurrentScreen("service_detail");
            }}
            onOpenAddService={() => {
              setPrefilledScanData(null);
              setInitialQuickActionType("service");
              setCurrentScreen("add_event");
            }}
            onOpenScanReceipt={() => setCurrentScreen("scan_receipt")}
            onOpenScanBarcode={() => {
              setInitialQuickActionType("service");
              setCurrentScreen("scan_barcode");
            }}
            onMarkOemDone={(item) => {
              onAddServiceRecord?.({
                id: `srv-${Date.now()}`,
                vehicleId: currentVehicle.id,
                date: new Date().toISOString().slice(0, 10),
                mileage: currentVehicle.currentMileage,
                title: item.title,
                category: "ТО и замена жидкостей",
                totalCost: 4500,
                laborCost: 1500,
                description: `Выполнен плановый регламент: ${item.title}. ОЕМ запчасти: ${item.oemPartHint || "Оригинал"}`,
                serviceCenter: "Гараж",
                parts: [],
              });
            }}
          />
        );

      case "service_detail":
        return selectedRecord ? (
          <ServiceDetailScreen
            record={selectedRecord}
            vehicle={currentVehicle}
            onBack={() => setCurrentScreen("service")}
            onDelete={onDeleteServiceRecord}
          />
        ) : (
          <div className="p-8 text-center text-white">Запись не найдена</div>
        );

      case "to_fix":
        return (
          <ToFixScreen
            vehicle={currentVehicle}
            tasks={toFixTasks}
            onSelectTask={(t) => {
              setSelectedTask(t);
              setCurrentScreen("problem_detail");
            }}
            onAddTask={() => {
              setInitialQuickActionType("problem");
              setCurrentScreen("add_event");
            }}
            onOpenAiDiagnostic={() => setCurrentScreen("ai_diagnostics")}
            onToggleTaskStatus={onToggleToFixStatus}
          />
        );

      case "problem_detail":
        return selectedTask ? (
          <ProblemDetailScreen
            task={selectedTask}
            vehicle={currentVehicle}
            onBack={() => setCurrentScreen("to_fix")}
            onResolve={(taskId) => {
              onToggleToFixStatus(taskId, selectedTask.status);
            }}
            onScheduleRepair={(task) => {
              setInitialQuickActionType("repair");
              setCurrentScreen("add_event");
            }}
          />
        ) : (
          <div className="p-8 text-center text-white">Проблема не найдена</div>
        );

      case "ai_diagnostics":
        return (
          <AiDiagnosticsScreen
            vehicle={currentVehicle}
            serviceRecords={serviceRecords}
            fuelRecords={fuelRecords}
            oemSchedules={oemSchedules}
            toFixTasks={toFixTasks}
            onBack={() => setCurrentScreen("home")}
            onAddTask={(t) => onAddToFixTask(t)}
          />
        );

      case "fuel":
        return (
          <FuelScreen
            vehicle={currentVehicle}
            fuelRecords={fuelRecords}
            onAddFuelRecord={onAddFuelRecord}
            onOpenQuickFuel={() => {
              setInitialQuickActionType("fuel");
              setCurrentScreen("add_event");
            }}
          />
        );

      case "parts":
        return (
          <PartsScreen
            parts={garageParts}
            vehicles={vehicles}
            currentVehicle={currentVehicle}
            onSelectPart={(p) => {
              setSelectedPart(p);
              setCurrentScreen("part_detail");
            }}
            onAddPart={() => {
              setPrefilledScanData(null);
              setInitialQuickActionType("part");
              setCurrentScreen("add_event");
            }}
            onOpenScanBarcode={() => {
              setInitialQuickActionType("part");
              setCurrentScreen("scan_barcode");
            }}
          />
        );

      case "part_detail":
        return selectedPart ? (
          <PartDetailScreen
            part={selectedPart}
            vehicle={currentVehicle}
            onBack={() => setCurrentScreen("parts")}
            onInstall={(part) => {
              onUpdateGaragePart?.({ ...part, status: "installed" });
              onAddServiceRecord?.({
                id: `srv-part-${Date.now()}`,
                vehicleId: currentVehicle.id,
                date: new Date().toISOString().slice(0, 10),
                mileage: currentVehicle.currentMileage,
                title: `Установка запчасти: ${part.brand} ${part.name}`,
                category: part.category || "Подвеска и рулевое",
                totalCost: part.purchasePrice * part.quantity,
                laborCost: 0,
                description: `Деталь со склада гаража (${part.location || "Бокс"}) установлена на автомобиль.`,
                serviceCenter: "Гараж",
                parts: [
                  {
                    id: part.id,
                    name: part.name,
                    brand: part.brand,
                    partNumber: part.partNumber,
                    quantity: part.quantity,
                    unitPrice: part.purchasePrice,
                  },
                ],
              });
            }}
            onDelete={onDeleteGaragePart}
          />
        ) : (
          <div className="p-8 text-center text-white">Запчасть не найдена</div>
        );

      case "projects":
        return (
          <ProjectsScreen
            vehicle={currentVehicle}
            projects={projects}
            onSelectProject={(p) => {
              setSelectedProject(p);
              setCurrentScreen("project_detail");
            }}
            onAddProject={() => {
              const newProj: TuningProject = {
                id: `proj-${Date.now()}`,
                vehicleId: currentVehicle.id,
                title: "Новый проект доработки",
                category: "Тюнинг",
                status: "planning",
                progressPct: 10,
                spent: 0,
                budget: 50000,
                stagesCount: 3,
                completedStages: 0,
                description: "Запланированы работы по дооснащению.",
                updatedAt: new Date().toISOString().slice(0, 10),
              };
              setProjects((prev) => [newProj, ...prev]);
              setSelectedProject(newProj);
              setCurrentScreen("project_detail");
            }}
          />
        );

      case "project_detail":
        return (
          <ProjectDetailScreen
            project={selectedProject}
            vehicle={currentVehicle}
            onBack={() => setCurrentScreen("projects")}
            onOpenBeforeAfter={() => setCurrentScreen("before_after")}
          />
        );

      case "before_after":
        return (
          <BeforeAfterScreen
            vehicle={currentVehicle}
            onBack={() => setCurrentScreen("vehicle_profile")}
          />
        );

      case "add_event":
        return (
          <AddEventScreen
            vehicle={currentVehicle}
            allVehicles={vehicles}
            garageParts={garageParts}
            initialType={initialQuickActionType}
            initialPrefilledData={prefilledScanData || undefined}
            onBack={() => {
              setPrefilledScanData(null);
              setCurrentScreen(
                initialQuickActionType === "fuel" || initialQuickActionType === "expense"
                  ? "expenses"
                  : initialQuickActionType === "part"
                  ? "parts"
                  : "home"
              );
            }}
            onSaveService={(rec) => {
              setPrefilledScanData(null);
              onAddServiceRecord?.({
                id: `srv-${Date.now()}`,
                vehicleId: currentVehicle.id,
                title: rec.title || "Обслуживание",
                category: rec.category || "ТО и замена жидкостей",
                date: rec.date || new Date().toISOString().slice(0, 10),
                mileage: rec.mileage || currentVehicle.currentMileage,
                totalCost: rec.totalCost || 0,
                laborCost: rec.laborCost || 0,
                description: rec.description || "",
                serviceCenter: rec.serviceCenter || "Сервис",
                parts: rec.parts || [],
                receiptImages: rec.receiptImages || [],
              });
            }}
            onSaveFuel={(f) => {
              setPrefilledScanData(null);
              onAddFuelRecord?.({
                id: `fuel-${Date.now()}`,
                vehicleId: currentVehicle.id,
                date: f.date || new Date().toISOString().slice(0, 10),
                mileage: f.mileage || currentVehicle.currentMileage,
                liters: f.liters || 45,
                pricePerLiter: f.pricePerLiter || 59,
                totalCost: f.totalCost || 2650,
                fuelType: f.fuelType || "АИ-95",
                station: f.station || "Газпромнефть",
                calculatedConsumption: 10.4,
                isFullTank: true,
              });
            }}
            onSaveProblem={(p) => {
              setPrefilledScanData(null);
              onAddToFixTask?.({
                id: `tf-${Date.now()}`,
                vehicleId: currentVehicle.id,
                title: p.title || "Неисправность",
                category: (p.category as any) || "Подвеска и рулевое",
                priority: p.priority || "medium",
                estimatedCost: p.estimatedCost,
                description: p.description,
                status: "pending",
              });
            }}
            onSavePart={(part) => {
              setPrefilledScanData(null);
              onAddGaragePart?.({
                id: `prt-${Date.now()}`,
                vehicleId: currentVehicle.id,
                name: part.name || "Запчасть",
                brand: part.brand || "OEM",
                partNumber: part.partNumber || "SKU-100",
                category: (part.category as any) || "ТО и замена жидкостей",
                quantity: part.quantity || 1,
                purchasePrice: part.purchasePrice || 1000,
                purchaseDate: new Date().toISOString().slice(0, 10),
                status: "in_stock",
                location: part.location || "Полка A1",
              });
            }}
          />
        );

      case "scan_barcode":
        return (
          <BarcodeScannerScreen
            vehicle={currentVehicle}
            allVehicles={vehicles}
            garageParts={garageParts}
            defaultTarget={initialQuickActionType === "part" ? "part" : "service"}
            onBack={() =>
              setCurrentScreen(initialQuickActionType === "part" ? "parts" : "home")
            }
            onApplyResult={handleApplyScanResult}
          />
        );

      case "scan_receipt":
        return (
          <ScanReceiptScreen
            vehicle={currentVehicle}
            onBack={() => setCurrentScreen("service")}
            onConfirmRecord={(rec) => {
              onAddServiceRecord?.({
                id: `srv-scan-${Date.now()}`,
                vehicleId: currentVehicle.id,
                title: rec.title || "Заказ-наряд",
                category: rec.category || "ТО и замена жидкостей",
                date: rec.date || new Date().toISOString().slice(0, 10),
                mileage: currentVehicle.currentMileage,
                totalCost: rec.totalCost || 0,
                laborCost: rec.laborCost || 0,
                description: rec.description || "Распознано AI OCR",
                serviceCenter: rec.serviceCenter || "Сервис",
                parts: rec.parts || [],
                receiptImages: rec.receiptImages || [],
              });
            }}
          />
        );

      case "notifications":
        return (
          <NotificationsScreen
            onBack={() => setCurrentScreen("home")}
            onNavigate={(s) => setCurrentScreen(s)}
            themeMode={themeMode}
            notifications={generatedNotifications}
          />
        );

      case "profile":
        return (
          <ProfileScreen
            vehicles={vehicles}
            serviceRecords={serviceRecords}
            garageParts={garageParts}
            onNavigate={(s) => setCurrentScreen(s)}
            onOpenBackup={onOpenDataBackupModal}
            onOpenServiceBook={onOpenServiceBookModal}
            onOpenReminders={onOpenRemindersModal}
            onOpenAddVehicle={onOpenAddVehicleModal}
            onSwitchToWebView={isWeb ? undefined : onSwitchToWebView}
            onLogout={() => {
              onLogout?.();
              setCurrentScreen("profile");
            }}
            onAuthSuccess={onAuthSuccess}
          />
        );

      case "settings":
        return (
          <SettingsScreen
            onBack={() => setCurrentScreen("profile")}
            themeMode={themeMode}
            onThemeChange={(mode) => {
              setThemeMode(mode);
              saveThemePreference(mode);
            }}
            darkVariant={darkVariant}
            onDarkVariantChange={(variant: DarkVariant) => {
              setDarkVariant(variant);
              saveDarkVariant(variant);
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`h-[100dvh] w-full flex flex-col items-center justify-start p-0 overflow-hidden transition-colors ${
        themeMode === "dark"
          ? "bg-[#0D131D] text-[#F8FAFC]"
          : "bg-[#F4F5F8] text-[#0F172A]"
      } ${isWeb ? "" : "sm:py-6"}`}
    >
      {/* Top Floating Control Bar (Desktop/Preview mode toggle) */}
      {!isWeb && (
      <header
        className={`mobile-preview-controls w-full max-w-[430px] shrink-0 px-3 sm:px-4 py-2 flex items-center justify-between z-40 backdrop-blur-md rounded-2xl mb-2 sm:mb-3 border text-xs shadow-sm transition-colors ${
          themeMode === "dark"
            ? "bg-[#17202E]/95 border-[#243044] text-[#F8FAFC]"
            : "bg-[#FFFFFF]/95 border-[#E2E8F0] text-[#0F172A]"
        }`}
      >
        <div className="flex items-center gap-2">
          <img src="/garage-ai-mark.png" alt="GarageAI" className="w-6 h-6 rounded-lg object-contain" />
          <span className="font-bold tracking-tight text-xs">GarageAI</span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded hidden xs:inline ${
              themeMode === "dark"
                ? "text-[#94A3B8] bg-[#1E293B]"
                : "text-[#536171] bg-[#F8FAFC] border border-[#E2E8F0]"
            }`}
          >
            iOS / Android
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Switch to Web view if available */}
          {onSwitchToWebView && (
            <button
              onClick={onSwitchToWebView}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border transition cursor-pointer font-semibold text-[11px] ${
                themeMode === "dark"
                  ? "bg-[#1E293B] border-[#243044] text-[#94A3B8] hover:text-[#F8FAFC]"
                  : "bg-[#F8FAFC] border-[#E2E8F0] text-[#536171] hover:text-[#0F172A]"
              }`}
              title="Переключиться на Web-версию"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Web</span>
            </button>
          )}

          {/* Device frame switch */}
          <button
            onClick={() =>
              setDeviceFrameMode(deviceFrameMode === "frame" ? "full" : "frame")
            }
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border transition cursor-pointer font-semibold text-[11px] ${
              themeMode === "dark"
                ? "bg-[#1E293B] border-[#243044] text-[#94A3B8] hover:text-[#F8FAFC]"
                : "bg-[#F8FAFC] border-[#E2E8F0] text-[#536171] hover:text-[#0F172A]"
            }`}
            title="Переключить рамку смартфона"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{deviceFrameMode === "frame" ? "Без рамки" : "В рамке"}</span>
          </button>
        </div>
      </header>
      )}

      {/* Main Mobile Device Container (Matches 360-430px mobile specs) */}
      <div
        data-theme-variant={darkVariant}
        className={`w-full mx-auto relative flex flex-1 min-h-0 flex-col justify-between overflow-hidden shadow-2xl transition-all ${
          isWeb ? "max-w-[820px]" : "max-w-[430px]"
        } ${
          themeMode === "dark"
            ? "bg-[#0d131d] text-white"
            : "bg-[#F4F5F8] text-[#0F172A]"
        } ${
          !isWeb && deviceFrameMode === "frame"
            ? themeMode === "dark"
              ? "sm:flex-none sm:rounded-[44px] sm:border-[8px] sm:border-neutral-800 sm:h-[840px] sm:max-h-[calc(100vh-60px)] sm:min-h-[640px] sm:ring-1 sm:ring-neutral-700"
              : "sm:flex-none sm:rounded-[44px] sm:border-[8px] sm:border-[#1E293B] sm:h-[840px] sm:max-h-[calc(100vh-60px)] sm:min-h-[640px] sm:ring-1 sm:ring-[#E2E8F0]"
            : ""
        }`}
      >
        {/* Dynamic Island / Native Notch Simulation */}
        {!isWeb && (
        <div
          className={`w-full pt-3 pb-1 px-7 flex items-center justify-between z-30 pointer-events-none transition-colors ${
            themeMode === "dark"
              ? "bg-[#0d131d] text-slate-300"
              : "bg-[#F4F5F8] text-slate-700"
          }`}
        >
          <div className="text-[12px] font-black font-mono tracking-tight">
            9:41
          </div>
          {/* Dynamic Island pill */}
          <div className="w-24 h-5 rounded-full bg-black border border-neutral-800/80 flex items-center justify-center gap-2 px-2 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-neutral-900 border border-neutral-700" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono opacity-80">
            <span>5G</span>
            <div className="w-4 h-2.5 rounded-sm border border-current p-0.5 flex items-center">
              <div className="w-full h-full bg-emerald-400 rounded-2xs" />
            </div>
          </div>
        </div>
        )}

        {/* Scrollable Screen Content */}
        <main
          className={`flex-1 overflow-y-auto no-scrollbar relative flex flex-col transition-colors ${
            themeMode === "dark"
              ? "bg-[#0d131d] text-white"
              : "bg-[#F4F5F8] text-[#0F172A]"
          }`}
        >
          {renderScreen()}
        </main>

        {/* Persistent Native Mobile Bottom Bar */}
        {showBottomBar && (
          <MobileBottomBar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onQuickAction={() => setIsQuickActionOpen(true)}
            themeMode={themeMode}
            badgeCounts={{
              service: serviceRecords.filter((s) => s.vehicleId === currentVehicle.id).length,
              repair: oemSchedules.filter(
                (s) =>
                  (s.vehicleId === currentVehicle.id || s.vehicleId === "all") &&
                  currentVehicle.currentMileage - (s.lastDoneKm || 0) >= s.intervalKm
              ).length,
              garage: toFixTasks.filter(
                (t) => t.vehicleId === currentVehicle.id && t.status !== "completed"
              ).length,
            }}
          />
        )}

        {/* Native Home Indicator Bar */}
        {!isWeb && (
        <div
          className={`w-full py-2 flex items-center justify-center pointer-events-none border-t transition-colors ${
            themeMode === "dark"
              ? "bg-[#0d131d] border-[#1c2637]"
              : "bg-white border-[#E2E8F0]"
          }`}
        >
          <div
            className={`w-32 h-1 rounded-full ${
              themeMode === "dark" ? "bg-slate-700" : "bg-neutral-300"
            }`}
          />
        </div>
        )}

        {/* Quick Action Sheet Modal */}
        <QuickActionSheet
          isOpen={isQuickActionOpen}
          onClose={() => setIsQuickActionOpen(false)}
          onSelectAction={handleSelectQuickAction}
          carName={`${currentVehicle.make} ${currentVehicle.model}`}
        />
      </div>
    </div>
  );
};

