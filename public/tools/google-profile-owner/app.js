// The page: asks what the owner sees on their Google Business Profile, from check/profile.js, and
// shows what to do: the steps, and a message for whoever holds the profile. Everything happens here
// in the browser: the page's security settings (connect-src 'none') block it from sending anything
// anywhere.
//
// A result can be shared: the answers ride in the part of the address after "#", which browsers
// never send to the server.

import { QUESTIONS, asked, fromHash, result, toHash, unanswered } from './check/profile.js';
import { HOLDERS, message } from '../shared/ask.js';
import { foldedMessage, linked } from '../shared/ask-page.js';
import { copyButton, h, show } from '../shared/page.js';

const form = document.getElementById('profile-form');
const list = document.getElementById('questions');
const note = document.getElementById('form-note');
const results = document.getElementById('results');
const freeot = document.getElementById('freeot');

function choice(name, id, value, label) {
  return h('label', { class: 'answer', for: id },
    h('input', { type: 'radio', id, name, value }),
    h('span', {}, label));
}

const fieldsets = QUESTIONS.map((q) => h('fieldset', { class: 'question', id: `q-${q.id}` },
  h('legend', { class: 'question-name' }, q.question),
  h('p', { class: 'question-help' }, q.help),
  h('div', { class: 'answers' }, q.answers.map((a) => choice(q.id, `${q.id}-${a.id}`, a.id, a.label)))));
list.replaceChildren(...fieldsets);

const answersOnPage = () => Object.fromEntries(QUESTIONS.map((q) => [q.id, form.elements[q.id].value]));

// Only the questions this owner is asked show; the rest wait for the answer that leads to them.
function showQuestions() {
  const now = asked(answersOnPage());
  for (const q of QUESTIONS) document.getElementById(`q-${q.id}`).hidden = !now.includes(q.id);
}

function fillIn(answers) {
  for (const q of QUESTIONS) {
    for (const input of form.querySelectorAll(`input[name="${q.id}"]`)) input.checked = input.value === answers[q.id];
  }
  showQuestions();
}

form.addEventListener('change', () => {
  note.textContent = '';
  showQuestions();
});

function showResult(answers) {
  const { title, hint, steps, ask } = result(answers);
  const hash = toHash(answers);
  const link = `${location.origin}${location.pathname}#${hash}`;
  history.replaceState(null, '', `#${hash}`);
  const shown = h('p', { class: 'shown-link' }, link);
  // Whoever the owner named, or "Whoever holds them" when they didn't say.
  const holder = HOLDERS.find((x) => x.id === answers.holder) ?? HOLDERS.at(-1);

  freeot.hidden = false;
  show(results,
    h('div', { class: 'result-head' },
      h('div', {},
        h('h2', { class: 'fo-h2' }, title),
        h('p', { class: 'hint' }, hint))),
    ask ? h('article', { class: 'problem' },
      h('h3', { class: 'problem-title' }, 'A message to send'),
      h('p', { class: 'hint' }, `Written for ${holder.label[0].toLowerCase()}${holder.label.slice(1)}.`),
      holder.before ? h('p', { class: 'before' }, holder.before) : null,
      ...foldedMessage(message(holder, [ask]), 'message')) : null,
    h('section', { class: 'plan-part' },
      h('h3', { class: 'fo-h3' }, ask ? 'Then' : 'What to do'),
      h('ol', { class: 'steps-list' }, steps.map((text) => h('li', {}, linked(text))))),
    h('div', { class: 'share' },
      h('h3', { class: 'fo-h3' }, 'Share this result'),
      h('p', { class: 'hint' }, 'The link holds your answers, so whoever you send it to sees the same result. ',
        h('a', { class: 'fo-link', href: '#means-share' }, 'How the link works')),
      shown,
      h('div', { class: 'fo-row' }, copyButton(link, shown))),
  );
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const answers = answersOnPage();
  const missing = unanswered(answers);
  if (missing.length) {
    freeot.hidden = true;
    results.replaceChildren();
    note.textContent = `Choose an answer for "${QUESTIONS.find((q) => q.id === missing[0]).question}"`;
    form.elements[missing[0]][0].focus();
    return;
  }
  showResult(answers);
});

// A shared link (…/google-profile-owner/#access=yes&role=owner&…) fills in its answers, and shows
// the result once every question it leads to has one. The page's own section links also use "#";
// they hold no answers, so they change nothing.
function fromAddress() {
  const shared = fromHash(location.hash);
  if (!Object.keys(shared).length) return;
  fillIn(shared);
  if (!unanswered(shared).length) showResult(shared);
}

showQuestions();
window.addEventListener('hashchange', fromAddress);
fromAddress();
