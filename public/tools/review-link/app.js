// The page: takes the owner's Google review link, business name and an optional logo, makes the
// code and the 5x7 counter card, test-scans the code, and offers the files. Everything happens here
// in the browser: the page's security settings (connect-src 'none') block it from sending anything
// anywhere.
//
// The code is offered only when the finished picture, logo and all, scans back as exactly the
// link (scansBack in ../shared/qr/picture.js).

import { BORDER, logoBox, makeCode, toSVG } from '../shared/qr/qr.js';
import { codeCanvas, scaleFor, scansBack } from '../shared/qr/picture.js';
import { ReviewLinkError, reviewDetails } from './card/link.js';
import { LogoError, drawFitted, logoPicker, readLogo } from '../shared/logo/read.js';
import { FONT, INK, SOFT, column } from '../shared/column.js';
import { copyButton, download, downloads, fileSlug, h, notMade, pngOf, show } from '../shared/page.js';

const form = document.getElementById('review-form');
const results = document.getElementById('results');
const freeot = document.getElementById('freeot');
const logoInput = document.getElementById('logo');
const logoInCode = document.getElementById('logo-in-code');

// How much of the code's width a logo in the middle may cover. At level H a code can lose 30% and
// still read; a fifth of the width is 4% of its area, which leaves room for scuffs and glare.
const LOGO_SHARE = 0.2;
// The code's PNG is about this many pixels wide, in whole pixels per square.
const CODE_PIXELS = 1200;
// The counter card: 5x7 inches at 300 pixels to the inch, the size photo counters print. The code
// is up to 960 pixels wide on it, about 3 1/4 inches.
const CARD = { width: 1500, height: 2100, side: 150 };
const CARD_CODE = 960;

// ---- The counter card ----------------------------------------------------------------------------

async function counterCard({ business, topline }, code, logo) {
  await Promise.all([document.fonts.load(`700 104px ${FONT}`), document.fonts.load(`400 64px ${FONT}`)]);
  const canvas = document.createElement('canvas');
  canvas.width = CARD.width;
  canvas.height = CARD.height;
  const ctx = canvas.getContext('2d');
  const col = column(ctx, CARD);

  if (logo) {
    const fit = Math.min(900 / logo.width, 260 / logo.height);
    const height = logo.height * fit;
    col.piece(height, (y) => drawFitted(ctx, logo, col.middle - 450, y, 900, height));
    col.gap(56);
  }
  col.text(business, `700 92px ${FONT}`, INK, 108);
  col.gap(40);
  if (topline) col.text(topline, `400 64px ${FONT}`, SOFT, 80);
  col.text('Leave us a review on Google', `700 72px ${FONT}`, INK, 90);
  col.gap(36);
  col.piece(code.width, (y) => ctx.drawImage(code, col.middle - code.width / 2, y));
  col.gap(8);
  col.text('Point your phone\'s camera at the code', `400 48px ${FONT}`, SOFT, 64);
  col.draw();
  return canvas;
}

// ---- Showing the result --------------------------------------------------------------------------

const files = downloads();

function problem(title, message) {
  freeot.hidden = true;
  notMade(results, title, message);
}

async function make() {
  const data = new FormData(form);
  let details;
  let logo;
  try {
    details = reviewDetails(Object.fromEntries(['business', 'topline', 'link']
      .map((key) => [key, String(data.get(key) ?? '')])));
    logo = await readLogo(logoInput.files[0]);
  } catch (error) {
    if (error instanceof ReviewLinkError || error instanceof LogoError) return problem('Check your details', error.message);
    throw error;
  }

  const { business, link } = details;
  const inCode = Boolean(logo && logoInCode.checked);
  const code = makeCode(link, inCode ? 'H' : 'M');
  const box = inCode ? logoBox(code, LOGO_SHARE) : null;
  const canvas = codeCanvas(code, box, logo, Math.max(4, Math.ceil(CODE_PIXELS / (code.size + BORDER * 2))));

  let passed;
  try {
    passed = scansBack(canvas, link);
  } catch {
    return problem('This logo couldn\'t be checked', 'Your browser wouldn\'t let the page test-scan a code with this logo in it. Try the logo as a PNG file, or leave it out of the code.');
  }
  if (!passed) {
    return problem('This code didn\'t pass the test-scan', inCode
      ? 'With your logo in the middle, the code didn\'t scan back as your link, so it isn\'t offered. Untick "Also put it in the middle of the code" and make it again; your logo still goes on the counter card.'
      : 'The code didn\'t scan back as your link, so it isn\'t offered. Copy the link from Google again, then make it again.');
  }

  files.clear();
  const name = fileSlug(business, 'review');
  const svg = toSVG(code, { box, logo: inCode ? logo : null });
  const onCard = codeCanvas(code, box, logo, scaleFor(code, CARD_CODE));
  const card = await counterCard(details, onCard, logo);
  const cardURL = files.url(await pngOf(card));
  const shown = h('p', { class: 'shown-link' }, link);

  freeot.hidden = false;
  show(results,
    h('div', { class: 'result-head' },
      h('div', {},
        h('span', { class: 'badge badge-passed' }, 'Passed the test-scan'),
        h('h2', { class: 'fo-h2' }, 'Your code is ready'),
        h('p', { class: 'hint' }, 'We scanned it back, and it holds exactly the link you pasted.'))),
    h('div', { class: 'made' },
      h('figure', { class: 'made-picture' },
        h('img', { src: cardURL, alt: `Counter card for ${business}, asking for a Google review, with the code to scan`, width: CARD.width, height: CARD.height }),
        h('p', {}, 'Try it: point your phone\'s camera at the code.')),
      h('div', { class: 'downloads' },
        h('h3', { class: 'fo-h3' }, 'Download'),
        download('Counter card, 5x7 (PNG)', cardURL, `${name}-review-card-5x7.png`),
        download('Code for print (SVG)', files.url(new Blob([svg], { type: 'image/svg+xml' })), `${name}-review-code.svg`),
        download('Code as a picture (PNG)', files.url(await pngOf(canvas)), `${name}-review-code.png`),
        h('p', { class: 'hint' }, h('a', { class: 'fo-link', href: '#means-files' }, 'Which file to use')),
        h('h3', { class: 'fo-h3' }, 'Your link'),
        shown,
        h('div', { class: 'fo-row' },
          copyButton(link, shown),
          h('a', { class: 'fo-btn fo-btn-outline', href: link, target: '_blank', rel: 'noopener noreferrer' }, 'Try your link')),
        h('p', { class: 'hint' }, h('a', { class: 'fo-link', href: '#means-elsewhere' }, 'Other places for your link')))),
  );
}

logoPicker({
  input: logoInput,
  chosen: document.getElementById('logo-chosen'),
  remove: document.getElementById('logo-remove'),
  inCode: logoInCode,
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  make().catch(() => problem('Something went wrong', 'The page couldn\'t make your code this time. Reload the page and try again.'));
});
