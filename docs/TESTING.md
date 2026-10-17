# Testing

The one ruleset for tests, in every repository. Every rule agreed in any test audit is
written here, once. Each repository's `docs/TESTING.md` opens with a
word-for-word copy of this file, then says how that repository applies the rules: its
levels, its stand-ins, its commands. A copy is never edited in place: change this file, then
update every copy in the same session.

A test earns its place by failing when something a person relies on breaks. Coverage does not
count, test counts do not count, and neither does restating the code's own tables.

## 1. Name the failure first
- Before writing a test, write one sentence naming the real-world failure it prevents: who is
  affected, and how. That sentence is the test's name or docstring. If you cannot write it, do
  not write the test.
- `assert IDLE_TIMEOUT == timedelta(minutes=15)` restates a constant. *A session idle for 15
  minutes is refused* is the test.
- **Find the nearest existing test first, before writing any of the new one.** Search the suite
  for a test of the same rule, at any level and in any file, and read what it asserts. If one
  already catches the failure, extend it, or add a row or a parameter to it. Write a new test only
  when none does. The search comes before the test is written, never at PR time: by then the
  duplicate is written.
- **A second copy of code brings a second copy of its test.** When new code repeats what existing
  code already does, such as making the same record or applying the same check, share the code
  first, so the existing test covers both ways in.

## 2. Test through the real path
- Test at the lowest level that reaches the real thing. Anything a user would notice goes
  through the real entry point. Rules the database enforces go against the real engine, never a
  mock of it. Unit tests are for pure logic with real branches.
- **Execute the real code, never a recreation of it.** A test runs the code in the repo: the
  function, the query, the handler, the validator, the config it reads. Rebuilding any of it in
  the test tests the test's own copy. That includes:
  - a re-typed query
  - an expected value re-derived with the code's own formula
  - a regex or table copied into the test
  - the call production code would make, written out by hand

  Such a test passes while the real code is wrong, and the copy drifts. This applies well beyond
  SQL.
- **Stand-ins only for what the repo does not own, each marked as a stand-in.** Replace only
  what a test cannot run: a network hop, a third-party API, the clock. Label each one as a
  stand-in where it is defined and where it is used, in its name or docstring, saying what it
  stands in for, so nobody takes it for the real thing. Never replace the code under test.
- **Code written ahead of its caller is flagged, not deleted.** While production is being
  built, a module may land before anything calls it. Mark its tests (in pytest,
  `@pytest.mark.no_caller_yet`, registered in the project config). When the first caller lands,
  test through it, then decide each flagged test on purpose: keep it, fold it in, or delete it.
  Finally, drop the flag. If it becomes clear no caller is coming, delete the code with its
  tests.
- **When code moves, its tests move with it, in the same PR.** When a route replaces an
  operation, or code loses its caller, the tests that reached it go through the new caller or
  are flagged. A test's setup is held to this too: it builds state the way production does.
- **One property, one level.** Test a property at a second level only when that level adds
  wiring the first cannot see. When it does, drop the lower-level test.

## 3. What does not get a test
- A constant, enum member or table restated in the test.
- The language, the standard library, a framework or the database engine itself: a
  `TypeError` on an unknown keyword, a UUID generator's uniqueness, or rows filtered by a
  `WHERE` the test wrote itself. **That is not the same as testing a query the code runs.**
  Whether *our* `WHERE` returns exactly the right rows is behaviour, and it gets a test through
  the code that runs it.
- The absence of a name, like `not hasattr(module, "get_latest")`. The next person names it
  differently.
- Content instead of code. Content such as form definitions, templates and copy gets one test:
  every file loads and validates. No test depends on a sample's labels, counts or limits.
- A positive control every other test already exercises.

## 4. Prove the test can fail
- **Break it once.** For a test that guards a rule, remove the rule from the code, watch the
  test fail, then restore it. Say so in the PR. A test never seen failing has not been shown to
  test anything.
- **Use the input a real bug would produce.** A guard against personal data in a path is tested
  with a UUID or a lowercase name in that path. An input that fails on an unrelated character
  proves nothing about the rule.
- "X did not change Y" also asserts that X happened.
- A refusal names its reason: the constraint, the error code or the message, not merely "some
  error".
- Allowlists, not denylists. Assert the exact keys a payload carries and the exact permissions a
  role holds.
- Test a permission as the principal it restricts, not as an admin or owner.

## 5. Shape
- One behaviour per test. Scenarios someone would name separately are separate tests.
- Different inputs to one rule are one parametrized test, with readable ids.
- A sweep over a closed set, such as every state pair or every grant, is one test. It compares
  actual against an expected table, and its failure lists the differences.

## 6. Data and time
- Synthetic data only, with distinctive values, so a test can assert they never reach a log.
- Tests own their fixtures. They do not borrow sample content that is meant to change.
- Build state through the production path where one exists. Use privileged shortcuts only for
  what the application genuinely cannot do.
- Never sleep. To test a clock, move the stored timestamp back or pass `now`.

## 7. CI and checks
- **Tests run on production's environment, as near as it can be matched.**
  CI and every developer's machine use the versions production runs, pinned exactly: the
  language to its patch release (Python 3.14.7, say), the database engine to its minor
  release, every library as pinned. A CI job sets up the pinned version of each tool it uses,
  never whatever the runner image carries. Where production cannot be pinned exactly, such as
  a managed runtime that picks its own patch release, say so beside the pin.
- A test that could not run must fail or say so loudly, never pass quietly. In the job that
  provides a dependency, any skip fails the build.
- Before merging a database change, run the suite twice against a persistent database. The
  second run catches a test that poisons shared state.
- No test counts in docs. They go stale with the next PR. Name the command instead.
- **Where the repo has CI, a check catches the cheap tells** and fails the build on:
  - the same test name in two files
  - a refusal asserted without its reason
  - a test that drives code no production entry point reaches, unless it is flagged
    `no_caller_yet`

## 8. Adding and deleting tests
- **Every PR that changes a test has a short Tests section:**
  - `Net: +N`, the diff's net change in tests.
  - `Breaks: N, each seen failing.` (§4)
  - One line per test removed or folded, with its reason: a §3 category, "duplicate of X" or
    "folded into X".
- **Added tests are not listed.** A test's name and docstring already state the failure it
  prevents, and the nearest-test search (§1) happened before it was written.
- Where the repo has CI, a check fails the PR if the net change is wrong or a removed test is
  not named.
- A deletion is a decision. When code is deleted, its tests go in the same PR.
- There is no test budget. The net change shows the number without making it the goal.

## 9. At the end of a stretch of work
- When a slice or a milestone is done, read the tests it added against the whole suite before
  calling it done: duplicates across files, setup that bypasses the production path, flagged
  tests whose caller has landed or will not come. Open the folds as their own PR.

## Checklist
- [ ] The suite was searched before each new test was written; each names the failure it
      prevents, and the nearest existing test.
- [ ] Each guard was broken once and its test seen failing.
- [ ] No test of a constant, the platform, a name's absence or sample content.
- [ ] Tests execute the repo's own code, never a recreation of it; setup goes through the
      production path; stand-ins only for what the repo does not own, each marked as one.
- [ ] Negative inputs are ones a real bug would produce.
- [ ] Refusals assert their reason; payloads and permissions are allowlists.
- [ ] No duplicate of an existing test at the same level.
- [ ] Code that moved took its tests with it; tests of code with no caller yet carry the flag,
      and a first caller comes with them revisited.
- [ ] The PR's Tests section gives the net change and breaks, and names each test removed or
      folded, with its reason.
- [ ] Tests run on production's pinned versions, in CI and locally.

---

# How this repository applies the rules

Everything above is the shared ruleset, copied word for word. This part says how it applies here.

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

`npm run tells` (`scripts/test-tells.mjs`) runs section 7's checks: a test name in two files, a
refusal asserted without what the error says, and a test importing code that no page script,
Worker, command line or script imports. Code written ahead of its caller is marked with a
`// no_caller_yet: <why>` comment on the test's import line.

On a pull request, GitHub's check also runs the base branch's tests for their names and checks
section 8's Tests section: its `Net:` line must match, and each removed test must be named.

## Commands

    npm test               # every test, including the Worker on Cloudflare's runtime
    npm run tells          # after npm test: the checks on the tests themselves
    npm run fingerprints   # after changing a script or style; a test fails until you do
