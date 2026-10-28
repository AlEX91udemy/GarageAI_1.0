export type DistanceUnit = "km" | "mi";
export type VolumeUnit = "l" | "gal";

export const DISTANCE_UNIT_KEY = "garagehub_distance_unit";
export const VOLUME_UNIT_KEY = "garagehub_volume_unit";

export function getDistanceUnit(): DistanceUnit {
  try {
    return localStorage.getItem(DISTANCE_UNIT_KEY) === "mi" ? "mi" : "km";
  } catch {
    return "km";
  }
}

export function getVolumeUnit(): VolumeUnit {
  try {
    return localStorage.getItem(VOLUME_UNIT_KEY) === "gal" ? "gal" : "l";
  } catch {
    return "l";
  }
}

export function formatDistance(km: number): string {
  const unit = getDistanceUnit();
  if (unit === "mi") {
    return (km * 0.621371).toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ми";
  }
  return km.toLocaleString("ru-RU") + " км";
}

export function formatVolume(liters: number, decimals = 1): string {
  const unit = getVolumeUnit();
  if (unit === "gal") {
    return (liters * 0.264172).toFixed(decimals) + " гал";
  }
  return liters.toFixed(decimals) + " л";
}

export function volumeUnitLabel(): string {
  return getVolumeUnit() === "gal" ? "гал" : "л";
}

export function toLiters(volume: number): number {
  return getVolumeUnit() === "gal" ? volume / 0.264172 : volume;
}

export function toDisplayVolume(liters: number): number {
  return getVolumeUnit() === "gal" ? liters * 0.264172 : liters;
}

export function toDisplayVolumePrice(pricePerLiter: number): number {
  return getVolumeUnit() === "gal" ? pricePerLiter / 0.264172 : pricePerLiter;
}

export function toPricePerLiter(pricePerVolume: number): number {
  return getVolumeUnit() === "gal" ? pricePerVolume * 0.264172 : pricePerVolume;
}

export function distanceUnitLabel(): string {
  return getDistanceUnit() === "mi" ? "ми" : "км";
}

export function toDisplayDistance(kilometers: number): number {
  return getDistanceUnit() === "mi" ? kilometers * 0.621371 : kilometers;
}

export function toKilometers(distance: number): number {
  return getDistanceUnit() === "mi" ? distance / 0.621371 : distance;
}

export function formatConsumption(lPer100km: number): string {
  const du = getDistanceUnit();
  const vu = getVolumeUnit();
  if (du === "mi" && vu === "gal") {
    const mpg = 235.21 / lPer100km;
    return mpg.toFixed(1) + " мпг";
  }
  if (du === "mi") {
    return (lPer100km * 1.60934).toFixed(1) + " л/100 ми";
  }
  if (vu === "gal") {
    return (lPer100km * 0.264172).toFixed(2) + " гал/100 км";
  }
  return lPer100km.toFixed(1) + " л/100 км";
}

export function consumptionLabel(): string {
  const du = getDistanceUnit();
  const vu = getVolumeUnit();
  if (du === "mi" && vu === "gal") return "мпг";
  if (du === "mi") return "л/100 ми";
  if (vu === "gal") return "гал/100 км";
  return "л/100 км";
}

export function costPerDistanceLabel(currencySymbol: string): string {
  return currencySymbol + " / " + distanceUnitLabel();
}

