// Runs Are my details right everywhere?'s own code (public/tools/listing-check/check/listings.js) on
// made-up businesses, through what the page calls: details() and summary(). The wording is content:
// the tests use listings and marks by id, never their words.
//
//   node --test

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  details,
  LISTINGS,
  ListingError,
  MARKS,
  summary,
} from "../public/tools/listing-check/check/listings.js";

const tricky = details({
  name: 'Smith & Sons #1 "Best" Plumbing?',
  town: "Walla Walla, WA 99362",
  website: "smithandsons.example/contact?a=1&b=2#top",
});
const plain = details({ name: "Plain Bakery", town: "Dayton", website: "plain.example" });

const linksOf = (d) =>
  LISTINGS.flatMap((listing) => listing.lookUps(d).map((link) => ({ id: listing.id, ...link })));
// Everything a site reads from a link's address: its search terms and the part after "#".
const searched = (href) => {
  const url = new URL(href);
  return [...url.searchParams.values(), decodeURIComponent(url.hash.slice(1))].join(" ");
};

test("every look-up that searches finds the whole business name and town, even with & # ? or quotes in the name, so the owner never lands on a search for half their name", () => {
  const searches = linksOf(tricky).filter(
    ({ id, href }) => id !== "website" && new URL(href).search,
  );
  // A site search puts the name in quotes of its own, so quotes are set aside on both sides.
  const unquoted = (text) => text.replace(/"/g, "");
  assert.ok(searches.length >= 8, "found the searches");
  assert.deepEqual(
    searches
      .filter(
        ({ href }) =>
          !unquoted(searched(href)).includes(unquoted(tricky.name)) ||
          !searched(href).includes(tricky.town),
      )
      .map(({ id }) => id),
    [],
  );
});

test("the website check opens schema.org's checker on the owner's whole web address, so it reads their page and not part of it", () => {
  const check = linksOf(tricky).filter(
    ({ id, href }) => id === "website" && new URL(href).hostname === "validator.schema.org",
  );
  assert.equal(check.length, 1);
  assert.equal(
    new URLSearchParams(new URL(check[0].href).hash.slice(1)).get("url"),
    "https://smithandsons.example/contact?a=1&b=2#top",
  );
});

const withSite = (website) => details({ name: "Plain Bakery", town: "Dayton", website }).website;

for (const [typed, want] of [
  ["yourbusiness.com", "https://yourbusiness.com/"],
  ["  http://yourbusiness.com/contact ", "http://yourbusiness.com/contact"],
  ["", ""],
]) {
  test(`the web address "${typed}" is taken as ${want || "none"}`, () => {
    assert.equal(withSite(typed), want);
  });
}

// A javascript: link with a website's name in it gets past the dot rule, so it's what the http/https
// rule is for.
for (const typed of ["javascript://yourbusiness.com/%0Aalert(1)", "localhost", "your business"]) {
  test(`"${typed}" is refused as a web address, with the reason, so the website link never runs or opens something that isn't a website`, () => {
    assert.throws(
      () => withSite(typed),
      (error) => error instanceof ListingError && /web ?site|web address/i.test(error.message),
    );
  });
}

for (const [missing, typed] of [
  ["name", { town: "Dayton" }],
  ["town", { name: "Plain Bakery" }],
]) {
  test(`a list without a ${missing} is refused, naming it, since every search needs it`, () => {
    assert.throws(
      () => details(typed),
      (error) => error instanceof ListingError && error.message.toLowerCase().includes(missing),
    );
  });
}

test("the summary lists every place exactly once, grouped by what the owner marked it, with where to fix each one wrong or not there, and the unmarked ones together", () => {
  const marks = Object.fromEntries(
    LISTINGS.slice(0, MARKS.length * 2).map(({ id }, i) => [id, MARKS[i % MARKS.length].id]),
  );
  const text = summary(plain, marks, new Date(2026, 9, 17));
  const lines = text.split("\n");
  const linesOf = (listing) =>
    lines.filter((line) => line === `- ${listing.name}` || line.startsWith(`- ${listing.name}:`));
  const blocks = text.split("\n\n").map((block) => block.split("\n"));
  const blockOf = (listing) => blocks.findIndex((block) => block.includes(linesOf(listing)[0]));
  // Wrong and Not there are both to fix, so they share a part of the summary.
  const part = (listing) =>
    ({ wrong: "fix", missing: "fix" })[marks[listing.id]] ?? marks[listing.id] ?? "unmarked";

  assert.deepEqual(
    LISTINGS.filter((listing) => linesOf(listing).length !== 1).map(({ id }) => id),
    [],
  );
  // Each part's listings sit in one block, and no two parts share one.
  const blocksByPart = {};
  for (const listing of LISTINGS) {
    blocksByPart[part(listing)] ??= new Set();
    blocksByPart[part(listing)].add(blockOf(listing));
  }
  const used = Object.values(blocksByPart);
  assert.deepEqual(used.filter((set) => set.size !== 1).length, 0);
  assert.equal(new Set(used.map((set) => [...set][0])).size, used.length);

  const where = (listing) => listing.fix?.href ?? listing.fixWith;
  assert.deepEqual(
    LISTINGS.filter(
      (listing) => linesOf(listing)[0].includes(where(listing)) !== (part(listing) === "fix"),
    ).map(({ id }) => id),
    [],
  );
});
