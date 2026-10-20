import React, { useEffect, useState } from "react";
import { LogIn, UserPlus, LogOut, Loader2, ShieldCheck } from "lucide-react";
import { login, logout, register, restoreSession, type AuthSession } from "../api";

export const AuthGate: React.FC<
  React.PropsWithChildren<{ onAuthenticated?: () => void }>
> = ({ children, onAuthenticated }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    restoreSession()
      .then((restored) => {
        setSession(restored);
        if (restored) onAuthenticated?.();
      })
      .finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#06090e] text-slate-200 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#EF4444]" />
      </div>
    );
  }

  if (!session) {
    const submit = async (event: React.FormEvent) => {
      event.preventDefault();
      setBusy(true);
      setError(null);
      try {
        const next = mode === "login" ? await login(username, password) : await register(username, password);
        setSession(next);
        onAuthenticated?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка авторизации");
      } finally {
        setBusy(false);
      }
    };

    return (
      <main className="min-h-screen bg-[#06090e] text-slate-200 flex items-center justify-center p-4">
        <form
          onSubmit={submit}
          className="w-full max-w-md rounded-2xl bg-[#0B0E14] border border-[#1E293B] p-7 shadow-2xl shadow-black/40 space-y-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F97316] to-[#EF4444] flex items-center justify-center font-black text-sm text-white shadow-sm">
              GH
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white leading-none">
                Garage<span className="text-[#F97316]">Hub</span>
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Личный гараж и история обслуживания
              </p>
            </div>
          </div>

          <div className="flex gap-2 rounded-xl bg-[#111827] p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-[#EF4444] text-[#06090e] shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LogIn className="inline w-4 h-4 mr-1" />Войти
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-[#EF4444] text-[#06090e] shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <UserPlus className="inline w-4 h-4 mr-1" />Регистрация
            </button>
          </div>

          <label className="block text-sm text-slate-300">
            Логин
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="mt-1 w-full rounded-lg bg-[#111827] border border-[#1E293B] px-3 py-2 text-slate-100 outline-none focus:border-[#EF4444]/60"
              required
            />
          </label>
          <label className="block text-sm text-slate-300">
            Пароль
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="mt-1 w-full rounded-lg bg-[#111827] border border-[#1E293B] px-3 py-2 text-slate-100 outline-none focus:border-[#EF4444]/60"
              required
              minLength={8}
            />
            {mode === "register" && (
              <span className="mt-1 block text-[11px] text-slate-500">
                Минимум 8 символов
              </span>
            )}
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-950/50 border border-red-900 px-3 py-2 text-sm text-red-200"
            >
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="w-full rounded-lg bg-[#F97316] hover:bg-[#EA580C] py-3 font-semibold text-white transition disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="mx-auto animate-spin" />
            ) : mode === "login" ? (
              "Войти"
            ) : (
              "Создать аккаунт"
            )}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5" /> Данные хранятся на вашем сервере
          </p>
        </form>
      </main>
    );
  }

  return (
    <>
      {children}
      <button
        type="button"
        onClick={() => {
          void logout().finally(() => setSession(null));
        }}
        title="Выйти из аккаунта"
        className="fixed bottom-4 right-4 z-[70] rounded-lg bg-[#0B0E14]/95 border border-[#1E293B] px-3 py-2 text-xs text-slate-300 shadow-lg hover:border-[#EF4444]/40 hover:text-white transition"
      >
        <LogOut className="inline w-4 h-4 mr-1" />
        {session.username}
      </button>
    </>
  );
};
