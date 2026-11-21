import React, { useEffect, useState } from "react";
import { LogIn, UserPlus, LogOut, Loader2, ShieldCheck } from "lucide-react";
import { login, logout, register, restoreSession, requestEmailCode, verifyEmailCode, requestPasswordReset, confirmPasswordReset, type AuthSession } from "../api";

export const AuthGate: React.FC<
  React.PropsWithChildren<{ onAuthenticated?: () => void }>
> = ({ children, onAuthenticated }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [emailMode, setEmailMode] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    restoreSession()
      .then((restored) => {
        setSession(restored);
        if (restored) onAuthenticated?.();
      })
      .catch(() => {
        // A missing API is a valid guest/offline state during local startup.
        setSession(null);
      })
      .finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0D131D] text-slate-200 flex items-center justify-center">
        <Loader2 className="animate-spin text-brand" />
      </div>
    );
  }

  if (!session) {
    const submit = async (event: React.FormEvent) => {
      event.preventDefault();
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        if (resetMode) {
          if (!resetRequested) {
            await requestPasswordReset(email.trim());
            setResetRequested(true);
            return;
          }
          await confirmPasswordReset(email.trim(), resetCode.trim(), resetPassword);
          setResetMode(false);
          setResetRequested(false);
          setResetCode("");
          setResetPassword("");
          setPassword("");
          setNotice("Пароль изменён. Войдите с новым паролем.");
          return;
        }
        const next = emailMode
          ? (codeRequested ? await verifyEmailCode(email, emailCode) : (await requestEmailCode(email), setCodeRequested(true), null))
          : (mode === "login" ? await login(email, password) : await register(email, password));
        if (next && "pendingEmailVerification" in next) {
          setEmail(next.email);
          setEmailMode(true);
          setCodeRequested(true);
          return;
        }
        if (!next) return;
        setSession(next);
        onAuthenticated?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка авторизации");
      } finally {
        setBusy(false);
      }
    };

    return (
      <main className="min-h-screen bg-[#0D131D] text-slate-200 flex items-center justify-center p-4">
        <form
          onSubmit={submit}
          className="w-full max-w-md rounded-2xl bg-[#17202E] border border-[#243044] p-7 shadow-2xl shadow-black/40 space-y-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#B91C1C] to-[#EF3038] flex items-center justify-center font-black text-sm text-white shadow-sm">
              GH
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white leading-none">
                Garage<span className="text-[#EF3038]">AI</span>
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Личный гараж и история обслуживания
              </p>
            </div>
          </div>

          <div className="flex gap-2 rounded-xl bg-[#0D131D] p-1">
            <button
              type="button"
              onClick={() => { setMode("login"); setEmailMode(false); setCodeRequested(false); setResetMode(false); setResetRequested(false); setError(null); setNotice(null); }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-[#B91C1C] text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LogIn className="inline w-4 h-4 mr-1" />Войти
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setEmailMode(false); setCodeRequested(false); setResetMode(false); setResetRequested(false); setError(null); setNotice(null); }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-[#B91C1C] text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <UserPlus className="inline w-4 h-4 mr-1" />Регистрация
            </button>
          </div>
          {!resetMode && mode === "login" && <button type="button" className="w-full text-xs text-slate-400 hover:text-white" onClick={() => { setEmailMode((value) => !value); setError(null); setNotice(null); setCodeRequested(false); }}>
            {emailMode ? "Войти по почте и паролю" : "Войти по коду из письма"}
          </button>}

          {resetMode ? <>
            <label className="block text-sm text-slate-300">
              Электронная почта
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="mt-1 w-full rounded-lg bg-[#0D131D] border border-[#243044] px-3 py-2 text-slate-100 outline-none focus:border-brand/60" required />
            </label>
            {resetRequested && <>
              <p role="status" className="text-xs text-slate-400">Если аккаунт с таким email существует, код отправлен на почту.</p>
              <input inputMode="numeric" pattern="[0-9]{6}" value={resetCode} onChange={(e) => setResetCode(e.target.value)} autoComplete="one-time-code" placeholder="Код из письма" className="w-full rounded-lg bg-[#0D131D] border border-[#243044] px-3 py-2 text-slate-100 outline-none focus:border-brand/60" required />
              <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} autoComplete="new-password" placeholder="Новый пароль" minLength={8} className="w-full rounded-lg bg-[#0D131D] border border-[#243044] px-3 py-2 text-slate-100 outline-none focus:border-brand/60" required />
            </>}
          </> : emailMode ? <label className="block text-sm text-slate-300">
            Электронная почта
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="mt-1 w-full rounded-lg bg-[#0D131D] border border-[#243044] px-3 py-2 text-slate-100 outline-none focus:border-brand/60" required />
            {codeRequested && <input inputMode="numeric" pattern="[0-9]{6}" value={emailCode} onChange={(e) => setEmailCode(e.target.value)} placeholder="Код из письма" className="mt-2 w-full rounded-lg bg-[#0D131D] border border-[#243044] px-3 py-2 text-slate-100 outline-none focus:border-brand/60" required />}
          </label> : <label className="block text-sm text-slate-300">
            Электронная почта
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="mt-1 w-full rounded-lg bg-[#0D131D] border border-[#243044] px-3 py-2 text-slate-100 outline-none focus:border-brand/60" required />
          </label>}
          {!emailMode && !resetMode && <label className="block text-sm text-slate-300">
            Пароль
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="mt-1 w-full rounded-lg bg-[#0D131D] border border-[#243044] px-3 py-2 text-slate-100 outline-none focus:border-brand/60"
              required
              minLength={8}
            />
            {mode === "register" && (
              <span className="mt-1 block text-[11px] text-slate-500">
                Минимум 8 символов
              </span>
            )}
          </label>}
          {!emailMode && !resetMode && mode === "login" && <button type="button" className="w-full text-xs text-slate-400 hover:text-white" onClick={() => { setResetMode(true); setResetRequested(false); setResetCode(""); setResetPassword(""); setPassword(""); setError(null); }}>
            Восстановить пароль
          </button>}
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-brand-deep/50 border border-brand-hover px-3 py-2 text-sm text-brand-border"
            >
              {error}
            </p>
          )}
          {notice && <p role="status" className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">{notice}</p>}
          <button
            disabled={busy}
            className="w-full rounded-lg bg-[#B91C1C] hover:bg-[#991B1B] py-3 font-semibold text-white transition disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="mx-auto animate-spin" />
            ) : resetMode ? (resetRequested ? "Изменить пароль" : "Отправить код") : emailMode ? (codeRequested ? "Войти" : "Отправить код") : mode === "login" ? (
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
        className="fixed bottom-4 right-4 z-[70] rounded-lg bg-[#17202E]/95 border border-[#243044] px-3 py-2 text-xs text-slate-300 shadow-lg hover:border-brand/40 hover:text-white transition"
      >
        <LogOut className="inline w-4 h-4 mr-1" />
        {session.email || "Аккаунт"}
      </button>
    </>
  );
};
