// The page: the owner ticks what an SEO agency's proposal says, from check/proposal.js, and the red
// flags show as they tick, each with why it matters and what to ask, then the questions to copy and
// send the agency. Everything happens here in the browser: the page's security settings
// (connect-src 'none') block it from sending anything anywhere.
//
// Nothing is kept: the ticks live in this page until it's closed, and never go in the page's address.

import { FLAGS, GROUPS, flagged, questions } from "./check/proposal.js";
import { linked } from "../shared/ask-page.js";
import { copyButton, h } from "../shared/page.js";

const form = document.getElementById("proposal-form");
const list = document.getElementById("flags");
const results = document.getElementById("results");
const freeot = document.getElementById("freeot");

list.replaceChildren(
  ...GROUPS.map((group) =>
    h(
      "fieldset",
      { class: "question" },
      h("legend", { class: "question-name" }, group.title),
      group.help ? h("p", { class: "question-help" }, group.help) : null,
      h(
        "div",
        { class: "ticks" },
        FLAGS.filter((flag) => flag.group === group.id).map((flag) =>
          h(
            "label",
            { class: "tick", for: `flag-${flag.id}` },
            h("input", { type: "checkbox", id: `flag-${flag.id}`, name: "flag", value: flag.id }),
            h("span", {}, flag.says),
          ),
        ),
      ),
    ),
  ),
);

const ticked = () =>
  [...form.querySelectorAll('input[name="flag"]:checked')].map((input) => input.value);

// Redrawn on every tick, without moving focus, so the owner can keep ticking. Only the count, the
// result's heading, is read out (#flag-count is a live region).
function draw() {
  const flags = flagged(ticked());
  const text = questions(ticked());
  const shown = h("div", { class: "message" }, text);
  document.getElementById("flag-count").textContent = flags.length
    ? `${flags.length} red flag${flags.length === 1 ? "" : "s"}`
    : "No red flags ticked";
  results.replaceChildren(
    h(
      "p",
      { class: "hint" },
      flags.length
        ? "Each says why it matters, and what to ask the agency."
        : "None ticked yet. Even a proposal with no red flags is worth the questions below.",
    ),
    flags.length
      ? h(
          "div",
          { class: "problems" },
          flags.map((flag) =>
            h(
              "article",
              { class: "problem" },
              h(
                "div",
                { class: "problem-head" },
                h("span", { class: "badge badge-flag" }, "Red flag"),
                h("h3", { class: "problem-title" }, flag.says),
              ),
              linked(flag.why),
              h("p", {}, h("strong", {}, "Ask them: "), flag.ask),
            ),
          ),
        )
      : null,
    h(
      "section",
      { class: "plan-part", "aria-labelledby": "questions-title" },
      h("h3", { class: "fo-h3", id: "questions-title" }, "Questions to send the agency"),
      h(
        "p",
        { class: "hint" },
        "One for each red flag you ticked, then a few worth asking any agency. Ask for the answers in writing, before you sign.",
      ),
      shown,
      h("div", { class: "fo-row" }, copyButton(text, shown, "Copy questions")),
    ),
  );
}

form.addEventListener("change", () => {
  freeot.hidden = false;
  draw();
});
form.addEventListener("submit", (event) => event.preventDefault());

draw();
