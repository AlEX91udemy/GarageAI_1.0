import { describe, expect, it } from "vitest";
import { classifyReceiptText } from "./receiptClassification";

describe("classifyReceiptText", () => {
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
});
