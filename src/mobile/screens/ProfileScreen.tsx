import React from "react";
import {
  User,
  Settings,
  Car,
  ShieldCheck,
  Download,
  Share2,
  HelpCircle,
  LogOut,
  ChevronRight,
  Database,
  Moon,
  Sparkles,
  FileText,
  Plus,
  Monitor,
} from "lucide-react";
import { Vehicle, ServiceRecord, GaragePart } from "../../types";
import { MobileScreenId } from "../types";
import { login, register, logout, restoreSession } from "../../api";

interface ProfileScreenProps {
  vehicles: Vehicle[];
  serviceRecords: ServiceRecord[];
  garageParts: GaragePart[];
  userEmail?: string;
  onNavigate: (screen: MobileScreenId) => void;
  onOpenBackup: () => void;
  onOpenServiceBook?: () => void;
  onOpenReminders?: () => void;
  onOpenAddVehicle?: () => void;
  onSwitchToWebView?: () => void;
  onLogout: () => void;
  onAuthSuccess?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  vehicles,
  serviceRecords,
  garageParts,
  userEmail = "SAMBUR91@gmail.com",
  onNavigate,
  onOpenBackup,
  onOpenServiceBook,
  onOpenReminders,
  onOpenAddVehicle,
  onSwitchToWebView,
  onLogout,
  onAuthSuccess,
}) => {
  const [authMode, setAuthMode] = React.useState<"login" | "register">("login");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [authBusy, setAuthBusy] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    restoreSession().then((session) => setIsAuthenticated(Boolean(session)));
  }, []);

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    try {
      if (authMode === "login") await login(username, password);
      else await register(username, password);
      setIsAuthenticated(true);
      setPassword("");
      onAuthSuccess?.();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Не удалось выполнить вход");
    } finally {
      setAuthBusy(false);
    }
  };
  const totalMileage = vehicles.reduce((sum, v) => sum + v.currentMileage, 0);
  const totalServiceSpent = serviceRecords.reduce(
    (sum, r) => sum + (r.totalCost || 0),
    0
  );

  return (
    <div className="flex flex-col w-full pb-10 bg-neutral-100 text-neutral-900 select-none">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-neutral-200/80 shadow-xs">
        <h2 className="text-xl font-black text-neutral-900 tracking-tight">
          Профиль владельца
        </h2>
        <button
          onClick={() => onNavigate("settings")}
          className="w-9 h-9 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-600 hover:text-neutral-900 transition cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3.5">
        {/* User Card */}
        <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-neutral-900 flex items-center justify-center font-black text-lg text-white shadow-sm">
            AS
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black text-neutral-900 truncate">
              Александр Самбур
            </h3>
            <div className="text-xs text-neutral-500 font-mono truncate">
              {userEmail}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>GarageHub PRO • Синхронизировано</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-neutral-900">Синхронизация аккаунта</h3>
              <p className="text-[11px] text-neutral-500 mt-1">Вход и регистрация доступны из профиля</p>
            </div>
            {isAuthenticated && <span className="text-[10px] font-bold text-emerald-600">Подключено</span>}
          </div>
          {!isAuthenticated ? (
            <form onSubmit={submitAuth} className="space-y-2">
              <div className="flex gap-2">
                <button type="button" onClick={() => setAuthMode("login")} className={`flex-1 rounded-xl py-2 text-xs font-bold ${authMode === "login" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"}`}>Войти</button>
                <button type="button" onClick={() => setAuthMode("register")} className={`flex-1 rounded-xl py-2 text-xs font-bold ${authMode === "register" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"}`}>Регистрация</button>
              </div>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Логин" autoComplete="username" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-red-500" required />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль от 8 символов" autoComplete={authMode === "login" ? "current-password" : "new-password"} className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-red-500" minLength={8} required />
              {authError && <p className="text-[11px] text-red-600">{authError}</p>}
              <button disabled={authBusy} className="w-full rounded-xl bg-red-600 text-white py-2.5 text-xs font-bold disabled:opacity-50">{authBusy ? "Подключение..." : authMode === "login" ? "Войти и синхронизировать" : "Создать аккаунт"}</button>
            </form>
          ) : (
            <button type="button" onClick={() => { void logout().finally(() => setIsAuthenticated(false)); }} className="w-full rounded-xl border border-neutral-200 py-2.5 text-xs font-bold text-neutral-700">Выйти из аккаунта</button>
          )}
        </div>

        {isAuthenticated && (<>
        {/* Global Garage Statistics */}
        <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
            Статистика автопарка
          </h3>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-2.5 rounded-2xl bg-neutral-50 border border-neutral-200/70">
              <div className="text-[10px] text-neutral-500">Автомобилей</div>
              <div className="text-lg font-black text-neutral-900 font-mono mt-0.5">
                {vehicles.length}
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-neutral-50 border border-neutral-200/70">
              <div className="text-[10px] text-neutral-500">Записей ТО</div>
              <div className="text-lg font-black text-neutral-900 font-mono mt-0.5">
                {serviceRecords.length}
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-neutral-50 border border-neutral-200/70">
              <div className="text-[10px] text-neutral-500">Деталей на складе</div>
              <div className="text-lg font-black text-neutral-900 font-mono mt-0.5">
                {garageParts.length}
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-neutral-50 border border-neutral-200/70">
              <div className="text-[10px] text-neutral-500">Общий пробег</div>
              <div className="text-lg font-black text-neutral-900 font-mono mt-0.5">
                {totalMileage.toLocaleString("ru-RU")} км
              </div>
            </div>
          </div>
        </div>
        </>)}

        {isAuthenticated && (<>
        {/* Quick Tools List */}
        <div className="rounded-3xl bg-white border border-neutral-200/90 shadow-xs overflow-hidden divide-y divide-neutral-100 text-xs">
          {onOpenAddVehicle && (
            <button
              onClick={onOpenAddVehicle}
              className="w-full p-3.5 flex items-center justify-between hover:bg-neutral-50 transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-3 text-neutral-800 font-semibold">
                <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span>Добавить автомобиль в гараж</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>
          )}

          {onOpenServiceBook && (
            <button
              onClick={() => onOpenServiceBook?.()}
              className="w-full p-3.5 flex items-center justify-between hover:bg-neutral-50 transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-3 text-neutral-800 font-semibold">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <span>Электронная сервисная книжка</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>
          )}

          {onOpenReminders && (
            <button
              onClick={() => onOpenReminders?.()}
              className="w-full p-3.5 flex items-center justify-between hover:bg-neutral-50 transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-3 text-neutral-800 font-semibold">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span>Напоминания (ОСАГО, КАСКО, ТО, налог)</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>
          )}

          <button
            onClick={() => onOpenBackup?.()}
            className="w-full p-3.5 flex items-center justify-between hover:bg-neutral-50 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3 text-neutral-800 font-semibold">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <span>Резервная копия & Синхронизация данных</span>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </button>

          <button
            onClick={() => onNavigate?.("ai_diagnostics")}
            className="w-full p-3.5 flex items-center justify-between hover:bg-neutral-50 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3 text-neutral-800 font-semibold">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span>Garage AI Core Engine & Диагностика</span>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </button>

          {onSwitchToWebView && (
            <button
              onClick={() => onSwitchToWebView?.()}
              className="w-full p-3.5 flex items-center justify-between hover:bg-neutral-50 transition cursor-pointer text-left text-neutral-700"
            >
              <div className="flex items-center gap-3 font-semibold">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center">
                  <Monitor className="w-4 h-4" />
                </div>
                <span>Перейти в веб-версию (Desktop)</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>
          )}

          <button
            onClick={() => onLogout?.()}
            className="w-full p-3.5 flex items-center justify-between hover:bg-neutral-50 transition cursor-pointer text-left text-rose-600"
          >
            <div className="flex items-center gap-3 font-semibold">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <LogOut className="w-4 h-4" />
              </div>
              <span>Выйти из аккаунта</span>
            </div>
          </button>
        </div>
        </>)}
      </div>
    </div>
  );
};
