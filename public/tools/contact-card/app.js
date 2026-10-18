// The page: takes the visitor's details and an optional logo, makes the code and the card picture,
// test-scans the code, and offers the files. Everything happens here in the browser: the page's
// security settings (connect-src 'none') block it from sending anything anywhere.
//
// The code is offered only when the finished picture, logo and all, scans back as exactly the
// contact typed (readsBack in ../shared/qr/qr.js).

import { column, FONT, INK, SOFT } from "../shared/column.js";
import { drawFitted, LogoError, logoPicker, readLogo } from "../shared/logo/read.js";
import { download, downloads, h, notMade, pngOf, show } from "../shared/page.js";
import { codeCanvas, scaleFor, scansBack } from "../shared/qr/picture.js";
import { BORDER, logoBox, makeCode, toSVG } from "../shared/qr/qr.js";
import { ContactError, contactCard, fileName, fullName } from "./card/vcard.js";

const form = document.getElementById("card-form");
const results = document.getElementById("results");
const freeot = document.getElementById("freeot");
const logoInput = document.getElementById("logo");
const logoInCode = document.getElementById("logo-in-code");

// How much of the code's width a logo in the middle may cover. At level H a code can lose 30% and
// still read; a fifth of the width is 4% of its area, which leaves room for scuffs and glare.
const LOGO_SHARE = 0.2;
// The code's PNG is about this many pixels wide, in whole pixels per square.
const CODE_PIXELS = 1200;
// The card picture: tall, like a phone screen, with the code up to this many pixels wide on it.
const CARD = { width: 1080, height: 1920, side: 96 };
const CARD_CODE = 720;

async function cardPicture(details, code, logo) {
  await Promise.all([
    document.fonts.load(`700 76px ${FONT}`),
    document.fonts.load(`400 40px ${FONT}`),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = CARD.width;
  canvas.height = CARD.height;
  const ctx = canvas.getContext("2d");
  const col = column(ctx, CARD);

  if (logo) {
    const fit = Math.min(640 / logo.width, 220 / logo.height);
    const height = logo.height * fit;
    col.piece(height, (y) => drawFitted(ctx, logo, col.middle - 320, y, 640, height));
    col.gap(64);
  }
  col.text(fullName(details), `700 76px ${FONT}`, INK, 88);
  const role = [details.title, details.first || details.last ? details.org : ""]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
  if (role) col.text(role, `400 42px ${FONT}`, SOFT, 56);
  col.gap(56);
  col.piece(code.width, (y) => ctx.drawImage(code, col.middle - code.width / 2, y));
  col.gap(12);
  col.text("Scan to save my contact", `600 38px ${FONT}`, SOFT, 50);
  const contact = [
    details.phone,
    details.email,
    details.website.replace(/^https?:\/\//i, "").replace(/\/$/, ""),
  ]
    .map((s) => s.trim())
    .filter(Boolean);
  if (contact.length) col.gap(40);
  for (const line of contact) col.text(line, `400 40px ${FONT}`, INK, 58);
  col.draw();
  return canvas;
}

const files = downloads();

function problem(title, message) {
  freeot.hidden = true;
  notMade(results, title, message);
}

async function make() {
  const data = new FormData(form);
  const details = Object.fromEntries(
    ["first", "last", "org", "title", "phone", "email", "website"].map((key) => [
      key,
      String(data.get(key) ?? ""),
    ]),
  );

  let text;
  let logo;
  try {
    text = contactCard(details);
    logo = await readLogo(logoInput.files[0]);
  } catch (error) {
    if (error instanceof ContactError || error instanceof LogoError)
      return problem("Check your details", error.message);
    throw error;
  }

  const inCode = Boolean(logo && logoInCode.checked);
  const code = makeCode(text, inCode ? "H" : "M");
  const box = inCode ? logoBox(code, LOGO_SHARE) : null;
  const canvas = codeCanvas(
    code,
    box,
    logo,
    Math.max(4, Math.ceil(CODE_PIXELS / (code.size + BORDER * 2))),
  );

  let passed;
  try {
    passed = scansBack(canvas, text);
  } catch {
    return problem(
      "This logo couldn't be checked",
      "Your browser wouldn't let the page test-scan a code with this logo in it. Try the logo as a PNG file, or leave it out of the code.",
    );
  }
  if (!passed) {
    return problem(
      "This code didn't pass the test-scan",
      inCode
        ? "With your logo in the middle, the code didn't scan back as your contact, so it isn't offered. Untick \"Also put it in the middle of the code\" and make it again; your logo still goes on the card picture."
        : "The code didn't scan back as your contact, so it isn't offered. Try shortening the longest details, then make it again.",
    );
  }

  files.clear();
  const name = fileName(details);
  const svg = toSVG(code, { box, logo: inCode ? logo : null });
  const onCard = codeCanvas(code, box, logo, scaleFor(code, CARD_CODE));
  const card = await cardPicture(details, onCard, logo);
  const cardURL = files.url(await pngOf(card));

  freeot.hidden = false;
  show(
    results,
    h(
      "div",
      { class: "result-head" },
      h(
        "div",
        {},
        h("span", { class: "badge badge-passed" }, "Passed the test-scan"),
        h("h2", { class: "fo-h2" }, "Your code is ready"),
        h(
          "p",
          { class: "hint" },
          "We scanned it back, and it holds exactly the contact you typed.",
        ),
      ),
    ),
    h(
      "div",
      { class: "made" },
      h(
        "figure",
        { class: "made-picture" },
        h("img", {
          src: cardURL,
          alt: `Card picture for ${fullName(details)}, with the code to scan`,
          width: CARD.width,
          height: CARD.height,
        }),
        h("p", {}, "Try it: point your phone's camera at the code."),
      ),
      h(
        "div",
        { class: "downloads" },
        h("h3", { class: "fo-h3" }, "Download"),
        download("Card picture (PNG)", cardURL, `${name}-card.png`),
        download(
          "Code for print (SVG)",
          files.url(new Blob([svg], { type: "image/svg+xml" })),
          `${name}-contact-code.svg`,
        ),
        download(
          "Code as a picture (PNG)",
          files.url(await pngOf(canvas)),
          `${name}-contact-code.png`,
        ),
        download(
          "Contact file (.vcf)",
          files.url(new Blob([`${text}\r\n`], { type: "text/vcard" })),
          `${name}.vcf`,
        ),
        h(
          "p",
          { class: "hint" },
          h("a", { class: "fo-link", href: "#means-files" }, "Which file to use"),
        ),
      ),
    ),
  );
}

logoPicker({
  input: logoInput,
  chosen: document.getElementById("logo-chosen"),
  remove: document.getElementById("logo-remove"),
  inCode: logoInCode,
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  make().catch(() =>
    problem(
      "Something went wrong",
      "The page couldn't make your code this time. Reload the page and try again.",
    ),
  );
});
