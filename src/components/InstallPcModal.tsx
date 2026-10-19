import React, { useState, useEffect } from "react";
import { X, Monitor, Download, Chrome, Compass, Check, ExternalLink, ShieldCheck, Zap, HardDrive } from "lucide-react";
import { useModalFocus } from "./useModalFocus";

interface InstallPcModalProps {
  onClose: () => void;
  deferredPrompt?: any;
  onInstallSuccess?: () => void;
}

export function InstallPcModal({ onClose, deferredPrompt, onInstallSuccess }: InstallPcModalProps) {
  const modalRef = useModalFocus(onClose);
  const [activeTab, setActiveTab] = useState<"chrome" | "edge" | "yandex">("chrome");
  const [isInstalling, setIsInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Detect current browser to open relevant tab by default
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("edg/")) {
      setActiveTab("edge");
    } else if (ua.includes("yaBrowser") || ua.includes("yabrowser")) {
      setActiveTab("yandex");
    } else {
      setActiveTab("chrome");
    }
  }, []);

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    try {
      setIsInstalling(true);
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setInstalled(true);
        onInstallSuccess?.();
      }
    } catch (err) {
      console.warn("Installation prompt error:", err);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-pc-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="w-full max-w-xl bg-white dark:bg-[#111722] text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-[#243044] overflow-hidden flex flex-col max-h-[92vh] outline-none"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#243044] bg-slate-50/75 dark:bg-[#16202e]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-600/30">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h2 id="install-pc-modal-title" className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Установка GarageHub на компьютер (ПК)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Автономное приложение Windows / macOS / Linux без рамок браузера
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-[#1e293b] transition cursor-pointer"
            aria-label="Закрыть окно установки"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Quick One-Click Install Banner if browser supports beforeinstallprompt */}
          {deferredPrompt && !installed && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-red-600/10 via-red-500/10 to-transparent border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5 text-sm">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Ваш браузер готов к быстрой установке
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Нажмите кнопку ниже, чтобы добавить приложение на Рабочий стол и в меню «Пуск».
                </div>
              </div>
              <button
                type="button"
                onClick={handleNativeInstall}
                disabled={isInstalling}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-red-600/25 transition shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isInstalling ? "Установка..." : "Установить в 1 клик"}</span>
              </button>
            </div>
          )}

          {installed && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-2.5 font-medium text-xs">
              <Check className="w-5 h-5 shrink-0" />
              <span>Приложение успешно установлено на ваш компьютер! Ярлык доступен на Рабочем столе и в панели задач.</span>
            </div>
          )}

          {/* Browser Selection Tabs */}
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Инструкция для вашего браузера:
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-[#131b26] rounded-xl border border-slate-200 dark:border-[#243044]">
              <button
                type="button"
                onClick={() => setActiveTab("chrome")}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "chrome"
                    ? "bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-[#334155]"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Chrome className="w-3.5 h-3.5 text-blue-500" />
                <span>Google Chrome</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("edge")}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "edge"
                    ? "bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-[#334155]"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-cyan-500" />
                <span>Microsoft Edge</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("yandex")}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "yandex"
                    ? "bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-[#334155]"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Monitor className="w-3.5 h-3.5 text-red-500" />
                <span>Яндекс / Другие</span>
              </button>
            </div>
          </div>

          {/* Tab Content Step-by-Step */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#243044] bg-slate-50/50 dark:bg-[#131b26]/50 space-y-3">
            {activeTab === "chrome" && (
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">Способ через адресную строку (самый быстрый):</span>
                    <p className="text-slate-600 dark:text-slate-300 text-xs mt-0.5">
                      В правой части адресной строки браузера (рядом со значком закладки «★») нажмите на иконку <strong className="text-red-600 dark:text-red-400">«Установить приложение GarageHub»</strong> (монитор со стрелкой вниз).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">Способ через меню Chrome:</span>
                    <p className="text-slate-600 dark:text-slate-300 text-xs mt-0.5">
                      Нажмите кнопку меню <strong className="font-mono">⋮</strong> (три точки в правом верхнем углу) → выберите пункт <strong className="text-red-600 dark:text-red-400">«Сохранить и поделиться»</strong> → <strong className="text-red-600 dark:text-red-400">«Установить приложение GarageHub...»</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">Подтвердите установку:</span>
                    <p className="text-slate-600 dark:text-slate-300 text-xs mt-0.5">
                      Во всплывающем окне нажмите кнопку <strong>«Установить»</strong>. Ярлык появится на вашем Рабочем столе!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "edge" && (
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-cyan-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">Значок в адресной строке:</span>
                    <p className="text-slate-600 dark:text-slate-300 text-xs mt-0.5">
                      В правой части адресной строки нажмите на иконку из трёх квадратов и плюса <strong className="text-cyan-600 dark:text-cyan-400">«Доступно приложение: установить GarageHub»</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-cyan-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">Через меню Edge:</span>
                    <p className="text-slate-600 dark:text-slate-300 text-xs mt-0.5">
                      Нажмите меню <strong className="font-mono">…</strong> (три точки) → выберите <strong className="text-cyan-600 dark:text-cyan-400">«Приложения»</strong> → <strong className="text-cyan-600 dark:text-cyan-400">«Установить GarageHub»</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-cyan-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">Закрепление:</span>
                    <p className="text-slate-600 dark:text-slate-300 text-xs mt-0.5">
                      Edge предложит закрепить приложение на панели задач Windows и в меню «Пуск».
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "yandex" && (
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">В Яндекс.Браузере:</span>
                    <p className="text-slate-600 dark:text-slate-300 text-xs mt-0.5">
                      В конце адресной строки нажмите на значок <strong className="text-red-600 dark:text-red-400">«Установить приложение»</strong> или нажмите меню (≡) → <strong className="text-red-600 dark:text-red-400">«Дополнительно»</strong> → <strong className="text-red-600 dark:text-red-400">«Создать ярлык...»</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">Открывать как отдельное окно:</span>
                    <p className="text-slate-600 dark:text-slate-300 text-xs mt-0.5">
                      Обязательно поставьте галочку <strong>«Открывать в отдельном окне»</strong> и нажмите <strong>«Создать»</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">Готово:</span>
                    <p className="text-slate-600 dark:text-slate-300 text-xs mt-0.5">
                      Ярлык GarageHub появится на вашем рабочем столе. При запуске он откроется в собственном окне без вкладок и адресной строки.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Advantages of PC Installation */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#131b26] border border-slate-200 dark:border-[#243044]">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                <HardDrive className="w-3.5 h-3.5 text-blue-500" />
                <span>Работа офлайн</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                Сервисная книжка и регламент ТО доступны даже без интернета (например, в подземном гараже).
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#131b26] border border-slate-200 dark:border-[#243044]">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                <Monitor className="w-3.5 h-3.5 text-emerald-500" />
                <span>Чистый экран</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                Работает как полноценная программа: на панели задач, без адресной строки и лишних вкладок.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#131b26] border border-slate-200 dark:border-[#243044]">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>Авто-сохранение</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                Все записи о ремонтах, заправках и запчастях мгновенно сохраняются в локальную базу данных.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-[#243044] bg-slate-50 dark:bg-[#131b26]">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Версия PWA 2.4 · Windows, macOS, Linux
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-[#1e293b] dark:hover:bg-[#28374d] text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
