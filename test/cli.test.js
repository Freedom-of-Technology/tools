// Runs the command line (cli/check.mjs) the way GitHub's check on an almanac runs it, against a
// stand-in for the network (fake-internet.js, and FakeResolver below for asking a named server).

import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { TEMPLATE_FRONT_PAGE, main } from "../cli/check.mjs";
import { DKIM, bakeryLive } from "./bakery.js";
import { fakeInternet } from "./fake-internet.js";

const BAKERY = fileURLToPath(new URL("files/maple-street-bakery.com.zone", import.meta.url));
const BAKERY_TEXT = await readFile(BAKERY, "utf8");

async function run(args, internet, options = {}) {
  const net = fakeInternet(internet);
  const out = [];
  const code = await main(args, { fetch: net.fetch, log: (line) => out.push(line), ...options });
  return { code, output: out.join("\n"), net };
}

async function folderWith(files) {
  const dir = await mkdtemp(join(tmpdir(), "almanac-check-"));
  for (const [name, text] of Object.entries(files)) {
    await mkdir(dirname(join(dir, name)), { recursive: true });
    await writeFile(join(dir, name), text);
  }
  return dir;
}

test("a password written into a guide fails GitHub's check, not only one in a records file", async () => {
  const almanac = await folderWith({
    "dns/maple-street-bakery.com.zone": BAKERY_TEXT,
    "guides/email-stopped-working.md":
      "# Email stopped working\n\nSign in to Cloudflare.\nCloudflare password: Rolling-Pin-42\n",
  });
  const { code, output } = await run([join(almanac, "dns"), "--secrets", almanac], bakeryLive());
  assert.equal(code, 1);
  assert.match(
    output,
    /email-stopped-working\.md\n +SECRET\? +line 4 looks like a password, key or code written out\.\n/,
  );
});

test("the checker's own copy, which GitHub's check puts inside the almanac, isn't searched, so its made-up secrets don't fail every almanac", async () => {
  const almanac = await folderWith({
    "dns/maple-street-bakery.com.zone": BAKERY_TEXT,
    "guides/email-stopped-working.md": "# Email stopped working\n",
    ".almanac-check/.git/HEAD": "ref: refs/heads/main\n",
    ".almanac-check/test/cli.test.js": "const note = 'api key: sk9-maple-4471';\n",
  });
  const { code, output } = await run([join(almanac, "dns"), "--secrets", almanac], bakeryLive());
  assert.equal(code, 0);
  assert.match(output, /Looked for secrets in 1 other file\(s\)\./);
});

test("a records file holding a secret fails GitHub's check before anything is looked up, and is reported once, not once more by the search of the whole almanac", async () => {
  const almanac = await folderWith({
    "dns/maple-street-bakery.com.zone": BAKERY_TEXT.replace(
      "; Our website",
      "; api key: sk9-maple-4471\n; Our website",
    ),
  });
  const { code, output, net } = await run(
    [join(almanac, "dns"), "--secrets", almanac],
    bakeryLive(),
  );
  assert.equal(code, 1);
  assert.match(output, /line \d+ looks like a password, key or code written out/);
  assert.deepEqual(net.asked, []);
  assert.equal(output.match(/SECRET\?/g).length, 1);
  assert.match(output, /\n1 thing\(s\) need a look\./);
});

test("a folder checks every records file in it, so a domain added to an almanac is checked without changing GitHub's check", async () => {
  const cafe =
    '; nameservers: ada.ns.cloudflare.com bob.ns.cloudflare.com\n$ORIGIN corner-cafe.org.\n@ 300 IN TXT "v=spf1 -all"\n';
  const dir = await folderWith({
    "maple-street-bakery.com.zone": BAKERY_TEXT,
    "corner-cafe.org.zone": cafe,
    "notes.txt": "not a records file",
  });
  const live = bakeryLive();
  live.records["corner-cafe.org TXT"] = ["v=spf1 include:mailer.example -all"];
  live.registry["corner-cafe.org"] = {
    nameservers: ["ada.ns.cloudflare.com", "bob.ns.cloudflare.com"],
  };
  const { code, output } = await run([dir], live);
  assert.equal(code, 1);
  assert.match(output, /^corner-cafe\.org /m);
  assert.match(output, /^maple-street-bakery\.com /m);
  assert.match(output, /DIFFERENT +TXT +@\n +only in file: v=spf1 -all/);
  assert.doesNotMatch(output, /notes\.txt/);
});

test("an almanac with no records files fails GitHub's check, rather than saying every record matches when nothing was compared", async () => {
  const almanac = await folderWith({
    "dns/README.md": "# Your records files\n",
    "guides/email-stopped-working.md": "# Email stopped working\n",
  });
  const { code, output } = await run([join(almanac, "dns"), "--secrets", almanac], bakeryLive());
  assert.equal(code, 1);
  assert.match(
    output,
    /NO RECORDS FILES +none in .*dns, so nothing was compared with what's live\./,
  );
  assert.doesNotMatch(output, /Every record in the files matches/);
});

for (const [name, guide, expected] of [
  ["passes when nothing looks like a secret", "# Email stopped working\n", 0],
  [
    "fails on a password written into a guide",
    "# Email stopped working\n\nCloudflare password: Rolling-Pin-42\n",
    1,
  ],
]) {
  test(`the almanac template's own check, which has no records files and only looks for secrets, ${name}`, async () => {
    const template = await folderWith({
      "dns/README.md": "# Your records files\n",
      "guides/email-stopped-working.md": guide,
    });
    const { code, output } = await run(["--secrets", template], {});
    assert.equal(code, expected);
    assert.doesNotMatch(output, /NO RECORDS FILES/);
  });
}

const frontPage = (version) =>
  "# Your almanac\n\nTemplates and guides created and maintained by\n" +
  "[Freedom of Technology, LLC](https://freedomoftechnology.com) ·\n" +
  `[almanac template](https://github.com/Freedom-of-Technology/almanac-template) ${version}\n`;

for (const [name, copied, template, expected] of [
  [
    "names the newer version when the guides are behind",
    "v1.0, 12 Oct 2026",
    "v1.2, 3 Feb 2027",
    /\nNotice: the guides are from almanac template v1\.0, and v1\.2 \(3 Feb 2027\) is out\./,
  ],
  [
    "reads v1.10 as newer than v1.9",
    "v1.9, 1 Jun 2027",
    "v1.10, 2 Aug 2027",
    /\nNotice: the guides are from almanac template v1\.9, and v1\.10 \(2 Aug 2027\) is out\./,
  ],
  [
    "says the guides are current when they are",
    "v1.0, 12 Oct 2026",
    "v1.0, 12 Oct 2026",
    /\nThe guides are from almanac template v1\.0, the current version\./,
  ],
  [
    "says so when it can't reach the template",
    "v1.0, 12 Oct 2026",
    null,
    /\nNotice: couldn't find the almanac template's current version \(.+\)\. This doesn't fail the check\./,
  ],
]) {
  test(`GitHub's check on an almanac ${name}, without failing, so guides that are behind are seen and an almanac on an older template still passes`, async () => {
    const almanac = await folderWith({
      "README.md": frontPage(copied),
      "dns/maple-street-bakery.com.zone": BAKERY_TEXT,
    });
    const internet = {
      ...bakeryLive(),
      pages: template ? { [TEMPLATE_FRONT_PAGE]: frontPage(template) } : {},
    };
    const { code, output } = await run([join(almanac, "dns"), "--secrets", almanac], internet);
    assert.equal(code, 0);
    assert.match(output, expected);
  });
}

// Stands in for node:dns's Resolver: answers only when pointed at a server it knows.
class FakeResolver {
  static servers = {};
  static pointedAt = [];
  setServers([ip]) {
    this.ip = ip;
    FakeResolver.pointedAt.push(ip);
  }
  answer(name, type) {
    const values = FakeResolver.servers[this.ip]?.[`${name} ${type}`];
    if (!values) throw Object.assign(new Error("no data"), { code: "ENODATA" });
    return values;
  }
  async resolve4(name) {
    return this.answer(name, "A");
  }
  async resolveMx(name) {
    return this.answer(name, "MX");
  }
  async resolveTxt(name) {
    return this.answer(name, "TXT");
  }
}

test("--ns checks a new DNS company's copy before the switch: it asks that server, flags what the copy is missing, and leaves the registry out", async () => {
  const live = bakeryLive();
  live.records["new.ns.example-dns.test A"] = ["198.51.100.53"];
  FakeResolver.pointedAt = [];
  FakeResolver.servers = {
    "198.51.100.53": {
      "maple-street-bakery.com A": ["198.51.100.80"],
      "www.maple-street-bakery.com A": ["198.51.100.80"],
      "maple-street-bakery.com MX": [
        { priority: 5, exchange: "alt1.aspmx.l.google.com" },
        { priority: 1, exchange: "ASPMX.L.GOOGLE.COM" },
      ],
      "maple-street-bakery.com TXT": [["v=spf1 include:_spf.google.com ~all"]],
      "google._domainkey.maple-street-bakery.com TXT": [[DKIM.slice(0, 255), DKIM.slice(255)]],
      // No DMARC record: it wasn't copied over.
    },
  };
  const { code, output, net } = await run([BAKERY, "--ns", "new.ns.example-dns.test"], live, {
    Resolver: FakeResolver,
  });
  assert.equal(code, 1);
  assert.deepEqual([...new Set(FakeResolver.pointedAt)], ["198.51.100.53"]);
  const flagged = output.split("\n").filter((l) => /^ {2}[A-Z]{3,}/.test(l));
  assert.deepEqual(
    flagged.map((l) => l.trim().split(/\s+/).slice(0, 3).join(" ")),
    ["MISSING TXT _dmarc"],
  );
  assert.equal(
    net.asked.some((url) => url.includes("rdap")),
    false,
  );
});
