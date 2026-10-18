// QR codes for the tools that make them: the contact card maker and the review link maker.
//
// The code itself comes from qrcode-generator (vendor/, MIT), and the test-scan from jsQR (vendor/,
// Apache 2.0): two well-known libraries, kept here as published, pinned to one version each. This
// file only turns their output into what the pages draw, and checks a finished picture reads back.
//
//   makeCode(text, level)              -> { size, level, dark(x, y) }, with no border
//   logoBox(code, share)               -> the square in the middle a logo may cover, in squares
//   toPixels(code, scale, box)         -> the code as an RGBA picture, border included, box left white
//   toSVG(code, { box, logo })         -> the code as an SVG file, the logo in the box if given
//   readsBack(rgba, width, height, text) -> whether a picture of a code scans as exactly that text
//
// jsQR is a classic script: the page loads vendor/jsQR-1.4.0.js before this file, and it sets
// globalThis.jsQR. Tests load the same file the same way.

import qrcode from "./vendor/qrcode-generator-2.0.4.mjs";

// The white border every scanner needs around a code, in squares.
export const BORDER = 4;

// Text goes in as UTF-8, so accents and other alphabets come out on the phone as typed.
// qrcode-generator takes one character per byte, so the bytes go in as a string of them.
function byteString(text) {
  return String.fromCharCode(...new TextEncoder().encode(text));
}

export function makeCode(text, level = "M") {
  const qr = qrcode(0, level);
  qr.addData(byteString(text), "Byte");
  qr.make();
  const size = qr.getModuleCount();
  return { size, level, dark: (x, y) => qr.isDark(y, x) };
}

// The middle square a logo may cover: share of the code's width, rounded so it sits centered on
// whole squares. Only for a code made at level H, which can lose up to 30% and still read.
export function logoBox(code, share) {
  let cut = Math.round(code.size * share);
  if ((code.size - cut) % 2) cut += 1;
  const at = (code.size - cut) / 2;
  return { x: at, y: at, size: cut };
}

const inBox = (box, x, y) =>
  box && x >= box.x && x < box.x + box.size && y >= box.y && y < box.y + box.size;

export function toPixels(code, scale, box = null) {
  const side = (code.size + BORDER * 2) * scale;
  const rgba = new Uint8ClampedArray(side * side * 4).fill(255);
  for (let y = 0; y < code.size; y++) {
    for (let x = 0; x < code.size; x++) {
      if (!code.dark(x, y) || inBox(box, x, y)) continue;
      for (let dy = 0; dy < scale; dy++) {
        const row = ((y + BORDER) * scale + dy) * side;
        for (let dx = 0; dx < scale; dx++) {
          const i = (row + (x + BORDER) * scale + dx) * 4;
          rgba[i] = rgba[i + 1] = rgba[i + 2] = 0;
        }
      }
    }
  }
  return { rgba, width: side, height: side };
}

// Squares on a row merged into runs, so the file is small and shows no hairline seams.
function path(code, box) {
  let d = "";
  for (let y = 0; y < code.size; y++) {
    for (let x = 0; x < code.size; ) {
      if (!code.dark(x, y) || inBox(box, x, y)) {
        x++;
        continue;
      }
      let end = x;
      while (end + 1 < code.size && code.dark(end + 1, y) && !inBox(box, end + 1, y)) end++;
      d += `M${x + BORDER} ${y + BORDER}h${end - x + 1}v1h-${end - x + 1}z`;
      x = end + 1;
    }
  }
  return d;
}

const attr = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

// logo: { href, width, height }, href a data: address so the file stands alone. It's fitted inside
// the box with half a square of room on every side.
export function toSVG(code, { box = null, logo = null } = {}) {
  const side = code.size + BORDER * 2;
  let image = "";
  if (box && logo) {
    const room = box.size - 1;
    const fit = Math.min(room / logo.width, room / logo.height);
    const w = logo.width * fit;
    const h = logo.height * fit;
    const x = box.x + BORDER + (box.size - w) / 2;
    const y = box.y + BORDER + (box.size - h) / 2;
    image = `\n  <image href="${attr(logo.href)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges">
  <rect width="${side}" height="${side}" fill="#ffffff"/>
  <path fill="#000000" d="${path(code, box)}"/>${image}
</svg>
`;
}

// The test-scan: does this picture of a code read back as exactly this text, byte for byte?
export function readsBack(rgba, width, height, text) {
  const found = globalThis.jsQR(rgba, width, height, { inversionAttempts: "dontInvert" });
  if (!found) return false;
  const want = new TextEncoder().encode(text);
  const got = found.binaryData;
  return got.length === want.length && want.every((byte, i) => got[i] === byte);
}
