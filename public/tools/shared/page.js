// What every tool page that makes something shares: building its result, showing it, and the
// files it offers to download. All in the browser.
//
//   h(tag, attrs, ...children)        -> an element; attrs set to false or null are left off
//   show(results, ...children)        -> puts a result in the results box and moves focus to its heading
//   notMade(results, title, message)  -> a result saying why nothing was made
//   downloads()                       -> { url(blob), clear() }: addresses for files made in the browser
//   pngOf(canvas)                     -> the canvas as a PNG file
//   download(label, url, name)        -> a download button
//   copyButton(link, shown)           -> a Copy link button; `shown` is the element showing the link
//   fileSlug(text, fallback)          -> a safe start for a downloaded file's name

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    if (key === 'class') el.className = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

// Focus goes to the result's heading, so a screen reader reads it out and the page scrolls to it.
export function show(results, ...children) {
  results.replaceChildren(h('div', { class: 'result' }, ...children));
  const heading = results.querySelector('h2');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: false });
  }
}

export function notMade(results, title, message) {
  show(results, h('div', { class: 'problem' },
    h('div', { class: 'problem-head' },
      h('span', { class: 'badge badge-failed' }, 'Not made'),
      h('h2', { class: 'problem-title' }, title)),
    h('p', {}, message)));
}

// Each new result lets go of the last one's files.
export function downloads() {
  let made = [];
  return {
    url(blob) {
      const url = URL.createObjectURL(blob);
      made.push(url);
      return url;
    },
    clear() {
      for (const url of made) URL.revokeObjectURL(url);
      made = [];
    },
  };
}

export const pngOf = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

export function download(label, url, name) {
  return h('a', { class: 'fo-btn fo-btn-outline', href: url, download: name }, label);
}

// Copies the link, and says so on the button, since nothing else on the page changes. Where the
// browser won't let a page copy, it selects the link shown instead, ready to copy by hand.
export function copyButton(link, shown) {
  const button = h('button', { type: 'button', class: 'fo-btn fo-btn-outline' }, 'Copy link');
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(link);
      button.textContent = 'Copied';
    } catch {
      window.getSelection().selectAllChildren(shown);
      button.textContent = 'Selected above: copy it from there';
    }
  });
  return button;
}

// Lowercase letters, digits and dashes, accents dropped. The fallback is for when nothing is left,
// such as a name in another alphabet.
export function fileSlug(text, fallback) {
  const slug = String(text ?? '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || fallback;
}
