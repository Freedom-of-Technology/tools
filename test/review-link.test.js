// Runs the review link maker's own check (public/tools/review-link/card/link.js) on made-up
// review links. Making and test-scanning the code is the same code the contact card maker uses, and
// is tested there (contact-card.test.js).
//
//   node --test

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ReviewLinkError, reviewDetails } from '../public/tools/review-link/card/link.js';

const BUSINESS = 'Delgado Tile';

for (const [name, pasted, expected] of [
  ['a short review link', 'https://g.page/r/CdQx7Rm2pLkEEBM/review', 'https://g.page/r/CdQx7Rm2pLkEEBM/review'],
  ['a link pasted with spaces around it', '  https://g.page/r/CdQx7Rm2pLkEEBM/review \n', 'https://g.page/r/CdQx7Rm2pLkEEBM/review'],
  ['a link pasted without https', 'g.page/r/CdQx7Rm2pLkEEBM/review', 'https://g.page/r/CdQx7Rm2pLkEEBM/review'],
  ['a link typed with http', 'http://g.page/r/CdQx7Rm2pLkEEBM/review', 'https://g.page/r/CdQx7Rm2pLkEEBM/review'],
  ['a write-a-review link', 'https://search.google.com/local/writereview?placeid=ChIJd8BlQ2BZwokRAFUEcm_qrcA', 'https://search.google.com/local/writereview?placeid=ChIJd8BlQ2BZwokRAFUEcm_qrcA'],
  ['a link from a country\'s Google', 'https://www.google.co.uk/maps/place/Delgado+Tile', 'https://www.google.co.uk/maps/place/Delgado+Tile'],
  ['a Maps short link', 'https://maps.app.goo.gl/Xq3vLm8RtP2kYd7a9', 'https://maps.app.goo.gl/Xq3vLm8RtP2kYd7a9'],
]) {
  test(`${name} goes in the code as Google gave it, so the card opens the owner's own review box`, () => {
    assert.equal(reviewDetails({ business: BUSINESS, link: pasted }).link, expected);
  });
}

for (const [name, details, reason] of [
  ['an empty link box', { business: BUSINESS, link: '  ' }, /Paste the review link/],
  ['a link to another site', { business: BUSINESS, link: 'https://reviews.example.test/delgado-tile' }, /isn't a link from Google/],
  ['a site named to look like Google\'s short link', { business: BUSINESS, link: 'https://g.page.example-reviews.test/r/CdQx7Rm2pLkEEBM/review' }, /isn't a link from Google/],
  ['a site named to look like google.com', { business: BUSINESS, link: 'https://google.com.example.test/maps' }, /isn't a link from Google/],
  ['a site whose name ends in google.com', { business: BUSINESS, link: 'https://delgadotile-google.com/review' }, /isn't a link from Google/],
  ['a link that only names Google before an @', { business: BUSINESS, link: 'https://g.page@reviews.example.test/r/CdQx7Rm2pLkEEBM' }, /isn't a link from Google/],
  ['a script dressed as a link', { business: BUSINESS, link: 'javascript://g.page/%0Aalert(1)' }, /isn't a link from Google/],
]) {
  test(`${name} is refused with the reason, so a counter code never sends customers anywhere but Google`, () => {
    assert.throws(() => reviewDetails(details), (e) => e instanceof ReviewLinkError && reason.test(e.message));
  });
}

test('a counter card with no business name is refused with the reason, rather than printing a card that says nothing of who asks', () => {
  assert.throws(
    () => reviewDetails({ business: ' ', link: 'https://g.page/r/CdQx7Rm2pLkEEBM/review' }),
    (e) => e instanceof ReviewLinkError && /Add your business name/.test(e.message),
  );
});
