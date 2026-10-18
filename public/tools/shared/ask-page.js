// What the Ownership tools' pages share: advice drawn with its links, and the message to a holder,
// folded until the owner opens it. All in the browser.
//
//   linked(text)               -> a paragraph of advice, its [words](https://address) drawn as links
//   foldedMessage(body, id)    -> [the row of buttons, the message], to place in that order

import { linkPieces } from "./ask.js";
import { copyButton, h } from "./page.js";

// Links in advice go to other sites, such as a company's help page, so they open in a new tab.
export function linked(text) {
  return h(
    "p",
    {},
    linkPieces(text).map((piece) =>
      piece.href
        ? h(
            "a",
            { class: "fo-link", href: piece.href, target: "_blank", rel: "noopener" },
            piece.text,
          )
        : piece.text,
    ),
  );
}

// The message stays folded until the owner opens it, so the result reads as a list of what to do.
// Copying it opens it too, so what's copied is on the page.
export function foldedMessage(body, id) {
  const shown = h("p", { class: "message", id, hidden: true }, body);
  const toggle = h(
    "button",
    {
      type: "button",
      class: "fo-btn fo-btn-outline",
      "aria-expanded": "false",
      "aria-controls": id,
    },
    "Show the message",
  );
  const open = (on) => {
    shown.hidden = !on;
    toggle.setAttribute("aria-expanded", String(on));
    toggle.textContent = on ? "Hide the message" : "Show the message";
  };
  toggle.addEventListener("click", () => open(shown.hidden));
  const copy = copyButton(body, shown, "Copy message");
  copy.addEventListener("click", () => open(true));
  return [h("div", { class: "fo-row" }, toggle, copy), shown];
}
