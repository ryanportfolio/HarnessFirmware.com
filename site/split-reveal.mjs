// Masked line -> word -> character reveal, played once.
//
//   const reveal = createSplitReveal(heading, options)
//   reveal.play()     start the reveal (later calls do nothing); returns the total duration in s
//   reveal.played     true once play() ran
//   reveal.destroy()  restore the original markup
//
// The element's text is split into words and characters, then grouped into the lines the
// browser actually laid out (so wrapping on narrow screens is respected). Each line sits in a
// clipping mask; on play its words rise from below it while its characters fade in one after
// another. Line n starts n * lineDelay seconds after the first. Supports plain text, <br>, and
// block-level children (each starts a new line). A line that starts after a <br> or at a block
// child gets .split-reveal__mask--break, so a list of items can space them apart. Words from an
// .is-accent child keep the class, so the accent face survives the split.
// The original text stays available to assistive technology through a visually hidden copy.
// Under prefers-reduced-motion nothing is split and the text stays as authored.
//
// Options (seconds): duration .5 (word rise and each character fade), lineDelay .1,
// charStagger .01 (restarts on every line), charDelay 0 (characters start this long after their
// line's words), easing 'cubic-bezier(.33,1,.68,1)' (ease-out cubic).

export function createSplitReveal(element, {duration = 0.5, lineDelay = 0.1, charStagger = 0.01, charDelay = 0, easing = 'cubic-bezier(.33,1,.68,1)'} = {}) {
  if (!element || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return {get played() { return true; }, play: () => 0, destroy() {}};
  }
  const original = element.innerHTML;
  const state = {played: false, total: 0};

  // Read the authored content once: words separated by whitespace, <br> and the start of a
  // block-level child as forced breaks. Words inside an .is-accent child keep that class.
  const tokens = [];
  const accents = new Set();
  const read = (node, accent = false) => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        for (const word of child.textContent.split(/\s+/)) if (word) { if (accent) accents.add(tokens.length); tokens.push(word); }
      } else if (child.nodeName === 'BR') {
        tokens.push('\n');
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (tokens.length && tokens[tokens.length - 1] !== '\n' && getComputedStyle(child).display === 'block') tokens.push('\n');
        read(child, accent || child.classList.contains('is-accent'));
      }
    }
  };
  read(element);

  let width = 0;
  const build = () => {
    width = element.clientWidth;
    element.classList.add('split-reveal');
    element.style.setProperty('--split-duration', `${duration}s`);
    element.style.setProperty('--split-easing', easing);
    const label = document.createElement('span');
    label.className = 'split-reveal__label';
    label.innerHTML = original;
    const visual = document.createElement('span');
    visual.className = 'split-reveal__visual';
    visual.setAttribute('aria-hidden', 'true');
    // Pass 1: words in normal flow, so the browser sets the line breaks.
    const words = [];
    tokens.forEach((token, index) => {
      if (token === '\n') { visual.append(document.createElement('br')); return; }
      if (index && tokens[index - 1] !== '\n') visual.append(' ');
      const word = document.createElement('span');
      word.className = accents.has(index) ? 'split-reveal__word is-accent' : 'split-reveal__word';
      if (tokens[index - 1] === '\n') word.dataset.break = '';
      for (const char of token) {
        const span = document.createElement('span');
        span.className = 'split-reveal__char';
        span.textContent = char;
        word.append(span);
      }
      visual.append(word);
      words.push(word);
    });
    element.replaceChildren(label, visual);
    // Pass 2: group by rendered line, then wrap each line in its mask.
    const lines = [];
    let lastTop = NaN;
    for (const word of words) {
      const top = word.offsetTop;
      if (!lines.length || Math.abs(top - lastTop) > 2) lines.push([]);
      lines[lines.length - 1].push(word);
      lastTop = top;
    }
    visual.replaceChildren();
    state.total = 0;
    lines.forEach((lineWords, lineIndex) => {
      const mask = document.createElement('span');
      mask.className = lineWords[0].hasAttribute('data-break') ? 'split-reveal__mask split-reveal__mask--break' : 'split-reveal__mask';
      const line = document.createElement('span');
      line.className = 'split-reveal__line';
      const start = lineIndex * lineDelay;
      let charIndex = 0;
      lineWords.forEach((word, wordIndex) => {
        if (wordIndex) line.append(' ');
        word.style.setProperty('--split-delay', `${start}s`);
        for (const char of word.children) char.style.setProperty('--split-delay', `${(start + charDelay + charIndex++ * charStagger).toFixed(3)}s`);
        line.append(word);
      });
      state.total = Math.max(state.total, start + duration, start + charDelay + (charIndex - 1) * charStagger + duration);
      mask.append(line);
      visual.append(mask);
    });
  };
  build();

  // Wrapping depends on width and on the face that is loaded: re-split until the reveal plays.
  const rebuild = () => { if (!state.played) build(); };
  const resizeObserver = new ResizeObserver(() => { if (element.clientWidth !== width) rebuild(); });
  resizeObserver.observe(element);
  document.fonts?.addEventListener?.('loadingdone', rebuild);

  return {
    get played() { return state.played; },
    play() {
      if (state.played) return 0;
      state.played = true;
      getComputedStyle(element).opacity; // commit the hidden state so the transitions run
      element.classList.add('is-revealed');
      return state.total;
    },
    destroy() {
      resizeObserver.disconnect();
      document.fonts?.removeEventListener?.('loadingdone', rebuild);
      element.classList.remove('split-reveal', 'is-revealed');
      element.style.removeProperty('--split-duration');
      element.style.removeProperty('--split-easing');
      element.innerHTML = original;
    },
  };
}
