# FreeOT free tools

Free tools from [FreeOT](https://freedomoftechnology.com) for business owners, at
**https://freedomoftechnology.com/tools/**. Each one solves one problem right on the page: no email
asked, and nothing typed or uploaded is saved.

| Tool | Address | What it does |
|---|---|---|
| The Ownership Checklist | [/tools/ownership-checklist/](https://freedomoftechnology.com/tools/ownership-checklist/) | Ten accounts every small business should hold in its own name: the owner says who holds each, and the page lists what to move into their name, and how. |
| Almanac Check | [/tools/domain-check/](https://freedomoftechnology.com/tools/domain-check/) | Checks a domain's saved DNS records file against what's live on the internet, record by record. |
| Email protection check | [/tools/email-check/](https://freedomoftechnology.com/tools/email-check/) | Says whether someone can send email pretending to be a domain: its SPF, DKIM and DMARC records, and when its registration runs out. |
| Contact card maker | [/tools/contact-card/](https://freedomoftechnology.com/tools/contact-card/) | Turns contact details, and a logo if wanted, into a "Scan to save" QR code, a card picture for a phone and a contact file. |
| Review link maker | [/tools/review-link/](https://freedomoftechnology.com/tools/review-link/) | Turns a business's Google review link, and a logo if wanted, into a QR code and a 5x7 counter card. |

## Nothing you give a tool is kept

Every tool runs in the browser. What you type or upload is read there and never sent to FreeOT.
There's no tracking, no cookies and nothing stored. Each page lists every outside service it asks,
and the code here is what runs.

## The Ownership Checklist

An owner says who holds each of ten accounts: their web address and its settings, email, website,
Google Business Profile, social pages, payments, accounting, backups and passwords. The page scores
how many are in their name and lists what to do about the rest, in the checklist's order, which
starts with the accounts that open the others. It asks what the owner knows and looks nothing up.

- **Nothing is sent anywhere.** The answers stay in the browser, and `connect-src 'none'` blocks the
  page from connecting anywhere.
- **A result can be shared.** The answers ride after the `#` in the address, which browsers never
  send. `check/accounts.js` reads only the rows and answers it knows from a shared link.
- **A business isn't marked down for what it doesn't use,** such as accounting software. Backups and
  passwords are the exception: every business needs them, so not having one goes on the list.

## Almanac Check

Business owners drop in the records file for a domain: one saved from GoDaddy or Cloudflare, or one
from an almanac FreeOT keeps for a client. The page says, record by record, whether it still matches
what's live, and what to do when it doesn't.

### What it asks, and whom

- **Google Public DNS** (`dns.google`), for each name and record type in the file. It asks Google
  not to pass on which area the question came from. Like any lookup, Google sees the names asked
  about and the address the question came from.
- **IANA's list of registries** (`data.iana.org`), to find who runs the domain's ending (.com,
  .org...).
- **That registry's public RDAP service**, for the domain's name servers and DNSSEC setting. The
  registry is where a name server change actually happens; ordinary lookups can show the old ones
  for up to two days after a move.

Before anything is asked, a file that looks like it holds a secret (a private key, a known token
format, or a line like `password: ...`) is refused.

### What it checks

- Every record in the file against live DNS: matches, different (with both values), or missing.
- Records behind Cloudflare's orange cloud, and GoDaddy's "WebsiteBuilder Site" records: these hide
  their real target, so the page checks that the name answers.
- The name servers and DNSSEC setting in the file's header, against the registry.
- Each `; paste:` note (a long value written out in one piece for copying) says exactly what the
  record under it says.

It can't see names that are live but missing from the file. DNS doesn't list a domain's names; the
DNS company's export does.

It reads FreeOT's almanac files, Cloudflare's export, and GoDaddy's export as they come, including
GoDaddy's quirks: `A WebsiteBuilder Site`, `CNAME @`, its SOA and NS lines, and its email record
split into two (`._spfm`).

### From the command line

The same check, for FreeOT and for the check GitHub runs on each almanac. It needs Node 22 or later
and nothing else, and runs the page's own checking code:

    node cli/check.mjs ../almanac/dns
    node cli/check.mjs ../almanac/dns/freeot.com.zone --ns woz.ns.cloudflare.com
    node cli/check.mjs ../almanac/dns --secrets ../almanac

A folder means every `.zone` file in it. It exits with 1 when anything needs a look, or when a file
looks like it holds a secret (refused before anything about it is asked).

`--ns` asks that server for the records instead of Google Public DNS: for checking a new DNS
company's copy before the domain's name servers are switched to it. The registry isn't asked then,
since it still names the old company until the switch.

`--secrets` also looks for secrets in every other file in that folder, such as an almanac's guides.
Another repository checked out inside it is left out.

## Email protection check

An owner types their web address (or an email address, or a page's full address), and the page
answers "Can someone send email pretending to be you?" in plain words, then shows each check with
what's live and how to fix it. A result can be shared: the domain rides after the `#` in the
address, which browsers never send to the server.

### What it checks

- **DMARC** (`_dmarc.<domain>`): missing, more than one, watching only (`p=none`), or sending fakes
  to spam or refusing them; part coverage (`pct`) and no reports (`rua`).
- **SPF**: missing, more than one, an ending that lets anyone send (`+all`) or says nothing
  (`?all`), more than ten lookups (counted through every `include:`), and GoDaddy's
  `include:secureserver.net` left behind after email moved elsewhere.
- **DKIM**: looks for a key at the names the domain's email service uses (from its MX records:
  Google Workspace, Microsoft 365) and at common names. Microsoft 365 always uses the same two
  names, so nothing there means DKIM is off; anywhere else, a key may sit at a name the page can't
  guess, and the page says so rather than call it missing.
- **Registration**: when it runs out, from the registry; flagged within 30 days.

### What it asks, and whom

The same three public services as Almanac Check: Google Public DNS for the domain's MX and TXT
records, its DMARC record, a few DKIM names and the names its SPF record includes; IANA's list of
registries; and the domain's registry, for the registration's end date.

## Contact card maker

An owner types their name, business, job title, phone, email and website, and can add a logo. The
page makes a "Scan to save" QR code that holds the contact itself as a vCard, so it works with no
server and never expires, plus a phone-sized card picture with the logo, and a `.vcf` contact file.

- **Nothing is sent anywhere.** The details and the logo are read in the browser, and the files are
  made there. The page's own security settings (`connect-src 'none'`) block it from connecting
  anywhere. Nothing is hosted either, so no one can use the tool to put words on FreeOT's site.
- **Every code is test-scanned before it's offered.** The finished picture, logo and all, is read
  back with jsQR and must hold exactly the contact typed, byte for byte.
- **A large logo is copied down** in the browser to 1,200 pixels on its longest side (a JPG stays a
  JPG), and every file uses the copy, so the downloads stay small. An SVG logo stays as drawn
  unless the file is over 1 MB. The rules are in `public/tools/shared/logo/rules.js`.
- **A logo in the middle of the code** is optional. The code then uses the highest error
  correction (H, which can lose 30%), and the logo covers a fifth of its width.

The QR code comes from qrcode-generator and the test-scan from jsQR, kept as published in
`public/tools/shared/qr/vendor/`, one pinned version each (its `README.md` lists them).

## Review link maker

An owner pastes the review link Google gives them (Business Profile, Read reviews, then Get more
reviews), types their business name, and can add a logo. The page makes a QR code that holds that
link, and a 5x7 counter card (1500 by 2100 pixels, 300 to the inch) with the name, the logo and the
code.

- **Only a link to Google is taken.** A code on a counter is scanned without being read, so
  `card/link.js` refuses anything that isn't on one of Google's addresses, and says why. The link is
  used exactly as Google gave it, with `https://` added if it was left off; the page never builds
  a link of its own.
- **Nothing is sent anywhere,** as with the contact card maker: `connect-src 'none'`, and the page
  doesn't check the link with Google. **Try your link** opens it only when the owner chooses it.
- **Every code is test-scanned** and must hold exactly the link. The logo works as it does in the
  contact card maker, with the same shared code (`public/tools/shared/logo/`).

## Layout

| Path | What it is |
|---|---|
| `public/` | Every file the site serves, at the same path: `public/tools/domain-check/index.html` is `/tools/domain-check/`. No build step. |
| `public/tools/shared/` | What every tool page shares: `tool.css` (the page layout, the tools menu and result cards), `live.js` (the public lookups: Google Public DNS, IANA and the registry), `page.js` (showing a result and offering its files), `column.js` (drawing a card picture), `maker.css` (the form and downloads of the tools that make something) and `brand/` (FreeOT's color and font settings, fonts and logos, copied from FreeOT's brand kit). |
| `public/tools/domain-check/` | Almanac Check. `check/` is the checking code: `zone.js` reads a records file, `compare.js` compares it with what's live. `app.js` is the page. |
| `public/tools/email-check/` | The email protection check. `check/email.js` is the checking code; `app.js` is the page. |
| `src/worker.js` | The Cloudflare Worker in front of the files: it redirects Almanac Check's old address, check.freeot.com, and adds the security headers. |
| `wrangler.toml` | How Cloudflare runs the Worker, including the addresses it answers on. |
| `public/tools/ownership-checklist/` | The Ownership Checklist. `check/accounts.js` holds the rows, the score, the to-do list and the shared link; `app.js` is the page. |
| `public/tools/contact-card/` | The contact card maker. `card/vcard.js` writes the contact; `app.js` is the page, including the card picture. |
| `public/tools/review-link/` | The review link maker. `card/link.js` checks the review link; `app.js` is the page, including the counter card. |
| `public/tools/shared/logo/` | A logo the visitor adds, for the tools that take one: `rules.js` (which files, and when to make a smaller copy) and `read.js` (the copy, drawing it, and the "Choose your logo" picker). |
| `public/tools/shared/qr/` | QR codes for the tools that make them: `qr.js` makes, draws and test-scans a code, on the libraries in `vendor/`; `picture.js` draws it in the browser and test-scans the finished picture. |
| `cli/check.mjs` | Almanac Check from the command line. |
| `scripts/fingerprints.mjs` | Writes into each page a fingerprint of every script and style it loads (see below). |
| `test/` | Tests. They run the code in `public/`, `src/`, `cli/` and `scripts/`, on made-up records files and contacts. |

## Working on it

Install once, with Node 24.19.0 (what GitHub's check uses):

    npm ci

Then:

    npm test          # the tests, including the Worker on Cloudflare's own runtime
    npm run dev       # the site at http://localhost:8787/tools/
    npm run fingerprints   # after changing any script or style

The checking code talks only to the public services above. The tests use a stand-in for them
(`test/fake-internet.js`), so they don't need the internet.

With no build step, the tools menu at the top of each page is written out on every page. A new
tool goes into the menu on every page, and onto `/tools` under its category; a test fails until
they all match.

Each page carries a fingerprint (an SRI hash) of every script and style it loads: an `integrity`
attribute on its own tags, and an import map listing the files its scripts import. The browser
refuses any file that doesn't match, so comparing a page's source with GitHub checks everything it
runs. After changing a script or style, run `npm run fingerprints`; a test fails until you do.

GitHub runs the tests on every change, and checks that Cloudflare would accept `wrangler.toml`
(`.github/workflows/test.yml`). Every merge to `main` goes live.

## License

The code is under the MIT license (`LICENSE`). The fonts in `public/tools/shared/brand/fonts/` are
under the SIL Open Font License (`OFL.txt` beside each). The libraries in
`public/tools/shared/qr/vendor/` keep their own licenses, beside them: MIT for qrcode-generator,
Apache 2.0 for jsQR. The FreeOT name and logo belong to FreeOT
and aren't covered by the MIT license.
