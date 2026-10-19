import { ReminderRecord, Vehicle } from "./types";

export type ReminderUrgency = "expired" | "critical" | "upcoming";

export interface ComputedReminder {
  id: string;
  kind: ReminderRecord["kind"];
  title: string;
  /** Дата, до которой нужно завершить оплату/продление */
  dueDate: string;
  daysLeft: number;
  urgency: ReminderUrgency;
  price: number | null;
  vehicleId: string;
  explanation: string;
}

const KIND_TITLE: Record<ReminderRecord["kind"], string> = {
  osago: "ОСАГО",
  kasko: "КАСКО",
  tax: "Транспортный налог",
};

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function shiftMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() < day) result.setDate(0); // clamp to end of month
  return result;
}

function kindRange(reminder: ReminderRecord, now: Date): { start: Date; end: Date } {
  const start = new Date(reminder.startDate + "T00:00:00");
  if (reminder.kind === "tax") {
    const year = start.getFullYear();
    return { start, end: new Date(year + 1, 11, 1) }; // 1 декабря следующего года
  }
  const months = reminder.durationMonths ?? 12;
  return { start, end: shiftMonths(start, months) };
}

export function computeReminders(
  reminders: ReminderRecord[],
  vehicles: Vehicle[],
  now: Date = new Date()
): ComputedReminder[] {
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return reminders
    .map((reminder): ComputedReminder | null => {
      const vehicle = vehicleById.get(reminder.vehicleId);
      if (!vehicle) return null;
      if (Number.isNaN(Date.parse(reminder.startDate))) return null;
      const { start, end } = kindRange(reminder, today);
      const daysLeft = daysBetween(today, end);
      if (daysLeft < -365) return null; // старьё, неактуальные записи

      const urgency: ReminderUrgency =
        daysLeft < 0 ? "expired" : daysLeft <= 7 ? "critical" : daysLeft <= 30 ? "upcoming" : "upcoming";

      const formattedStart = start.toLocaleDateString("ru-RU");
      const formattedEnd = end.toLocaleDateString("ru-RU");
      const explanation =
        reminder.kind === "tax"
          ? `Налоговый период ${start.getFullYear()}: оплатить до ${formattedEnd}.`
          : `Полис действует с ${formattedStart} по ${formattedEnd}, осталось ${Math.max(daysLeft, 0)} дн.`;

      return {
        id: reminder.id,
        kind: reminder.kind,
        title: `${KIND_TITLE[reminder.kind]} — ${vehicle.make} ${vehicle.model}`,
        dueDate: end.toISOString().slice(0, 10),
        daysLeft,
        urgency,
        price: typeof reminder.price === "number" && Number.isFinite(reminder.price) ? reminder.price : null,
        vehicleId: reminder.vehicleId,
        explanation,
      };
    })
    .filter((item): item is ComputedReminder => item !== null)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}
