// What the Ownership tools share: who holds an account, the message asking them for it, and advice
// with links in it. All in the browser.
//
//   HOLDERS                 -> who holds an account that's someone else's: a category, never a name
//   message(holder, lines)  -> the message asking one holder for one or more accounts, one line each
//   linkPieces(text)        -> advice split into words and links, for the page to draw

// Categories, never names: a shared link carries them, and the page never asks for anyone's name.
// `someone` is also where an account goes when the owner doesn't say who. Ids never change: shared
// links carry them.
//
// Each holder's message is written for who they are to the owner (message below). Where a sentence
// depends on how many accounts it asks for, it's a pair: [one account, more than one]. `request`
// introduces a list of accounts; a message about one account asks for it on its own. `before` is a
// note shown above the message, for a holder the owner may have an agreement with.
export const HOLDERS = [
  {
    id: 'designer',
    label: 'A web designer or agency',
    heading: 'Your web designer or agency',
    before: 'Still working with them, or have a bill open with them? Check your agreement before you send this: it may say what\'s handed over to you, and when.',
    greeting: 'Hi,',
    opening: 'I\'m getting every account the business runs on into the business\'s own name, so nothing depends on any one person. It\'s something I\'m doing for all our accounts, not just the ones you look after.',
    request: 'Could you help with these?',
    closing: 'You\'re welcome to keep access for the work you do for us. No need to send any passwords: an account or login of my own is all I need.',
    signoff: 'Thanks,',
  },
  {
    id: 'staff',
    label: 'An employee',
    heading: 'An employee',
    greeting: 'Hi,',
    opening: 'I\'m putting every account the business runs on in the business\'s own name, so nothing depends on any one of us.',
    request: 'Could you help with these when you have a moment?',
    closing: 'You\'ll keep the access you need for your work. Please don\'t send me any passwords: a login of my own is all I need.',
    signoff: 'Thanks,',
  },
  {
    id: 'former',
    label: 'A former employee',
    heading: 'A former employee',
    greeting: 'Hi,',
    opening: ['I hope you\'re doing well. I\'m tidying up the business\'s accounts, and one is still set up under you.',
      'I hope you\'re doing well. I\'m tidying up the business\'s accounts, and a few are still set up under you.'],
    request: 'Could you help me move them over?',
    closing: ['Once that\'s done, you can take yourself off it, so none of it is on you anymore. Please don\'t send me any passwords: a login of my own is all I need.',
      'Once that\'s done, you can take yourself off them, so none of it is on you anymore. Please don\'t send me any passwords: a login of my own is all I need.'],
    signoff: 'Thank you for your help.',
  },
  {
    id: 'family',
    label: 'A relative or friend',
    heading: 'A relative or friend',
    greeting: 'Hi,',
    opening: 'Thank you again for setting up the business\'s accounts for me. I\'m getting them into the business\'s own name now, so it doesn\'t all depend on you.',
    request: 'Could you help me with these when you get a chance?',
    closing: 'No need to send me any passwords. Once I\'m added, I can take it from there.',
    signoff: 'Thank you!',
  },
  {
    id: 'someone',
    label: 'Someone else',
    heading: 'Whoever holds them',
    before: 'If you have an agreement with them, such as with an IT company, check it before you send this: it may say what\'s handed over to you, and when.',
    greeting: 'Hello,',
    opening: ['I\'m making sure every account the business runs on is in the business\'s own name. As far as I know, this one is set up under you.',
      'I\'m making sure every account the business runs on is in the business\'s own name. As far as I know, the ones below are set up under you.'],
    request: 'Could you help move them over?',
    closing: 'Please don\'t send any passwords: an account or login of my own is all I need.',
    signoff: 'Thank you,',
  },
];

// Written for who the holder is to the owner. One account is asked for on its own; more than one
// come as a list after the holder's request.
export function message(holder, lines) {
  const one = lines.length === 1;
  const pick = (text) => (Array.isArray(text) ? text[one ? 0 : 1] : text);
  return [
    holder.greeting,
    pick(holder.opening),
    one ? lines[0] : `${holder.request}\n\n${lines.map((line) => `- ${line}`).join('\n')}`,
    pick(holder.closing),
    holder.signoff,
  ].join('\n\n');
}

// Advice can link out as [words](https://address); anything else stays words.
export function linkPieces(text) {
  const pieces = [];
  let at = 0;
  for (const match of String(text).matchAll(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g)) {
    if (match.index > at) pieces.push({ text: text.slice(at, match.index) });
    pieces.push({ text: match[1], href: match[2] });
    at = match.index + match[0].length;
  }
  if (at < text.length) pieces.push({ text: text.slice(at) });
  return pieces;
}
