import React, { useEffect, useState } from "react";
import { LogIn, UserPlus, LogOut, Loader2, ShieldCheck } from "lucide-react";
import { login, logout, register, restoreSession, type AuthSession } from "../api";

export const AuthGate: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    restoreSession().then(setSession).finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  if (!session) {
    const submit = async (event: React.FormEvent) => {
      event.preventDefault();
      setBusy(true);
      setError(null);
      try {
        const next = mode === "login" ? await login(username, password) : await register(username, password);
        setSession(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка авторизации");
      } finally {
        setBusy(false);
      }
    };

    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl space-y-5">
          <div className="flex items-center gap-3"><ShieldCheck className="text-emerald-400" /><div><h1 className="text-xl font-bold">GarageHub</h1><p className="text-xs text-neutral-400">Личный гараж и история обслуживания</p></div></div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode("login")} className={`flex-1 rounded-xl px-3 py-2 text-sm ${mode === "login" ? "bg-emerald-500 text-neutral-950" : "bg-neutral-800 text-neutral-300"}`}><LogIn className="inline w-4 h-4 mr-1" />Войти</button>
            <button type="button" onClick={() => setMode("register")} className={`flex-1 rounded-xl px-3 py-2 text-sm ${mode === "register" ? "bg-emerald-500 text-neutral-950" : "bg-neutral-800 text-neutral-300"}`}><UserPlus className="inline w-4 h-4 mr-1" />Регистрация</button>
          </div>
          <label className="block text-sm">Логин<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" className="mt-1 w-full rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none focus:border-emerald-400" required /></label>
          <label className="block text-sm">Пароль<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} className="mt-1 w-full rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none focus:border-emerald-400" required minLength={8} /></label>
          {error && <p role="alert" className="rounded-xl bg-red-950/60 border border-red-800 px-3 py-2 text-sm text-red-200">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-neutral-950 disabled:opacity-50">{busy ? <Loader2 className="mx-auto animate-spin" /> : mode === "login" ? "Войти" : "Создать аккаунт"}</button>
        </form>
      </main>
    );
  }

  return <>{children}<button type="button" onClick={() => { void logout().finally(() => setSession(null)); }} className="fixed bottom-4 right-4 z-[70] rounded-xl bg-neutral-900/90 border border-neutral-700 px-3 py-2 text-xs text-neutral-200 shadow-lg"><LogOut className="inline w-4 h-4 mr-1" />{session.username}</button></>;
};
