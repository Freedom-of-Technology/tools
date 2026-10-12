// The Ownership Checklist: the accounts every small business should hold in its own name, what the
// owner says about each, and what that adds up to. It asks what the owner knows; nothing here looks
// anything up.
//
//   ACCOUNTS                 -> the rows, in the order the page shows them and the to-do list follows
//   ANSWERS                  -> the answer an owner can give for each row
//   unanswered(answers)      -> the rows with no answer yet
//   tally(answers)           -> { inName, counted, todo: [{ account, answer, advice }], yours: [account] }
//   toHash(answers)          -> the answers as the part of a shared link after "#"
//   fromHash(hash)           -> the answers in a shared link; anything it doesn't know is dropped
//
// answers: { [account id]: one of ANSWERS' ids }.

export const ANSWERS = [
  { id: 'mine', label: 'In my name' },
  { id: 'other', label: 'Someone else\'s' },
  { id: 'unsure', label: 'Not sure' },
  { id: 'none', label: 'Don\'t have one' },
];

// Each row: what it is, and what to do when it's someone else's (other) or the owner isn't sure
// (unsure). A row with `none` advice is one every business needs, such as backups, so not having
// one goes on the to-do list and counts against the score; any other row the business doesn't
// have simply drops out.
export const ACCOUNTS = [
  {
    id: 'domain',
    name: 'Your web address',
    what: 'The account where your web address (yourbusiness.com) is registered, at a company such as GoDaddy, Squarespace or Network Solutions.',
    other: 'Whoever holds this account can let your web address lapse, or point it anywhere. Ask them to move it into an account in your business\'s name; most companies can move a web address between accounts without changing company. Until then, ask for its renewal date.',
    unsure: 'Look up your web address at lookup.icann.org: it names the company it\'s registered with. Then search your email for a renewal receipt from that company, which shows whose account it\'s in.',
  },
  {
    id: 'dns',
    name: 'Your web address\'s settings',
    what: 'The settings that point your web address at your website and email (its DNS). Often kept at the same company, or at Cloudflare.',
    other: 'Whoever holds these settings can send your website and email somewhere else. Ask for them to be moved into your account, or for you to be added with full access.',
    unsure: 'Look up your web address at lookup.icann.org. Under Nameservers, the names show the company: domaincontrol.com is GoDaddy, cloudflare.com is Cloudflare.',
  },
  {
    id: 'email',
    name: 'Your business email',
    what: 'The administrator account for your business email, such as Google Workspace or Microsoft 365.',
    other: 'Every password reset lands in your email, so this one matters most after your web address. Ask whoever set it up to make you a super administrator (Google) or global administrator (Microsoft), then sign in and check you can add and remove people.',
    unsure: 'Sign in to admin.google.com, or admin.microsoft.com, with your business email. If the admin pages open, you\'re an administrator. If not, ask who set up your email.',
  },
  {
    id: 'website',
    name: 'Your website and its hosting',
    what: 'The account your website is built and kept in, such as Wix, Squarespace, a WordPress host, or your web designer\'s.',
    other: 'Ask for the website to be moved into an account in your name, or for an owner login of your own. If it sits in your designer\'s account, ask what happens to it if you stop working together.',
    unsure: 'Ask whoever built your website which company keeps it, and whose account it\'s in. The bottom of your website sometimes names the company.',
  },
  {
    id: 'google',
    name: 'Your Google Business Profile',
    what: 'Your listing on Google Search and Maps.',
    other: 'A profile has one primary owner. Ask whoever that is to add you as an owner, then to make you the primary owner, in the profile\'s settings under People and access. If they won\'t, Google has a way to request ownership.',
    unsure: 'Signed in to your Google account, search Google for your business\'s name. If your profile\'s controls appear, you manage it, and People and access, in its settings, shows who owns it.',
  },
  {
    id: 'social',
    name: 'Your social pages',
    what: 'Your business\'s pages on Facebook, Instagram and the like.',
    other: 'Ask to be added, in your own account, with full control of each page. A page held only by a former employee or an agency can be very hard to get back.',
    unsure: 'Open each page while signed in. If you can change its settings, you have access, and the settings show everyone who does.',
  },
  {
    id: 'payments',
    name: 'Your payments',
    what: 'The account that takes your card payments, such as Square, Stripe or PayPal, and pays out to your bank.',
    other: 'Money moves through this one. It should be in the business\'s name, paying out to the business\'s bank account, with you as owner. Ask the payment company how to change the account owner; most will ask the new owner to prove who they are.',
    unsure: 'Find out which bank account the payouts go to, and whose name the account is in. If you can\'t sign in to see it, ask who set it up.',
  },
  {
    id: 'accounting',
    name: 'Your accounting',
    what: 'Your books, such as QuickBooks or Xero.',
    other: 'Your bookkeeper or accountant can work in your books as someone you invite. The subscription, and the main administrator, should be yours. Ask them to make you the main administrator.',
    unsure: 'Ask your bookkeeper whose account the books are in, and who the main administrator is. The users list in your accounting software\'s settings shows it too.',
  },
  {
    id: 'backups',
    name: 'Your backups',
    what: 'Copies of your email, files and records, kept somewhere other than where you work on them.',
    other: 'A backup only helps if you can reach it when the person who set it up can\'t. Ask for an account of your own on the backup service, or for the backups to be moved into one in your name.',
    unsure: 'Ask yourself: if your computer or your email account were lost today, where is the copy, and how would you get it back? If no one knows, count it as no backup.',
    none: 'Start with what would hurt most to lose, such as your email, your customer records or your books, and keep a copy in an account in your business\'s name.',
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
  },
];

const ANSWER_IDS = new Set(ANSWERS.map((a) => a.id));
const known = (id, answer) => ACCOUNTS.some((a) => a.id === id) && ANSWER_IDS.has(answer);

export function unanswered(answers) {
  return ACCOUNTS.filter((account) => !known(account.id, answers[account.id]));
}

// The score counts the rows the business has, plus the ones every business needs. The to-do list
// keeps the page's order, which starts with the accounts that open the others.
export function tally(answers) {
  const todo = [];
  const yours = [];
  let counted = 0;
  for (const account of ACCOUNTS) {
    const answer = answers[account.id];
    if (answer === 'none' && !account.none) continue;
    counted += 1;
    if (answer === 'mine') yours.push(account);
    else todo.push({ account, answer, advice: account[answer] });
  }
  return { inName: yours.length, counted, todo, yours };
}

export function toHash(answers) {
  return new URLSearchParams(ACCOUNTS.filter((a) => known(a.id, answers[a.id])).map((a) => [a.id, answers[a.id]])).toString();
}

export function fromHash(hash) {
  const answers = {};
  for (const [id, answer] of new URLSearchParams(String(hash ?? '').replace(/^#/, ''))) {
    if (known(id, answer)) answers[id] = answer;
  }
  return answers;
}
