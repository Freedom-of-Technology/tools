// The Ownership Checklist: the accounts every small business should hold in its own name, what the
// owner says about each, and the plan that adds up to. It asks what the owner knows; nothing here
// looks anything up.
//
//   ACCOUNTS                    -> the rows, in the order the page shows them and the plan follows
//   STEPS                       -> the rows grouped into the form's steps, in the same order
//   ANSWERS                     -> the answer an owner can give for each row
//   HOLDERS                     -> who holds a row that's someone else's, when the owner says
//   KEY                         -> the rows whose holder can reset the passwords for the rest
//   unanswered(answers)         -> the rows with no answer yet
//   plan(answers, holders)      -> { inName, counted, yours, key, ask, find, setup } (see plan below)
//   message(ask)                -> the message asking one holder for their accounts
//   linkPieces(text)            -> advice split into words and links, for the page to draw
//   toHash(answers, holders)    -> the answers as the part of a shared link after "#"
//   fromHash(hash)              -> { answers, holders } from a shared link; anything unknown is dropped
//
// answers: { [account id]: one of ANSWERS' ids }. holders: { [account id]: one of HOLDERS' ids },
// kept only for a row answered "other".

export const ANSWERS = [
  { id: 'mine', label: 'In my name' },
  { id: 'other', label: 'Someone else\'s' },
  { id: 'unsure', label: 'Not sure' },
  { id: 'none', label: 'Don\'t have one' },
];

// Categories, never names: a shared link carries them, and the page never asks for anyone's name.
// `someone` is also where a row goes when the owner doesn't say who.
export const HOLDERS = [
  { id: 'designer', label: 'A web designer or agency', heading: 'Your web designer or agency' },
  { id: 'staff', label: 'An employee or former employee', heading: 'An employee or former employee' },
  { id: 'family', label: 'A relative or friend', heading: 'A relative or friend' },
  { id: 'someone', label: 'Someone else', heading: 'Whoever holds them' },
];

// Each row: what it is; what to do when it's someone else's (other) or the owner isn't sure
// (unsure); and the line asking its holder for it (ask). A row with `none` advice is one every
// business needs, such as backups, so not having one goes in the plan and counts against the score;
// any other row the business doesn't have simply drops out. Advice can link out as
// [words](https://address).
export const ACCOUNTS = [
  {
    id: 'domain',
    name: 'Your web address',
    what: 'The account where your web address (yourbusiness.com) is registered, at a company such as GoDaddy, Squarespace or Network Solutions, and the details inside it of who it\'s registered to.',
    other: 'Whoever holds this account can let your web address lapse, or point it anywhere. Ask for it to be moved into an account in your business\'s name; most companies can move a web address between accounts without changing company. Then open its contact details: behind the privacy service, the registrant should be your business, with an email you control. Keep the privacy on: it hides your details from the public, not from you. Some companies lock a web address for up to 60 days after its registrant changes, so it can\'t move to another company in that time.',
    unsure: 'Look up your web address at [lookup.icann.org](https://lookup.icann.org): it names the company it\'s registered with, though it usually hides who it\'s registered to. Search your email for a renewal receipt from that company, which shows whose account it\'s in. Signed in there, open the web address\'s contact details: the registrant should be your business, with an email you control.',
    ask: 'Our web address: please move it into an account in the business\'s name, with the business as its registrant, behind the privacy service.',
  },
  {
    id: 'dns',
    name: 'Your web address\'s settings',
    what: 'The settings that point your web address at your website and email (its DNS). Often kept at the same company, or at Cloudflare.',
    other: 'Whoever holds these settings can send your website and email somewhere else. Ask for them to be moved into your account, or for you to be added with full access.',
    unsure: 'Look up your web address at [lookup.icann.org](https://lookup.icann.org). Under Nameservers, the names show the company: domaincontrol.com is GoDaddy, cloudflare.com is Cloudflare.',
    ask: 'Our web address\'s settings (its DNS): please move them into the business\'s account, or add me with full access.',
  },
  {
    id: 'email',
    name: 'Your business email',
    what: 'The administrator account for your business email, such as Google Workspace or Microsoft 365.',
    other: 'Every password reset lands in your email, so this one matters most after your web address. Ask whoever set it up to make you a super administrator (Google) or global administrator (Microsoft), then sign in and check you can add and remove people.',
    unsure: 'Sign in to [admin.google.com](https://admin.google.com), or [admin.microsoft.com](https://admin.microsoft.com), with your business email. If the admin pages open, you\'re an administrator. If not, ask who set up your email.',
    ask: 'Our business email: please make me a super administrator (Google Workspace) or global administrator (Microsoft 365).',
  },
  {
    id: 'website',
    name: 'Your website and its hosting',
    what: 'The account your website is built and kept in, such as Wix, Squarespace, a WordPress host, or your web designer\'s.',
    other: 'Ask for the website to be moved into an account in your name, or for an owner login of your own. If it sits in your designer\'s account, ask what happens to it if you stop working together.',
    unsure: 'Ask whoever built your website which company keeps it, and whose account it\'s in. The bottom of your website sometimes names the company.',
    ask: 'Our website: please move it into an account in the business\'s name, or give me an owner login of my own.',
  },
  {
    id: 'google',
    name: 'Your Google Business Profile',
    what: 'Your listing on Google Search and Maps.',
    other: 'A profile has one primary owner. Ask whoever that is to add you as an owner, then to make you the primary owner, in the profile\'s settings under People and access. If they won\'t, Google has a way to [request ownership](https://support.google.com/business/answer/4566671).',
    unsure: 'Signed in to your Google account, search Google for your business\'s name. If your profile\'s controls appear, you manage it, and People and access, in its settings, shows who owns it.',
    ask: 'Our Google Business Profile: please add me as an owner, then make me the primary owner, under People and access in the profile\'s settings.',
  },
  {
    id: 'social',
    name: 'Your social pages',
    what: 'Your business\'s pages on Facebook, Instagram and the like.',
    other: 'Ask to be added, in your own account, with full control of each page. A page held only by a former employee or an agency can be very hard to get back.',
    unsure: 'Open each page while signed in. If you can change its settings, you have access, and the settings show everyone who does.',
    ask: 'Our social pages: please add my own account to each page, with full control.',
  },
  {
    id: 'payments',
    name: 'Your payments',
    what: 'The account that takes your card payments, such as Square, Stripe or PayPal, and pays out to your bank.',
    other: 'Money moves through this one. It should be in the business\'s name, paying out to the business\'s bank account, with you as owner. Ask the payment company how to change the account owner; most will ask the new owner to prove who they are.',
    unsure: 'Find out which bank account the payouts go to, and whose name the account is in. If you can\'t sign in to see it, ask who set it up.',
    ask: 'Our payments account: please help me make it the business\'s, with me as owner, paying out to the business\'s bank account.',
  },
  {
    id: 'accounting',
    name: 'Your accounting',
    what: 'Your books, such as QuickBooks or Xero.',
    other: 'Your bookkeeper or accountant can work in your books as someone you invite. The subscription, and the main administrator, should be yours. Ask them to make you the main administrator.',
    unsure: 'Ask your bookkeeper whose account the books are in, and who the main administrator is. The users list in your accounting software\'s settings shows it too.',
    ask: 'Our accounting: please make me the main administrator. You can keep working in the books as someone I invite.',
  },
  {
    id: 'backups',
    name: 'Your backups',
    what: 'Copies of your email, files and records, kept somewhere other than where you work on them.',
    other: 'A backup only helps if you can reach it when the person who set it up can\'t. Ask for an account of your own on the backup service, or for the backups to be moved into one in your name.',
    unsure: 'Ask yourself: if your computer or your email account were lost today, where is the copy, and how would you get it back? If no one knows, count it as no backup.',
    none: 'Start with what would hurt most to lose, such as your email, your customer records or your books, and keep a copy in an account in your business\'s name.',
    ask: 'Our backups: please give me an account of my own on the backup service, or move the backups into one in the business\'s name.',
  },
  {
    // Named logins, not passwords: a link holding "passwords=" looks like a leaked secret to
    // the software that scans for them.
    id: 'logins',
    name: 'Your passwords',
    what: 'Where the business\'s logins and recovery codes are kept, such as a password manager.',
    other: 'If one person holds every login, the business is locked out when they leave. Keep the business\'s logins in a password manager the business owns, shared with the people who need them.',
    unsure: 'If the logins live in one person\'s head, a browser or a notebook, that\'s the answer: there\'s no shared place yet.',
    none: 'Set up a password manager in your business\'s name, such as 1Password or Bitwarden, and move the logins for everything above into it, with their recovery codes.',
    ask: 'The business\'s logins: please help me move them into a password manager the business owns, shared with me there.',
  },
];

export const STEPS = [
  { name: 'Your web address and email', ids: ['domain', 'dns', 'email'] },
  { name: 'Your website and listings', ids: ['website', 'google', 'social'] },
  { name: 'Your money and records', ids: ['payments', 'accounting', 'backups', 'logins'] },
];

export const KEY = ['domain', 'email'];

const ANSWER_IDS = new Set(ANSWERS.map((a) => a.id));
const HOLDER_IDS = new Set(HOLDERS.map((h) => h.id));
const known = (id, answer) => ACCOUNTS.some((a) => a.id === id) && ANSWER_IDS.has(answer);

export function unanswered(answers) {
  return ACCOUNTS.filter((account) => !known(account.id, answers[account.id]));
}

// The plan, every part in the checklist's order, which starts with the accounts that open the others:
//   key    -> the KEY rows the business has that aren't in the owner's name yet
//   ask    -> [{ holder, items: [{ account, advice }] }]: someone else's, one entry per holder
//   find   -> [{ account, advice }]: rows the owner isn't sure about
//   setup  -> [{ account, advice }]: rows every business needs that this one doesn't have
// The score counts the rows the business has, plus the ones every business needs.
export function plan(answers, holders = {}) {
  const yours = [];
  const key = [];
  const ask = [];
  const find = [];
  const setup = [];
  let counted = 0;
  for (const account of ACCOUNTS) {
    const answer = answers[account.id];
    if (answer === 'none' && !account.none) continue;
    counted += 1;
    if (answer === 'mine') {
      yours.push(account);
      continue;
    }
    if (KEY.includes(account.id)) key.push(account);
    const item = { account, advice: account[answer] };
    if (answer === 'other') {
      const holder = HOLDERS.find((h) => h.id === holders[account.id]) ?? HOLDERS.at(-1);
      const entry = ask.find((a) => a.holder === holder);
      if (entry) entry.items.push(item);
      else ask.push({ holder, items: [item] });
    } else if (answer === 'unsure') find.push(item);
    else setup.push(item);
  }
  return { inName: yours.length, counted, yours, key, ask, find, setup };
}

export function message({ items }) {
  return [
    'Hi,',
    'I\'m making sure every account the business runs on is in the business\'s own name, so nothing depends on any one person. Could you help with these?',
    items.map(({ account }) => `- ${account.ask}`).join('\n'),
    'Please don\'t send me any passwords: moving the account, or an owner login of my own, is all I need.',
    'Thank you for setting these up for us.',
  ].join('\n\n');
}

export function linkPieces(text) {
  const pieces = [];
  let at = 0;
  for (const match of String(text).matchAll(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g)) {
    if (match.index > at) pieces.push({ text: text.slice(at, match.index) });
    pieces.push({ text: match[1], href: match[2] });
    at = match.index + match[0].length;
  }
  if (at < text.length) pieces.push({ text: text.slice(at) });
  return pieces;
}

// A row someone else holds carries who, as `<id>-by`. Links made before the checklist asked who
// have no `-by`, and open with those rows under `someone`.
export function toHash(answers, holders = {}) {
  const pairs = [];
  for (const account of ACCOUNTS) {
    const answer = answers[account.id];
    if (!known(account.id, answer)) continue;
    pairs.push([account.id, answer]);
    if (answer === 'other' && HOLDER_IDS.has(holders[account.id])) pairs.push([`${account.id}-by`, holders[account.id]]);
  }
  return new URLSearchParams(pairs).toString();
}

export function fromHash(hash) {
  const params = new URLSearchParams(String(hash ?? '').replace(/^#/, ''));
  const answers = {};
  const holders = {};
  for (const account of ACCOUNTS) {
    const answer = params.get(account.id);
    if (!known(account.id, answer)) continue;
    answers[account.id] = answer;
    const holder = params.get(`${account.id}-by`);
    if (answer === 'other' && HOLDER_IDS.has(holder)) holders[account.id] = holder;
  }
  return { answers, holders };
}
