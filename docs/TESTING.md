# Testing

How tests are written and checked in this repository: what each level covers, what stands in for
what the repository doesn't own, and the checks on the tests themselves.

## Levels

- **The tools' own logic** (`public/tools/*/check/`, `card/`, `shared/logo/rules.js`,
  `shared/qr/qr.js`) is plain JavaScript with no page around it, so the tests import and run it
  directly in Node, through the functions each page's `app.js` calls.
- **The pages as served** (`test/pages.test.js`): every page's links, the tools menu on every
  page, the fingerprints and the light and dark setting, read from `public/` as Cloudflare
  serves it.
- **The Worker** (`test/worker.test.js`) runs on Cloudflare's own runtime, started by Wrangler
  with `wrangler.toml`, `src/worker.js` and the files in `public/`.
- **The command line** (`test/cli.test.js`) runs `main()` from `cli/check.mjs` with the
  arguments GitHub's check on an almanac passes.
- **What only a browser does** (each page's `app.js`: drawing the result, the copy buttons,
  reading a logo) has no automated test. It's checked by hand in a browser, at computer and phone
  width, before a PR merges.

## Stand-ins

Each is named as a stand-in where it's defined.

- `test/fake-internet.js` stands in for the network: Google Public DNS over HTTPS, IANA's list of
  registries, a registry's RDAP service, and plain web pages. It answers in the shape each real
  service uses.
- `FakeResolver` in `test/cli.test.js` stands in for `node:dns`'s Resolver, for asking a named
  DNS server.

The QR test-scan is not a stand-in: the tests load the same vendored jsQR file the pages load.

## Versions

- Node 24.19.0, in GitHub's check and on every machine (`README.md`, Working on it).
- Wrangler, and through it Cloudflare's runtime for the Worker tests, as pinned in
  `package.json`. Cloudflare picks its own runtime release in production, so the live Worker
  can run a newer one than the tests.
- The pages run in visitors' browsers, which can't be pinned.

## Data

Made-up businesses and domains only, such as Maple Street Bakery. Sample records files live in
`test/files/`.

## The checks on the tests

`npm run tells` (`scripts/test-tells.mjs`) fails on the same test name in two files, a refusal
asserted without what the error says, and a test importing code that no page script, Worker,
command line or script imports. Code written ahead of its caller is marked with a
`// no_caller_yet: <why>` comment on the test's import line.

On a pull request, GitHub's check runs the base branch's tests for their names and fails the PR if
its Tests section's `Net:` line doesn't match the change in tests.

## Commands

    npm test               # every test, including the Worker on Cloudflare's runtime
    npm run tells          # after npm test: the checks on the tests themselves
    npm run fingerprints   # after changing a script or style; a test fails until you do
