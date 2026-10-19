import React, { useState } from "react";
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
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onBack,
  onNavigate,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
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
  ]);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="flex flex-col w-full pb-10 text-white select-none">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-neutral-800/80">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад</span>
        </button>

        <span className="text-xs font-bold text-white">Уведомления</span>

        <button
          onClick={handleMarkAllRead}
          className="text-[11px] font-medium text-red-400 hover:text-red-300 cursor-pointer"
        >
          Прочитать все
        </button>
      </div>

      <div className="p-4 space-y-2.5">
        {notifications.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              onNavigate?.(item.targetScreen);
            }}
            className={`p-3.5 rounded-2xl border transition active:scale-[0.99] cursor-pointer flex items-start gap-3 ${
              item.isRead
                ? "bg-neutral-900/60 border-neutral-850 opacity-80"
                : "bg-neutral-900 border-neutral-750 shadow-md"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                item.category === "ai"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "bg-red-500/15 text-red-400 border border-red-500/30"
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
                    item.isRead ? "text-neutral-300" : "text-white font-black"
                  }`}
                >
                  {item.title}
                </h4>
                {!item.isRead && (
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                )}
              </div>

              <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                {item.description}
              </p>

              <div className="text-[10px] text-neutral-500 font-mono mt-2 flex justify-between items-center">
                <span>{item.date}</span>
                <span className="text-red-400 flex items-center gap-0.5">
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
