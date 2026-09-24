// Text effects shared by the scroll-driven homepage sections.
//
//   splitText(element, {chars})  wrap each word (and each character) in spans; the visible copy
//                                is aria-hidden and a plain copy stays readable for assistive tech
//                                (its .fx-sr class is defined globally in styles.css)
//   randomStagger(count, amount) start offsets spread evenly over `amount`, in random order
//   flicker(u)                   opacity curve for one word of a flicker reveal (bounce in-out)
//   scrambleText(element, opts)  run a label through its own letters, settling left to right
//   bindScramble(trigger, label) scramble on pointer enter and keyboard focus; off under
//                                prefers-reduced-motion
//   ease.*                       easing curves on 0..1

export const clamp01 = value => value < 0 ? 0 : value > 1 ? 1 : value;

function bounceOut(u) {
  const n = 7.5625, d = 2.75;
  if (u < 1 / d) return n * u * u;
  if (u < 2 / d) return n * (u -= 1.5 / d) * u + .75;
  if (u < 2.5 / d) return n * (u -= 2.25 / d) * u + .9375;
  return n * (u -= 2.625 / d) * u + .984375;
}

export const ease = {
  power1Out: u => 1 - (1 - u) ** 2,
  power1InOut: u => u < .5 ? 2 * u * u : 1 - 2 * (1 - u) ** 2,
  power2InOut: u => u < .5 ? 4 * u ** 3 : 1 - 4 * (1 - u) ** 3,
  power4In: u => u ** 5,
  power4Out: u => 1 - (1 - u) ** 5,
  power4InOut: u => u < .5 ? 16 * u ** 5 : 1 - 16 * (1 - u) ** 5,
  sineIn: u => 1 - Math.cos(u * Math.PI / 2),
  bounceInOut: u => u < .5 ? (1 - bounceOut(1 - 2 * u)) / 2 : (1 + bounceOut(2 * u - 1)) / 2,
};

// A flicker reveal fades each word in on a bounce curve, so it blinks a few times on the way
// up; the words start in random order (see randomStagger).
export const flicker = u => ease.bounceInOut(clamp01(u));

export function randomStagger(count, amount, random = Math.random) {
  const slots = Array.from({length: count}, (_, i) => count > 1 ? i * amount / (count - 1) : 0);
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots;
}

// Inline wrappers inside the element (an accent span, for example) are kept around their
// words. restore() puts the original nodes back.
export function splitText(element, {chars = false} = {}) {
  const original = [...element.childNodes];
  const plain = element.textContent.replace(/\s+/g, ' ').trim();
  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  const words = [];
  const letters = [];
  const walk = (source, target) => {
    for (const node of source.childNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const copy = node.cloneNode(false);
        copy.removeAttribute('id');
        target.append(copy);
        walk(node, copy);
        continue;
      }
      if (node.nodeType !== Node.TEXT_NODE) continue;
      for (const part of node.textContent.split(/(\s+)/)) {
        if (!part) continue;
        if (!part.trim()) { target.append(' '); continue; }
        const word = document.createElement('span');
        word.className = 'fx-word';
        if (chars) {
          for (const character of part) {
            const letter = document.createElement('span');
            letter.className = 'fx-char';
            letter.textContent = character;
            word.append(letter);
            letters.push(letter);
          }
        } else {
          word.textContent = part;
        }
        target.append(word);
        words.push(word);
      }
    }
  };
  walk(element, visual);
  const readable = document.createElement('span');
  readable.className = 'fx-sr';
  readable.textContent = plain;
  element.replaceChildren(readable, visual);
  return {words, chars: letters, restore: () => element.replaceChildren(...original)};
}

// Letters are drawn from the label itself; the unsettled tail is re-rolled every `interval` ms
// and the settled prefix grows on a sine-in curve, so the label locks in slowly, then quickly.
export function scrambleText(element, {duration = .8, interval = 50, random = Math.random} = {}) {
  const text = element.textContent;
  const pool = [...new Set(text.toUpperCase().replace(/\s+/g, ''))];
  if (!pool.length) return () => {};
  const roll = () => Array.from(text, () => pool[Math.floor(random() * pool.length)]).join('');
  let tail = roll();
  let rolled = 0;
  let frame = 0;
  const start = performance.now();
  const tick = now => {
    const u = clamp01((now - start) / (duration * 1000));
    if (now - rolled >= interval) { tail = roll(); rolled = now; }
    const settled = Math.ceil(text.length * ease.sineIn(u));
    element.textContent = u >= 1 ? text : text.slice(0, settled) + tail.slice(settled);
    frame = u >= 1 ? 0 : requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => { cancelAnimationFrame(frame); element.textContent = text; };
}

export function bindScramble(trigger, label, options) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  let cancel = null;
  const run = () => {
    if (reduce.matches) return;
    cancel?.();
    cancel = scrambleText(label, options);
  };
  trigger.addEventListener('pointerenter', run, {signal: events.signal});
  trigger.addEventListener('focus', run, {signal: events.signal});
  return () => { events.abort(); cancel?.(); };
}
