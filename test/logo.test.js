// Runs the logo rules every tool that takes a logo follows (public/tools/shared/logo/rules.js): which
// files it takes, and when it makes a smaller copy. The copy itself is drawn in the browser.
//
//   node --test

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LogoError, checkFile, copySize } from '../public/tools/shared/logo/rules.js';

const MB = 1024 * 1024;

for (const [name, logo, expected] of [
  ['a large photo-sized logo is copied down to 1,200 pixels on its longest side, keeping its shape',
    { width: 4000, height: 2000, vector: false, bytes: 6 * MB }, { width: 1200, height: 600 }],
  ['a tall logo is copied down by its height',
    { width: 900, height: 3000, vector: false, bytes: 2 * MB }, { width: 360, height: 1200 }],
  ['a logo already small enough is used as it is, never enlarged',
    { width: 800, height: 300, vector: false, bytes: 90_000 }, null],
  ['an SVG logo stays as drawn, sharp at any size',
    { width: 300, height: 150, vector: true, bytes: 40_000 }, null],
  ['an SVG so large it must hold a photo is copied like a picture',
    { width: 300, height: 150, vector: true, bytes: 3 * MB }, { width: 1200, height: 600 }],
]) {
  test(`${name}, so the files people download stay small enough to email or print`, () => {
    assert.deepEqual(copySize(logo), expected);
  });
}

for (const [name, check, reason] of [
  ['a file that isn\'t a picture', () => checkFile({ type: 'application/pdf', size: MB }), /isn't a picture this page can use/],
  ['a file over 25 MB', () => checkFile({ type: 'image/png', size: 26 * MB }), /over 25 MB/],
  ['a picture over 50 million pixels', () => copySize({ width: 10_000, height: 6_000, vector: false, bytes: 20 * MB }), /too large for this page to open/],
]) {
  test(`${name} is refused with the reason, rather than stalling or crashing a phone`, () => {
    assert.throws(check, (e) => e instanceof LogoError && reason.test(e.message));
  });
}
