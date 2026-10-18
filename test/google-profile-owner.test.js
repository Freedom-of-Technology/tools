// Runs Who owns your Google profile?'s own code (public/tools/google-profile-owner/check/profile.js)
// on made-up answers. The wording is content: the tests use results and questions by id, never their
// words.
//
//   node --test

import assert from "node:assert/strict";
import { test } from "node:test";

import { linkPieces } from "../public/tools/shared/ask.js";
import {
  QUESTIONS,
  asked,
  fromHash,
  result,
  toHash,
  unanswered,
} from "../public/tools/google-profile-owner/check/profile.js";

const answersTo = (id) => QUESTIONS.find((q) => q.id === id).answers.map((a) => a.id);

// Every combination of what the owner can see, each with every holder where the owner is asked who.
const combos = answersTo("access").flatMap((access) =>
  answersTo("role").flatMap((role) =>
    answersTo("others").map((others) => ({ access, role, others })),
  ),
);

test("every combination of answers leads to the result for that situation, so a manager or owner is never told the profile is safe, and each is asked to send the right message", () => {
  const expected = ({ access, role, others }) => {
    if (access === "unsure") return ["check", null];
    if (access === "no") return ["ask", "add-owner"];
    if (role === "manager") return ["owner", "add-owner"];
    if (role === "owner") return ["primary", "make-primary"];
    return others === "yes" ? ["remove", null] : ["safe", null];
  };
  const differences = combos.flatMap((answers) => {
    const { id, askFor } = result(answers);
    const want = expected(answers);
    return id === want[0] && askFor === want[1]
      ? []
      : [`${JSON.stringify(answers)}: got ${id}/${askFor}, want ${want.join("/")}`];
  });
  assert.deepEqual(differences, []);
});

test("who holds the profile is asked only when someone else holds it, so a primary owner isn't asked who to write to", () => {
  const withHolder = combos
    .filter((answers) => asked(answers).includes("holder"))
    .map(({ access, role }) => (access === "yes" ? `yes/${role}` : access));
  assert.deepEqual([...new Set(withHolder)].sort(), ["no", "yes/manager", "yes/owner"]);
});

test("a question the owner skipped is named, rather than read as an answer, and who holds the profile is never required", () => {
  assert.deepEqual(unanswered({}), ["access"]);
  assert.deepEqual(unanswered({ access: "yes" }), ["role", "others"]);
  assert.deepEqual(unanswered({ access: "yes", role: "owner", others: "no" }), []);
  assert.deepEqual(unanswered({ access: "no" }), []);
  assert.deepEqual(unanswered({ access: "yes", role: "boss", others: "no" }), ["role"]);
});

test("every result says what to do, and links only to secure pages, so no result shows an empty list or stray markup", () => {
  const gaps = [];
  for (const answers of combos) {
    const { id, title, hint, steps, ask } = result(answers);
    if (!title?.trim() || !hint?.trim() || !steps?.length) gaps.push(`${id} is missing words`);
    for (const text of [...steps, ask ?? ""]) {
      for (const piece of linkPieces(text)) {
        if (piece.href ? !piece.href.startsWith("https://") : /\]\(/.test(piece.text))
          gaps.push(`${id} link`);
      }
    }
  }
  assert.deepEqual([...new Set(gaps)], []);
});

test("a shared link opens exactly the result it was made from, including who holds the profile", () => {
  const holders = answersTo("holder");
  combos.forEach((answers, i) => {
    const full = { ...answers, holder: holders[i % holders.length] };
    const kept = Object.fromEntries(asked(full).map((id) => [id, full[id]]));
    assert.deepEqual(fromHash(`#${toHash(full)}`), kept, JSON.stringify(full));
  });
});

test("a hand-edited link keeps only the questions and answers the page knows, on the path they lead to, so it can't put other words on the page", () => {
  assert.deepEqual(fromHash("#access=no&role=primary&holder=%3Cb%3Ex%3C%2Fb%3E"), { access: "no" });
  assert.deepEqual(fromHash("#access=yes&role=owner&others=no&holder=family&name=Pat"), {
    access: "yes",
    role: "owner",
    others: "no",
    holder: "family",
  });
  assert.deepEqual(fromHash("#access=maybe"), {});
});
