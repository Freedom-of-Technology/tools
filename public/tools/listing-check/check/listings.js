// Are my details right everywhere? The places a business's name, address and phone show up, a link to
// look each one up, and where the owner fixes it. Nothing here looks anything up: the owner opens each
// link, looks, and marks what they see.
//
//   GROUPS                    -> the groups the listings show in, in order
//   LISTINGS                  -> every place to check, in order, each in a group. lookUps(details)
//                                gives [{ label, href }]: where to look, with the name and town filled in
//   MARKS                     -> what the owner can mark each one
//   details(typed)            -> { name, town, address, phone, website }, tidied, with the website as
//                                a link; throws ListingError when something needed is missing, or the
//                                website isn't one
//   summary(details, marks, date) -> the summary to copy, as plain text
//
// typed: { name, town, address, phone, website }, as typed. The name and town are needed, since every
// search is for them; the rest are for the owner to check against, and for the summary.
// marks: { <listing id>: <mark id> }.

export class ListingError extends Error {}

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const q = encodeURIComponent;

export const GROUPS = [
  { id: 'site', title: 'Your own website', help: 'What a customer reads there, and what search engines read.' },
  { id: 'maps', title: 'Maps and search', help: 'Where most people look a business up: on their phone, in the car, or in a search.' },
  { id: 'directories', title: 'Review and directory sites', help: 'Skip any that don\'t fit your business.' },
  { id: 'suppliers', title: 'Data suppliers', help: 'Companies that supply business details to other apps and websites. You won\'t come across them as a customer would, but the details they hold are passed on.' },
];

// Facebook, Nextdoor and Angi have no search a visitor can open without signing in, so their look-up
// is a Google search of that site.
const siteSearch = (domain) => (d) => [{
  label: 'Look it up',
  href: `https://www.google.com/search?q=${q(`site:${domain} "${d.name.replace(/"/g, '')}" ${d.town}`)}`,
}];

export const LISTINGS = [
  {
    id: 'website',
    group: 'site',
    name: 'Your website',
    why: 'Check the name, phone and address in the footer and on your contact page, then what your site tells search engines.',
    lookUps: (d) => (d.website ? [
      { label: 'Open your website', href: d.website },
      { label: 'See what it tells search engines', href: `https://validator.schema.org/#url=${q(d.website)}` },
    ] : []),
    fixWith: 'whoever looks after your website',
  },
  {
    id: 'google',
    group: 'maps',
    name: 'Google Search and Maps',
    why: 'Your Google Business Profile: the listing most customers see.',
    lookUps: (d) => [{ label: 'Look it up', href: `https://www.google.com/maps/search/?api=1&query=${q(`${d.name} ${d.town}`)}` }],
    fix: { label: 'Google Business Profile', href: 'https://business.google.com/' },
  },
  {
    id: 'apple',
    group: 'maps',
    name: 'Apple Maps',
    why: 'What iPhones show in Maps.',
    lookUps: (d) => [{ label: 'Look it up', href: `https://maps.apple.com/search?query=${q(`${d.name} ${d.town}`)}` }],
    fix: { label: 'Apple Business', href: 'https://business.apple.com/' },
  },
  {
    id: 'bing',
    group: 'maps',
    name: 'Bing Maps',
    why: 'Microsoft\'s maps and search.',
    lookUps: (d) => [{ label: 'Look it up', href: `https://www.bing.com/maps?q=${q(`${d.name} ${d.town}`)}` }],
    fix: { label: 'Bing for business', href: 'https://www.bing.com/forbusiness' },
  },
  {
    id: 'yelp',
    group: 'directories',
    name: 'Yelp',
    why: 'A review site many customers check. Paid listings show first; look past them.',
    lookUps: (d) => [{ label: 'Look it up', href: `https://www.yelp.com/search?find_desc=${q(d.name)}&find_loc=${q(d.town)}` }],
    fix: { label: 'Yelp for Business', href: 'https://biz.yelp.com/claim' },
  },
  {
    id: 'facebook',
    group: 'directories',
    name: 'Facebook',
    why: 'Your Page\'s details: hours, phone and address.',
    lookUps: siteSearch('facebook.com'),
    fix: { label: 'Your Facebook Pages', href: 'https://www.facebook.com/pages/?category=your_pages' },
  },
  {
    id: 'bbb',
    group: 'directories',
    name: 'Better Business Bureau',
    why: 'Some customers check it before hiring. The profile is free.',
    lookUps: (d) => [{ label: 'Look it up', href: `https://www.bbb.org/search?find_country=USA&find_text=${q(d.name)}&find_loc=${q(d.town)}` }],
    fix: { label: 'BBB: claim or add your profile', href: 'https://www.bbb.org/get-listed' },
  },
  {
    id: 'nextdoor',
    group: 'directories',
    name: 'Nextdoor',
    why: 'Neighbors recommending local businesses.',
    lookUps: siteSearch('nextdoor.com'),
    fix: { label: 'Nextdoor for business', href: 'https://business.nextdoor.com/' },
  },
  {
    id: 'angi',
    group: 'directories',
    name: 'Angi',
    why: 'For home services, such as plumbers and cleaners.',
    lookUps: siteSearch('angi.com'),
    fix: { label: 'Angi for pros', href: 'https://pro.angi.com/' },
  },
  {
    id: 'data-axle',
    group: 'suppliers',
    name: 'Data Axle',
    why: 'Search for your phone number. Free for up to 10 listings.',
    lookUps: () => [{ label: 'Look it up', href: 'https://local-listings.data-axle.com/search' }],
    fix: { label: 'Data Axle local listings', href: 'https://local-listings.data-axle.com/search' },
  },
  {
    id: 'foursquare',
    group: 'suppliers',
    name: 'Foursquare',
    why: 'Search for your name and town, then choose Claim on your listing.',
    lookUps: () => [{ label: 'Look it up', href: 'https://business.foursquare.com/' }],
    fix: { label: 'Foursquare for business', href: 'https://business.foursquare.com/' },
  },
];

export const MARKS = [
  { id: 'right', label: 'Right' },
  { id: 'wrong', label: 'Wrong' },
  { id: 'missing', label: 'Not there' },
  { id: 'skip', label: 'Not for us' },
];

function webAddress(text) {
  const typed = clean(text);
  if (!typed) return '';
  let url;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(typed) ? typed : `https://${typed}`);
  } catch {
    throw new ListingError('That doesn\'t look like a web address. Type it as it shows in your browser, such as yourbusiness.com.');
  }
  // A website on the internet: http or https, and a name with a dot in it.
  if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.')) {
    throw new ListingError('That isn\'t a website\'s address. Type it as it shows in your browser, such as yourbusiness.com.');
  }
  return url.href;
}

export function details(typed) {
  const name = clean(typed.name);
  const town = clean(typed.town);
  if (!name) throw new ListingError('Add your business name. It\'s what each site is searched for.');
  if (!town) throw new ListingError('Add your town or ZIP code, so each search finds you rather than a business with the same name.');
  return { name, town, address: clean(typed.address), phone: clean(typed.phone), website: webAddress(typed.website) };
}

// The listings under each part of the summary: { toFix, right, skipped, unchecked }.
function summaryParts(marks) {
  const parts = { toFix: [], right: [], skipped: [], unchecked: [] };
  for (const listing of LISTINGS) {
    const mark = marks[listing.id];
    if (mark === 'wrong' || mark === 'missing') parts.toFix.push({ listing, mark });
    else if (mark === 'right') parts.right.push({ listing });
    else if (mark === 'skip') parts.skipped.push({ listing });
    else parts.unchecked.push({ listing });
  }
  return parts;
}

const fixLine = ({ listing, mark }) => {
  const what = mark === 'wrong' ? 'the details are wrong' : 'not listed';
  const verb = mark === 'wrong' ? 'Fix it' : 'Add it';
  return `- ${listing.name}: ${what}. ${verb} ${listing.fix ? `at ${listing.fix.href}` : `with ${listing.fixWith}`}`;
};

export function summary(d, marks, date) {
  const { toFix, right, skipped, unchecked } = summaryParts(marks);
  const when = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const section = (title, lines) => (lines.length ? ['', title, ...lines] : []);
  return [
    `Are my details right everywhere? ${d.name}, checked ${when}`,
    '',
    'The right details',
    `Name: ${d.name}`,
    d.address ? `Address: ${d.address}` : null,
    d.phone ? `Phone: ${d.phone}` : null,
    d.website ? `Website: ${d.website}` : null,
    ...section('To fix', toFix.map(fixLine)),
    ...section('Right', right.map(({ listing }) => `- ${listing.name}`)),
    ...section('Not checked yet', unchecked.map(({ listing }) => `- ${listing.name}`)),
    ...section('Not for us', skipped.map(({ listing }) => `- ${listing.name}`)),
  ].filter((line) => line != null).join('\n');
}
