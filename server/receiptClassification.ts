import { normalizeReceiptAmount, normalizeReceiptDate, normalizeReceiptMerchant } from "../src/receiptFields";

export type ReceiptCategory = "repair" | "fuel" | "parts" | "wash" | "tires" | "tuning" | "other";

export interface ReceiptClassification {
  category: ReceiptCategory;
  fuelDetails?: {
    fuelType: string | null;
    liters: number | null;
    pricePerLiter: number | null;
  };
}

export interface LocalReceiptFields {
  merchantName: string | null;
  date: string | null;
  totalAmount: number | null;
  category: ReceiptCategory;
  description: string;
  fuelDetails?: ReceiptClassification["fuelDetails"];
  currency?: string | null;
  works: Array<{ description: string; cost: number | null }>;
  parts: Array<{ name: string; quantity: number; price: number | null }>;
  notes: string | null;
  rawText: string;
  operation?: "refund";
  _source: "local-tesseract";
}

const FUEL_TYPE_PATTERN = /(АИ[- ]?\s?\d{2}(?:\s?К\d)?|ДТ|дизел(?:ь|ьное топливо)|diesel|gasoline|бензин)/i;

function parseRussianNumber(value: string): number | null {
  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseDate(value: string): string | null {
  for (const match of value.matchAll(/(?<!\d)(20\d{2}[.\-/]\d{1,2}[.\-/]\d{1,2}|\d{1,2}[.\-/]\d{1,2}[.\-/](?:20\d{2}|\d{2}))(?!\d)/g)) {
    const candidate = normalizeReceiptDate(match[1]);
    if (candidate) return candidate;
  }
  return null;
}

export function isReceiptRefund(text: string): boolean {
  return /отмен[аы]\s+(?:оплаты|платежа|операции)|возврат\s+(?:прихода|расхода|покупки|оплаты|средств)|(?:^|\n)\s*(?:кассовый чек[.\s]+)?возврат\s*(?:[.!]|\n|$)|\b(?:payment reversal|refund)\b/i.test(text);
}

export function parseBankReceiptText(text: string) {
  const table = /сумма\s+в\s+валюте|дата\s+и\s+время\s+операции/i.exec(text);
  if (!table && !/документ по операции/i.test(text)) return null;
  const operationText = table ? text.slice(table.index) : text;
  const merchant = operationText.match(/(?:отмена\s+оплаты|оплата\s+в)\s+([^\r\n|]+)/i)?.[1];
  const amounts = [...operationText.matchAll(/(?<![\d.,])(\d+(?:[ \u00a0]\d{3})*[.,]\d{2})[ \t]*(?:RUB\b|РУБ(?:\.|\s)|₽)/gi)];
  const merchantName = normalizeReceiptMerchant(merchant);
  return {
    merchantName,
    date: table ? parseDate(operationText) : null,
    totalAmount: normalizeReceiptAmount(amounts.at(-1)?.[1]),
    category: "other" as const,
    description: merchantName ? "Операция в " + merchantName : "Операция по банковскому документу",
  };
}

function parseFuelDisplay(text: string): { liters: number | null; pricePerLiter: number | null; currency: string | null } {
  const gallonsMatch = text.match(/([0-9]{1,4}(?:[\s.,][0-9]{1,3})?)\s* gallons?/i);
  const litersMatch = text.match(/([0-9]{1,4}(?:[\s.,][0-9]{1,3})?)\s*(?:л\.?|литр(?:а|ов|ы)?)/i);
  const unitPriceMatch = text.match(/(?:price\s*(?:per|\/)\s*(?:gallon|gal)|цена\s*(?:за|\/)\s*(?:галлон|литр)|price)[^0-9]{0,12}([$€£₽])?\s*([0-9]{1,4}(?:[\s.,][0-9]{1,3})?)/i);
  const gallons = gallonsMatch ? parseRussianNumber(gallonsMatch[1]) : null;
  const liters = litersMatch ? parseRussianNumber(litersMatch[1]) : gallons ? gallons * 3.785411784 : null;
  const unitPrice = unitPriceMatch ? parseRussianNumber(unitPriceMatch[2]) : null;
  const currency = unitPriceMatch?.[1] || (/[€]/.test(text) ? "€" : /[£]/.test(text) ? "£" : /[$]/.test(text) ? "$" : null);
  const pricePerLiter = unitPrice && gallonsMatch && !litersMatch ? unitPrice / 3.785411784 : unitPrice;
  return { liters, pricePerLiter, currency };
}

/** Extracts conservative receipt fields from local OCR text without guessing. */
export function parseLocalReceiptText(text: string): LocalReceiptFields {
  const rawText = text.trim();
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const classification = classifyReceiptText(rawText);
  const fuelDisplay = classification.category === "fuel" ? parseFuelDisplay(rawText) : { liters: null, pricePerLiter: null, currency: null };
  const totalMatch = rawText.match(/(?:^|[\s|])(?:итого?|всего(?: к оплате)?|к оплате|(?:grand )?total)\s*[:=|]?\s*[₽$€£]?\s*(\d+(?:[ \u00a0]\d{3})*(?:[.,]\d{1,2})?)(?![\d.,])/im)
    ?? rawText.match(/(?:^|\n)\s*сумма[ \t]*:[ \t]*(\d+(?:[ \u00a0]\d{3})*(?:[.,]\d{1,2})?)(?![\d.,])/i);
  const totalAmount = normalizeReceiptAmount(totalMatch?.[1]);
  const date = parseDate(rawText);
  const merchantCandidates = lines.slice(0, 12).filter((line) =>
    normalizeReceiptMerchant(line) &&
    !/(итог|всего|сумма|дата|время|кассир|адрес|телефон|чек|фп|ккт|сканер|документ|освещение|назад|фото|интерфейс|amocrm|garageai|функции|статус|топливо|цена|объем|объём|факт|данным|подтвердите|действие|gallons?|price|fuel|receipt)/i.test(line) &&
    /[а-яёa-z]{3,}/i.test(line) &&
    !/^.{0,3}\d+.{0,3}$/.test(line)
  );
  const legalName = lines.slice(0, 12).join("\n").match(/(?:ООО|АО|ИП|ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ)[ \t]+[«"]([^»"\n]+(?:\n[^»"\n]+)?)[»"]/i)?.[1];
  const merchantName = normalizeReceiptMerchant(legalName) ?? (classification.category === "fuel"
    ? merchantCandidates.find((line) => /(азс|лукойл|газпром|роснефть|shell|bp|топливо)/i.test(line)) || null
    : merchantCandidates[0] || null);
  const description = classification.category === "fuel"
    ? `Заправка${classification.fuelDetails?.fuelType ? ` ${classification.fuelDetails.fuelType}` : ""}`
    : merchantName ? `Расход по чеку ${merchantName}` : "Расход по распознанному чеку";
  return {
    merchantName,
    date,
    totalAmount,
    category: classification.category,
    description,
    ...(classification.fuelDetails ? {
      fuelDetails: {
        ...classification.fuelDetails,
        liters: classification.fuelDetails.liters ?? fuelDisplay.liters,
        pricePerLiter: classification.fuelDetails.pricePerLiter ?? fuelDisplay.pricePerLiter,
      },
    } : fuelDisplay.liters || fuelDisplay.pricePerLiter ? { fuelDetails: { fuelType: null, liters: fuelDisplay.liters, pricePerLiter: fuelDisplay.pricePerLiter } } : {}),
    currency: fuelDisplay.currency,
    works: [],
    parts: [],
    notes: rawText ? "Поля извлечены локальным OCR. Проверьте данные перед сохранением." : null,
    rawText,
    ...(parseBankReceiptText(rawText) ?? {}),
    ...(isReceiptRefund(rawText) ? { operation: "refund" as const } : {}),
    _source: "local-tesseract",
  };
}

export function parseReceiptText(text: string, extractedFields: Record<string, unknown> = {}) {
  const local = parseLocalReceiptText(text);
  return {
    ...local,
    ...extractedFields,
    category: classifyReceiptText(text, extractedFields.category ?? local.category).category,
    merchantName: normalizeReceiptMerchant(extractedFields.merchantName) ?? local.merchantName,
    date: normalizeReceiptDate(extractedFields.date) ?? local.date,
    totalAmount: normalizeReceiptAmount(extractedFields.totalAmount) ?? local.totalAmount,
    operation: isReceiptRefund(text) ? "refund" as const : "expense" as const,
  };
}

export function classifyReceiptText(text: string, currentCategory?: unknown): ReceiptClassification {
  const normalized = text.toLocaleLowerCase("ru-RU");
  const current = typeof currentCategory === "string" ? currentCategory.toLowerCase() : "";
  const valid = new Set<ReceiptCategory>(["repair", "fuel", "parts", "wash", "tires", "tuning", "other"]);
  let category: ReceiptCategory = valid.has(current as ReceiptCategory) ? current as ReceiptCategory : "other";

  const strongFuelSignal =
    /(азс|заправк[а-я]*|топлив[а-я]*|бензин|дизельное топливо|дизтопливо|дт)/i.test(normalized) ||
    /(аи[- ]?\d{2}(?:\s?к\d)?)/i.test(normalized) ||
    /\b(?:gallons?|price\s+per\s+(?:gallon|gal)|fuel\s+pump)\b/i.test(normalized) ||
    (/(литр(?:а|ов|ы)?|л\.?\s*(?:×|x|по|\d))/i.test(normalized) &&
      /(?:₽\s*\/\s*л|руб(?:\.|лей)?\s*(?:за|\/)?\s*литр|цена\s*за\s*литр|колонка)/i.test(normalized));
  const repairSignal = /(?:^|[^а-яё])сто(?:$|[^а-яё])|заказ[- ]?наряд|автосервис|ремонт|замена масла|нормо[- ]?час|работы по ремонту/i.test(normalized);
  const partsSignal = /(магазин автозапчастей|автозапчасти|артикул|каталожный номер|домкрат)/i.test(normalized);

  if (strongFuelSignal && !repairSignal) category = "fuel";
  else if (category === "other" && repairSignal) category = "repair";
  else if (category === "other" && partsSignal) category = "parts";

  if (category !== "fuel") return { category };

  const fuelTypeMatch = text.match(/(?:топливо|fuel)[^\n:]{0,12}[:\-]?\s*(АИ[- ]?\s?\d{2}(?:\s?К\d)?|ДТ|дизел(?:ь|ьное топливо)|diesel|gasoline|бензин)/i)
    || text.match(/\b(АИ[- ]?\s?\d{2}(?:\s?К\d)?|ДТ|дизел(?:ь|ьное топливо)|diesel|gasoline)\b/i);
  const litersMatch = text.match(/(\d{1,4}(?:[\s.,]\d{1,3})?)\s*(?:л\.?|литр(?:а|ов|ы)?)/i)
    || text.match(/(?:объем|объём|факт\s+объем|факт\s+объём)[^0-9]{0,12}(\d{1,4}(?:[\s.,]\d{1,3})?)/i);
  const priceMatch = text.match(/(\d{1,4}(?:[\s.,]\d{1,3})?)\s*(?:₽|руб(?:\.|лей)?)?\s*(?:\/\s*л|за\s*литр)/i)
    || text.match(/(?:цена\s*за\s*литр|цена|по)\s*[:—-]?\s*(\d{1,4}(?:[\s.,]\d{1,3})?)\s*(?:₽|руб(?:\.|лей)?)?/i);

  return {
    category,
    fuelDetails: {
      fuelType: fuelTypeMatch?.[1]?.toUpperCase().replace(/\s+/g, "") || null,
      liters: litersMatch ? parseRussianNumber(litersMatch[1]) : null,
      pricePerLiter: priceMatch ? parseRussianNumber(priceMatch[1]) : null,
    },
  };
}
