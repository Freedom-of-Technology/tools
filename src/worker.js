// FreeOT's free tools. Cloudflare sends this Worker every request for freedomoftechnology.com/tools,
// the same on www, and everything for check.freeot.com (the routes are in wrangler.toml). The
// pages themselves are the files in public/, served as they are.
//
// - Anything on check.freeot.com, links already shared included, moves permanently to Almanac
//   Check's page on the main site, keeping its path.
// - www.freedomoftechnology.com/tools/... moves permanently to the same page without www, so
//   every link counts toward one address.
// - Everything else is a file from public/, with the security headers below added. A page is also
//   marked so Cloudflare passes it on unchanged (see unchanged()).

const MAIN_SITE = "https://freedomoftechnology.com";
const OLD_ADDRESS = "check.freeot.com";
const DOMAIN_CHECK = "/tools/domain-check/";

// What every page needs that it can't set for itself. Each page's own Content-Security-Policy
// (in its HTML) limits what it can load; this one stops other sites showing it inside theirs.
const SECURITY_HEADERS = {
  "Content-Security-Policy": "frame-ancestors 'none'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

// Cloudflare can rewrite a page on its way to the visitor: on freedomoftechnology.com it adds its
// Web Analytics script to every page. A tool page says it has no tracking scripts and is the same
// as its code on GitHub, so its HTML carries "no-transform", which Cloudflare leaves alone. Only
// the HTML: no-transform also stops Cloudflare compressing a file, and the scripts are the big ones.
function unchanged(response) {
  if (!(response.headers.get("Content-Type") ?? "").startsWith("text/html")) return;
  const cache = response.headers.get("Cache-Control");
  response.headers.set("Cache-Control", cache ? `${cache}, no-transform` : "no-transform");
}

function moved(to, from) {
  const target = new URL(to, MAIN_SITE);
  target.search = from.search;
  return Response.redirect(target.href, 301);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === OLD_ADDRESS) {
      return moved(DOMAIN_CHECK + url.pathname.replace(/^\/+/, ""), url);
    }
    if (url.hostname.startsWith("www.")) {
      return moved(url.pathname, url);
    }

    const asset = await env.ASSETS.fetch(request);
    const response = new Response(asset.body, asset);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
    unchanged(response);
    return response;
  },
};
