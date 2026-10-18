// The cheap tells of a bloated or weak test suite (docs/TESTING.md, The checks on the tests), checked on
// every change by GitHub's check.
//
//   node scripts/test-tells.mjs test-names.jsonl          the suite: names, refusals, reach
//   PR_BODY=... node scripts/test-tells.mjs pr base.jsonl head.jsonl   a PR's Tests section
//
// test-names.jsonl is written by `npm test` (scripts/test-names.mjs): each test's file and name, as
// the suite ran them, so names built in loops count.
//
//   sameNames(rows)                  -> [{ name, files }]: a test name used in more than one file
//   refusalsWithoutReason(file, text) -> [{ file, line }]: assert.throws or assert.rejects checking
//                                       only the error's class or name, not what it says
//   unreached(root)                  -> [{ file, line, module, name }]: a test importing code that no
//                                       page, Worker, command line or script imports. A
//                                       "no_caller_yet" comment on the import's line exempts it
//   prTests(base, head, body)        -> problems with a PR's Tests section: "Net:" wrong or missing

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'acorn';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));

const walk = (dir) => (existsSync(dir) ? readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : [path];
}) : []);
const shown = (root, file) => relative(root, file).split('\\').join('/');

// Every node in a parsed file, depth first.
function visit(node, fn) {
  if (!node || typeof node.type !== 'string') return;
  fn(node);
  for (const value of Object.values(node)) {
    for (const child of Array.isArray(value) ? value : [value]) {
      if (child && typeof child.type === 'string') visit(child, fn);
    }
  }
}

// A module, with its comments; null for a file that isn't one, such as a vendored classic script.
function parsed(text) {
  const comments = [];
  try {
    return { ast: parse(text, { ecmaVersion: 'latest', sourceType: 'module', locations: true, onComment: comments }), comments };
  } catch {
    return null;
  }
}

export function sameNames(rows) {
  const files = new Map();
  for (const { file, name } of rows) files.set(name, new Set([...(files.get(name) ?? []), file]));
  return [...files].filter(([, set]) => set.size > 1).map(([name, set]) => ({ name, files: [...set].sort() }));
}

const REFUSALS = new Set(['throws', 'rejects']);

// What the error says is checked by a regular expression, an object with a message, or a function
// that reads the message.
function saysWhy(check, text) {
  if (!check) return false;
  if (check.type === 'Literal') return Boolean(check.regex);
  if (check.type === 'ObjectExpression') return check.properties.some((p) => (p.key?.name ?? p.key?.value) === 'message');
  if (check.type === 'ArrowFunctionExpression' || check.type === 'FunctionExpression') return text.slice(check.start, check.end).includes('.message');
  return false;
}

export function refusalsWithoutReason(file, text) {
  const found = [];
  visit(parsed(text)?.ast, (node) => {
    const { callee } = node;
    if (node.type !== 'CallExpression' || callee.type !== 'MemberExpression' || callee.computed) return;
    if (callee.object.name !== 'assert' || !REFUSALS.has(callee.property.name)) return;
    if (!saysWhy(node.arguments[1], text)) found.push({ file, line: node.loc.start.line });
  });
  return found;
}

// Where an import points: a file in the repo, or null for a package such as node:fs or wrangler.
function target(root, from, spec) {
  if (spec.startsWith('.')) return resolve(dirname(from), spec);
  if (spec.startsWith('/')) return join(root, 'public', spec);
  return null;
}

// What one file imports and re-exports, by the name it has in the file it comes from.
function links(root, file) {
  const result = { imports: [], reexports: [], comments: [] };
  const module = parsed(readFileSync(file, 'utf8'));
  if (!module) return result;
  result.comments = module.comments;
  const exported = [];
  visit(module.ast, (node) => {
    // export { name }, of a name imported above: the same as re-exporting it from where it came.
    if (node.type === 'ExportNamedDeclaration' && !node.source) {
      for (const s of node.specifiers) exported.push({ name: s.exported.name ?? s.exported.value, local: s.local.name ?? s.local.value });
    }
    const from = node.source?.value && target(root, file, node.source.value);
    if (!from) return;
    const line = node.loc.start.line;
    if (node.type === 'ImportDeclaration') {
      for (const s of node.specifiers) {
        const name = s.type === 'ImportSpecifier' ? (s.imported.name ?? s.imported.value) : s.type === 'ImportDefaultSpecifier' ? 'default' : '*';
        result.imports.push({ from, name, line, local: s.local.name });
      }
      if (!node.specifiers.length) result.imports.push({ from, name: '*', line });
    } else if (node.type === 'ImportExpression') {
      result.imports.push({ from, name: '*', line });
    } else if (node.type === 'ExportNamedDeclaration') {
      for (const s of node.specifiers) result.reexports.push({ name: s.exported.name ?? s.exported.value, from, as: s.local.name ?? s.local.value });
    } else if (node.type === 'ExportAllDeclaration') {
      result.reexports.push({ name: node.exported?.name ?? '*', from, as: '*' });
    }
  });
  for (const { name, local } of exported) {
    const imported = result.imports.find((i) => i.local === local);
    if (imported) result.reexports.push({ name, from: imported.from, as: imported.name });
  }
  return result;
}

// Where the code behind an imported name lives, following re-exports.
function origin(linksOf, module, name, seen = new Set()) {
  const key = `${module}#${name}`;
  if (seen.has(key) || !existsSync(module)) return key;
  seen.add(key);
  const named = linksOf(module).reexports.find((r) => r.name === name);
  if (named) return origin(linksOf, named.from, named.as === '*' ? name : named.as, seen);
  return key;
}

// The files a visitor, Cloudflare or GitHub's check on an almanac runs first: every script a page
// loads, the Worker, the command line and the scripts.
function entries(root) {
  const pages = walk(join(root, 'public')).filter((f) => f.endsWith('.html'));
  const scripts = pages.flatMap((page) => [...readFileSync(page, 'utf8').matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)]
    .map((m) => target(root, page, m[1].startsWith('/') ? m[1] : `./${m[1]}`)));
  const code = ['src', 'cli', 'scripts'].flatMap((dir) => walk(join(root, dir))).filter((f) => /\.m?js$/.test(f));
  return new Set([...scripts, ...code].filter((f) => f && existsSync(f)));
}

export function unreached(root = ROOT) {
  const cache = new Map();
  const linksOf = (file) => {
    if (!cache.has(file)) cache.set(file, existsSync(file) ? links(root, file) : { imports: [], reexports: [], comments: [] });
    return cache.get(file);
  };
  const start = entries(root);
  const production = new Set(start);
  for (const file of production) {
    const { imports, reexports } = linksOf(file);
    for (const { from } of [...imports, ...reexports]) if (existsSync(from)) production.add(from);
  }
  const used = new Set([...production].flatMap((file) => linksOf(file).imports.map(({ from, name }) => origin(linksOf, from, name))));

  const testDir = join(root, 'test');
  const found = [];
  for (const file of walk(testDir).filter((f) => f.endsWith('.js'))) {
    const { imports, comments } = linksOf(file);
    for (const { from, name, line } of imports) {
      if (from.startsWith(testDir) || start.has(from)) continue;
      if (comments.some((c) => c.loc.start.line === line && /\bno_caller_yet\b/.test(c.value))) continue;
      if (used.has(`${from}#*`) || used.has(origin(linksOf, from, name))) continue;
      found.push({ file: shown(root, file), line, module: shown(root, from), name });
    }
  }
  return found;
}

const signed = (n) => (n > 0 ? `+${n}` : String(n));

export function prTests(base, head, body) {
  const before = new Set(base.map((r) => r.name));
  const after = new Set(head.map((r) => r.name));
  const net = head.length - base.length;
  const removed = [...before].filter((name) => !after.has(name));
  const added = [...after].filter((name) => !before.has(name));
  if (!net && !removed.length && !added.length) return [];

  const problems = [];
  const said = String(body ?? '').match(/^Net:\s*([+\-\u2212]?\d+)\s*$/m);
  if (!said) problems.push(`The PR's Tests section needs "Net: ${signed(net)}".`);
  else if (Number(said[1].replace('\u2212', '-')) !== net) problems.push(`"Net: ${said[1]}" should be "Net: ${signed(net)}".`);
  return problems;
}

const rowsIn = (file) => readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));

function suiteProblems(namesFile) {
  const rows = rowsIn(namesFile);
  if (!rows.length) return [`${namesFile} lists no tests: run npm test first.`];
  const tests = walk(join(ROOT, 'test')).filter((f) => f.endsWith('.js'));
  return [
    ...sameNames(rows).map(({ name, files }) => `Same test name in ${files.join(' and ')}: ${name}`),
    ...tests.flatMap((f) => refusalsWithoutReason(shown(ROOT, f), readFileSync(f, 'utf8')))
      .map(({ file, line }) => `${file}:${line} checks a refusal without its reason: assert what the error says.`),
    ...unreached().map(({ file, line, module, name }) => `${file}:${line} tests ${name} from ${module}, which no page, Worker, command line or script imports. Test it through its caller, or mark the import no_caller_yet.`),
  ];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, ...files] = process.argv.slice(2);
  const problems = mode === 'pr'
    ? prTests(rowsIn(files[0]), rowsIn(files[1]), process.env.PR_BODY)
    : suiteProblems(mode ?? 'test-names.jsonl');
  for (const problem of problems) console.log(problem);
  if (problems.length) process.exitCode = 1;
  else console.log(mode === 'pr' ? 'The Tests section matches the change in tests.' : 'No test tells found.');
}
