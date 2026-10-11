// Reads every page in public/ as Cloudflare serves it, and follows the addresses each one loads or
// links to on the same site.
//
//   node --test

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));

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
  const full = path.startsWith('/') ? join(PUBLIC, path) : join(dirname(page), path);
  return path.endsWith('/') ? join(full, 'index.html') : full;
}

test('every style, script, picture and link a tool page uses on this site is there, so no visitor gets a broken page', () => {
  const broken = [];
  for (const page of files(PUBLIC, '.html')) {
    const html = readFileSync(page, 'utf8');
    for (const [, address] of html.matchAll(/(?:href|src|srcset)="([^"]+)"/g)) {
      if (/^[a-z]+:/.test(address) || address.startsWith('#')) continue;
      if (!existsSync(fileFor(address, page))) broken.push(`${relative(PUBLIC, page)}: ${address}`);
    }
  }
  assert.deepEqual(broken, []);
});

test("every \"What this means\" link on Almanac Check's results goes to its explanation on the page", () => {
  const html = readFileSync(join(PUBLIC, 'tools/domain-check/index.html'), 'utf8');
  const app = readFileSync(join(PUBLIC, 'tools/domain-check/app.js'), 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const targets = [
    ...[...app.matchAll(/'#?((?:means|what)-[a-z-]+)'/g)].map((m) => m[1]),
    ...[...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]),
  ];
  assert.ok(targets.includes('means-different') && targets.includes('what-results-mean'), 'found the links in app.js');
  assert.deepEqual(targets.filter((id) => !ids.has(id)), []);
});
