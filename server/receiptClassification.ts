export type ReceiptCategory = "repair" | "fuel" | "parts" | "wash" | "tires" | "tuning" | "other";

export interface ReceiptClassification {
  category: ReceiptCategory;
  fuelDetails?: {
    fuelType: string | null;
    liters: number | null;
    pricePerLiter: number | null;
  };
}

const FUEL_TYPE_PATTERN = /(АИ[- ]?\s?\d{2}(?:\s?К\d)?|ДТ|дизел(?:ь|ьное топливо)|diesel|gasoline|бензин)/i;

function parseRussianNumber(value: string): number | null {
  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function classifyReceiptText(text: string, currentCategory?: unknown): ReceiptClassification {
  const normalized = text.toLocaleLowerCase("ru-RU");
  const current = typeof currentCategory === "string" ? currentCategory.toLowerCase() : "";
  const valid = new Set<ReceiptCategory>(["repair", "fuel", "parts", "wash", "tires", "tuning", "other"]);
  let category: ReceiptCategory = valid.has(current as ReceiptCategory) ? current as ReceiptCategory : "other";

  const strongFuelSignal =
    /\b(азс|заправк[аиу]|топлив[оа]|бензин|дизельное топливо|дизтопливо|дт)\b/i.test(normalized) ||
    /\b(аи[- ]?\d{2}|аи[- ]?\d{2}\s?к\d)\b/i.test(normalized) ||
    (/\b(литр(?:а|ов|ы)?|л\.?\s*(?:×|x|по|\d))\b/i.test(normalized) &&
      /(?:₽\s*\/\s*л|руб(?:\.|лей)?\s*(?:за|\/)?\s*литр|цена\s*за\s*литр|колонка)/i.test(normalized));
  const repairSignal = /\b(заказ[- ]?наряд|сто|автосервис|ремонт|замена масла|нормо[- ]?час|работы по ремонту)\b/i.test(normalized);
  const partsSignal = /\b(магазин автозапчастей|автозапчасти|артикул|каталожный номер)\b/i.test(normalized);

  if (strongFuelSignal && !repairSignal) category = "fuel";
  else if (category === "other" && repairSignal) category = "repair";
  else if (category === "other" && partsSignal) category = "parts";

  if (category !== "fuel") return { category };

  const fuelTypeMatch = text.match(FUEL_TYPE_PATTERN);
  const litersMatch = text.match(/(\d{1,4}(?:[\s.,]\d{1,3})?)\s*(?:л\.?|литр(?:а|ов|ы)?)/i);
  const priceMatch = text.match(/(\d{1,4}(?:[\s.,]\d{1,3})?)\s*(?:₽|руб(?:\.|лей)?)?\s*(?:\/\s*л|за\s*литр)/i)
    || text.match(/(?:цена\s*за\s*литр|по)\s*[:—-]?\s*(\d{1,4}(?:[\s.,]\d{1,3})?)\s*(?:₽|руб(?:\.|лей)?)?/i);

  return {
    category,
    fuelDetails: {
      fuelType: fuelTypeMatch?.[1]?.toUpperCase().replace(/\s+/g, "") || null,
      liters: litersMatch ? parseRussianNumber(litersMatch[1]) : null,
      pricePerLiter: priceMatch ? parseRussianNumber(priceMatch[1]) : null,
    },
  };
}
