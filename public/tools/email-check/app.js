// The page: takes a domain, runs the check, and says what it found in plain words.
// Everything from the internet goes in with textContent, never as HTML.
//
// A result can be shared: the domain rides in the part of the address after "#", which browsers
// never send to the server, and opening such a link runs the check.

import { createLookup } from '../shared/live.js';
import { DomainError, RESULT, checkEmail, cleanDomain } from './check/email.js';

const lookup = createLookup();
const form = document.getElementById('check-form');
const input = document.getElementById('domain');
const results = document.getElementById('results');
const freeot = document.getElementById('freeot');

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    if (key === 'class') el.className = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

const BADGE = {
  [RESULT.good]: 'Good',
  [RESULT.look]: 'Worth a look',
  [RESULT.fix]: 'Needs a fix',
  [RESULT.failed]: "Couldn't check",
  [RESULT.info]: 'For your information',
};
const badge = (result) => h('span', { class: `badge badge-${result}` }, BADGE[result]);
// Where the page's guide explains each check (index.html, "What each check means").
const MEANS = { spf: 'means-spf', dkim: 'means-dkim', dmarc: 'means-dmarc', expiry: 'means-expiry' };
const means = (id) => h('p', {}, h('a', { class: 'fo-link', href: `#${MEANS[id]}` }, 'What this means'));
const values = (list) => h('ul', { class: 'values' }, list.map((v) => h('li', {}, h('code', {}, v))));
const date = (d) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const tryAgain = 'The lookup didn\'t work this time. Try again in a minute.';

// ---- Each check, in words -----------------------------------------------------------------------

const SAYS = {
  spf: {
    missing: () => 'Your domain doesn\'t say which servers may send its email. Add an SPF record: your email service gives you the exact line to add.',
    'two-records': (f) => `Your domain has ${f.count} SPF records. Mail servers accept only one, so they ignore all of them. Combine them into one record.`,
    'allows-anyone': () => 'Your SPF record ends in "+all", which lets any server in the world send email as you. Change the ending to "~all" or "-all".',
    neutral: () => 'Your SPF record ends in "?all", which tells mail servers to neither trust nor doubt other senders. Change it to "~all" or "-all".',
    soft: () => 'Only the servers you list may send as you. Others are marked as suspicious ("~all").',
    strict: () => 'Only the servers you list may send as you. Others are refused ("-all").',
    'no-ending': () => 'Your SPF record doesn\'t end by saying what to do with other senders. Add "~all" at the end.',
    'too-many-lookups': (f) => `Your SPF record makes mail servers do ${f.count} lookups. The limit is 10, so they treat the whole record as broken. Remove senders you no longer use, or ask FreeOT to flatten it.`,
    'lookups-unsure': () => 'Some of the senders your SPF record includes couldn\'t be looked up, so the count of lookups may be low.',
    'godaddy-leftover': () => 'Your SPF record still lets GoDaddy\'s email servers send as you, but your email isn\'t at GoDaddy. That\'s a leftover from GoDaddy\'s setup: take "include:secureserver.net" out.',
    failed: () => tryAgain,
  },
  dkim: {
    found: (f) => `Your email is signed, so receiving servers can tell it really came from you. Found at: ${f.selectors.join(', ')}.`,
    revoked: () => 'A DKIM key is there, but it\'s empty, which means it was switched off. Turn DKIM back on at your email service.',
    'pointer-without-key': (f) => `Your domain points to ${f.provider ?? 'your email service'} for its signature, but there's no key there yet. Turn on DKIM in ${f.provider === 'Microsoft 365' ? 'Microsoft 365 (Microsoft Defender, Email authentication settings, DKIM)' : 'your email service'}.`,
    missing: (f) => `Your email isn't signed. Turn on DKIM in ${f.provider === 'Microsoft 365' ? 'Microsoft 365 (Microsoft Defender, Email authentication settings, DKIM)' : f.provider}, then add the records it gives you.`,
    'not-found': (f) => (f.provider === 'Google Workspace'
      ? 'We didn\'t find a signature key under "google", where Google Workspace puts it unless your admin picked another name. Look in the Google Admin console (Apps, Google Workspace, Gmail, Authenticate email): if DKIM is off there, turn it on and add the record it gives you.'
      : 'We couldn\'t find a signature key at the names most email services use. Your service may use a name we can\'t guess, so this may be fine. Your email service\'s settings will say whether DKIM is on.'),
    failed: () => tryAgain,
  },
  dmarc: {
    missing: () => 'Your domain doesn\'t tell mail servers what to do with email that fails these checks, so fake email from your domain gets delivered. Add a DMARC record.',
    'two-records': (f) => `Your domain has ${f.count} DMARC records. Mail servers ignore all of them when there's more than one. Keep one.`,
    'no-policy': () => 'Your DMARC record doesn\'t say what to do with fake email. Add "p=none" to start, then move to "p=quarantine".',
    'watching-only': () => 'Your DMARC record is set to watch only ("p=none"). Fake email from your domain still gets delivered. Once you\'ve checked your real email passes, change it to "p=quarantine".',
    quarantine: () => 'Fake email from your domain is sent to spam ("p=quarantine").',
    reject: () => 'Fake email from your domain is refused ("p=reject").',
    partial: (f) => `Your DMARC record applies to only ${f.pct}% of failing email ("pct=${f.pct}"). The rest still gets delivered.`,
    'no-reports': () => 'Your DMARC record doesn\'t ask for reports, so you won\'t hear if someone is faking your email. Add "rua=mailto:" and an address that collects them.',
    failed: () => tryAgain,
  },
  expiry: {
    ok: (f) => `Your domain is registered until ${date(f.at)}.`,
    soon: (f) => `Your domain's registration runs out on ${date(f.at)}, in ${f.days} ${f.days === 1 ? 'day' : 'days'}. Renew it now, and check automatic renewal is on, or your website and email stop.`,
    expired: (f) => `Your domain's registration ran out on ${date(f.at)}. Renew it right away at the company you bought it from.`,
    unknown: () => 'The registry for your domain ending doesn\'t say when the registration runs out. The company you bought it from will show the date.',
    failed: () => tryAgain,
  },
};

const TITLES = {
  spf: 'Who can send email as you',
  dkim: 'The signature on your email',
  dmarc: 'What happens to fake email',
  expiry: 'Your domain\'s registration',
};
const TECH = { spf: 'SPF', dkim: 'DKIM', dmarc: 'DMARC' };

function checkCard(check) {
  const shown = check.findings.filter((f) => f.code !== 'failed' || check.findings.length === 1);
  return h('article', { class: 'problem' },
    h('div', { class: 'problem-head' }, badge(check.result),
      h('h4', { class: 'problem-title' }, TITLES[check.id], TECH[check.id] ? h('span', { class: 'tag' }, TECH[check.id]) : null)),
    shown.map((f) => h('p', {}, SAYS[check.id][f.code](f))),
    check.values?.length ? h('div', {}, h('p', { class: 'fo-label' }, 'Live right now'), values(check.values)) : null,
    check.result === RESULT.good || check.result === RESULT.info ? null : means(check.id));
}

const VERDICT = {
  hard: ['Hard to fake', 'Your domain has all three protections, and fake email from it is sent to spam or refused.'],
  partly: ['Partly protected', 'Fake email from your domain is caught, but something below needs a fix so your real email keeps getting through.'],
  easy: ['Easy to fake', 'Fake email that claims to come from your domain still gets delivered. The fixes are below.'],
  unknown: ['Couldn\'t tell', 'Some lookups didn\'t work this time. Try again in a minute.'],
};

function mailLine(report) {
  if (report.mailFailure) return 'We couldn\'t look up which service receives your email.';
  if (report.mail.nullMx) return 'Your domain says on purpose that it takes no email.';
  if (!report.mail.receives) return 'Your domain doesn\'t receive email. If it doesn\'t send any either, an SPF record of "v=spf1 -all" and a DMARC record of "p=reject" stop anyone faking it.';
  return report.mail.provider ? `Your email is handled by ${report.mail.provider.name}.` : 'Your domain receives email.';
}

function renderReport(report, note) {
  const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (!report.registered) {
    return h('section', { class: 'result result-message', role: 'alert' },
      h('h2', { class: 'fo-h3' }, `${report.domain} isn't registered`),
      h('p', { class: 'fo-p' }, 'The registry for this domain ending has no record of it. Check the spelling.'));
  }
  const [title, line] = VERDICT[report.verdict];
  const { spf, dkim, dmarc, expiry } = report.checks;
  return h('section', { class: 'result', 'aria-label': `Results for ${report.domain}` },
    h('div', { class: 'result-head' },
      h('div', {},
        h('p', { class: 'fo-label' }, 'Can someone send email pretending to be you?'),
        h('h2', { class: 'fo-h2' }, report.domain),
        h('p', { class: 'summary' }, title),
        h('p', {}, line),
        note ? h('p', { class: 'hint' }, note) : null,
        h('p', { class: 'hint' }, mailLine(report), ` Checked at ${time}.`)),
      h('button', { type: 'button', class: 'fo-btn fo-btn-outline', id: 'again' }, 'Check again')),
    h('div', { class: 'problems' }, [dmarc, spf, dkim, expiry].map(checkCard)),
    h('p', { class: 'hint' }, 'Have a records file for this domain? ',
      h('a', { class: 'fo-link', href: '/tools/domain-check/' }, 'Almanac Check'), ' checks every record in it.'));
}

// ---- Running a check ----------------------------------------------------------------------------

async function run(text) {
  let cleaned;
  try {
    cleaned = cleanDomain(text);
  } catch (err) {
    if (!(err instanceof DomainError)) throw err;
    results.replaceChildren(h('p', { class: 'checking', role: 'alert' }, 'That doesn\'t look like a web address. Type it like yourbusiness.com.'));
    return;
  }
  const { domain, wwwDropped } = cleaned;
  input.value = domain;
  history.replaceState(null, '', `#${domain}`);
  results.replaceChildren(h('p', { class: 'checking' }, `Checking ${domain}…`));
  let section;
  try {
    const report = await checkEmail(domain, lookup);
    section = renderReport(report, wwwDropped ? `We checked ${domain}: email uses your domain without "www".` : null);
    if (report.registered) freeot.hidden = false;
  } catch (err) {
    section = h('section', { class: 'result result-message', role: 'alert' },
      h('h2', { class: 'fo-h3' }, 'Something went wrong'), h('p', { class: 'fo-p' }, `${err.message}. Try again in a minute.`));
  }
  results.replaceChildren(section);
  results.querySelector('#again')?.addEventListener('click', () => run(domain));
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value.trim()) run(input.value);
  else input.focus();
});

// A shared link (…/email-check/#yourbusiness.com) runs the check for that domain, on opening the
// page or when the address after "#" changes. The page's own section links also use "#", so only a
// value that looks like a domain counts. The page's own update of the address (replaceState)
// doesn't count as a change, so a check never runs twice.
function fromAddress() {
  const shared = decodeURIComponent(location.hash.slice(1));
  if (shared.includes('.')) run(shared);
}
window.addEventListener('hashchange', fromAddress);
fromAddress();
