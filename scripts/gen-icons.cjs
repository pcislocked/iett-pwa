#!/usr/bin/env node
// Generates public/icons/icon-192.png and icon-512.png using only Node.js builtins.
// Color: #1a56db (IETT blue). Run: node scripts/gen-icons.js
'use strict'
const fs = require('fs')
const zlib = require('zlib')

// ── CRC32 ──────────────────────────────────────────────────────────────────
const _crcTable = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = _crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const payload = Buffer.concat([typeBuf, data])
  const lenBuf = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(payload))
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

// ── PNG builder ─────────────────────────────────────────────────────────────
function makeSolidPNG(size, r, g, b) {
  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2 // bit depth=8, colorType=2 (RGB truecolor)

  // Raw image: one filter byte (0 = none) + RGB per pixel, per row
  const row = Buffer.alloc(1 + size * 3)
  row[0] = 0
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = r
    row[2 + x * 3] = g
    row[3 + x * 3] = b
  }
  const raw = Buffer.concat(Array.from({ length: size }, () => row))
  const idat = zlib.deflateSync(raw, { level: 9 })

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Main ────────────────────────────────────────────────────────────────────
const OUT = 'public/icons'
fs.mkdirSync(OUT, { recursive: true })

// #1a56db — same blue used in the bottom nav / brand tokens
const [R, G, B] = [26, 86, 219]

for (const size of [192, 512]) {
  const png = makeSolidPNG(size, R, G, B)
  const dest = `${OUT}/icon-${size}.png`
  fs.writeFileSync(dest, png)
  console.log(`✓ ${dest}  ${png.length} bytes`)
}

console.log('Done. Commit public/icons/ and push.')
