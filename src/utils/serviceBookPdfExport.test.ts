// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import {
  generateServiceBookHtml,
  exportServiceBookToPdf,
  downloadServiceBookHtml,
} from "./serviceBookPdfExport";
import { Vehicle, ServiceRecord } from "../types";

const mockVehicle: Vehicle = {
  id: "car-test",
  make: "Nissan",
  model: "X-Trail",
  generation: "T31 Рестайлинг",
  year: 2011,
  engine: "2.0 л MR20DE (141 л.с.), Вариатор CVT, 4WD",
  transmission: "CVT",
  currentMileage: 168450,
  lastMileageUpdate: "2024-08-15",
  licensePlate: "М777ММ 197",
  vin: "JN1TANT31U0018942",
};

const mockRecords: ServiceRecord[] = [
  {
    id: "srv-1",
    vehicleId: "car-test",
    date: "2024-05-10",
    mileage: 160000,
    title: "Большое ТО: Замена масла ДВС и фильтров",
    category: "ТО и замена жидкостей",
    totalCost: 8500,
    laborCost: 2000,
    description: "Плановая замена моторного масла, масляного и воздушного фильтров.",
    serviceCenter: "Юнион Моторс",
    parts: [
      {
        id: "p-1",
        name: "Моторное масло 5W-40 5L",
        brand: "Nissan OEM",
        partNumber: "KE900-90042",
        quantity: 1,
        unitPrice: 4500,
      },
      {
        id: "p-2",
        name: "Фильтр масляный",
        brand: "Mann-Filter",
        partNumber: "W67/1",
        quantity: 1,
        unitPrice: 800,
      },
    ],
  },
  {
    id: "srv-2",
    vehicleId: "car-test",
    date: "2024-08-15",
    mileage: 165000,
    title: "Замена передних тормозных колодок",
    category: "Тормозная система",
    totalCost: 5500,
    laborCost: 1500,
    description: "Замена колодок и смазка направляющих суппорта.",
    serviceCenter: "Гараж",
    parts: [
      {
        id: "p-3",
        name: "Передние колодки",
        brand: "Brembo",
        partNumber: "P56062",
        quantity: 1,
        unitPrice: 4000,
      },
    ],
  },
];

describe("serviceBookPdfExport", () => {
  it("generates comprehensive print-ready HTML with vehicle specs and service records", () => {
    const html = generateServiceBookHtml(mockVehicle, mockRecords);

    const normalizedHtml = html.replace(/\u00a0/g, " ");
    expect(normalizedHtml).toContain("<!DOCTYPE html>");
    expect(normalizedHtml).toContain("GARAGEAI SERVICE BOOK");
    expect(normalizedHtml).toContain("Nissan");
    expect(normalizedHtml).toContain("X-Trail");
    expect(normalizedHtml).toContain("JN1TANT31U0018942");
    expect(normalizedHtml).toContain("М777ММ 197");
    expect(normalizedHtml).toContain("168 450 км");
    expect(normalizedHtml).toContain("Большое ТО: Замена масла ДВС и фильтров");
    expect(normalizedHtml).toContain("KE900-90042");
    expect(normalizedHtml).toContain("Brembo");
    expect(normalizedHtml).toContain("14 000 ₽"); // total of 8500 + 5500
    expect(normalizedHtml).toContain("Верифицировано Garage AI Cloud");
    expect(normalizedHtml).toContain("@media print");
  });

  it("handles vehicle with zero records gracefully", () => {
    const html = generateServiceBookHtml(mockVehicle, []);
    expect(html).toContain("Записей обслуживания пока нет");
    expect(html).toContain("0 ₽");
  });

  it("triggers iframe print mechanism without crashing", () => {
    const mockPrint = vi.fn();
    const mockIframe = {
      style: {},
      setAttribute: vi.fn(),
      contentWindow: {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
        print: mockPrint,
      },
      parentNode: {
        removeChild: vi.fn(),
      },
    };

    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockReturnValue(mockIframe as unknown as HTMLElement);
    const appendChildSpy = vi
      .spyOn(document.body, "appendChild")
      .mockImplementation(() => mockIframe as unknown as HTMLElement);

    expect(() => exportServiceBookToPdf(mockVehicle, mockRecords)).not.toThrow();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
  });

  it("creates a downloadable HTML blob link without crashing", () => {
    const clickSpy = vi.fn();
    const mockAnchor = {
      set href(_v: string) {},
      set download(_v: string) {},
      click: clickSpy,
    };

    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockReturnValue(mockAnchor as unknown as HTMLElement);
    const appendChildSpy = vi
      .spyOn(document.body, "appendChild")
      .mockImplementation(() => mockAnchor as unknown as HTMLElement);
    const removeChildSpy = vi
      .spyOn(document.body, "removeChild")
      .mockImplementation(() => mockAnchor as unknown as HTMLElement);

    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();

    expect(() => downloadServiceBookHtml(mockVehicle, mockRecords)).not.toThrow();
    expect(clickSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});
