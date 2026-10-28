export const NOTIFY_SERVICE_KEY = "garagehub_notify_service";
export const NOTIFY_AI_KEY = "garagehub_notify_ai";
export const GARAGE_SETTINGS_CHANGE_EVENT = "garage-settings-change";

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
