/**
 * Garage AI Mobile Design System Tokens & Style Definitions
 * Matches exact color schemes and naming from the user screenshots
 * Photo 1: Deep obsidian/slate-blue dark mode with vibrant red accent
 * Photo 2: Clean crisp light mode with white surfaces and vibrant red accent
 */

export type ThemeMode = "dark" | "light";
export type DarkVariant = "dark_racing" | "carbon" | "oled";
export const DARK_VARIANT_KEY = "garagehub_dark_variant";

export function readDarkVariant(): DarkVariant {
  try {
    const saved = localStorage.getItem(DARK_VARIANT_KEY);
    if (saved === "carbon" || saved === "oled") return saved;
  } catch {
    // Keep the default when storage is unavailable.
  }
  return "dark_racing";
}

export function saveDarkVariant(variant: DarkVariant): void {
  try {
    localStorage.setItem(DARK_VARIANT_KEY, variant);
  } catch {
    // Ignore persistence failures in embedded/private browsers.
  }
}

export const THEME = {
  colors: {
    // Brand Accent
    brand: {
      primary: "#B7F34A",
      glow: "#D1FF83",
      dark: "#8CBF32",
      surface: "rgba(183, 243, 74, 0.12)",
      gradient: "from-[#B7F34A] to-[#8CBF32]",
    },
    dark: {
      canvas: "#0d131d",
      card: "#17202e",
      cardElevated: "#1e293b",
      border: "#233044",
      borderSubtle: "#1c2637",
      textPrimary: "#FFFFFF",
      textSecondary: "#94A3B8",
      textMuted: "#64748B",
    },
    light: {
      canvas: "#F4F5F8",
      card: "#FFFFFF",
      cardElevated: "#FFFFFF",
      border: "#E2E8F0",
      borderSubtle: "#F1F5F9",
      textPrimary: "#0F172A",
      textSecondary: "#64748B",
      textMuted: "#94A3B8",
    },
    status: {
      critical: {
        bg: "bg-rose-500/10",
        border: "border-rose-500/30",
        text: "text-rose-500",
      },
      warning: {
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        text: "text-amber-500",
      },
      success: {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        text: "text-emerald-500",
      },
      info: {
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
        text: "text-blue-500",
      },
    },
  },
  styles: {
    card: "p-3.5 rounded-2xl shadow-xs transition-all",
    cardInteractive: "p-3.5 rounded-2xl shadow-xs hover:shadow-sm active:scale-[0.99] transition-all cursor-pointer",
    touchButton: "min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 transition-all cursor-pointer",
    badge: "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border",
  },
} as const;
