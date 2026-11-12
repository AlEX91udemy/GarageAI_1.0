import { useModalFocus } from "./useModalFocus";
import React, { useState, useEffect } from "react";
import {
  X,
  Database,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Server,
} from "lucide-react";
import {
  FullGarageData,
  fetchGarageData,
  resetDatabase,
  importDatabaseBackup,
  authenticatedFetch,
} from "../api";

interface DataSyncBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReloaded: (data: FullGarageData) => void;
  isOnline: boolean;
  vehicleId?: string;
}

export const DataSyncBackupModal: React.FC<DataSyncBackupModalProps> = ({
  isOpen,
  onClose,
  onDataReloaded,
  isOnline,
  vehicleId,
}) => {
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [dbStats, setDbStats] = useState<{
    vehicles: number;
    services: number;
    fuel: number;
    parts: number;
    tasks: number;
    lastUpdated?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null);
      setConfirmReset(false);
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    try {
      const data = await fetchGarageData();
      setDbStats({
        vehicles: data.vehicles.length,
        services: data.serviceRecords.length,
        fuel: data.fuelRecords.length,
        parts: data.garageParts.length,
        tasks: data.toFixTasks.length,
        lastUpdated: data.lastUpdated,
      });
    } catch (e) {
      setStatusMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Не удалось загрузить состояние хранилища",
      });
    }
  };

  const dialogRef = useModalFocus(onClose, isOpen);

  const handleExport = async (scope: "account" | "vehicle" = "account") => {
    try {
      const query = scope === "vehicle" && vehicleId ? `?vehicleId=${encodeURIComponent(vehicleId)}` : "";
      const res = await authenticatedFetch(`/api/backup/export${query}`);
      if (!res.ok) {
        throw new Error("Не удалось экспортировать данные текущего гаража.");
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Garage AI_backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage({
        type: "success",
        text: scope === "vehicle" ? "Данные автомобиля успешно скачаны!" : "Полная резервная копия успешно скачана!",
      });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Ошибка экспорта" });
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setStatusMessage({ type: "error", text: "Файл резервной копии слишком большой. Максимальный размер — 10 МБ." });
      return;
    }

    // Allow selecting the same file again after a failed or cancelled import.
    e.currentTarget.value = "";

    setIsProcessing(true);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        await importDatabaseBackup(json);
        const refreshed = await fetchGarageData();
        onDataReloaded(refreshed);
        loadStats();
        setStatusMessage({ type: "success", text: "Резервная копия успешно восстановлена на сервере!" });
      } catch (err: any) {
        setStatusMessage({ type: "error", text: "Ошибка импорта: " + (err.message || "Неверный формат JSON") });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setIsProcessing(false);
      setStatusMessage({ type: "error", text: "Не удалось прочитать файл резервной копии." });
    };
    reader.onabort = () => {
      setIsProcessing(false);
      setStatusMessage({ type: "error", text: "Чтение файла резервной копии было прервано." });
    };
    reader.readAsText(file);
  };

  const handleResetDemo = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    setConfirmReset(false);

    try {
      const data = await resetDatabase();
      onDataReloaded(data);
      loadStats();
      setStatusMessage({ type: "success", text: "Данные текущего гаража успешно сброшены!" });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Ошибка сброса: " + err.message });
    } finally {
      setIsProcessing(false);
    }
  };


  if (!isOpen) return null;
  return (
    <div
      ref={dialogRef} role="dialog" aria-modal="true" aria-label="Данные и резервное копирование" tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-neutral-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Fixed Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-neutral-100 shrink-0 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-md shrink-0">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Данные текущего гаража
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-neutral-900 tracking-tight">
                Управление БД и бэкап
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
              title="Закрыть (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 space-y-4">
          {/* Notifications */}
          {statusMessage && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-brand-soft text-brand-hover border border-brand-border"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-brand-strong shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {vehicleId && (
            <button
              type="button"
              onClick={() => handleExport("vehicle")}
              disabled={isProcessing}
              className="w-full flex items-center justify-between p-3.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl text-xs font-bold transition shadow-sm cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center"><Download className="w-4 h-4 text-emerald-400" /></div>
                <div className="text-left">
                  <div className="text-white font-extrabold">Экспорт данных автомобиля</div>
                  <div className="text-[11px] text-neutral-400 font-normal">Скачать только данные выбранного автомобиля</div>
                </div>
              </div>
              <span className="text-[11px] text-emerald-400 font-mono">Скачать</span>
            </button>
          )}

          {/* Backup actions are scoped to the authenticated user garage. */}
          <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900">
            Экспорт, импорт и сброс работают только с данными текущего аккаунта.
          </div>

              {/* Database Status Card */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-700">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-neutral-500" />
                    <span>Хранилище Garage AI Engine</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-bold">
                    Серверное хранилище • только данные текущего аккаунта
                  </span>
                </div>

                {dbStats && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-200/80 text-center">
                    <div className="bg-white p-2 rounded-xl border border-neutral-200/60">
                      <div className="text-lg font-black text-neutral-900">{dbStats.vehicles}</div>
                      <div className="text-[10px] text-neutral-500 uppercase font-bold">Автомобили</div>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-neutral-200/60">
                      <div className="text-lg font-black text-brand-strong">{dbStats.services}</div>
                      <div className="text-[10px] text-neutral-500 uppercase font-bold">Записей ТО</div>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-neutral-200/60">
                      <div className="text-lg font-black text-neutral-900">{dbStats.parts}</div>
                      <div className="text-[10px] text-neutral-500 uppercase font-bold">Деталей склада</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Controls */}
              <div className="space-y-3">
                {/* Export button */}
                <button
                  onClick={() => handleExport("account")}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-between p-3.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl text-xs font-bold transition shadow-sm cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Download className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-left">
                      <div className="text-white font-extrabold">Экспорт полного бэкапа (JSON)</div>
                      <div className="text-[11px] text-neutral-400 font-normal">
                        Скачать все автомобили, журнал чеков, запчасти и пробег
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-mono">Скачать</span>
                </button>

                {/* Import button */}
                <label className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-200 rounded-2xl text-xs font-bold transition shadow-sm cursor-pointer group">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    disabled={isProcessing}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Upload className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <div className="text-neutral-900 font-extrabold">Восстановление из файла</div>
                      <div className="text-[11px] text-neutral-500 font-normal">
                        Загрузить ранее сохраненную резервную копию гаража
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-blue-600 font-mono">Выбрать файл</span>
                </label>

                {/* Reset Demo Data */}
                {confirmReset ? (
                  <div className="p-3.5 bg-brand-soft border border-brand-border rounded-2xl text-xs space-y-2.5">
                    <div className="font-bold text-brand-hover">
                      Вы действительно хотите сбросить данные текущего гаража?
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetDemo}
                        disabled={isProcessing}
                        className="px-3.5 py-1.5 bg-brand-strong hover:bg-brand-hover text-white font-bold rounded-xl transition cursor-pointer"
                      >
                        Да, сбросить всё
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                        disabled={isProcessing}
                        className="px-3.5 py-1.5 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-semibold rounded-xl transition cursor-pointer"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-between p-3.5 bg-brand-soft/60 hover:bg-brand-soft text-brand-hover border border-brand-border/80 rounded-2xl text-xs font-bold transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-brand-soft-strong flex items-center justify-center group-hover:scale-105 transition-transform">
                        <RotateCcw className="w-4 h-4 text-brand-strong" />
                      </div>
                      <div className="text-left">
                        <div className="text-brand-hover font-extrabold">Сбросить данные</div>
                        <div className="text-[11px] text-brand-strong font-normal">
                          Очистить данные текущего гаража
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-brand-strong font-mono">Сбросить</span>
                  </button>
                )}
              </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-3.5 sm:px-6 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400 shrink-0 bg-neutral-50/80">
          <span>Garage AI Server v2.4 • Данные защищены сессией владельца</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-200/80 hover:bg-neutral-200 text-neutral-800 rounded-xl font-bold transition cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
