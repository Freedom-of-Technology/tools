// Checks a domain's email protection: the three records that decide whether someone can send
// email pretending to be the domain (SPF, DKIM, DMARC), which service receives its email, and when
// its registration runs out. It says what it found as codes; the page (../app.js) puts them in words.
//
// Everything comes from public lookups, through the shared lookup code (../../shared/live.js).

import { LookupError, NotRegisteredError } from '../../shared/live.js';

// How each finding reads, from worst to best. A check's result is its worst finding.
export const RESULT = { failed: 'failed', fix: 'fix', look: 'look', good: 'good', info: 'info' };
const ORDER = [RESULT.failed, RESULT.fix, RESULT.look, RESULT.good, RESULT.info];
const worst = (findings) => ORDER.find((r) => findings.some((f) => f.result === r)) ?? RESULT.info;

export class DomainError extends Error {}

// Turns whatever an owner types (a web address, an email address, a page's full address) into
// the domain to check. `wwwDropped` says the "www." was taken off, since email uses the bare domain.
export function cleanDomain(input) {
  // The browser's own address reader takes off any "name@", page, port or query, lowercases the
  // name, and turns an accented domain into its xn-- form. Only a leading "https://" has to go first.
  const text = String(input ?? '').trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  let host;
  try {
    host = new URL(`http://${text}`).hostname.replace(/\.$/, '');
  } catch {
    throw new DomainError('that doesn\'t look like a web address');
  }
  const labels = host.split('.');
  const valid = host.length <= 253 && labels.length >= 2 &&
    labels.every((l) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(l)) && /^([a-z]{2,63}|xn--[a-z0-9-]+)$/.test(labels.at(-1));
  if (!valid) throw new DomainError('that doesn\'t look like a web address');
  const wwwDropped = labels[0] === 'www' && labels.length > 2;
  return { domain: wwwDropped ? labels.slice(1).join('.') : host, wwwDropped };
}

// `dkim` is where each service puts its signature key. Microsoft 365 always uses the same two
// names (`fixedNames`), so nothing there means DKIM is off. Google Workspace uses "google" unless
// the admin picks another name, so nothing there only means it isn't where we looked.
const PROVIDERS = [
  { name: 'Google Workspace', mx: /(^|\.)(google\.com|googlemail\.com)$/, dkim: ['google'], fixedNames: false },
  { name: 'Microsoft 365', mx: /\.mail\.protection\.outlook\.com$/, dkim: ['selector1', 'selector2'], fixedNames: true },
  { name: 'GoDaddy', mx: /\.secureserver\.net$/, dkim: [], fixedNames: false },
  { name: 'Zoho Mail', mx: /(^|\.)zoho\.(com|eu|in|com\.au)$/, dkim: [], fixedNames: false },
];
// Names other services commonly use for their DKIM key, tried when the service isn't known.
const COMMON_DKIM = ['google', 'selector1', 'selector2', 'default', 'k1', 's1', 's2', 'dkim', 'mail'];

const mxHost = (value) => value.split(' ')[1] ?? '';

function mailService(mx) {
  if (!mx.length) return { receives: false, nullMx: false, provider: null };
  // A "null" MX record (priority 0, host ".") says on purpose that the domain takes no email.
  if (mx.length === 1 && ['', '.'].includes(mxHost(mx[0]))) return { receives: false, nullMx: true, provider: null };
  const provider = PROVIDERS.find((p) => mx.some((v) => p.mx.test(mxHost(v)))) ?? null;
  return { receives: true, nullMx: false, provider };
}

const isSpf = (v) => /^v=spf1(\s|$)/i.test(v);
// Each of these terms makes a receiving server do one more lookup; past ten, SPF fails outright.
const LOOKUP_TERM = /^[+?~-]?(include:|a$|a:|a\/|mx$|mx:|mx\/|ptr|exists:|redirect=)/i;

// Counts the lookups an SPF record needs, following its include: and redirect= targets.
async function countLookups(record, lookup, seen = new Set(), depth = 0) {
  let count = 0;
  let unsure = false;
  for (const term of record.split(/\s+/).slice(1)) {
    if (!LOOKUP_TERM.test(term)) continue;
    count += 1;
    const target = term.match(/^[+?~-]?(?:include:|redirect=)(.+)$/i)?.[1]?.toLowerCase();
    if (!target || seen.has(target) || depth >= 10) continue;
    seen.add(target);
    try {
      const nested = (await lookup.records(target, 'TXT')).values.filter(isSpf);
      if (nested.length === 1) {
        const inner = await countLookups(nested[0], lookup, seen, depth + 1);
        count += inner.count;
        unsure ||= inner.unsure;
      }
    } catch (err) {
      if (!(err instanceof LookupError)) throw err;
      unsure = true;
    }
    if (count > 10) break;
  }
  return { count, unsure };
}

async function checkSpf(txt, mail, lookup) {
  const records = txt.filter(isSpf);
  if (!records.length) return { findings: [{ code: 'missing', result: RESULT.fix }], values: [] };
  if (records.length > 1) return { findings: [{ code: 'two-records', result: RESULT.fix, count: records.length }], values: records };

  const [record] = records;
  const terms = record.split(/\s+/).slice(1).map((t) => t.toLowerCase());
  const findings = [];

  const all = terms.find((t) => /^[+?~-]?all$/.test(t));
  const ending = all ? (all.length === 3 ? '+' : all[0]) : null;
  if (ending === '+') findings.push({ code: 'allows-anyone', result: RESULT.fix });
  else if (ending === '?') findings.push({ code: 'neutral', result: RESULT.look });
  else if (ending === '~') findings.push({ code: 'soft', result: RESULT.good });
  else if (ending === '-') findings.push({ code: 'strict', result: RESULT.good });
  else if (!terms.some((t) => t.startsWith('redirect='))) findings.push({ code: 'no-ending', result: RESULT.look });

  const lookups = await countLookups(record, lookup);
  if (lookups.count > 10) findings.push({ code: 'too-many-lookups', result: RESULT.fix, count: lookups.count });
  else if (lookups.unsure) findings.push({ code: 'lookups-unsure', result: RESULT.info, count: lookups.count });

  // GoDaddy adds its own senders when a domain is set up there; once email moves elsewhere, the
  // leftover still lets GoDaddy's servers send as the domain.
  if (terms.some((t) => /^[+?~-]?include:(.*\.)?secureserver\.net$/.test(t)) && mail.provider?.name !== 'GoDaddy') {
    findings.push({ code: 'godaddy-leftover', result: RESULT.look });
  }
  return { findings, values: records };
}

const hasKey = (v) => /(^|;)\s*p=/.test(v);
const keyRevoked = (v) => /(^|;)\s*p=\s*(;|$)/.test(v);

// The DKIM record for one name, following a pointer (Microsoft 365 uses them) to the real key.
async function dkimAt(name, lookup) {
  let { values } = await lookup.records(name, 'TXT');
  let pointsTo = null;
  if (values[0]?.startsWith('CNAME ')) {
    pointsTo = values[0].slice('CNAME '.length);
    ({ values } = await lookup.records(pointsTo, 'TXT'));
  }
  const key = values.find(hasKey) ?? null;
  return { pointsTo, key };
}

async function checkDkim(domain, mail, lookup) {
  const selectors = [...new Set([...(mail.provider?.dkim ?? []), ...COMMON_DKIM])];
  const found = [];
  const pointersWithoutKey = [];
  let failed = 0;
  await Promise.all(selectors.map(async (selector) => {
    try {
      const { pointsTo, key } = await dkimAt(`${selector}._domainkey.${domain}`, lookup);
      if (key) found.push({ selector, revoked: keyRevoked(key) });
      else if (pointsTo) pointersWithoutKey.push(selector);
    } catch (err) {
      if (!(err instanceof LookupError)) throw err;
      failed += 1;
    }
  }));
  found.sort((a, b) => a.selector.localeCompare(b.selector));
  const working = found.filter((f) => !f.revoked);

  if (working.length) return { findings: [{ code: 'found', result: RESULT.good, selectors: working.map((f) => f.selector) }] };
  if (found.length) return { findings: [{ code: 'revoked', result: RESULT.fix, selectors: found.map((f) => f.selector) }] };
  if (failed === selectors.length) return { findings: [{ code: 'failed', result: RESULT.failed }] };
  if (pointersWithoutKey.length) return { findings: [{ code: 'pointer-without-key', result: RESULT.fix, provider: mail.provider?.name ?? null }] };
  if (mail.provider?.fixedNames) return { findings: [{ code: 'missing', result: RESULT.fix, provider: mail.provider.name }] };
  return { findings: [{ code: 'not-found', result: RESULT.look, provider: mail.provider?.name ?? null }] };
}

const isDmarc = (v) => /^v=DMARC1(\s*;|\s*$)/i.test(v);

function tags(record) {
  const out = {};
  for (const part of record.split(';').slice(1)) {
    const [key, ...rest] = part.split('=');
    if (key?.trim()) out[key.trim().toLowerCase()] = rest.join('=').trim();
  }
  return out;
}

// Report addresses whose owner the page can name. GoDaddy's guide gives this address for the DMARC
// record it tells customers to add, so reports go to GoDaddy, not to the owner.
const REPORT_SERVICES = [{ name: 'GoDaddy', domain: /(^|\.)onsecureserver\.net$/ }];

// Who receives the domain's DMARC reports ("rua=mailto:a@x.com,mailto:b@y.com!10m"), and whether
// each address is at the domain itself.
function reportsTo(rua, domain) {
  return rua.split(',')
    .map((part) => part.trim().replace(/^mailto:/i, '').replace(/!.*$/, '').toLowerCase())
    .filter((address) => address.includes('@'))
    .map((address) => {
      const at = address.split('@').pop();
      const yours = at === domain || at.endsWith(`.${domain}`);
      const service = yours ? null : REPORT_SERVICES.find((s) => s.domain.test(at))?.name ?? null;
      return { address, at, yours, service };
    });
}

function checkDmarc(txt, domain) {
  const records = txt.filter(isDmarc);
  if (!records.length) return { findings: [{ code: 'missing', result: RESULT.fix }], values: [] };
  if (records.length > 1) return { findings: [{ code: 'two-records', result: RESULT.fix, count: records.length }], values: records };

  const t = tags(records[0]);
  const policy = (t.p ?? '').toLowerCase();
  const findings = [];
  if (policy === 'reject') findings.push({ code: 'reject', result: RESULT.good });
  else if (policy === 'quarantine') findings.push({ code: 'quarantine', result: RESULT.good });
  else if (policy === 'none') findings.push({ code: 'watching-only', result: RESULT.look });
  else findings.push({ code: 'no-policy', result: RESULT.fix });

  const pct = t.pct === undefined ? 100 : Number(t.pct);
  if (['reject', 'quarantine'].includes(policy) && pct < 100) findings.push({ code: 'partial', result: RESULT.look, pct });
  const to = t.rua ? reportsTo(t.rua, domain) : [];
  if (!to.length) findings.push({ code: 'no-reports', result: RESULT.info });
  // Information only: who reads the reports doesn't change what happens to fake email.
  else findings.push({ code: 'reports-to', result: RESULT.info, to });
  return { findings, values: records, policy };
}

const DAY = 24 * 60 * 60 * 1000;

function checkExpiry(registration, now) {
  if (!registration.expires) return { findings: [{ code: 'unknown', result: RESULT.info }] };
  const days = Math.floor((registration.expires - now) / DAY);
  const at = registration.expires;
  if (days < 0) return { findings: [{ code: 'expired', result: RESULT.fix, at }] };
  if (days < 30) return { findings: [{ code: 'soon', result: RESULT.fix, at, days }] };
  return { findings: [{ code: 'ok', result: RESULT.good, at, days }] };
}

// Runs `fn`, turning a lookup that didn't work into a "couldn't check" finding rather than an error.
async function attempt(fn) {
  try {
    return await fn();
  } catch (err) {
    if (!(err instanceof LookupError)) throw err;
    return { findings: [{ code: 'failed', result: RESULT.failed, reason: err.message }] };
  }
}

const withResult = (id, check) => ({ id, ...check, result: worst(check.findings) });

export async function checkEmail(domain, lookup, { now = new Date() } = {}) {
  // The registry answers first: a domain nobody has registered has nothing else to check.
  let registration = null;
  let registryFailure = null;
  try {
    registration = await lookup.registry(domain);
  } catch (err) {
    if (err instanceof NotRegisteredError) return { domain, registered: false };
    if (!(err instanceof LookupError)) throw err;
    registryFailure = err.message;
  }

  let mail;
  let mailFailure = null;
  try {
    mail = mailService((await lookup.records(domain, 'MX')).values);
  } catch (err) {
    if (!(err instanceof LookupError)) throw err;
    mailFailure = err.message;
    mail = { receives: null, nullMx: false, provider: null };
  }

  let txt = null;
  const txtLookup = attempt(async () => {
    txt = (await lookup.records(domain, 'TXT')).values;
    return null;
  });
  const [, dmarcTxt] = await Promise.all([txtLookup, attempt(async () => ({ values: (await lookup.records(`_dmarc.${domain}`, 'TXT')).values }))]);

  const spf = txt === null
    ? { findings: [{ code: 'failed', result: RESULT.failed }] }
    : await attempt(() => checkSpf(txt, mail, lookup));
  const dmarc = dmarcTxt.findings ? dmarcTxt : checkDmarc(dmarcTxt.values, domain);
  const dkim = await attempt(() => checkDkim(domain, mail, lookup));
  const expiry = registration ? checkExpiry(registration, now) : { findings: [{ code: 'failed', result: RESULT.failed, reason: registryFailure }] };

  const checks = {
    spf: withResult('spf', spf),
    dkim: withResult('dkim', dkim),
    dmarc: withResult('dmarc', dmarc),
    expiry: withResult('expiry', expiry),
  };
  return { domain, registered: true, mail, mailFailure, checks, verdict: verdict(checks) };
}

// The answer to "Can someone send email pretending to be you?"
function verdict({ spf, dkim, dmarc }) {
  if ([spf, dkim, dmarc].some((c) => c.result === RESULT.failed)) return 'unknown';
  const enforcing = dmarc.findings.some((f) => f.code === 'reject' || f.code === 'quarantine');
  if (!enforcing) return 'easy';
  if (dmarc.result === RESULT.good && spf.result !== RESULT.fix && dkim.result === RESULT.good) return 'hard';
  return 'partly';
}
