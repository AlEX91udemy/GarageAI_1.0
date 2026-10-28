import React from "react";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { MobileScreenId } from "../types";
import { GeneratedNotification } from "../../notifications";
import { ThemeMode } from "../theme";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  category: "service" | "problem" | "ai" | "fuel";
  date: string;
  isRead: boolean;
  targetScreen: MobileScreenId;
}

interface NotificationsScreenProps {
  onBack: () => void;
  onNavigate: (screen: MobileScreenId) => void;
  themeMode?: ThemeMode;
  notifications: GeneratedNotification[];
  readIds?: string[];
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onBack,
  onNavigate,
  themeMode = "light",
  notifications: generatedNotifications,
  readIds = [],
  onMarkRead,
  onMarkAllRead,
}) => {
  const isDark = themeMode === "dark";
  const notifications: NotificationItem[] = generatedNotifications.map(n => ({ ...n, isRead: readIds.includes(n.id) }));
  /*
    {
      id: "notif-1",
      title: "Приближается плановое ТО: Замена масла",
      description: "Осталось менее 1 200 км до планового регламента (85 000 км).",
      category: "service",
      date: "Сегодня, 10:15",
      isRead: false,
      targetScreen: "service",
    },
    {
      id: "notif-2",
      title: "Garage AI: Рекомендация по охлаждению",
      description: "Антифриз не менялся 55 000 км. Зафиксированы канистры на складе.",
      category: "ai",
      date: "Вчера, 18:30",
      isRead: false,
      targetScreen: "ai_diagnostics",
    },
    {
      id: "notif-3",
      title: "Запчасть прибыла в гараж",
      description: "Фильтр масляный Mann W67/1 поступил на полку хранения А2.",
      category: "service",
      date: "12 сен",
      isRead: true,
      targetScreen: "parts",
    },
  ]); */

  const handleMarkAllRead = () => {
    onMarkAllRead?.();
  };

  return (
    <div
      className={`flex flex-col w-full pb-10 select-none ${
        isDark ? "text-white" : "text-neutral-900"
      }`}
    >
      {/* Header */}
      <div
        className={`sticky top-0 z-30 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b ${
          isDark
            ? "bg-neutral-950/90 border-neutral-800/80"
            : "bg-white/90 border-neutral-200"
        }`}
      >
        <button
          onClick={onBack}
          className={`flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95 ${
            isDark
              ? "text-neutral-300 hover:text-white"
              : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад</span>
        </button>

        <span
          className={`text-xs font-bold ${isDark ? "text-white" : "text-neutral-900"}`}
        >
          Уведомления
        </span>

        <button
          onClick={handleMarkAllRead}
          className={`text-[11px] font-medium cursor-pointer ${
            isDark
              ? "text-brand-on-dark hover:text-brand-light"
              : "text-brand-strong hover:text-brand-strong"
          }`}
        >
          Прочитать все
        </button>
      </div>

      <div className="p-4 space-y-2.5">
        {notifications.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              onMarkRead?.(item.id);
              onNavigate?.(item.targetScreen);
            }}
            className={`p-3.5 rounded-2xl border transition active:scale-[0.99] cursor-pointer flex items-start gap-3 ${
              item.isRead
                ? isDark
                  ? "bg-neutral-900/60 border-neutral-800 opacity-80"
                  : "bg-[#F8FAFC] border-neutral-200 opacity-80"
                : isDark
                  ? "bg-neutral-900 border-neutral-700 shadow-md"
                  : "bg-white border-[#E2E8F0] shadow-xs"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                item.category === "ai"
                  ? isDark
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : "bg-amber-50 text-amber-600 border border-amber-200"
                  : isDark
                    ? "bg-brand/15 text-brand-on-dark border border-brand/30"
                    : "bg-brand-soft text-brand-strong border border-brand-border"
              }`}
            >
              {item.category === "ai" ? (
                <Sparkles className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline gap-1">
                <h4
                  className={`text-xs font-bold leading-tight ${
                    item.isRead
                      ? isDark
                        ? "text-neutral-300"
                        : "text-neutral-500"
                      : isDark
                        ? "text-white font-black"
                        : "text-neutral-900 font-black"
                  }`}
                >
                  {item.title}
                </h4>
                {!item.isRead && (
                  <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                )}
              </div>

              <p
                className={`text-[11px] mt-1 leading-relaxed ${
                  isDark ? "text-neutral-400" : "text-neutral-600"
                }`}
              >
                {item.description}
              </p>

              <div
                className={`text-[10px] font-mono mt-2 flex justify-between items-center ${
                  isDark ? "text-neutral-500" : "text-neutral-400"
                }`}
              >
                <span>{item.date}</span>
                <span
                  className={`flex items-center gap-0.5 ${
                    isDark ? "text-brand-on-dark" : "text-brand-strong"
                  }`}
                >
                  Открыть <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
