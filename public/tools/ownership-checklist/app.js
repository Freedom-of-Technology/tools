// The page: draws a row for each account in check/accounts.js, takes the owner's answers, and shows
// the result: the score, what to move into their name and how, and a link that opens the same
// result. Everything happens here in the browser: the page's security settings (connect-src 'none')
// block it from sending anything anywhere.
//
// A result can be shared: the answers ride in the part of the address after "#", which browsers
// never send to the server.

import { ACCOUNTS, ANSWERS, fromHash, tally, toHash, unanswered } from './check/accounts.js';
import { copyButton, h, notMade, show } from '../shared/page.js';

const form = document.getElementById('checklist-form');
const list = document.getElementById('accounts');
const results = document.getElementById('results');
const freeot = document.getElementById('freeot');

const ANSWER_LABEL = Object.fromEntries(ANSWERS.map((a) => [a.id, a.label]));

// ---- The rows ------------------------------------------------------------------------------------

function row(account) {
  const choices = ANSWERS.map((answer) => {
    const id = `${account.id}-${answer.id}`;
    return h('label', { class: 'answer', for: id },
      h('input', { type: 'radio', id, name: account.id, value: answer.id }),
      h('span', {}, answer.label));
  });
  return h('fieldset', { class: 'account', id: `row-${account.id}` },
    h('legend', { class: 'account-name' }, account.name),
    h('p', { class: 'account-what' }, account.what),
    h('div', { class: 'answers' }, choices));
}

list.replaceChildren(...ACCOUNTS.map(row));

const answersOnPage = () => Object.fromEntries(ACCOUNTS.map((a) => [a.id, form.elements[a.id].value]));

function fillIn(answers) {
  for (const account of ACCOUNTS) {
    for (const input of form.querySelectorAll(`input[name="${account.id}"]`)) {
      input.checked = input.value === answers[account.id];
    }
  }
}

// ---- The result ----------------------------------------------------------------------------------

function todoCard({ account, answer, advice }) {
  return h('article', { class: 'problem' },
    h('div', { class: 'problem-head' },
      h('span', { class: 'badge badge-todo' }, ANSWER_LABEL[answer]),
      h('h3', { class: 'problem-title' }, account.name)),
    h('p', {}, advice));
}

function hint(todo) {
  if (!todo.length) return 'Keep it that way: when someone new sets something up for you, ask for it in your name from the start.';
  if (todo.some((t) => ['domain', 'email'].includes(t.account.id))) {
    return 'Start at the top: whoever holds your web address or your email can reset the passwords for almost everything else.';
  }
  return 'Work down the list from the top.';
}

function showResult(answers) {
  const { inName, counted, todo, yours } = tally(answers);
  const link = `${location.origin}${location.pathname}#${toHash(answers)}`;
  history.replaceState(null, '', `#${toHash(answers)}`);
  const shown = h('p', { class: 'shown-link' }, link);

  freeot.hidden = false;
  show(results,
    h('div', { class: 'result-head' },
      h('div', {},
        h('span', { class: `badge ${todo.length ? 'badge-todo' : ''}` }, `${inName} of ${counted} in your name`),
        h('h2', { class: 'fo-h2' }, todo.length
          ? (todo.length === 1 ? 'One thing to do' : `${todo.length} things to do`)
          : 'Everything here is in your name'),
        h('p', { class: 'hint' }, hint(todo)))),
    todo.length ? h('div', { class: 'problems' }, todo.map(todoCard)) : null,
    yours.length ? h('div', { class: 'yours' },
      h('h3', { class: 'fo-h3' }, 'Already in your name'),
      h('ul', {}, yours.map((account) => h('li', {}, account.name)))) : null,
    h('div', { class: 'share' },
      h('h3', { class: 'fo-h3' }, 'Share this result'),
      h('p', { class: 'hint' }, 'The link holds your answers, so whoever you send it to sees the same list. ',
        h('a', { class: 'fo-link', href: '#means-share' }, 'How the link works')),
      shown,
      h('div', { class: 'fo-row' }, copyButton(link, shown))),
  );
}

function check() {
  const answers = answersOnPage();
  const missing = unanswered(answers);
  if (missing.length) {
    freeot.hidden = true;
    const names = missing.map((a) => a.name.replace(/^Your /, 'your '));
    notMade(results, 'A few left to answer', missing.length > 3
      ? `${missing.length} rows have no answer yet, starting with ${names[0]}. "Not sure" is a fine answer.`
      : `Choose an answer for ${names.join(', ')}. "Not sure" is a fine answer.`);
    return;
  }
  showResult(answers);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  check();
});

// A shared link (…/ownership-checklist/#domain=mine&…) fills in its answers, and shows the result
// once every row has one. The page's own section links also use "#"; they hold no answers, so they
// change nothing.
function fromAddress() {
  const answers = fromHash(location.hash);
  if (!Object.keys(answers).length) return;
  fillIn(answers);
  if (!unanswered(answers).length) showResult(answers);
}
window.addEventListener('hashchange', fromAddress);
fromAddress();
