import { describe, it, expect } from "vitest";
import {
  decodeVin,
  parseBarcodeOrQr,
  AUTOMOTIVE_BARCODE_CATALOG,
  WMI_MAPPING,
} from "./barcodeScannerService";
import { Vehicle } from "../types";

const mockVehicle: Vehicle = {
  id: "car-nissan",
  make: "Nissan",
  model: "X-Trail",
  generation: "T31",
  year: 2008,
  engine: "2.0 MR20DE",
  transmission: "CVT",
  currentMileage: 206000,
  lastMileageUpdate: "2026-06-07",
  vin: "JN1TBNT31U0048123",
};

describe("VIN Code Parser", () => {
  it("decodes a standard 17-character Nissan VIN and identifies current vehicle", () => {
    const result = decodeVin("JN1TBNT31U0048123", mockVehicle, [mockVehicle]);
    expect(result).not.toBeNull();
    expect(result?.vin).toBe("JN1TBNT31U0048123");
    expect(result?.make).toBe("Nissan");
    expect(result?.country).toBe("Япония");
    expect(result?.isCurrentVehicle).toBe(true);
  });

  it("decodes Toyota WMI and year", () => {
    const result = decodeVin("JTDAGACF9P3012984");
    expect(result).not.toBeNull();
    expect(result?.make).toBe("Toyota");
    expect(result?.country).toBe("Япония");
    expect(result?.year).toBe(2023); // 'P' is 2023
  });

  it("handles VIN with prefix or spaces", () => {
    const result = decodeVin("VIN: WBA8E1106GNT98231");
    expect(result).not.toBeNull();
    expect(result?.vin).toBe("WBA8E1106GNT98231");
    expect(result?.make).toBe("BMW");
  });

  it("rejects invalid length or invalid characters", () => {
    expect(decodeVin("SHORT123")).toBeNull();
    expect(decodeVin("JN1TBNT31I0048123")).toBeNull(); // Contains 'I'
  });
});

describe("Barcode & QR Code Parser", () => {
  it("parses Mann-Filter EAN-13 barcode correctly", () => {
    const scan = parseBarcodeOrQr("4011558296303", mockVehicle);
    expect(scan.scanType).toBe("part");
    expect(scan.partInfo?.brand).toBe("Mann-Filter");
    expect(scan.partInfo?.partNumber).toBe("W67/1");
    expect(scan.partInfo?.estimatedPrice).toBe(750);
    expect(scan.serviceInfo?.title).toContain("масляного фильтра");
  });

  it("parses Brembo brake pads EAN-13", () => {
    const scan = parseBarcodeOrQr("8020584055274", mockVehicle);
    expect(scan.scanType).toBe("part");
    expect(scan.partInfo?.brand).toBe("Brembo");
    expect(scan.partInfo?.partNumber).toBe("P 56 062");
    expect(scan.partInfo?.category).toBe("Тормозная система");
  });

  it("parses QR code JSON payload", () => {
    const qrJson = JSON.stringify({
      brand: "Nissan OEM",
      partNumber: "KE902-99945",
      name: "Антифриз L248",
      category: "Система охлаждения",
      price: 2800,
    });
    const scan = parseBarcodeOrQr(qrJson, mockVehicle);
    expect(scan.scanType).toBe("qr_payload");
    expect(scan.partInfo?.brand).toBe("Nissan OEM");
    expect(scan.partInfo?.partNumber).toBe("KE902-99945");
    expect(scan.partInfo?.estimatedPrice).toBe(2800);
    expect(scan.serviceInfo?.title).toContain("Антифриз");
  });

  it("parses manufacturer QR URL", () => {
    const scan = parseBarcodeOrQr("https://qr.mann-filter.com/W67/1", mockVehicle);
    expect(scan.partInfo?.brand).toBe("Mann-Filter");
    expect(scan.partInfo?.partNumber).toBe("W67/1");
  });

  it("handles unknown barcode with sensible defaults", () => {
    const scan = parseBarcodeOrQr("4601234567890", mockVehicle);
    expect(scan.scanType).toBe("part");
    expect(scan.partInfo?.partNumber).toBe("4601234567890");
    expect(scan.partInfo?.estimatedPrice).toBeGreaterThan(0);
  });
});

describe("Automatic Parts Database & Garage Availability API Check", () => {
  const mockGarageParts: import("../types").GaragePart[] = [
    {
      id: "gp-4",
      vehicleId: "car-nissan",
      name: "Антифриз готовый зеленый L248 (5л канистра)",
      brand: "Nissan OEM",
      partNumber: "KE902-99945",
      quantity: 2,
      purchasePrice: 2800,
      purchaseDate: "2026-06-01",
      location: "Гараж угол справа",
      status: "in_stock",
    },
  ];

  it("detects when scanned part is already in user's garage inventory", async () => {
    const { checkPartAvailabilityAPI } = await import("./barcodeScannerService");
    const result = await checkPartAvailabilityAPI(
      "3277490248010",
      "KE902-99945",
      "Nissan OEM",
      mockGarageParts
    );

    expect(result.inGarage).toBe(true);
    expect(result.garageItem?.quantity).toBe(2);
    expect(result.garageItem?.location).toBe("Гараж угол справа");
    expect(result.garageItem?.purchasePrice).toBe(2800);
    expect(result.totalSuppliersStock).toBeGreaterThan(0);
    expect(result.suppliers.length).toBeGreaterThan(0);
  });

  it("returns market pricing and supplier availability when part is not in garage", async () => {
    const { checkPartAvailabilityAPI } = await import("./barcodeScannerService");
    const result = await checkPartAvailabilityAPI(
      "4011558296303",
      "W67/1",
      "Mann-Filter",
      mockGarageParts
    );

    expect(result.inGarage).toBe(false);
    expect(result.marketPrice).toBeGreaterThan(0);
    expect(result.marketPriceRange.min).toBeLessThanOrEqual(result.marketPrice);
    expect(result.marketPriceRange.max).toBeGreaterThanOrEqual(result.marketPrice);
    expect(result.fastestDeliveryDays).toBeGreaterThanOrEqual(1);
  });
});
