import React, { lazy, Suspense, useState, useEffect } from "react";
import {
  Home,
  BookOpen,
  ClipboardCheck,
  ScanLine,
  Paintbrush,
  LayoutDashboard,
  Wrench,
  Wallet,
  Layers,
  Sparkles,
  FileText,
  Car,
  Plus,
  Database,
  Sun,
  Moon,
  Download,
  Monitor,
  Search,
  ChevronDown,
} from "lucide-react";
import {
  Vehicle,
  ServiceRecord,
  FuelRecord,
  OemScheduleItem,
  GaragePart,
  ToFixTask,
  TuningStage,
  MaintenanceCategory,
} from "./types";
import {
  INITIAL_VEHICLES,
  INITIAL_SERVICE_RECORDS,
  INITIAL_FUEL_RECORDS,
  INITIAL_OEM_SCHEDULES,
  INITIAL_GARAGE_PARTS,
  INITIAL_TO_FIX_TASKS,
  INITIAL_TUNING_STAGES,
} from "./mockData";
import {
  fetchGarageData,
  createVehicle as apiCreateVehicle,
  updateVehicle as apiUpdateVehicle,
  updateMileage as apiUpdateMileage,
  deleteVehicle as apiDeleteVehicle,
  createServiceRecord as apiCreateServiceRecord,
  updateServiceRecord as apiUpdateServiceRecord,
  deleteServiceRecord as apiDeleteServiceRecord,
  createFuelRecord as apiCreateFuelRecord,
  deleteFuelRecord as apiDeleteFuelRecord,
  createGaragePart as apiCreateGaragePart,
  updateGaragePart as apiUpdateGaragePart,
  deleteGaragePart as apiDeleteGaragePart,
  installGaragePart as apiInstallGaragePart,
  createToFixTask as apiCreateToFixTask,
  updateToFixTask as apiUpdateToFixTask,
  completeToFixTask as apiCompleteToFixTask,
  updateOemScheduleItem as apiUpdateOemScheduleItem,
  saveOemScheduleItems as apiSaveOemScheduleItems,
  createTuningStage as apiCreateTuningStage,
  updateTuningStage as apiUpdateTuningStage,
  deleteTuningStage as apiDeleteTuningStage,
  FullGarageData,
} from "./api";
import { CarHeader } from "./components/CarHeader";
import { Dashboard } from "./components/Dashboard";
import { ServiceLogView } from "./components/ServiceLogView";
import { AddServiceModal } from "./components/AddServiceModal";
import { ReceiptScannerModal } from "./components/ReceiptScannerModal";
import { OemScheduleView } from "./components/OemScheduleView";
import { ExpensesFuelView } from "./components/ExpensesFuelView";
import { GarageInventoryToFixView } from "./components/GarageInventoryToFixView";
import { AiMechanicModal } from "./components/AiMechanicModal";
import { TuningProjectView } from "./components/TuningProjectView";
import { ServiceBookModal } from "./components/ServiceBookModal";
import { VehicleModal } from "./components/VehicleModal";
import { RemindersModal } from "./components/RemindersModal";
import { DataSyncBackupModal } from "./components/DataSyncBackupModal";
import { InstallPcModal } from "./components/InstallPcModal";
import { CommandPaletteModal } from "./components/CommandPaletteModal";
import { Smartphone } from "lucide-react";

type ActiveView =
  | "dashboard"
  | "service_log"
  | "oem_schedule"
  | "expenses"
  | "garage_inventory"
  | "tuning";

const MobileApp = lazy(() =>
  import("./mobile/MobileApp").then(({ MobileApp }) => ({ default: MobileApp }))
);

function readCachedArray<T>(key: string, fallback: T[]): T[] {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  // Theme state: "light" vs "dark" (switchable via button)
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("garagehub_theme");
      if (saved === "light" || saved === "dark") return saved;
      if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    } catch {
      // fallback
    }
    return "dark";
  });

  useEffect(() => {
    try {
      localStorage.setItem("garagehub_theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      }
    } catch {
      // ignore
    }
  }, [theme]);

  // Mobile vs Web view mode (Defaulting to Mobile per user focus)
  const [appPlatform, setAppPlatform] = useState<"mobile" | "web">(() => {
    try {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("view") === "web") return "web";
        if (urlParams.get("view") === "mobile") return "mobile";
        const saved = localStorage.getItem("garagehub_platform_mode");
        if (saved === "web" || saved === "mobile") return saved;
      }
    } catch {
      // fallback
    }
    return "mobile";
  });

  const handleSetPlatform = (mode: "mobile" | "web") => {
    setAppPlatform(mode);
    try {
      localStorage.setItem("garagehub_platform_mode", mode);
    } catch {
      // ignore
    }
  };
  // Persistent state initialized from localStorage or mockData
  const [vehicles, setVehicles] = useState<Vehicle[]>(() =>
    readCachedArray("garagehub_vehicles", INITIAL_VEHICLES)
  );

  const [activeVehicleId, setActiveVehicleId] = useState<string>(() => {
    return vehicles[0]?.id || "car-1";
  });

  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>(() =>
    readCachedArray("garagehub_service_records", INITIAL_SERVICE_RECORDS)
  );

  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>(() =>
    readCachedArray("garagehub_fuel_records", INITIAL_FUEL_RECORDS)
  );

  const [oemSchedules, setOemSchedules] = useState<OemScheduleItem[]>(() =>
    readCachedArray("garagehub_oem_schedules", INITIAL_OEM_SCHEDULES)
  );

  const [garageParts, setGarageParts] = useState<GaragePart[]>(() =>
    readCachedArray("garagehub_garage_parts", INITIAL_GARAGE_PARTS)
  );

  const [toFixTasks, setToFixTasks] = useState<ToFixTask[]>(() =>
    readCachedArray("garagehub_to_fix_tasks", INITIAL_TO_FIX_TASKS)
  );

  const [tuningStages, setTuningStages] = useState<TuningStage[]>(() =>
    readCachedArray("garagehub_tuning_stages", INITIAL_TUNING_STAGES)
  );

  // Current view
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");

  // Server state
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showBackupModal, setShowBackupModal] = useState<boolean>(false);

  // Active Modals
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showScanReceiptModal, setShowScanReceiptModal] = useState(false);
  const [showAiMechanicModal, setShowAiMechanicModal] = useState(false);
  const [showServiceBookModal, setShowServiceBookModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleModalMode, setVehicleModalMode] = useState<"edit" | "add">("edit");
  const [showRemindersModal, setShowRemindersModal] = useState(false);
  const [showInstallPcModal, setShowInstallPcModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Pre-fill data for AddServiceModal
  const [serviceModalInitialData, setServiceModalInitialData] = useState<
    (Partial<ServiceRecord> & { completedTaskId?: string }) | undefined
  >(undefined);

  // Fetch full dataset from backend on load
  useEffect(() => {
    let active = true;
    fetchGarageData()
      .then((data) => {
        if (!active) return;
        setIsOnline(true);
        if (data.vehicles && data.vehicles.length > 0) {
          setVehicles(data.vehicles);
          setActiveVehicleId((prev) => {
            const exists = data.vehicles.some((v) => v.id === prev);
            return exists ? prev : data.vehicles[0].id;
          });
        }
        if (data.serviceRecords) setServiceRecords(data.serviceRecords);
        if (data.fuelRecords) setFuelRecords(data.fuelRecords);
        if (data.oemSchedules) setOemSchedules(data.oemSchedules);
        if (data.garageParts) setGarageParts(data.garageParts);
        if (data.toFixTasks) setToFixTasks(data.toFixTasks);
        if (data.tuningStages) setTuningStages(data.tuningStages);
      })
      .catch((err) => {
        console.warn("Backend server not responding, running with local cache:", err);
        setIsOnline(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Save to localStorage as offline fallback
  useEffect(() => {
    localStorage.setItem("garagehub_vehicles", JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem(
      "garagehub_service_records",
      JSON.stringify(serviceRecords)
    );
  }, [serviceRecords]);

  useEffect(() => {
    localStorage.setItem("garagehub_fuel_records", JSON.stringify(fuelRecords));
  }, [fuelRecords]);

  useEffect(() => {
    localStorage.setItem(
      "garagehub_oem_schedules",
      JSON.stringify(oemSchedules)
    );
  }, [oemSchedules]);

  useEffect(() => {
    localStorage.setItem("garagehub_garage_parts", JSON.stringify(garageParts));
  }, [garageParts]);

  useEffect(() => {
    localStorage.setItem("garagehub_to_fix_tasks", JSON.stringify(toFixTasks));
  }, [toFixTasks]);

  useEffect(() => {
    localStorage.setItem("garagehub_tuning_stages", JSON.stringify(tuningStages));
  }, [tuningStages]);

  // Current selected vehicle
  const currentVehicle =
    vehicles.find((v) => v.id === activeVehicleId) || vehicles[0] || INITIAL_VEHICLES[0];

  const currentRecords = serviceRecords.filter(
    (r) => r.vehicleId === currentVehicle.id
  );

  // Handlers
  const handleUpdateMileage = (newMileage: number) => {
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === currentVehicle.id
          ? {
              ...v,
              currentMileage: newMileage,
              lastMileageUpdate: new Date().toLocaleDateString("ru-RU"),
            }
          : v
      )
    );
    apiUpdateMileage(currentVehicle.id, newMileage).catch(console.error);
  };

  const handleSaveServiceRecord = (
    newRecord: ServiceRecord,
    usedPartIds?: string[],
    completedTaskId?: string
  ) => {
    // Add or update record locally
    setServiceRecords((prev) => {
      const exists = prev.some((r) => r.id === newRecord.id);
      if (exists) {
        return prev.map((r) => (r.id === newRecord.id ? newRecord : r));
      }
      return [newRecord, ...prev];
    });

    // Automatically update car's current mileage if new record mileage is higher
    if (newRecord.mileage > currentVehicle.currentMileage) {
      handleUpdateMileage(newRecord.mileage);
    }

    // Mark task completed if linked
    if (completedTaskId) {
      setToFixTasks((prev) =>
        prev.map((t) => (t.id === completedTaskId ? { ...t, status: "completed" } : t))
      );
    }

    // Mark garage parts installed if used (matching vehicleId + non-empty partNumber or explicit usedPartIds)
    const usedIdsSet = new Set(usedPartIds || []);
    const partNumbers = newRecord.parts
      .map((p) => (p.partNumber || "").trim().toLowerCase())
      .filter(Boolean);
    if (partNumbers.length > 0 || usedIdsSet.size > 0) {
      setGarageParts((prev) =>
        prev.map((gp) => {
          const gpSku = (gp.partNumber || "").trim().toLowerCase();
          const matchesVehicle = gp.vehicleId === newRecord.vehicleId || gp.vehicleId === "all";
          if (
            usedIdsSet.has(gp.id) ||
            (matchesVehicle && gpSku.length > 0 && partNumbers.includes(gpSku))
          ) {
            return { ...gp, status: "installed" };
          }
          return gp;
        })
      );
    }

    // Keep edit and create operations separate so editing never duplicates a record.
    const saveRequest = serviceRecords.some((record) => record.id === newRecord.id)
      ? apiUpdateServiceRecord(newRecord.id, newRecord)
      : apiCreateServiceRecord({ ...newRecord, completedTaskId, installedPartIds: usedPartIds } as any);
    saveRequest.catch(console.error);

    setShowAddServiceModal(false);
    setServiceModalInitialData(undefined);
  };

  const handleDeleteServiceRecord = (recordId: string) => {
    setServiceRecords((prev) => prev.filter((r) => r.id !== recordId));
    apiDeleteServiceRecord(recordId).catch(console.error);
  };

  const handleAddFuelRecord = (fuelRecord: FuelRecord) => {
    setFuelRecords((prev) => [fuelRecord, ...prev]);
    if (fuelRecord.mileage > currentVehicle.currentMileage) {
      handleUpdateMileage(fuelRecord.mileage);
    }
    apiCreateFuelRecord(fuelRecord).catch(console.error);
  };

  // When marking an OEM schedule item done
  const handleMarkOemDone = (item: OemScheduleItem) => {
    const today = new Date().toISOString().split("T")[0];
    setOemSchedules((prev) =>
      prev.map((s) =>
        s.id === item.id
          ? {
              ...s,
              lastDoneKm: currentVehicle.currentMileage,
              lastDoneDate: today,
            }
          : s
      )
    );

    apiUpdateOemScheduleItem(item.id, {
      lastDoneKm: currentVehicle.currentMileage,
      lastDoneDate: today,
    }).catch(console.error);

    // Prompt to create a service record
    setServiceModalInitialData({
      category: (item.category as MaintenanceCategory) || "ТО и замена жидкостей",
      title: item.title,
      description: `Регламентная процедура: ${item.title}. Интервал: ${item.intervalKm} км.`,
      mileage: currentVehicle.currentMileage,
      date: today,
    });
    setShowAddServiceModal(true);
  };

  // When installing a garage part in service
  const handleInstallPartInService = (part: GaragePart) => {
    setServiceModalInitialData({
      category: part.category,
      title: `Замена / Установка: ${part.name}`,
      description: `Установка детали со склада гаража: ${part.brand} ${part.name} (${part.partNumber})`,
      parts: [
        {
          id: "gp-used-" + part.id,
          name: part.name,
          brand: part.brand,
          partNumber: part.partNumber,
          quantity: part.quantity,
          unitPrice: part.purchasePrice,
        },
      ],
      laborCost: 1500,
      mileage: currentVehicle.currentMileage,
    });
    setShowAddServiceModal(true);
  };

  // Add vehicle
  const handleAddVehicle = (newV: Vehicle) => {
    setVehicles((prev) => [...prev, newV]);
    setActiveVehicleId(newV.id);
    apiCreateVehicle(newV).catch(console.error);
  };

  // Save vehicle edits
  const handleSaveVehicle = (updatedV: Vehicle) => {
    setVehicles((prev) => prev.map((v) => (v.id === updatedV.id ? updatedV : v)));
    apiUpdateVehicle(updatedV.id, updatedV).catch(console.error);
  };

  // Quick update vehicle color
  const handleUpdateVehicleColor = (newColor: string, targetVehicleId?: string) => {
    if (!/^#[0-9a-f]{6}$/i.test(newColor)) return;
    const idToUpdate = targetVehicleId || currentVehicle.id;
    setVehicles((prev) =>
      prev.map((v) => (v.id === idToUpdate ? { ...v, colorHex: newColor } : v))
    );
    apiUpdateVehicle(idToUpdate, { colorHex: newColor }).catch(console.error);
  };

  // Quick update vehicle 3D model
  const handleUpdateVehicleModel3d = (model3dUrl: string) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === currentVehicle.id ? { ...v, model3dUrl } : v))
    );
    apiUpdateVehicle(currentVehicle.id, { model3dUrl }).catch(console.error);
  };

  // Delete vehicle
  const handleDeleteVehicle = (vehicleId: string) => {
    const remaining = vehicles.filter((v) => v.id !== vehicleId);
    if (remaining.length > 0) {
      setVehicles(remaining);
      setActiveVehicleId(remaining[0].id);
    }
    apiDeleteVehicle(vehicleId).catch(console.error);
  };

  // Backup restore
  const handleImportBackup = (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.vehicle) {
        setVehicles((prev) => {
          const exists = prev.some((v) => v.id === data.vehicle.id);
          return exists
            ? prev.map((v) => (v.id === data.vehicle.id ? data.vehicle : v))
            : [...prev, data.vehicle];
        });
        setActiveVehicleId(data.vehicle.id);
      }
      if (data.serviceRecords && Array.isArray(data.serviceRecords)) {
        setServiceRecords(data.serviceRecords);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDataReloaded = (data: FullGarageData) => {
    setVehicles(data.vehicles);
    if (data.vehicles.length > 0) {
      setActiveVehicleId(data.vehicles[0].id);
    }
    setServiceRecords(data.serviceRecords);
    setFuelRecords(data.fuelRecords);
    setOemSchedules(data.oemSchedules);
    setGarageParts(data.garageParts);
    setToFixTasks(data.toFixTasks);
    if (data.tuningStages) setTuningStages(data.tuningStages);
  };

  const handleAddServiceRecord = (record: ServiceRecord) => {
    handleSaveServiceRecord(record);
  };

  const handleAddGaragePart = (part: GaragePart) => {
    setGarageParts((prev) => [part, ...prev]);
    apiCreateGaragePart(part).catch(console.error);
  };

  const handleDeleteGaragePart = (id: string) => {
    setGarageParts((prev) => prev.filter((p) => p.id !== id));
    apiDeleteGaragePart(id).catch(console.error);
  };

  const handleUpdateGaragePart = (part: GaragePart) => {
    setGarageParts((prev) => prev.map((p) => (p.id === part.id ? part : p)));
    if (part.status === "installed") {
      apiInstallGaragePart(part.id).catch(() =>
        apiUpdateGaragePart(part.id, part).catch(console.error)
      );
    } else {
      apiUpdateGaragePart(part.id, part).catch(console.error);
    }
  };

  const handleCreateToFixTask = (task: ToFixTask) => {
    setToFixTasks((prev) => [task, ...prev]);
    apiCreateToFixTask(task).catch(console.error);
  };

  const handleToggleToFixStatus = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "completed" ? "pending" : "completed";
    setToFixTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: nextStatus as any } : t))
    );
    if (nextStatus === "completed") {
      apiCompleteToFixTask(id).catch(console.error);
    } else {
      apiUpdateToFixTask(id, { status: nextStatus as ToFixTask["status"] }).catch(console.error);
    }
  };

  const handleAddTuningStage = (stage: TuningStage) => {
    setTuningStages((prev) => [...prev, stage]);
    apiCreateTuningStage(stage).catch(console.error);
  };

  const handleUpdateTuningStage = (stage: TuningStage) => {
    setTuningStages((prev) => prev.map((s) => (s.id === stage.id ? stage : s)));
    apiUpdateTuningStage(stage.id, stage).catch(console.error);
  };

  const handleDeleteTuningStage = (id: string) => {
    setTuningStages((prev) => prev.filter((s) => s.id !== id));
    apiDeleteTuningStage(id).catch(console.error);
  };

  if (appPlatform === "mobile") {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
        <MobileApp
          vehicles={vehicles}
          currentVehicle={currentVehicle}
          onSelectVehicle={(veh) => setActiveVehicleId(veh.id)}
          serviceRecords={serviceRecords}
          fuelRecords={fuelRecords}
          oemSchedules={oemSchedules}
          toFixTasks={toFixTasks}
          garageParts={garageParts}
          onAddServiceRecord={handleAddServiceRecord}
          onDeleteServiceRecord={handleDeleteServiceRecord}
          onAddFuelRecord={handleAddFuelRecord}
          onAddGaragePart={handleAddGaragePart}
          onDeleteGaragePart={handleDeleteGaragePart}
          onUpdateGaragePart={handleUpdateGaragePart}
          onAddToFixTask={handleCreateToFixTask}
          onToggleToFixStatus={handleToggleToFixStatus}
          onUpdateMileage={handleUpdateMileage}
          onOpenAddVehicleModal={() => {
            setVehicleModalMode("add");
            setShowVehicleModal(true);
          }}
          onOpenEditVehicleModal={() => {
            setVehicleModalMode("edit");
            setShowVehicleModal(true);
          }}
          onOpenDataBackupModal={() => setShowBackupModal(true)}
          onSwitchToWebView={() => handleSetPlatform("web")}
          onOpenServiceBookModal={() => setShowServiceBookModal(true)}
          onOpenRemindersModal={() => setShowRemindersModal(true)}
          onOpenAiMechanicModal={() => setShowAiMechanicModal(true)}
          onOpenScanReceiptModal={() => setShowScanReceiptModal(true)}
          onOpenAddServiceModal={(data) => {
            setServiceModalInitialData(data);
            setShowAddServiceModal(true);
          }}
          onUpdateVehicleColor={(vehicleId, color) => handleUpdateVehicleColor(color, vehicleId)}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
          onMarkOemDone={handleMarkOemDone}
          tuningStages={tuningStages}
          onAddTuningStage={handleAddTuningStage}
        />

        {/* Full Parity Modals accessible from Mobile App */}
        {showAddServiceModal && (
          <AddServiceModal
            vehicle={currentVehicle}
            garageParts={garageParts}
            toFixTasks={toFixTasks}
            onClose={() => {
              setShowAddServiceModal(false);
              setServiceModalInitialData(undefined);
            }}
            onSave={handleSaveServiceRecord}
            initialData={serviceModalInitialData}
          />
        )}

        {showScanReceiptModal && (
          <ReceiptScannerModal
            vehicle={currentVehicle}
            onClose={() => setShowScanReceiptModal(false)}
            onApplyService={(serviceData) => {
              setServiceModalInitialData(serviceData);
              setShowAddServiceModal(true);
            }}
            onApplyFuel={(fuelData) => {
              handleAddFuelRecord({
                id: "fuel-" + Date.now(),
                vehicleId: currentVehicle.id,
                date: fuelData.date || new Date().toISOString().split("T")[0],
                mileage: fuelData.mileage || currentVehicle.currentMileage,
                liters: fuelData.liters || 50,
                pricePerLiter: fuelData.pricePerLiter || 60,
                totalCost: fuelData.totalCost || 3000,
                fuelType: fuelData.fuelType || "АИ-95",
                isFullTank: true,
                station: fuelData.station || "АЗС",
              });
            }}
          />
        )}

        {showAiMechanicModal && (
          <AiMechanicModal
            vehicle={currentVehicle}
            serviceRecords={serviceRecords}
            onClose={() => setShowAiMechanicModal(false)}
            onAddTaskToFix={(task) => {
              handleCreateToFixTask(task);
              setShowAiMechanicModal(false);
            }}
          />
        )}

        {showServiceBookModal && (
          <ServiceBookModal
            vehicle={currentVehicle}
            serviceRecords={serviceRecords}
            onClose={() => setShowServiceBookModal(false)}
            onImportBackup={handleImportBackup}
          />
        )}

        {showVehicleModal && (
          <VehicleModal
            currentVehicle={currentVehicle}
            allVehicles={vehicles}
            initialMode={vehicleModalMode}
            onClose={() => setShowVehicleModal(false)}
            onSaveVehicle={handleSaveVehicle}
            onAddVehicle={handleAddVehicle}
            onDeleteVehicle={handleDeleteVehicle}
          />
        )}

        {showRemindersModal && (
          <RemindersModal
            vehicle={currentVehicle}
            toFixTasks={toFixTasks}
            oemSchedules={oemSchedules}
            onClose={() => setShowRemindersModal(false)}
            onOpenOemSchedule={() => setShowRemindersModal(false)}
            onOpenInventoryToFix={() => setShowRemindersModal(false)}
            onResolveOem={handleMarkOemDone}
          />
        )}

        {showBackupModal && (
          <DataSyncBackupModal
            isOpen={showBackupModal}
            onClose={() => setShowBackupModal(false)}
            onDataReloaded={handleDataReloaded}
            isOnline={isOnline}
          />
        )}

        {showInstallPcModal && (
          <InstallPcModal
            deferredPrompt={deferredInstallPrompt}
            onClose={() => setShowInstallPcModal(false)}
            onInstallSuccess={() => setShowInstallPcModal(false)}
          />
        )}

        <CommandPaletteModal
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          vehicles={vehicles}
          currentVehicle={currentVehicle}
          serviceRecords={serviceRecords}
          garageParts={garageParts}
          toFixTasks={toFixTasks}
          oemSchedules={oemSchedules}
          onSelectVehicle={(v) => setActiveVehicleId(v.id)}
          onNavigateView={() => {}}
          onOpenAddService={() => {
            setServiceModalInitialData(undefined);
            setShowAddServiceModal(true);
          }}
          onOpenScanReceipt={() => setShowScanReceiptModal(true)}
          onOpenAiMechanic={() => setShowAiMechanicModal(true)}
          onOpenServiceBook={() => setShowServiceBookModal(true)}
          onOpenBackupModal={() => setShowBackupModal(true)}
          onToggleTheme={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
          theme={theme}
        />
      </Suspense>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col selection:bg-red-500 selection:text-white transition-colors duration-200 ${
        theme === "light"
          ? "bg-slate-100 text-slate-900"
          : "bg-[#06090e] text-slate-100"
      }`}
    >
      <a href="#main-content" className="skip-link">Перейти к содержимому</a>
      {/* 3-Zone Top Application Bar (Cockpit Header Contract) */}
      <nav
        className={`app-navigation sticky top-0 z-40 px-3 sm:px-6 py-2.5 border-b transition-colors duration-150 ${
          theme === "light"
            ? "bg-white border-slate-200 text-slate-900"
            : "bg-[#111827] border-[#1f2937] text-white"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            aria-label="GarageHub — главная"
            aria-current={activeView === "dashboard" ? "page" : undefined}
            onClick={() => setActiveView("dashboard")}
            className="text-base sm:text-lg font-extrabold tracking-tight whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2"
          >
            <span className="text-red-600 dark:text-red-500">Garage</span>
            <span className={theme === "light" ? "text-slate-900" : "text-white"}>Hub</span>
          </button>

          {/* Zone 2: Clean Single-Line Navigation Links */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2 overflow-x-auto no-scrollbar">
            <button
              aria-current={activeView === "dashboard" ? "page" : undefined}
              onClick={() => setActiveView("dashboard")}
              className={`app-nav-item px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                activeView === "dashboard"
                  ? theme === "light"
                    ? "text-slate-950 font-bold"
                    : "text-white font-bold"
                  : theme === "light"
                  ? "text-slate-600 hover:text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Главная</span>
            </button>

            <button
              aria-current={activeView === "service_log" ? "page" : undefined}
              onClick={() => setActiveView("service_log")}
              className={`app-nav-item px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                activeView === "service_log"
                  ? theme === "light"
                    ? "text-slate-950 font-bold"
                    : "text-white font-bold"
                  : theme === "light"
                  ? "text-slate-600 hover:text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Журнал · {currentRecords.length}</span>
            </button>

            <button
              aria-current={activeView === "oem_schedule" ? "page" : undefined}
              onClick={() => setActiveView("oem_schedule")}
              className={`app-nav-item px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                activeView === "oem_schedule"
                  ? theme === "light"
                    ? "text-slate-950 font-bold"
                    : "text-white font-bold"
                  : theme === "light"
                  ? "text-slate-600 hover:text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Регламент ТО</span>
            </button>

            <button
              aria-current={activeView === "expenses" ? "page" : undefined}
              onClick={() => setActiveView("expenses")}
              className={`app-nav-item px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                activeView === "expenses"
                  ? theme === "light"
                    ? "text-slate-950 font-bold"
                    : "text-white font-bold"
                  : theme === "light"
                  ? "text-slate-600 hover:text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Расходы</span>
            </button>

            <button
              aria-current={activeView === "garage_inventory" ? "page" : undefined}
              onClick={() => setActiveView("garage_inventory")}
              className={`app-nav-item px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                activeView === "garage_inventory"
                  ? theme === "light"
                    ? "text-slate-950 font-bold"
                    : "text-white font-bold"
                  : theme === "light"
                  ? "text-slate-600 hover:text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Склад</span>
            </button>

            <button
              aria-current={activeView === "tuning" ? "page" : undefined}
              onClick={() => setActiveView("tuning")}
              className={`app-nav-item px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                activeView === "tuning"
                  ? theme === "light"
                    ? "text-slate-950 font-bold"
                    : "text-white font-bold"
                  : theme === "light"
                  ? "text-slate-600 hover:text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Тюнинг</span>
            </button>
          </div>

          {/* Zone 3: Global Search (Cmd+K), Tools Menu, Theme Switcher & Primary Action */}
          <div className="app-navigation-actions flex items-center gap-2 shrink-0 relative">
            {/* Global Search / Command Palette Trigger */}
            <button
              type="button"
              onClick={() => setShowCommandPalette(true)}
              className={`app-nav-utility px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 cursor-pointer border whitespace-nowrap shrink-0 ${
                theme === "light"
                  ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  : "bg-[#161f30] hover:bg-[#1f2937] text-slate-300 border-[#1f2937]"
              }`}
              title="Глобальный поиск по артикулам, запчастям, работам и командам (Ctrl+K / ⌘K)"
            >
              <Search aria-hidden="true" className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Поиск</span>
              <span className="hidden lg:inline font-mono text-[11px] opacity-60">⌘K</span>
            </button>

            {/* Consolidated Tools Popover Menu */}
            <div className="relative">
              <button
                type="button"
                aria-expanded={showToolsMenu}
                onClick={() => setShowToolsMenu((prev) => !prev)}
                className={`app-nav-utility px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border whitespace-nowrap shrink-0 ${
                  theme === "light"
                    ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                    : "bg-[#161f30] hover:bg-[#1f2937] text-slate-200 border-[#1f2937]"
                }`}
                title="Сервисные инструменты, AI-диагностика, сканер чеков и бэкап"
              >
                <span>Инструменты</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showToolsMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowToolsMenu(false)}
                  />
                  <div
                    className={`absolute right-0 top-full mt-2 w-64 rounded-xl p-1.5 shadow-2xl z-50 border ${
                      theme === "light"
                        ? "bg-white border-slate-200 text-slate-900"
                        : "bg-[#111827] border-[#1f2937] text-white"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsMenu(false);
                        setShowAiMechanicModal(true);
                      }}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-[#161f30] transition cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <div>AI-диагностика</div>
                        <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                          Разбор симптомов по истории ТО
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsMenu(false);
                        setShowScanReceiptModal(true);
                      }}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-[#161f30] transition cursor-pointer"
                    >
                      <ScanLine className="w-4 h-4 text-red-500 shrink-0" />
                      <div>
                        <div>Сканер чеков (OCR)</div>
                        <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                          Распознавание заказ-нарядов и АЗС
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsMenu(false);
                        setShowServiceBookModal(true);
                      }}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-[#161f30] transition cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                      <div>
                        <div>Сервисная книжка (PDF)</div>
                        <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                          Официальная выписка и печать
                        </div>
                      </div>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-[#1f2937]" />

                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsMenu(false);
                        setShowBackupModal(true);
                      }}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-[#161f30] transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Database className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>База данных и бэкап</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {isOnline ? "Онлайн" : "Локально"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsMenu(false);
                        handleSetPlatform("mobile");
                      }}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-[#161f30] transition cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Мобильное приложение</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsMenu(false);
                        if (deferredInstallPrompt) {
                          deferredInstallPrompt.prompt();
                        } else {
                          setShowInstallPcModal(true);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-[#161f30] transition cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-red-500 shrink-0" />
                      <span>Установить на ПК (PWA)</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Single-Click Theme Switcher */}
            <button
              id={theme === "light" ? "theme-toggle-dark" : "theme-toggle-light"}
              type="button"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className={`app-nav-utility px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border whitespace-nowrap shrink-0 ${
                theme === "light"
                  ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                  : "bg-[#161f30] hover:bg-[#1f2937] text-slate-200 border-[#1f2937]"
              }`}
              title={
                theme === "light"
                  ? "Переключить на тёмную тему (Obsidian Cockpit)"
                  : "Переключить на светлую тему (Daylight Studio)"
              }
            >
              {theme === "light" ? (
                <>
                  <Moon aria-hidden="true" className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Тёмная</span>
                </>
              ) : (
                <>
                  <Sun aria-hidden="true" className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Светлая</span>
                </>
              )}
            </button>

            {/* Primary CTA: Log Service */}
            <button
              type="button"
              onClick={() => {
                setServiceModalInitialData(undefined);
                setShowAddServiceModal(true);
              }}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus aria-hidden="true" className="w-3.5 h-3.5" />
              <span>Записать ТО</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main id="main-content" tabIndex={-1} className="app-main flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 pt-2 pb-24">
        {/* Car Header Hero */}
        <CarHeader
          vehicle={currentVehicle}
          allVehicles={vehicles}
          onSelectVehicle={(v) => setActiveVehicleId(v.id)}
          onUpdateMileage={handleUpdateMileage}
          onOpenVehicleModal={() => {
            setVehicleModalMode("edit");
            setShowVehicleModal(true);
          }}
          onOpenAddVehicle={() => {
            setVehicleModalMode("add");
            setShowVehicleModal(true);
          }}
          onOpenReminders={() => setShowRemindersModal(true)}
          onUpdateColor={handleUpdateVehicleColor}
          onUpdateModel3dUrl={handleUpdateVehicleModel3d}
          toFixTasks={toFixTasks}
          oemSchedules={oemSchedules}
          totalRecordsCount={currentRecords.length}
          compact={activeView !== "dashboard"}
          theme={theme}
        />

        {/* Dynamic View Rendering */}
        <div className="mt-5">
          {activeView === "dashboard" && (
            <Dashboard
              vehicle={currentVehicle}
              serviceRecords={serviceRecords}
              fuelRecords={fuelRecords}
              toFixTasks={toFixTasks}
              oemSchedules={oemSchedules}
              onOpenAddService={() => {
                setServiceModalInitialData(undefined);
                setShowAddServiceModal(true);
              }}
              onOpenHistory={() => setActiveView("service_log")}
              onOpenAiDiagnostic={() => setShowAiMechanicModal(true)}
              onOpenExpenses={() => setActiveView("expenses")}
              onOpenScanReceipt={() => setShowScanReceiptModal(true)}
              onOpenOemSchedule={() => setActiveView("oem_schedule")}
              onOpenInventoryToFix={() => setActiveView("garage_inventory")}
              onOpenServiceBook={() => setShowServiceBookModal(true)}
              onMarkOemDone={handleMarkOemDone}
              onOpenCommandPalette={() => setShowCommandPalette(true)}
            />
          )}

          {activeView === "service_log" && (
            <ServiceLogView
              vehicle={currentVehicle}
              records={serviceRecords}
              onAddRecord={() => {
                setServiceModalInitialData(undefined);
                setShowAddServiceModal(true);
              }}
              onScanReceipt={() => setShowScanReceiptModal(true)}
              onDeleteRecord={handleDeleteServiceRecord}
            />
          )}

          {activeView === "oem_schedule" && (
            <OemScheduleView
              vehicle={currentVehicle}
              schedules={oemSchedules}
              onMarkDone={handleMarkOemDone}
              onAddScheduleItem={(item) => {
                setOemSchedules((prev) => {
                  const next = [...prev, item];
                  const vehicleItems = next.filter((s) => s.vehicleId === currentVehicle.id);
                  apiSaveOemScheduleItems(currentVehicle.id, vehicleItems).catch(console.error);
                  return next;
                });
              }}
              onUpdateSchedules={(items) => {
                setOemSchedules((prev) => {
                  const others = prev.filter((s) => s.vehicleId !== currentVehicle.id);
                  return [...others, ...items];
                });
                apiSaveOemScheduleItems(currentVehicle.id, items).catch(console.error);
              }}
            />
          )}

          {activeView === "expenses" && (
            <ExpensesFuelView
              vehicle={currentVehicle}
              serviceRecords={serviceRecords}
              fuelRecords={fuelRecords}
              onAddFuelRecord={handleAddFuelRecord}
              onOpenAddService={() => {
                setServiceModalInitialData(undefined);
                setShowAddServiceModal(true);
              }}
            />
          )}

          {activeView === "garage_inventory" && (
            <GarageInventoryToFixView
              vehicle={currentVehicle}
              garageParts={garageParts}
              toFixTasks={toFixTasks}
              onAddPart={(part) => {
                setGarageParts((prev) => [part, ...prev]);
                apiCreateGaragePart(part).catch(console.error);
              }}
              onUpdatePartStatus={(partId, status) => {
                setGarageParts((prev) =>
                  prev.map((p) => (p.id === partId ? { ...p, status } : p))
                );
                if (status === "installed") {
                  apiInstallGaragePart(partId).catch(console.error);
                } else {
                  apiUpdateGaragePart(partId, { status }).catch(console.error);
                }
              }}
              onAddTask={(task) => {
                setToFixTasks((prev) => [task, ...prev]);
                apiCreateToFixTask(task).catch(console.error);
              }}
              onCompleteTask={(taskId) => {
                const task = toFixTasks.find((t) => t.id === taskId);
                if (task) {
                  setServiceModalInitialData({
                    category: task.category || "ТО и замена жидкостей",
                    title: task.title,
                    description: task.description || task.title,
                    mileage: currentVehicle.currentMileage,
                    completedTaskId: task.id,
                  });
                  setShowAddServiceModal(true);
                }
              }}
              onInstallInService={handleInstallPartInService}
            />
          )}

          {activeView === "tuning" && (
            <TuningProjectView
              vehicle={currentVehicle}
              tuningStages={tuningStages}
              onAddStage={handleAddTuningStage}
              onUpdateStage={handleUpdateTuningStage}
              onDeleteStage={handleDeleteTuningStage}
            />
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md px-2 py-1.5 flex items-center justify-around text-[10px] font-medium transition-colors shadow-2xl ${
          theme === "light"
            ? "bg-white/95 border-t border-slate-200 text-slate-500"
            : "bg-[#0b1018]/95 border-t border-[#243044] text-slate-400"
        }`}
      >
        <button
          aria-current={activeView === "dashboard" ? "page" : undefined} onClick={() => setActiveView("dashboard")}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition ${
            activeView === "dashboard"
              ? theme === "light"
                ? "text-slate-900 font-bold"
                : "text-white font-bold"
              : theme === "light"
              ? "hover:text-slate-900"
              : "hover:text-neutral-200"
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Главная</span>
        </button>

        <button
          aria-current={activeView === "service_log" ? "page" : undefined} onClick={() => setActiveView("service_log")}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition ${
            activeView === "service_log"
              ? "text-red-500 font-bold"
              : theme === "light"
              ? "hover:text-slate-900"
              : "hover:text-neutral-200"
          }`}
        >
          <Wrench className="w-5 h-5" />
          <span>Журнал</span>
        </button>

        <button
          onClick={() => {
            setServiceModalInitialData(undefined);
            setShowAddServiceModal(true);
          }}
          className="flex flex-col items-center justify-center -mt-5"
        >
          <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/40 active:scale-95 transition-transform">
            <Plus className="w-6 h-6" />
          </div>
          <span
            className={`text-[9px] font-bold mt-0.5 ${
              theme === "light" ? "text-slate-700" : "text-neutral-300"
            }`}
          >
            Ремонт
          </span>
        </button>

        <button
          aria-current={activeView === "expenses" ? "page" : undefined} onClick={() => setActiveView("expenses")}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition ${
            activeView === "expenses"
              ? "text-emerald-500 font-bold"
              : theme === "light"
              ? "hover:text-slate-900"
              : "hover:text-neutral-200"
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span>Расходы</span>
        </button>

        <button
          aria-current={activeView === "garage_inventory" ? "page" : undefined} onClick={() => setActiveView("garage_inventory")}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition ${
            activeView === "garage_inventory"
              ? "text-blue-500 font-bold"
              : theme === "light"
              ? "hover:text-slate-900"
              : "hover:text-neutral-200"
          }`}
        >
          <Layers className="w-5 h-5" />
          <span>Гараж</span>
        </button>
      </nav>

      {/* Modals */}
      {showAddServiceModal && (
        <AddServiceModal
          vehicle={currentVehicle}
          garageParts={garageParts}
          toFixTasks={toFixTasks}
          onClose={() => {
            setShowAddServiceModal(false);
            setServiceModalInitialData(undefined);
          }}
          onSave={handleSaveServiceRecord}
          initialData={serviceModalInitialData}
        />
      )}

      {showScanReceiptModal && (
        <ReceiptScannerModal
          vehicle={currentVehicle}
          onClose={() => setShowScanReceiptModal(false)}
          onApplyService={(serviceData) => {
            setServiceModalInitialData(serviceData);
            setShowAddServiceModal(true);
          }}
          onApplyFuel={(fuelData) => {
            handleAddFuelRecord({
              id: "fuel-" + Date.now(),
              vehicleId: currentVehicle.id,
              date: fuelData.date || new Date().toISOString().split("T")[0],
              mileage: fuelData.mileage || currentVehicle.currentMileage,
              liters: fuelData.liters || 50,
              pricePerLiter: fuelData.pricePerLiter || 60,
              totalCost: fuelData.totalCost || 3000,
              fuelType: fuelData.fuelType || "АИ-95",
              isFullTank: true,
              station: fuelData.station || "АЗС",
            });
            setActiveView("expenses");
          }}
        />
      )}

      {showAiMechanicModal && (
        <AiMechanicModal
          vehicle={currentVehicle}
          serviceRecords={serviceRecords}
          onClose={() => setShowAiMechanicModal(false)}
          onAddTaskToFix={(task) => {
            handleCreateToFixTask(task);
            setActiveView("garage_inventory");
            setShowAiMechanicModal(false);
          }}
        />
      )}

      {showServiceBookModal && (
        <ServiceBookModal
          vehicle={currentVehicle}
          serviceRecords={serviceRecords}
          onClose={() => setShowServiceBookModal(false)}
          onImportBackup={handleImportBackup}
        />
      )}

      {showVehicleModal && (
        <VehicleModal
          currentVehicle={currentVehicle}
          allVehicles={vehicles}
          initialMode={vehicleModalMode}
          onClose={() => setShowVehicleModal(false)}
          onSaveVehicle={handleSaveVehicle}
          onAddVehicle={handleAddVehicle}
          onDeleteVehicle={handleDeleteVehicle}
        />
      )}

      {showRemindersModal && (
        <RemindersModal
          vehicle={currentVehicle}
          toFixTasks={toFixTasks}
          oemSchedules={oemSchedules}
          onClose={() => setShowRemindersModal(false)}
          onOpenOemSchedule={() => {
            setActiveView("oem_schedule");
            setShowRemindersModal(false);
          }}
          onOpenInventoryToFix={() => {
            setActiveView("garage_inventory");
            setShowRemindersModal(false);
          }}
          onResolveOem={handleMarkOemDone}
        />
      )}

      {showBackupModal && (
        <DataSyncBackupModal
          isOpen={showBackupModal}
          onClose={() => setShowBackupModal(false)}
          onDataReloaded={handleDataReloaded}
          isOnline={isOnline}
        />
      )}

      {showInstallPcModal && (
        <InstallPcModal
          deferredPrompt={deferredInstallPrompt}
          onClose={() => setShowInstallPcModal(false)}
          onInstallSuccess={() => setShowInstallPcModal(false)}
        />
      )}

      {showCommandPalette && (
        <CommandPaletteModal
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          vehicles={vehicles}
          currentVehicle={currentVehicle}
          onSelectVehicle={(v) => setActiveVehicleId(v.id)}
          serviceRecords={serviceRecords}
          garageParts={garageParts}
          toFixTasks={toFixTasks}
          oemSchedules={oemSchedules}
          onNavigateView={(view) => setActiveView(view)}
          onOpenAddService={() => {
            setServiceModalInitialData(undefined);
            setShowAddServiceModal(true);
          }}
          onOpenScanReceipt={() => setShowScanReceiptModal(true)}
          onOpenAiMechanic={() => setShowAiMechanicModal(true)}
          onOpenServiceBook={() => setShowServiceBookModal(true)}
          onOpenBackupModal={() => setShowBackupModal(true)}
          onToggleTheme={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
          theme={theme}
        />
      )}
    </div>
  );
}
