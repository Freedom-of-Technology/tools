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
// `someone` is also where a row goes when the owner doesn't say who. Links made when `staff` meant
// "an employee or former employee" open as an employee.
//
// Each holder's message is written for who they are to the owner (message below). Where a sentence
// depends on how many accounts it asks for, it's a pair: [one account, more than one]. `request`
// introduces a list of accounts; a message about one account asks for it on its own. `before` is a
// note shown above the message, for a holder the owner may have an agreement with.
export const HOLDERS = [
  {
    id: 'designer',
    label: 'A web designer or agency',
    heading: 'Your web designer or agency',
    before: 'Still working with them, or have a bill open with them? Check your agreement before you send this: it may say what\'s handed over to you, and when.',
    greeting: 'Hi,',
    opening: 'I\'m getting every account the business runs on into the business\'s own name, so nothing depends on any one person. It\'s something I\'m doing for all our accounts, not just the ones you look after.',
    request: 'Could you help with these?',
    closing: 'You\'re welcome to keep access for the work you do for us. No need to send any passwords: an account or login of my own is all I need.',
    signoff: 'Thanks,',
  },
  {
    id: 'staff',
    label: 'An employee',
    heading: 'An employee',
    greeting: 'Hi,',
    opening: 'I\'m putting every account the business runs on in the business\'s own name, so nothing depends on any one of us.',
    request: 'Could you help with these when you have a moment?',
    closing: 'You\'ll keep the access you need for your work. Please don\'t send me any passwords: a login of my own is all I need.',
    signoff: 'Thanks,',
  },
  {
    id: 'former',
    label: 'A former employee',
    heading: 'A former employee',
    greeting: 'Hi,',
    opening: ['I hope you\'re doing well. I\'m tidying up the business\'s accounts, and one is still set up under you.',
      'I hope you\'re doing well. I\'m tidying up the business\'s accounts, and a few are still set up under you.'],
    request: 'Could you help me move them over?',
    closing: ['Once that\'s done, you can take yourself off it, so none of it is on you anymore. Please don\'t send me any passwords: a login of my own is all I need.',
      'Once that\'s done, you can take yourself off them, so none of it is on you anymore. Please don\'t send me any passwords: a login of my own is all I need.'],
    signoff: 'Thank you for your help.',
  },
  {
    id: 'family',
    label: 'A relative or friend',
    heading: 'A relative or friend',
    greeting: 'Hi,',
    opening: 'Thank you again for setting up the business\'s accounts for me. I\'m getting them into the business\'s own name now, so it doesn\'t all depend on you.',
    request: 'Could you help me with these when you get a chance?',
    closing: 'No need to send me any passwords. Once I\'m added, I can take it from there.',
    signoff: 'Thank you!',
  },
  {
    id: 'someone',
    label: 'Someone else',
    heading: 'Whoever holds them',
    before: 'If you have an agreement with them, such as with an IT company, check it before you send this: it may say what\'s handed over to you, and when.',
    greeting: 'Hello,',
    opening: ['I\'m making sure every account the business runs on is in the business\'s own name. As far as I know, this one is set up under you.',
      'I\'m making sure every account the business runs on is in the business\'s own name. As far as I know, the ones below are set up under you.'],
    request: 'Could you help move them over?',
    closing: 'Please don\'t send any passwords: an account or login of my own is all I need.',
    signoff: 'Thank you,',
  },
];

// Each row: what it is; what to do when it's someone else's (other) or the owner isn't sure
// (unsure); and the line asking its holder for it (ask). A row with `none` advice is one every
// business needs, such as backups, so not having one goes in the plan and counts against the score;
// any other row the business doesn't have simply drops out. What can go wrong while it moves is in
// `pitfalls`, for the guide; a mistake that can't be undone is `lasting`, shown in the plan too.
// Advice can link out as [words](https://address).
export const ACCOUNTS = [
  {
    id: 'domain',
    name: 'Your web address',
    what: 'The account where your web address (yourbusiness.com) is registered, at a company such as GoDaddy, Squarespace or Network Solutions, and the details inside it of who it\'s registered to.',
    other: 'Whoever holds this account can let your web address lapse, or point it anywhere. Ask for it to be moved into an account in your business\'s name; most companies can move a web address between accounts without changing company. Then open its contact details: behind the privacy service, the registrant should be your business, with an email you control. Keep the privacy on: it hides your details from the public, not from you. Some companies lock a web address for up to 60 days after its registrant changes, so it can\'t move to another company in that time.',
    unsure: 'Look up your web address at [lookup.icann.org](https://lookup.icann.org): it names the company it\'s registered with, though it usually hides who it\'s registered to. Search your email for a renewal receipt from that company, which shows whose account it\'s in. Signed in there, open the web address\'s contact details: the registrant should be your business, with an email you control.',
    ask: 'Our web address: could you move it into an account in the business\'s name, with the business as its registrant? The privacy service can stay on.',
    lasting: 'Renew it before anything moves. A move to another company fails if the address expires partway through, and an address left to expire can be registered by someone else.',
    pitfalls: [
      'If it\'s moving to another company too, move it first and change whose name it\'s in afterward: changing the name can lock it at its company for 60 days. Some companies let you skip the lock; ask before you change it. [ICANN\'s transfer rules](https://www.icann.org/en/contracted-parties/accredited-registrars/resources/domain-name-transfers/policy)',
      'The company it\'s registered with must give you its transfer code within 5 days of asking. [ICANN: a guide for web address holders](https://www.icann.org/resources/pages/name-holder-faqs-2017-10-10-en)',
    ],
  },
  {
    id: 'dns',
    name: 'Your web address\'s settings',
    what: 'The settings that point your web address at your website and email (its DNS). Often kept at the same company, or at Cloudflare.',
    other: 'Whoever holds these settings can send your website and email somewhere else. Ask for them to be moved into your account, or for you to be added with full access.',
    unsure: 'Look up your web address at [lookup.icann.org](https://lookup.icann.org). Under Nameservers, the names show the company: domaincontrol.com is GoDaddy, cloudflare.com is Cloudflare.',
    ask: 'Our web address\'s settings (its DNS): could you move them into the business\'s account, or add me with full access?',
    lasting: 'Before the settings move to another company, copy every record across, the ones for email included. Anything missed stops working, and email sent to you in the meantime bounces back to whoever sent it.',
    pitfalls: [
      'Google lists every record your email needs, for checking nothing was missed. [Google: email with another DNS company](https://knowledge.workspace.google.com/admin/domains/set-up-google-workspace-with-a-third-party-dns-host)',
      'If a security setting called DNSSEC is on, turn it off at the company your web address is registered with before the move, or your web address can stop working. [Cloudflare: moving your DNS](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)',
    ],
  },
  {
    id: 'email',
    name: 'Your business email',
    what: 'The administrator account for your business email, such as Google Workspace or Microsoft 365.',
    other: 'Every password reset lands in your email, so this one matters most after your web address. Ask whoever set it up to make you a super administrator (Google) or global administrator (Microsoft), then sign in and check you can add and remove people.',
    unsure: 'Sign in to [admin.google.com](https://admin.google.com), or [admin.microsoft.com](https://admin.microsoft.com), with your business email. If the admin pages open, you\'re an administrator. If not, ask who set up your email.',
    ask: 'Our business email: could you make me a super administrator (Google Workspace) or global administrator (Microsoft 365)?',
    lasting: 'Before anyone\'s email account is removed, move their email and files somewhere you keep. Google Workspace can bring a removed account back for only 20 days. [Google: removing a user](https://knowledge.workspace.google.com/admin/users/delete-or-remove-a-user-from-your-organization)',
    pitfalls: [
      'Check your own administrator login works before removing anyone else\'s, and keep a second administrator you trust. [Google: administrator accounts](https://knowledge.workspace.google.com/admin/users/security-best-practices-for-administrator-accounts)',
      'If your email was bought through a reseller or an IT company, they can still reach your admin pages until you turn that off. [Google: a reseller\'s access](https://knowledge.workspace.google.com/admin/billing/change-a-resellers-access-to-your-admin-console) and [Microsoft: removing a partner\'s admin roles](https://learn.microsoft.com/en-us/partner-center/customers/customers-revoke-admin-privileges)',
    ],
  },
  {
    id: 'website',
    name: 'Your website and its hosting',
    what: 'The account your website is built and kept in, such as Wix, Squarespace, a WordPress host, or your web designer\'s.',
    other: 'Ask for the website to be moved into an account in your name, or for an owner login of your own. If it sits in your designer\'s account, ask what happens to it if you stop working together.',
    unsure: 'Ask whoever built your website which company keeps it, and whose account it\'s in. The bottom of your website sometimes names the company.',
    ask: 'Our website: could you move it into an account in the business\'s name, or give me an owner login of my own?',
    pitfalls: [
      'A Wix or Squarespace website can move to your own account on the same service, but not to another company. [Wix: moving a site to another account](https://support.wix.com/en/article/transferring-a-premium-site-to-another-wix-account) and [Squarespace: changing the owner](https://support.squarespace.com/hc/en-us/articles/206537197-Change-the-site-owner)',
      'Who owns the website\'s design and code can depend on your agreement with whoever made it. See Agreements and open bills, above.',
    ],
  },
  {
    id: 'google',
    name: 'Your Google Business Profile',
    what: 'Your listing on Google Search and Maps.',
    other: 'A profile has one primary owner. Ask whoever that is to add you as an owner, then, a week later, to make you the primary owner, in the profile\'s settings under People and access. Google makes new owners wait 7 days. If they won\'t, Google has a way to [request ownership](https://support.google.com/business/answer/4566671).',
    unsure: 'Signed in to your Google account, search Google for your business\'s name. If your profile\'s controls appear, you manage it, and People and access, in its settings, shows who owns it.',
    ask: 'Our Google Business Profile: could you add me as an owner, and a week later make me the primary owner? Google makes new owners wait 7 days. Both are under People and access in the profile\'s settings.',
    pitfalls: [
      'Google makes a new owner wait 7 days before they can become primary owner, so it takes two steps a week apart. [Google: transferring primary ownership](https://support.google.com/business/answer/3415281)',
      'Anyone who manages a profile for a business, such as an agency, must hand ownership back as soon as the business asks. [Google: ownership guidelines](https://support.google.com/business/answer/13763036)',
      'If no one answers Google\'s ownership request within 3 days, a way to claim the profile may appear, though not always. A business without a shop or office contacts Google support instead. [Google: requesting ownership](https://support.google.com/business/answer/4566671)',
    ],
  },
  {
    id: 'social',
    name: 'Your social pages',
    what: 'Your business\'s pages on Facebook, Instagram and the like.',
    other: 'Ask to be added, in your own account, with full control of each page. A page held only by a former employee or an agency can be very hard to get back.',
    unsure: 'Open each page while signed in. If you can change its settings, you have access, and the settings show everyone who does.',
    ask: 'Our social pages: could you add my own account to each one, with full control?',
    pitfalls: [
      'If a page sits in someone else\'s business account and they can\'t be reached, getting it back through Meta can take from two weeks to over six months. Ask while you can still reach them. [Meta: getting back into a page](https://www.facebook.com/government-nonprofits/blog/regaining-access-to-your-page)',
      'Once a page is yours, check who else can still get in: people who had access before keep it until you remove them. [Meta: adding a page to your business account](https://www.facebook.com/business/help/720478807965744)',
    ],
  },
  {
    id: 'payments',
    name: 'Your payments',
    what: 'The account that takes your card payments, such as Square, Stripe or PayPal, and pays out to your bank.',
    other: 'Money moves through this one. It should be in the business\'s name, paying out to the business\'s bank account, with you as owner. Ask the payment company how to change the account owner; most will ask the new owner to prove who they are.',
    unsure: 'Find out which bank account the payouts go to, and whose name the account is in. If you can\'t sign in to see it, ask who set it up.',
    ask: 'Our payments account: could you help me make it the business\'s, with me as owner and payouts going to the business\'s bank account?',
    pitfalls: [
      'Not every payment account can change owner: Square, for one, won\'t move an account when a business is sold. Ask the payment company how it\'s done before anything changes. [Square: transferring ownership](https://squareup.com/help/us/en/article/7675-transfer-ownership-of-your-square-account) and [Stripe: changing the owner](https://support.stripe.com/questions/change-the-owner-of-a-stripe-account)',
      'A payout already on its way when the bank account changes still goes to the old one. [Stripe: late and missing payouts](https://support.stripe.com/questions/where-is-my-payout-faq-for-late-and-missing-payouts)',
    ],
  },
  {
    id: 'accounting',
    name: 'Your accounting',
    what: 'Your books, such as QuickBooks or Xero.',
    other: 'Your bookkeeper or accountant can work in your books as someone you invite. The subscription, and the main administrator, should be yours. Ask them to make you the main administrator.',
    unsure: 'Ask your bookkeeper whose account the books are in, and who the main administrator is. The users list in your accounting software\'s settings shows it too.',
    ask: 'Our accounting: could you make me the main administrator? You can keep working in the books as someone I invite.',
    pitfalls: [
      'If your accountant pays for your QuickBooks through their discount, moving off it means paying full price, and your books can be viewed but not changed until you add your own billing. Nothing is lost. [Intuit: the accountant discount](https://quickbooks.intuit.com/learn-support/en-us/help-article/manage-client/manage-wholesale-discount-plan-wholesale-discount/L13MoEwj6_US_en_US)',
      'If the main administrator has left and can\'t be reached, Intuit can hand it over after checking your documents. [Intuit: changing the main administrator](https://quickbooks.intuit.com/learn-support/en-us/help-article/primary-administrator/change-primary-admin-user-quickbooks-online/L9TU91iOk_US_en_US)',
      'In Xero, only the subscriber can move the subscription to you. [Xero: transferring the subscription](https://central.xero.com/0/article/Transfer-resend-or-cancel-the-subscription-for-your-organisation)',
    ],
  },
  {
    id: 'backups',
    name: 'Your backups',
    what: 'Copies of your email, files and records, kept somewhere other than where you work on them.',
    other: 'A backup only helps if you can reach it when the person who set it up can\'t. Ask for an account of your own on the backup service, or for the backups to be moved into one in your name.',
    unsure: 'Ask yourself: if your computer or your email account were lost today, where is the copy, and how would you get it back? If no one knows, count it as no backup.',
    none: 'Start with what would hurt most to lose, such as your email, your customer records or your books, and keep a copy in an account in your business\'s name.',
    ask: 'Our backups: could you give me an account of my own on the backup service, or move them into one in the business\'s name?',
    lasting: 'If whoever set up your backups holds their encryption key, no one can restore them without it, the backup company included. Ask for the key too, and keep it in your password manager. [Backblaze: a forgotten encryption key](https://www.backblaze.com/computer-backup/docs/resolve-a-forgotten-private-encryption-key)',
    pitfalls: [],
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
    ask: 'The business\'s logins: could you help me move them into a password manager the business owns?',
    lasting: 'Removing someone from a business password manager can delete what\'s in their own vault. Move the business\'s logins into a shared vault first. [1Password: when someone leaves](https://support.1password.com/offboarding/)',
    pitfalls: [
      'Keep the backup codes for your administrator accounts somewhere other than one person\'s phone. [Google: recovering a locked administrator account](https://knowledge.workspace.google.com/admin/security/recover-an-account-protected-by-2-step-verification)',
    ],
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

// Written for who the holder is to the owner. One account is asked for on its own; more than one
// come as a list after the holder's request.
export function message({ holder, items }) {
  const one = items.length === 1;
  const pick = (text) => (Array.isArray(text) ? text[one ? 0 : 1] : text);
  return [
    holder.greeting,
    pick(holder.opening),
    one ? items[0].account.ask : `${holder.request}\n\n${items.map(({ account }) => `- ${account.ask}`).join('\n')}`,
    pick(holder.closing),
    holder.signoff,
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
