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
  LogIn,
  UserPlus,
  Loader2,
} from "lucide-react";
import { Vehicle, ServiceRecord, GaragePart } from "../../types";
import { MobileScreenId } from "../types";
import { login, register, restoreSession, requestEmailLoginCode, verifyEmailLoginCode } from "../../api";

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
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [sessionUsername, setSessionUsername] = React.useState<string | null>(null);
  const [authMode, setAuthMode] = React.useState<"login" | "register" | null>(null);
  const [authUsername, setAuthUsername] = React.useState("");
  const [authEmail, setAuthEmail] = React.useState("");
  const [authCode, setAuthCode] = React.useState("");
  const [emailCodeRequested, setEmailCodeRequested] = React.useState(false);
  const [useLegacyLogin, setUseLegacyLogin] = React.useState(false);
  const [authNotice, setAuthNotice] = React.useState<string | null>(null);
  const [authPassword, setAuthPassword] = React.useState("");
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [authBusy, setAuthBusy] = React.useState(false);

  React.useEffect(() => {
    restoreSession().then((session) => {
      setIsAuthenticated(Boolean(session));
      setSessionUsername(session?.username ?? null);
    });
  }, []);

  const totalMileage = vehicles.reduce((sum, v) => sum + v.currentMileage, 0);
  const totalServiceSpent = serviceRecords.reduce(
    (sum, r) => sum + (r.totalCost || 0),
    0
  );

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!authMode) return;
    setAuthBusy(true);
    setAuthError(null);
    try {
      if (authMode === "login" && !useLegacyLogin && !emailCodeRequested) {
        const message = await requestEmailLoginCode(authEmail.trim(), authPassword);
        setEmailCodeRequested(true);
        setAuthNotice(message);
        setAuthPassword("");
        return;
      }
      const session = authMode === "login"
        ? useLegacyLogin ? await login(authUsername.trim(), authPassword) : await verifyEmailLoginCode(authEmail.trim(), authCode.trim())
        : await register(authUsername.trim(), authPassword, authEmail.trim());
      setIsAuthenticated(true);
      setSessionUsername(session.username);
      setAuthMode(null);
      setAuthPassword("");
      setAuthCode("");
      setEmailCodeRequested(false);
      setAuthNotice(null);
      onAuthSuccess?.();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Ошибка авторизации");
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-10 bg-neutral-100 text-neutral-900 select-none">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-[#0d131d]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-neutral-200/80 dark:border-[#243044] shadow-xs">
        <h2 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">
          Профиль владельца
        </h2>
        <button
          onClick={() => onNavigate("settings")}
          className="w-9 h-9 rounded-xl bg-neutral-50 dark:bg-[#17202e] border border-neutral-200 dark:border-[#243044] flex items-center justify-center text-neutral-600 dark:text-slate-300 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3.5">
        {/* User Card */}
        <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-strong to-neutral-900 flex items-center justify-center font-black text-lg text-white shadow-sm">
            AS
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black text-neutral-900 truncate">
              {isAuthenticated ? sessionUsername ?? "Владелец гаража" : "Гостевой профиль"}
            </h3>
            {isAuthenticated && (
              <div className="text-xs text-neutral-500 font-mono truncate">
                {userEmail}
              </div>
            )}
            <div className={`mt-1 flex items-center gap-1.5 text-[10px] font-bold ${isAuthenticated ? "text-emerald-600" : "text-neutral-500"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isAuthenticated ? "bg-emerald-500" : "bg-neutral-400"}`} />
              <span>{isAuthenticated ? "Garage AI PRO • Синхронизировано" : "Гостевой режим • Аккаунт не подключён"}</span>
            </div>
          </div>
        </div>

        {!isAuthenticated && (
          <div className="rounded-3xl bg-white border border-neutral-200/90 shadow-xs p-4 space-y-3">
            <div>
              <h3 className="text-sm font-black text-neutral-900">Синхронизация гаража</h3>
              <p className="mt-1 text-xs text-neutral-500">
                Войдите или создайте аккаунт, чтобы сохранить данные на сервере.
              </p>
            </div>
            {!authMode ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setAuthMode("login"); setAuthError(null); setAuthNotice(null); setEmailCodeRequested(false); setUseLegacyLogin(false); setAuthCode(""); }}
                  className="rounded-xl bg-brand-strong px-3 py-2.5 text-xs font-bold text-white transition hover:bg-brand-hover"
                >
                  <LogIn className="mr-1 inline h-4 w-4" />
                  Войти
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode("register"); setAuthError(null); setAuthNotice(null); setEmailCodeRequested(false); setAuthCode(""); }}
                  className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs font-bold text-neutral-800 transition hover:bg-neutral-100"
                >
                  <UserPlus className="mr-1 inline h-4 w-4" />
                  Регистрация
                </button>
              </div>
            ) : (
              <form onSubmit={submitAuth} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-700">
                    {authMode === "login" ? "Вход в аккаунт" : "Новый аккаунт"}
                  </span>
                  <button type="button" onClick={() => setAuthMode(null)} className="text-xs font-semibold text-neutral-500 hover:text-neutral-900">
                    Отмена
                  </button>
                </div>
                {(authMode === "register" || (authMode === "login" && useLegacyLogin)) && (
                  <input
                    value={authUsername}
                    onChange={(event) => setAuthUsername(event.target.value)}
                    placeholder="Логин"
                    autoComplete="username"
                    required
                    maxLength={32}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-brand-strong"
                  />
                )}
                {(!useLegacyLogin || authMode === "register") && (
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(event) => setAuthEmail(event.target.value)}
                    placeholder="Gmail / электронная почта"
                    autoComplete="email"
                    required
                    maxLength={254}
                    disabled={authMode === "login" && emailCodeRequested}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-brand-strong disabled:opacity-70"
                  />
                )}
                {!emailCodeRequested && (
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    placeholder="Пароль"
                    autoComplete={authMode === "login" ? "current-password" : "new-password"}
                    minLength={8}
                    required
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-brand-strong"
                  />
                )}
                {emailCodeRequested && (
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={authCode}
                    onChange={(event) => setAuthCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
                    placeholder="Код из письма (8 цифр)"
                    minLength={8}
                    maxLength={8}
                    required
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-brand-strong"
                  />
                )}
                {authNotice && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{authNotice}</p>}
                {authError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{authError}</p>}
                <button type="submit" disabled={authBusy} className="w-full rounded-xl bg-brand-strong px-3 py-2.5 text-xs font-bold text-white transition hover:bg-brand-hover disabled:opacity-60">
                  {authBusy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : authMode === "register" ? "Создать аккаунт" : useLegacyLogin ? "Войти" : emailCodeRequested ? "Подтвердить код" : "Получить код на почту"}
                </button>
                {emailCodeRequested && (
                  <button type="button" onClick={() => { setEmailCodeRequested(false); setAuthCode(""); setAuthNotice(null); setAuthError(null); }} className="w-full text-xs font-semibold text-neutral-500 hover:text-neutral-900">
                    Вернуться к вводу пароля
                  </button>
                )}
              </form>
            )}
          </div>
        )}

        {isAuthenticated && (<>
        {/* Global Garage Statistics */}
        <div className="hidden p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
            Статистика автопарка
          </h3>

          <div className="grid grid-cols-1 gap-2.5">
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
              <div className="w-7 h-7 rounded-lg bg-brand-soft text-brand-strong flex items-center justify-center">
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
            onClick={() => {
              setIsAuthenticated(false);
              setSessionUsername(null);
              setAuthMode(null);
              onLogout?.();
            }}
            className="w-full p-3.5 flex items-center justify-between hover:bg-neutral-50 transition cursor-pointer text-left text-brand-strong"
          >
            <div className="flex items-center gap-3 font-semibold">
              <div className="w-7 h-7 rounded-lg bg-brand-soft text-brand-strong flex items-center justify-center">
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
                {authMode === "login" && !emailCodeRequested && (
                  <button type="button" onClick={() => { setUseLegacyLogin((value) => !value); setAuthError(null); setAuthNotice(null); setAuthPassword(""); }} className="w-full text-xs font-semibold text-neutral-500 hover:text-neutral-900">
                    {useLegacyLogin ? "Войти по email с кодом" : "Войти по старому логину"}
                  </button>
                )}
