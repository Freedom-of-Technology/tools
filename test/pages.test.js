// Reads every page in public/ as Cloudflare serves it, and follows the addresses each one loads or
// links to on the same site.
//
//   node --test

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { fingerprinted } from "../scripts/fingerprints.mjs";

const PUBLIC = fileURLToPath(new URL("../public/", import.meta.url));

function files(dir, ending) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path, ending);
    return path.endsWith(ending) ? [path] : [];
  });
}

// The file Cloudflare serves for an address on the site (wrangler.toml, html_handling).
function fileFor(address, page) {
  const path = address.split(/[?#]/)[0];
  const full = path.startsWith("/") ? join(PUBLIC, path) : join(dirname(page), path);
  return path.endsWith("/") ? join(full, "index.html") : full;
}

test("every style, script, picture and link a tool page uses on this site is there, so no visitor gets a broken page", () => {
  const broken = [];
  for (const page of files(PUBLIC, ".html")) {
    const html = readFileSync(page, "utf8");
    for (const [, address] of html.matchAll(/(?:href|src|srcset)="([^"]+)"/g)) {
      if (/^[a-z]+:/.test(address) || address.startsWith("#")) continue;
      if (!existsSync(fileFor(address, page))) broken.push(`${relative(PUBLIC, page)}: ${address}`);
    }
  }
  assert.deepEqual(broken, []);
});

test('every link to a part of another page on this site lands on that part, so "Domains" opens at Domains', () => {
  const broken = [];
  for (const page of files(PUBLIC, ".html")) {
    const html = readFileSync(page, "utf8");
    for (const [, address, id] of html.matchAll(/href="(\/[^"#]*)#([^"]+)"/g)) {
      const target = readFileSync(fileFor(address, page), "utf8");
      if (!target.includes(` id="${id}"`))
        broken.push(`${relative(PUBLIC, page)}: ${address}#${id}`);
    }
  }
  assert.deepEqual(broken, []);
});

test("every page has the same tools menu, listing every tool, and /tools lists the same tools, so no tool is missing where a visitor looks for it", () => {
  const menu = (html) =>
    html
      .match(/<details class="menu">[\s\S]*?<\/details>/)?.[0]
      .replace(/ aria-current="page"/g, "");
  const pages = files(PUBLIC, ".html");
  const index = readFileSync(join(PUBLIC, "tools/index.html"), "utf8");
  const expected = menu(index);
  assert.ok(expected, "found the menu on /tools");

  const different = pages.filter((page) => menu(readFileSync(page, "utf8")) !== expected);
  assert.deepEqual(
    different.map((page) => relative(PUBLIC, page)),
    [],
  );

  const links = (html) =>
    [...html.matchAll(/href="(\/tools\/[a-z-]+\/)"/g)].map((m) => m[1]).sort();
  const tools = readdirSync(join(PUBLIC, "tools"))
    .filter((name) => name !== "shared" && existsSync(join(PUBLIC, "tools", name, "index.html")))
    .map((name) => `/tools/${name}/`)
    .sort();
  assert.deepEqual(links(expected), tools);
  assert.deepEqual(links(index.match(/<main>[\s\S]*<\/main>/)[0]), tools);
});

test("every page carries an up-to-date fingerprint of each file it runs, so a changed file never leaves a page refusing its own scripts", () => {
  const stale = files(PUBLIC, ".html").filter((page) => {
    const html = readFileSync(page, "utf8");
    return fingerprinted(html) !== html;
  });
  assert.deepEqual(
    stale.map((page) => relative(PUBLIC, page)),
    [],
    "run npm run fingerprints",
  );
  const card = readFileSync(join(PUBLIC, "tools/contact-card/index.html"), "utf8");
  assert.match(card, /"\/tools\/shared\/qr\/qr\.js": "sha384-/, "found the import map");
});

test("every page tells the browser it handles light and dark itself, so phones that darken websites leave its colors alone", () => {
  const pages = files(PUBLIC, ".html");
  const missing = pages.filter(
    (page) => !/<meta name="color-scheme" content="light dark">/.test(readFileSync(page, "utf8")),
  );
  assert.ok(pages.length > 3, "found the pages");
  assert.deepEqual(
    missing.map((page) => relative(PUBLIC, page)),
    [],
  );
});

// Each tool, and one link its results make, to show the links were found at all.
for (const [tool, sample] of [
  ["domain-check", "means-different"],
  ["email-check", "means-dmarc"],
]) {
  test(`every "What this means" link on ${tool}'s results goes to its explanation on the page`, () => {
    const html = readFileSync(join(PUBLIC, `tools/${tool}/index.html`), "utf8");
    const app = readFileSync(join(PUBLIC, `tools/${tool}/app.js`), "utf8");
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    const targets = [
      ...[...app.matchAll(/["']#?((?:means|what)-[a-z-]+)["']/g)].map((m) => m[1]),
      ...[...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]),
    ];
    assert.ok(targets.includes(sample), "found the links in app.js");
    assert.deepEqual(
      targets.filter((id) => !ids.has(id)),
      [],
    );
  });
}
