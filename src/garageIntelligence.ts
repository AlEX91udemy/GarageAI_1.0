import { FuelRecord, OemScheduleItem, ServiceRecord, ToFixTask, Vehicle } from "./types";

export interface IntelligenceInput {
  vehicle: Vehicle;
  serviceRecords: ServiceRecord[];
  fuelRecords: FuelRecord[];
  oemSchedules: OemScheduleItem[];
  toFixTasks: ToFixTask[];
}

export interface IntelligenceResult {
  mileage: number;
  vehicleAgeYears: number;
  overdueMaintenance: Array<{ title: string; kmOverdue: number }>;
  soonMaintenance: Array<{ title: string; kmRemaining: number }>;
  avgKmPerMonth: number | null;
  avgFuelConsumption: number | null;
  avgServiceCost: number | null;
  topCategories: Array<{ category: string; count: number; totalCost: number }>;
  openTasks: number;
  urgentTasks: number;
  riskLevel: "low" | "medium" | "high";
  explanation: string;
}

function parseDateSafe(value: string | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

export function computeGarageIntelligence(input: IntelligenceInput): IntelligenceResult {
  const { vehicle, serviceRecords, fuelRecords, oemSchedules, toFixTasks } = input;
  const vehicleRecords = serviceRecords.filter((record) => record.vehicleId === vehicle.id);
  const vehicleFuel = fuelRecords.filter((record) => record.vehicleId === vehicle.id);
  const vehicleSchedules = oemSchedules.filter((item) => item.vehicleId === vehicle.id);
  const vehicleTasks = toFixTasks.filter(
    (task) => task.vehicleId === vehicle.id && task.status !== "completed"
  );

  const overdueMaintenance: IntelligenceResult["overdueMaintenance"] = [];
  const soonMaintenance: IntelligenceResult["soonMaintenance"] = [];
  for (const item of vehicleSchedules) {
    const kmSince = vehicle.currentMileage - (item.lastDoneKm ?? 0);
    const kmRemaining = item.intervalKm - kmSince;
    if (kmRemaining < 0) overdueMaintenance.push({ title: item.title, kmOverdue: -kmRemaining });
    else if (kmRemaining <= item.intervalKm * 0.2) soonMaintenance.push({ title: item.title, kmRemaining });
  }
  overdueMaintenance.sort((a, b) => b.kmOverdue - a.kmOverdue);
  soonMaintenance.sort((a, b) => a.kmRemaining - b.kmRemaining);

  const dated = [
    ...vehicleRecords.map((record) => parseDateSafe(record.date)),
    ...vehicleFuel.map((record) => parseDateSafe(record.date)),
  ].filter((value): value is number => value !== null);
  let avgKmPerMonth: number | null = null;
  if (dated.length >= 2) {
    const earliest = Math.min(...dated);
    const latest = Math.max(...dated);
    const months = Math.max((latest - earliest) / (365.25 * 24 * 3600 * 1000) * 12, 0.5);
    avgKmPerMonth = Math.round(vehicle.currentMileage / months);
  }

  const consumptionValues = vehicleFuel
    .map((record) => record.calculatedConsumption)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);
  const avgFuelConsumption =
    consumptionValues.length > 0
      ? Number((consumptionValues.reduce((sum, value) => sum + value, 0) / consumptionValues.length).toFixed(1))
      : null;

  const avgServiceCost =
    vehicleRecords.length > 0
      ? Math.round(vehicleRecords.reduce((sum, record) => sum + (record.totalCost || 0), 0) / vehicleRecords.length)
      : null;

  const categoryStats = new Map<string, { count: number; totalCost: number }>();
  for (const record of vehicleRecords) {
    const entry = categoryStats.get(record.category) ?? { count: 0, totalCost: 0 };
    entry.count += 1;
    entry.totalCost += record.totalCost || 0;
    categoryStats.set(record.category, entry);
  }
  const topCategories = [...categoryStats.entries()]
    .map(([category, stats]) => ({ category, ...stats }))
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 3);

  const now = Date.now();
  const vehicleAgeYears = Number(((now - Date.parse(`${vehicle.year}-01-01`)) / (365.25 * 24 * 3600 * 1000)).toFixed(1));
  const urgentTasks = vehicleTasks.filter((task) => task.priority === "high").length;

  const riskScore =
    (overdueMaintenance.length > 0 ? 2 : 0) +
    (soonMaintenance.length >= 2 ? 1 : 0) +
    (urgentTasks > 0 ? 2 : 0) +
    (vehicleTasks.length > 3 ? 1 : 0) +
    (vehicleAgeYears > 10 ? 1 : 0);
  const riskLevel = riskScore >= 4 ? "high" : riskScore >= 2 ? "medium" : "low";

  const explanationParts: string[] = [];
  explanationParts.push(`пробег ${vehicle.currentMileage.toLocaleString("ru-RU")} км`);
  explanationParts.push(`возраст ${vehicleAgeYears} лет`);
  explanationParts.push(`записей ТО ${vehicleRecords.length}`);
  if (overdueMaintenance.length > 0) explanationParts.push(`просрочек ${overdueMaintenance.length}`);
  if (urgentTasks > 0) explanationParts.push(`срочных задач ${urgentTasks}`);
  if (avgKmPerMonth !== null) explanationParts.push(`средний пробег ${avgKmPerMonth.toLocaleString("ru-RU")} км/мес`);
  if (avgFuelConsumption !== null) explanationParts.push(`расход ${avgFuelConsumption} л/100 км`);
  const explanation = `Оценка построена на данных гаража: ${explanationParts.join(", ")}.`;

  return {
    mileage: vehicle.currentMileage,
    vehicleAgeYears,
    overdueMaintenance,
    soonMaintenance,
    avgKmPerMonth,
    avgFuelConsumption,
    avgServiceCost,
    topCategories,
    openTasks: vehicleTasks.length,
    urgentTasks,
    riskLevel,
    explanation,
  };
}
