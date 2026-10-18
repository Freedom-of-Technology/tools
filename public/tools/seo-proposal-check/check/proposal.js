// Before you sign an SEO contract. What an SEO agency's proposal can say that should give an owner
// pause, why each one matters, and what to ask the agency about it. Nothing here reads the proposal:
// the owner ticks what it says.
//
//   GROUPS              -> the groups the red flags show in, in order
//   FLAGS               -> every red flag, in order, each in a group
//   flagged(ticked)     -> the red flags ticked, in FLAGS' order
//   questions(ticked)   -> the questions to send the agency, as plain text: one for each red flag
//                          ticked, then the ones worth asking any agency
//
// ticked: the ids of the red flags the owner ticked, in any order. Ids it doesn't know are dropped.
//
// Each red flag: what the proposal says (says), why it matters (why), and the question it raises
// (ask). A reason links its source as [words](https://address). Where no outside source says it, the
// reason stands on its own and links nothing.

const GOOGLE_SEO =
  "[Google: Do you need an SEO?](https://developers.google.com/search/docs/fundamentals/do-i-need-seo)";

export const GROUPS = [
  { id: "promises", title: "What they promise" },
  {
    id: "accounts",
    title: "Whose name your accounts are in",
    help: "Your Google profile, website and ads hold your business's history. Whoever holds the accounts decides what happens to them.",
  },
  { id: "contract", title: "The contract and the reports" },
  { id: "methods", title: "How they'd do it" },
];

export const FLAGS = [
  {
    id: "guarantee",
    group: "promises",
    says: "Guarantees a ranking, such as first place or the first page of Google",
    why: `Google decides where a site shows, and changes how it decides all the time. Google's own advice: no one can guarantee a #1 ranking, and if someone promises first place, find someone else. ${GOOGLE_SEO}`,
    ask: "What exactly are you promising, and what happens if it doesn't happen?",
  },
  {
    id: "special",
    group: "promises",
    says: "Claims a special relationship with Google, or a way to get your site in front of Google first",
    why: `Google warns about SEOs who claim either. Showing up in Google's search results costs nothing, and you can tell Google about your site yourself in [Google Search Console](https://support.google.com/webmasters/answer/9128668), a free service. A Google Partner badge is real, but it's about running Google ads: it doesn't change where your site shows in search. ${GOOGLE_SEO}`,
    ask: "What does your relationship with Google get us that we couldn't get ourselves?",
  },
  {
    id: "cold",
    group: "promises",
    says: "Got in touch out of the blue, by email, call or message",
    why: `Google's advice is to be wary of SEO firms that email out of the blue. A message saying your site has problems is easy to send to thousands of businesses, so check the company as you would anyone you didn't go looking for. ${GOOGLE_SEO}`,
    ask: "How did you find us, and what did you see that made you get in touch?",
  },
  {
    id: "profile",
    group: "accounts",
    says: "Will set up or hold your Google Business Profile in the agency's name",
    why: "Whoever is your profile's primary owner can take everyone else off it, and only they can hand that role to someone else. [Google: owners and managers](https://support.google.com/business/answer/3403100). Google's rules say anyone who manages a profile for a business must hand ownership back as soon as the business asks. If they don't, Google's ownership request takes days, and doesn't always work. [Google: ownership guidelines](https://support.google.com/business/answer/13763036) and [Google: requesting ownership](https://support.google.com/business/answer/4566671). Keep yourself as primary owner, and add the agency as a manager. [Who owns your Google profile?](https://freedomoftechnology.com/tools/google-profile-owner/) checks yours.",
    ask: "Will you add yourselves as managers of our Google profile, with us as its primary owner?",
  },
  {
    id: "site",
    group: "accounts",
    says: "Will register your web address in the agency's name, or keep your website where you can't get a copy",
    why: "Whoever holds your web address can let it lapse or point it elsewhere, and email at that address goes with it. Ask for the web address to be registered to your business, and for a copy of your site, or a way to move it, if you part ways. Hosting with the agency can be fine. [The Ownership Checklist](https://freedomoftechnology.com/tools/ownership-checklist/) covers both.",
    ask: "Will our web address be registered to our business, and what do we get of our website if we stop working with you?",
  },
  {
    id: "ads",
    group: "accounts",
    says: "Will run your Google ads in an account the agency owns or shares with other clients, or won't show you what the ads cost",
    why: "Google says an agency must set up a separate Google Ads account for you, and that you have the right to know at least your ads' clicks, impressions and total cost. Agencies often charge a fee on top of what the ads cost, so ask what the total comes to. An account you're an admin of, with your own billing, stays with you if you change agency. [Google: working with a third party](https://support.google.com/adspolicy/answer/9457109)",
    ask: "Will our Google Ads account have our own billing, with us as an admin, and will you show us its clicks, impressions and cost each month, apart from your fee?",
  },
  {
    id: "data",
    group: "accounts",
    says: "Will keep your Google Analytics or Search Console in the agency's own account",
    why: `These hold your website's history: how people find it and what they do there. A Google Analytics account the agency holds can leave with the agency. Search Console you can always verify yourself, but it's simpler to own both from the start. Google suggests giving an SEO only read access to Search Console while they look over your site. ${GOOGLE_SEO} [Google: Search Console owners and users](https://support.google.com/webmasters/answer/9008080)`,
    ask: "Will you work in our own Search Console and Google Analytics, with you added as users?",
  },
  {
    id: "lockin",
    group: "contract",
    says: "Locks you in for a year or more, renews on its own, or charges a fee to leave",
    why: "Some changes take months to show in search, so a few months up front can be fair. [Google: SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide). A long term, an automatic renewal or a fee to leave can mean months more of paying whether or not anything improves. Check how much notice you have to give, and by when.",
    ask: "After the first few months, can we go month to month, and what does it cost to leave?",
  },
  {
    id: "vague",
    group: "contract",
    says: "Doesn't say what they'll do each month, only words like \"ongoing optimization\"",
    why: `Google says to be careful of a company that won't clearly explain what it intends to do. Without a list, you can't tell whether you got what you paid for. ${GOOGLE_SEO}`,
    ask: "What will you do each month, and will you tell us every change you make to our site?",
  },
  {
    id: "score",
    group: "contract",
    says: "Measures progress only with its own score or grade",
    why: "A score only the agency can work out can go up while your calls don't. Google Search Console, a free service, shows how often your site came up in Google and how many people clicked, and the calls and bookings are yours to count. [Google: the Search Console performance report](https://support.google.com/webmasters/answer/7576553)",
    ask: "Will your reports show the clicks and impressions from our own Search Console, and the calls or bookings that came from them?",
  },
  {
    id: "reports",
    group: "contract",
    says: "Doesn't say how often they'll report, or what a report shows",
    why: `Without reports, you can't tell whether it's working until you've paid for months. Google suggests asking any SEO how they measure success. ${GOOGLE_SEO}`,
    ask: "How often will you report, and can we see a report you've sent another client, with their name taken out?",
  },
  {
    id: "links",
    group: "methods",
    says: "Sells links: a set number of backlinks or guest posts a month, or links from sites that are paid",
    why: "Google calls links made mainly to raise rankings link spam, including bought links, and guest posts or articles placed with keyword links. A site that breaks Google's rules can rank lower or drop out of its results, and it's your site that pays for it, not the agency's. [Google: spam policies](https://developers.google.com/search/docs/essentials/spam-policies)",
    ask: "Where would the links come from, and is anyone paid for them?",
  },
  {
    id: "linkback",
    group: "methods",
    says: "Requires a link to the agency on your site",
    why: `Google's advice is plain: you should never have to link to an SEO. ${GOOGLE_SEO}`,
    ask: "Can we leave the link to you off our site?",
  },
  {
    id: "reviews",
    group: "methods",
    says: "Offers to get you reviews: bought, written for you, or asked only of happy customers",
    why: "The FTC's rule on fake reviews, in effect in the US since October 2024, bans buying fake reviews, and paying for a review on condition that it's good, and the FTC can take a business that knowingly breaks it to court for penalties. Google's policy is to remove reviews that were paid for, and it doesn't allow asking only happy customers. [FTC: the rule on fake reviews](https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials) and [Google: its rules on reviews](https://support.google.com/contributionpolicy/answer/7400114). [The review link maker](https://freedomoftechnology.com/tools/review-link/) makes asking every customer easy.",
    ask: "How would you get us more reviews, and would every one come from a real customer?",
  },
];

// Worth asking any agency, red flags or not.
const ALWAYS = [
  "What results do you expect for us, and by when?",
  "Can you show us work you've done for businesses like ours, and can we talk to one of them?",
  "If we stop working together, what do we keep: the accounts, what you wrote for our site, and the reports?",
];

export const flagged = (ticked) => FLAGS.filter((flag) => ticked.includes(flag.id));

export function questions(ticked) {
  const asks = [...flagged(ticked).map((flag) => flag.ask), ...ALWAYS];
  return ["Before we decide, could you answer these?", "", ...asks.map((ask) => `- ${ask}`)].join(
    "\n",
  );
}
