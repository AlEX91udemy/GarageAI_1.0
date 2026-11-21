import jsQR from "jsqr";
import sharp from "sharp";
import { normalizeReceiptAmount, normalizeReceiptDate } from "../src/receiptFields";

export function parseFiscalReceiptQr(text: string) {
  const fields = new URLSearchParams(text);
  const time = fields.get("t")?.match(/^(20\d{2})(\d{2})(\d{2})T(?:[01]\d|2[0-3])[0-5]\d(?:[0-5]\d)?$/);
  const date = time ? normalizeReceiptDate(time.slice(1, 4).join("-")) : null;
  const totalAmount = normalizeReceiptAmount(fields.get("s"));
  const kind = fields.get("n");
  if (!date || totalAmount === null || !["1", "2", "3", "4"].includes(kind ?? "") ||
      !/^\d{16}$/.test(fields.get("fn") ?? "") || !/^\d{1,10}$/.test(fields.get("i") ?? "") || !/^\d{1,10}$/.test(fields.get("fp") ?? "")) return null;
  const operation = kind === "1" ? "expense" : kind === "2" || kind === "4" ? "refund" : "income";
  return { date, totalAmount, operation };
}

export async function decodeFiscalReceiptQr(input: Buffer) {
  const { data, info } = await sharp(input, { limitInputPixels: 40_000_000 })
    .rotate()
    .flatten({ background: "#ffffff" })
    .resize({ width: 2400, height: 3200, fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const qr = jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), info.width, info.height);
  return qr ? parseFiscalReceiptQr(qr.data) : null;
}
