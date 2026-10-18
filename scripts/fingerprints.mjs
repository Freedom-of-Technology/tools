// Writes a fingerprint (an SRI hash) of every script and style a page loads into the page itself,
// so a visitor who compares the page's source with GitHub has checked everything it runs: the
// browser refuses any file that doesn't match its fingerprint.
//
// - A <script src> or stylesheet <link> gets an integrity attribute.
// - Files a script imports are listed in an import map's "integrity" list, placed before the first
//   script. The browser checks each import against it.
// - The import map is written into the page, and each page's Content-Security-Policy allows only
//   scripts from the site, so the policy names the import map's own fingerprint (a sha256 source).
//
// The site serves public/ as it is, with no build step; this only rewrites the HTML files, and a test
// (test/pages.test.js) fails when any fingerprint is out of date.
//
//   npm run fingerprints     rewrite every page in public/

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const PUBLIC = fileURLToPath(new URL("../public/", import.meta.url));

const fileOf = (address) => join(PUBLIC, address.replace(/^\//, ""));
const addressOf = (file) => "/" + relative(PUBLIC, file).split(sep).join("/");
const sri = (bytes) => "sha384-" + createHash("sha384").update(bytes).digest("base64");

// Every module a script imports, and what those import, as site addresses.
function imports(address, seen = new Set()) {
  const file = fileOf(address);
  const code = readFileSync(file, "utf8");
  for (const [, from, bare] of code.matchAll(
    /\bfrom\s+['"]([^'"]+)['"]|^\s*import\s+['"]([^'"]+)['"]/gm,
  )) {
    const target = addressOf(join(dirname(file), from ?? bare));
    if (seen.has(target)) continue;
    seen.add(target);
    imports(target, seen);
  }
  return seen;
}

function withIntegrity(tag, address) {
  const plain = tag.replace(/\s+integrity="[^"]*"/, "");
  return plain.replace(
    /(\s(?:src|href)="[^"]+")/,
    `$1 integrity="${sri(readFileSync(fileOf(address)))}"`,
  );
}

// The page as it should be, fingerprints included. Running it on an up-to-date page changes nothing.
export function fingerprinted(html) {
  let page = html.replace(/\n  <script type="importmap">[\s\S]*?<\/script>/, "");

  page = page.replace(/<script\b[^>]*\ssrc="(\/[^"]+)"[^>]*>/g, (tag, address) =>
    withIntegrity(tag, address),
  );
  page = page.replace(/<link\b[^>]*\srel="stylesheet"[^>]*>/g, (tag) => {
    const address = tag.match(/\shref="(\/[^"]+)"/)?.[1];
    return address ? withIntegrity(tag, address) : tag;
  });

  const modules = [...page.matchAll(/<script type="module"[^>]*\ssrc="(\/[^"]+)"/g)].map(
    (m) => m[1],
  );
  const imported = new Set(modules.flatMap((address) => [...imports(address)]));
  page = page.replace(/ 'sha256-[^']+'/g, "");
  if (imported.size === 0) return page;

  const integrity = Object.fromEntries(
    [...imported].sort().map((address) => [address, sri(readFileSync(fileOf(address)))]),
  );
  const map = `\n${JSON.stringify({ integrity }, null, 2)}\n  `;
  const hash = createHash("sha256").update(map).digest("base64");
  page = page.replace(/(script-src 'self')/, `$1 'sha256-${hash}'`);
  return page.replace(/\n  <script\b/, `\n  <script type="importmap">${map}</script>$&`);
}

export function pages(dir = PUBLIC) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return pages(path);
    return path.endsWith(".html") ? [path] : [];
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const page of pages()) {
    const html = readFileSync(page, "utf8");
    const updated = fingerprinted(html);
    if (updated !== html) {
      writeFileSync(page, updated);
      console.log(`updated ${relative(PUBLIC, page)}`);
    }
  }
}
