// The contact the code holds, as a vCard 3.0: the format every phone's camera and contacts app
// reads. The code holds this text itself, so it works with no server and never expires.
//
//   contactCard(details) -> vCard text, lines ending in CRLF
//   fullName(details)    -> the name the phone shows
//   fileName(details)    -> a safe start for the downloaded files' names
//
// details: { first, last, org, title, phone, email, website }, every one optional, but there has
// to be a name or a business name.

import { fileSlug } from '../../shared/page.js';

export class ContactError extends Error {}

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// Commas, semicolons and backslashes separate parts of a vCard line, so inside a value each is
// written with a backslash in front (RFC 2426, section 4). Without it, "Smith, Jones & Co" would
// save as a business called "Smith".
const value = (s) => clean(s).replace(/[\\,;]/g, (c) => `\\${c}`);

export function fullName(d) {
  return clean([clean(d.first), clean(d.last)].filter(Boolean).join(' ')) || clean(d.org);
}

// A website typed as "mybusiness.com" gets "https://", so a phone makes it a link.
function website(s) {
  const site = clean(s);
  if (!site) return '';
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(site) ? site : `https://${site}`;
}

export function contactCard(d) {
  const name = fullName(d);
  if (!name) throw new ContactError('Add a name or a business name.');
  const email = clean(d.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ContactError('That email address doesn\'t look complete. Check it, or leave it empty.');
  }
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  lines.push(`N:${value(d.last)};${value(d.first)};;;`);
  lines.push(`FN:${value(name)}`);
  if (clean(d.org)) lines.push(`ORG:${value(d.org)}`);
  if (clean(d.title)) lines.push(`TITLE:${value(d.title)}`);
  if (clean(d.phone)) lines.push(`TEL;TYPE=VOICE:${value(d.phone)}`);
  // An email address and a web address are written as they are: they aren't text values, so a
  // backslash would become part of them.
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${email}`);
  if (clean(d.website)) lines.push(`URL:${website(d.website)}`);
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

export const fileName = (d) => fileSlug(fullName(d), 'contact');
