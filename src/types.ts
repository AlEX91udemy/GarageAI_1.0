export type MaintenanceCategory =
  | "ТО и замена жидкостей"
  | "Двигатель"
  | "Система охлаждения"
  | "Ходовая часть"
  | "Климатическая система"
  | "Трансмиссия"
  | "Трансмиссия и сцепление"
  | "Подвеска и рулевое"
  | "Тормозная система"
  | "Электрика и датчики"
  | "Выхлопная система"
  | "Кузов и стекла"
  | "Шины и диски"
  | "Другое";

export type ExpenseCategory =
  | "repair"
  | "fuel"
  | "parts"
  | "wash"
  | "tires"
  | "insurance"
  | "tuning"
  | "parking"
  | "other";

export interface PartItem {
  id: string;
  name: string;
  brand: string;
  partNumber: string; // SKU / артикул
  quantity: number;
  unitPrice: number;
}

export interface ServiceRecord {
  id: string;
  vehicleId: string;
  date: string; // YYYY-MM-DD
  mileage: number;
  category: MaintenanceCategory;
  title: string;
  description: string;
  laborCost: number;
  parts: PartItem[];
  totalCost: number;
  serviceCenter?: string;
  receiptImages?: string[]; // base64 or sample photo URLs
  notes?: string;
}

export interface FuelRecord {
  id: string;
  vehicleId: string;
  date: string;
  mileage: number;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  fuelType: string;
  isFullTank: boolean;
  station?: string;
  calculatedConsumption?: number; // L / 100 km
}

export interface OemScheduleItem {
  id: string;
  vehicleId: string;
  title: string;
  category: string;
  intervalKm: number;
  intervalMonths: number;
  lastDoneKm?: number;
  lastDoneDate?: string;
  description?: string;
  notes?: string;
  oemPartHint?: string;
}

export interface GaragePart {
  id: string;
  vehicleId: string; // or "all"
  name: string;
  brand: string;
  partNumber: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  location?: string; // e.g. "Полка А3", "Багажник"
  status: "in_stock" | "installed" | "ordered";
  category?: MaintenanceCategory;
}

export interface ToFixTask {
  id: string;
  vehicleId: string;
  title: string;
  priority: "high" | "medium" | "low";
  estimatedCost?: number;
  targetMileage?: number;
  category: MaintenanceCategory;
  description?: string;
  linkedPartSku?: string;
  dueDate?: string;
  createdAt?: string;
  status: "pending" | "in_progress" | "completed";
  workHint?: string;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  generation?: string;
  year: number;
  licensePlate?: string;
  vin?: string;
  engine: string;
  fuelType?: string;
  transmission: string;
  driveType?: string;
  currentMileage: number;
  lastMileageUpdate: string;
  colorHex?: string;
  bodyType?:
    | "suv" | "sedan" | "hatchback" | "coupe"
    | "wagon" | "convertible" | "minivan" | "pickup"
    | "van" | "minibus" | "liftback" | "crossover-coupe";
  photoUrl?: string;
  model3dUrl?: string; // Optional URL or base64 to custom 3D model (.glb)
}

export interface TuningStage {
  id: string;
  vehicleId: string;
  title: string;
  description: string;
  status: "planned" | "in_progress" | "completed";
  estimatedBudget: number;
  actualCost: number;
  parts: PartItem[];
}

export interface DiagnosticResult {
  summary: string;
  urgency: "Критично - не эксплуатировать" | "Внимание - проверить в ближайшие дни" | "Плановое наблюдение";
  safetyAssessment: string;
  possibleCauses: Array<{
    cause: string;
    probability: "Высокая" | "Средняя" | "Низкая";
    explanation: string;
    checkMethod: string;
  }>;
  diagnosticSteps: string[];
  estimatedCost: string;
  recommendedParts: string[];
  proTip: string;
}

export const CAR_PAINT_PRESETS = [
  { name: "Красный металлик", hex: "#dc2626" },
  { name: "Глубокий синий", hex: "#1e40af" },
  { name: "Черный обсидиан", hex: "#171717" },
  { name: "Белый перламутр", hex: "#f1f5f9" },
  { name: "Серый нардо", hex: "#64748b" },
  { name: "Серебристый металлик", hex: "#94a3b8" },
  { name: "Изумрудный British", hex: "#166534" },
  { name: "Золотой шампань", hex: "#ca8a04" },
];
