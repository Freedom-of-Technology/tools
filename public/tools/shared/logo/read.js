// The logo in the browser, for every tool that takes one: reading the visitor's file (or a smaller
// copy of it, as rules.js says), drawing it fitted in a box, and the "Choose your logo" picker.
// Nothing here leaves the browser.
//
//   readLogo(file)                       -> { image, href, width, height } or null; throws LogoError
//   drawFitted(ctx, logo, x, y, w, h)    -> draws the logo centered in the box, keeping its shape
//   logoPicker({ input, chosen, remove, inCode }) -> wires the picker's button, file name and Remove

import { LogoError, checkFile, copySize } from './rules.js';

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function decoded(href) {
  const image = new Image();
  image.src = href;
  try {
    await image.decode();
  } catch {
    throw new LogoError('Your browser couldn\'t open that logo file. Try saving it as a PNG.');
  }
  return image;
}

// The logo, or a smaller copy of it, drawn smoothly in the browser. The copy is what every file
// uses, the print file included.
export async function readLogo(file) {
  if (!file) return null;
  checkFile(file);
  const href = await readAsDataURL(file);
  const image = await decoded(href);
  // An SVG with no size of its own reports 0; it's drawn to fit, so any shape will do.
  const width = image.naturalWidth || 300;
  const height = image.naturalHeight || 150;
  const copy = copySize({ width, height, vector: file.type === 'image/svg+xml', bytes: file.size });
  if (!copy) return { image, href, width, height };

  const canvas = document.createElement('canvas');
  canvas.width = copy.width;
  canvas.height = copy.height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, copy.width, copy.height);
  // A photo stays a JPG, which is far smaller for photos; everything else becomes a PNG, which keeps
  // a see-through background.
  const smaller = file.type === 'image/jpeg' ? canvas.toDataURL('image/jpeg', 0.9) : canvas.toDataURL('image/png');
  return { image: await decoded(smaller), href: smaller, width: copy.width, height: copy.height };
}

export function drawFitted(ctx, logo, x, y, w, h) {
  const fit = Math.min(w / logo.width, h / logo.height);
  const dw = logo.width * fit;
  const dh = logo.height * fit;
  ctx.drawImage(logo.image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  return { width: dw, height: dh };
}

// The picker itself is hidden behind the "Choose your logo" button, so the page says which file is
// chosen, and offers to take it off again. `inCode` is the "Also put it in the middle of the code"
// box, which only makes sense with a logo.
export function logoPicker({ input, chosen, remove, inCode }) {
  function show() {
    const file = input.files[0];
    chosen.textContent = file ? `Chosen: ${file.name}` : 'No logo chosen';
    remove.hidden = !file;
    inCode.disabled = !file;
    if (!file) inCode.checked = false;
  }
  input.addEventListener('change', show);
  remove.addEventListener('click', () => {
    input.value = '';
    show();
    input.focus();
  });
}

export { LogoError };
