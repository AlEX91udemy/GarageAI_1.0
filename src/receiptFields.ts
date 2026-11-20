export function normalizeReceiptMerchant(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  if (!/[а-яёa-z]/i.test(name) || /^(?:закры(?:ть|то|та|т)|назад|отмена|документ по операции|чек|не указано|не указана|нечитаемо|не удалось распознать)[.!]?$/i.test(name)) return null;
  return name;
}

export function normalizeReceiptDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const iso = value.match(/^(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  const local = value.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](20\d{2}|\d{2})$/);
  if (!iso && !local) return null;
  const [year, month, day] = iso ? iso.slice(1) : [local![3].length === 2 ? "20" + local![3] : local![3], local![2], local![1]];
  const date = [year, month.padStart(2, "0"), day.padStart(2, "0")].join("-");
  const timestamp = Date.parse(date);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date ? date : null;
}

export function normalizeReceiptAmount(value: unknown): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\s*\d+(?:\s+\d{3})*(?:[.,]\d+)?\s*$/.test(value))) return null;
  const amount = typeof value === "number" ? value : Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export const RECEIPT_REFUND_MESSAGE = "Распознана отмена оплаты или возврат. Такой документ не добавляется в расходы.";
export const RECEIPT_INCOME_MESSAGE = "Распознан чек расхода продавца. Проверьте, что у вас есть чек об оплате покупки.";
export const MAX_RECEIPT_IMAGE_BYTES = 6_700_000;
