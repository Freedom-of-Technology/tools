// Who owns your Google profile? What the owner can see on their Google Business Profile, and what to
// do about it. It asks what the owner sees; nothing here looks anything up.
//
//   QUESTIONS             -> the questions, in order, each with its answers
//   asked(answers)        -> the questions this owner is asked, given the answers so far
//   unanswered(answers)   -> the questions asked and not yet answered (who holds it is optional)
//   result(answers)       -> { id, title, hint, steps, ask }: what to do (see RESULTS)
//   toHash(answers)       -> the answers as the part of a shared link after "#"
//   fromHash(hash)        -> the answers from a shared link; anything unknown is dropped
//
// Every step about Google's menus comes from Google's own help pages, linked from the step. Advice
// can link out as [words](https://address).

import { HOLDERS } from "../../shared/ask.js";

const HELP = {
  people: "https://support.google.com/business/answer/3403100",
  primary: "https://support.google.com/business/answer/3415281",
  request: "https://support.google.com/business/answer/4566671",
  rules: "https://support.google.com/business/answer/13763036",
};

// `holder` is optional: the page asks it only when someone else holds the profile, and writes the
// message to whoever that is, or to "Whoever holds them" when the owner doesn't say.
export const QUESTIONS = [
  {
    id: "access",
    question: "Can you open your profile's controls?",
    help: "Signed in to the Google account you use for the business, go to business.google.com. If you manage the profile, it opens with its controls, such as Edit profile.",
    answers: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
      { id: "unsure", label: "Not sure" },
    ],
  },
  {
    id: "role",
    question: "What does People and access say next to your name?",
    help: "In the profile, choose More, then Business Profile settings, then People and access.",
    answers: [
      { id: "primary", label: "Primary owner" },
      { id: "owner", label: "Owner" },
      { id: "manager", label: "Manager" },
    ],
  },
  {
    id: "others",
    question: "Is anyone else listed who shouldn't be?",
    help: "Such as an agency you no longer use, a former employee, or someone you don't recognize.",
    answers: [
      { id: "no", label: "No, only people I trust" },
      { id: "yes", label: "Yes" },
    ],
  },
  {
    id: "holder",
    question: "Who holds the profile? If you know.",
    help: "Your result writes them a message.",
    answers: HOLDERS.map(({ id, label }) => ({ id, label })),
  },
];

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const known = (id, answer) => byId[id]?.answers.some((a) => a.id === answer) ?? false;

export function asked(answers) {
  if (answers.access === "yes") {
    return answers.role === "owner" || answers.role === "manager"
      ? ["access", "role", "others", "holder"]
      : ["access", "role", "others"];
  }
  if (answers.access === "no") return ["access", "holder"];
  return ["access"];
}

export function unanswered(answers) {
  return asked(answers).filter((id) => id !== "holder" && !known(id, answers[id]));
}

// The line the message asks with. Google makes a new owner wait 7 days before they can be made
// primary owner, so a manager asks for both, a week apart.
const ASKS = {
  "add-owner":
    "Our Google Business Profile: could you add me as an owner, and a week later make me the primary owner? Google makes new owners wait 7 days. Both are under People and access in the profile's settings.",
  "make-primary":
    "Our Google Business Profile: could you make me its primary owner? It's under People and access in the profile's settings: select me, then Edit next to Access.",
};

const REMOVE = `To take someone off, open People and access, select them, then Remove person. Only owners can. [Google: owners and managers](${HELP.people})`;
const RULES = `If they're slow to hand it over: Google's rules say anyone who manages a profile for a business must hand ownership to the business as soon as it asks. [Google: ownership guidelines](${HELP.rules})`;
const REQUEST = `If they won't, or can't be reached, ask Google: at business.google.com/add, find your business, choose Request access and fill in the form. Whoever holds the profile has 3 days to answer. If they don't, a way to claim it may appear, though not always. A business without a shop or office contacts Google support instead. [Google: requesting ownership](${HELP.request})`;
const MANAGERS = `Give anyone who helps with the profile Manager, not Owner: managers can edit it, but can't add or remove people or remove the profile. [Google: owners and managers](${HELP.people})`;

// Each result: what it's called (title), one line on why (hint), the steps, and which message
// to send (ask), if any.
const RESULTS = {
  check: {
    title: "First, check whether you can open it",
    hint: "Then answer again.",
    steps: [
      "Sign in to the Google account you use for the business, and go to business.google.com. If you manage the profile, it opens with its controls, such as Edit profile.",
      "If it doesn't, try any other Google account you might have used to set it up, such as an old personal Gmail.",
      `If none of them open it, choose No above. [Google: editing your profile](https://support.google.com/business/answer/3039617)`,
    ],
  },
  ask: {
    title: "Ask for your profile",
    hint: "Someone else holds it. Whoever does can add you as an owner, then make you the primary owner.",
    ask: "add-owner",
    steps: [
      "First, check you're signed in to every Google account you might have used: the profile may be in one you've forgotten.",
      RULES,
      REQUEST,
    ],
  },
  safe: {
    title: "Your Google profile is yours",
    hint: "You're its primary owner, and only people you trust can get in.",
    steps: [
      MANAGERS,
      "Look again when someone who helps with it leaves, or you stop working with an agency.",
    ],
  },
  remove: {
    title: "Your Google profile is yours. Take off who shouldn't be there",
    hint: "You're its primary owner, so you can remove anyone.",
    steps: [REMOVE, MANAGERS],
  },
  primary: {
    title: "Ask to be made primary owner",
    hint: "You're an owner, but someone else is primary owner, and only they can make you primary.",
    ask: "make-primary",
    steps: [
      `If you were made an owner in the last 7 days, Google makes you wait until the 7 days are up. [Google: transferring primary ownership](${HELP.primary})`,
      RULES,
      "Once you're primary owner, take off anyone who shouldn't be there. " + REMOVE,
    ],
  },
  owner: {
    title: "Ask to be made owner, then primary owner",
    hint: "You're a manager: you can edit the profile, but whoever is primary owner can take you off it.",
    ask: "add-owner",
    steps: [
      `Google makes a new owner wait 7 days before they can be made primary owner, so it takes two steps a week apart. [Google: transferring primary ownership](${HELP.primary})`,
      RULES,
      "Once you're primary owner, take off anyone who shouldn't be there. " + REMOVE,
    ],
  },
};

function resultId({ access, role, others }) {
  if (access === "no") return "ask";
  if (access !== "yes") return "check";
  if (role === "manager") return "owner";
  if (role === "owner") return "primary";
  return others === "yes" ? "remove" : "safe";
}

export function result(answers) {
  const id = resultId(answers);
  const { ask, ...rest } = RESULTS[id];
  return { id, ...rest, ask: ask ? ASKS[ask] : null, askFor: ask ?? null };
}

export function toHash(answers) {
  return new URLSearchParams(
    asked(answers)
      .filter((id) => known(id, answers[id]))
      .map((id) => [id, answers[id]]),
  ).toString();
}

export function fromHash(hash) {
  const params = new URLSearchParams(String(hash ?? "").replace(/^#/, ""));
  const answers = {};
  for (const { id } of QUESTIONS) {
    if (known(id, params.get(id))) answers[id] = params.get(id);
  }
  return Object.fromEntries(
    asked(answers)
      .filter((id) => id in answers)
      .map((id) => [id, answers[id]]),
  );
}
