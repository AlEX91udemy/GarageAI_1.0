import { describe, expect, it, vi } from "vitest";
import { decodeBarcodeCanvas, type CanvasBarcodeReader } from "./barcodeImageDecoder";

describe("barcode image fallback decoder", () => {
  it("returns a linear or 2D barcode decoded by ZXing", async () => {
    const canvas = document.createElement("canvas");
    const reader: CanvasBarcodeReader = { decodeFromCanvas: vi.fn(() => ({ getText: () => "4011558296303" })) };

    await expect(decodeBarcodeCanvas(canvas, reader)).resolves.toBe("4011558296303");
    expect(reader.decodeFromCanvas).toHaveBeenCalledWith(canvas);
  });

  it("falls through to QR decoding when the general barcode decoder fails", async () => {
    const canvas = document.createElement("canvas");
    const reader: CanvasBarcodeReader = { decodeFromCanvas: vi.fn(() => { throw new Error("not found"); }) };
    const getImageData = vi.fn(() => ({ data: new Uint8ClampedArray(), width: 0, height: 0 }));
    vi.spyOn(canvas, "getContext").mockReturnValue({ getImageData } as unknown as CanvasRenderingContext2D);

    await expect(decodeBarcodeCanvas(canvas, reader)).resolves.toBeNull();
    expect(getImageData).toHaveBeenCalled();
  });
});
