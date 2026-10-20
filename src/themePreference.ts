export type ThemePreference = "light" | "dark";

export const THEME_STORAGE_KEY = "garagehub_theme";

/** Default app theme. Light is the product default (see design Photo 2). */
export const DEFAULT_THEME: ThemePreference = "light";

/**
 * Bumped whenever the default theme changes. It lets a stale value written by
 * an older default be dropped exactly once, so explicit user choices survive
 * every future default change.
 */
const THEME_MIGRATION_KEY = "garagehub_theme_default_v2";

export function readThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      if (localStorage.getItem(THEME_MIGRATION_KEY) === null) {
        localStorage.setItem(THEME_MIGRATION_KEY, DEFAULT_THEME);
        // The stored value was written by a previous default, not by the user.
        if (saved !== DEFAULT_THEME) {
          localStorage.removeItem(THEME_STORAGE_KEY);
        }
        return DEFAULT_THEME;
      }
      return saved;
    }
  } catch {
    // localStorage unavailable (private mode, embedded webview) - keep default.
  }
  return DEFAULT_THEME;
}

export function saveThemePreference(theme: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.setItem(THEME_MIGRATION_KEY, theme);
  } catch {
    // ignore persistence failures
  }
}

export function applyThemePreference(theme: ThemePreference): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}