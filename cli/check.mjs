#!/usr/bin/env node
// Almanac Check from the command line, for the check GitHub runs on each almanac, and by hand.
// It runs the page's own checking code (public/tools/domain-check/check/ and the shared lookups in
// public/tools/shared/live.js), so the page and this can't disagree.
//
//   node cli/check.mjs <file or folder>...    a folder means every *.zone file in it
//   node cli/check.mjs dns/freeot.com.zone --ns woz.ns.cloudflare.com
//       asks that server for the records instead of Google Public DNS: for checking a new DNS
//       company's copy before the domain's name servers are switched to it. Name servers and
//       DNSSEC aren't compared then, since the registry still names the old company.
//   node cli/check.mjs dns --secrets .
//       also looks for secrets in every other file in that folder and the folders inside it,
//       such as the guides and the list of addresses. Another repository checked out inside it
//       (this one, in an almanac's GitHub check) isn't part of the almanac and is left out.
//       That folder is the whole almanac, so its front page is also compared with the almanac
//       template's: guides copied from an older version get a notice, which never fails the check.
//   node cli/check.mjs --secrets .
//       only looks for secrets, for the almanac template itself, which has no records files.
//
// Exit code 1 means something needs a look: a record that's different or missing, a "paste:"
// note that doesn't match its record, a lookup that failed, a file that couldn't be read, a
// file that looks like it holds a secret (a records file is refused before anything about it is
// asked), or no records files at all, since then nothing was compared.
//
// Needs Node 22 or later and nothing else.

import { Resolver } from "node:dns/promises";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { checkFile, NEEDS_A_LOOK, STATUS } from "../public/tools/domain-check/check/compare.js";
import { findSecrets, ZoneError } from "../public/tools/domain-check/check/zone.js";
import { createLookup, LookupError } from "../public/tools/shared/live.js";

// The template every almanac is copied from. Its front page names the current version.
export const TEMPLATE_FRONT_PAGE =
  "https://raw.githubusercontent.com/Freedom-of-Technology/almanac-template/main/README.md";

const bare = (host) => host.replace(/\.$/, "").toLowerCase();

// Asks one named server for records, the way live.js asks Google Public DNS, and writes each
// value the way zone.js writes the file's. The server's own address comes from Google.
// `Resolver` is passed in so tests can stand in for the network.
export function createServerLookup(server, { fetch, Resolver: DnsResolver = Resolver } = {}) {
  const google = createLookup({ fetch });
  let resolver;
  function ask() {
    resolver ??= google.records(server, "A").then(({ values }) => {
      if (!values.length) throw new LookupError(`couldn't find the address of ${server}`);
      const r = new DnsResolver();
      r.setServers([values[0]]);
      return r;
    });
    return resolver;
  }

  const QUESTIONS = {
    A: (r, name) => r.resolve4(name),
    AAAA: (r, name) => r.resolve6(name),
    CNAME: async (r, name) => (await r.resolveCname(name)).map(bare),
    NS: async (r, name) => (await r.resolveNs(name)).map(bare),
    MX: async (r, name) =>
      (await r.resolveMx(name)).map((m) => `${m.priority} ${bare(m.exchange)}`),
    TXT: async (r, name) => (await r.resolveTxt(name)).map((chunks) => chunks.join("")),
    CAA: async (r, name) =>
      (await r.resolveCaa(name)).map((c) => {
        const tag = Object.keys(c).find((k) => k !== "critical");
        return `${c.critical} ${tag.toLowerCase()} ${c[tag]}`;
      }),
    SRV: async (r, name) =>
      (await r.resolveSrv(name)).map((s) => `${s.priority} ${s.weight} ${s.port} ${bare(s.name)}`),
  };

  async function records(name, type) {
    const r = await ask();
    try {
      return { values: [...new Set(await QUESTIONS[type](r, name))], ttl: null };
    } catch (err) {
      if (err.code === "ENODATA" || err.code === "ENOTFOUND") return { values: [], ttl: null };
      throw new LookupError(`${server} couldn't look up ${name} (${err.code ?? err.message})`);
    }
  }

  async function answers(name) {
    return (await records(name, "A")).values.length > 0;
  }

  // The registry still names the old DNS company until the switch, so it isn't asked.
  async function registry() {
    throw new LookupError("not compared when asking a named server");
  }

  return { records, answers, registry };
}

const short = (v) => (v.length > 70 ? `${v.slice(0, 40)}…${v.slice(-20)}` : v);

function label(name, domain) {
  if (name === domain) return "@";
  return name.endsWith(`.${domain}`) ? name.slice(0, -(domain.length + 1)) : name;
}

// Writes one file's report, and returns how many things need a look.
function report(result, { log, server }) {
  const { domain } = result;
  log(
    `\n${domain}  (${server ? `asking ${server}` : "Google Public DNS; name servers from the registry"})`,
  );
  const line = (status, type, name, detail = "") =>
    log(`  ${status.padEnd(11)} ${type.padEnd(5)} ${name}${detail ? `  ${detail}` : ""}`);
  const word = (status) => (NEEDS_A_LOOK.has(status) ? status.toUpperCase() : status);
  let problems = 0;

  if (server) {
    log("  name servers and DNSSEC not compared: the registry still names the old DNS company");
  } else {
    for (const [what, row, show] of [
      ["name servers", result.nameservers, (v) => v.join(" ") || "(none in the file)"],
      ["DNSSEC", result.dnssec, (v) => (v === null ? "(not in the file)" : v ? "on" : "off")],
    ]) {
      if (NEEDS_A_LOOK.has(row.status)) problems++;
      if (row.status === STATUS.failed) log(`  ${"FAILED".padEnd(11)} ${what}  ${row.reason}`);
      else if (row.status === STATUS.different)
        log(
          `  ${"DIFFERENT".padEnd(11)} ${what}  file: ${show(row.file)}  registry: ${show(row.live)}`,
        );
      else log(`  ${"ok".padEnd(11)} ${what}  ${show(row.file)}`);
    }
  }

  for (const row of result.rows) {
    const name = label(row.name, domain);
    if (NEEDS_A_LOOK.has(row.status)) problems++;
    switch (row.status) {
      case STATUS.ok:
        line("ok", row.type, name, row.file.length > 1 ? `${row.file.length} values` : "");
        break;
      case STATUS.proxied:
        line("proxied", row.type, name, `Cloudflare answers; file says ${row.file.join(", ")}`);
        break;
      case STATUS.godaddySite:
        line("godaddy", row.type, name, "GoDaddy's website builder answers");
        break;
      case STATUS.different:
        line(word(row.status), row.type, name);
        for (const v of row.file.filter((v) => !row.live.includes(v)))
          log(`                only in file: ${short(v)}`);
        for (const v of row.live.filter((v) => !row.file.includes(v)))
          log(`                only live:    ${short(v)}`);
        break;
      case STATUS.missing:
        line(
          word(row.status),
          row.type,
          name,
          row.file.length ? `file: ${row.file.map(short).join(" | ")}` : "",
        );
        break;
      case STATUS.paste:
        line(
          word(row.status),
          row.type,
          name,
          `the "paste:" note on line ${row.pasteLines.join(" and ")} doesn't match the record below it`,
        );
        break;
      case STATUS.unsupported:
        line("not checked", row.type, name, "this record type isn't checked");
        break;
      case STATUS.failed:
        line(word(row.status), row.type, name, row.reason);
        break;
    }
  }
  return problems;
}

async function zoneFiles(paths) {
  const files = [];
  for (const path of paths) {
    if ((await stat(path)).isDirectory()) {
      files.push(
        ...(await readdir(path))
          .filter((f) => f.endsWith(".zone"))
          .sort()
          .map((f) => join(path, f)),
      );
    } else {
      files.push(path);
    }
  }
  return files;
}

// Every file in `dir` and the folders inside it, leaving out git's own folder and any other
// repository checked out inside it.
async function everyFile(dir, top = true) {
  const entries = await readdir(dir, { withFileTypes: true });
  if (!top && entries.some((e) => e.name === ".git")) return [];
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === ".git") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await everyFile(path, false)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function reportSecrets(file, secrets, log, { recordsFile }) {
  log(`\n${file}`);
  for (const { line, what } of secrets) {
    log(
      `  SECRET?     line ${line} looks like ${what}.${recordsFile ? " Nothing in this file was checked." : ""}`,
    );
  }
  log(
    "              Move it to the password manager, then take it out of the file and its history.",
  );
  log("              Once a secret has been in the file, it has to be replaced with a new one.");
  return secrets.length;
}

// An almanac's front page names the template version its guides were copied from, as in
// "[almanac template](...) v1.0, 12 Oct 2026". The template's own front page names its current one.
function templateVersion(text) {
  const found = /\[almanac template\]\([^)]*\)\s+v(\d+)\.(\d+)(?:,[ \t]*([^\n]+))?/.exec(text);
  return (
    found && {
      major: Number(found[1]),
      minor: Number(found[2]),
      name: `v${found[1]}.${found[2]}`,
      date: found[3]?.trim(),
    }
  );
}

// Says whether the almanac's guides are behind the template. Only ever a notice: an almanac on an
// older version still works.
async function templateNotice(almanac, { fetch, log }) {
  let front;
  try {
    front = await readFile(join(almanac, "README.md"), "utf8");
  } catch {
    return;
  }
  const copied = templateVersion(front);
  if (!copied) return;
  let current;
  try {
    const answer = await fetch(TEMPLATE_FRONT_PAGE);
    if (!answer.ok) throw new Error(`GitHub answered ${answer.status}`);
    current = templateVersion(await answer.text());
    if (!current) throw new Error("its front page doesn't name a version");
  } catch (err) {
    log(
      `\nNotice: couldn't find the almanac template's current version (${err.message}). This doesn't fail the check.`,
    );
    return;
  }
  const behind =
    current.major > copied.major ||
    (current.major === copied.major && current.minor > copied.minor);
  log(
    behind
      ? `\nNotice: the guides are from almanac template ${copied.name}, and ${current.name}${current.date ? ` (${current.date})` : ""} is out. Ask FreeOT to bring the guides up to date. This doesn't fail the check.`
      : `\nThe guides are from almanac template ${copied.name}, the current version.`,
  );
}

// Returns the exit code. `fetch`, `Resolver` and `log` are passed in so tests can stand in for the
// network and read what was written.
export async function main(
  args,
  { fetch = globalThis.fetch, Resolver: DnsResolver, log = console.log } = {},
) {
  args = [...args];
  const option = (name) => {
    const at = args.indexOf(name);
    return at < 0 ? { given: false } : { given: true, value: args.splice(at, 2)[1] };
  };
  const ns = option("--ns");
  const secretsIn = option("--secrets");
  const server = ns.value;
  if (
    (!args.length && !secretsIn.given) ||
    (ns.given && !server) ||
    (secretsIn.given && !secretsIn.value)
  ) {
    log(
      "Usage: node cli/check.mjs [<records file or folder>...] [--ns <name server>] [--secrets <folder>]",
    );
    return 2;
  }

  const lookup = server
    ? createServerLookup(server, { fetch, Resolver: DnsResolver })
    : createLookup({ fetch });
  const files = await zoneFiles(args.map((a) => resolve(a)));
  let problems = 0;

  // Records files get the same look below, so they aren't reported twice.
  if (secretsIn.given) {
    const others = (await everyFile(resolve(secretsIn.value))).filter((f) => !files.includes(f));
    for (const file of others) {
      const secrets = findSecrets(await readFile(file, "utf8"));
      if (secrets.length) problems += reportSecrets(file, secrets, log, { recordsFile: false });
    }
    log(`\nLooked for secrets in ${others.length} other file(s).`);
    await templateNotice(resolve(secretsIn.value), { fetch, log });
  }

  if (!args.length) {
    log(
      problems
        ? `\n${problems} thing(s) need a look.`
        : "\nNothing looks like a secret. No records files were named, so no records were compared.",
    );
    return problems ? 1 : 0;
  }

  if (!files.length) {
    log(
      `\nNO RECORDS FILES  none in ${args.join(", ")}, so nothing was compared with what's live.`,
    );
    log(
      "                  Each domain needs its records file there, named after it, such as example.com.zone.",
    );
    problems++;
  }

  for (const file of files) {
    let result;
    try {
      result = await checkFile(await readFile(file, "utf8"), lookup);
    } catch (err) {
      if (!(err instanceof ZoneError) && err.code !== "ENOENT") throw err;
      log(
        `\n${file}\n  COULDN'T READ IT  ${err instanceof ZoneError ? err.message : "no such file"}`,
      );
      problems++;
      continue;
    }
    if (result.refused) {
      problems += reportSecrets(file, result.refused, log, { recordsFile: true });
      continue;
    }
    problems += report(result, { log, server });
  }

  log(
    problems
      ? `\n${problems} thing(s) need a look. Fix the file or the DNS company, then run this again.`
      : "\nEvery record in the files matches what is live.",
  );
  log(
    "Not checked: names that are live but missing from the files. An export from the DNS company lists those.",
  );
  return problems ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
