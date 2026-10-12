// The page: takes the visitor's details and an optional logo, makes the code and the card picture,
// test-scans the code, and offers the files. Everything happens here in the browser: the page's
// security settings (connect-src 'none') block it from sending anything anywhere.
//
// The code is offered only when the finished picture, logo and all, scans back as exactly the
// contact typed (readsBack in ../shared/qr/qr.js).

import { BORDER, logoBox, makeCode, readsBack, toPixels, toSVG } from '../shared/qr/qr.js';
import { ContactError, contactCard, fileName, fullName } from './card/vcard.js';

const form = document.getElementById('card-form');
const results = document.getElementById('results');
const freeot = document.getElementById('freeot');
const logoInput = document.getElementById('logo');
const logoInCode = document.getElementById('logo-in-code');

// How much of the code's width a logo in the middle may cover. At level H a code can lose 30% and
// still read; a fifth of the width is 4% of its area, which leaves room for scuffs and glare.
const LOGO_SHARE = 0.2;
// The code's PNG is about this many pixels wide, in whole pixels per square.
const CODE_PIXELS = 1200;
// The card picture: tall, like a phone screen, with the code up to this many pixels wide on it.
const CARD = { width: 1080, height: 1920, side: 96 };
const CARD_CODE = 720;
const LARGEST_LOGO = 5 * 1024 * 1024;

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    if (key === 'class') el.className = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

class LogoError extends Error {}

// ---- The logo, read in the browser -------------------------------------------------------------

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function readLogo(file) {
  if (!file) return null;
  if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) {
    throw new LogoError('That file isn\'t a picture this page can use. Pick a PNG, JPG or SVG file.');
  }
  if (file.size > LARGEST_LOGO) {
    throw new LogoError('That logo file is over 5 MB. Pick a smaller copy of it.');
  }
  const href = await readAsDataURL(file);
  const image = new Image();
  image.src = href;
  try {
    await image.decode();
  } catch {
    throw new LogoError('Your browser couldn\'t open that logo file. Try saving it as a PNG.');
  }
  // An SVG with no size of its own reports 0; it's drawn to fit, so any shape will do.
  const width = image.naturalWidth || 300;
  const height = image.naturalHeight || 150;
  return { image, href, width, height };
}

// Draws the logo fitted inside a box, centered.
function drawFitted(ctx, logo, x, y, w, h) {
  const fit = Math.min(w / logo.width, h / logo.height);
  const dw = logo.width * fit;
  const dh = logo.height * fit;
  ctx.drawImage(logo.image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  return { width: dw, height: dh };
}

// ---- The code, as a picture ----------------------------------------------------------------------

// scale: pixels per square, whole, so every square is sharp.
function codeCanvas(code, box, logo, scale) {
  const picture = toPixels(code, scale, box);
  const canvas = document.createElement('canvas');
  canvas.width = picture.width;
  canvas.height = picture.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.putImageData(new ImageData(picture.rgba, picture.width, picture.height), 0, 0);
  if (box && logo) {
    // Half a square of room on every side, so the logo never touches a square.
    const at = (box.x + BORDER + 0.5) * scale;
    const room = (box.size - 1) * scale;
    drawFitted(ctx, logo, at, at, room, room);
  }
  return canvas;
}

// The test-scan, on the finished picture with the logo drawn in.
function scansBack(canvas, text) {
  const { data, width, height } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  return readsBack(data, width, height, text);
}

// ---- The card picture ----------------------------------------------------------------------------

const INK = '#111418';
const SOFT = '#3d4550';
const FONT = 'Figtree, system-ui, sans-serif';

function wrap(ctx, text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function cardPicture(details, code, logo) {
  await Promise.all([document.fonts.load(`700 76px ${FONT}`), document.fonts.load(`400 40px ${FONT}`)]);
  const canvas = document.createElement('canvas');
  canvas.width = CARD.width;
  canvas.height = CARD.height;
  const ctx = canvas.getContext('2d');
  const inner = CARD.width - CARD.side * 2;
  const middle = CARD.width / 2;

  // Each piece: its height, and how to draw it from a top edge. Measured first, so the whole
  // card can be centered on the picture.
  const pieces = [];
  const gap = (height) => pieces.push({ height, draw() {} });
  const text = (value, font, color, lineHeight) => {
    ctx.font = font;
    for (const line of wrap(ctx, value, inner)) {
      pieces.push({ height: lineHeight, draw(y) {
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.fillText(line, middle, y + lineHeight * 0.78);
      } });
    }
  };

  if (logo) {
    const fit = Math.min(640 / logo.width, 220 / logo.height);
    const height = logo.height * fit;
    pieces.push({ height, draw(y) { drawFitted(ctx, logo, middle - 320, y, 640, height); } });
    gap(64);
  }
  text(fullName(details), `700 76px ${FONT}`, INK, 88);
  const role = [details.title, details.first || details.last ? details.org : ''].map((s) => s.trim()).filter(Boolean).join(', ');
  if (role) text(role, `400 42px ${FONT}`, SOFT, 56);
  gap(56);
  const side = code.width;
  pieces.push({ height: side, draw(y) { ctx.drawImage(code, middle - side / 2, y); } });
  gap(12);
  text('Scan to save my contact', `600 38px ${FONT}`, SOFT, 50);
  const contact = [details.phone, details.email, details.website.replace(/^https?:\/\//i, '').replace(/\/$/, '')]
    .map((s) => s.trim()).filter(Boolean);
  if (contact.length) gap(40);
  for (const line of contact) text(line, `400 40px ${FONT}`, INK, 58);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CARD.width, CARD.height);
  ctx.textAlign = 'center';
  const total = pieces.reduce((sum, p) => sum + p.height, 0);
  let y = Math.max(CARD.side, (CARD.height - total) / 2);
  for (const piece of pieces) {
    piece.draw(y);
    y += piece.height;
  }
  return canvas;
}

// ---- The files -----------------------------------------------------------------------------------

// Addresses for the downloads, made in the browser. Each new code lets go of the last ones.
let made = [];
const fileURL = (blob) => {
  const url = URL.createObjectURL(blob);
  made.push(url);
  return url;
};
const pngOf = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

function download(label, url, name) {
  return h('a', { class: 'fo-btn fo-btn-outline', href: url, download: name }, label);
}

// ---- Showing the result --------------------------------------------------------------------------

function show(...children) {
  results.replaceChildren(h('div', { class: 'result' }, ...children));
  const heading = results.querySelector('h2');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: false });
  }
}

function problem(title, message) {
  freeot.hidden = true;
  show(h('div', { class: 'problem' },
    h('div', { class: 'problem-head' },
      h('span', { class: 'badge badge-failed' }, 'Not made'),
      h('h2', { class: 'problem-title' }, title)),
    h('p', {}, message)));
}

async function make() {
  const data = new FormData(form);
  const details = Object.fromEntries(['first', 'last', 'org', 'title', 'phone', 'email', 'website']
    .map((key) => [key, String(data.get(key) ?? '')]));

  let text;
  let logo;
  try {
    text = contactCard(details);
    logo = await readLogo(logoInput.files[0]);
  } catch (error) {
    if (error instanceof ContactError || error instanceof LogoError) return problem('Check your details', error.message);
    throw error;
  }

  const inCode = Boolean(logo && logoInCode.checked);
  const code = makeCode(text, inCode ? 'H' : 'M');
  const box = inCode ? logoBox(code, LOGO_SHARE) : null;
  const canvas = codeCanvas(code, box, logo, Math.max(4, Math.ceil(CODE_PIXELS / (code.size + BORDER * 2))));

  let passed;
  try {
    passed = scansBack(canvas, text);
  } catch {
    return problem('This logo couldn\'t be checked', 'Your browser wouldn\'t let the page test-scan a code with this logo in it. Try the logo as a PNG file, or leave it out of the code.');
  }
  if (!passed) {
    return problem('This code didn\'t pass the test-scan', inCode
      ? 'With your logo in the middle, the code didn\'t scan back as your contact, so it isn\'t offered. Untick "Also put it in the middle of the code" and make it again; your logo still goes on the card picture.'
      : 'The code didn\'t scan back as your contact, so it isn\'t offered. Try shortening the longest details, then make it again.');
  }

  for (const url of made) URL.revokeObjectURL(url);
  made = [];
  const name = fileName(details);
  const svg = toSVG(code, { box, logo: inCode ? logo : null });
  const onCard = codeCanvas(code, box, logo, Math.floor(CARD_CODE / (code.size + BORDER * 2)));
  const card = await cardPicture(details, onCard, logo);
  const cardURL = fileURL(await pngOf(card));

  freeot.hidden = false;
  show(
    h('div', { class: 'result-head' },
      h('div', {},
        h('span', { class: 'badge badge-passed' }, 'Passed the test-scan'),
        h('h2', { class: 'fo-h2' }, 'Your code is ready'),
        h('p', { class: 'hint' }, 'We scanned it back, and it holds exactly the contact you typed.'))),
    h('div', { class: 'made' },
      h('figure', { class: 'made-picture' },
        h('img', { src: cardURL, alt: `Card picture for ${fullName(details)}, with the code to scan`, width: CARD.width, height: CARD.height }),
        h('p', {}, 'Try it: point your phone\'s camera at the code.')),
      h('div', { class: 'downloads' },
        h('h3', { class: 'fo-h3' }, 'Download'),
        download('Card picture (PNG)', cardURL, `${name}-card.png`),
        download('Code for print (SVG)', fileURL(new Blob([svg], { type: 'image/svg+xml' })), `${name}-contact-code.svg`),
        download('Code as a picture (PNG)', fileURL(await pngOf(canvas)), `${name}-contact-code.png`),
        download('Contact file (.vcf)', fileURL(new Blob([text + '\r\n'], { type: 'text/vcard' })), `${name}.vcf`),
        h('p', { class: 'hint' }, h('a', { class: 'fo-link', href: '#means-files' }, 'Which file to use')))),
  );
}

logoInput.addEventListener('change', () => {
  logoInCode.disabled = !logoInput.files.length;
  if (logoInCode.disabled) logoInCode.checked = false;
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  make().catch(() => problem('Something went wrong', 'The page couldn\'t make your code this time. Reload the page and try again.'));
});
