import { writeFileSync } from "node:fs";
import sharp from "sharp";

const source = "public/images/logo-mark.jpg";
const navy = { r: 7, g: 17, b: 29, alpha: 1 };

async function mark(size, pad) {
  const inner = size - pad * 2;
  const trimmed = await sharp(source).trim().png().toBuffer();
  return sharp(trimmed)
    .resize(inner, inner, { fit: "contain", background: navy })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: navy })
    .ensureAlpha()
    .png()
    .toBuffer();
}

function ico(png, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(size >= 256 ? 0 : size, 6);
  header.writeUInt8(size >= 256 ? 0 : size, 7);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, png]);
}

const icon48 = await mark(48, 4);
const icon192 = await mark(192, 18);
const icon180 = await mark(180, 16);
writeFileSync("src/app/favicon.ico", ico(icon48, 48));
writeFileSync("src/app/icon.png", icon192);
writeFileSync("src/app/apple-icon.png", icon180);
console.log("icons written", icon48.length, icon192.length, icon180.length);
