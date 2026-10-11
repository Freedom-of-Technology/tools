# FreeOT free tools

Free tools from [FreeOT](https://freedomoftechnology.com) for business owners, at
**https://freedomoftechnology.com/tools/**. Each one solves one problem right on the page: no email
asked, and nothing typed or uploaded is saved.

| Tool | Address | What it does |
|---|---|---|
| Almanac Check | [/tools/domain-check/](https://freedomoftechnology.com/tools/domain-check/) | Checks a domain's saved DNS records file against what's live on the internet, record by record. |

## Nothing you give a tool is kept

Every tool runs in the browser. What you type or upload is read there and never sent to FreeOT.
There's no tracking, no cookies and nothing stored. Each page lists every outside service it asks,
and the code here is what runs.

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

## Layout

| Path | What it is |
|---|---|
| `public/` | Every file the site serves, at the same path: `public/tools/domain-check/index.html` is `/tools/domain-check/`. No build step. |
| `public/tools/shared/` | What every tool page shares: `tool.css` (the page layout) and `brand/` (FreeOT's color and font settings, fonts and logos, copied from FreeOT's brand kit). |
| `public/tools/domain-check/` | Almanac Check. `check/` is the checking code: `zone.js` reads a records file, `live.js` asks the internet, `compare.js` compares the two. `app.js` is the page. |
| `src/worker.js` | The Cloudflare Worker in front of the files: it redirects Almanac Check's old address, check.freeot.com, and adds the security headers. |
| `wrangler.toml` | How Cloudflare runs the Worker, including the addresses it answers on. |
| `cli/check.mjs` | Almanac Check from the command line. |
| `test/` | Tests. They run the code in `public/`, `src/` and `cli/`, on made-up records files. |

## Working on it

Install once, with Node 24.19.0 (what GitHub's check uses):

    npm ci

Then:

    npm test          # the tests, including the Worker on Cloudflare's own runtime
    npm run dev       # the site at http://localhost:8787/tools/

The checking code talks only to the public services above. The tests use a stand-in for them
(`test/fake-internet.js`), so they don't need the internet.

GitHub runs the tests on every change, and checks that Cloudflare would accept `wrangler.toml`
(`.github/workflows/test.yml`). Every merge to `main` goes live.

## License

The code is under the MIT license (`LICENSE`). The fonts in `public/tools/shared/brand/fonts/` are
under the SIL Open Font License (`OFL.txt` beside each). The FreeOT name and logo belong to FreeOT
and aren't covered by the MIT license.
