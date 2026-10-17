// A test reporter that writes each test's file and name, one JSON line per test, for the checks in
// test-tells.mjs. It runs alongside the usual reporter (package.json, "test"), so names built in
// loops are written as the suite actually names them.
//
//   node --test --test-reporter=./scripts/test-names.mjs --test-reporter-destination=test-names.jsonl

import { relative } from 'node:path';

export default async function* testNames(source) {
  for await (const { type, data } of source) {
    if ((type === 'test:pass' || type === 'test:fail') && data.nesting === 0 && data.file) {
      yield `${JSON.stringify({ file: relative(process.cwd(), data.file).split('\\').join('/'), name: data.name })}\n`;
    }
  }
}
