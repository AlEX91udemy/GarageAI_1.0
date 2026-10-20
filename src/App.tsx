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
  ReminderRecord,
} from "./types";
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
  createReminder as apiCreateReminder,
  updateReminder as apiUpdateReminder,
  deleteReminder as apiDeleteReminder,
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
import { readThemePreference, saveThemePreference, applyThemePreference, type ThemePreference } from "./themePreference";
import { VehicleModal } from "./components/VehicleModal";
import { RemindersModal } from "./components/RemindersModal";
import { DataSyncBackupModal } from "./components/DataSyncBackupModal";
import { InstallPcModal } from "./components/InstallPcModal";
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

const WebApp = lazy(() =>
  import("./web/WebApp").then(({ WebApp }) => ({ default: WebApp }))
);

export default function App() {
  // Theme state: "light" vs "dark" (switchable via button). Light by default.
  const [theme, setTheme] = useState<ThemePreference>(readThemePreference);

  useEffect(() => {
    saveThemePreference(theme);
    applyThemePreference(theme);
  }, [theme]);

  // Mobile vs Web view mode (Defaulting to Web per user requirement)
  const [appPlatform, setAppPlatform] = useState<"mobile" | "web">(() => {
    try {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("view") === "mobile") return "mobile";
        if (urlParams.get("view") === "web") return "web";
      }
    } catch {
      // fallback
    }
    return "web";
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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);

  const [activeVehicleId, setActiveVehicleId] = useState<string>(() => {
    return vehicles[0]?.id || "empty-garage";
  });

  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);

  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);

  const [oemSchedules, setOemSchedules] = useState<OemScheduleItem[]>([]);

  const [garageParts, setGarageParts] = useState<GaragePart[]>([]);

  const [toFixTasks, setToFixTasks] = useState<ToFixTask[]>([]);

  const [tuningStages, setTuningStages] = useState<TuningStage[]>([]);

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

  // Pre-fill data for AddServiceModal
  const [serviceModalInitialData, setServiceModalInitialData] = useState<
    Partial<ServiceRecord> | undefined
  >(undefined);

  const handleAuthSuccess = async () => {
    try {
      const data = await fetchGarageData();
      setVehicles(data.vehicles || []);
      setReminders(data.reminders || []);
      setServiceRecords(data.serviceRecords || []);
      setFuelRecords(data.fuelRecords || []);
      setOemSchedules(data.oemSchedules || []);
      setGarageParts(data.garageParts || []);
      setToFixTasks(data.toFixTasks || []);
      setTuningStages(data.tuningStages || []);
      setActiveVehicleId(data.vehicles?.[0]?.id || "");
      setIsOnline(true);
    } catch (error) {
      console.warn("Не удалось загрузить персональный гараж:", error);
    }
  };

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
        if (data.reminders) setReminders(data.reminders);
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
        // The app is usable without an account. Keep the last local garage
        // available when the server requires authentication or is offline.
        const readCache = <T,>(key: string): T[] => {
          try {
            const value = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(value) ? value : [];
          } catch {
            return [];
          }
        };
        const cachedVehicles = readCache<Vehicle>("garagehub_vehicles");
        setVehicles(cachedVehicles);
        setReminders(readCache<ReminderRecord>("garagehub_reminders"));
        setActiveVehicleId(cachedVehicles[0]?.id || "empty-garage");
        setServiceRecords(readCache<ServiceRecord>("garagehub_service_records"));
        setFuelRecords(readCache<FuelRecord>("garagehub_fuel_records"));
        setOemSchedules(readCache<OemScheduleItem>("garagehub_oem_schedules"));
        setGarageParts(readCache<GaragePart>("garagehub_garage_parts"));
        setToFixTasks(readCache<ToFixTask>("garagehub_to_fix_tasks"));
        setTuningStages(readCache<TuningStage>("garagehub_tuning_stages"));
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
    localStorage.setItem("garagehub_reminders", JSON.stringify(reminders));
  }, [reminders]);

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
    vehicles.find((v) => v.id === activeVehicleId) || vehicles[0] || {
      id: "empty-garage", make: "", model: "", year: new Date().getFullYear(),
      engine: "", transmission: "", currentMileage: 0, lastMileageUpdate: "",
    };

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
      // BUG FIX: Persist task completion to the backend, otherwise the status
      // resets to "pending" after the next fetchGarageData() refresh.
      apiCompleteToFixTask(completedTaskId).catch(console.error);
    }

    // Mark garage parts installed if used
    // Сверяем не только артикул, но и привязку детали к автомобилю, а при
    // наличии нескольких экземпляров — списываем одну штуку вместо установки.
    // BUG FIX: also persist the deduction on the backend — previously the parts
    // were only consumed in the local state and reappeared after page reload.
    if (newRecord.parts.length > 0) {
      const partNumbers = newRecord.parts.map((p) => p.partNumber.toLowerCase());
      setGarageParts((prev) =>
        prev.map((gp) => {
          if (!partNumbers.includes(gp.partNumber.toLowerCase())) return gp;
          if (gp.vehicleId !== newRecord.vehicleId && gp.vehicleId !== "all") return gp;
          if (gp.quantity > 1) {
            return { ...gp, quantity: gp.quantity - 1 };
          }
          return { ...gp, status: "installed" as const };
        })
      );
    }

    // BUG FIX: explicitly sync the used garage parts with the server.
    // The modal recovers the real part ids (with the "gp-" prefix) and passes
    // them as usedPartIds — call the install endpoint for each of them so the
    // server inventory matches the local state.
    if (usedPartIds && usedPartIds.length > 0) {
      usedPartIds.forEach((partId) => {
        apiInstallGaragePart(partId).catch(console.error);
      });
    }

    // Keep edit and create operations separate so editing never duplicates a record.
    const saveRequest = currentRecords.some((record) => record.id === newRecord.id)
      ? apiUpdateServiceRecord(newRecord.id, newRecord)
      : apiCreateServiceRecord({ ...newRecord, completedTaskId });
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

  // When installing a garage part in service.
  // NOTE: the modal strips the leading "gp-" prefix to recover the original
  // garage part id, so we must use exactly one "gp-" prefix here. If part.id
  // already starts with "gp-", the resulting id is "gp-gp-<suffix>", which the
  // modal safely reduces back to the original "gp-<suffix>".
  const handleInstallPartInService = (part: GaragePart) => {
    setServiceModalInitialData({
      category: part.category,
      title: `Замена / Установка: ${part.name}`,
      description: `Установка детали со склада гаража: ${part.brand} ${part.name} (${part.partNumber})`,
      parts: [
        {
          id: "gp-" + part.id,
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
  const handleUpdateVehicleColor = (newColor: string) => {
    if (!/^#[0-9a-f]{6}$/i.test(newColor)) return;
    setVehicles((prev) =>
      prev.map((v) => (v.id === currentVehicle.id ? { ...v, colorHex: newColor } : v))
    );
    apiUpdateVehicle(currentVehicle.id, { colorHex: newColor }).catch(console.error);
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
        const vehicleExists = vehicles.some((v) => v.id === data.vehicle.id);
        setVehicles((prev) => {
          const exists = prev.some((v) => v.id === data.vehicle.id);
          return exists
            ? prev.map((v) => (v.id === data.vehicle.id ? data.vehicle : v))
            : [...prev, data.vehicle];
        });
        setActiveVehicleId(data.vehicle.id);

        // BUG FIX: persist the imported vehicle to the backend, otherwise the
        // import is lost after the next page reload.
        if (vehicleExists) {
          apiUpdateVehicle(data.vehicle.id, data.vehicle).catch(console.error);
        } else {
          apiCreateVehicle(data.vehicle).catch(console.error);
        }
      }
      if (data.serviceRecords && Array.isArray(data.serviceRecords)) {
        // BUG FIX: the exported file holds records for ONE vehicle only, so
        // blindly replacing the whole list would wipe out the records of all
        // other vehicles. Merge instead: keep other vehicles' records and
        // replace the imported vehicle's records with the imported set.
        const targetVehicleId = data.vehicle?.id;
        if (targetVehicleId) {
          const existingForVehicle = serviceRecords.filter(
            (r) => r.vehicleId === targetVehicleId
          );

          setServiceRecords((prev) => [
            ...prev.filter((r) => r.vehicleId !== targetVehicleId),
            ...data.serviceRecords,
          ]);

          // Sync every imported record with the backend: update records that
          // already existed (they are likely persisted server-side too) and
          // create the new ones.
          data.serviceRecords.forEach((record: ServiceRecord) => {
            const existsLocally = existingForVehicle.some((r) => r.id === record.id);
            if (existsLocally) {
              apiUpdateServiceRecord(record.id, record).catch(console.error);
            } else {
              apiCreateServiceRecord(record).catch(console.error);
            }
          });
        }
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

  const handleCreateTuningStage = (stage: TuningStage) => {
    setTuningStages((prev) => [stage, ...prev]);
    apiCreateTuningStage(stage).catch(console.error);
  };

  const handleUpdateTuningStage = (stage: TuningStage) => {
    setTuningStages((prev) => prev.map((s) => (s.id === stage.id ? stage : s)));
    apiUpdateTuningStage(stage.id, stage).catch(console.error);
  };

  const handleDeleteTuningStage = (stageId: string) => {
    setTuningStages((prev) => prev.filter((s) => s.id !== stageId));
    apiDeleteTuningStage(stageId).catch(console.error);
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

  // Общий слой модальных окон (веб, мобильный предпросмотр, десктоп)
  const renderAppModals = () => (
    <>
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
              id: "fuel-" + crypto.randomUUID(),
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
            // Сохраняем задачу на сервере, иначе она теряется после перезагрузки.
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
          vehicles={vehicles}
          reminders={reminders}
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
          vehicleId={currentVehicle.id !== "empty-garage" ? currentVehicle.id : undefined}
        />
      )}

      {showInstallPcModal && (
        <InstallPcModal
          deferredPrompt={deferredInstallPrompt}
          onClose={() => setShowInstallPcModal(false)}
          onInstallSuccess={() => setShowInstallPcModal(false)}
        />
      )}
    </>
  );
  // Professional WebApp for desktop, MobileApp for mobile preview
  // below is intentionally unreachable while the product finishes migrating.
  if (appPlatform === "web") {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
        <WebApp
          vehicles={vehicles}
          activeVehicleId={activeVehicleId}
          setActiveVehicleId={setActiveVehicleId}
          serviceRecords={serviceRecords}
          fuelRecords={fuelRecords}
          oemSchedules={oemSchedules}
          garageParts={garageParts}
          toFixTasks={toFixTasks}
          tuningStages={tuningStages}
          reminders={reminders}
          theme={theme}
          onUpdateMileage={handleUpdateMileage}
          onSaveServiceRecord={handleSaveServiceRecord}
          onDeleteServiceRecord={handleDeleteServiceRecord}
          onAddFuelRecord={handleAddFuelRecord}
          onMarkOemDone={handleMarkOemDone}
          onInstallPartInService={handleInstallPartInService}
          onAddVehicle={handleAddVehicle}
          onSaveVehicle={handleSaveVehicle}
          onDeleteVehicle={handleDeleteVehicle}
          onUpdateVehicleColor={handleUpdateVehicleColor}
          onUpdateVehicleModel3d={handleUpdateVehicleModel3d}
          onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
          onSaveOemScheduleItems={(items) => {
            setOemSchedules((prev) => {
              const updatedIds = new Set(items.map((i) => i.id));
              return [...prev.filter((s) => !updatedIds.has(s.id)), ...items];
            });
            apiSaveOemScheduleItems(currentVehicle.id, items).catch(console.error);
          }}
          onAddOemScheduleItem={(item) => {
            const nextItem = { ...item, vehicleId: currentVehicle.id };
            const itemsForVehicle = [
              ...oemSchedules.filter(
                (s) => s.vehicleId === currentVehicle.id || s.vehicleId === "all"
              ),
              nextItem,
            ];
            setOemSchedules((prev) => [...prev, nextItem]);
            apiSaveOemScheduleItems(currentVehicle.id, itemsForVehicle).catch(console.error);
          }}
          onAddGaragePart={handleAddGaragePart}
          onUpdateGaragePart={handleUpdateGaragePart}
          onDeleteGaragePart={handleDeleteGaragePart}
          onAddToFixTask={handleCreateToFixTask}
          onUpdateToFixTask={(task) => {
            setToFixTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
            apiUpdateToFixTask(task.id, task).catch(console.error);
          }}
          onCompleteToFixTask={(taskId) => {
            setToFixTasks((prev) =>
              prev.map((t) => (t.id === taskId ? { ...t, status: "completed" } : t))
            );
            apiCompleteToFixTask(taskId).catch(console.error);
          }}
          onAddTuningStage={(stage) => {
            setTuningStages((prev) => [stage, ...prev]);
            apiCreateTuningStage(stage).catch(console.error);
          }}
          onUpdateTuningStage={(stage) => {
            setTuningStages((prev) => prev.map((s) => (s.id === stage.id ? stage : s)));
            apiUpdateTuningStage(stage.id, stage).catch(console.error);
          }}
          onDeleteTuningStage={(stageId) => {
            setTuningStages((prev) => prev.filter((s) => s.id !== stageId));
            apiDeleteTuningStage(stageId).catch(console.error);
          }}
          onAddReminder={(reminder) => {
            setReminders((prev) => [reminder, ...prev]);
            apiCreateReminder(reminder).catch(console.error);
          }}
          onUpdateReminder={(reminder) => {
            setReminders((prev) => prev.map((r) => (r.id === reminder.id ? reminder : r)));
            apiUpdateReminder(reminder.id, reminder).catch(console.error);
          }}
          onDeleteReminder={(reminderId) => {
            setReminders((prev) => prev.filter((r) => r.id !== reminderId));
            apiDeleteReminder(reminderId).catch(console.error);
          }}
          onImportBackup={handleImportBackup}
          onExportBackup={() => {
            const data = {
              vehicle: currentVehicle,
              serviceRecords: serviceRecords.filter((r) => r.vehicleId === currentVehicle.id),
              fuelRecords: fuelRecords.filter((f) => f.vehicleId === currentVehicle.id),
              oemSchedules: oemSchedules.filter(
                (s) => s.vehicleId === currentVehicle.id || s.vehicleId === "all"
              ),
              garageParts: garageParts.filter(
                (p) => p.vehicleId === currentVehicle.id || p.vehicleId === "all"
              ),
              toFixTasks: toFixTasks.filter((t) => t.vehicleId === currentVehicle.id),
              tuningStages: tuningStages.filter((s) => s.vehicleId === currentVehicle.id),
            };
            return JSON.stringify(data, null, 2);
          }}
          onOpenAddService={() => setShowAddServiceModal(true)}
          onOpenScanReceipt={() => setShowScanReceiptModal(true)}
          onOpenAiMechanic={() => setShowAiMechanicModal(true)}
          onOpenServiceBook={() => setShowServiceBookModal(true)}
          onOpenReminders={() => setShowRemindersModal(true)}
          onOpenAddVehicle={() => {
            setVehicleModalMode("add");
            setShowVehicleModal(true);
          }}
          onOpenEditVehicle={() => {
            setVehicleModalMode("edit");
            setShowVehicleModal(true);
          }}
          onOpenBackup={() => setShowBackupModal(true)}
          onSwitchToMobile={() => handleSetPlatform("mobile")}
        />
        {renderAppModals()}
      </Suspense>
    );
  }

  // Mobile preview mode
  if (appPlatform === "mobile") {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
        <MobileApp
          variant="preview"
          vehicles={vehicles}
          reminders={reminders}
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
          onUpdateVehicleColor={(_vehicleId, color) => handleUpdateVehicleColor(color)}
          onAuthSuccess={handleAuthSuccess}
          onDeleteFuelRecord={(id) => {
            setFuelRecords((prev) => prev.filter((record) => record.id !== id));
            apiDeleteFuelRecord(id).catch(console.error);
          }}
          onLogout={() => {
            setVehicles([]);
            setReminders([]);
            setActiveVehicleId("empty-garage");
            setServiceRecords([]);
            setFuelRecords([]);
            setOemSchedules([]);
            setGarageParts([]);
            setToFixTasks([]);
            setTuningStages([]);
          }}
        />

        {renderAppModals()}
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
      {/* Top Application Bar with Navigation for Desktop */}
      <nav
        className={`app-navigation sticky top-0 z-40 backdrop-blur-md px-3 sm:px-6 py-2 shadow-md transition-colors duration-200 ${
          theme === "light"
            ? "bg-white/95 border-b border-slate-200 text-slate-900"
            : "bg-[#0b1018]/95 border-b border-[#243044] text-white"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Brand Logo & Name */}
            <button type="button" aria-label="Garage AI — главная"
              aria-current={activeView === "dashboard" ? "page" : undefined} onClick={() => setActiveView("dashboard")}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <img src="/garage-ai-mark.png" alt="" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg group-hover:scale-105 transition-transform" />
              <img src="/garageai-wordmark.png" alt="GarageAI" className="w-24 h-5 object-contain object-left" />
            </button>

            {/* Desktop Navigation Links */}
            <div
              className={`hidden md:flex items-center gap-1 pl-2.5 border-l text-xs font-medium ${
                theme === "light" ? "border-slate-200" : "border-neutral-800"
              }`}
            >
              <button
                aria-current={activeView === "dashboard" ? "page" : undefined} onClick={() => setActiveView("dashboard")}
                className={`app-nav-item px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  activeView === "dashboard"
                    ? theme === "light"
                      ? "bg-slate-100 text-slate-900 font-bold border border-slate-200 shadow-xs"
                      : "bg-[#1e293b] text-white font-bold border border-[#334155]"
                    : theme === "light"
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    : "text-slate-400 hover:text-white hover:bg-[#17202e]"
                }`}
              >
                <Home aria-hidden="true" />
                <span>Главная</span>
              </button>
              <button
                aria-current={activeView === "service_log" ? "page" : undefined} onClick={() => setActiveView("service_log")}
                className={`app-nav-item px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeView === "service_log"
                    ? theme === "light"
                      ? "bg-slate-100 text-slate-900 font-bold border border-slate-200 shadow-xs"
                      : "bg-[#1e293b] text-white font-bold border border-[#334155]"
                    : theme === "light"
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    : "text-slate-400 hover:text-white hover:bg-[#17202e]"
                }`}
              >
                <BookOpen aria-hidden="true" />
                <span>Журнал</span>
                <span className="text-[10px] bg-red-500/20 text-red-500 px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {currentRecords.length}
                </span>
              </button>
              <button
                aria-current={activeView === "oem_schedule" ? "page" : undefined} onClick={() => setActiveView("oem_schedule")}
                className={`app-nav-item px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  activeView === "oem_schedule"
                    ? theme === "light"
                      ? "bg-slate-100 text-slate-900 font-bold border border-slate-200 shadow-xs"
                      : "bg-[#1e293b] text-white font-bold border border-[#334155]"
                    : theme === "light"
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    : "text-slate-400 hover:text-white hover:bg-[#17202e]"
                }`}
              >
                <ClipboardCheck aria-hidden="true" />
                <span>Регламент ТО</span>
              </button>
              <button
                aria-current={activeView === "expenses" ? "page" : undefined} onClick={() => setActiveView("expenses")}
                className={`app-nav-item px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  activeView === "expenses"
                    ? theme === "light"
                      ? "bg-slate-100 text-slate-900 font-bold border border-slate-200 shadow-xs"
                      : "bg-[#1e293b] text-white font-bold border border-[#334155]"
                    : theme === "light"
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    : "text-slate-400 hover:text-white hover:bg-[#17202e]"
                }`}
              >
                <Wallet aria-hidden="true" />
                <span>Расходы</span>
              </button>
              <button
                aria-current={activeView === "garage_inventory" ? "page" : undefined} onClick={() => setActiveView("garage_inventory")}
                className={`app-nav-item px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  activeView === "garage_inventory"
                    ? theme === "light"
                      ? "bg-slate-100 text-slate-900 font-bold border border-slate-200 shadow-xs"
                      : "bg-[#1e293b] text-white font-bold border border-[#334155]"
                    : theme === "light"
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    : "text-slate-400 hover:text-white hover:bg-[#17202e]"
                }`}
              >
                <Layers aria-hidden="true" />
                <span>Склад</span>
              </button>
              <button
                aria-current={activeView === "tuning" ? "page" : undefined} onClick={() => setActiveView("tuning")}
                className={`app-nav-item px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  activeView === "tuning"
                    ? theme === "light"
                      ? "bg-slate-100 text-slate-900 font-bold border border-slate-200 shadow-xs"
                      : "bg-[#1e293b] text-white font-bold border border-[#334155]"
                    : theme === "light"
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    : "text-slate-400 hover:text-white hover:bg-[#17202e]"
                }`}
              >
                <Paintbrush aria-hidden="true" />
                <span>Тюнинг</span>
              </button>
            </div>
          </div>

          {/* Quick Utility Action Buttons & Theme Switcher */}
          <div className="app-navigation-actions flex items-center gap-1.5 shrink-0">
            {/* Server Sync & Database status indicator */}
            <button
              onClick={() => setShowBackupModal(true)}
              className={`app-nav-utility p-1 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shadow-xs border ${
                theme === "light"
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                  : "bg-[#131b26] hover:bg-[#1e293b] text-slate-200 border-[#243044]"
              }`}
              title="Статус сервера базы данных и резервное копирование"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isOnline
                    ? "bg-emerald-500 shadow-sm shadow-emerald-500/80 animate-pulse"
                    : "bg-amber-500"
                }`}
              />
              <Database aria-hidden="true" />
              <span className="hidden xl:inline text-xs">БД</span>
            </button>

            {/* AI Rev Assistant shortcut */}
            <button
              onClick={() => setShowAiMechanicModal(true)}
              className={`app-nav-utility app-nav-ai px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                theme === "light"
                  ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200"
                  : "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30"
              }`}
              title="Диагностический AI-ассистент"
            >
              <Sparkles aria-hidden="true" />
              <span className="hidden sm:inline">AI-диагностика</span>
              <span className="sm:hidden">AI</span>
            </button>

            {/* Receipt scanner shortcut */}
            <button
              onClick={() => setShowScanReceiptModal(true)}
              className={`app-nav-utility px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer border ${
                theme === "light"
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                  : "bg-[#131b26] hover:bg-[#1e293b] text-slate-200 border-[#243044]"
              }`}
              title="Сканировать чек или заказ-наряд"
            >
              <ScanLine aria-hidden="true" />
              <span className="hidden sm:inline">Сканер чеков</span>
            </button>

            {/* Service book official passport */}
            <button
              onClick={() => setShowServiceBookModal(true)}
              className={`app-nav-utility px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer border ${
                theme === "light"
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                  : "bg-[#131b26] hover:bg-[#1e293b] text-slate-200 border-[#243044]"
              }`}
              title="Электронная сервисная книжка"
            >
              <FileText aria-hidden="true" />
              <span className="nav-secondary-label hidden md:inline">Сервисная книжка</span>
            </button>

            {/* Switch to Mobile App preview */}
            <button
              onClick={() => handleSetPlatform("mobile")}
              className={`app-nav-utility px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer border ${
                theme === "light"
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                  : "bg-[#131b26] hover:bg-[#1e293b] text-slate-200 border-[#243044]"
              }`}
              title="Переключить в режим мобильного приложения (iOS / Android)"
            >
              <Smartphone aria-hidden="true" />
              <span className="nav-secondary-label hidden lg:inline">Мобильное приложение</span>
            </button>

            {/* Install on PC / Download Desktop App */}
            <button
              onClick={() => {
                if (deferredInstallPrompt) {
                  deferredInstallPrompt.prompt();
                } else {
                  setShowInstallPcModal(true);
                }
              }}
              className={`app-nav-utility px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border shadow-xs ${
                theme === "light"
                  ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                  : "bg-red-600/15 hover:bg-red-600/25 text-red-300 border-red-500/30"
              }`}
              title="Установить Garage AI на компьютер (ПК) / Скачать как отдельное приложение"
            >
              <Download aria-hidden="true" className="w-3.5 h-3.5 text-red-500" />
              <span className="hidden sm:inline">Установить на ПК</span>
              <span className="sm:hidden">ПК</span>
            </button>

            {/* Theme Toggle Button: Светлая / Тёмная */}
            <div
              className={`flex items-center p-0.5 rounded-xl border text-xs shadow-xs transition-colors ${
                theme === "light"
                  ? "bg-slate-100 border-slate-300"
                  : "bg-[#131b26] border-[#243044]"
              }`}
            >
              <button
                id="theme-toggle-light" aria-pressed={theme === "light"}
                onClick={() => setTheme("light")}
                className={`app-theme-option px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  theme === "light"
                    ? "bg-white text-slate-950 shadow-sm border border-slate-200"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Переключить на светлую тему"
              >
                <Sun aria-hidden="true" />
                <span className="hidden sm:inline">Светлая</span>
              </button>
              <button
                id="theme-toggle-dark" aria-pressed={theme === "dark"}
                onClick={() => setTheme("dark")}
                className={`app-theme-option px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  theme === "dark"
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Переключить на тёмную тему"
              >
                <Moon aria-hidden="true" />
                <span className="hidden sm:inline">Тёмная</span>
              </button>
            </div>
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
                setOemSchedules((prev) => [...prev, item]);
                // Сохраняем на сервер полный список для текущего авто,
                // чтобы добавленный пункт не пропал после перезагрузки.
                apiSaveOemScheduleItems(currentVehicle.id, [...oemSchedules.filter((s) => s.vehicleId === currentVehicle.id), item]).catch(console.error);
              }}
              onUpdateSchedules={(items) => {
                setOemSchedules(items);
                apiSaveOemScheduleItems(currentVehicle.id, items.filter((s) => s.vehicleId === currentVehicle.id)).catch(console.error);
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
              stages={tuningStages}
              onCreateStage={handleCreateTuningStage}
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
      {renderAppModals()}
    </div>
  );
}
