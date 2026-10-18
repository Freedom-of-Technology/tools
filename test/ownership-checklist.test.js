// Runs the Ownership Checklist's own code (public/tools/ownership-checklist/check/accounts.js) on
// made-up answers. The rows themselves are content: the tests use them as the page does, by id, and
// never their wording.
//
//   node --test

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ACCOUNTS,
  ANSWERS,
  HOLDERS,
  KEY,
  STEPS,
  fromHash,
  linkPieces,
  message,
  plan,
  toHash,
  unanswered,
} from "../public/tools/ownership-checklist/check/accounts.js";

const ids = ACCOUNTS.map((a) => a.id);
const all = (answer) => Object.fromEntries(ids.map((id) => [id, answer]));
// Rows every business needs, such as backups: not having one counts.
const needed = ACCOUNTS.filter((a) => a.none).map((a) => a.id);
// A row a business may not have, such as accounting software; the last one, so it's apart from the
// rows the tests below answer.
const optional = ids.filter((id) => !needed.includes(id)).at(-1);
// Rows outside KEY, so a test about the plan's parts isn't also about the headline.
const plain = ids.filter((id) => !KEY.includes(id) && !needed.includes(id));

test("every row says what it is, what to do for each answer and what to ask its holder, sits in one step, and links only to secure pages, and every holder's message has each of its parts, so no result shows an empty card, a skipped row, a gap in a message or stray markup", () => {
  const gaps = [];
  for (const account of ACCOUNTS) {
    for (const field of ["name", "what", "other", "unsure", "ask"]) {
      if (!String(account[field] ?? "").trim()) gaps.push(`${account.id}.${field}`);
    }
    const linked = [
      ...["what", "other", "unsure", "none", "lasting"].map((f) => [f, account[f]]),
      ...(account.pitfalls ?? []).map((text, i) => [`pitfalls[${i}]`, text]),
    ];
    for (const [field, text] of linked) {
      for (const piece of linkPieces(text ?? "")) {
        if (piece.href ? !piece.href.startsWith("https://") : /\]\(/.test(piece.text))
          gaps.push(`${account.id}.${field} link`);
      }
    }
  }
  for (const holder of HOLDERS) {
    for (const field of [
      "label",
      "heading",
      "greeting",
      "opening",
      "request",
      "closing",
      "signoff",
    ]) {
      const text = holder[field];
      if (
        Array.isArray(text)
          ? text.length !== 2 || !text.every((t) => t.trim())
          : !String(text ?? "").trim()
      )
        gaps.push(`${holder.id}.${field}`);
    }
  }
  assert.ok(needed.length > 0, "found the rows every business needs");
  assert.deepEqual(gaps, []);
  assert.equal(new Set(ids).size, ids.length, "every row has its own id");
  assert.deepEqual(
    STEPS.flatMap((s) => s.ids),
    ids,
    "every row is in exactly one step, in the checklist's order",
  );
});

test("advice with a link is drawn as words and a link, in order, with nothing left out", () => {
  const pieces = linkPieces(
    "Look it up at [lookup.icann.org](https://lookup.icann.org): it names the company.",
  );
  assert.deepEqual(pieces, [
    { text: "Look it up at " },
    { text: "lookup.icann.org", href: "https://lookup.icann.org" },
    { text: ": it names the company." },
  ]);
  assert.deepEqual(linkPieces("No links here."), [{ text: "No links here." }]);
});

test("the score counts the accounts in the owner's name, out of the ones the business has", () => {
  const answers = { ...all("mine"), [ids[0]]: "other", [ids[1]]: "unsure", [optional]: "none" };
  const { inName, counted } = plan(answers);
  assert.equal(counted, ids.length - 1);
  assert.equal(inName, ids.length - 3);
});

test("a business with no backups or no password manager is marked down and told what to set up, rather than scoring full marks", () => {
  const answers = { ...all("mine"), ...Object.fromEntries(needed.map((id) => [id, "none"])) };
  const { inName, counted, setup, ask, find } = plan(answers);
  assert.equal(counted, ids.length);
  assert.equal(inName, ids.length - needed.length);
  assert.deepEqual(
    setup.map((t) => [t.account.id, t.advice]),
    needed.map((id) => [id, ACCOUNTS.find((a) => a.id === id).none]),
  );
  assert.deepEqual([ask, find], [[], []]);
});

test("every account that isn't in the owner's name lands in its part of the plan, someone else's to ask for and not sure to find out, in the checklist's order, with the advice for that answer", () => {
  const answers = all("mine");
  const [a, b, c, d] = plain;
  Object.assign(answers, { [c]: "other", [a]: "unsure", [d]: "other", [b]: "unsure" });
  const { ask, find, setup, yours } = plan(answers);
  assert.deepEqual(
    ask.flatMap((x) => x.items.map((i) => [i.account.id, i.advice])),
    [c, d].map((id) => [id, ACCOUNTS.find((x) => x.id === id).other]),
  );
  assert.deepEqual(
    find.map((i) => [i.account.id, i.advice]),
    [a, b].map((id) => [id, ACCOUNTS.find((x) => x.id === id).unsure]),
  );
  assert.deepEqual(setup, []);
  assert.deepEqual(
    yours.map((x) => x.id),
    ids.filter((id) => ![a, b, c, d].includes(id)),
  );
});

test("accounts held by the same person are asked for in one message that names each of them, so the owner has one conversation per person", () => {
  const [a, b, c] = plain;
  const [designer, family] = HOLDERS;
  const answers = { ...all("mine"), [a]: "other", [b]: "other", [c]: "other" };
  const { ask } = plan(answers, { [a]: designer.id, [b]: family.id, [c]: designer.id });
  assert.deepEqual(
    ask.map((x) => [x.holder.id, x.items.map((i) => i.account.id)]),
    [
      [designer.id, [a, c]],
      [family.id, [b]],
    ],
  );
  const text = message(ask[0]);
  const lines = text.split("\n").filter((line) => line.startsWith("- "));
  assert.deepEqual(
    lines,
    [a, c].map((id) => `- ${ACCOUNTS.find((x) => x.id === id).ask}`),
  );
});

test("each person's message is written for who they are to the owner, so a relative never gets the agency's wording", () => {
  const [a, b] = plain;
  const answers = { ...all("mine"), [a]: "other", [b]: "other" };
  const texts = HOLDERS.map((holder) => {
    const { ask } = plan(answers, { [a]: holder.id, [b]: holder.id });
    assert.equal(ask[0].holder, holder);
    return message(ask[0]);
  });
  assert.equal(new Set(texts).size, HOLDERS.length, "no two holders get the same message");
  HOLDERS.forEach((holder, i) => {
    assert.ok(texts[i].startsWith(holder.greeting), `${holder.id} is greeted their own way`);
    assert.ok(texts[i].endsWith(holder.signoff), `${holder.id} is thanked their own way`);
  });
});

test("a message about one account asks for it on its own, not as a list of one", () => {
  const [a] = plain;
  const ask = ACCOUNTS.find((x) => x.id === a).ask;
  for (const holder of HOLDERS) {
    const {
      ask: [one],
    } = plan({ ...all("mine"), [a]: "other" }, { [a]: holder.id });
    const text = message(one);
    assert.ok(
      text.split("\n\n").includes(ask),
      `${holder.id}: the account is asked for in its own paragraph`,
    );
    assert.ok(
      !text.split("\n").some((line) => line.startsWith("- ")),
      `${holder.id}: no one-line list`,
    );
    assert.ok(
      !text.includes(holder.request),
      `${holder.id}: no "help with these" before a single account`,
    );
  }
});

test("an account someone else holds, with no answer to who, is still asked for, under whoever holds it", () => {
  const [a] = plain;
  const { ask } = plan({ ...all("mine"), [a]: "other" });
  assert.deepEqual(
    ask.map((x) => [x.holder.id, x.items.map((i) => i.account.id)]),
    [[HOLDERS.at(-1).id, [a]]],
  );
});

test("the result starts with the web address and email when either isn't in the owner's name, and leaves out one the business doesn't have", () => {
  const [first, second] = KEY;
  assert.deepEqual(
    plan({ ...all("mine"), [first]: "other", [second]: "unsure" }).key.map((a) => a.id),
    KEY,
  );
  assert.deepEqual(
    plan({ ...all("mine"), [second]: "unsure" }).key.map((a) => a.id),
    [second],
  );
  assert.deepEqual(plan({ ...all("mine"), [first]: "none", [plain[0]]: "other" }).key, []);
});

test("a shared link opens exactly the result it was made from, including who holds what", () => {
  const answers = Object.fromEntries(ids.map((id, i) => [id, ANSWERS[i % ANSWERS.length].id]));
  const holders = Object.fromEntries(
    ids
      .filter((id) => answers[id] === "other")
      .map((id, i) => [id, HOLDERS[i % HOLDERS.length].id]),
  );
  assert.ok(Object.keys(holders).length > 1, "the link carries more than one holder");
  assert.deepEqual(fromHash(`#${toHash(answers, holders)}`), { answers, holders });
});

test("a hand-edited link keeps only the rows, answers and holders the checklist knows, so it can't put other words on the page", () => {
  const [a, b, c] = ids;
  const hash = `#${a}=mine&${a}-by=${HOLDERS[0].id}&${b}=%3Cb%3Ehacked%3C%2Fb%3E&bank=mine&${c}=other&${c}-by=%3Cb%3Ex%3C%2Fb%3E`;
  assert.deepEqual(fromHash(hash), { answers: { [a]: "mine", [c]: "other" }, holders: {} });
});

test("a checklist with rows left unanswered names those rows, rather than scoring a blank as not in the owner's name", () => {
  const answers = all("mine");
  delete answers[ids[2]];
  answers[ids[5]] = "";
  assert.deepEqual(
    unanswered(answers).map((a) => a.id),
    [ids[2], ids[5]],
  );
  assert.deepEqual(unanswered(all("unsure")), []);
});
