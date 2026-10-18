import { Vehicle, CAR_PAINT_PRESETS } from "../types";
import { findModel } from "../carCatalog";
import { USER_BODY_TYPE_VISUALS } from "./catalogVehicleVisuals";

interface VehicleVisual {
  src: string;
  alt: string;
  background: string;
  /** Optional binary mask containing white pixels for painted body panels only. */
  paintMaskSrc?: string;
}

export function getMobileVehicleVisual(vehicle: Vehicle): VehicleVisual {
  // Every vehicle uses the user's standardized body-type template. Persisted
  // catalog or uploaded photo URLs are intentionally ignored.
  const catalogModel = findModel(vehicle.make, vehicle.model);
  const bodyType = vehicle.bodyType || catalogModel?.defaultBodyType || "suv";
  const color = paintPresetToAssetColor(vehicle.colorHex);
  return {
    src: USER_BODY_TYPE_VISUALS.src(color, bodyType),
    alt: `${vehicle.make} ${vehicle.model}, ${bodyType}`,
    background: "forest-road",
  };
}

const DIRECT_HEX_MAP: Record<string, (typeof USER_BODY_TYPE_VISUALS.colors)[number]> = {
  // Official CAR_PAINT_PRESETS
  "#dc2626": "red",
  "#1e40af": "blue",
  "#171717": "black",
  "#f1f5f9": "white",
  "#64748b": "grey",
  "#94a3b8": "silver",
  "#166534": "green",
  "#ca8a04": "gold",
  // Common palette aliases (mockData, mobile swatches, tailwind colors)
  "#ef4444": "red",
  "#b91c1c": "red",
  "#2563eb": "blue",
  "#3b82f6": "blue",
  "#1d4ed8": "blue",
  "#1e293b": "grey",
  "#334155": "grey",
  "#475569": "grey",
  "#0f172a": "black",
  "#000000": "black",
  "#cbd5e1": "silver",
  "#e2e8f0": "silver",
  "#ffffff": "white",
  "#f8fafc": "white",
  "#15803d": "green",
  "#10b981": "green",
  "#059669": "green",
  "#d97706": "gold",
  "#eab308": "gold",
  "#f59e0b": "gold",
};

function parseHexRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(clean)) return null;
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

/** Maps the persisted paint hex to one of the body-type sheet asset folders. */
export function paintPresetToAssetColor(
  hex: string | undefined
): (typeof USER_BODY_TYPE_VISUALS.colors)[number] {
  if (!hex) return "red";
  const normalized = hex.trim().toLowerCase();
  if (DIRECT_HEX_MAP[normalized]) {
    return DIRECT_HEX_MAP[normalized];
  }

  const rgb = parseHexRgb(normalized);
  if (!rgb) return "red";

  let closestColor: (typeof USER_BODY_TYPE_VISUALS.colors)[number] = "red";
  let minDistance = Number.POSITIVE_INFINITY;

  for (const preset of CAR_PAINT_PRESETS) {
    const presetRgb = parseHexRgb(preset.hex);
    if (!presetRgb) continue;
    const dist =
      (rgb[0] - presetRgb[0]) ** 2 +
      (rgb[1] - presetRgb[1]) ** 2 +
      (rgb[2] - presetRgb[2]) ** 2;
    if (dist < minDistance) {
      minDistance = dist;
      closestColor = DIRECT_HEX_MAP[preset.hex.toLowerCase()] || "red";
    }
  }

  return closestColor;
}
