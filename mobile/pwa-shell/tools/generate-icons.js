// Genera le icone PNG della PWA senza dipendenze esterne (solo zlib di Node).
// Tema "Vulcano": sfondo scuro + vulcano stilizzato con bagliore arancione.
// Uso: node tools/generate-icons.js
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "public", "icons");

// CRC32 (tabella) per i chunk PNG.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function lerp(a, b, t) { return a + (b - a) * t; }

// Disegna un pixel RGBA per il tema vulcano.
function pixel(x, y, size) {
  const u = x / size;
  const v = y / size;
  // Sfondo: gradiente verticale blu notte.
  let r = lerp(11, 20, v);
  let g = lerp(16, 26, v);
  let b = lerp(32, 54, v);

  // Vulcano: triangolo centrato con cima tronca.
  const baseY = 0.86;     // base del vulcano
  const peakY = 0.30;     // altezza cima
  const halfBaseW = 0.40; // mezza larghezza alla base
  const craterHalf = 0.085;
  if (v >= peakY && v <= baseY) {
    const tt = (v - peakY) / (baseY - peakY); // 0 cima -> 1 base
    const halfW = lerp(craterHalf, halfBaseW, tt);
    const dx = Math.abs(u - 0.5);
    if (dx <= halfW) {
      // Corpo del vulcano: roccia scura calda.
      r = lerp(60, 38, tt);
      g = lerp(40, 28, tt);
      b = lerp(38, 30, tt);
      // Lava che cola dalla cima.
      if (dx <= craterHalf * 1.2 && v < 0.62) {
        const glow = 1 - (v - peakY) / (0.62 - peakY);
        r = lerp(r, 255, glow);
        g = lerp(g, 120, glow);
        b = lerp(b, 50, glow * 0.6);
      }
    }
  }

  // Bagliore/eruzione sopra il cratere.
  const cx = 0.5, cy = peakY;
  const d = Math.hypot(u - cx, (v - cy) * 1.4);
  if (d < 0.16) {
    const glow = Math.pow(1 - d / 0.16, 1.6);
    r = lerp(r, 255, glow);
    g = lerp(g, 170, glow);
    b = lerp(b, 60, glow);
  }

  return [Math.round(r), Math.round(g), Math.round(b), 255];
}

function makePng(size) {
  // Buffer raw: per ogni riga un byte filtro (0) + RGBA.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filtro None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y, size);
      raw[p++] = r; raw[p++] = g; raw[p++] = b; raw[p++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const size of [192, 512]) {
  const png = makePng(size);
  const file = path.join(OUT_DIR, `icon-${size}.png`);
  fs.writeFileSync(file, png);
  console.log(`Scritto ${file} (${png.length} byte)`);
}
console.log("Icone generate.");
