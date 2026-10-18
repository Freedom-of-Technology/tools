// Runs Before you sign an SEO contract's own code (public/tools/seo-proposal-check/check/proposal.js)
// through what the page calls: flagged() and questions(). The wording is content: the tests use red
// flags by id, never their words.
//
//   node --test

import assert from "node:assert/strict";
import { test } from "node:test";
import { FLAGS, GROUPS, questions } from "../public/tools/seo-proposal-check/check/proposal.js";
import { linkPieces } from "../public/tools/shared/ask.js";

test("the questions to send hold one for each red flag ticked, in the page's order, then the ones for any agency, and none for a flag not ticked", () => {
  const asked = (ticked) =>
    questions(ticked)
      .split("\n")
      .filter((line) => line.startsWith("- "))
      .map((line) => line.slice(2));
  const forAny = asked([]);
  assert.ok(forAny.length > 0, "some questions are for any agency");
  assert.deepEqual(asked([FLAGS[5].id, "not-a-flag", FLAGS[1].id]), [
    FLAGS[1].ask,
    FLAGS[5].ask,
    ...forAny,
  ]);
});

test("every red flag sits in a group the page shows, and every link in its reason is drawn as a link, so none is left off the form or shows as raw brackets", () => {
  const groups = GROUPS.map((group) => group.id);
  assert.deepEqual(
    FLAGS.filter((flag) => !groups.includes(flag.group)).map((flag) => flag.id),
    [],
  );
  const unlinked = FLAGS.filter((flag) =>
    linkPieces(flag.why).some((piece) => !piece.href && /\]\(/.test(piece.text)),
  );
  assert.deepEqual(
    unlinked.map((flag) => flag.id),
    [],
  );
});
