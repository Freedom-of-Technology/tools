// The page: draws the form one step at a time from check/accounts.js, takes the owner's answers,
// and shows the plan: who to ask for what, with a message for each, what to find out first, what to
// set up, and a link that opens the same result. Everything happens here in the browser: the page's
// security settings (connect-src 'none') block it from sending anything anywhere.
//
// A result can be shared: the answers ride in the part of the address after "#", which browsers
// never send to the server.

import { ACCOUNTS, ANSWERS, HOLDERS, KEY, STEPS, fromHash, message, plan, toHash, unanswered } from './check/accounts.js';
import { foldedMessage, linked } from '../shared/ask-page.js';
import { copyButton, h, show } from '../shared/page.js';

const form = document.getElementById('checklist-form');
const list = document.getElementById('accounts');
const note = document.getElementById('step-note');
const prev = document.getElementById('prev');
const next = document.getElementById('next');
const see = document.getElementById('see');
const showAll = [...document.querySelectorAll('.show-all')];
const results = document.getElementById('results');
const freeot = document.getElementById('freeot');

const byId = Object.fromEntries(ACCOUNTS.map((a) => [a.id, a]));

function choice(name, id, value, label) {
  return h('label', { class: 'answer', for: id },
    h('input', { type: 'radio', id, name, value }),
    h('span', {}, label));
}

// "Someone else's" opens a second question: who. It's optional; a row left without one is asked
// for under "Whoever holds them".
function row(account) {
  const holder = h('fieldset', { class: 'holder', hidden: true },
    h('legend', { class: 'holder-name' }, 'Who holds it? If you know.'),
    h('div', { class: 'answers' }, HOLDERS.map((who) =>
      choice(`${account.id}-by`, `${account.id}-by-${who.id}`, who.id, who.label))));
  return h('fieldset', { class: 'account', id: `row-${account.id}` },
    h('legend', { class: 'account-name' }, account.name),
    h('p', { class: 'account-what' }, account.what),
    h('div', { class: 'answers' }, ANSWERS.map((answer) =>
      choice(account.id, `${account.id}-${answer.id}`, answer.id, answer.label))),
    holder);
}

const steps = STEPS.map((step, i) => h('section', { class: 'step', 'aria-labelledby': `step-${i}` },
  h('h3', { class: 'step-title', id: `step-${i}`, tabindex: '-1' },
    h('span', { class: 'step-count' }, `Step ${i + 1} of ${STEPS.length}`),
    step.name),
  step.ids.map((id) => row(byId[id]))));
list.replaceChildren(...steps);

const stepOf = (id) => STEPS.findIndex((step) => step.ids.includes(id));

function showHolders() {
  for (const account of ACCOUNTS) {
    document.querySelector(`#row-${account.id} .holder`).hidden = form.elements[account.id].value !== 'other';
  }
}

const answersOnPage = () => Object.fromEntries(ACCOUNTS.map((a) => [a.id, form.elements[a.id].value]));
const holdersOnPage = () => Object.fromEntries(ACCOUNTS.map((a) => [a.id, form.elements[`${a.id}-by`].value]));

function fillIn({ answers, holders }) {
  for (const account of ACCOUNTS) {
    for (const input of form.querySelectorAll(`input[name="${account.id}"]`)) input.checked = input.value === answers[account.id];
    for (const input of form.querySelectorAll(`input[name="${account.id}-by"]`)) input.checked = input.value === holders[account.id];
  }
  showHolders();
}

// One step at a time, or every row at once. "Show all", at the top and bottom of the form, is for an
// owner who'd rather see every question before answering, and for the person helping them.
let current = 0;
let all = false;

function draw() {
  steps.forEach((step, i) => { step.hidden = !all && i !== current; });
  list.classList.toggle('all', all);
  const last = all || current === steps.length - 1;
  prev.hidden = all || current === 0;
  next.hidden = last;
  see.hidden = !last;
  for (const button of showAll) {
    button.textContent = all ? 'One step at a time' : 'Show all';
    button.setAttribute('aria-pressed', String(all));
  }
}

function goTo(i) {
  current = i;
  draw();
  steps[i].querySelector('.step-title').focus();
}


// "your web address and your business email": names joined the way a sentence would say them.
const listed = (accounts) => {
  const names = accounts.map((a) => a.name.replace(/^Your /, 'your '));
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
};
const capital = (text) => text[0].toUpperCase() + text.slice(1);

const missingText = (missing) => (missing.length > 3
  ? `${missing.length} rows have no answer yet, starting with ${listed(missing.slice(0, 1))}. "Not sure" is a fine answer.`
  : `Choose an answer for ${listed(missing)}. "Not sure" is a fine answer.`);

prev.addEventListener('click', () => {
  note.textContent = '';
  goTo(current - 1);
});

next.addEventListener('click', () => {
  const missing = unanswered(answersOnPage()).filter((a) => STEPS[current].ids.includes(a.id));
  note.textContent = missing.length ? missingText(missing) : '';
  if (missing.length) {
    form.elements[missing[0].id][0].focus();
    return;
  }
  goTo(current + 1);
});

for (const button of showAll) {
  button.addEventListener('click', () => {
    all = !all;
    draw();
  });
}

form.addEventListener('change', (event) => {
  if (event.target.name in byId) showHolders();
});

function card(title, ...children) {
  return h('article', { class: 'problem' }, h('h4', { class: 'problem-title' }, title), ...children);
}

// A mistake that can't be undone is said in the plan, beside the account; the rest of what can go
// wrong is in the guide.
function lasting(account) {
  if (!account.lasting) return null;
  const line = linked(account.lasting);
  line.className = 'lasting';
  line.prepend(h('strong', {}, 'Can\'t be undone: '));
  line.append(' ', h('a', { class: 'fo-link', href: `#watch-${account.id}` }, 'What else can go wrong'));
  return line;
}

// The message stays folded until the owner opens it, so the plan reads as a list of people and
// accounts.
function askCard(ask) {
  return card(ask.holder.heading,
    h('ul', { class: 'asks' }, ask.items.map(({ account, advice: text }) =>
      h('li', {}, h('strong', {}, account.name), linked(text), lasting(account)))),
    ask.holder.before ? h('p', { class: 'before' }, ask.holder.before, ' ',
      h('a', { class: 'fo-link', href: '#means-agreements' }, 'Agreements and open bills')) : null,
    foldedMessage(message(ask), `message-${ask.holder.id}`));
}

function section(title, lead, cards) {
  if (!cards.length) return null;
  return h('section', { class: 'plan-part' },
    h('h3', { class: 'fo-h3' }, title),
    h('p', { class: 'hint' }, lead),
    h('div', { class: 'problems' }, cards));
}

// The headline answers the question that matters most: are the web address and email, whose holder
// can reset everything else, in the owner's name?
function headline({ key, ask, find, setup }, answers) {
  const todo = ask.reduce((n, a) => n + a.items.length, 0) + find.length + setup.length;
  if (!todo) return ['Everything here is in your name', 'Keep it that way: when someone new sets something up for you, ask for it in your name from the start.'];
  if (key.length) {
    return [`Start with ${listed(key)}`,
      `Whoever holds ${key.length > 1 ? 'them' : 'it'} can reset the passwords for almost everything else.`];
  }
  const had = ACCOUNTS.filter((a) => KEY.includes(a.id) && answers[a.id] !== 'none');
  const more = todo === 1 ? 'One more thing below.' : `${todo} more things below.`;
  if (had.length) return [`${capital(listed(had))} ${had.length > 1 ? 'are' : 'is'} in your name`, `That's the hard part. ${more}`];
  return [todo === 1 ? 'One thing to do' : `${todo} things to do`, 'Work down the list from the top.'];
}

function showResult(answers, holders) {
  const result = plan(answers, holders);
  const hash = toHash(answers, holders);
  const link = `${location.origin}${location.pathname}#${hash}`;
  history.replaceState(null, '', `#${hash}`);
  const shown = h('p', { class: 'shown-link' }, link);
  const [title, hintText] = headline(result, answers);

  freeot.hidden = false;
  show(results,
    h('div', { class: 'result-head' },
      h('div', {},
        h('h2', { class: 'fo-h2' }, title),
        h('p', { class: 'hint' }, hintText),
        h('p', { class: 'score' }, `${result.inName} of ${result.counted} accounts in your name.`))),
    section('Who to ask', 'One message for each person, asking for every account they hold. Ask kindly, and in writing.',
      result.ask.map(askCard)),
    section('Find out first', 'You weren\'t sure who holds these. Here\'s how to check.',
      result.find.map(({ account, advice: text }) => card(account.name, linked(text)))),
    section('Set up', 'Every business needs these, whatever its size.',
      result.setup.map(({ account, advice: text }) => card(account.name, linked(text)))),
    result.yours.length ? h('div', { class: 'yours' },
      h('h3', { class: 'fo-h3' }, 'Already in your name'),
      h('ul', {}, result.yours.map((account) => h('li', {}, account.name)))) : null,
    h('div', { class: 'share' },
      h('h3', { class: 'fo-h3' }, 'Share this result'),
      h('p', { class: 'hint' }, 'The link holds your answers, so whoever you send it to sees the same plan. ',
        h('a', { class: 'fo-link', href: '#means-share' }, 'How the link works')),
      shown,
      h('div', { class: 'fo-row' }, copyButton(link, shown))),
  );
}

// Whatever the step, a missing answer takes the owner back to it.
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!all && current < steps.length - 1) {
    next.click();
    return;
  }
  const answers = answersOnPage();
  const missing = unanswered(answers);
  if (missing.length) {
    freeot.hidden = true;
    results.replaceChildren();
    if (!all) goTo(stepOf(missing[0].id));
    note.textContent = missingText(missing);
    form.elements[missing[0].id][0].focus();
    return;
  }
  note.textContent = '';
  showResult(answers, holdersOnPage());
});

// A shared link (…/ownership-checklist/#domain=other&domain-by=designer&…) fills in its answers,
// and shows the result once every row has one. The page's own section links also use "#"; they hold
// no answers, so they change nothing.
function fromAddress() {
  const shared = fromHash(location.hash);
  if (!Object.keys(shared.answers).length) return;
  fillIn(shared);
  note.textContent = '';
  if (!unanswered(shared.answers).length) showResult(shared.answers, shared.holders);
}

// One fold-out per account, the mistake that can't be undone first. A link to one, from the plan,
// opens it.
const watch = ACCOUNTS.filter((a) => a.lasting || a.pitfalls?.length).map((account) => {
  const items = (account.pitfalls ?? []).map((text) => h('li', {}, linked(text)));
  if (account.lasting) {
    const line = linked(account.lasting);
    line.prepend(h('strong', {}, 'Can\'t be undone: '));
    items.unshift(h('li', { class: 'lasting' }, line));
  }
  return h('details', { class: 'watch', id: `watch-${account.id}` },
    h('summary', {}, account.name),
    h('ul', {}, items));
});
document.getElementById('watch-list').replaceChildren(...watch);

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#watch-"]');
  if (link) document.getElementById(link.getAttribute('href').slice(1)).open = true;
});

draw();
window.addEventListener('hashchange', fromAddress);
fromAddress();
