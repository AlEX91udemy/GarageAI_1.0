import {
  Vehicle,
  ServiceRecord,
  FuelRecord,
  OemScheduleItem,
  GaragePart,
  ToFixTask,
  MaintenanceCategory,
} from "../types";

export type MobileTab =
  | "home"
  | "vehicle"
  | "add"
  | "history"
  | "profile"
  | "service"
  | "repair"
  | "expenses"
  | "garage";

export type MobileScreenId =
  | "splash"
  | "onboarding"
  | "auth"
  | "home"
  | "vehicle"
  | "service"
  | "service_detail"
  | "repair"
  | "expenses"
  | "garage"
  | "vehicle_profile"
  | "to_fix"
  | "problem_detail"
  | "ai_diagnostics"
  | "fuel"
  | "parts"
  | "part_detail"
  | "projects"
  | "project_detail"
  | "project_timeline"
  | "before_after"
  | "add_event"
  | "scan_receipt"
  | "scan_barcode"
  | "receipt_confirm"
  | "notifications"
  | "profile"
  | "settings";

export type QuickActionType =
  | "service"
  | "repair"
  | "fuel"
  | "expense"
  | "note"
  | "more"
  | "part"
  | "problem"
  | "photo"
  | "scan_receipt"
  | "scan_barcode";

export interface PrefilledScanData {
  targetType: "service" | "part";
  title?: string;
  category?: MaintenanceCategory;
  name?: string;
  brand?: string;
  partNumber?: string;
  price?: number;
  laborCost?: number;
  totalCost?: number;
  serviceCenter?: string;
  description?: string;
  barcode?: string;
  vin?: string;
  location?: string;
  quantity?: number;
}

export interface MobileNotification {
  id: string;
  title: string;
  message: string;
  type: "critical" | "warning" | "project" | "ai" | "stock";
  timestamp: string;
  isRead: boolean;
  vehicleId?: string;
  actionScreen?: MobileScreenId;
}

export type DeviceFrameType = "iphone" | "android" | "fluid";
