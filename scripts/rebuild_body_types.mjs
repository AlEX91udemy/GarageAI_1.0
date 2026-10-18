import fs from "fs";
import path from "path";
import zlib from "zlib";

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const toCrc = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([lenBuf, toCrc, crcBuf]);
}

function encodeRgbaPng(width, height, rgbaPixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk("IHDR", ihdr);

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    rgbaPixels.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }

  const idatChunk = makeChunk("IDAT", zlib.deflateSync(raw, { level: 9 }));
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function decodePngRgb(buffer) {
  let pos = 8, width, height;
  const idats = [];
  while (pos < buffer.length) {
    const len = buffer.readUInt32BE(pos);
    const type = buffer.toString("ascii", pos + 4, pos + 8);
    if (type === "IHDR") {
      width = buffer.readUInt32BE(pos + 8);
      height = buffer.readUInt32BE(pos + 12);
    } else if (type === "IDAT") {
      idats.push(buffer.subarray(pos + 8, pos + 8 + len));
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idats));
  const bpp = 3, stride = width * bpp + 1;
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    const lineStart = y * stride;
    const filter = raw[lineStart];
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 3; c++) {
        const rawByte = raw[lineStart + 1 + x * 3 + c];
        let prevX = x > 0 ? pixels[(y * width + (x - 1)) * 3 + c] : 0;
        let prevY = y > 0 ? pixels[((y - 1) * width + x) * 3 + c] : 0;
        let prevXY = (x > 0 && y > 0) ? pixels[((y - 1) * width + (x - 1)) * 3 + c] : 0;
        let val = rawByte;
        if (filter === 1) val = (rawByte + prevX) & 0xff;
        else if (filter === 2) val = (rawByte + prevY) & 0xff;
        else if (filter === 3) val = (rawByte + Math.floor((prevX + prevY) / 2)) & 0xff;
        else if (filter === 4) {
          const p = prevX + prevY - prevXY;
          const pa = Math.abs(p - prevX), pb = Math.abs(p - prevY), pc = Math.abs(p - prevXY);
          const pr = (pa <= pb && pa <= pc) ? prevX : (pb <= pc ? prevY : prevXY);
          val = (rawByte + pr) & 0xff;
        }
        pixels[(y * width + x) * 3 + c] = val;
      }
    }
  }
  return { width, height, pixels };
}

const COL_CROPS = [
  { x: 12, w: 370 },   // Col 0: Sedan / Coupe (12..382)
  { x: 384, w: 380 },  // Col 1: Hatchback / Convertible (384..764)
  { x: 768, w: 374 },  // Col 2: Wagon / Minivan (768..1142)
  { x: 1148, w: 384 }, // Col 3: SUV / Pickup (1148..1532)
];

const ROW_CROPS = [
  { y: 168, h: 244 }, // Row 0: Sedan, Hatchback, Wagon, SUV
  { y: 528, h: 242 }, // Row 1: Coupe, Convertible, Minivan, Pickup
];

const TYPES = [
  ["sedan", 0, 0],
  ["hatchback", 1, 0],
  ["wagon", 2, 0],
  ["suv", 3, 0],
  ["coupe", 0, 1],
  ["convertible", 1, 1],
  ["minivan", 2, 1],
  ["pickup", 3, 1],
  ["van", 2, 1],             // Van uses Minivan visual
  ["minibus", 2, 1],         // Minibus uses Minivan visual
  ["liftback", 0, 0],        // Liftback uses Sedan visual
  ["crossover-coupe", 3, 0], // Crossover-coupe uses SUV visual
];

const COLORS = ["black", "blue", "grey", "red", "white", "silver", "green", "gold"];
const BASE_DIR = path.resolve("public/images/body-types");

const targetW = 640;
const targetH = 360;
const feather = 20;
const vignetteDist = 32;

for (const color of COLORS) {
  const sheetPath = path.join(BASE_DIR, `source-${color}.png`);
  if (!fs.existsSync(sheetPath)) {
    console.warn("Missing sheet:", sheetPath);
    continue;
  }

  console.log(`Processing color sheet: ${color}...`);
  const sheetBuf = fs.readFileSync(sheetPath);
  const src = decodePngRgb(sheetBuf);

  const outDir = path.join(BASE_DIR, color);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const [slug, col, row] of TYPES) {
    const { x: cropX, w: cropW } = COL_CROPS[col];
    const { y: cropY, h: cropH } = ROW_CROPS[row];

    // Sample background color near the top corners of the tile
    const tlIdx = (cropY * src.width + cropX) * 3;
    const trIdx = (cropY * src.width + cropX + cropW - 1) * 3;
    const bgR = Math.round((src.pixels[tlIdx] + src.pixels[trIdx]) / 2);
    const bgG = Math.round((src.pixels[tlIdx + 1] + src.pixels[trIdx + 1]) / 2);
    const bgB = Math.round((src.pixels[tlIdx + 2] + src.pixels[trIdx + 2]) / 2);

    const target = Buffer.alloc(targetW * targetH * 4);
    const offsetX = Math.round((targetW - cropW) / 2);
    const offsetY = Math.round((targetH - cropH) / 2) + 8; // gently grounded

    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const tIdx = (y * targetW + x) * 4;
        const tx = x - offsetX;
        const ty = y - offsetY;

        let r = bgR, g = bgG, b = bgB, a = 255;

        if (tx >= 0 && tx < cropW && ty >= 0 && ty < cropH) {
          const sx = cropX + tx;
          const sy = cropY + ty;
          const sIdx = (sy * src.width + sx) * 3;
          r = src.pixels[sIdx];
          g = src.pixels[sIdx + 1];
          b = src.pixels[sIdx + 2];

          // Soft feather at tile boundaries
          const distToEdge = Math.min(tx, cropW - 1 - tx, ty, cropH - 1 - ty);
          if (distToEdge < feather) {
            const factor = distToEdge / feather;
            r = Math.round(r * factor + bgR * (1 - factor));
            g = Math.round(g * factor + bgG * (1 - factor));
            b = Math.round(b * factor + bgB * (1 - factor));
          }
        }

        // Soft outer vignette towards 640x360 canvas boundary
        const distCanvas = Math.min(x, targetW - 1 - x, y, targetH - 1 - y);
        if (distCanvas < vignetteDist) {
          a = Math.round(255 * (distCanvas / vignetteDist));
        }

        target[tIdx] = r;
        target[tIdx + 1] = g;
        target[tIdx + 2] = b;
        target[tIdx + 3] = a;
      }
    }

    const png = encodeRgbaPng(targetW, targetH, target);
    const destPath = path.join(outDir, `${slug}.png`);
    fs.writeFileSync(destPath, png);
  }
}

console.log("All body-type assets successfully generated with full bounds and generous padding!");
