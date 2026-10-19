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
  HardDrive,
  RefreshCw,
  Server,
  Layers,
  Lock,
  Unlock,
  ShieldCheck,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Sparkles,
} from "lucide-react";
import {
  FullGarageData,
  fetchGarageData,
  resetDatabase,
  importDatabaseBackup,
  isAdminAuthenticated,
  verifyAdminPassword,
  adminLogout,
  getAdminToken,
} from "../api";

interface DataSyncBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReloaded: (data: FullGarageData) => void;
  isOnline: boolean;
}

export const DataSyncBackupModal: React.FC<DataSyncBackupModalProps> = ({
  isOpen,
  onClose,
  onDataReloaded,
  isOnline,
}) => {
  const [isAdmin, setIsAdmin] = useState(isAdminAuthenticated());
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

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
      setIsAdmin(isAdminAuthenticated());
      setAuthError(null);
      setStatusMessage(null);
      setConfirmReset(false);
      if (isAdminAuthenticated()) {
        loadStats();
      }
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
      console.error(e);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setAuthError("Пожалуйста, введите ключ администратора.");
      return;
    }

    setIsVerifying(true);
    setAuthError(null);

    const result = await verifyAdminPassword(passwordInput.trim());
    setIsVerifying(false);

    if (result.success) {
      setIsAdmin(true);
      setPasswordInput("");
      loadStats();
      setStatusMessage({ type: "success", text: "Доступ администратора успешно подтвержден!" });
    } else {
      // Подсказка пароля намеренно не добавляется — секрет хранится только на сервере (ADMIN_SECRET).
      setAuthError(result.error || "Неверный пароль администратора.");
    }
  };

  const handleAdminLogout = () => {
    adminLogout();
    setIsAdmin(false);
    setStatusMessage(null);
    setAuthError(null);
  };

  const dialogRef = useModalFocus(onClose, isOpen);

  const handleExport = async () => {
    try {
      const token = getAdminToken() || "";
      const res = await fetch("/api/backup/export", {
        headers: { "x-admin-key": token },
      });
      if (!res.ok) {
        throw new Error("Доступ запрещен. Требуются права администратора.");
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GarageHub_backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage({ type: "success", text: "Резервная копия базы данных успешно скачана!" });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Ошибка экспорта" });
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      setStatusMessage({ type: "success", text: "База данных успешно возвращена к заводским демо-данным!" });
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
              {isAdmin ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <Lock className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isAdmin ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                {isAdmin ? "Режим Администратора • Доступ открыт" : "Только для Администратора"}
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-neutral-900 tracking-tight">
                Управление БД и бэкап
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <button
                onClick={handleAdminLogout}
                className="p-2 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-red-600 transition cursor-pointer"
                title="Выйти из режима администратора"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
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
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* ADMIN GATE: If not logged in as Admin, show Auth Prompt */}
          {!isAdmin ? (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-950 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-sm text-amber-900">
                    Требуется авторизация администратора
                  </div>
                  <p className="text-amber-800/90 leading-relaxed">
                    Экспорт полного архива, загрузка резервной копии и сброс базы данных защищены для предотвращения случайной потери информации.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                    Пароль или секретный ключ администратора
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        if (authError) setAuthError(null);
                      }}
                      placeholder="Введите пароль администратора"
                      autoFocus
                      className="w-full pl-9 pr-10 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      title={showPassword ? "Скрыть пароль" : "Показать пароль"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {authError && (
                    <div className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}
                </div>

                {/* Security note: the master key is configured on the server
                    via the ADMIN_SECRET environment variable. */}
                <p className="text-[11px] text-neutral-500 pt-1">
                  Мастер-ключ задаётся на сервере через переменную окружения ADMIN_SECRET.
                </p>

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full mt-2 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4 text-emerald-400" />
                  <span>{isVerifying ? "Проверка..." : "Войти как администратор"}</span>
                </button>
              </form>
            </div>
          ) : (
            /* ADMIN CONTROLS: Unlocked mode */
            <>
              {/* Admin Session Banner */}
              <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">Вы авторизованы как Администратор</span>
                </div>
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="text-[11px] text-emerald-800 underline hover:text-emerald-950 font-semibold cursor-pointer"
                >
                  Заблокировать
                </button>
              </div>

              {/* Database Status Card */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-700">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-neutral-500" />
                    <span>Хранилище GarageHub Engine</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-bold">
                    JSON Persistence • data/garage_store.json
                  </span>
                </div>

                {dbStats && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-200/80 text-center">
                    <div className="bg-white p-2 rounded-xl border border-neutral-200/60">
                      <div className="text-lg font-black text-neutral-900">{dbStats.vehicles}</div>
                      <div className="text-[10px] text-neutral-500 uppercase font-bold">Автомобили</div>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-neutral-200/60">
                      <div className="text-lg font-black text-red-600">{dbStats.services}</div>
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
                  onClick={handleExport}
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
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs space-y-2.5">
                    <div className="font-bold text-red-900">
                      Вы действительно хотите сбросить все данные к исходным демонстрационным записям?
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetDemo}
                        disabled={isProcessing}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition cursor-pointer"
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
                    className="w-full flex items-center justify-between p-3.5 bg-red-50/60 hover:bg-red-50 text-red-700 border border-red-200/80 rounded-2xl text-xs font-bold transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <RotateCcw className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="text-left">
                        <div className="text-red-900 font-extrabold">Сброс к демонстрационным данным</div>
                        <div className="text-[11px] text-red-600 font-normal">
                          Восстановить автопарк (Nissan X-Trail, Toyota Corolla Cross, BMW 3)
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-red-600 font-mono">Сбросить</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="p-3.5 sm:px-6 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400 shrink-0 bg-neutral-50/80">
          <span>GarageHub Server v2.4 • Защита администратора активна</span>
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
