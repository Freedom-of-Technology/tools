// Runs the Ownership Checklist's own code (public/tools/ownership-checklist/check/accounts.js) on
// made-up answers. The rows themselves are content: the tests use them as the page does, by id, and
// never their wording.
//
//   node --test

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ACCOUNTS, ANSWERS, fromHash, tally, toHash, unanswered } from '../public/tools/ownership-checklist/check/accounts.js';

const ids = ACCOUNTS.map((a) => a.id);
const all = (answer) => Object.fromEntries(ids.map((id) => [id, answer]));
// Rows every business needs, such as backups: not having one counts.
const needed = ACCOUNTS.filter((a) => a.none).map((a) => a.id);
// A row a business may not have, such as accounting software; the last one, so it's apart from the
// rows the tests below answer.
const optional = ids.filter((id) => !needed.includes(id)).at(-1);

test('every row says what it is and what to do for each answer the owner can give, so no result shows an empty card', () => {
  const gaps = [];
  for (const account of ACCOUNTS) {
    for (const field of ['name', 'what', 'other', 'unsure']) {
      if (!String(account[field] ?? '').trim()) gaps.push(`${account.id}.${field}`);
    }
  }
  assert.ok(needed.length > 0, 'found the rows every business needs');
  assert.deepEqual(gaps, []);
  assert.equal(new Set(ids).size, ids.length, 'every row has its own id');
});

test('the score counts the accounts in the owner\'s name, out of the ones the business has', () => {
  const answers = { ...all('mine'), [ids[0]]: 'other', [ids[1]]: 'unsure', [optional]: 'none' };
  const { inName, counted } = tally(answers);
  assert.equal(counted, ids.length - 1);
  assert.equal(inName, ids.length - 3);
});

test('a business with no backups or no password manager is marked down and told what to set up, rather than scoring full marks', () => {
  const answers = { ...all('mine'), ...Object.fromEntries(needed.map((id) => [id, 'none'])) };
  const { inName, counted, todo } = tally(answers);
  assert.equal(counted, ids.length);
  assert.equal(inName, ids.length - needed.length);
  assert.deepEqual(todo.map((t) => [t.account.id, t.answer, t.advice]),
    needed.map((id) => [id, 'none', ACCOUNTS.find((a) => a.id === id).none]));
});

test('every account that isn\'t in the owner\'s name is on the to-do list, in the checklist\'s order, with the advice for that answer', () => {
  const answers = all('mine');
  const picked = [ids[3], ids[0], ids[6]];
  answers[picked[0]] = 'other';
  answers[picked[1]] = 'unsure';
  answers[picked[2]] = 'other';
  const { todo, yours } = tally(answers);
  const expected = ids.filter((id) => picked.includes(id));
  assert.deepEqual(todo.map((t) => t.account.id), expected);
  for (const t of todo) assert.equal(t.advice, t.account[answers[t.account.id]]);
  assert.deepEqual(yours.map((a) => a.id), ids.filter((id) => !picked.includes(id)));
});

test('a shared link opens exactly the result it was made from', () => {
  const answers = Object.fromEntries(ids.map((id, i) => [id, ANSWERS[i % ANSWERS.length].id]));
  assert.deepEqual(fromHash(`#${toHash(answers)}`), answers);
});

test('a hand-edited link keeps only the rows and answers the checklist knows, so it can\'t put other words on the page', () => {
  const hash = `#${ids[0]}=mine&${ids[1]}=%3Cb%3Ehacked%3C%2Fb%3E&bank=mine&${ids[2]}=other`;
  assert.deepEqual(fromHash(hash), { [ids[0]]: 'mine', [ids[2]]: 'other' });
});

test('a checklist with rows left unanswered names those rows, rather than scoring a blank as not in the owner\'s name', () => {
  const answers = all('mine');
  delete answers[ids[2]];
  answers[ids[5]] = '';
  assert.deepEqual(unanswered(answers).map((a) => a.id), [ids[2], ids[5]]);
  assert.deepEqual(unanswered(all('unsure')), []);
});
