/* Hero pillar headline: a fixed lead-in ("Your agent's work,") with a rotating pillar word
   that cycles through the pillars and settles on the tagline ("Better outcomes, every round").

   What it builds inside `root`:
     .hp-head     a stable heading (<h1> by default) holding the tagline, which is what
                  assistive tech, copy and search read, with an aria-hidden .hp-stage over it
                  that carries the animation
     .hp-rule     short accent rule
     .hp-subs     aria-hidden sub-line for the word on show
     .hp-lede     the tagline's sub-line as a paragraph for assistive tech (visually hidden)
     .hp-list     the pillars as a list for assistive tech, skill names as links (visually hidden)
     .hp-words    aria-hidden: the pillar words as one quiet line, shown in static mode only

   Motion runs on the Web Animations API and touches transform, opacity and filter only, so
   the compositor carries it. Every glyph is absolutely positioned at the offset it has in
   the naturally kerned phrase (measured once, in em), so kerning survives the per-glyph
   split and nothing reflows. Nothing is clipped or masked: a glyph is always drawn whole.
   Rows are kept apart in time instead. A word leaves and its successor arrives as two
   fronts sweeping left to right, the leaving one three times faster, and the arriving one
   starts only once the leaving glyph at x = 0 is below 5% ink, so at every x the old glyph
   is gone before the new one shows. A row whose new glyphs rise through the row beneath
   waits the same way for that row's old word.

   The anchor is what line one keeps from the lead to the tagline: a shared last word, or
   else the shared closing mark (the comma of "work," and "outcomes,"). In 'morph' mode it
   stays on screen and glides FLIP-style to its new x, timed so its leading edge only ever
   passes over glyphs that are already gone; when it moves right, the new glyphs it would
   cover wait for it. In 'crossfade' mode line one swaps whole, like a pillar word.

   With `--hp-stack: 1` on `root` (for narrow screens) line one breaks at its last space
   ("Your agent's / work,") so the headline can stay large; the second row trails the first.

     const dispose = mountHeroPillars(el, { onPillar: (stage, change) => lightNode(stage) });
     dispose.replay();               // hand over to the first pillar and run the pass again
     dispose.update({ wave: 50 });   // timing options apply from the next transition
     dispose();                      // stop and restore el's original children

   `el` must be a block with a definite width; it becomes an inline-size container and the
   headline scales to fit it, capped at --hp-size. Every change also dispatches `hp:pillar`
   on `el` with detail { index, stage }. onPillar's second argument (absent in static mode
   and after a failure) lets the host time its own motion to the change; see go(). */

// `skills` names what does the work behind each pillar: typed commands carry their slash;
// what runs by itself carries a `tag` instead; `href` is where the name leads. The host shows
// them (onPillar's `pillar`), and the pillar list reads them out, as links, after the line.
const skill = (name, tag) => ({ name, ...(tag && { tag }), href: `/skills#skill-${name.replace(/^\//, '')}` });
const file = (name, tag) => ({ name, tag, href: '/memory#routing' });
export const DEFAULT_PILLARS = [
  { word: 'token-efficient', line: 'Skills and project notes load only when a task needs them.', stage: 'recall',
    skills: [skill('caveman', 'always on'), skill('recall', 'automatic')] },
  { word: 'planned', line: 'Brainstorm, write the plan, and test alternatives before building.', stage: 'plan',
    skills: [skill('/dare'), skill('/arena'), skill('/lab')] },
  { word: 'audited', line: 'A second model reviews the work before you approve it.', stage: 'audit',
    skills: [skill('/codex-review'), skill('/impartial-review'), skill('/handoff-audit')] },
  { word: 'remembered', line: 'Decisions and pitfalls carry into the next session.', stage: 'lessons',
    skills: [file('pitfalls.md', 'auto-saved'), file('architecture.md', 'auto-loaded')], skillsLabel: 'Memory files' },
  { word: 'production-ready', line: 'Long tasks run in audited rounds. Finished work gets polished and measured before it ships.', stage: 'human',
    // the two long-horizon runtimes end the branch, one above the other
    skills: [skill('/wow-loop'), skill('/perf-loop'), skill('/long-horizon'), skill('/long-horizon-workflows')] },
  { word: 'self-improving', line: 'When a workflow stumbles, the fix goes into the skill itself.', stage: 'integrate',
    skills: [skill('/refine')] },
];

// Entrance curves. All start fast and spend their second half on the last few percent.
export const EASINGS = {
  expo: 'cubic-bezier(0.16, 1, 0.3, 1)',
  'expo-sharp': 'cubic-bezier(0.19, 1, 0.22, 1)',
  quint: 'cubic-bezier(0.22, 1, 0.36, 1)',
  quart: 'cubic-bezier(0.25, 1, 0.5, 1)',
  cubic: 'cubic-bezier(0.33, 1, 0.68, 1)',
};

const DEFAULTS = {
  lead: "Your agent's work,",
  pillars: DEFAULT_PILLARS,
  settle: 'Better outcomes, every round',
  settleLine: 'Memory, workflows and review for Claude Code and Codex, built into the repository.',
  tag: 'h1',
  titleId: '', // id for the heading, e.g. for a section's aria-labelledby
  hold: 1900, // ms a pillar rests after its entrance finishes
  settleHold: 5200, // ms the tagline rests before the cycle restarts (loop only)
  duration: 1000, // ms of one glyph's entrance
  wave: 55, // ms per em: speed of the arriving front; the leaving one sweeps three times faster
  gap: 160, // ms between the arriving fronts of consecutive rows
  ease: 'expo', // EASINGS key or any CSS easing
  blur: 0.08, // em of blur at the start of an entrance
  loop: false, // false: one pass, then rest on the tagline
  settleMode: 'crossfade', // 'crossfade': line one swaps whole, like a pillar word; 'morph': the anchor stays and glides
  reducedMotion: 'auto', // 'auto' follows prefers-reduced-motion; true/false force it
  onPillar: null, // (stage | null, change?) => void, fired as each change starts
};

const RISE = 0.3; // em an entering glyph travels up
const LIFT = 0.2; // em a leaving glyph travels up
const FAINT = 0.05; // ink below this counts as gone (leaving) or not yet there (arriving)
const PAD = 0.1; // em kept between the gliding anchor and any glyph with ink (covers blur halos)
// Curves as control points, so the timing can be solved against them.
const C = {
  exitMove: [0.45, 0, 0.85, 0.45], // leaving glyphs accelerate away...
  exitFade: [0.25, 0.4, 0.45, 1], // ...but lose their ink early
  ink: [0.4, 0, 0.2, 1], // entering ink and focus trail the rise, so a glyph is faint while it is still low
  glide: [0.4, 0, 0.2, 1],
  clear: [0.35, 0, 0.15, 1], // a widening glide gets out of the way early
  soft: [0.22, 1, 0.36, 1],
};
const css = (c) => `cubic-bezier(${c.join(', ')})`;
const bez = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
const solve = (f, y) => { // smallest input in [0, 1] where the increasing f reaches y
  let lo = 0, hi = 1;
  for (let i = 0; i < 32; i++) { const m = (lo + hi) / 2; if (f(m) < y) lo = m; else hi = m; }
  return hi;
};
const ease = ([x1, y1, x2, y2], x) => bez(solve((s) => bez(s, x1, x2), x), y1, y2);
const reach = (c, y) => (y <= 0 ? 0 : y >= 1 ? 1 : solve((x) => ease(c, x), y)); // progress at which curve c reaches y

const em = (v) => `${+v.toFixed(4)}em`;

export function mountHeroPillars(root, options = {}) {
  const original = [...root.childNodes];
  const originalStyle = root.getAttribute('style');
  const originalClass = root.getAttribute('class');
  const restore = () => {
    for (const [name, value] of [['class', originalClass], ['style', originalStyle]]) {
      if (value === null) root.removeAttribute(name);
      else root.setAttribute(name, value);
    }
    root.replaceChildren(...original);
  };
  try {
    return mount(root, { ...DEFAULTS, ...options }, restore);
  } catch (err) {
    restore(); // leave the host's own heading in place
    throw err;
  }
}

function mount(root, o, restore) {
  const doc = root.ownerDocument;
  const pillars = o.pillars;
  const n = pillars.length;

  // ---- text model -------------------------------------------------------------------
  // Line one of the tagline runs to its first word ending in , ; or : (else its first half).
  const lead = o.lead.trim();
  const settleWords = o.settle.trim().split(/\s+/);
  let k = settleWords.findIndex((w) => /[,;:]$/.test(w));
  if (k < 0) k = Math.ceil(settleWords.length / 2) - 1;
  const settleOne = settleWords.slice(0, k + 1).join(' ');
  const tail = settleWords.slice(k + 1).join(' ');
  const cut = tail.lastIndexOf(' ') + 1; // the tail's last word takes the accent
  // The anchor stays on screen from the lead to the tagline: the last word both line ones
  // share ("work," / "work,"), or failing that their shared closing mark ("work," / "outcomes,").
  const leadLast = lead.split(/\s+/).at(-1);
  const oneLast = settleWords[k];
  const anchorText = leadLast === oneLast ? leadLast : /[,;:]$/.test(leadLast) && leadLast.at(-1) === oneLast.at(-1) ? leadLast.at(-1) : '';
  const bare = (s) => (anchorText ? s.slice(0, -anchorText.length).trimEnd() : s);
  const leadPrefix = bare(lead);
  const settlePrefix = bare(settleOne);
  // stacking breaks line one at its last space: "Your agent's / work," and "Better / outcomes,"
  const stackable = lead.includes(' ') && settleOne.includes(' ');

  // ---- DOM --------------------------------------------------------------------------
  const el = (tag, cls, text) => {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const hidden = (e) => (e.setAttribute('aria-hidden', 'true'), e);

  root.classList.add('hp');
  const head = el('div', 'hp-head');
  const title = el(o.tag, 'hp-title');
  if (o.titleId) title.id = o.titleId;
  const brk = settleOne.lastIndexOf(' ');
  if (stackable) title.append(settleOne.slice(0, brk + 1), el('br', 'hp-br'), `${settleOne.slice(brk + 1)} `);
  else title.append(`${settleOne} `);
  title.append(el('br'), tail.slice(0, cut), el('span', 'hp-accent', tail.slice(cut)));
  const stage = hidden(el('span', 'hp-stage'));
  // Rows: line one, its anchor (same line unless stacked), the pillar word.
  const rows = [1, 2, 3].map((i) => stage.appendChild(el('span', `hp-row hp-row-${i}`)));
  head.append(title, stage);

  const rule = hidden(el('span', 'hp-rule'));
  const subsBox = hidden(el('p', 'hp-subs'));
  const subs = [...pillars.map((p) => p.line), o.settleLine || ''].map((t) => subsBox.appendChild(el('span', 'hp-sub', t)));
  const lede = o.settleLine ? el('p', 'hp-lede', o.settleLine) : '';
  // The list stays visually hidden in every mode, so its text runs inline with no box of its
  // own in between (a hidden box would read as a space: "token-efficient : ..."). Its links
  // are out of the tab order: nothing visible would show their focus.
  const list = el('ul', 'hp-list');
  list.setAttribute('aria-label', o.lead.replace(/[,:;]\s*$/, ''));
  const words = hidden(el('p', 'hp-words'));
  pillars.forEach((p, i) => {
    const li = el('li');
    li.append(`${p.word}: ${p.line}`);
    if (p.skills?.length) {
      li.append(` ${p.skillsLabel || 'Skills'}: `);
      p.skills.forEach((s, j) => {
        let name = s.name;
        if (s.href) {
          name = el('a', '', s.name);
          name.href = s.href;
          name.tabIndex = -1;
        }
        li.append(j ? ', ' : '', name, s.tag ? ` (${s.tag})` : '');
      });
      li.append('.');
    }
    list.append(i ? ' ' : '', li);
    words.append(i ? ' ' : '', el('span', 'hp-word', p.word));
  });
  const meas = hidden(el('span', 'hp-measure')); // stays laid out in static mode, unlike the stage
  root.replaceChildren(head, rule, subsBox, lede, list, words, meas);

  const group = (row, str, cls = '') => {
    const g = { el: el('span', `hp-grp ${cls}`.trim()), glyphs: [], idx: [], local: [], right: [], row: [], str, x: 0, w: 0 };
    [...str].forEach((ch, i) => {
      if (ch === ' ') return;
      g.glyphs.push(g.el.appendChild(el('span', 'hp-g', ch)));
      g.idx.push(i);
    });
    row.append(g.el);
    return g;
  };
  const G = {
    lead: leadPrefix ? group(rows[0], leadPrefix) : null,
    anchor: anchorText ? group(rows[1], anchorText) : null,
    settle: settlePrefix ? group(rows[0], settlePrefix) : null,
    settleAnchor: anchorText ? group(rows[1], anchorText) : null, // crossfade copy
    words: pillars.map((p) => group(rows[2], p.word, 'hp-accent')),
    tail: group(rows[2], tail),
  };
  G.tail.glyphs.forEach((g, j) => G.tail.idx[j] >= cut && g.classList.add('hp-accent'));

  // ---- measurement (em, from a 100px copy of the phrase) --------------------------------
  // From index `acc` on, the phrase is set as .hp-accent, which may carry its own face
  // (--hp-accent-font and friends), so a mixed row measures as it renders.
  const range = doc.createRange();
  const measure = (str, acc = str.length) => {
    const plain = str.slice(0, acc);
    const accent = str.slice(acc);
    meas.replaceChildren(...(plain ? [plain] : []), ...(accent ? [el('span', 'hp-accent', accent)] : []));
    const plainNode = plain ? meas.firstChild : null;
    const accentNode = accent ? meas.lastChild.firstChild : null;
    const box = meas.getBoundingClientRect();
    const xs = [];
    for (let i = 0; i <= str.length; i++) {
      if (i === str.length) { xs.push(box.width / 100); break; }
      const [node, at] = i < acc ? [plainNode, i] : [accentNode, i - acc];
      range.setStart(node, at);
      range.setEnd(node, at + 1);
      xs.push((range.getBoundingClientRect().left - box.left) / 100);
    }
    // An italic accent can reach past its last advance (a slanted d's ascender runs ~0.15em
    // beyond it); xs.ink is where its ink ends, so the fit keeps the whole glyph in the box.
    xs.ink = xs.at(-1);
    if (accent && pen) {
      const s = getComputedStyle(meas.lastChild);
      // canvas takes no font-variation-settings; at 144px automatic optical sizing matches the
      // largest opsz, the one an accent face with a set opsz is most likely to use
      pen.font = `${s.fontStyle} ${s.fontWeight} 144px ${s.fontFamily}`;
      xs.ink = Math.max(xs.ink, xs[str.length - 1] + pen.measureText(accent.at(-1)).actualBoundingBoxRight / 144);
    }
    return xs; // xs[i] = pen position of char i; xs[length] = phrase width
  };
  const pen = doc.createElement('canvas').getContext?.('2d');
  // Asks for the headline and accent faces outright: fonts.ready alone only covers faces the
  // page has already requested.
  const loadFaces = () => {
    if (!doc.fonts?.load) return Promise.resolve();
    meas.replaceChildren('A', el('span', 'hp-accent', 'a'));
    const font = (e) => { const s = getComputedStyle(e); return `${s.fontStyle} ${s.fontWeight} 100px ${s.fontFamily}`; };
    const faces = [font(meas), font(meas.lastChild)];
    meas.textContent = '';
    return Promise.all(faces.map((f) => doc.fonts.load(f).catch(() => {}))).then(() => doc.fonts.ready);
  };
  const place = (g, xs, from) => {
    g.x = xs[from];
    g.w = xs[from + g.str.length] - g.x;
    g.local = g.idx.map((i) => xs[from + i] - g.x);
    g.right = g.idx.map((i) => xs[from + i + 1] - g.x);
    g.row = g.idx.map(() => 0);
    g.glyphs.forEach((s, j) => { s.style.left = em(g.local[j]); });
  };
  // Line one: its prefix glyphs (over two rows when stacked) and where its anchor sits in its row.
  const line = (g, anchor, full) => {
    const xs = measure(full);
    const b = stacked ? full.lastIndexOf(' ') : -1;
    const second = (i) => b >= 0 && i > b;
    const off = (i) => (second(i) ? xs[b + 1] : 0); // the second row starts after the break
    if (g) {
      place(g, xs, 0);
      g.idx.forEach((i, j) => {
        g.row[j] = +second(i);
        g.local[j] -= off(i);
        g.right[j] -= off(i);
        g.glyphs[j].style.left = em(g.local[j]);
        g.glyphs[j].style.top = g.row[j] ? 'calc(var(--hp-lh) * 1em)' : '';
      });
    }
    const a = full.length - (anchor?.str.length || 0);
    if (anchor) place(anchor, xs, a);
    return { x: xs[a] - off(a), fit: b >= 0 ? Math.max(xs[b], xs.at(-1) - xs[b + 1]) : xs.at(-1) };
  };
  const isStacked = () => stackable && getComputedStyle(root).getPropertyValue('--hp-stack').trim() === '1';
  let stacked = false;
  const X = { leadAnchor: 0, settleAnchor: 0 };
  let measured = false;
  let subRise = 0.45; // em the sub-line rises on entry (--hp-sub-rise)
  function layout() {
    stacked = isStacked();
    root.classList.toggle('is-stacked', stacked);
    const a = line(G.lead, G.anchor, lead);
    const b = line(G.settle, G.settleAnchor, settleOne);
    X.leadAnchor = a.x;
    X.settleAnchor = b.x;
    let fit = Math.max(a.fit, b.fit);
    for (const g of [...G.words, G.tail]) {
      const xs = measure(g.str, g === G.tail ? cut : 0); // pillar words are accent throughout
      fit = Math.max(fit, xs.ink);
      place(g, xs, 0);
    }
    meas.textContent = '';
    for (const g of [G.lead, G.settle, G.tail, ...G.words]) if (g) g.el.style.left = em(g.x);
    if (G.settleAnchor) G.settleAnchor.el.style.left = em(X.settleAnchor);
    if (shown1) shown1 = lineOne(cur, shown1.anchor);
    if (G.anchor) G.anchor.el.style.left = em(shown1?.anchor === G.anchor ? shown1.x : X.leadAnchor);
    root.style.setProperty('--hp-fit', (fit + 0.04).toFixed(4));
    subRise = parseFloat(getComputedStyle(root).getPropertyValue('--hp-sub-rise')) || 0.45;
    measured = true;
  }

  // ---- state helpers --------------------------------------------------------------------
  let cur = -1; // -1 nothing shown, 0..n-1 pillar, n tagline
  let shown1 = null; // line one as last entered (settleMode may change in between)
  function lineOne(i, anchor) {
    if (i !== n) return { prefix: G.lead, anchor: G.anchor, x: X.leadAnchor };
    anchor ??= o.settleMode === 'morph' ? G.anchor : G.settleAnchor;
    return { prefix: G.settle, anchor, x: X.settleAnchor };
  }
  const lineTwo = (i) => (i === n ? G.tail : G.words[i]);

  // ---- animation bookkeeping (pausable, cancellable) --------------------------------------
  let gen = 0;
  const owned = new Set(); // every animation of the current transition, until cleanup
  const held = new Set(); // the ones we paused
  let paused = true; // until the IntersectionObserver reports in
  let timer = null;
  let pending = null; // cleanup of the change in flight
  let warming = false; // the intro is built but held (see run())
  let carry = null; // what a change cut short by Replay left on screen, for the next change
  let was = null; // `carry`, while go() builds the change that takes it over

  function play(target, frames, opts) {
    const a = target.animate(frames, { fill: 'both', ...opts });
    owned.add(a);
    if (paused || warming) { a.pause(); held.add(a); }
    return a;
  }
  function setPaused(p) {
    if (p === paused) return;
    paused = p;
    if (p) {
      for (const a of owned) if (a.playState === 'running') { a.pause(); held.add(a); }
      if (timer?.id) {
        clearTimeout(timer.id);
        timer.left -= performance.now() - timer.t0;
        timer.id = 0;
      }
    } else {
      for (const a of held) if (a.playState === 'paused') a.play(); // play() on a finished one would rewind it
      held.clear();
      if (timer) arm();
    }
  }
  function arm() {
    timer.t0 = performance.now();
    timer.id = setTimeout(() => { const t = timer; timer = null; t.done(true); }, Math.max(0, timer.left));
  }
  function clearTimer() {
    if (!timer) return;
    clearTimeout(timer.id);
    const t = timer;
    timer = null;
    t.done(false);
  }
  const wait = (ms, g) =>
    new Promise((done) => {
      timer = { done: (ok) => done(ok && g === gen), left: ms, t0: 0, id: 0 };
      if (!paused) arm();
    });
  function dropAnimations() {
    for (const a of owned) a.cancel();
    owned.clear();
    held.clear();
  }
  // Opacity, transform and filter of every element the change in flight animates, as drawn now.
  function snapshot() {
    const m = new Map();
    for (const a of owned) {
      const e = a.effect?.target;
      if (!e || m.has(e) || !a.effect.getKeyframes().length) continue;
      const cs = getComputedStyle(e);
      m.set(e, { opacity: +cs.opacity, transform: cs.transform, filter: cs.filter });
    }
    return m;
  }

  // ---- motion primitives ------------------------------------------------------------------
  const T = () => {
    const D = o.duration;
    const t = { D, V: o.wave, Vout: o.wave / 3, gap: o.gap, outD: D * 0.38, fadeD: D * 0.26, inkD: D * 0.6, ease: EASINGS[o.ease] || o.ease, blur: o.blur };
    t.gone = reach(C.exitFade, 1 - FAINT) * t.fadeD; // a leaving glyph is under FAINT ink this long after it starts
    t.shows = reach(C.ink, FAINT) * t.inkD; // an arriving glyph passes FAINT ink this long after it starts
    return t;
  };
  // Each glyph starts when its front reaches it: t0 + (its x in the row, em) * speed.
  // Position eases over the full duration; ink and focus arrive over the first 60% on a curve
  // that starts slowly, so a glyph is faint while it is still below its line.
  const enter = (g, t0, t, anims, x0 = g?.x) =>
    g?.glyphs.forEach((s, j) => {
      const delay = t0 + g.row[j] * t.gap + (x0 + g.local[j]) * t.V; // a second row trails the first
      anims.push(
        play(s, [{ transform: `translateY(${RISE}em)` }, { transform: 'translateY(0)' }], { duration: t.D, delay, easing: t.ease }),
        play(s, [{ opacity: 0, filter: `blur(${t.blur}em)` }, { opacity: 1, filter: 'blur(0em)' }], { duration: t.inkD, delay, easing: css(C.ink) }),
      );
    });
  // A leaver starts from where it is: at rest, or, after a Replay cut a change short, from the
  // state that change had it in (see `was`), so a half-arrived glyph never jumps to full ink.
  const leave = (g, t0, t, anims, x0 = g?.x) =>
    g?.glyphs.forEach((s, j) => {
      const delay = t0 + (x0 + g.local[j]) * t.Vout;
      const w = was?.get(s);
      anims.push(
        play(s, [{ transform: w?.transform ?? 'translateY(0)' }, { transform: `translateY(${-LIFT}em)` }], { duration: t.outD, delay, easing: css(C.exitMove) }),
        play(s, [{ opacity: w?.opacity ?? 1, filter: w?.filter ?? 'blur(0em)' }, { opacity: 0, filter: `blur(${t.blur * 0.5}em)` }], { duration: t.fadeD, delay, easing: css(C.exitFade) }),
      );
    });
  const glide = (g, from, to, delay, duration, anims, curve) => {
    g.el.style.left = em(to);
    if (Math.abs(from - to) < 1e-4) return;
    anims.push(play(g.el, [{ transform: `translateX(${em(from - to)})` }, { transform: 'translateX(0)' }],
      { duration, delay, easing: css(curve), fill: 'backwards' }));
  };
  // Narrowing glide: the anchor slides left over the ground the old prefix is leaving. Its
  // start is the earliest at which its leading edge reaches every old glyph only after that
  // glyph is below FAINT ink.
  const glideStart = (old, from, to, dur, t) => {
    let g0 = 0;
    old?.glyphs.forEach((_, j) => {
      if (old.row[j] !== +stacked) return; // only glyphs on the anchor's row lie in its path
      const f = (from - (old.x + old.right[j] + PAD)) / (from - to); // share of the glide done on contact
      if (f >= 1) return;
      const gone = (old.x + old.local[j]) * t.Vout + t.gone;
      g0 = Math.max(g0, gone - reach(C.glide, f) * dur);
    });
    return g0;
  };
  // Widening glide: the anchor slides right off the ground the new prefix will take; the
  // prefix's front starts late enough that each glyph shows only once the anchor has cleared it.
  const prefixStart = (next, from, to, dur, t) => {
    let t1 = 0;
    next?.glyphs.forEach((_, j) => {
      if (next.row[j] !== +stacked) return;
      const f = (next.x + next.right[j] + PAD - from) / (to - from);
      if (f <= 0) return;
      t1 = Math.max(t1, reach(C.clear, f) * dur - next.row[j] * t.gap - (next.x + next.local[j]) * t.V - t.shows);
    });
    return t1;
  };
  const fadeFrom = (e, t) => {
    const w = was.get(e) || { opacity: 0 };
    return play(e, [w, { ...w, opacity: 0 }], { duration: t.fadeD, easing: css(C.exitFade) });
  };
  const subIn = (s, t0, t, anims) =>
    anims.push(play(s, [
      { transform: `translateY(${subRise}em)`, opacity: 0, filter: 'blur(4px)' },
      { transform: 'translateY(0)', opacity: 1, filter: 'blur(0px)' },
    ], { duration: t.D * 0.95, delay: t0, easing: css(C.soft) }));
  const subOut = (s, t0, t, anims) =>
    anims.push(play(s, [
      { transform: 'translateY(0)', opacity: 1, filter: 'blur(0px)', ...was?.get(s) },
      { transform: 'translateY(-0.3em)', opacity: 0, filter: 'blur(3px)' },
    ], { duration: t.fadeD, delay: t0, easing: css(C.exitFade) }));
  // The accent rule leaves with line one's first glyph and draws in again with the pillar
  // row, like the intro. The arrival only fills forwards, so the exit holds until it starts.
  const ruleOut = (t, anims) =>
    anims.push(play(rule, [
      { transform: 'scaleX(1)', opacity: 1, ...was?.get(rule) },
      { transform: 'scaleX(0)', opacity: 0 },
    ], { duration: t.fadeD, easing: css(C.exitFade) }));
  const ruleIn = (t0, t, anims) =>
    anims.push(
      play(rule, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: t.D, delay: t0, easing: t.ease, fill: 'forwards' }),
      play(rule, [{ opacity: 0 }, { opacity: 1 }], { duration: t.inkD, delay: t0, easing: css(C.ink), fill: 'forwards' }),
    );

  // ---- one transition -----------------------------------------------------------------------
  function go(to, g) {
    const from = cur;
    cur = to;
    was = carry;
    carry = null;
    const t = T();
    const anims = [];
    const show = new Set();
    const hide = new Set();
    const on = (...els) => els.forEach((e) => e && (show.add(e), hide.delete(e)));
    const off = (...els) => els.forEach((e) => e && !show.has(e) && hide.add(e));

    const b1 = lineOne(to);
    const b2 = lineTwo(to);
    const anchorLag = stacked ? t.gap : 0; // a stacked anchor is a row of its own
    let t2; // when the pillar row's arriving front starts
    let swapRule = false;
    if (from < 0) {
      // intro: rows sweep in one gap apart, each behind the one above at every x
      on(b1.prefix?.el, b1.anchor?.el);
      if (b1.anchor) b1.anchor.el.style.left = em(b1.x);
      enter(b1.prefix, 0, t, anims);
      enter(b1.anchor, anchorLag, t, anims, b1.x);
      t2 = anchorLag + t.gap;
      on(b2.el);
      enter(b2, t2, t, anims);
      // the accent rule draws in under the arriving word, on the same front and ink curve
      on(rule);
      anims.push(
        play(rule, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: t.D, delay: t2, easing: t.ease }),
        play(rule, [{ opacity: 0 }, { opacity: 1 }], { duration: t.inkD, delay: t2, easing: css(C.ink) }),
      );
    } else {
      const a1 = shown1;
      const a2 = lineTwo(from);
      off(a2.el);
      leave(a2, 0, t, anims);
      subOut(subs[from], 0, t, anims);
      off(subs[from]);
      // The arriving front trails the leaving one and is slower, so once x = 0 is clear
      // every x is clear by the time the new word reaches it.
      t2 = Math.max(t.gap, t.gone);
      if (a1.prefix !== b1.prefix || a1.anchor !== b1.anchor) {
        // Row one's new glyphs rise through the pillar row's band: they wait for its old word
        // the same way, and for their own row's.
        let t1 = t.gone;
        if (a1.anchor && a1.anchor === b1.anchor) {
          off(a1.prefix?.el);
          leave(a1.prefix, 0, t, anims);
          on(b1.prefix?.el, b1.anchor.el);
          if (b1.x < a1.x) {
            const dur = t.D * 0.55;
            glide(b1.anchor, a1.x, b1.x, glideStart(a1.prefix, a1.x, b1.x, dur, t), dur, anims, C.glide);
          } else if (b1.x > a1.x) {
            const dur = t.D * 0.6;
            glide(b1.anchor, a1.x, b1.x, 0, dur, anims, C.clear);
            t1 = Math.max(t1, prefixStart(b1.prefix, a1.x, b1.x, dur, t));
          }
          enter(b1.prefix, t1, t, anims);
        } else {
          off(a1.prefix?.el, a1.anchor?.el);
          leave(a1.prefix, 0, t, anims);
          leave(a1.anchor, 0, t, anims, a1.x);
          on(b1.prefix?.el, b1.anchor?.el);
          if (b1.anchor) b1.anchor.el.style.left = em(b1.x);
          enter(b1.prefix, t1, t, anims);
          enter(b1.anchor, t1 + anchorLag, t, anims, b1.x);
          swapRule = true; // every row changes whole: nothing else would hold the rule's place in the trough
        }
        t2 = Math.max(t2, t1 + anchorLag + t.gap);
      }
      on(b2.el);
      enter(b2, t2, t, anims);
      if (swapRule) {
        ruleOut(t, anims);
        ruleIn(t2, t, anims);
      }
      // Whatever a cut-short change was still fading out goes on fading from where it was.
      if (was) {
        for (const grp of [G.lead, G.anchor, G.settle, G.settleAnchor, G.tail, ...G.words]) {
          if (!grp || show.has(grp.el) || hide.has(grp.el) || !grp.glyphs.some((s) => was.get(s)?.opacity > FAINT)) continue;
          grp.el.classList.add('is-on');
          hide.add(grp.el);
          grp.glyphs.forEach((s) => anims.push(fadeFrom(s, t)));
        }
        subs.forEach((s, i) => {
          if (i === from || i === to || !(was.get(s)?.opacity > FAINT)) return;
          s.classList.add('is-on');
          hide.add(s);
          anims.push(fadeFrom(s, t));
        });
      }
    }
    if (subs[to].textContent) {
      on(subs[to]);
      subIn(subs[to], t2 + 120, t, anims);
    }

    shown1 = b1;
    for (const e of show) e.classList.add('is-on', 'is-anim');
    for (const e of hide) e.classList.add('is-anim');
    const after = [];
    // same task: hide the leavers, then drop every fill; nothing paints in between
    const cleanup = () => {
      if (pending !== cleanup) return;
      pending = null;
      for (const e of hide) e.classList.remove('is-on');
      for (const e of [...show, ...hide]) e.classList.remove('is-anim');
      for (const f of after) f();
      dropAnimations();
    };
    pending = cleanup;
    const stageName = to < n ? pillars[to].stage : null;
    // The host can run its own motion as part of this change: `play` works like the
    // component's (paused, resumed, finished and dropped with it) and `after` runs at cleanup,
    // where the host puts its resting state in place. `mid` is when the arriving word's
    // average glyph starts; timings are in ms, distances in em of the animated element.
    // `from(el)` is el's opacity, transform and filter as a change that Replay cut short left
    // them, if that change animated it (else null), so the host's leavers can start from there
    // too; `gone` and `shows` are how long a leaver takes to fall below faint ink and an
    // arriver to rise past it.
    o.onPillar?.(stageName, {
      index: to, pillar: to < n ? pillars[to] : null, mid: t2 + ((b2.w || 0) / 2) * t.V, intro: from < 0,
      timing: { D: t.D, inkD: t.inkD, outD: t.outD, fadeD: t.fadeD, gone: t.gone, shows: t.shows, rise: RISE, lift: LIFT, blur: t.blur,
        ease: t.ease, ink: css(C.ink), exitMove: css(C.exitMove), exitFade: css(C.exitFade) },
      play: (target, frames, opts) => { const a = play(target, frames, opts); anims.push(a); return a; },
      after: (f) => after.push(f),
      from: (e) => was?.get(e) ?? null,
    });
    was = null;
    root.dispatchEvent(new CustomEvent('hp:pillar', { detail: { index: to, stage: stageName } }));

    return Promise.all(anims.map((a) => a.finished)).then(
      () => {
        if (g !== gen) return false;
        cleanup();
        return true;
      },
      () => false,
    );
  }
  // Brings a change in flight to its end state at once, cleaned up as if it had played out.
  function settleNow() {
    if (!pending) return;
    for (const a of owned) a.finish();
    pending();
  }

  async function run(g, again = false) {
    if (!again) {
      await loadFaces();
      if (g !== gen) return;
      layout();
      // Let the page finish loading and paint once, so the intro's first frames are not the
      // ones the rest of the page's start-up work lands on.
      const win = doc.defaultView;
      if (doc.readyState !== 'complete') await new Promise((r) => win.addEventListener('load', r, { once: true }));
      await new Promise((r) => win.requestAnimationFrame(() => win.requestAnimationFrame(r)));
      if (g !== gen) return;
    }
    if (cur < 0) {
      // The intro promotes every glyph it animates at once, and the compositor's first raster
      // of those layers took one 50-90 ms frame, which used to land ~60 ms into the intro.
      // Build it paused at time 0, where nothing has changed yet, let that frame pass, then
      // start it.
      warming = true;
      const intro = go(0, g);
      warming = false;
      const win = doc.defaultView;
      for (let i = 0; i < 3; i++) await new Promise((r) => win.requestAnimationFrame(r));
      if (g !== gen) return;
      if (!paused) {
        for (const a of held) if (a.playState === 'paused') a.play();
        held.clear();
      }
      if (!(await intro)) return;
    } else if (cur !== 0 && !(await go(0, g))) return; // a replay that finds the first pillar already on screen just starts its rest over
    for (;;) {
      for (let i = 1; i <= n; i++) {
        if (!(await wait(o.hold, g))) return;
        if (!(await go(i, g))) return;
      }
      if (!o.loop) return;
      if (!(await wait(o.settleHold, g))) return;
      if (!(await go(0, g))) return;
    }
  }
  // If the motion ever fails, the heading falls back to the static tagline instead of staying
  // blank, and the host hears that no pillar is on show, as in static mode.
  const start = (g, again) => run(g, again).catch((err) => {
    reset();
    root.classList.add('is-static');
    o.onPillar?.(null);
    root.dispatchEvent(new CustomEvent('hp:pillar', { detail: { index: n, stage: null } }));
    queueMicrotask(() => { throw err; });
  });

  function reset() {
    gen++;
    clearTimer();
    dropAnimations();
    pending = null;
    root.querySelectorAll('.is-on, .is-anim').forEach((e) => e.classList.remove('is-on', 'is-anim'));
    cur = -1;
    shown1 = null;
  }

  // ---- reduced motion, visibility, resizing -------------------------------------------------
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const isStatic = () => (o.reducedMotion === 'auto' ? mq.matches : !!o.reducedMotion);
  let staticMode = null;
  function applyMode() {
    const s = isStatic();
    if (s === staticMode) return;
    staticMode = s;
    reset();
    root.classList.toggle('is-static', s);
    if (s) {
      const g = gen; // --hp-fit sizes the static heading too
      if (!measured) loadFaces().then(() => g === gen && !measured && layout());
      o.onPillar?.(null);
      root.dispatchEvent(new CustomEvent('hp:pillar', { detail: { index: n, stage: null } }));
    } else start(gen);
  }
  let inView = false;
  const sync = () => setPaused(!inView || doc.hidden);
  const io = new IntersectionObserver((es) => { inView = es.at(-1).isIntersecting; sync(); });
  io.observe(root);
  doc.addEventListener('visibilitychange', sync);
  mq.addEventListener('change', applyMode);
  const onFonts = () => measured && !owned.size && layout();
  doc.fonts?.addEventListener?.('loadingdone', onFonts);
  // Crossing the stacking breakpoint re-lays the rows; a transition in flight jumps to its end.
  const ro = new ResizeObserver(() => {
    if (!measured || isStacked() === stacked) return;
    for (const a of owned) a.finish();
    layout();
  });
  ro.observe(root);
  // Lay out now with whatever faces are ready (fonts.css gives each a metric-matched fallback),
  // so the first mounted frame already has its final rows and size; run() and 'loadingdone'
  // lay out again once the faces load.
  layout();
  applyMode();

  function dispose() {
    reset();
    io.disconnect();
    ro.disconnect();
    doc.removeEventListener('visibilitychange', sync);
    mq.removeEventListener('change', applyMode);
    doc.fonts?.removeEventListener?.('loadingdone', onFonts);
    restore();
  }
  // Replay leaves the way every change does: what is on screen (the tagline, or a pillar)
  // hands over to the first pillar with the usual exit and entrance. A change still in flight
  // lands in its end state, but what it drew so far is kept (carry), and the next change's
  // leavers start from that, not from full ink. A change already on its way to the first
  // pillar just plays on. Before anything has been shown, or in static mode, it starts over.
  dispose.replay = () => {
    if (staticMode || !measured || cur < 0) {
      staticMode = null;
      applyMode();
      return;
    }
    if (pending && cur === 0) return;
    gen++;
    clearTimer();
    carry = pending ? snapshot() : null;
    settleNow();
    start(gen, true);
  };
  dispose.update = (patch) => Object.assign(o, patch);
  return dispose;
}
