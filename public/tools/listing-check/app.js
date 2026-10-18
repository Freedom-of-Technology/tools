// The page: the owner types their correct details, and gets the list from check/listings.js, each
// place with a link to look it up and where to fix it. They mark what they find, and the summary to
// copy keeps up. Everything happens here in the browser: the page's security settings
// (connect-src 'none') block it from sending anything anywhere. Only the links the owner opens leave
// the page, each in a new tab.
//
// Nothing is kept: the details and marks live in this page until it's closed, and never go in the
// page's address.

import { GROUPS, LISTINGS, ListingError, MARKS, details, summary } from "./check/listings.js";
import { copyButton, h, show } from "../shared/page.js";

const form = document.getElementById("listing-form");
const note = document.getElementById("form-note");
const results = document.getElementById("results");
const freeot = document.getElementById("freeot");

const marks = {};
let current = null;

const typed = () =>
  Object.fromEntries(
    ["name", "town", "address", "phone", "website"].map((id) => [id, form.elements[id].value]),
  );

const newTab = (label, href, outline = true) =>
  h(
    "a",
    {
      class: outline ? "fo-btn fo-btn-outline" : "fo-btn",
      href,
      target: "_blank",
      rel: "noopener noreferrer",
    },
    label,
    h("span", { class: "visually-hidden" }, " (opens a new tab)"),
  );

function markChoices(listing) {
  return h(
    "fieldset",
    { class: "marks" },
    h("legend", { class: "visually-hidden" }, `What you found on ${listing.name}`),
    h(
      "div",
      { class: "answers" },
      MARKS.map((mark) => {
        const id = `mark-${listing.id}-${mark.id}`;
        return h(
          "label",
          { class: "answer", for: id },
          h("input", {
            type: "radio",
            id,
            name: `mark-${listing.id}`,
            value: mark.id,
            checked: marks[listing.id] === mark.id,
          }),
          h("span", {}, mark.label),
        );
      }),
    ),
  );
}

function row(listing, d) {
  const looks = listing.lookUps(d);
  return h(
    "article",
    { class: "listing", id: `listing-${listing.id}` },
    h("h4", { class: "listing-name" }, listing.name),
    h("p", { class: "listing-why" }, listing.why),
    listing.id === "website" && !d.website
      ? h(
          "p",
          { class: "listing-why" },
          "Add your web address above to look at your site, or mark it Not for us if you don't have one.",
        )
      : null,
    h(
      "div",
      { class: "fo-row" },
      looks.map(({ label, href }, i) => newTab(label, href, i > 0)),
      listing.fix
        ? h(
            "a",
            {
              class: "fo-link fix",
              href: listing.fix.href,
              target: "_blank",
              rel: "noopener noreferrer",
            },
            `Fix it: ${listing.fix.label}`,
            h("span", { class: "visually-hidden" }, " (opens a new tab)"),
          )
        : null,
    ),
    markChoices(listing),
  );
}

function summaryBlock() {
  const text = summary(current, marks, new Date());
  const shown = h("div", { class: "message" }, text);
  return [
    h(
      "p",
      { class: "hint" },
      "It keeps up as you mark each one. Copy it to keep your list, or to send to whoever helps with your listings: nothing is saved, so closing the page clears your marks.",
    ),
    shown,
    h("div", { class: "fo-row" }, copyButton(text, shown, "Copy summary")),
  ];
}

function showList(d) {
  current = d;
  freeot.hidden = false;
  show(
    results,
    h(
      "div",
      { class: "result-head" },
      h(
        "div",
        {},
        h("h2", { class: "fo-h2" }, `Your list for ${d.name}`),
        h(
          "p",
          { class: "hint" },
          "Open each one, compare what you see with your details, and mark it. Each link opens in a new tab, so this list stays here.",
        ),
      ),
    ),
    GROUPS.map((group) =>
      h(
        "section",
        { class: "listing-group", "aria-labelledby": `group-${group.id}` },
        h("h3", { class: "fo-h3", id: `group-${group.id}` }, group.title),
        h("p", { class: "hint" }, group.help),
        LISTINGS.filter((listing) => listing.group === group.id).map((listing) => row(listing, d)),
      ),
    ),
    h(
      "section",
      { class: "listing-group", "aria-labelledby": "summary-title" },
      h("h3", { class: "fo-h3", id: "summary-title" }, "Your summary"),
      h("div", { id: "summary" }, summaryBlock()),
    ),
  );
}

results.addEventListener("change", (event) => {
  const name = event.target.name ?? "";
  if (!name.startsWith("mark-")) return;
  marks[name.slice("mark-".length)] = event.target.value;
  document.getElementById("summary").replaceChildren(...summaryBlock());
});

form.addEventListener("input", () => {
  note.textContent = "";
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    showList(details(typed()));
  } catch (error) {
    if (!(error instanceof ListingError)) throw error;
    note.textContent = error.message;
  }
});
