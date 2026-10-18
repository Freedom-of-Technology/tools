// Runs the contact card maker's own code (public/tools/contact-card/card/ and the QR code in
// public/tools/shared/qr/) on made-up contacts. The test-scan is the page's own: jsQR, loaded from
// the same vendored file the page loads.
//
//   node --test

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ContactError, contactCard, fileName } from "../public/tools/contact-card/card/vcard.js";
import {
  BORDER,
  logoBox,
  makeCode,
  readsBack,
  toPixels,
  toSVG,
} from "../public/tools/shared/qr/qr.js";

// The page loads jsQR as a classic script, which sets globalThis.jsQR; this runs the same file
// the same way.
new Function(
  readFileSync(new URL("../public/tools/shared/qr/vendor/jsQR-1.4.0.js", import.meta.url), "utf8"),
).call(globalThis);

const SCALE = 6;

// Paints the logo's square solid black: the hardest logo for a scanner, since a real logo has
// some light in it. The page draws the visitor's real logo there instead.
function coverBox(picture, box, share = 1) {
  const from = Math.round((box.x + BORDER + (box.size * (1 - share)) / 2) * SCALE);
  const to = Math.round((box.x + BORDER + box.size - (box.size * (1 - share)) / 2) * SCALE);
  for (let y = from; y < to; y++) {
    for (let x = from; x < to; x++) {
      const i = (y * picture.width + x) * 4;
      picture.rgba[i] = picture.rgba[i + 1] = picture.rgba[i + 2] = 0;
    }
  }
  return picture;
}

const scans = (text, code, box = null, cover = 0) => {
  const picture = toPixels(code, SCALE, box);
  if (box && cover) coverBox(picture, box, cover);
  return readsBack(picture.rgba, picture.width, picture.height, text);
};

const CONTACTS = {
  "a plain contact": {
    first: "Rosa",
    last: "Delgado",
    org: "Maple Street Bakery",
    title: "Owner",
    phone: "+1 (412) 555-0147",
    email: "rosa@maple-street-bakery.com",
    website: "maple-street-bakery.com",
  },
  "accents and another alphabet": {
    first: "José",
    last: "Núñez-Zoë",
    org: "Café Ørsted · 東京",
    title: "Gérant",
    phone: "+33 1 55 50 01 47",
    email: "jose@cafe-orsted.fr",
    website: "https://cafe-orsted.fr",
  },
  "commas, semicolons and backslashes": {
    first: "Pat",
    last: "O'Hara",
    org: "Smith, Jones; & Co \\ Partners",
    title: "Partner, Tax; Audit",
    phone: "412-555-0199",
    email: "pat@smith-jones-co.com",
    website: "smith-jones-co.com/team?id=7&x=1",
  },
  "a business name only": { org: "Lantern Hill Dental" },
};

for (const [name, details] of Object.entries(CONTACTS)) {
  test(`a code made from ${name} scans back as exactly that contact, so the phone saves what was typed`, () => {
    const text = contactCard(details);
    assert.ok(scans(text, makeCode(text, "M")));
  });
}

test("a code whose middle is covered past what it can lose fails the test-scan, so it is never offered", () => {
  const text = contactCard(CONTACTS["a plain contact"]);
  const code = makeCode(text, "H");
  const box = logoBox(code, 0.2);
  assert.ok(
    scans(text, code, box, 1),
    "the same code scans with its logo the size the page makes it",
  );
  assert.equal(scans(text, code, logoBox(code, 0.45), 1), false);
});

test("a picture of a different contact fails the test-scan, so a code is offered only when it holds the contact typed", () => {
  const text = contactCard(CONTACTS["a plain contact"]);
  const other = contactCard({ ...CONTACTS["a plain contact"], phone: "+1 (412) 555-0148" });
  const picture = toPixels(makeCode(other, "M"), SCALE);
  assert.equal(readsBack(picture.rgba, picture.width, picture.height, text), false);
});

test("a comma or semicolon in a business name or title stays part of it on the phone, not the start of another field", () => {
  const text = contactCard(CONTACTS["commas, semicolons and backslashes"]);
  const lines = text.split("\r\n");
  assert.ok(lines.includes("ORG:Smith\\, Jones\\; & Co \\\\ Partners"));
  assert.ok(lines.includes("TITLE:Partner\\, Tax\\; Audit"));
});

test("a web address typed without https gets it, and is otherwise kept as typed, so the phone opens the right page", () => {
  assert.ok(
    contactCard(CONTACTS["a plain contact"])
      .split("\r\n")
      .includes("URL:https://maple-street-bakery.com"),
  );
  const typed = contactCard(CONTACTS["commas, semicolons and backslashes"]).split("\r\n");
  assert.ok(typed.includes("URL:https://smith-jones-co.com/team?id=7&x=1"));
});

test("a business name alone is the name the phone shows", () => {
  const lines = contactCard(CONTACTS["a business name only"]).split("\r\n");
  assert.ok(lines.includes("FN:Lantern Hill Dental"));
});

for (const [name, details, reason] of [
  ["no name and no business name", { phone: "412-555-0147" }, /Add a name or a business name/],
  [
    "an email address with no domain",
    { first: "Rosa", email: "rosa@" },
    /email address doesn't look complete/,
  ],
]) {
  test(`a contact with ${name} is refused with the reason, rather than making a code a phone can't save`, () => {
    assert.throws(
      () => contactCard(details),
      (e) => e instanceof ContactError && reason.test(e.message),
    );
  });
}

test("downloaded files are named for the contact in plain letters, accents dropped", () => {
  assert.equal(fileName(CONTACTS["accents and another alphabet"]), "jose-nunez-zoe");
  assert.equal(fileName({ org: "東京" }), "contact");
});

test("the SVG file stands alone, with the logo inside it rather than linked, so it still works when sent to a printer", () => {
  const text = contactCard(CONTACTS["a plain contact"]);
  const code = makeCode(text, "H");
  const box = logoBox(code, 0.2);
  const logo = { href: "data:image/png;base64,TUFQTEU=", width: 200, height: 100 };
  const svg = toSVG(code, { box, logo });
  assert.match(svg, /<image href="data:image\/png;base64,TUFQTEU="/);
  assert.doesNotMatch(svg, /href="(?!data:)/);
});
