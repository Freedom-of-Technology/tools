// Runs the Worker as Cloudflare does: Wrangler starts Cloudflare's own runtime with wrangler.toml,
// src/worker.js and the files in public/. Each address gets its own copy, since the runtime takes
// the address a request came in on from how it's started.
//
//   node --test

import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { unstable_startWorker } from 'wrangler';

const CONFIG = fileURLToPath(new URL('../wrangler.toml', import.meta.url));
const HOSTS = ['freedomoftechnology.com', 'www.freedomoftechnology.com', 'check.freeot.com'];
const workers = {};

// A Worker that can't start fails every test here, and the runtime prints its reason (logLevel).
// Its runtime may then keep the run from ending: GitHub's check has a time limit, so it still fails.
before(async () => {
  await Promise.all(HOSTS.map(async (hostname) => {
    const worker = await unstable_startWorker({
      config: CONFIG,
      dev: {
        server: { port: 0 },
        inspector: false,
        logLevel: 'error',
        // Each copy keeps nothing on disk. Sharing Wrangler's storage folder, copies starting
        // together can find its database locked, and one crashes.
        persist: false,
        origin: { hostname, secure: true },
      },
    });
    workers[hostname] = worker;
  }));
});
after(() => Promise.all(Object.values(workers).map((w) => w.dispose())));

// Visits `path` on `hostname`, without following a redirect.
const visit = (hostname, path) => workers[hostname].fetch(`https://${hostname}${path}`, { redirect: 'manual' });

for (const [from, to] of [
  ['/', 'https://freedomoftechnology.com/tools/domain-check/'],
  ['/?from=flyer', 'https://freedomoftechnology.com/tools/domain-check/?from=flyer'],
  ['/app.js', 'https://freedomoftechnology.com/tools/domain-check/app.js'],
]) {
  test(`a link to check.freeot.com shared before the move lands on Almanac Check's page on the main site, for good: ${from}`, async () => {
    const response = await visit('check.freeot.com', from);
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('Location'), to);
  });
}

test('a www link to a tool lands on the same page without www, so search counts one address', async () => {
  const response = await visit('www.freedomoftechnology.com', '/tools/domain-check/?from=card');
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('Location'), 'https://freedomoftechnology.com/tools/domain-check/?from=card');
});

test('Almanac Check opens at its address on the main site, with or without the slash at the end', async () => {
  const page = await visit('freedomoftechnology.com', '/tools/domain-check/');
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<h1 class="fo-h1">Check your domain's DNS records<\/h1>/);

  const noSlash = await visit('freedomoftechnology.com', '/tools/domain-check');
  assert.equal(noSlash.status, 307);
  assert.equal(noSlash.headers.get('Location'), '/tools/domain-check/');
});

test('a mistyped tool address gets a page saying so, with a way to the tools, not a blank error', async () => {
  const response = await visit('freedomoftechnology.com', '/tools/domian-check/');
  assert.equal(response.status, 404);
  assert.match(await response.text(), /There's no page here[\s\S]*href="\/tools\/"/);
});

test('a tool page reaches the visitor as it is on GitHub, with no Cloudflare analytics script added, while its scripts stay compressed', async () => {
  for (const path of ['/tools/', '/tools/contact-card/', '/tools/domian-check/']) {
    const page = await visit('freedomoftechnology.com', path);
    assert.match(page.headers.get('Cache-Control') ?? '', /(^|, )no-transform$/, path);
  }
  const script = await visit('freedomoftechnology.com', '/tools/shared/qr/vendor/jsQR-1.4.0.js');
  assert.equal(script.status, 200);
  assert.doesNotMatch(script.headers.get('Cache-Control') ?? '', /no-transform/);
});

test("a tool page can't be shown inside another site, and doesn't tell the sites it links to where the visitor came from", async () => {
  const response = await visit('freedomoftechnology.com', '/tools/domain-check/');
  assert.equal(response.headers.get('Content-Security-Policy'), "frame-ancestors 'none'");
  assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(response.headers.get('Permissions-Policy'), 'camera=(), microphone=(), geolocation=()');
});
