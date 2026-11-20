import { describe, expect, it } from "vitest";
import { classifyReceiptText, parseLocalReceiptText, parseReceiptText } from "./receiptClassification";
import { parseFiscalReceiptQr } from "./receiptQr";

describe("classifyReceiptText", () => {
  it("extracts a text-based PDF receipt without inventing absent fields", () => {
    const result = parseReceiptText([
      "ООО Лукойл-Уралнефтепродукт",
      "АЗС Лукойл",
      "Дата: 05.06.2026",
      "Топливо: АИ-95",
      "Объем: 40 л",
      "Цена за литр: 60 ₽",
      "Итого: 2 400 ₽",
    ].join("\n"));

    expect(result).toMatchObject({
      merchantName: "ООО Лукойл-Уралнефтепродукт",
      date: "2026-06-05",
      totalAmount: 2400,
      category: "fuel",
      fuelDetails: { fuelType: "АИ-95", liters: 40, pricePerLiter: 60 },
      operation: "expense",
    });
  });

  it("keeps refunds marked as refunds in text-based receipts", () => {
    expect(parseReceiptText("Отмена оплаты").operation).toBe("refund");
  });

  it("does not treat the closed dialog label as the receipt merchant", () => {
    expect(parseReceiptText("Закрыто\nДата: 05.06.2026\nИтого: 1 200 ₽", { merchantName: "Закрыто" })).toMatchObject({ merchantName: null, totalAmount: 1200 });
  });

  it("classifies a Russian fuel receipt and extracts liters and unit price", () => {
    const result = classifyReceiptText(
      "АЗС ЛУКОЙЛ. Топливо: АИ-95-К5. Объем: 55.40 л. Цена за литр: 59.80 ₽. ИТОГ: 3 312.92 ₽",
      "other",
    );

    expect(result.category).toBe("fuel");
    expect(result.fuelDetails?.liters).toBe(55.4);
    expect(result.fuelDetails?.pricePerLiter).toBe(59.8);
    expect(result.fuelDetails?.fuelType).toMatch(/АИ-95/i);
  });

  it("does not classify an engine-oil service receipt as fuel", () => {
    const result = classifyReceiptText(
      "Заказ-наряд СТО: замена моторного масла 4 л, фильтр масляный. Итого 6500 ₽",
      "other",
    );

    expect(result.category).toBe("repair");
  });

  it("preserves an already recognized non-other category unless fuel evidence is strong", () => {
    expect(classifyReceiptText("Покупка в магазине", "parts").category).toBe("parts");
    expect(classifyReceiptText("АЗС, бензин АИ-95, 40 л, цена за литр 60 ₽", "other").category).toBe("fuel");
  });

  it("extracts conservative local OCR fields without inventing receipt values", () => {
    const result = parseLocalReceiptText([
      "ООО Автосервис",
      "Дата: 05.06.2026",
      "ИТОГ: 3 312,92 ₽",
    ].join("\n"));

    expect(result._source).toBe("local-tesseract");
    expect(result.merchantName).toBe("ООО Автосервис");
    expect(result.date).toBe("2026-06-05");
    expect(result.totalAmount).toBe(3312.92);
    expect(result.works).toEqual([]);
    expect(result.parts).toEqual([]);
  });

  it("extracts fuel values from the local OCR shape used by the scanner screen", () => {
    const result = parseLocalReceiptText([
      "Подтвердите действие на adm.benzuber.ru",
      "Статус: заправка завершена",
      "Топливо: АИ-95",
      "Цена: 71,15",
      "Сумма: 2 134.50",
      "Факт объем: 30.00",
    ].join("\n"));

    expect(result.category).toBe("fuel");
    expect(result.merchantName).toBeNull();
    expect(result.totalAmount).toBe(2134.5);
    expect(result.fuelDetails).toMatchObject({ fuelType: "АИ-95", liters: 30, pricePerLiter: 71.15 });
  });

  it("recognizes pump-display gallons and converts them to liters without inventing a station or date", () => {
    const result = parseLocalReceiptText("39.72\n17.853 Gallons\nPrice per gallon: $3.469");
    expect(result.category).toBe("fuel");
    expect(result.merchantName).toBeNull();
    expect(result.date).toBeNull();
    expect(result.totalAmount).toBeNull();
    expect(result.currency).toBe("$");
    expect(result.fuelDetails?.liters).toBeCloseTo(67.58, 1);
    expect(result.fuelDetails?.pricePerLiter).toBeCloseTo(0.917, 2);
  });

  it("reads the bank transaction row and ignores browser controls and the letter date", () => {
    const result = parseLocalReceiptText([
      "Закрыть", "Документ по операции", "От 20.11.2026", "Сумма в валюте", "операции",
      "09.07.2026 18:47", "2 447.00 RUB", "2 447.00 RUB", "Оплата в АЗС 411",
    ].join("\n"));
    expect(result).toMatchObject({ merchantName: "АЗС 411", date: "2026-07-09", totalAmount: 2447, category: "other" });
  });

  it("marks a successful cancellation as a refund and does not mistake it for a purchase", () => {
    expect(parseLocalReceiptText("Документ по операции\nОт 20.11.2026\nСумма в валюте\n05.11.2026\n3339.40 RUB\nУспешно\nОтмена оплаты АЗС"))
      .toMatchObject({ operation: "refund", date: "2026-11-05", totalAmount: 3339.4 });
  });

  it("reads a wrapped merchant, a short year and an exact total from a receipt screenshot", () => {
    expect(parseLocalReceiptText('Закрыть\nООО "Магазин\n\nИнструменты"\nКассовый чек. Приход\n17.11.26 07:50\n1. Домкрат\nИтого\n3500.00'))
      .toMatchObject({ merchantName: "Магазин Инструменты", date: "2026-11-17", totalAmount: 3500, category: "parts" });
    expect(parseLocalReceiptText("Закрыто\nИтого\nнечитаемо")).toMatchObject({ merchantName: null, date: null, totalAmount: null });
  });

  it("takes amount and date from a fiscal QR and distinguishes a return from a sale", () => {
    const qr = "t=20261117T0750&s=3500.00&fn=0000000000000001&i=2&fp=3&n=";
    expect(parseFiscalReceiptQr(qr + "1")).toEqual({ date: "2026-11-17", totalAmount: 3500, operation: "expense" });
    expect(parseFiscalReceiptQr(qr + "2")).toMatchObject({ operation: "refund" });
    expect(parseFiscalReceiptQr(qr + "3")).toMatchObject({ operation: "income" });
    expect(parseFiscalReceiptQr(qr.replace("20261117", "20261131") + "1")).toBeNull();
    expect(parseFiscalReceiptQr("https://example.test/?t=20261117T0750&s=3500.00")).toBeNull();
  });
});
