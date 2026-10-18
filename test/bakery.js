// The made-up bakery whose records file is files/maple-street-bakery.com.zone: what's live for it
// when nothing has gone wrong, for check.test.js (the page's code) and cli.test.js (the command line).
// A test changes its own copy.

// Long enough that the records file splits it into strings of 255, as a real DKIM key is.
export const DKIM = `v=DKIM1; k=rsa; p=MAPLE${"a".repeat(60)}BREAD${"b".repeat(150)}SCONE${"c".repeat(60)}`;

export const bakeryLive = () => ({
  records: {
    "maple-street-bakery.com A": ["104.21.0.10", "172.67.0.10"], // Cloudflare's addresses
    "www.maple-street-bakery.com A": ["104.21.0.10", "172.67.0.10"],
    "maple-street-bakery.com MX": ["5 alt1.aspmx.l.google.com.", "1 aspmx.l.google.com."],
    "maple-street-bakery.com TXT": ["v=spf1 include:_spf.google.com ~all"],
    "google._domainkey.maple-street-bakery.com TXT": [DKIM],
    "_dmarc.maple-street-bakery.com TXT": [
      "v=DMARC1; p=none; rua=mailto:owner@maple-street-bakery.com",
    ],
  },
  registry: {
    "maple-street-bakery.com": { nameservers: ["ada.ns.cloudflare.com", "bob.ns.cloudflare.com"] },
  },
});
