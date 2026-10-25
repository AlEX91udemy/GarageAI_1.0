import sharp from "sharp";
import { createWorker, OEM, PSM } from "tesseract.js";

export type PreparedOcrImage = { name: string; image: Buffer };

const SHARP_OPTIONS = { failOn: "error" as const, limitInputPixels: 40_000_000 };
const MAX_OCR_HEIGHT = 4000;

let workerPromise: ReturnType<typeof createWorker> | undefined;
let workerQueue: Promise<unknown> = Promise.resolve();

export async function prepareDocumentImage(input: Buffer): Promise<PreparedOcrImage[]> {
  const oriented = sharp(input, SHARP_OPTIONS).rotate();
  const metadata = await oriented.metadata();
  const width = Math.max(1400, Math.min(2600, metadata.width || 1800));
  const base = () =>
    sharp(input, SHARP_OPTIONS)
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize({ width, height: MAX_OCR_HEIGHT, fit: "inside", withoutEnlargement: false })
      .grayscale()
      .normalize();
  const [clean, binary] = await Promise.all([
    base().gamma(1.08).sharpen({ sigma: 1.1 }).png().toBuffer(),
    base().gamma(1.08).sharpen({ sigma: 1.1 }).threshold(175).png().toBuffer(),
  ]);
  return [
    { name: "clean", image: clean },
    { name: "binary", image: binary },
  ];
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
