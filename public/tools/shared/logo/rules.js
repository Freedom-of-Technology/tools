// The logo rules every tool that takes a logo follows: which files it takes, and when it makes a
// smaller copy. The copy is made in the browser (read.js) and used everywhere, the print file
// included, so a large logo never makes a large download. The visitor's own file isn't changed.
//
//   checkFile({ type, size })                    -> throws LogoError when the page can't use the file
//   copySize({ width, height, vector, bytes })   -> null to use the logo as it is, or { width, height }
//                                                   for the copy

export class LogoError extends Error {}

export const LOGO = {
  // Read only in the browser, so a large file costs nothing to send; this keeps a phone from
  // running out of memory on something that isn't really a logo.
  largestFile: 25 * 1024 * 1024,
  largestPixels: 50_000_000,
  // Sharp in the card's 640-pixel space and in the middle of a printed code.
  longestSide: 1200,
  // An SVG stays as drawn, sharp at any size, unless the file is this big, which means it carries a
  // photo inside rather than shapes.
  largestVector: 1024 * 1024,
};

const TYPES = /^image\/(png|jpeg|svg\+xml|webp)$/;

export function checkFile({ type, size }) {
  if (!TYPES.test(type)) {
    throw new LogoError(
      "That file isn't a picture this page can use. Pick a PNG, JPG or SVG file.",
    );
  }
  if (size > LOGO.largestFile) {
    throw new LogoError(
      "That logo file is over 25 MB, more than a logo needs. Pick a smaller copy of it.",
    );
  }
}

export function copySize({ width, height, vector, bytes }) {
  if (vector && bytes <= LOGO.largestVector) return null;
  if (!vector && width * height > LOGO.largestPixels) {
    throw new LogoError(
      "That picture is too large for this page to open. Pick a smaller copy of your logo.",
    );
  }
  const longest = Math.max(width, height);
  if (!vector && longest <= LOGO.longestSide) return null;
  const scale = LOGO.longestSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
