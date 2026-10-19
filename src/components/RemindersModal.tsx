import { useModalFocus } from "./useModalFocus";
import React from "react";
import {
  X,
  Bell,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Wrench,
} from "lucide-react";
import { Vehicle, ToFixTask, OemScheduleItem, ReminderRecord } from "../types";
import { computeReminders, ComputedReminder } from "../reminders";

interface RemindersModalProps {
  vehicle: Vehicle;
  vehicles: Vehicle[];
  reminders: ReminderRecord[];
  toFixTasks: ToFixTask[];
  oemSchedules: OemScheduleItem[];
  onClose: () => void;
  onOpenOemSchedule: () => void;
  onOpenInventoryToFix: () => void;
  onResolveOem: (item: OemScheduleItem) => void;
}

export const RemindersModal: React.FC<RemindersModalProps> = ({
  vehicle,
  vehicles,
  reminders,
  toFixTasks,
  oemSchedules,
  onClose,
  onOpenOemSchedule,
  onOpenInventoryToFix,
  onResolveOem,
}) => {
  const vehicleTasks = toFixTasks.filter(
    (t) => t.vehicleId === vehicle.id && t.status !== "completed"
  );
  const vehicleOem = oemSchedules.filter((s) => s.vehicleId === vehicle.id);
  const computedReminders = computeReminders(reminders, vehicles);
  const currentVehicleReminders = computedReminders.filter((item) => item.vehicleId === vehicle.id);

  // Group into urgent and upcoming
  const urgentItems: Array<{
    id: string;
    type: "oem" | "task" | "reminder";
    title: string;
    subtitle: string;
    badge: string;
    rawItem?: any;
  }> = [];

  const upcomingItems: Array<{
    id: string;
    type: "oem" | "task" | "reminder";
    title: string;
    subtitle: string;
    badge: string;
    rawItem?: any;
  }> = [];

  vehicleOem.forEach((item) => {
    const lastKm = item.lastDoneKm ?? 0;
    const diffKm = vehicle.currentMileage - lastKm;
    const isOverdue = diffKm >= item.intervalKm;
    const isSoon = !isOverdue && diffKm >= item.intervalKm * 0.8;

    if (isOverdue) {
      urgentItems.push({
        id: "oem-" + item.id,
        type: "oem",
        title: item.title,
        subtitle: `Просрочено на ${(diffKm - item.intervalKm).toLocaleString("ru-RU")} км (Регламент: ${item.intervalKm} км)`,
        badge: "Срочно",
        rawItem: item,
      });
    } else if (isSoon) {
      upcomingItems.push({
        id: "oem-" + item.id,
        type: "oem",
        title: item.title,
        subtitle: `Осталось ${(item.intervalKm - diffKm).toLocaleString("ru-RU")} км до замены`,
        badge: "Скоро",
        rawItem: item,
      });
    }
  });

  vehicleTasks.forEach((task) => {
    if (task.priority === "high") {
      urgentItems.push({
        id: "task-" + task.id,
        type: "task",
        title: task.title,
        subtitle: task.description || "Высокий приоритет в списке To-Fix",
        badge: "Неисправность",
      });
    } else {
      upcomingItems.push({
        id: "task-" + task.id,
        type: "task",
        title: task.title,
        subtitle: `Плановый ремонт (~${task.estimatedCost || 0} ₽)`,
        badge: "В плане",
      });
    }
  });

  currentVehicleReminders.forEach((reminder: ComputedReminder) => {
    const target = reminder.daysLeft < 0 || reminder.daysLeft <= 7 ? urgentItems : upcomingItems;
    target.push({
      id: "reminder-" + reminder.id,
      type: "reminder",
      title: reminder.title,
      subtitle:
        reminder.daysLeft < 0
          ? `Просрочено на ${-reminder.daysLeft} дн. (${reminder.explanation})`
          : reminder.explanation,
      badge: reminder.daysLeft < 0 ? "Просрочено" : reminder.daysLeft <= 7 ? "Критично" : "Скоро",
    });
  });

  const dialogRef = useModalFocus(onClose);

  return (
    <div
      ref={dialogRef} role="dialog" aria-modal="true" aria-label="Напоминания" tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-neutral-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Fixed Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-neutral-100 shrink-0 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                {vehicle.make} {vehicle.model}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 leading-tight">
                Напоминания и предупреждения
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
            title="Закрыть (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 space-y-4">
          {/* Urgent items */}
          <div>
            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span>Требует внимания в первую очередь ({urgentItems.length})</span>
            </div>

            <div className="space-y-2">
              {urgentItems.length === 0 ? (
                <div className="p-3 bg-neutral-50 rounded-2xl text-xs text-neutral-500 text-center">
                  Критических просрочек нет.
                </div>
              ) : (
                urgentItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-red-50/60 border border-red-200 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-red-600 text-white uppercase">
                          {item.badge}
                        </span>
                        <span className="font-bold text-neutral-900 truncate">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 mt-1">
                        {item.subtitle}
                      </p>
                    </div>

                    {item.type === "oem" && item.rawItem && (
                      <button
                        onClick={() => {
                          onResolveOem(item.rawItem);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-[11px] shrink-0 shadow-sm"
                      >
                        Заменить
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming items */}
          <div>
            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Предстоящие события ({upcomingItems.length})</span>
            </div>

            <div className="space-y-2">
              {upcomingItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 uppercase">
                        {item.badge}
                      </span>
                      <span className="font-semibold text-neutral-800 truncate">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                      {item.subtitle}
                    </p>
                  </div>

                  <span className="text-[11px] text-neutral-400 shrink-0 font-mono">
                    в норме
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      {/* Fixed Action navigation buttons */}
      <div className="p-3.5 sm:px-6 border-t border-neutral-100 flex items-center justify-between shrink-0 bg-neutral-50/80">
        <button
          onClick={() => {
            onClose();
            onOpenOemSchedule();
          }}
          className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
        >
          <span>В регламент ТО</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={onClose}
          className="px-5 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-neutral-200/80 hover:bg-neutral-200 rounded-xl transition cursor-pointer"
        >
          Закрыть
        </button>
      </div>
    </div>
  </div>
);
};
