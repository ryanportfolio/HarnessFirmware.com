// Agent prompt button: copies a setup prompt the visitor pastes into Claude Code or Codex. The prompt
// says what Harness Firmware is and has the agent run the apply-firmware skill, which does the install.
//
// The button is drawn as a chip: pin stubs on its long edges, a green key on the right. Pointer hover,
// keyboard focus or a touch press arms it, and one canvas plays the "flash": a Bayer-dithered bloom
// that follows the pointer, a scan band, circuit traces growing out of the pins with packets running
// in, and two pixel comets orbiting the border. The eyebrow decodes and the command retypes.
// A click copies, bursts pixels from the click point and shows the copied state.
//
// The canvas loop runs only while something moves and stops once everything has settled; under
// prefers-reduced-motion nothing is drawn and armed is a static highlight. Without the Clipboard API
// (or when it is refused) the prompt opens in a dialog with its text selected.
//
//   <div data-agent-cta="hero"></div>   auto-mounted when this module loads (variant from the value)
//   mountAgentCta(host, {variant})      mounts into host; returns the instance root

export const AGENT_PROMPT = `Set up Harness Firmware in this project.

Harness Firmware (https://github.com/ryanportfolio/Harness-Firmware) is an open-source set of files that gives Claude Code and Codex a working setup inside the repository:

- A short rulebook read every session: CLAUDE.md for Claude Code, AGENTS.md for Codex.
- Project memory: notes in .claude/reference/, committed with the code, that you read and add to through the recall skill.
- Skills that load only when a task calls for them: planning, long multi-round work, CI repair, performance and visual polish, writing.
- Independent review: a reviewer from a different model vendor, with fresh context, checks each pull request before it merges. I approve every merge myself.

Install it with the apply-firmware skill (/apply-firmware). It reads the template from GitHub, adds what this project is missing, merges what is partial, and leaves our existing work alone. If the skill is not installed, get it from .claude/skills/apply-firmware/ in the repository above and follow its SKILL.md.

Show me its preview before you write anything, and do not commit, push, or merge without asking me.`;

const TEXT = {
  name: 'Copy setup prompt for your agent (/apply-firmware)',
  label: 'Copy setup prompt',
  copiedLabel: 'Copied to clipboard',
  eyebrow: 'Prompt for your agent',
  armed: 'Paste into Claude Code or Codex',
  armedShort: 'Paste into your agent',
  copied: `Prompt on clipboard · ${AGENT_PROMPT.length.toLocaleString('en-US')} characters`,
  copiedShort: 'Prompt on clipboard',
  command: '/apply-firmware',
  note: 'Works with Claude Code and Codex',
  read: 'Read the prompt',
  announce: 'Prompt copied. Paste it into your agent.',
};

const GREEN = '83,219,118', PAPER = '243,243,236';
const PINS = 7;

// Every timing and intensity the flash uses; read each frame, so the lab (site/lab/agent-cta.html)
// can change them live. Times in ms, sizes in CSS px.
export const TUNE = {
  timeScale: 1,          // 1 = real time; the lab slows it down
  armIn: 420, armOut: 320, follow: 12,
  cell: 3, bloomMin: .35, bloomMax: .75, bloomFalloff: 1.5, bloomGain: 1.1, glow: .08,
  tier1: .1, tier2: .19, tier3: .32,
  scanDur: 560, scanWidth: 16, scanGain: 1.1,
  traceGrow: 280, traceStagger: 34, traceAlpha: .55, packetPeriod: 820,
  cometLap: 2400, cometTrail: .24,
  typeStep: 24, decodeIn: 360,
  burstCount: 72, burstSpeed: 340, ringDur: 700, flashDur: 520,
  bootDelay: 900, bootDur: 1150,
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + .5) / 16);
const GLYPH_POOL = '<>/_-=+#:01';
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const narrow = matchMedia('(max-width: 700px)');

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (u) => 1 - (1 - u) ** 3;
const easeInOut = (u) => (u < .5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

// Pixel glyphs on a 12 x 12 grid, one rect per run: [x, y, w, h].
const pixels = (runs) => runs.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h-${w}z`).join('');
const GLYPHS = {
  copy: pixels([[1, 1, 6, 1], [1, 2, 1, 5], [4, 4, 7, 1], [4, 10, 7, 1], [4, 5, 1, 5], [10, 5, 1, 5], [6, 6, 3, 1], [6, 8, 3, 1]]),
  paste: pixels([[5, 1, 2, 4], [3, 5, 6, 1], [4, 6, 4, 1], [5, 7, 2, 1], [1, 8, 1, 3], [10, 8, 1, 3], [1, 10, 10, 1]]),
  check: pixels([[1, 6, 2, 2], [3, 8, 2, 2], [5, 6, 2, 2], [7, 4, 2, 2], [9, 2, 2, 2]]),
};
const glyph = (name) => `<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path fill="currentColor" d="${GLYPHS[name]}"/></svg>`;

let dialog = null, uid = 0;

// ---- clipboard ------------------------------------------------------------------------------------

async function copyText(text) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older engines and some embedded browsers: a selected, off-screen textarea and execCommand.
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.append(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    area.remove();
    return ok;
  }
}

function openDialog(message = '') {
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.className = 'acta-dialog';
    dialog.setAttribute('aria-labelledby', 'acta-dialog-title');
    dialog.innerHTML = `<form method="dialog" class="acta-dialog-shell">
      <header><div><p>Paste into Claude Code or Codex</p><h2 id="acta-dialog-title">Setup prompt for your agent</h2></div>
      <button class="acta-dialog-close" value="close" aria-label="Close prompt">Close ×</button></header>
      <p class="acta-dialog-msg" role="status"></p>
      <textarea readonly spellcheck="false" rows="16" aria-label="Setup prompt"></textarea>
      <footer><button type="button" class="acta-dialog-copy"><span>Copy prompt</span>${glyph('copy')}</button></footer>
    </form>`;
    const area = dialog.querySelector('textarea'), msg = dialog.querySelector('.acta-dialog-msg');
    area.value = AGENT_PROMPT;
    dialog.querySelector('.acta-dialog-copy').addEventListener('click', async () => {
      const ok = await copyText(AGENT_PROMPT);
      msg.textContent = ok ? TEXT.announce : 'Copy blocked. Select the text and copy it.';
      if (!ok) { area.focus(); area.select(); }
    });
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
    document.body.append(dialog);
  }
  dialog.querySelector('.acta-dialog-msg').textContent = message;
  if (!dialog.open) dialog.showModal();
  const area = dialog.querySelector('textarea');
  if (message) { area.focus(); area.select(); area.scrollTop = 0; }
}

// ---- geometry -------------------------------------------------------------------------------------

// Points every 2 px around a rounded rect (clockwise from the top-left straight), in button space.
function ringPoints(w, h, r) {
  const pts = [], step = 2;
  const seg = (x0, y0, x1, y1) => {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(len / step));
    for (let i = 0; i < n; i++) pts.push([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]);
  };
  const arc = (cx, cy, a0) => {
    const n = Math.max(2, Math.round((Math.PI / 2 * r) / step));
    for (let i = 0; i < n; i++) { const a = a0 + Math.PI / 2 * i / n; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  };
  seg(r, 0, w - r, 0); arc(w - r, r, -Math.PI / 2);
  seg(w, r, w, h - r); arc(w - r, h - r, 0);
  seg(w - r, h, r, h); arc(r, h - r, Math.PI / 2);
  seg(0, h - r, 0, r); arc(r, r, Math.PI);
  return pts;
}

// Fan-out traces: each pin runs straight out of its edge, bends 45 degrees away from the middle
// and ends in a via inside the bleed. Two side traces leave the short edges. Button space.
function buildTraces(pinXs, w, h, bx, by, belowReach) {
  const traces = [];
  const mid = (PINS - 1) / 2;
  pinXs.forEach((x, j) => {
    const k = j - mid, dir = Math.sign(k), off = Math.abs(k);
    for (const edge of [-1, 1]) {
      const reach = edge < 0 ? by - 6 : Math.min(by - 6, belowReach);
      const y0 = edge < 0 ? 0 : h, out = (d) => y0 + edge * d;
      const rise = Math.min(reach, 5 + (mid - off) * 2.2), diag = Math.min(reach - rise, off * 4.5);
      const pts = [[x, y0], [x, out(rise)], [x + dir * diag, out(rise + diag)], [x + dir * diag, out(reach)]];
      traces.push(polyline(pts, Math.abs(j - (edge < 0 ? 0 : PINS - 1)) + 1));
    }
  });
  for (const side of [-1, 1]) {
    for (const f of [.32, .68]) {
      const x0 = side < 0 ? 0 : w, y = h * f, len = bx - 6;
      if (len < 6) continue;
      const jog = (f < .5 ? -1 : 1) * Math.min(6, len / 3);
      const pts = [[x0, y], [x0 + side * len * .45, y], [x0 + side * (len * .45 + Math.abs(jog)), y + jog], [x0 + side * len, y + jog]];
      traces.push(polyline(pts, f < .5 ? 3.5 : 4.5));
    }
  }
  return traces;
}

function polyline(pts, order) {
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, lens, total: lens.at(-1), order, phase: Math.random() };
}

function pointAt(t, d) {
  const { pts, lens } = t;
  let i = 1;
  while (i < lens.length - 1 && lens[i] < d) i++;
  const u = (d - lens[i - 1]) / ((lens[i] - lens[i - 1]) || 1);
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u];
}

// ---- the instance ---------------------------------------------------------------------------------

export function mountAgentCta(host, { variant = host.dataset.agentCta || 'hero' } = {}) {
  const id = ++uid;
  const root = document.createElement('div');
  root.className = `acta acta--${variant}`;
  root.dataset.state = 'idle';
  root.dataset.anim = 'idle';
  root.innerHTML = `<button type="button" class="acta-btn" aria-label="${TEXT.name}" aria-describedby="acta-note-${id}">
      <span class="acta-pins" aria-hidden="true">${Array.from({ length: PINS }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</span>
      <span class="acta-side" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      <canvas class="acta-fx" aria-hidden="true"></canvas>
      <span class="acta-body" aria-hidden="true">
        <span class="acta-eyebrow"><span class="acta-led"></span><span class="acta-eyebrow-text">${TEXT.eyebrow}</span></span>
        <span class="acta-line">
          <span class="acta-label"><span class="acta-label-rest">${TEXT.label}</span><span class="acta-label-done">${TEXT.copiedLabel}</span></span>
          <span class="acta-cmd"><span class="acta-cmd-text">${TEXT.command}</span><span class="acta-caret"></span></span>
        </span>
      </span>
      <span class="acta-key" aria-hidden="true"><span class="acta-key-glyph acta-key-copy">${glyph('copy')}</span><span class="acta-key-glyph acta-key-paste">${glyph('paste')}</span><span class="acta-key-glyph acta-key-check">${glyph('check')}</span></span>
    </button>
    <div class="acta-note" id="acta-note-${id}"><span class="acta-note-text">${TEXT.note}</span><span class="acta-note-sep" aria-hidden="true"> · </span><button type="button" class="acta-read">${TEXT.read}</button></div>
    <span class="acta-live" role="status"></span>`;
  host.replaceChildren(root);

  const btn = root.querySelector('.acta-btn');
  const canvas = root.querySelector('.acta-fx');
  const eyebrowEl = root.querySelector('.acta-eyebrow-text');
  const cmdEl = root.querySelector('.acta-cmd-text');
  const live = root.querySelector('.acta-live');
  const pinEls = [...root.querySelectorAll('.acta-pins i')];
  root.querySelector('.acta-read').addEventListener('click', () => openDialog());

  // ---- state ----
  // Effect times run on a clock that TUNE.timeScale can slow down; event handlers read it too.
  let clock = 0, lastReal = performance.now();
  const now = () => { const real = performance.now(); clock += (real - lastReal) * TUNE.timeScale; lastReal = real; return clock; };
  let ctx = null, dpr = 1, W = 0, H = 0, BX = 0, BY = 0;
  let ring = [], traces = [];
  let armed = false, held = false, arm = 0, armedAt = 0, lastT = 0, frame = 0;
  let pointer = { x: 0, y: 0 }, target = { x: 0, y: 0 }, bloomR = 0;
  let scanAt = -1, bootAt = -1, ringAt = -1, ringO = { x: 0, y: 0 }, flashAt = -1;
  let particles = [];
  let text = null; // eyebrow decode: {to, start, dur, rolled, tail}
  let typing = false, copiedTimer = 0;
  // a narrow button takes the short eyebrow lines, which fit beside the LED
  const say = (key) => TEXT[TEXT[key + 'Short'] && btn.offsetWidth < 420 ? key + 'Short' : key];

  function measure() {
    const rect = btn.getBoundingClientRect();
    W = rect.width; H = rect.height;
    const cs = getComputedStyle(root);
    BX = parseFloat(cs.getPropertyValue('--acta-bleed-x')) || 0;
    BY = parseFloat(cs.getPropertyValue('--acta-bleed-y')) || 0;
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round((W + 2 * BX) * dpr);
    canvas.height = Math.round((H + 2 * BY) * dpr);
    ctx = canvas.getContext('2d');
    ring = ringPoints(W, H, 6);
    const pinXs = pinEls.map((p) => { const r = p.getBoundingClientRect(); return Math.round(r.left - rect.left + r.width / 2); });
    traces = buildTraces(pinXs, W, H, BX, BY, parseFloat(cs.getPropertyValue('--acta-reach-below')) || BY);
  }
  new ResizeObserver(() => { if (ctx) measure(); }).observe(btn);

  function start() {
    if (reduce.matches || document.hidden) return;
    if (!ctx) measure();
    if (!frame) { lastT = now(); root.dataset.anim = 'running'; frame = requestAnimationFrame(tick); }
  }

  function setArmed(on, at) {
    if (on === armed || (!on && held)) return;
    armed = on;
    if (root.dataset.state !== 'copied') root.dataset.state = on ? 'armed' : 'idle';
    if (reduce.matches) {
      if (root.dataset.state !== 'copied') eyebrowEl.textContent = on ? say('armed') : TEXT.eyebrow;
      return;
    }
    if (!ctx) measure();
    const t = now();
    if (on) {
      armedAt = t; scanAt = t;
      const p = at || { x: W / 2, y: H / 2 };
      pointer = { ...p }; target = { ...p }; bloomR = 0;
      if (root.dataset.state !== 'copied') decode(say('armed'), TUNE.decodeIn);
      typing = true;
    } else {
      typing = false; cmdEl.textContent = TEXT.command;
      if (root.dataset.state !== 'copied') decode(TEXT.eyebrow, TUNE.decodeIn * .7);
    }
    start();
  }

  function decode(to, dur) { text = { to, start: now() + 40, dur, rolled: -1e9, tail: '' }; }

  const local = (event) => { const r = btn.getBoundingClientRect(); return { x: event.clientX - r.left, y: event.clientY - r.top }; };

  btn.addEventListener('pointerenter', (event) => { if (event.pointerType !== 'touch') setArmed(true, local(event)); });
  btn.addEventListener('pointermove', (event) => { if (armed) target = local(event); });
  btn.addEventListener('pointerleave', (event) => { if (event.pointerType !== 'touch' && !btn.matches(':focus-visible')) setArmed(false); });
  btn.addEventListener('pointerdown', (event) => { if (event.pointerType === 'touch') setArmed(true, local(event)); });
  btn.addEventListener('focus', () => { if (btn.matches(':focus-visible')) setArmed(true); });
  btn.addEventListener('blur', () => { if (!btn.matches(':hover')) setArmed(false); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && root.dataset.anim === 'running' && !frame) start(); });

  btn.addEventListener('click', async (event) => {
    const at = event.detail ? local(event) : { x: btn.offsetWidth / 2, y: btn.offsetHeight / 2 };
    const ok = await copyText(AGENT_PROMPT);
    clearTimeout(copiedTimer);
    if (!ok) {
      root.dataset.state = 'error';
      openDialog('Copy blocked. Select the text and copy it.');
      copiedTimer = setTimeout(() => { root.dataset.state = armed ? 'armed' : 'idle'; }, 1200);
      return;
    }
    copied(at, event.pointerType === 'touch');
  });

  function copied(at, touch) {
    root.dataset.state = 'copied';
    live.textContent = '';
    setTimeout(() => { live.textContent = TEXT.announce; }, 60); // a fresh write, so a repeat copy is announced again
    if (reduce.matches) eyebrowEl.textContent = say('copied');
    else { burst(at); decode(say('copied'), 300); }
    copiedTimer = setTimeout(() => {
      root.dataset.state = armed ? 'armed' : 'idle';
      if (reduce.matches) eyebrowEl.textContent = armed ? say('armed') : TEXT.eyebrow;
      else { decode(armed ? say('armed') : TEXT.eyebrow, 300); start(); }
      // a touch press leaves no pointerleave to disarm on
      if (touch || (!btn.matches(':hover') && !btn.matches(':focus-visible'))) setArmed(false);
    }, 2800);
  }

  function burst(at) {
    if (!ctx) measure();
    const t = now();
    ringAt = t; ringO = at; flashAt = t;
    for (let i = 0; i < TUNE.burstCount; i++) {
      const a = Math.random() * Math.PI * 2, s = 140 + Math.random() * TUNE.burstSpeed;
      particles.push({ x: at.x, y: at.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * .55, born: t, life: 480 + Math.random() * 420, size: Math.random() < .3 ? 3 : 2, paper: Math.random() < .25 });
    }
    start();
  }

  function boot() {
    if (reduce.matches) return;
    if (!ctx) measure();
    bootAt = now(); scanAt = bootAt + 160; start();
  }

  // First time the button scrolls into view: one comet lap draws the border and a scan crosses.
  new IntersectionObserver(([entry], io) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    setTimeout(boot, variant === 'hero' ? TUNE.bootDelay : 120);
  }, { threshold: .6 }).observe(btn);

  // ---- frame ----
  function tick() {
    frame = 0;
    if (document.hidden) return; // visibilitychange restarts it
    const t = now(), dt = Math.min(64, t - lastT) / 1000; lastT = t;
    arm = armed ? Math.min(1, arm + dt * 1000 / TUNE.armIn) : Math.max(0, arm - dt * 1000 / TUNE.armOut);
    const k = 1 - Math.exp(-dt * TUNE.follow);
    pointer.x += (target.x - pointer.x) * k; pointer.y += (target.y - pointer.y) * k;
    if (armed) bloomR = Math.min(1, bloomR + dt * 1000 / TUNE.armIn);

    stepText(t);
    if (typing) {
      const n = Math.floor((t - armedAt - 60) / TUNE.typeStep);
      if (n > TEXT.command.length) { typing = false; cmdEl.textContent = TEXT.command; }
      else { const shown = n < 0 ? ' ' : TEXT.command.slice(0, n) || ' '; if (cmdEl.textContent !== shown) cmdEl.textContent = shown; }
    }

    const c = ctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W + 2 * BX, H + 2 * BY);
    c.translate(BX, BY);

    const scan = scanAt >= 0 ? clamp01((t - scanAt) / TUNE.scanDur) : 1;
    const bootU = bootAt >= 0 ? clamp01((t - bootAt) / TUNE.bootDur) : 1;
    const ringU = ringAt >= 0 ? clamp01((t - ringAt) / TUNE.ringDur) : 1;
    const flash = flashAt >= 0 ? 1 - clamp01((t - flashAt) / TUNE.flashDur) : 0;

    drawDither(scan, ringU, flash);
    if (arm > 0) { drawTraces(t); drawComets(arm, [t / TUNE.cometLap, t / TUNE.cometLap + .5], TUNE.cometTrail); }
    if (bootU < 1) drawComets(Math.sin(bootU * Math.PI) * .9 + .1 * (1 - bootU), [easeInOut(bootU) * 1.02 - .02], .3 * (1 - bootU * .5));
    drawParticles(t);

    if (scan >= 1) scanAt = -1;
    if (bootU >= 1) bootAt = -1;
    if (ringU >= 1) ringAt = -1;
    if (flash <= 0) flashAt = -1;

    const busy = armed || arm > 0 || text || typing || particles.length || scanAt >= 0 || bootAt >= 0 || ringAt >= 0 || flashAt >= 0;
    if (busy) frame = requestAnimationFrame(tick);
    else { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height); root.dataset.anim = 'idle'; }
  }

  function stepText(t) {
    if (!text) return;
    const u = clamp01((t - text.start) / text.dur);
    if (u <= 0) return;
    if (t - text.rolled > 45) {
      text.rolled = t;
      text.tail = Array.from(text.to, (ch) => (ch === ' ' ? ' ' : GLYPH_POOL[Math.floor(Math.random() * GLYPH_POOL.length)])).join('');
    }
    const settled = Math.ceil(text.to.length * easeOut(u));
    eyebrowEl.textContent = u >= 1 ? text.to : text.to.slice(0, settled) + text.tail.slice(settled);
    if (u >= 1) text = null;
  }

  // Bayer-dithered light inside the panel: the pointer bloom, the scan band, the click shock ring
  // and the click flash, batched into three alpha tiers so each frame is three fills.
  function drawDither(scan, ringU, flash) {
    const amp = easeOut(arm), cell = Math.max(2, TUNE.cell | 0);
    if (amp <= 0 && scan >= 1 && ringU >= 1 && flash <= 0) return;
    const cols = Math.floor((W - 2) / cell), rows = Math.floor((H - 2) / cell);
    const R = Math.max(W, 120) * (TUNE.bloomMin + TUNE.bloomMax * easeOut(bloomR));
    const sx = -40 + (W + 80) * easeInOut(scan), scanAmp = scan < 1 ? Math.sin(scan * Math.PI) * TUNE.scanGain : 0;
    const rr = easeOut(ringU) * Math.max(W, H) * 1.15, ringAmp = ringU < 1 ? (1 - ringU) * 1.4 : 0;
    const tiers = [new Path2D(), new Path2D(), new Path2D()];
    for (let cy = 0; cy < rows; cy++) {
      const py = 1 + cy * cell + cell / 2;
      for (let cx = 0; cx < cols; cx++) {
        const px = 1 + cx * cell + cell / 2;
        let I = flash * .55;
        if (amp > 0) {
          const d = Math.hypot(px - pointer.x, (py - pointer.y) * 1.6) / R;
          if (d < 1) I += amp * (1 - d) ** TUNE.bloomFalloff * TUNE.bloomGain;
          I += amp * TUNE.glow;
        }
        if (scanAmp > 0) { const q = (px - sx) / TUNE.scanWidth; I += scanAmp * Math.exp(-q * q); }
        if (ringAmp > 0) { const q = (Math.hypot(px - ringO.x, py - ringO.y) - rr) / 9; I += ringAmp * Math.exp(-q * q); }
        if (I <= 0) continue;
        const v = I * 3 - BAYER[(cy & 3) * 4 + (cx & 3)];
        if (v <= 0) continue;
        tiers[v < 1 ? 0 : v < 2 ? 1 : 2].rect(px - cell / 2, py - cell / 2, cell - 1, cell - 1);
      }
    }
    [TUNE.tier1, TUNE.tier2, TUNE.tier3].forEach((alpha, i) => { ctx.fillStyle = `rgba(${GREEN},${alpha})`; ctx.fill(tiers[i]); });
  }

  function drawTraces(t) {
    const since = t - armedAt, c = ctx;
    c.lineWidth = 1;
    for (const tr of traces) {
      const g = clamp01((since - 40 - tr.order * TUNE.traceStagger) / TUNE.traceGrow) * easeOut(arm);
      if (g <= 0) continue;
      const len = tr.total * g;
      c.strokeStyle = `rgba(${GREEN},${TUNE.traceAlpha * arm})`;
      c.beginPath();
      c.moveTo(tr.pts[0][0] + .5, tr.pts[0][1] + .5);
      for (let i = 1; i < tr.pts.length; i++) {
        if (tr.lens[i] <= len) c.lineTo(tr.pts[i][0] + .5, tr.pts[i][1] + .5);
        else { const [x, y] = pointAt(tr, len); c.lineTo(x + .5, y + .5); break; }
      }
      c.stroke();
      if (g < 1) continue;
      const [vx, vy] = tr.pts.at(-1);
      c.strokeStyle = `rgba(${GREEN},${.8 * arm})`;
      c.strokeRect(Math.round(vx) - 2 + .5, Math.round(vy) - 2 + .5, 4, 4);
      // packets run from the via into the pin, two per trace
      for (const off of [0, .5]) {
        const u = (t / TUNE.packetPeriod + tr.phase + off) % 1;
        const d = tr.total * (1 - u);
        const [x, y] = pointAt(tr, d), [x2, y2] = pointAt(tr, Math.min(tr.total, d + 4));
        c.fillStyle = `rgba(${GREEN},${.35 * arm})`;
        c.fillRect(Math.round(x2) - 1, Math.round(y2) - 1, 2, 2);
        c.fillStyle = `rgba(${PAPER},${.95 * arm * Math.sin(u * Math.PI)})`;
        c.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
      }
    }
  }

  // Pixel comets: a head and a fading trail of 2 px squares sampled around the border ring.
  function drawComets(amp, heads, trail) {
    const n = ring.length, c = ctx;
    if (!n || amp <= 0) return;
    const tl = Math.max(2, Math.round(n * trail));
    for (const h of heads) {
      const head = Math.floor((((h % 1) + 1) % 1) * n);
      for (let i = tl - 1; i >= 0; i--) {
        const [x, y] = ring[(head - i + n) % n];
        const a = (1 - i / tl) ** 1.4 * amp;
        if (i < 10) { // a soft pixel halo around the head
          const hs = 9 - i * .5;
          c.fillStyle = `rgba(${GREEN},${a * .16})`;
          c.fillRect(Math.round(x - hs / 2), Math.round(y - hs / 2), Math.round(hs), Math.round(hs));
        }
        const s = i < 4 ? 3 : 2;
        c.fillStyle = i < 4 ? `rgba(${PAPER},${a})` : `rgba(${GREEN},${Math.min(1, a * 1.15)})`;
        c.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s);
      }
    }
  }

  function drawParticles(t) {
    if (!particles.length) return;
    const c = ctx;
    particles = particles.filter((p) => t - p.born < p.life);
    for (const p of particles) {
      const u = (t - p.born) / p.life, s = (t - p.born) / 1000;
      const drag = Math.exp(-s * 3.2), dist = (1 - drag) / 3.2;
      const x = p.x + p.vx * dist, y = p.y + p.vy * dist + 40 * s * s;
      c.fillStyle = `rgba(${p.paper ? PAPER : GREEN},${(1 - u) ** 1.2})`;
      c.fillRect(Math.round(x), Math.round(y), p.size, p.size);
    }
  }

  reduce.addEventListener('change', () => {
    if (!reduce.matches || !ctx) return;
    cancelAnimationFrame(frame); frame = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    root.dataset.anim = 'idle';
  });
  narrow.addEventListener('change', () => { if (ctx) measure(); });

  // Hooks for the lab and for scripted checks: hold the armed state, replay the boot, fire a burst.
  root.agentCta = {
    hold(on, at) { held = false; setArmed(!!on, at); held = !!on; },
    boot,
    burst: (at) => burst(at || { x: W / 2 || btn.offsetWidth / 2, y: H / 2 || btn.offsetHeight / 2 }),
    copied: (at) => { clearTimeout(copiedTimer); copied(at || { x: btn.offsetWidth / 2, y: btn.offsetHeight / 2 }, false); },
    measure: () => { measure(); start(); },
  };
  return root;
}

// Pages link agent-cta.css themselves where the button sits in the first screen; elsewhere (the
// footer) the stylesheet is added here and the button mounts once it has loaded.
function ensureStyles() {
  const href = new URL('agent-cta.css', import.meta.url).href;
  const has = [...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.href === href);
  if (has) return Promise.resolve();
  const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
  const ready = new Promise((resolve) => { link.onload = link.onerror = resolve; });
  document.head.append(link);
  return ready;
}

export async function mountAll(scope = document) {
  const hosts = [...scope.querySelectorAll('[data-agent-cta]:not([data-agent-cta-mounted])')];
  if (!hosts.length) return [];
  hosts.forEach((host) => { host.dataset.agentCtaMounted = ''; }); // claimed before the await, so two callers never mount one host twice
  await ensureStyles();
  return hosts.map((host) => mountAgentCta(host));
}

// Hosts already in the page mount now; `ready` resolves to their instance roots.
export const ready = mountAll();
