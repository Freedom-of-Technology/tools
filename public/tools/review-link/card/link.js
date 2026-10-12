// The review link the owner pastes: Google's own, copied from their Business Profile (Read reviews,
// then Get more reviews). The page uses it exactly as Google gave it, so a printed card opens the
// same page for as long as Google keeps that link working; it never builds a link of its own.
//
//   reviewLink(text)       -> the link to put in the code; throws ReviewLinkError when it isn't Google's
//   reviewDetails(details) -> { business, topline, link }, tidied; throws ReviewLinkError with the reason
//
// details: { business, topline, link }, as typed. The business name is needed, for the top of the
// counter card; the words above the code are optional.

export class ReviewLinkError extends Error {}

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// Google's addresses: google.com and its country versions (google.ca, google.co.uk), their
// subdomains (www, search, maps, business), and Google's short links (g.page, maps.app.goo.gl).
const GOOGLE = /^((www|search|maps|business)\.)?google\.(com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$|^g\.page$|^maps\.app\.goo\.gl$/;

export function reviewLink(text) {
  const typed = String(text ?? '').trim();
  if (!typed) throw new ReviewLinkError('Paste the review link from your Business Profile.');
  let url;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(typed) ? typed : `https://${typed}`);
  } catch {
    throw new ReviewLinkError('That doesn\'t look like a link. Copy it again from your Business Profile.');
  }
  if (!['https:', 'http:'].includes(url.protocol) || !GOOGLE.test(url.hostname)) {
    throw new ReviewLinkError('That isn\'t a link from Google. Copy the review link from your Business Profile: Read reviews, then Get more reviews.');
  }
  // Every Google link works over https; a pasted "http://" is only ever a typo.
  url.protocol = 'https:';
  return url.href;
}

export function reviewDetails(d) {
  const business = clean(d.business);
  if (!business) throw new ReviewLinkError('Add your business name. It goes at the top of your counter card.');
  return { business, topline: clean(d.topline), link: reviewLink(d.link) };
}
