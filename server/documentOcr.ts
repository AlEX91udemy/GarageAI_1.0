import sharp from "sharp";
import { createWorker, OEM, PSM } from "tesseract.js";

export type PreparedOcrImage = { name: string; image: Buffer };
export type VisionDocumentTile = { label: "full" | "top" | "bottom"; mimeType: "image/png"; base64: string };

const SHARP_OPTIONS = { failOn: "error" as const, limitInputPixels: 40_000_000 };
const MAX_OCR_HEIGHT = 4000;

let workerPromise: ReturnType<typeof createWorker> | undefined;
let workerQueue: Promise<unknown> = Promise.resolve();

export async function prepareDocumentImage(input: Buffer): Promise<PreparedOcrImage[]> {
  const oriented = sharp(input, SHARP_OPTIONS).rotate();
  const metadata = await oriented.metadata();
  const width = Math.max(1600, Math.min(2600, metadata.width || 1800));
  const base = () =>
    sharp(input, SHARP_OPTIONS)
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize({ width, height: MAX_OCR_HEIGHT, fit: "inside", withoutEnlargement: false })
      .grayscale()
      .normalize();
  const [clean, binary] = await Promise.all([
    base().gamma(1.08).sharpen({ sigma: 1.15 }).png().toBuffer(),
    base().gamma(1.08).sharpen({ sigma: 1.25 }).linear(1.3, -28).png().toBuffer(),
  ]);
  return [
    { name: "clean", image: clean },
    { name: "binary", image: binary },
  ];
}

/**
 * Готовит мультимасштабный набор изображений для облачного Vision OCR:
 * 1) Полная страница с улучшением контраста и резкости
 * 2) Увеличенная верхняя половина (0% - 58% высоты) для мелкого текста/шапок/таблиц
 * 3) Увеличенная нижняя половина (42% - 100% высоты) для подвалов/штампов/VIN
 */
export async function prepareVisionDocumentTiles(input: Buffer): Promise<VisionDocumentTile[]> {
  try {
    const orientedBuffer = await sharp(input, SHARP_OPTIONS)
      .rotate()
      .flatten({ background: "#ffffff" })
      .toBuffer();

    const meta = await sharp(orientedBuffer, SHARP_OPTIONS).metadata();
    const origW = meta.width || 1600;
    const origH = meta.height || 2000;
    const targetWidth = Math.max(1600, Math.min(2400, origW));

    const fullBuffer = await sharp(orientedBuffer, SHARP_OPTIONS)
      .resize({ width: targetWidth, height: MAX_OCR_HEIGHT, fit: "inside", withoutEnlargement: false })
      .normalize()
      .sharpen({ sigma: 1.1 })
      .png({ compressionLevel: 6 })
      .toBuffer();

    const tiles: VisionDocumentTile[] = [
      { label: "full", mimeType: "image/png", base64: fullBuffer.toString("base64") },
    ];

    // Если страница достаточно высокая или содержит мелкий текст — добавляем 2 перекрывающихся кропа
    if (origH >= 500 && origW >= 400) {
      const topHeight = Math.min(origH, Math.round(origH * 0.58));
      const bottomTop = Math.max(0, Math.round(origH * 0.42));
      const bottomHeight = origH - bottomTop;

      const [topBuffer, bottomBuffer] = await Promise.all([
        sharp(orientedBuffer, SHARP_OPTIONS)
          .extract({ left: 0, top: 0, width: origW, height: topHeight })
          .resize({ width: targetWidth, withoutEnlargement: false })
          .normalize()
          .sharpen({ sigma: 1.2 })
          .png({ compressionLevel: 6 })
          .toBuffer(),
        sharp(orientedBuffer, SHARP_OPTIONS)
          .extract({ left: 0, top: bottomTop, width: origW, height: bottomHeight })
          .resize({ width: targetWidth, withoutEnlargement: false })
          .normalize()
          .sharpen({ sigma: 1.2 })
          .png({ compressionLevel: 6 })
          .toBuffer(),
      ]);

      tiles.push(
        { label: "top", mimeType: "image/png", base64: topBuffer.toString("base64") },
        { label: "bottom", mimeType: "image/png", base64: bottomBuffer.toString("base64") }
      );
    }

    return tiles;
  } catch {
    return [{ label: "full", mimeType: "image/png", base64: input.toString("base64") }];
  }
}

const CYR_TO_LAT_VIN_MAP: Record<string, string> = {
  А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H",
  О: "0", Р: "P", С: "C", Т: "T", У: "Y", Х: "X",
  З: "3", Ч: "4", Б: "6", I: "1", O: "0", Q: "0",
};

const LAT_TO_CYR_PLATE_MAP: Record<string, string> = {
  A: "А", B: "В", E: "Е", K: "К", M: "М", H: "Н",
  O: "О", P: "Р", C: "С", T: "Т", Y: "У", X: "Х", "0": "О",
};

/**
 * Нормализует 17-значный VIN по стандарту ISO 3779 (заменяя кириллические двойники и запрещённые I/O/Q).
 */
export function normalizeExtractedVin(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const cleaned = raw
    .toUpperCase()
    .replace(/[^0-9A-ZА-ЯЁ]/g, "")
    .split("")
    .map((ch) => CYR_TO_LAT_VIN_MAP[ch] || ch)
    .join("");
  const match = cleaned.match(/[A-HJ-NPR-Z0-9]{17}/);
  return match ? match[0] : null;
}

/**
 * Нормализует российский госномер к формату А123ВС77(7) с кириллическими буквами ГОСТ.
 */
export function normalizeRussianPlate(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const cleaned = raw.toUpperCase().replace(/[\s\-]+/g, "");
  const match = cleaned.match(/([A-ZАВЕКМНОРСТУХ0])(\d{3})([A-ZАВЕКМНОРСТУХ0]{2})(\d{2,3})/);
  if (!match) return null;
  const l1 = LAT_TO_CYR_PLATE_MAP[match[1]] || match[1];
  const digits = match[2].replace(/[ОO]/g, "0");
  const l23 = match[3]
    .split("")
    .map((ch) => LAT_TO_CYR_PLATE_MAP[ch] || ch)
    .join("");
  const region = match[4].replace(/[ОO]/g, "0");
  const result = `${l1}${digits}${l23}${region}`;
  return /^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3}$/.test(result) ? result : null;
}

async function getWorker() {
  if (!workerPromise) {
    const languages = process.env.OCR_LANGUAGES || "rus+eng";
    workerPromise = createWorker(languages, OEM.LSTM_ONLY, { logger: () => undefined });
  }
  try {
    return await workerPromise;
  } catch (error) {
    workerPromise = undefined;
    throw error;
  }
}

export async function recognizeDocumentImage(image: Buffer, pageSegmentation: "block" | "sparse" = "sparse") {
  const task = workerQueue.then(async () => {
    const worker = await getWorker();
    await worker.setParameters({
      tessedit_pageseg_mode: pageSegmentation === "block" ? PSM.SINGLE_BLOCK : PSM.SPARSE_TEXT,
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
    });
    const result = await worker.recognize(image);
    return { text: result.data.text.trim(), confidence: result.data.confidence };
  });
  workerQueue = task.then(
    () => undefined,
    () => undefined
  );
  return task;
}

export async function terminateDocumentOcrWorker() {
  const worker = await workerPromise?.catch(() => undefined);
  workerPromise = undefined;
  if (worker) await worker.terminate();
}
