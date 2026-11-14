import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  normalizeExtractedVin,
  normalizeRussianPlate,
  prepareDocumentImage,
  prepareVisionDocumentTiles,
} from "./documentOcr";

describe("document OCR preprocessing and field normalization", () => {
  it("normalizes OCR confusions and extracts a valid VIN", () => {
    expect(normalizeExtractedVin("VIN: JN1TBNT31U0048123")).toBe("JN1TBNT31U0048123");
    expect(normalizeExtractedVin("jn1 tbnt31u0048123")).toBe("JN1TBNT31U0048123");
    expect(normalizeExtractedVin("VIN: JН4TB2Н26CC000000")).toBe("JH4TB2H26CC000000");
    expect(normalizeExtractedVin("JN1TBNT31U004812")).toBeNull();
    expect(normalizeExtractedVin("короткий текст")).toBeNull();
  });

  it("normalizes Russian plates from Latin/Cyrillic OCR variants", () => {
    expect(normalizeRussianPlate("A123BC 196")).toBe("А123ВС196");
    expect(normalizeRussianPlate("а123вс96")).toBe("А123ВС96");
    expect(normalizeRussianPlate("123ABC")).toBeNull();
  });

  it("creates two local OCR variants for a valid image", async () => {
    const input = await sharp({
      create: { width: 800, height: 1100, channels: 3, background: "white" },
    }).png().toBuffer();

    const variants = await prepareDocumentImage(input);
    expect(variants.map((item) => item.name)).toEqual(["clean", "binary"]);
    expect(variants.every((item) => item.image.length > 0)).toBe(true);
    await expect(sharp(variants[0].image).metadata()).resolves.toMatchObject({ format: "png" });
  });

  it("returns full and cropped vision tiles for a document-sized image", async () => {
    const input = await sharp({
      create: { width: 1000, height: 1800, channels: 3, background: "#eeeeee" },
    }).png().toBuffer();

    const tiles = await prepareVisionDocumentTiles(input);
    expect(tiles.map((tile) => tile.label)).toEqual(["full", "top", "bottom"]);
    expect(tiles.every((tile) => tile.mimeType === "image/jpeg" && tile.base64.length > 100)).toBe(true);
  });

  it("falls back to the original bytes when image preprocessing fails", async () => {
    const input = Buffer.from("not-an-image");
    const tiles = await prepareVisionDocumentTiles(input);
    expect(tiles).toEqual([{ label: "full", mimeType: "image/jpeg", base64: input.toString("base64") }]);
  });
});
