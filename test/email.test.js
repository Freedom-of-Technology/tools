// Runs the email protection check's own code (public/tools/email-check/check/) on made-up domains,
// against a stand-in for the network (fake-internet.js). Nothing here re-creates the code under test.
//
//   node --test

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createLookup } from '../public/tools/shared/live.js';
import { DomainError, checkEmail, cleanDomain } from '../public/tools/email-check/check/email.js';
import { fakeInternet } from './fake-internet.js';

const NOW = new Date('2026-10-11T12:00:00Z');
const DOMAIN = 'maple-street-bakery.com';
const KEY = 'v=DKIM1; k=rsa; p=MAPLE' + 'a'.repeat(200);

// A bakery on Google Workspace with every protection in place.
const protectedBakery = () => ({
  records: {
    [`${DOMAIN} MX`]: ['1 aspmx.l.google.com.', '5 alt1.aspmx.l.google.com.'],
    [`${DOMAIN} TXT`]: ['google-site-verification=abc', 'v=spf1 include:_spf.google.com ~all'],
    '_spf.google.com TXT': ['v=spf1 include:_netblocks.google.com include:_netblocks2.google.com ~all'],
    [`google._domainkey.${DOMAIN} TXT`]: [KEY],
    [`_dmarc.${DOMAIN} TXT`]: ['v=DMARC1; p=quarantine; rua=mailto:reports@maple-street-bakery.com'],
  },
  registry: { [DOMAIN]: { nameservers: ['ada.ns.cloudflare.com', 'bob.ns.cloudflare.com'], expires: '2027-03-26T14:17:32Z' } },
});

async function check(internet, domain = DOMAIN) {
  const net = fakeInternet(internet);
  const report = await checkEmail(domain, createLookup({ fetch: net.fetch }), { now: NOW });
  return report;
}

const codes = (c) => c.findings.map((f) => f.code);

test('a domain with all three protections reads as hard to fake, so an owner is not sent chasing a problem that is not there', async () => {
  const report = await check(protectedBakery());
  assert.equal(report.verdict, 'hard');
  assert.equal(report.mail.provider.name, 'Google Workspace');
  assert.deepEqual(Object.values(report.checks).map((c) => [c.id, c.result]),
    [['spf', 'good'], ['dkim', 'good'], ['dmarc', 'good'], ['expiry', 'good']]);
  assert.deepEqual(report.checks.expiry.findings[0].at, new Date('2027-03-26T14:17:32Z'));
});

for (const [name, dmarc, code] of [
  ['no DMARC record', [], 'missing'],
  ['DMARC set to watch only', ['v=DMARC1; p=none; rua=mailto:r@maple-street-bakery.com'], 'watching-only'],
  ['two DMARC records, which mail servers ignore', ['v=DMARC1; p=reject', 'v=DMARC1; p=none'], 'two-records'],
]) {
  test(`fake email that would still be delivered reads as easy to fake: ${name}`, async () => {
    const internet = protectedBakery();
    internet.records[`_dmarc.${DOMAIN} TXT`] = dmarc;
    const report = await check(internet);
    assert.equal(report.verdict, 'easy');
    assert.equal(codes(report.checks.dmarc)[0], code);
  });
}

for (const [name, rua, expected] of [
  ['an address at the domain itself', 'mailto:reports@maple-street-bakery.com',
    [{ address: 'reports@maple-street-bakery.com', at: 'maple-street-bakery.com', yours: true, service: null }]],
  ['GoDaddy\'s address, from its own setup guide', 'mailto:dmarc_rua@onsecureserver.net;',
    [{ address: 'dmarc_rua@onsecureserver.net', at: 'onsecureserver.net', yours: false, service: 'GoDaddy' }]],
  ['two addresses, one with a size limit, one elsewhere', 'mailto:Owner@Mail.Maple-Street-Bakery.com!10m, mailto:dmarc@reports.example-service.test',
    [{ address: 'owner@mail.maple-street-bakery.com', at: 'mail.maple-street-bakery.com', yours: true, service: null },
      { address: 'dmarc@reports.example-service.test', at: 'reports.example-service.test', yours: false, service: null }]],
]) {
  test(`the owner is told who receives the domain's DMARC reports, and whether it's them, without it changing the verdict: ${name}`, async () => {
    const internet = protectedBakery();
    internet.records[`_dmarc.${DOMAIN} TXT`] = [`v=DMARC1; p=quarantine; rua=${rua}`];
    const report = await check(internet);
    const finding = report.checks.dmarc.findings.find((f) => f.code === 'reports-to');
    assert.deepEqual(finding?.to, expected);
    assert.equal(report.checks.dmarc.result, 'good');
    assert.equal(report.verdict, 'hard');
  });
}

for (const [name, spf, extra, code] of [
  ['two SPF records, which mail servers ignore', ['v=spf1 include:_spf.google.com ~all', 'v=spf1 include:servers.mcsv.net ~all'], {}, 'two-records'],
  ['an ending that lets anyone send', ['v=spf1 include:_spf.google.com +all'], {}, 'allows-anyone'],
  ['more than ten lookups, which breaks the record',
    [`v=spf1 ${Array.from({ length: 9 }, (_, i) => `include:s${i}.senders.test`).join(' ')} include:_spf.google.com ~all`], {}, 'too-many-lookups'],
]) {
  test(`an SPF record that would let fakes through or get real email refused is flagged: ${name}`, async () => {
    const internet = protectedBakery();
    internet.records[`${DOMAIN} TXT`] = spf;
    Object.assign(internet.records, extra);
    const report = await check(internet);
    assert.equal(report.checks.spf.result, 'fix');
    assert.ok(codes(report.checks.spf).includes(code), codes(report.checks.spf).join(', '));
    assert.equal(report.verdict, 'partly');
  });
}

for (const [where, mx, flagged] of [
  ['email has moved to Google', ['1 aspmx.l.google.com.'], true],
  ['email is still at GoDaddy', ['0 smtp.secureserver.net.', '10 mailstore1.secureserver.net.'], false],
]) {
  test(`GoDaddy's leftover in SPF, which lets GoDaddy's servers send as the domain, is flagged only once email has left GoDaddy: ${where}`, async () => {
    const internet = protectedBakery();
    internet.records[`${DOMAIN} MX`] = mx;
    internet.records[`${DOMAIN} TXT`] = ['v=spf1 include:secureserver.net include:_spf.google.com ~all'];
    const report = await check(internet);
    assert.equal(codes(report.checks.spf).includes('godaddy-leftover'), flagged);
  });
}

for (const [name, mx, extra, code, result] of [
  ['Microsoft 365 pointers with no key behind them, so DKIM is off in Microsoft 365', ['0 maple-street-bakery-com.mail.protection.outlook.com.'],
    { [`selector1._domainkey.${DOMAIN} CNAME`]: ['selector1-maple._domainkey.maple.onmicrosoft.com.'] }, 'pointer-without-key', 'fix'],
  ['Microsoft 365 with no DKIM records at the names it always uses', ['0 maple-street-bakery-com.mail.protection.outlook.com.'], {}, 'missing', 'fix'],
  ['Google Workspace with no key under "google", which an admin can rename', ['1 aspmx.l.google.com.'], {}, 'not-found', 'look'],
  ['an unknown email service, where a key may sit at a name the page cannot guess', ['10 mx.small-mail-host.test.'], {}, 'not-found', 'look'],
]) {
  test(`unsigned email is reported in a way the owner can act on, without claiming more than the lookup shows: ${name}`, async () => {
    const internet = protectedBakery();
    internet.records[`${DOMAIN} MX`] = mx;
    delete internet.records[`google._domainkey.${DOMAIN} TXT`];
    Object.assign(internet.records, extra);
    const report = await check(internet);
    assert.deepEqual([codes(report.checks.dkim)[0], report.checks.dkim.result], [code, result]);
  });
}

for (const [name, expires, code, days] of [
  ['runs out in 10 days', '2026-10-21T13:00:00Z', 'soon', 10],
  ['already ran out', '2026-10-01T00:00:00Z', 'expired', undefined],
]) {
  test(`a registration about to run out is flagged with its date, so the owner renews before the website and email stop: ${name}`, async () => {
    const internet = protectedBakery();
    internet.registry[DOMAIN].expires = expires;
    const report = await check(internet);
    const [finding] = report.checks.expiry.findings;
    assert.deepEqual([finding.code, report.checks.expiry.result, finding.days], [code, 'fix', days]);
    assert.deepEqual(finding.at, new Date(expires));
  });
}

test('a lookup that fails is reported as not checked, never as a missing record the owner would rush to add', async () => {
  const internet = protectedBakery();
  internet.broken = new Set([`_dmarc.${DOMAIN} TXT`]);
  const report = await check(internet);
  assert.equal(report.checks.dmarc.result, 'failed');
  assert.equal(report.verdict, 'unknown');
});

test('a domain nobody has registered is said so, rather than reported as unprotected', async () => {
  const report = await check({ records: {}, registry: {} }, 'maple-street-bakry.com');
  assert.deepEqual(report, { domain: 'maple-street-bakry.com', registered: false });
});

for (const [typed, domain] of [
  ['https://www.Maple-Street-Bakery.com/order?item=bread', DOMAIN],
  ['owner@maple-street-bakery.com', DOMAIN],
  ['maple-street-bakery.com.', DOMAIN],
  ['shop.maple-street-bakery.com', 'shop.maple-street-bakery.com'],
]) {
  test(`an owner can type their address the way they would write it: ${typed}`, () => {
    assert.equal(cleanDomain(typed).domain, domain);
  });
}

for (const typed of ['maple street bakery', 'localhost', '-maple.com']) {
  test(`something that is not a web address is turned away before anything is asked: ${typed}`, () => {
    assert.throws(() => cleanDomain(typed), (e) => e instanceof DomainError && /doesn't look like a web address/.test(e.message));
  });
}
