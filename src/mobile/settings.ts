export const NOTIFY_SERVICE_KEY = "garagehub_notify_service";
export const NOTIFY_AI_KEY = "garagehub_notify_ai";
export const GARAGE_SETTINGS_CHANGE_EVENT = "garage-settings-change";
export const NOTIFICATION_READ_IDS_KEY = "garagehub_notification_read_ids";

export interface NotificationPreferences {
  service: boolean;
  ai: boolean;
}

export function readNotificationPreferences(): NotificationPreferences {
  try {
    return {
      service: localStorage.getItem(NOTIFY_SERVICE_KEY) !== "false",
      ai: localStorage.getItem(NOTIFY_AI_KEY) !== "false",
    };
  } catch {
    return { service: true, ai: true };
  }
}

export function notifyGarageSettingsChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GARAGE_SETTINGS_CHANGE_EVENT));
  }
}

export function readNotificationReadIds(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(NOTIFICATION_READ_IDS_KEY) || "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function saveNotificationReadIds(ids: string[]): void {
  try {
    localStorage.setItem(NOTIFICATION_READ_IDS_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    // Ignore storage failures in embedded/private browsers.
  }
}
