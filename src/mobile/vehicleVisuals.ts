import { Vehicle } from "../types";
import { USER_BODY_TYPE_VISUALS } from "./catalogVehicleVisuals";
import { CAR_PAINT_PRESETS } from "../types";

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
  const bodyType = vehicle.bodyType || "suv";
  const color = paintPresetToAssetColor(vehicle.colorHex);
  return {
    src: USER_BODY_TYPE_VISUALS.src(color, bodyType),
    alt: `${vehicle.make} ${vehicle.model}, ${bodyType}`,
    background: "forest-road",
  };
}

/** Maps the persisted paint hex to one of the body-type sheet asset folders. */
export function paintPresetToAssetColor(hex: string | undefined): (typeof USER_BODY_TYPE_VISUALS.colors)[number] {
  if (!hex) return "red";
  const normalized = hex.toLowerCase();
  const preset = CAR_PAINT_PRESETS.find((item) => item.hex.toLowerCase() === normalized);
  if (!preset) return "red";
  const colorByHex: Record<string, (typeof USER_BODY_TYPE_VISUALS.colors)[number]> = {
    "#dc2626": "red",
    "#1e40af": "blue",
    "#171717": "black",
    "#f1f5f9": "white",
    "#64748b": "grey",
    "#94a3b8": "silver",
    "#166534": "green",
    "#ca8a04": "gold",
  };
  return colorByHex[preset.hex.toLowerCase()] || "red";
}
