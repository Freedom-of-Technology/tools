// The code as a picture in the browser, and the test-scan on that picture, for every tool that
// makes a code.
//
//   codeCanvas(code, box, logo, scale) -> a canvas of the code, border included, the logo in the box
//   scaleFor(code, pixels)             -> whole pixels per square for a code about that many pixels wide
//   scansBack(canvas, text)            -> whether the finished picture scans as exactly that text

import { drawFitted } from "../logo/read.js";
import { BORDER, readsBack, toPixels } from "./qr.js";

// scale: pixels per square, whole, so every square is sharp.
export function codeCanvas(code, box, logo, scale) {
  const picture = toPixels(code, scale, box);
  const canvas = document.createElement("canvas");
  canvas.width = picture.width;
  canvas.height = picture.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.putImageData(new ImageData(picture.rgba, picture.width, picture.height), 0, 0);
  if (box && logo) {
    // Half a square of room on every side, so the logo never touches a square.
    const at = (box.x + BORDER + 0.5) * scale;
    const room = (box.size - 1) * scale;
    drawFitted(ctx, logo, at, at, room, room);
  }
  return canvas;
}

// No bigger than that many pixels, so the code fits the space it's given.
export const scaleFor = (code, pixels) => Math.floor(pixels / (code.size + BORDER * 2));

// The test-scan, on the finished picture with the logo drawn in.
export function scansBack(canvas, text) {
  const { data, width, height } = canvas
    .getContext("2d")
    .getImageData(0, 0, canvas.width, canvas.height);
  return readsBack(data, width, height, text);
}
