import jsQR from "jsqr";

export interface CanvasBarcodeReader {
  decodeFromCanvas(canvas: HTMLCanvasElement): { getText(): string };
}

let fallbackReaderPromise: Promise<CanvasBarcodeReader> | null = null;

function getFallbackReader(): Promise<CanvasBarcodeReader> {
  if (!fallbackReaderPromise) {
    fallbackReaderPromise = Promise.all([import("@zxing/browser"), import("@zxing/library")]).then(([browser, library]) => {
      const hints = new Map();
      hints.set(library.DecodeHintType.POSSIBLE_FORMATS, [
        library.BarcodeFormat.CODE_128,
        library.BarcodeFormat.CODE_39,
        library.BarcodeFormat.DATA_MATRIX,
        library.BarcodeFormat.EAN_8,
        library.BarcodeFormat.EAN_13,
        library.BarcodeFormat.ITF,
        library.BarcodeFormat.QR_CODE,
        library.BarcodeFormat.UPC_A,
        library.BarcodeFormat.UPC_E,
      ]);
      hints.set(library.DecodeHintType.TRY_HARDER, true);
      return new browser.BrowserMultiFormatReader(hints);
    });
  }
  return fallbackReaderPromise;
}

/** Decode common 1D/2D formats when the browser's native BarcodeDetector is absent or fails. */
export async function decodeBarcodeCanvas(
  canvas: HTMLCanvasElement,
  reader?: CanvasBarcodeReader
): Promise<string | null> {
  try {
    const activeReader = reader || await getFallbackReader();
    const decoded = activeReader.decodeFromCanvas(canvas).getText();
    if (decoded) return decoded;
  } catch {
    // Continue to the specialized QR decoder as a secondary fallback.
  }

  try {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context || canvas.width < 1 || canvas.height < 1) return null;
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(image.data, image.width, image.height)?.data || null;
  } catch {
    return null;
  }
}
