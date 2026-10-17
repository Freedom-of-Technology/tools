// Runs the test-tells checks (scripts/test-tells.mjs) on made-up tests and a made-up site, so each
// check is seen catching what it's for, and letting through what it isn't.
//
//   node --test

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import { prTests, refusalsWithoutReason, sameNames, unreached } from '../scripts/test-tells.mjs';

test('a test name used in two files is caught, naming both files, so a duplicate can\'t hide behind a second copy', () => {
  const rows = [
    { file: 'test/a.test.js', name: 'a refund over the limit is refused' },
    { file: 'test/b.test.js', name: 'a refund over the limit is refused' },
    { file: 'test/a.test.js', name: 'a refund under the limit goes through' },
  ];
  assert.deepEqual(sameNames(rows), [{ name: 'a refund over the limit is refused', files: ['test/a.test.js', 'test/b.test.js'] }]);
});

for (const [name, check, caught] of [
  ['only its class', 'RefundError', true],
  ['only its name', "{ name: 'RefundError' }", true],
  ['nothing at all', null, true],
  ['a string, which assert shows only when the test fails', "'over the limit'", true],
  ['a regular expression', '/over the limit/', false],
  ['an object with its message', "{ name: 'RefundError', message: /over the limit/ }", false],
  ['a function reading its message', '(e) => e instanceof RefundError && /over the limit/.test(e.message)', false],
]) {
  test(`a refusal checked by ${name} is ${caught ? 'caught, with its line' : 'let through'}, so every refusal says why it was refused`, () => {
    const text = `import assert from 'node:assert/strict';\n\nassert.throws(() => refund(900)${check ? `, ${check}` : ''});\n`;
    assert.deepEqual(refusalsWithoutReason('test/refund.test.js', text), caught ? [{ file: 'test/refund.test.js', line: 3 }] : []);
  });
}

// A made-up site: one page whose script imports `used` and `shared`. The test imports `shared`
// through a module that imports it and exports it again, as the Ownership Checklist does.
const SITE = mkdtempSync(join(tmpdir(), 'test-tells-'));
for (const [path, text] of Object.entries({
  'public/tools/refund/index.html': '<script type="module" src="/tools/refund/app.js"></script>',
  'public/tools/refund/app.js': "import { used } from './check/rules.js';\nimport { shared } from '../shared/text.js';\n",
  'public/tools/refund/check/rules.js': 'export const used = 1;\nexport const unused = 2;\nexport const ahead = 3;\n',
  'public/tools/refund/check/again.js': "import { shared } from '../../shared/text.js';\nexport { shared };\n",
  'public/tools/shared/text.js': 'export const shared = 4;\n',
  'test/refund.test.js': [
    "import { used, unused } from '../public/tools/refund/check/rules.js';",
    "import { ahead } from '../public/tools/refund/check/rules.js'; // no_caller_yet: the refund page comes next",
    "import { shared } from '../public/tools/refund/check/again.js';",
  ].join('\n'),
})) {
  mkdirSync(dirname(join(SITE, path)), { recursive: true });
  writeFileSync(join(SITE, path), text);
}

test('a test importing code no page, Worker, command line or script imports is caught, naming it, while code a page reaches through another module, and code marked no_caller_yet, are let through', () => {
  assert.deepEqual(unreached(SITE), [{ file: 'test/refund.test.js', line: 1, module: 'public/tools/refund/check/rules.js', name: 'unused' }]);
});

const BASE = [{ name: 'a refund over the limit is refused' }, { name: 'a refund under the limit goes through' }];
const HEAD = [{ name: 'a refund over the limit is refused' }, { name: 'a refund to a closed account is refused' }, { name: 'a refund of nothing is refused' }];

for (const [name, head, body, problem] of [
  ['no tests changed, with no Tests section', BASE, '- Fix a typo', null],
  ['the right net change and the removed test named', HEAD, '## Tests\n\nNet: +1\nBreaks: 2, each seen failing.\n- a refund under the limit goes through: folded into a refund of nothing is refused\n', null],
  ['a body written on Windows, with \\r\\n', HEAD, '## Tests\r\n\r\nNet: +1\r\n- a refund under the limit goes through: duplicate\r\n', null],
  ['a wrong net change', HEAD, '## Tests\n\nNet: +2\n- a refund under the limit goes through: duplicate\n', /"Net: \+2" should be "Net: \+1"/],
  ['no net change given', HEAD, '## Tests\n\n- a refund under the limit goes through: duplicate\n', /needs "Net: \+1"/],
  ['a removed test not named', HEAD, '## Tests\n\nNet: +1\n', /not named in the PR: a refund under the limit goes through$/],
]) {
  test(`a PR's Tests section with ${name} ${problem ? 'fails, saying why' : 'passes'}, so its count and removals match the diff`, () => {
    const problems = prTests(BASE, head, body);
    if (problem) {
      assert.equal(problems.length, 1, problems.join('\n'));
      assert.match(problems[0], problem);
    } else {
      assert.deepEqual(problems, []);
    }
  });
}
