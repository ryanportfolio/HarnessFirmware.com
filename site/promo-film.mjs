// Promo film (/promo, #promo): the owner's statement of what Harness Firmware is for, then best practices
// from conference and YouTube talks, each beside how Harness Firmware does it. One isometric machine, "the harness bench", stands for a repository with the
// firmware in it: a kernel plate, a skill rack, a cabinet of reference drawers, a planning desk, the
// long-horizon line, an arena, the review gate and a return pipe that carries lessons back. Two gantry
// heads ride a rail above it: Claude Code (green) and Codex (amber). Each beat moves the camera to the
// station that does what the quote recommends.
// Drawn on a 1920 x 1080 canvas with the anatomy kit's geometry (iso-kit.mjs) painted through Path2D;
// captions are HTML over it. Every frame is a pure function of the clock t: frame(t) paints, seek(t)
// jumps, and window.promoFilm exposes both, the beat table and the total for checks.
// Beat sheet, quotes and sources: docs/specs/2026-10-12-promo-film-design.md.
import * as k from './iso-kit.mjs';
import {clamp, lerp, sm, eo, eio, mulberry} from './particle-engine.mjs';

const W = 1920, H = 1080;
const P = {origin: [0, 0], scale: 1, azimuth: 58, elevation: 30};
const iso = p => k.iso(p, P);

// ---- palette: the site's ink, paper, green and amber, with the anatomy kit's four side shades
const INK = [15, 18, 16], PAPER = [20, 25, 21], TOP = [27, 34, 29], SHADE = [[12, 15, 13], [16, 20, 17], [19, 24, 20], [23, 29, 24]];
const GREEN = [83, 219, 118], AMBER = [239, 200, 126], CREAM = [243, 243, 236];
const TONE = {hi: .86, mid: .44, lo: .24, faint: .12};
const mix = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;
const LW = 1.15;

// ---- beats. Every caption is verbatim from docs/specs/2026-10-12-promo-film-copy.md (asterisk word -> <em>).
// Quote beats set two groups side by side: Best practice (label, Recommends, quote, speaker) and In Harness
// Firmware (label, tag, answer, how, why). Readouts are the deck's, in deck order.
// Reveal times and each beat's length come from the word counts (the reading rule): an element revealed at
// `at` stays until the beat ends, and the beat lasts long enough to read it and everything revealed after it
// at 3 words a second, plus 1 s. The open's statement is the one group that clears before the beat ends: a line
// marked `clear` ends a group whose elements stay until everything in it has been read at 3 words a second plus
// 1 s, and the next element starts after the fade. `od` is the length of the machine's original choreography for the beat;
// `warp` maps beat time onto that choreography so each machine state lands on its caption or readout.
const REC_LABEL = 'Best practice', HF_LABEL = 'In Harness Firmware';
const QORDER = ['rl', 'rec', 'q', 'who', 'hl', 'tag', 'ans', 'how', 'why', 'ro0', 'ro1'];
const quote = o => ({kind: 'quote', ...o});
// Beats without `od` are choreographed directly in beat seconds from the caption schedule (identity warp).
const extra = o => ({kind: 'x', order: ['xl', 'tag', 'ans', 'how', 'why', 'ro0'], ...o});
const BEATS = [
  {id: 'open', od: 11, kind: 'open', lead: .6, lines: [
    ['s1', 'pf-say', 'Harness Firmware aims to solve the spikiness of agent quality by steering them to work better than they normally would through reliable and repeatable methods', 1],
    ['s2', 'pf-say', 'Models have basically solved code. They haven’t solved reliable verification', 1],
    ['s3', 'pf-say', 'Harness Firmware is an ongoing engineering project to attack that bottleneck', 1, 1],
    ['o0', 'pf-sub', 'Harness Firmware · Claude Code + Codex repo template'],
    ['o1p', 'pf-was', 'Repeated mistakes'], ['o1a', 'pf-now', 'Confirmed cause saved unasked to committed pitfalls.md', 1],
    ['o2p', 'pf-was', 'Self-graded work'], ['o2a', 'pf-now', 'Two-way cross-company PR review, switched on', 1],
    ['o3p', 'pf-was', 'Long jobs stall'], ['o3a', 'pf-now', '2 failed audits → new approach forced', 1],
    ['o4', 'pf-big', 'You give final <em>yes</em>', 1],
    ['o6', 'pf-fine', 'No speaker reviewed or endorsed Harness Firmware']],
    // The statement reads over the dust; the machine assembles as the tagline comes up.
    warp: S => [[0, 2], [S.o0, 3.4], [S.o1p, 4.5], [S.o2p, 6.1], [S.o3p, 7.7], [S.o4, 9.3]]},
  quote({id: 'm1', rec: 'Define agent rules and policies once',
    q: '“Define your guardrails, your agents, your docs, testing policies, really governance just one time”', who: 'Davis Palmie · Factory',
    tag: 'CLAUDE.md + /init-project', ans: 'Template CLAUDE.md requires evidence before <em>done</em>', how: 'When asked, /init-project reads repo, fills verify signal, deploy policy',
    why: 'Working agreement on from day one', ro: ['CHECK NOT RUN → RISK FLAGGED']}),
  quote({id: 'k1', rec: 'Load details into context when needed', q: '“We just progressively disclose what’s in the context and what tools to use.”', who: 'Tereza Tížková · Factory',
    tag: 'CLAUDE.md structure', ans: 'Ships short CLAUDE.md; detail in topic <em>files</em>', how: '/recall reads task’s topic file; rules favor pruning stale lines',
    why: 'Less always-loaded context each turn'}),
  quote({id: 'm2', rec: 'Write down unwritten project rules',
    q: '“When you join a new company there are a lot of rules that are not really codified anywhere.”', who: 'Tereza Tížková · Factory',
    tag: 'pitfalls.md + /recall', ans: 'Preset rule saves confirmed quirks to <em>pitfalls.md</em>', how: 'Cost retry or correction → saved unasked to repo',
    why: 'Git carries lesson to every machine', ro: ['NEXT SESSION CITES PITFALLS.MD + DATE']}),
  quote({id: 'm3', rec: 'Stay agnostic on which AI wins', q: '“It’s so difficult to catch up but also to predict what we’ll be winning. So it’s best to be agnostic”', who: 'Tereza Tížková · Factory',
    tag: 'Claude Code + Codex', ans: 'Codex + Claude Code wired to share <em>lessons</em>', how: 'Both write .claude/reference; both built-in memories off',
    why: 'Switch tools; lessons stay', ro: ['CODEX · RECALLS SAME PITFALL']}),
  quote({id: 'p1', rec: 'Surface choices someone must own',
    q: '“The danger is that the engineer never noticed that there was a choice to make.”', who: 'Gabriel Martinez · G2i',
    tag: '/deep-plan', ans: 'Built-in ledger keeps decisions in your <em>words</em>', how: 'Low-stakes guesses listed as assumptions you can veto',
    why: 'Weightiest decisions reviewed before your go-ahead', ro: ['Q9 ASSUMED UNLESS YOU OBJECT'], order: ['rl', 'rec', 'q', 'who', 'hl', 'tag', 'ans', 'how', 'ro0', 'why']}),
  quote({id: 'p2', rec: 'Change approach, try different angle', q: '“You will change your approach.”', who: 'Matt Gibiec · Dynatrace',
    tag: '/long-horizon', ans: 'Two failed audits, same step → new <em>approach</em>', how: 'You start /long-horizon; ruled-out approaches stay logged',
    why: 'Stuck run changes course, keeps verified work', ro: ['AUDIT FAIL ×2 → NEW APPROACH'], order: ['rl', 'rec', 'q', 'who', 'hl', 'tag', 'ans', 'how', 'ro0', 'why']}),
  quote({id: 'c1', rec: 'Check agent work against real state',
    q: '“The agents will often overconfidently claim that they did something when in fact they did not do it.”', who: 'Miguel · Browserbase and Corby · Microsoft',
    tag: '/long-horizon', ans: 'Shipped auditor never sees worker’s <em>report</em>', how: 'Checks written before step; hash diff flags edited checks',
    why: 'Final auditor reruns every check', ro: ['AUDITOR · FAIL · NOT COUNTED']}),
  quote({id: 'c3', od: 7, rec: 'Compare several versions side by side', q: '“Side-by-side comparison becomes the next evolution of the eval cycle”',
    who: 'Hussein · Braintrust', tag: '/arena', ans: 'Packaged blind judge checks each <em>criterion</em>', how: '3 isolated builds, names hidden; judge recommends base',
    why: 'Base kept; best rival ideas grafted on', warp: (S, d) => [[0, 0], [S.ans, .5], [S.how, 2.6], [S.why, 4.9], [d - .5, 6.6]]}),
  quote({id: 'g1', od: 10.5, rec: 'Run expensive checks once per PR', q: '“Expensive things you want to run once when the PR goes up.”', who: 'Dru Knox · Tessl',
    tag: '/merge', ans: 'Included /merge reviews, fixes, re-reviews, <em>merges</em>', how: 'You type /merge → Codex reviewers; fixes → whole diff re-reviewed',
    why: 'Squash-merge at reviewed commit, CI green', ro: ['MERGED AT REVIEWED COMMIT'], warp: S => [[0, 0], [S.ans, 1.4], [S.how, 2.3], [S.why, 7], [S.ro0, 9.45]]}),
  quote({id: 'i1', rec: 'Search past sessions for poor experiences', q: '“Find me all traces in the last 24 hours where the user had a poor experience.”', who: 'Hussein · Braintrust',
    tag: '/refine weekly', ans: 'Week of corrections → trend, one rule <em>PR</em>', how: 'Counts your corrections vs previous four runs; evidence-gated edits',
    why: 'Never merges; you review the PR', ro: ['ONE PR · WAITING FOR YOU']}),
  {id: 'x0', od: 2.5, kind: 'mid', lines: [['x0a', 'pf-sub', 'No talk covered these'], ['x0b', 'pf-big', 'Three more things Harness Firmware <em>does</em>', 1]]},
  extra({id: 'x1', od: 7.6, xl: 'More · 1 of 3', tag: 'Cross-company review', ans: 'Cross-company review switched on for every <em>PR</em>',
    how: 'Codex reviews Claude Code PRs; Claude reviews Codex PRs', why: 'Can catch what author’s model misses', ro: ['YOU MERGE OR TYPE /merge'],
    warp: S => [[0, 0], [S.ans, .4], [S.why, 4.2], [S.ro0, 6.9]]}),
  extra({id: 'x2', xl: 'More · 2 of 3', tag: '/coordinate', ans: 'Bundled protocol makes chats cross-check <em>claims</em>',
    how: 'Read PR diff, CI, main; verdict per item until agreed', why: 'Two exchanges unresolved → you decide', ro: ['ITEM 2 · DISAGREE · PR DIFF'],
    order: ['xl', 'tag', 'ans', 'how', 'ro0', 'why']}),
  extra({id: 'x3', xl: 'More · 3 of 3', tag: 'Codex skill sync', ans: 'Ships hand-translated Codex skill <em>ports</em>',
    how: 'Hash per Claude skill; CI warns when port lags', why: 'Edited skill → Codex port flagged for update', ro: ['CI · ONE CODEX SKILL BEHIND']}),
  {id: 'res', od: 9.5, kind: 'res', lines: [['r0', 'pf-eye', 'Results'],
    ['r1', 'pf-fig', 'Harness-Firmware #211 · 3 Codex reviews: 2 findings → 4 → <em>none</em>, all fixed', 1],
    ['r2', 'pf-fig', '#212 · 3 Codex reviewers, zero findings, CI passed', 1], ['r3', 'pf-fig', '#214 · cross-company review became rule for every PR', 1]],
    warp: S => [[0, 0], [S.r1, .3], [S.r2, 3.9], [S.r3, 6]]},
  {id: 'close', kind: 'close', lines: [['c0', 'pf-big', 'Evidence-before-done rule, pitfall log, cross-company PR review, switched on · your final <em>yes</em>', 1],
    ['c1', 'pf-sub', 'Harness Firmware · Claude Code + Codex repo template'], ['c2', 'pf-url', '<span>harnessfirmware.com/new</span> creates your repo'],
    ['c3', 'pf-fine', 'No speaker reviewed or endorsed Harness Firmware']]},
];
// Words: whitespace-separated tokens holding a letter or digit (the done-check counts the same way).
const nw = s => s.replace(/<[^>]+>|\*|\|/g, ' ').split(/\s+/).filter(w => /\w/.test(w)).length;
const up2 = x => Math.ceil(x * 100 - 1e-6) / 100;
const ITEM = {rl: ['pf-lab', 'p', 1], hl: ['pf-lab pf-lab-h', 'p', 1], xl: ['pf-lab pf-lab-h', 'p', 1], rec: ['pf-rec', 'p', 0, 1], q: ['pf-q', 'blockquote', 0, 1],
  who: ['pf-who', 'p'], tag: ['pf-tag', 'p'], ans: ['pf-ans', 'p', 0, 1], how: ['pf-how', 'p'], why: ['pf-why', 'p']};
let TOTAL = 0; const B = {};
for (const b of BEATS) {
  // Items in reading order: {k, cls, tag, html, label, words, ro}
  if (b.lines) b.items = b.lines.map(([k, cls, html, words, clear]) => ({k, cls, tag: 'p', html, words: !!words, clear: !!clear}));
  else b.items = (b.order || QORDER).filter(k => k.startsWith('ro') ? b.ro && b.ro[+k[2]] : true).map(k => {
    if (k.startsWith('ro')) return {k, ro: true, html: b.ro[+k[2]]};
    const [cls, tag, label, words] = ITEM[k], html = k === 'rl' ? REC_LABEL : k === 'hl' ? HF_LABEL : b[k];
    return {k, cls, tag, html, label: !!label, words: !!words};
  });
  // Reveal schedule. A readout replaced by the next one needs its own reading time plus 1 s (and slack for sampling).
  let a = b.lead ?? .4, ros = 0, g0 = 0; b.S = {};
  b.items.forEach((it, j) => { if (it.ro && ros++) a = up2(a + 1.3); it.at = a; b.S[it.k] = a; a = up2(a + nw(it.html) / 3);
    if (it.clear) { const u = up2(a + 1.05); for (const x of b.items.slice(g0, j + 1)) x.until = u; g0 = j + 1; a = up2(u + .5); } });
  b.dur = up2(a + 1 + .55);
  b.start = TOTAL; TOTAL += b.dur; B[b.id] = b;
  // Beat time -> choreography time, piecewise linear and strictly increasing in both.
  if (b.od == null) b.od = b.dur;
  const w = [...(b.warp ? b.warp(b.S, b.dur) : [[0, 0]]), [b.dur, b.od]], W = [];
  for (const p of w) if (!W.length || (p[0] > W.at(-1)[0] && p[1] > W.at(-1)[1])) W.push(p);
  b.W = W;
}
function wmap(W, u) { // beat seconds -> choreography seconds; slope 1 outside the anchors
  if (u <= W[0][0]) return W[0][1] + u - W[0][0];
  for (let j = 1; j < W.length; j++) if (u < W[j][0]) return lerp(W[j - 1][1], W[j][1], (u - W[j - 1][0]) / (W[j][0] - W[j - 1][0]));
  return W.at(-1)[1] + u - W.at(-1)[0];
}
function winv(W, v) {
  if (v <= W[0][1]) return W[0][0] + v - W[0][1];
  for (let j = 1; j < W.length; j++) if (v < W[j][1]) return lerp(W[j - 1][0], W[j][0], (v - W[j - 1][1]) / (W[j][1] - W[j - 1][1]));
  return W.at(-1)[0] + v - W.at(-1)[1];
}
const at = (id, u) => B[id].start + winv(B[id].W, u); // choreography time -> film time
const at0 = (id, u) => B[id].start + u; // beat seconds -> film time
const local = (id, t) => wmap(B[id].W, t - B[id].start); // film time -> choreography time
const nloc = (id, t) => t - B[id].start; // film time -> beat seconds
const beatAt = t => { let r = BEATS[0]; for (const b of BEATS) if (t >= b.start) r = b; return r; };

// ---- camera: [time, centre x, y, z, zoom, focus screen x, y]; eased between keys
const FULL = [820, 90, 40, .8, 1040, 700];
const ST = {kernel: [85, 95, 50], rack: [305, 100, 60], drawers: [520, 120, 70], plan: [750, 110, 60], line: [1010, 100, 50],
  arena: [1284, 120, 50], gate: [1530, 130, 60], back: [1520, -20, 30]};
const camAt = (s, z = 1.8, fx = 1260, fy = 620) => [...ST[s], z, fx, fy];
const CAM = [
  [0, 820, 90, 40, .74, 1060, 790], [at('open', 9.2), 820, 90, 40, .74, 1060, 790], [at('open', 10.8), 820, 90, 40, .84, 1040, 700],
  [at0('m1', 1), 95, 120, 50, 1.85, 1260, 600], [at0('k1', 1), 300, 110, 60, 1.25, 1250, 620], [at0('k1', B.k1.S.why + .2), 300, 110, 60, 1.25, 1250, 620], [at0('k1', B.k1.S.why + 1.5), 95, 90, 50, 1.8, 1260, 620], [at0('m2', 1), 500, 170, 60, 1.5, 1390, 560],
  [at0('m3', 1), 545, 120, 80, 1.65, 1250, 640], [at0('p1', 1), 752, 96, 60, 2.3, 1260, 640], [at0('p2', 1), 960, 120, 50, 1.55, 1270, 620],
  [at0('c1', 1), 1030, 90, 50, 2.05, 1340, 600], [at0('c3', 1), ...camAt('arena', 1.9)], [at0('g1', 1), ...camAt('gate', 1.8)],
  [at0('i1', 1), 1600, -20, 60, 2, 1300, 660], [at0('i1', 15.2), 1600, -20, 60, 2, 1300, 660], [at0('i1', 17.4), 660, 170, 40, 1.8, 1260, 560],
  [at0('x0', .6), ...FULL], [at0('x1', 1), ...camAt('gate', 1.8)], [at0('x2', 1), 1530, 150, 80, 1.95, 1330, 600],
  [at0('x3', 1), ...camAt('rack', 1.9)], [at0('res', 1), 1560, 130, 60, 1.8, 1340, 600], [at0('close', 1), ...FULL],
];
const TRAVEL = 1.3;
function camera(t) {
  let j = 0; for (let q = 0; q < CAM.length; q++) if (CAM[q][0] <= t) j = q;
  const a = CAM[j], b = CAM[j + 1];
  if (!b) return a.slice(1);
  const u = eio((t - a[0]) / Math.min(TRAVEL, b[0] - a[0]));
  // Hold a until the travel window before b begins.
  const start = b[0] - Math.min(TRAVEL, b[0] - a[0]), v = t < start ? 0 : eio((t - start) / (b[0] - start));
  void u; return a.slice(1).map((x, i) => lerp(x, b[i + 1], v));
}

// ---- Path2D cache for kit solids and lines
const cache = new WeakMap();
function p2(sp) {
  let o = cache.get(sp); if (o) return o;
  o = {fill: new Path2D(sp.fill), shades: sp.shades.map(d => d ? new Path2D(d) : null), top: new Path2D(sp.top),
    crease: sp.crease ? new Path2D(sp.crease) : null, outline: new Path2D(sp.outline), bevel: sp.bevel ? new Path2D(sp.bevel) : null};
  cache.set(sp, o); return o;
}
const lineCache = new Map();
const lp = d => { let o = lineCache.get(d); if (!o) { if (lineCache.size > 4000) lineCache.clear(); o = new Path2D(d); lineCache.set(d, o); } return o; };

// ---- painting. e is emphasis (1 focused, lower dims), acc an accent colour, g its strength 0..1
let ctx, ZOOM = 1, DPR = 1, GA = 1;
function paint(sp, {e = 1, tone = 'mid', acc = null, g = 0, alpha = 1, flat = false} = {}) {
  const p = p2(sp), d = .35 + .65 * e, tint = c => acc && g ? mix(c, mix(c, acc, .5), Math.min(1, g) * .55) : c;
  ctx.globalAlpha = alpha * GA;
  ctx.fillStyle = css(mix(INK, tint(PAPER), d)); ctx.fill(p.fill);
  if (!flat) {
    p.shades.forEach((s, i) => { if (s) { ctx.fillStyle = css(mix(INK, tint(SHADE[i]), d)); ctx.fill(s); } });
    ctx.fillStyle = css(mix(INK, tint(TOP), d)); ctx.fill(p.top);
  }
  ctx.lineWidth = LW / ZOOM;
  if (p.crease) { ctx.strokeStyle = css(CREAM, TONE.faint * d); ctx.stroke(p.crease); }
  if (p.bevel) { ctx.strokeStyle = css(CREAM, TONE.faint * d * 1.4); ctx.stroke(p.bevel); }
  if (acc && g > 0) { glow(acc, g * e); ctx.strokeStyle = css(mix(CREAM, acc, .85), Math.min(1, .5 + g) * d); }
  else ctx.strokeStyle = css(CREAM, TONE[tone] * d);
  ctx.stroke(p.outline); noGlow(); ctx.globalAlpha = GA;
}
function line(d, {e = 1, tone = 'lo', col = CREAM, a = null, w = 1, g = 0} = {}) {
  if (!d) return;
  ctx.lineWidth = LW * w / ZOOM; ctx.strokeStyle = css(col, (a ?? TONE[tone]) * (.35 + .65 * e));
  if (g) glow(col, g); ctx.stroke(lp(d)); if (g) noGlow();
}
function glow(c, g) { ctx.shadowColor = css(c, Math.min(1, g)); ctx.shadowBlur = 14 * DPR * Math.min(1.5, g); }
function noGlow() { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; }
function dot(p, r, c, a) { const [x, y] = iso(p); ctx.fillStyle = css(c, a); ctx.beginPath(); ctx.arc(x, y, r / ZOOM * 1.0, 0, 6.2832); ctx.fill(); }
function spark(p, r, c, a) {
  const [x, y] = iso(p), R = r;
  const gr = ctx.createRadialGradient(x, y, 0, x, y, R); gr.addColorStop(0, css(mix(c, CREAM, .6), a)); gr.addColorStop(.25, css(c, a * .7)); gr.addColorStop(1, css(c, 0));
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, R, 0, 6.2832); ctx.fill();
}
// Text engraved on a face: on a top face along x, or on the +y (front) face.
function faceText(str, [x, y, z], {size = 6, face = 'top', col = CREAM, a = .5, e = 1, align = 'left', font = 'mono'} = {}) {
  const o = iso([x, y, z]), u = iso([x + 1, y, z]), v = face === 'top' ? iso([x, y + 1, z]) : iso([x, y, z - 1]);
  ctx.save(); ctx.transform(u[0] - o[0], u[1] - o[1], v[0] - o[0], v[1] - o[1], o[0], o[1]);
  ctx.font = `${size}px ${font === 'mono' ? '"Departure Mono", monospace' : '"Harness Text", sans-serif'}`;
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = css(col, a * (.35 + .65 * e)); ctx.fillText(str, 0, 0); ctx.restore();
}
// A person, standing at a floor point: head and shoulders in the site's line style.
function person(p, {e = 1, lit = 0} = {}) {
  const [x, y] = iso(p), s = 1;
  ctx.lineWidth = LW * 1.3 / ZOOM; ctx.strokeStyle = css(mix(CREAM, GREEN, lit), (.5 + .5 * lit) * (.35 + .65 * e));
  if (lit) glow(GREEN, lit * .8);
  ctx.beginPath(); ctx.arc(x, y - 62 * s, 10 * s, 0, 6.2832); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y - 18 * s, 24 * s, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  noGlow();
}

// ---- geometry helpers: static solids are built once and cached by key
const S = new Map();
const box = (x, y, w, d, z, h, r = 1.5, bevel = 0, steps = 3) => { const key = [x, y, w, d, z, h, r, bevel, steps].join(); let s = S.get(key); if (!s) { s = k.slabOf({x, y, w, d, r}, z, h, P, steps, bevel); S.set(key, s); } return s; };
const cyl = (x, y, r, z, h, steps = 24) => { const key = ['c', x, y, r, z, h, steps].join(); let s = S.get(key); if (!s) { s = k.cylinder(x, y, r, z, h, P, steps); S.set(key, s); } return s; };
const dyn = (x, y, w, d, z, h, r = 1.5, bevel = 0) => k.slabOf({x, y, w, d, r}, z, h, P, 3, bevel);
const dcyl = (x, y, r, z, h, steps = 20) => k.cylinder(x, y, r, z, h, P, steps);
const Z0 = 22;

// ---- emphasis: which stations a beat lights
// The opening answers the three problems one row at a time, each lighting its station.
const OPEN_FOCUS = [['drawers'], ['gate', 'cx', 'cc'], ['line', 'cc']];
const FOCUS = {open: null, m1: ['kernel', 'cc'], k1: ['kernel', 'drawers', 'cc'], m2: ['drawers', 'cc'], m3: ['drawers', 'cc', 'cx'], p1: ['plan', 'cc'],
  p2: ['line', 'plan', 'cc'], c1: ['line', 'cc'], c3: ['arena', 'cc'], g1: ['gate', 'cc', 'cx'], i1: ['back', 'drawers', 'gate'], x0: null, x1: ['gate', 'cc', 'cx'],
  x2: ['gate', 'cc', 'cc2'], x3: ['rack', 'cx'], res: ['gate', 'cx'], close: null};
function emphasis(t, name) {
  if (t < B.open.start + B.open.dur) {
    const u = local('open', t); let v = 1;
    OPEN_FOCUS.forEach((list, j) => { const a = 4.6 + j * 1.6, on = sm((u - a) / .4) * (1 - sm((u - a - 1.6) / .4)) ; if (on > 0) v = Math.min(v, lerp(1, list.includes(name) ? 1 : .4, on)); });
    const all = sm((u - 9.4) / .6); return lerp(v, 1, all);
  }
  const b = beatAt(t), f = FOCUS[b.id], prev = BEATS[BEATS.indexOf(b) - 1], pf = prev ? FOCUS[prev.id] : null;
  const val = list => !list || list.includes(name) ? 1 : .45;
  return lerp(val(pf), val(f), sm((t - b.start) / .9));
}

// ---- bench, rail and the return pipe
const BENCH = {x: -40, y: -80, w: 1760, d: 340, r: 16};
function drawBench(t) {
  const e = .75 + .25 * emphasis(t, 'bench');
  const [hx, hy] = iso([830, 90, 0]);
  const gr = ctx.createRadialGradient(hx, hy + 40, 50, hx, hy + 40, 1300); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr; ctx.fillRect(hx - 1500, hy - 700, 3000, 1500);
  for (const [x, y] of [[-20, -60], [1700, -60], [-20, 240], [1700, 240]]) { paint(cyl(x, y, 9, -16, 3, 20), {e, tone: 'lo'}); paint(cyl(x, y, 7, -13, 13, 20), {e, tone: 'lo'}); }
  paint(box(BENCH.x, BENCH.y, BENCH.w, BENCH.d, 0, Z0, 16, 1.6, 8), {e, tone: 'mid'});
  line(k.planOutline(k.insetPlan(BENCH, 8), Z0, P, 8), {e, tone: 'faint'});
  // ruler strip along the front edge
  paint(box(-20, 236, 1720, 9, Z0, .8, 1, 0, 2), {e, tone: 'lo', flat: true});
  const tk = rulerTicks(); line(tk.minor, {e, tone: 'lo'}); line(tk.major, {e, tone: 'mid'});
  for (const [x, y] of k.corners(BENCH, 16)) dot([x, y, Z0], 1.6, CREAM, .35 * e);
  // label plate, front left
  paint(box(-24, 196, 150, 34, Z0, 1.2, 2, 0, 3), {e, tone: 'lo'});
  faceText('HARNESS FIRMWARE', [-16, 206, Z0 + 1.2], {size: 8.5, a: .62, e});
  faceText('YOUR REPOSITORY', [-16, 220, Z0 + 1.2], {size: 6.2, a: .4, e});
}
let TICKS = null;
function rulerTicks() { if (!TICKS) TICKS = k.topTicks(-10, 1690, 10, 5, 237, Z0 + .8, [3, 6], P); return TICKS; }

const POSTS = [-20, 540, 1110, 1690];
function drawRailBack(t) {
  const e = .7 + .3 * Math.max(emphasis(t, 'cc'), emphasis(t, 'cx'));
  for (const x of POSTS) { paint(cyl(x, -62, 9, Z0, 4, 20), {e, tone: 'lo'}); paint(cyl(x, -62, 5.5, Z0 + 4, 148, 20), {e, tone: 'mid'}); }
  paint(box(-34, -70, 1740, 14, 174, 8, 2, .6), {e, tone: 'mid'});
  line(k.sideSeam({x: -34, y: -70, w: 1740, d: 14, r: 2}, 178, P, 3), {e, tone: 'faint'});
}
// Return pipe: from the reader behind the gate, along the back of the bench, then forward beside the
// drawers to the PR slot.
const PIPE = [[1650, -44], [618, -44], [618, 214]];
function drawPipe(t) {
  const e = emphasis(t, 'back');
  paint(box(618, -50, 1032, 12, Z0 + 4, 7, 5), {e, tone: 'lo'});
  paint(box(612, -50, 12, 270, Z0 + 4, 7, 5), {e, tone: 'lo'});
  for (let x = 700; x < 1650; x += 120) paint(box(x, -53, 6, 18, Z0, 13, 1), {e, tone: 'faint'});
}

// ---- gantry heads: Claude Code (green) and Codex (amber). Keys: [time, rail x, arm y, tip z, on]
const HEADS = {
  cc: {col: GREEN, name: 'CLAUDE CODE', keys: []},
  cx: {col: AMBER, name: 'CODEX', keys: []},
  cc2: {col: GREEN, name: 'CLAUDE CODE', keys: []},
};
function headKeys() {
  const K = (h, id, u, x, y, z, on = 1) => HEADS[h].keys.push([at(id, u), x, y, z, on]);
  const K0 = (h, id, u, x, y, z, on = 1) => HEADS[h].keys.push([at0(id, u), x, y, z, on]); // u in beat seconds
  const dip = (h, id, u, x, y, hi, lo) => { K0(h, id, u - .22, x, y, hi); K0(h, id, u, x, y, lo); K0(h, id, u + .22, x, y, hi); };
  const park = (h, id, u, x) => K(h, id, u, x, -20, 140, 1);
  const M1 = B.m1.S, KS = B.k1.S, M2 = B.m2.S, M3 = B.m3.S, P1 = B.p1.S, C = B.c1.S, X3 = B.x3.S, L = lineScript();
  // Claude Code
  park('cc', 'open', 0, -10); K('cc', 'open', 4, 400, 60, 150); K('cc', 'open', 8, 60, 90, 140);
  // m1: reads the plate; checks step 1 before DONE; /init-project reads the repo files and fills two sections; step 2: DONE, no check
  K0('cc', 'm1', .9, 85, 70, 72); K0('cc', 'm1', M1.ans - .5, 85, 70, 72); K0('cc', 'm1', M1.ans, 33, 183, 62); K0('cc', 'm1', M1.ans + 1, 33, 183, 62); dip('cc', 'm1', M1.ans + 1.3, 33, 183, 62, 44);
  K0('cc', 'm1', M1.how + .3, 165, 206, 52); K0('cc', 'm1', M1.how + 1.7, 165, 206, 52); K0('cc', 'm1', M1.how + 2.1, 110, 82, 50); K0('cc', 'm1', M1.why + .1, 110, 82, 50);
  K0('cc', 'm1', M1.why + .7, 85, 70, 72); K0('cc', 'm1', M1.ro0 - 1.3, 85, 70, 72); K0('cc', 'm1', M1.ro0 - .9, 33, 183, 62); dip('cc', 'm1', M1.ro0 - .55, 33, 183, 62, 44); K0('cc', 'm1', B.m1.dur, 33, 183, 62);
  // k1: reads the short plate; /recall opens the deployment drawer for the task; back to the plate each turn
  K0('cc', 'k1', .9, 85, 70, 80); K0('cc', 'k1', KS.how, 85, 70, 80); K0('cc', 'k1', KS.how + .5, 482, 196, 96); K0('cc', 'k1', KS.how + 2.6, 482, 196, 96);
  K0('cc', 'k1', KS.why + .3, 85, 70, 80); K0('cc', 'k1', B.k1.dur, 85, 70, 80);
  // m2: builds four blocks; the third fails twice, its cause is confirmed, it passes; the next session reads pitfalls.md first
  const bx = j => 467 + j * 36, M2T = m2Times();
  K0('cc', 'm2', .6, bx(0), 213, 70); for (const [j, u] of M2T.s1) dip('cc', 'm2', u, bx(j), 213, 70, 52);
  K0('cc', 'm2', 4.5, bx(2), 213, 84); K0('cc', 'm2', 6.4, bx(2), 213, 84);
  K0('cc', 'm2', M2T.s1.at(-1)[1] + .8, 560, 188, 112); K0('cc', 'm2', M2.ro0 - 1, 560, 188, 112); K0('cc', 'm2', M2.ro0 - .6, 560, 196, 100); K0('cc', 'm2', M2.ro0 + .6, 560, 196, 100);
  for (const [j, u] of M2T.s2) dip('cc', 'm2', u, bx(j), 213, 70, 52); K0('cc', 'm2', B.m2.dur, bx(3), 213, 70);
  // m3: files a lesson into pitfalls.md, then leaves (switch tools)
  K0('cc', 'm3', .6, 530, 186, 112); dip('cc', 'm3', 2.1, 530, 186, 112, 94); K0('cc', 'm3', M3.why, 530, 186, 112); K0('cc', 'm3', M3.why + 1.1, 200, -20, 140); K0('cc', 'm3', B.m3.dur, 200, -20, 140);
  // p1: asks each question over the desk; drops the two assumptions into ASSUMED
  K0('cc', 'p1', .6, 712, 92, 104); K0('cc', 'p1', P1.how, 712, 92, 104);
  K0('cc', 'p1', P1.how + .3, 787, 76, 92); K0('cc', 'p1', P1.how + .6, 787, 76, 76); K0('cc', 'p1', P1.how + .9, 787, 94, 90); K0('cc', 'p1', P1.how + 1.25, 787, 94, 76);
  K0('cc', 'p1', P1.how + 1.8, 760, 40, 150); K0('cc', 'p1', B.p1.dur, 760, 40, 150);
  // p2 and c1: the worker over the press, dipping for each press
  K0('cc', 'p2', .8, 1006, 118, 120); for (const r of L.p2.runs) dip('cc', 'p2', r.press + .1, 1006, 118, 120, 100); K0('cc', 'p2', B.p2.dur, 1006, 118, 120);
  K0('cc', 'c1', .5, 913, 53, 104); K0('cc', 'c1', 2.3, 913, 53, 104); K0('cc', 'c1', 3.5, 1006, 118, 120);
  for (const r of L.c1.runs) dip('cc', 'c1', r.press + .1, 1006, 118, 120, 100);
  // c1: the worker reaches over and touches the check it is graded by
  K0('cc', 'c1', C.how + .1, 1006, 118, 120); K0('cc', 'c1', C.how + .6, 1142, 70, 70); K0('cc', 'c1', C.how + .85, 1142, 70, 58); K0('cc', 'c1', C.how + 1.2, 1142, 70, 70);
  K0('cc', 'c1', C.how + 1.9, 1006, 118, 120); K0('cc', 'c1', B.c1.dur, 1006, 118, 120);
  // c3: build the three candidates
  for (let j = 0; j < 3; j++) { K('cc', 'c3', .5 + j * .7, 1226 + j * 58, 140, 90); K('cc', 'c3', .85 + j * .7, 1226 + j * 58, 140, 70); }
  K('cc', 'c3', 3, 1200, 40, 150); K('cc', 'c3', 6.5, 1200, 40, 150);
  // g1: write the PR, then fix confirmed findings
  K('cc', 'g1', .4, 1430, 140, 70); K('cc', 'g1', 1.6, 1430, 140, 70); K('cc', 'g1', 2.3, 1400, 30, 150);
  K('cc', 'g1', 5.3, 1505, 140, 80); K('cc', 'g1', 6.3, 1505, 140, 80); K('cc', 'g1', 6.9, 1400, 30, 150); K('cc', 'g1', 10.5, 1400, 30, 150);
  park('cc', 'i1', 1, 1300); park('cc', 'x0', 2, 820);
  // x1: Claude Code's PR first, then Claude Code reviews Codex's
  K('cc', 'x1', .4, 1430, 140, 70); K('cc', 'x1', 1.2, 1430, 140, 70); K('cc', 'x1', 1.8, 1400, 30, 150);
  K('cc', 'x1', 4.2, 1500, 100, 150); K('cc', 'x1', 4.6, 1500, 140, 120); K('cc', 'x1', 6.4, 1500, 140, 120); K('cc', 'x1', 7.2, 1400, 30, 150);
  // x2: chat A over the gate, reading the PR diff, CI and main
  K0('cc', 'x2', .9, 1440, 96, 128); K0('cc', 'x2', B.x2.dur, 1440, 96, 128);
  park('cc', 'x3', .6, 160); park('cc', 'x3', B.x3.dur, 160);
  // close: the rule plate, the pitfalls drawer, the gate
  K0('cc', 'close', .6, 85, 70, 90); K0('cc', 'close', 1.6, 85, 70, 90); K0('cc', 'close', 2.6, 560, 188, 112); K0('cc', 'close', 3.6, 560, 188, 112); K0('cc', 'close', 4.8, 1430, 140, 90);
  // Codex: off until m3, where it saves its own lesson and recalls Claude Code's; reviews at the gate from g1; writes in x1 and
  // leaves before x2 (two Claude Code chats); ports skills in x3
  K('cx', 'open', 0, -60, -20, 140, 0); K0('cx', 'm3', M3.ans - .9, 760, -20, 140, 0); K0('cx', 'm3', M3.ans - .1, 600, 60, 140, 1); K0('cx', 'm3', M3.ans + .6, 592, 186, 126);
  dip('cx', 'm3', M3.how + .7, 592, 186, 126, 112); K0('cx', 'm3', M3.ro0 - .6, 592, 186, 126); K0('cx', 'm3', M3.ro0 - .2, 584, 196, 104);
  K0('cx', 'm3', B.m3.dur - .35, 584, 196, 104, 1); K0('cx', 'm3', B.m3.dur - .02, 584, 196, 104, 0);
  K0('cx', 'p1', .5, 1660, -20, 140, 0); K('cx', 'g1', 0, 1660, -20, 140, 0); K('cx', 'g1', .4, 1660, -20, 140, 1); K0('cx', 'i1', .2, 1660, -20, 140); K0('cx', 'i1', 1.2, 1704, -56, 158); K0('cx', 'x0', 3, 1704, -56, 158); K('cx', 'x1', 2.6, 1600, -20, 140);
  K('cx', 'x1', 3.2, 1430, 140, 70); K('cx', 'x1', 4, 1430, 140, 70); K('cx', 'x1', 4.4, 1620, 30, 150);
  K0('cx', 'x1', B.x1.dur - .9, 1620, 30, 150); K0('cx', 'x1', B.x1.dur - .1, 1660, -20, 140, 0);
  K0('cx', 'x3', .2, 200, 60, 140, 0); K0('cx', 'x3', 1.2, 240, 70, 128, 1); K0('cx', 'x3', X3.ans, 240, 70, 120); K0('cx', 'x3', X3.ans + 1.4, 380, 70, 120);
  K0('cx', 'x3', X3.how, 321, 40, 150); K0('cx', 'x3', B.x3.dur, 321, 40, 150); K('cx', 'close', 1, 1660, -20, 140);
  // A second Claude Code chat for /coordinate: nothing of it shows outside x2
  K('cc2', 'open', 0, 1720, -20, 140, 0); K0('cc2', 'x2', .3, 1720, -20, 140, 0); K0('cc2', 'x2', 1.3, 1612, 40, 140, 1); K0('cc2', 'x2', 1.9, 1612, 96, 128);
  K0('cc2', 'x2', B.x2.dur - .3, 1612, 96, 128, 1); K0('cc2', 'x2', B.x2.dur - .02, 1612, 96, 128, 0);
  for (const h of Object.values(HEADS)) h.keys.sort((a, b) => a[0] - b[0]);
}
function headAt(h, t) {
  const ks = HEADS[h].keys; if (!ks.length) return null;
  if (t <= ks[0][0]) return ks[0].slice(1);
  for (let j = 1; j < ks.length; j++) if (t < ks[j][0]) { const a = ks[j - 1], b = ks[j], u = b[0] > a[0] ? eio((t - a[0]) / (b[0] - a[0])) : 1; return a.slice(1).map((v, i) => lerp(v, b[i + 1], u)); }
  return ks[ks.length - 1].slice(1);
}
function drawCarriage(h, t) {
  const s = headAt(h, t); if (!s || s[3] < .01) return;
  const [x, , , on] = s, e = emphasis(t, h), c = HEADS[h].col;
  paint(dyn(x - 16, -74, 32, 22, 166, 22, 3, .6), {e, tone: 'hi', acc: c, g: .55, alpha: on});
}
function drawArm(h, t) {
  const s = headAt(h, t); if (!s || s[3] < .01) return;
  const [x, y, z, on] = s, e = emphasis(t, h), c = HEADS[h].col;
  paint(dyn(x - 5, -56, 10, y + 56 + 5, 176, 6, 2), {e, tone: 'mid', alpha: on});
  faceText(HEADS[h].name, [x - 3, -48, 182], {size: 5.2, a: .55 * on, e, col: c});
  paint(dcyl(x, y, 3.2, z + 6, 176 - z - 6, 14), {e, tone: 'mid', alpha: on});
  paint(dcyl(x, y, 6, z, 6, 18), {e, tone: 'hi', acc: c, g: 1, alpha: on});
  spark([x, y, z - 1], 26 * on, c, .55 * on * (.4 + .6 * e));
}

// ---- stations
// Time helpers in beat seconds: is t inside beat id; a window that rises at a and falls at b.
const live = (id, t) => { const n = t - B[id].start; return n >= 0 && n < B[id].dur; };
const win = (n, a, b, fi = .3, fo = .4) => sm((n - a) / fi) * (1 - sm((n - b) / fo));
const arc = (p, q, f, h = 30) => [lerp(p[0], q[0], f), lerp(p[1], q[1], f), lerp(p[2], q[2], f) + Math.sin(Math.PI * f) * h];
const card = (p, w, d, {e = 1, col = GREEN, g = .8, alpha = 1} = {}) => paint(dyn(p[0] - w / 2, p[1] - d / 2, w, d, p[2], 1.5, 1), {e, tone: 'hi', acc: col, g, alpha});

// Kernel: the template's CLAUDE.md plate (its evidence-before-done rule, two more rule lines, the two sections /init-project
// fills, the reference index) and AGENTS.md, on a plinth. In m1 a step on the strip in front shows the rule at work: step 1
// is checked, then DONE; step 2 is stamped DONE with its check lamp dark, and the rule flags the risk.
function drawKernel(t) {
  const e = emphasis(t, 'kernel'), n = nloc('m1', t), nk = nloc('k1', t), M = B.m1.S, KS = B.k1.S, L1 = live('m1', t), Lk = live('k1', t);
  const fill = [M.how + 2.2, M.how + 2.8], prune = KS.how + 1.9, zt = Z0 + 26;
  const read = L1 ? Math.max(win(n, 1, M.ans - .4), win(n, M.why + .6, M.ro0 - 1.3)) : Lk ? Math.max(win(nk, 1, KS.how - .1), win(nk, KS.why + .4, 99)) : 0;
  const rule = L1 ? win(n, M.ans, M.how + .2) : 0, risk = L1 ? sm((n - M.ro0 + .35) / .25) : 0, closeRule = live('close', t) ? sm((nloc('close', t) - .6) / .4) : 0;
  paint(box(0, 20, 170, 150, Z0, 22, 6, 1.4, 6), {e, tone: 'mid'});
  for (const [x, y] of k.corners({x: 0, y: 20, w: 170, d: 150}, 7)) dot([x, y, Z0 + 22], 1.4, CREAM, .4 * e);
  paint(box(12, 32, 146, 74, Z0 + 22, 4, 3, .8), {e, tone: 'hi', acc: GREEN, g: read * .7});
  paint(box(12, 114, 146, 44, Z0 + 22, 4, 3, .8), {e, tone: 'hi'});
  faceText('CLAUDE.md', [20, 40, zt], {size: 8, a: .75, e});
  faceText('AGENTS.md', [20, 124, zt], {size: 8, a: .6, e});
  for (let r = 0; r < 3; r++) line(k.lineOnTop([20, 134 + r * 8], [20 + 50 + ((r * 41) % 70), 134 + r * 8], zt, P), {e, tone: 'lo'});
  // The evidence-before-done rule: green while the answer names it, amber when it flags the unchecked DONE.
  const rg = Math.max(rule, risk, closeRule), rc = risk > .5 ? AMBER : GREEN;
  if (rg > .01) paint(dyn(16, 47.5, 138, 9, zt, .6, 1), {e, tone: 'hi', acc: rc, g: rg});
  faceText('EVIDENCE BEFORE DONE', [20, 52, zt + .8], {size: 5.2, a: .55 + .4 * rg, e, col: rg > .2 ? rc : CREAM});
  line(k.lineOnTop([20, 60], [104, 60], zt, P), {e, tone: 'lo'});
  // A stale line: struck and lifted out in k1, gone after.
  const st = nk - prune, gone = sm((st - .9) / .6);
  if (gone < 1) {
    const z = zt + 24 * gone, hot = st > 0 ? 1 - gone : 0;
    line(k.lineOnTop([20, 66], [82, 66], z, P), {e, col: hot ? AMBER : CREAM, a: hot ? .95 * hot : TONE.lo, w: hot ? 2.2 : 1, g: .7 * hot});
    if (st > .3) line(k.lineOnTop([17, 66], [17 + 68 * sm((st - .3) / .4), 66], z + .3, P), {e, col: AMBER, a: .95 * (1 - gone), w: 1.4});
  }
  // The two sections /init-project fills: verification signal and deploy policy.
  [['VERIFY SIGNAL', 77, fill[0]], ['DEPLOY POLICY', 88, fill[1]]].forEach(([lab, y, a]) => {
    const f = sm((n - a) / .5), hot = L1 ? win(n, a - .2, M.why + .9) : 0;
    faceText(lab, [20, y, zt], {size: 4.4, a: .62, e});
    line(k.planOutline({x: 72, y: y - 4, w: 80, d: 8, r: 1}, zt + .2, P, 2), {e, col: f > .5 ? GREEN : AMBER, a: .45 + .45 * hot, g: .4 * hot});
    if (f < 1) faceText('FILL IN', [76, y, zt + .3], {size: 4, a: .7 * (1 - f), e, col: AMBER});
    if (f > 0) for (let r = 0; r < 2; r++) line(k.lineOnTop([76, y - 1.5 + r * 3], [76 + (r ? 44 : 66) * f, y - 1.5 + r * 3], zt + .4, P), {e, col: GREEN, a: .85, w: 1.2, g: hot * .5});
  });
  faceText('REFERENCE INDEX', [20, 99, zt], {size: 4.2, a: .5 + .4 * (Lk ? win(nk, KS.ans, KS.how + .4) : 0), e, col: Lk && win(nk, KS.ans, KS.how + .4) > .3 ? GREEN : CREAM});
  if (read > 0) { const sy = 46 + (((L1 ? n : nk) * 40) % 58); line(k.lineOnTop([14, sy], [156, sy], zt + .5, P), {e, col: GREEN, a: read * .9, w: 1.6, g: read * .6}); }
  // k1: the index points into the reference drawers.
  if (Lk) { const c = win(nk, KS.ans + .2, 99); if (c > .01) { line(k.onTop([[150, 100], [196, 100]], zt, P), {e, col: GREEN, a: .7 * c, w: 1.3, g: .4 * c});
    line(k.onTop([[196, 100], [196, 186], [482, 186], [482, 156]], Z0 + .6, P), {e, col: GREEN, a: .55 * c, w: 1.3, g: .3 * c});
    for (let j = 0; j < 2; j++) { const f = ((nk - KS.ans) * .35 + j / 2) % 1, x = f < .5 ? lerp(196, 482, f * 2) : 482, y = f < .5 ? 186 : lerp(186, 156, (f - .5) * 2); spark([x, y, Z0 + 1], 14, GREEN, .7 * c); } } }
  if (!L1) return;
  // m1: the repo files /init-project reads, and the step strip.
  const fin = sm(n / .6), hd = headAt('cc', t);
  for (let j = 0; j < 3; j++) {
    const g = win(n, M.how + .3 + j * .3, M.how + 1.9);
    paint(box(140 + j * 25, 194, 20, 24, Z0, 6, 1.5), {e, tone: 'mid', acc: GREEN, g: g * .8, alpha: fin});
    for (let r = 0; r < 3; r++) line(k.lineOnTop([143 + j * 25, 199 + r * 6], [143 + j * 25 + 8 + (r * 5) % 7, 199 + r * 6], Z0 + 6, P), {e, tone: 'mid', a: .5 * fin});
  }
  faceText('REPO FILES', [141, 226, Z0], {size: 4.6, a: .6 * fin, e});
  if (hd) for (let j = 0; j < 3; j++) { const f = clamp((n - M.how - .5 - j * .35) / .7); if (f > 0 && f < 1) spark(arc([150 + j * 25, 206, Z0 + 6], [hd[0], hd[1], hd[2]], f, 20), 14, GREEN, .9); }
  const s1 = win(n, M.ans - .5, M.how + .3, .3, .3), s2 = sm((n - M.ro0 + 1.6) / .3), lamp = win(n, M.ans + .4, M.how + .3);
  paint(cyl(62, 184, 5, Z0, 5, 16), {e, tone: lamp > .1 ? 'hi' : 'mid', acc: GREEN, g: lamp});
  if (lamp > .05) spark([62, 184, Z0 + 5], 16, GREEN, .6 * lamp);
  faceText('CHECK', [53, 191, Z0 + 3], {size: 3.8, face: 'front', a: .6, e});
  for (const [a, done, col] of [[s1, sm((n - M.ans - 1.3) / .2), GREEN], [s2, sm((n - M.ro0 + .55) / .2), risk > .5 ? AMBER : CREAM]]) {
    if (a <= .01) continue;
    paint(dyn(24, 176, 18, 16, Z0, 12, 2), {e, tone: 'hi', acc: col, g: .5, alpha: a});
    if (done > 0) faceText('DONE', [25, 184, Z0 + 12.2], {size: 5, a: .95 * done * a, e, col});
  }
  if (risk > 0) {
    paint(dcyl(88, 184, 1.2, Z0, 40 * risk, 8), {e, tone: 'mid'});
    paint(dyn(89, 183.4, 22, 1.6, Z0 + 26 * risk, 12, .5), {e, tone: 'hi', acc: AMBER, g: .9, alpha: risk});
    faceText('RISK', [91, 185, Z0 + 26 * risk + 9], {size: 5, face: 'front', a: .95 * risk, e, col: AMBER});
  }
}
// Skill rack: front row .claude/skills, back row .agents/skills (the hand-translated Codex ports); two back slots hold a
// small tag instead (skills disabled for Codex). In x3 Codex ports the back row, a hash chip lights under each Claude skill
// (its recorded baseline), CI sweeps clean once; then one Claude skill is edited, its hash no longer matches, its port lags
// and the next CI sweep flags it, to the end of the beat.
const RACK_N = 11, RACK_X = i => 230 + i * 14.5, CLAUDE_ONLY = [3, 8], EDITED = 6;
function drawRack(t) {
  const e = emphasis(t, 'rack'), ux = nloc('x3', t), X = B.x3.S, L = live('x3', t);
  const ports = i => L ? sm((ux - X.ans - .1 - i * .12) / .3) : 0, hash = i => L ? sm((ux - X.how - .1 - i * .08) / .3) : 0;
  const fix = L ? win(ux, X.why + .2, X.why + 1.6) : 0, edited = L ? sm((ux - X.why - .7) / .3) : 0, drift = L ? sm((ux - X.why - .8) / .5) : 0;
  const sweeps = [X.how + 1.4, X.why + 1.2, X.ro0 + .9, X.ro0 + 2.4], SWEEP = 1.4, hit = sweeps[1] + SWEEP * (RACK_X(EDITED) + 4.5 - 226) / 162;
  const flag = L ? sm((ux - hit) / .2) : 0, sweep = L ? sweeps.map(a => (ux - a) / SWEEP).find(f => f >= 0 && f < 1) : null;
  paint(box(220, 28, 172, 146, Z0, 10, 4, 1, 4), {e, tone: 'mid'});
  // CI post at the back left of the rack: its lamp checks the back row against the recorded hashes.
  const ciOn = L ? sm(ux / .5) : 0, lampG = Math.max(sweep != null ? .7 : 0, flag * (.75 + .25 * Math.sin(t * 5)));
  paint(cyl(198, 40, 3.5, Z0, 80, 14), {e, tone: 'mid'});
  paint(cyl(198, 40, 8, Z0 + 80, 10, 20), {e, tone: 'hi', acc: flag > .5 ? AMBER : GREEN, g: lampG * ciOn});
  if (lampG * ciOn > .05) spark([198, 40, Z0 + 86], 30, flag > .5 ? AMBER : GREEN, .6 * lampG * ciOn * e);
  paint(box(202, 38, 20, 3, Z0 + 62, 14, .8), {e, tone: 'mid'});
  faceText('CI', [205, 41, Z0 + 69], {size: 9, face: 'front', a: .8, e, col: flag > .5 ? AMBER : CREAM});
  paint(box(220, 28, 172, 8, Z0 + 10, 44, 2, .6), {e, tone: 'mid'});
  faceText('.agents/skills', [226, 40, Z0 + 10], {size: 5.5, a: .55, e, col: ports(0) > .5 ? AMBER : CREAM});
  faceText('.claude/skills', [226, 170, Z0 + 10.2], {size: 5.5, a: .55, e});
  for (let i = 0; i < RACK_N; i++) {
    const x = RACK_X(i);
    if (CLAUDE_ONLY.includes(i)) paint(box(x, 52, 9, 16, Z0 + 10, 6, 1), {e, tone: 'lo'});
    else {
      const dr = i === EDITED ? drift : 0;
      paint(dr > .01 ? dyn(x, 46, 9, 50, Z0 + 10, 40 - 12 * dr, 1.2) : box(x, 46, 9, 50, Z0 + 10, 40, 1.2), {e, tone: 'mid', acc: AMBER, g: ports(i) * .5 + dr * .8});
      if (i === EDITED && flag > .01) spark([x + 4.5, 70, Z0 + 44], 30, AMBER, .7 * flag);
    }
  }
  if (sweep != null) { const sx = 226 + 162 * sweep, a = Math.sin(Math.PI * sweep);
    line(k.segment([sx, 44, Z0 + 53], [sx, 98, Z0 + 53], P), {e, col: GREEN, a: .9 * a, w: 2, g: .6 * a}); spark([sx, 70, Z0 + 53], 18, GREEN, .5 * a); }
  if (flag > .01) line(k.segment([198, 40, Z0 + 86], [RACK_X(EDITED) + 4.5, 70, Z0 + 38], P), {e, col: AMBER, a: .8 * flag, w: 1.4, g: .5 * flag});
  for (let i = 0; i < RACK_N; i++) {
    const x = RACK_X(i), hot = i === EDITED && fix > .05;
    paint(box(x, 104, 9, 56, Z0 + 10, 46, 1.2), {e, tone: hot ? 'hi' : 'mid', acc: GREEN, g: i === EDITED ? fix : 0});
    line(k.lineOnTop([x + 4.5, 110], [x + 4.5, 110 + 14 + (i * 7) % 24], Z0 + 56, P), {e, tone: 'lo'});
    // The recorded hash under each Claude skill.
    const h = hash(i); if (h > .01) { const bad = i === EDITED ? edited : 0;
      paint(dyn(x + 1, 146, 7, 8, Z0 + 56, 1.4, 1), {e, tone: 'hi', acc: bad > .5 ? AMBER : GREEN, g: .6 * h + .4 * bad, alpha: h}); }
  }
}
// Reference drawers: six topic files in a cabinet; pitfalls is the middle right drawer. Two switches on top: each tool's
// built-in memory, both off.
const DRAWERS = ['architecture', 'commands', 'deployment', 'pitfalls', 'secrets', 'tech-stack'];
const DR = j => ({x: 446 + (j % 2) * 78, z: Z0 + 6 + (2 - Math.floor(j / 2)) * 39});
const PIT = 3, PITX = 560;
// m2, in beat seconds: session 1 builds four blocks [block, time]; block 2 fails twice (retry) and passes once its cause
// is confirmed; session 2 reads pitfalls.md first and builds all four.
function m2Times() { const M = B.m2.S; return {s1: [[0, 1.2], [1, 2], [2, 2.8], [2, 3.9], [2, 7], [3, 7.8]], fails: [2.8, 3.9], cause: 6, s2: [0, 1, 2, 3].map(j => [j, M.ro0 + 1 + j * .45])}; }
function drawerState(t) {
  const o = [0, 0, 0, 0, 0, 0], g = [0, 0, 0, 0, 0, 0];
  if (live('open', t)) { const u = local('open', t); g[PIT] = win(u, 4.6, 6.2); }
  if (live('k1', t)) { const n = nloc('k1', t), K = B.k1.S; o[2] = win(n, K.how + .4, K.how + 2.6); for (let j = 0; j < 6; j++) g[j] = .5 * win(n, K.ans + .4 + j * .25, K.how + .2); g[2] = Math.max(g[2], o[2]); }
  if (live('m2', t)) { const n = nloc('m2', t), M = B.m2.S; o[PIT] = Math.max(win(n, M.ans - .2, M.ans + 1.7), win(n, M.ro0 - .9, M.ro0 + .9)); g[PIT] = Math.max(o[PIT], .7 * win(n, M.how, M.why + .6)); }
  if (live('m3', t)) { const n = nloc('m3', t), M = B.m3.S; o[PIT] = Math.max(win(n, 1.5, 3), sm((n - M.ro0 + .7) / .4)); o[1] = win(n, M.how + .3, M.how + 1.6); g[PIT] = o[PIT]; g[1] = o[1]; }
  if (live('close', t)) g[PIT] = sm((nloc('close', t) - 1.6) / .4);
  return {o, g};
}
function drawDrawers(t) {
  const e = emphasis(t, 'drawers'), {o, g} = drawerState(t);
  paint(box(440, 30, 160, 120, Z0, 124, 3, 1, 4), {e, tone: 'mid'});
  line(k.sideSeam({x: 440, y: 30, w: 160, d: 120, r: 3}, Z0 + 120, P, 4), {e, tone: 'faint'});
  faceText('.claude/reference', [446, 40, Z0 + 124], {size: 6.5, a: .6, e});
  // Built-in memory switches, both off (Claude Code autoMemoryEnabled: false; Codex memories not used).
  const hi = live('m3', t) ? win(nloc('m3', t), B.m3.S.how + .1, B.m3.S.why + .6) : 0;
  [['CLAUDE MEMORY', 448], ['CODEX MEMORY', 524]].forEach(([lab, x]) => {
    paint(box(x, 84, 64, 20, Z0 + 124, 2, 1.5), {e, tone: 'lo', acc: AMBER, g: hi * .6});
    const [bx, by] = iso([x + 12, 94, Z0 + 126]), [tx, ty] = iso([x + 4, 94, Z0 + 136]);
    ctx.lineWidth = 2.2 / ZOOM; ctx.strokeStyle = css(hi > .3 ? AMBER : CREAM, (.5 + .4 * hi) * (.35 + .65 * e)); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
    dot([x + 4, 94, Z0 + 136], 2.4, hi > .3 ? AMBER : CREAM, .8 * e);
    faceText('OFF', [x + 22, 94, Z0 + 126.2], {size: 6, a: .55 + .4 * hi, e, col: hi > .3 ? AMBER : CREAM});
    faceText(lab, [x, 112, Z0 + 124], {size: 4.2, a: .5 + .4 * hi, e});
  });
  // Closed drawers first; an open drawer sticks out toward the viewer, so it is drawn last.
  for (const j of [0, 1, 2, 3, 4, 5].sort((a, b) => (o[a] > .01) - (o[b] > .01))) {
    const {x, z} = DR(j), op = o[j] * 46;
    if (op > .5) paint(dyn(x + 3, 150, 66, op, z + 3, 28, 1), {e, tone: 'mid'});
    paint(op > .5 ? dyn(x, 150 + op, 72, 5, z, 35, 1, .5) : box(x, 150, 72, 5, z, 35, 1, .5), {e, tone: g[j] > .05 ? 'hi' : 'mid', acc: GREEN, g: g[j] * .8});
    paint(op > .5 ? dyn(x + 24, 155 + op, 24, 3, z + 22, 4, 1) : box(x + 24, 155, 24, 3, z + 22, 4, 1), {e, tone: 'lo'});
    faceText(DRAWERS[j] + '.md', [x + 6, 155 + op, z + 13], {size: 5.4, face: 'front', a: j === PIT || g[j] > .2 ? .8 : .5, e});
  }
  const hd = headAt('cc', t), hx = headAt('cx', t), pz = DR(PIT).z, pin = () => [PITX, 150 + o[PIT] * 23, pz + 24];
  // k1: /recall reads the deployment drawer, sparks rising to the head.
  if (live('k1', t) && hd) { const n = nloc('k1', t), K = B.k1.S, a = win(n, K.how + .7, K.how + 2.4);
    for (let j = 0; j < 3; j++) { const f = ((n - K.how) * .6 + j / 3) % 1; if (a > .01) spark(arc([482, 150 + o[2] * 23, DR(2).z + 24], hd, f, 24), 15, GREEN, .85 * a * Math.sin(Math.PI * f)); } }
  if (live('m2', t)) drawM2(t, e, o, hd, pin);
  if (live('m3', t)) {
    const n = nloc('m3', t), M = B.m3.S;
    // Claude Code files its lesson into pitfalls.md; Codex files one into commands.md.
    if (hd) { const f = clamp((n - 1.7) / .9); if (f > 0 && f < 1) card(arc([hd[0], hd[1], hd[2] - 6], pin(), eio(f), 16), 22, 14, {e}); }
    if (hx) { const f = clamp((n - M.how - .5) / .9); if (f > 0 && f < 1) card(arc([hx[0], hx[1], hx[2] - 6], [PITX, 150 + o[1] * 23, DR(1).z + 24], eio(f), 16), 22, 14, {e, col: AMBER}); }
    // Codex opens pitfalls.md and recalls the lesson Claude Code saved: the green card rises to the amber head and stays.
    const r = clamp((n - M.ro0 + .3) / 1);
    if (r > 0 && hx) { const p = arc(pin(), [hx[0], hx[1] + 4, hx[2] - 14], eio(r), 20); card(p, 22, 14, {e}); if (r < 1) spark(p, 22, AMBER, .8); else spark(p, 18, AMBER, .35 + .2 * Math.sin(t * 4)); }
  }
}
// m2: a quirk costs a retry; once its cause is confirmed the lesson is filed into pitfalls.md unasked; git carries the
// file to a second machine; the next session reads pitfalls.md first, cites the entry with its date and builds clean.
function drawM2(t, e, o, hd, pin) {
  const n = nloc('m2', t), M = B.m2.S, T = m2Times(), s2 = n > M.ro0 - .9, old = 1 - sm((n - M.ro0 + 1.3) / .4), bxl = j => 454 + j * 36;
  for (let j = 0; j < 4; j++) {
    if (!s2) {
      const t0 = T.s1.find(([b]) => b === j)[1]; if (n < t0) continue;
      const snag = j === 2 && n < 7, flash = j === 2 ? Math.max(...T.fails.map(a => win(n, a, a + .5, .08, .3))) : 0;
      paint(dyn(bxl(j), 200, 26, 26, Z0, 16, 2), {e, tone: 'hi', acc: snag ? AMBER : GREEN, g: snag ? .5 + .5 * flash : .45, alpha: old * sm((n - t0) / .2)});
      if (j === 2) {
        T.fails.forEach((a, r) => { if (n > a) dot([bxl(2) + 5 + r * 6, 205, Z0 + 16.4], 2.6, AMBER, .95 * old); });
        if (n > T.cause) faceText('CAUSE', [bxl(2) + 3, 218, Z0 + 16.4], {size: 4.4, a: .9 * old * sm((n - T.cause) / .3), e, col: GREEN});
      }
    } else { const tb = T.s2[j][1]; if (n < tb) continue; paint(dyn(bxl(j), 200, 26, 26, Z0, 16, 2), {e, tone: 'hi', acc: GREEN, g: .5, alpha: sm((n - tb) / .2)}); }
  }
  // The lesson card: printed at the block, filed into the open pitfalls.md drawer.
  const f = clamp((n - M.ans - .1) / 1.1);
  if (f > 0 && n < M.ans + 1.6) { const p = arc([bxl(2) + 13, 213, Z0 + 20], pin(), eio(f), 40); card([p[0], p[1], p[2] - (f >= 1 ? (n - M.ans - 1.2) * 40 : 0)], 22, 14, {e}); }
  // How: the link from the retried block to the saved entry.
  const lk = win(n, M.how, M.why + .4); if (lk > .01) line(k.segment([bxl(2) + 13, 213, Z0 + 16], [PITX, 156, DR(PIT).z + 17], P), {e, col: GREEN, a: .6 * lk * old, w: 1.2, g: .4 * lk});
  // Git carries the file to a second machine, whose pitfalls.md lights.
  const m = sm((n - M.why + .4) / .5), arrive = sm((n - M.why - 1.3) / .3);
  if (m > .01) {
    paint(box(340, 290, 74, 46, 0, 58, 3, 1, 4), {e, tone: 'mid', alpha: m});
    for (let j = 0; j < 6; j++) { const c = j % 2, r = 2 - Math.floor(j / 2);
      paint(box(344 + c * 35, 336, 31, 2, 4 + r * 17, 14, .5), {e, tone: j === PIT && arrive > .1 ? 'hi' : 'mid', acc: GREEN, g: j === PIT ? arrive * .9 : 0, alpha: m}); }
    faceText('MACHINE 2', [344, 296, 58], {size: 5.4, a: .7 * m, e});
    const gf = clamp((n - M.why - .2) / 1.1), from = [PITX, 156, DR(PIT).z + 17], to = [396, 336, 4 + 17 + 7];
    if (gf > 0) { line(k.segment(from, to, P), {e, col: GREEN, a: .3 * m, w: 1}); if (gf < 1) spark(arc(from, to, gf, 30), 20, GREEN, .95); }
    faceText('git', [lerp(from[0], to[0], .8) + 8, lerp(from[1], to[1], .8), lerp(from[2], to[2], .8) + 8], {size: 5.4, face: 'front', a: .75 * m, e, col: GREEN});
  }
  // The next session cites the entry, file and date, from the moment it reads it to the end.
  const cs = clamp((n - M.ro0 + .5) / .9);
  if (cs > 0) {
    const p = arc(pin(), [690, 70, Z0 + 150], eio(cs), 24);
    paint(dyn(p[0] - 56, p[1] - 9, 112, 18, p[2], 1.5, 1), {e, tone: 'hi', acc: GREEN, g: .7});
    faceText('per pitfalls.md (2026-03-14)', [p[0] - 52, p[1], p[2] + 1.6], {size: 6.6, a: .95 * cs, e, col: GREEN});
    if (hd && cs >= 1) line(k.segment([p[0], p[1], p[2]], [hd[0], hd[1], hd[2] + 4], P), {e, col: GREEN, a: .35, w: 1});
  }
}
// Planning desk (/deep-plan): the ledger records each answer in your words (Q1 to Q4); low-stakes guesses drop into
// ASSUMED as Q8 and Q9, each with a veto you can press; the WHY reviewer tests the two weightiest decisions; GO waits for you.
function p1Asks() { const M = B.p1.S; return [.9, 2.9, 4.9, M.ans - .9]; }
function drawPlan(t) {
  const e = emphasis(t, 'plan'), n = nloc('p1', t), M = B.p1.S, L = live('p1', t), zt = Z0 + 39, asks = p1Asks(), hd = headAt('cc', t);
  // The WHY reviewer's lamp, on the bench behind the desk: a fresh reviewer tests Q1, then Q3
  const rv = L ? [win(n, M.why + .1, M.why + .9, .2, .2), win(n, M.why + 1, M.why + 1.8, .2, .2)] : [0, 0];
  paint(cyl(716, 30, 3.5, Z0, 92, 14), {e, tone: 'mid'});
  paint(box(722, 26, 3, 16, Z0 + 70, 10, .6), {e, tone: 'mid'});
  faceText('WHY', [725, 28, Z0 + 78], {size: 5.4, face: 'front', a: .75, e});
  const lit = Math.max(...rv); paint(dcyl(716, 30, 8, Z0 + 92, 7, 18), {e, tone: 'hi', acc: CREAM, g: lit * .8});
  if (lit > .05) spark([716, 30, Z0 + 95], 26, CREAM, .5 * lit);
  paint(box(660, 40, 184, 124, Z0, 36, 4, 1.2, 4), {e, tone: 'mid'});
  paint(box(670, 50, 164, 104, Z0 + 36, 3, 3, .6), {e, tone: 'hi'});
  // The ledger
  const led = L ? win(n, M.ans, M.how + .3) : 0;
  paint(box(676, 56, 84, 92, zt, 1, 2), {e, tone: 'lo', acc: GREEN, g: led * .9, flat: true});
  faceText('ledger.md', [680, 63, zt + 1], {size: 5.5, a: .7, e, col: led > .3 ? GREEN : CREAM});
  asks.forEach((qa, j) => {
    const y = 78 + j * 16, w = sm((n - qa - 1.5) / .4);
    if (L && hd) { const f = clamp((n - qa) / .5); if (f > 0 && f < 1) spark(arc([hd[0], hd[1], hd[2]], [744, 300, 70], f, 10), 16, AMBER, .9); }
    if (L) { const f = clamp((n - qa - .7) / .8); if (f > 0 && f < 1) card(arc([744, 290, 70], [712, y, zt + 2], eio(f), 30), 14, 8, {e}); }
    if (w <= 0) return;
    faceText('Q' + (j + 1), [680, y, zt + 1.2], {size: 4.8, a: .75 * w, e});
    faceText('“', [692, y + 1, zt + 1.2], {size: 7, a: .85 * w, e, col: GREEN});
    line(k.lineOnTop([699, y], [699 + (30 + (j * 17) % 22) * w, y], zt + 1.2, P), {e, col: CREAM, a: .6 * w});
    if (j === 0 || j === 2) { const rv = sm((n - M.why - .9 - (j ? .9 : 0)) / .3); if (rv > 0) dot([752, y, zt + 1.4], 2.8, GREEN, .95 * rv); }
  });
  // Assumptions, each with a veto
  faceText('ASSUMED', [772, 63, zt + 1], {size: 4.8, a: .65, e, col: AMBER});
  [['Q8', M.how + .6], ['Q9', M.how + 1.25]].forEach(([q, tw], j) => {
    const y = 78 + j * 18, a = sm((n - tw) / .3); if (a <= 0) return;
    const hot = q === 'Q9' && L ? sm((n - M.ro0 + .1) / .3) * (.65 + .35 * Math.sin(t * 4)) : 0;
    paint(dyn(772, y - 6, 30, 12, zt + 12 * (1 - a), 2, 1), {e, tone: 'hi', acc: AMBER, g: .35 + .65 * hot});
    faceText(q, [776, y, zt + 2.2 + 12 * (1 - a)], {size: 5.2, a: .9 * a, e, col: AMBER});
    paint(cyl(816, y, 4.5, zt, 2.5, 14), {e, tone: hot > .1 ? 'hi' : 'mid', acc: AMBER, g: hot * .5, alpha: a});
    faceText('VETO', [808, y + 9, zt], {size: 3.8, a: .6 * a, e});
  });
  rv.forEach((a, j) => { if (a > .01 && e > .5) { const y = 78 + j * 32, a1 = iso([716, 30, Z0 + 92]), b1 = iso([678, y - 6, zt + 1]), b2 = iso([758, y + 6, zt + 1]);
    ctx.fillStyle = css(CREAM, .16 * a); ctx.beginPath(); ctx.moveTo(...a1); ctx.lineTo(...b1); ctx.lineTo(...b2); ctx.closePath(); ctx.fill(); } });
  // GO: yours, waiting; it glows once the review is done, and nobody pulls it in the film
  const go = L ? sm((n - M.why - 2) / .4) * (.7 + .3 * Math.sin(t * 3)) : 0;
  paint(box(784, 116, 14, 26, zt, 4, 2), {e, tone: 'mid', acc: GREEN, g: go * .6});
  const [bx, by] = iso([791, 129, zt + 4]), [tx, ty] = iso([781, 129, zt + 32]);
  ctx.lineWidth = 3 / ZOOM; ctx.strokeStyle = css(go > .3 ? GREEN : CREAM, (.5 + .5 * go) * (.35 + .65 * e)); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
  dot([781, 129, zt + 32], 4.5, go > .3 ? GREEN : CREAM, .9 * e);
  faceText('GO', [784, 148, zt], {size: 6, a: .6 + .4 * go, e, col: go > .3 ? GREEN : CREAM});
}
// Long-horizon line: the chat column with the plan file state.md beside it, a belt, the WORKER press and the AUDITOR (a dial,
// three check lamps and a beam it turns on the step), a queue of steps in front and a VERIFIED row.
// p2: you start the run and the plan is saved; step 1 passes its audit and is kept in VERIFIED; step 2 fails its audit
// twice on approach A, A is logged in state.md as a dead end, the line switches to approach B, and step 2 passes.
// c1: the checks are written and sealed with a hash before the step and handed to the auditor; the worker presses the step
// and stamps it DONE, leaving its report by the press, where the auditor never reads it; the audit fails; on the second
// run the worker touches the sealed check and the seal flags it; the final auditor reruns every check and the step fails.
const QUEUE = [0, 1, 2, 3].map(i => [896 + i * 26, 206]), PASSED = [0, 1, 2, 3].map(i => [1062 + i * 26, 206]);
const BELT = {in: 900, press: 1006, check: 1110}, BTOP = Z0 + 14;
const run = (go, pass, o = {}) => ({go, press: go + .85, check: [go + 1.5, go + 2.4], pass, ...o});
let LS = null;
function lineScript() {
  if (LS) return LS;
  const P = B.p2.S, C = B.c1.S;
  const r2 = run(P.ans - 2.3, false), r3 = run(P.how - 1.5, false), r4 = run(P.ro0 + .2, true, {b: true});
  const ra = run(4.2, false, {check: [6, 8.2]}), rb = run(C.ans - 2, false, {check: [C.ans + .1, C.how - .3], partial: 2, stay: true, final: [C.why + .1, C.ro0]});
  return (LS = {p2: {save: .8, steps: [[run(1.6, true)], [r2, r3, r4]], runs: [run(1.6, true), r2, r3, r4], fails: [r2.check[1], r3.check[1]],
    dead: [P.how + 1, P.how + 1.8], flip: P.ro0 - .35}, c1: {write: [.6, 2.2], seal: 2.2, fly: [2.6, 3.8], runs: [ra, rb], tamper: C.how + .85}});
}
// Where a step is at n (beat seconds), given its runs, home (queue spot) and slot (VERIFIED spot).
function stepPos(runs, n, home, slot) {
  let r = null, k = -1; runs.forEach((x, j) => { if (n >= x.go) { r = x; k = j; } });
  if (!r) return {x: home[0], y: home[1], z: home[2] ?? Z0, col: GREEN, g: 0, act: false};
  const v = n - r.go, rest = k ? [BELT.in, 120, BTOP] : [home[0], home[1], home[2] ?? Z0], [a, b] = r.check, end = r.final ? r.final[1] : b;
  let p;
  if (v < .4) { const f = eio(v / .4); p = [lerp(rest[0], BELT.in, f), lerp(rest[1], 120, f), lerp(rest[2], BTOP, f)]; }
  else if (n < r.press - .05) p = [lerp(BELT.in, BELT.press, eio((v - .4) / (r.press - .05 - r.go - .4))), 120, BTOP];
  else if (n < r.press + .3) p = [BELT.press, 120, BTOP];
  else if (n < r.press + .65) p = [lerp(BELT.press, BELT.check, eio((n - r.press - .3) / .35)), 120, BTOP];
  else if (r.stay || n < end + .25) p = [BELT.check, 120, BTOP];
  else if (r.pass) { const f = eio(clamp((n - end - .25) / .6)); p = [lerp(BELT.check, slot[0], f), lerp(120, slot[1], f), lerp(BTOP, Z0, f)]; }
  else { const f = eio(clamp((n - end - .25) / 1)); p = [lerp(BELT.check, BELT.in, f), 120, BTOP]; }
  const failed = !r.pass && n >= end, passed = r.pass && n >= end;
  return {x: p[0], y: p[1], z: p[2], col: failed ? AMBER : GREEN, g: passed ? .9 : failed ? .8 : .4, act: true, r, failed};
}
// The auditor at t: needle 0..1, three lamps (0 off, 1 pass, 2 fail), the beam on the step.
function auditor(t) {
  const o = {needle: 0, col: CREAM, lamps: [0, 0, 0], beam: 0};
  const sweep = (n, a, b, pass, upto = 3, hold = 99) => { if (n < a - .2 || n > hold) return false; const pr = clamp((n - a) / (b - a));
    o.needle = .92 * pr; o.col = !pass && n >= b ? AMBER : pr > .02 ? GREEN : CREAM; o.lamps = [0, 1, 2].map(k => k < upto && pr >= (k + 1) / 3 - .02 ? (!pass && k === 2 ? 2 : 1) : 0);
    o.beam = sm((n - a + .2) / .2) * (n < b ? 1 : 1 - sm((n - b - .3) / .3)); return true; };
  if (live('p2', t)) { const n = nloc('p2', t); for (const r of lineScript().p2.runs) sweep(n, ...r.check, r.pass, 3, r.check[1] + .5); return o; }
  if (live('c1', t)) { const n = nloc('c1', t), [ra, rb] = lineScript().c1.runs;
    sweep(n, ...ra.check, false, 3, rb.go - .4); sweep(n, ...rb.check, true, rb.partial, rb.final[0] - .15); sweep(n, ...rb.final, false, 3, 99);
    if (n > rb.final[1] - .01) o.beam = Math.max(o.beam, .5); return o; }
  return o;
}
function drawLine(t) {
  const e = emphasis(t, 'line'), n = nloc('p2', t), nc = nloc('c1', t), L2 = live('p2', t), Lc = live('c1', t), S = lineScript(), p2 = S.p2, c1 = S.c1;
  // The plan file: saved when you start the run; in p2 it logs approach A as a dead end.
  const saved = L2 ? win(n, p2.save + .8, p2.save + 1.8) : 0, dead = L2 ? sm((n - p2.dead[1]) / .3) : 0;
  paint(box(846, 28, 34, 52, Z0, 5, 2, .6), {e, tone: 'mid', acc: dead > .5 ? AMBER : GREEN, g: Math.max(saved, L2 ? win(n, p2.dead[1], p2.dead[1] + 1.2) : 0) * .9});
  faceText('state.md', [849, 74, Z0 + 5], {size: 5, a: .7, e});
  for (let r = 0; r < 3; r++) line(k.lineOnTop([850, 36 + r * 6], [850 + 14 + (r * 9) % 16, 36 + r * 6], Z0 + 5, P), {e, tone: 'lo'});
  if (dead > 0) { paint(dyn(848, 53, 30, 9, Z0 + 5, .6, 1), {e, tone: 'hi', acc: AMBER, g: .7 * dead}); faceText('DEAD END · A', [849, 58, Z0 + 5.8], {size: 3.8, a: .95 * dead, e, col: AMBER}); }
  if (L2 && n > p2.save && n < p2.save + 1.2) { const f = eio(clamp((n - p2.save) / 1)); spark(arc([760, 120, Z0 + 40], [863, 54, Z0 + 6], f, 40), 18, GREEN, .9); }
  // The chat: pedestal and column; in c1 it writes the checks.
  paint(box(884, 24, 58, 58, Z0, 40, 3, 1), {e, tone: 'mid'});
  faceText('CHAT', [888, 84, Z0 + 32], {size: 5, face: 'front', a: .5, e});
  const brief = Lc ? win(nc, c1.write[0], c1.write[1], .3, .3) : 0;
  paint(cyl(913, 53, 19, Z0 + 40, 34, 32), {e, tone: 'hi', acc: GREEN, g: brief * .8});
  for (let r = 1; r < 6; r++) line(k.sideArc(913, 53, 19, Z0 + 40 + r * 6, P, 20), {e, tone: 'faint'});
  // Belt with moving cleats
  paint(box(880, 98, 286, 44, Z0, 14, 6, .8), {e, tone: 'mid'});
  for (let j = 0; j < 14; j++) { const x = 888 + ((j * 20 + (t * 22) % 20)); if (x < 1160) line(k.lineOnTop([x, 102], [x, 138], Z0 + 14, P), {e, tone: 'faint'}); }
  // p2: the approach selector, A or B, with a pip for each failed audit on A
  if (L2) {
    const b = sm((n - p2.flip) / .3);
    paint(box(916, 150, 64, 24, Z0, 6, 2, .5), {e, tone: 'mid'});
    faceText('APPROACH', [920, 176, Z0 + 4], {size: 3.8, face: 'front', a: .6, e});
    [['A', 932, 1 - b], ['B', 962, b]].forEach(([s, x, on]) => { paint(cyl(x, 160, 6, Z0 + 6, 3, 18), {e, tone: on > .5 ? 'hi' : 'mid', acc: s === 'A' ? AMBER : GREEN, g: on * (s === 'A' && n > p2.fails[0] ? 1 : .8)});
      faceText(s, [x - 2, 170, Z0 + 6], {size: 6, a: .8, e, col: on > .5 ? (s === 'A' && n > p2.fails[0] ? AMBER : GREEN) : CREAM}); });
    p2.fails.forEach((a, j) => { const f = sm((n - a) / .2); if (f > 0) dot([944 + j * 6, 156, Z0 + 6.2], 2.4, AMBER, .95 * f); });
    // The dead end chit flies from the selector to state.md
    const f = clamp((n - p2.dead[0]) / (p2.dead[1] - p2.dead[0])); if (f > 0 && f < 1) card(arc([932, 160, Z0 + 10], [863, 57, Z0 + 6], eio(f), 40), 18, 10, {e, col: AMBER});
  }
  // The auditor pedestal (behind the belt): dial, needle, three check lamps
  const ck = auditor(t);
  paint(box(1086, 24, 84, 58, Z0, 30, 3, 1), {e, tone: 'mid'});
  faceText('AUDITOR', [1090, 84, Z0 + 22], {size: 5, face: 'front', a: .5, e});
  paint(cyl(1114, 52, 23, Z0 + 30, 7, 48), {e, tone: 'hi'});
  const tk = k.radialTicks(1114, 52, 21, 30, 5, Z0 + 37, [2, 4], P, -2.2, 4.4); line(tk.minor, {e, tone: 'lo'}); line(tk.major, {e, tone: 'mid'});
  const na = -2.2 + 4.4 * ck.needle;
  line(k.lineOnTop([1114, 52], [1114 + Math.sin(na) * 18, 52 - Math.cos(na) * 18], Z0 + 37.4, P), {e, col: ck.col, a: .95, w: 1.6, g: ck.needle > .02 ? .4 : 0});
  ck.lamps.forEach((s, j) => { paint(cyl(1157, 36 + j * 16, 6, Z0 + 30, 4, 18), {e, tone: s ? 'hi' : 'mid', acc: s === 2 ? AMBER : GREEN, g: s ? 1 : 0});
    if (s) spark([1157, 36 + j * 16, Z0 + 35], s === 2 ? 26 : 16, s === 2 ? AMBER : GREEN, (s === 2 ? .9 : .6) * e); });
  // c1: the checks, written and sealed first, fly to the auditor before the worker starts, and stay there; the seal flags a touch.
  if (Lc && nc > c1.write[0]) {
    const fb = clamp((nc - c1.fly[0]) / (c1.fly[1] - c1.fly[0])), p = fb > 0 ? arc([913, 53, Z0 + 76], [1142, 70, Z0 + 30], eio(fb), 30) : [913, 53, Z0 + 76 + 6 * sm((nc - c1.write[0]) / .5)];
    const touched = sm((nc - c1.tamper) / .2), sealed = sm((nc - c1.seal) / .3);
    paint(dyn(p[0] - 8, p[1] - 6, 16, 12, p[2], 2, 1), {e, tone: 'hi', acc: touched > .5 ? AMBER : GREEN, g: .5 + .4 * touched, alpha: sm((nc - c1.write[0]) / .4)});
    for (let r = 0; r < 3; r++) line(k.lineOnTop([p[0] - 6, p[1] - 3 + r * 3], [p[0] - 6 + 7 + (r % 2) * 3, p[1] - 3 + r * 3], p[2] + 2.2, P), {e, tone: 'mid'});
    if (sealed > 0) { dot([p[0] + 5, p[1] + 3, p[2] + 2.3], 3.2, touched > .5 ? AMBER : GREEN, .95 * sealed); spark([p[0] + 5, p[1] + 3, p[2] + 2.3], touched > .5 ? 26 : 12, touched > .5 ? AMBER : GREEN, (touched > .5 ? .8 : .4) * sealed); }
    if (touched > 0) { paint(dyn(1132, 84, 30, 2, Z0 + 18, 9, .5), {e, tone: 'hi', acc: AMBER, g: .8, alpha: touched}); faceText('HASH DIFF', [1133, 85, Z0 + 25], {size: 3.8, face: 'front', a: .95 * touched, e, col: AMBER}); }
  }
  // Worker press over the belt
  for (const y of [92, 148]) paint(cyl(1006, y, 4.5, Z0 + 14, 82, 16), {e, tone: 'mid'});
  paint(box(1000, 88, 12, 64, Z0 + 96, 9, 2, .5), {e, tone: 'mid'});
  faceText('WORKER', [992, 150, Z0 + 108], {size: 5, face: 'front', a: .5, e});
  let press = 0;
  const pr = runs => { for (const r of runs) press = Math.max(press, sm(((L2 ? n : nc) - r.press + .05) / .12) * (1 - sm(((L2 ? n : nc) - r.press - .2) / .12))); };
  faceText('VERIFIED', [1062, 222, Z0 + 2], {size: 4.4, face: 'front', a: .5, e});
  // p2: the queue, the steps on the belt, the VERIFIED row
  if (t < B.c1.start) for (let i = 0; i < 4; i++) {
    const runs = L2 ? p2.steps[i] || [] : [], s = stepPos(runs, n, QUEUE[i], PASSED[i]);
    paint(dyn(s.x - 9, s.y - 9, 18, 18, s.z, 12, 2), {e, tone: s.act ? 'hi' : 'mid', acc: s.col, g: s.g});
    if (i === 1 && s.act) { const b = n > p2.flip + .15; faceText(b ? 'B' : 'A', [s.x - 3, s.y, s.z + 12.2], {size: 7, a: .9, e, col: b ? GREEN : (n > p2.fails[0] ? AMBER : CREAM)}); }
    if (L2) pr(runs);
  }
  // c1: one step, its DONE stamp (struck through when the audit fails) and the report chit beside the press
  if (Lc) {
    const s = stepPos(c1.runs, nc, [BELT.in, 120, BTOP], PASSED[0]), r = s.r;
    paint(dyn(s.x - 10, 110, 20, 20, s.z, 14, 2), {e, tone: 'hi', acc: s.col, g: s.g});
    if (r) { const done = sm((nc - r.press - .2) / .2), fail = r.final ? sm((nc - r.final[1]) / .15) : sm((nc - r.check[1]) / .15);
      if (done > 0) { faceText('DONE', [s.x - 9, 120, s.z + 14.2], {size: 6.5, a: .9 * done, e, col: fail > .5 ? AMBER : GREEN});
        if (fail > 0) line(k.lineOnTop([s.x - 9, 120], [s.x - 9 + 18 * fail, 120], s.z + 14.4, P), {e, col: AMBER, a: .95, w: 1.6}); } }
    const chit = sm((nc - c1.runs[0].press - .2) / .3);
    if (chit > .01) { paint(dyn(1018, 150, 22, 14, Z0, 2, 1), {e, tone: 'hi', alpha: chit}); faceText('REPORT', [1020, 157, Z0 + 2.2], {size: 3.6, a: .75 * chit, e}); }
    pr(c1.runs);
  }
  if (ck.beam > .01 && e > .5) {
    const a1 = iso([1114, 70, Z0 + 37]), b1 = iso([BELT.check - 12, 112, Z0 + 28]), b2 = iso([BELT.check + 12, 128, Z0 + 28]);
    ctx.fillStyle = css(ck.lamps[2] === 2 ? AMBER : GREEN, .12 * ck.beam); ctx.beginPath(); ctx.moveTo(...a1); ctx.lineTo(...b1); ctx.lineTo(...b2); ctx.closePath(); ctx.fill();
  }
  paint(dcyl(1006, 120, 9, Z0 + 96 - 30 - press * 22, 30, 18), {e, tone: press > .05 ? 'hi' : 'mid', acc: GREEN, g: press});
}
// Arena: three turntables behind low partitions (isolated builds); covers hide the names; the blind judge lamp checks each
// build against the same three pass/fail criteria (a row of lamps in front of each); B is recommended as the base and takes
// one idea each from A and C.
const CRIT = [[1, 0, 1], [1, 1, 1], [1, 1, 0]];
function drawArena(t) {
  const e = emphasis(t, 'arena'), u = local('c3', t), L = live('c3', t);
  paint(box(1196, 30, 178, 172, Z0, 8, 6, 1, 6), {e, tone: 'mid'});
  const judge = [[3, 3.6, 0], [3.6, 4.2, 1], [4.2, 4.8, 2]], win5 = sm((u - 5) / .4);
  for (const x of [1255, 1313]) paint(box(x - 1.5, 112, 3, 58, Z0 + 8, 16, .6), {e, tone: 'lo'});
  for (let j = 0; j < 3; j++) {
    const cx = 1226 + j * 58, cy = 140, rot = t * .6 + j;
    paint(cyl(cx, cy, 24, Z0 + 8, 6, 40), {e, tone: 'mid', acc: GREEN, g: j === 1 ? win5 * .8 : 0});
    const tk = k.radialTicks(cx, cy, 23, 24, 6, Z0 + 14, [1.5, 3], P, rot % 6.283); line(tk.minor, {e, tone: 'faint'});
    const built = sm((u - .7 - j * .7) / .3);
    if (built > 0) {
      const hts = [[12, 10], [16, 8, 10], [8, 14]][j]; let z = Z0 + 14;
      hts.forEach((h, q) => { paint(dyn(cx - 8 + q * 2, cy - 8, 14 - q * 2, 14, z, h * built, 1.5), {e, tone: 'hi', acc: GREEN, g: j === 1 ? win5 * .7 : .15}); z += h * built; });
      if (j !== 1 && u > 5.4) {
        const f = eio(clamp((u - 5.4 - (j ? .3 : 0)) / .8)), x = lerp(cx, 1284, f), zz = lerp(z, Z0 + 14 + 34 + (j ? 6 : 0), f) + Math.sin(Math.PI * f) * 30;
        paint(dyn(x - 4, cy - 4, 8, 8, zz, 5, 1), {e, tone: 'hi', acc: GREEN, g: .9});
      }
    }
    paint(box(cx - 12, 172, 24, 12, Z0 + 8, 2, 1), {e, tone: 'lo'});
    if (j === 1 && win5 > .5) faceText('B BASE', [cx - 10, 178, Z0 + 10], {size: 5.4, a: .95, e, col: GREEN}); else faceText('ABC'[j], [cx - 3, 178, Z0 + 10], {size: 7, a: .7, e});
    const cover = sm((u - 2.6) / .3) * (1 - sm((u - 4.9) / .3));
    if (cover > 0) paint(dyn(cx - 13, 171, 26 * cover, 14, Z0 + 10, 2, 1), {e, tone: 'mid'});
    // The criteria lamps: each lights pass (green) or fail (amber) as the judge checks it, and stays through the beat.
    for (let c = 0; c < 3; c++) {
      const lit = L ? sm((u - judge[j][0] - .1 - c * .15) / .1) : 0, ok = CRIT[j][c];
      paint(cyl(cx - 9 + c * 9, 192, 3, Z0 + 8, 2, 12), {e, tone: lit > .5 ? 'hi' : 'mid', acc: ok ? GREEN : AMBER, g: lit});
    }
  }
  paint(cyl(1286, 46, 6, Z0 + 8, 92, 18), {e, tone: 'mid'});
  let jx = 1284, bright = 0; for (const [a, b, j] of judge) if (u >= a && u < b) { jx = 1226 + j * 58; bright = sm((u - a) / .15) * (1 - sm((u - b + .1) / .15)); }
  if (u >= 4.8) { jx = 1284; bright = win5; }
  paint(dyn(1282, 46, 8, 70, Z0 + 96, 6, 2), {e, tone: 'mid'});
  faceText('JUDGE', [1278, 40, Z0 + 70], {size: 5, face: 'front', a: .5, e});
  if (bright > 0 && e > .5) {
    const a1 = iso([1286, 110, Z0 + 92]), b1 = iso([jx - 22, 140, Z0 + 14]), b2 = iso([jx + 22, 140, Z0 + 14]);
    ctx.fillStyle = css(CREAM, .07 * bright); ctx.beginPath(); ctx.moveTo(...a1); ctx.lineTo(...b1); ctx.lineTo(...b2); ctx.closePath(); ctx.fill();
  }
  paint(dcyl(1286, 112, 10, Z0 + 92, 10, 20), {e, tone: 'hi', acc: CREAM, g: bright * .6});
}
// Review gate: a PR card rides the track under an arch of reviewer lenses; you turn the /merge key; findings are checked,
// the confirmed ones fixed (a new commit), the whole card scanned again, CI lights, and the card squash-merges into main at
// the commit that was reviewed.
function gateScript(t) {
  const ug = local('g1', t), ux = local('x1', t), ur = local('res', t);
  const o = {key: 0, cards: [], ci: [0, 0], lens: AMBER, scan: 0, glow: 0};
  if (live('g1', t)) {
    o.key = sm((ug - 2) / .3);
    const x = ug < 2 ? lerp(1404, 1440, sm(ug / 1.2)) : ug < 2.6 ? lerp(1440, 1500, eio((ug - 2) / .6)) : ug < 7.8 ? 1500 : lerp(1500, 1676, eio((ug - 8.6) / .8));
    o.scan = Math.max(sm((ug - 2.6) / .3) * (1 - sm((ug - 3.8) / .3)), sm((ug - 6.4) / .3) * (1 - sm((ug - 7.6) / .3)));
    const fs = [0, 1, 2].map(j => ({show: sm((ug - 3 - j * .2) / .2), drop: j === 1 ? sm((ug - 4.3) / .4) : 0, fixed: j !== 1 ? sm((ug - 5.6 - j * .2) / .3) : 0}));
    o.cards.push({x, col: GREEN, fs, merged: ug > 9.4, hash: ug < 6.1 ? 'a3f9c1e' : 'b71e04d'});
    o.ci = [sm((ug - 7.9) / .3), sm((ug - 8.1) / .3)];
  }
  if (live('x1', t)) {
    // Codex (amber lenses) reviews Claude Code's card and catches one finding, fixed before it merges; then Claude (green
    // lenses) reviews the card Codex wrote and catches one, fixed too.
    const x1 = ux < .4 ? 1404 : ux < 1.6 ? lerp(1404, 1500, eio((ux - .4) / 1.2)) : ux < 2.7 ? 1500 : lerp(1500, 1676, eio((ux - 2.7) / .7));
    o.cards.push({x: x1, col: GREEN, fs: [{show: sm((ux - 1.8) / .15), drop: 0, fixed: sm((ux - 2.3) / .2)}], merged: ux > 3.3, hash: 'c58d2a0'});
    o.scan = Math.max(sm((ux - 1.6) / .2) * (1 - sm((ux - 2.5) / .2)), sm((ux - 4.7) / .2) * (1 - sm((ux - 6.2) / .2)));
    o.lens = ux < 3.6 ? AMBER : GREEN;
    if (ux > 3.2) { const x2 = ux < 4.2 ? lerp(1404, 1500, eio((ux - 3.2) / 1)) : ux < 6.3 ? 1500 : lerp(1500, 1676, eio((ux - 6.3) / .7));
      o.cards.push({x: x2, col: AMBER, fs: [{show: sm((ux - 5) / .15), drop: 0, fixed: sm((ux - 5.7) / .2)}], merged: ux > 7, hash: '9e04b7f'}); }
    o.ci = [sm((ux - 2.4) / .2) * (1 - sm((ux - 3.4) / .3)) + sm((ux - 6) / .2), sm((ux - 2.5) / .2) * (1 - sm((ux - 3.4) / .3)) + sm((ux - 6.1) / .2)];
  }
  if (live('x2', t)) { o.cards.push({x: 1452, col: GREEN, fs: [], merged: false, hash: '4d1e8b3'}); o.ci = [1, 1]; o.lens = CREAM; }
  if (ur >= 0) {
    // Results: #211 three rounds 2, 4, 0; #212 three reviewers, 0, CI on two systems; #214 the rule.
    o.lens = AMBER; o.res = ur;
    o.scan = [[.4, 1], [1.3, 1.9], [2.2, 2.8], [4.1, 4.9]].reduce((m, [a, b]) => Math.max(m, sm((ur - a) / .15) * (1 - sm((ur - b) / .2))), 0);
    o.ci = [sm((ur - 5.1) / .3), sm((ur - 5.3) / .3)];
  }
  if (live('close', t)) o.glow = sm((nloc('close', t) - 2.6) / .4);
  return o;
}
function drawGate(t) {
  const e = emphasis(t, 'gate'), s = gateScript(t);
  paint(box(1400, 118, 290, 44, Z0, 6, 4, .6), {e, tone: 'mid'});
  for (let j = 0; j < 14; j++) line(k.lineOnTop([1408 + j * 20, 122], [1408 + j * 20, 158], Z0 + 6, P), {e, tone: 'faint'});
  paint(cyl(1600, 70, 5, Z0, 74, 16), {e, tone: 'mid'});
  for (let j = 0; j < 2; j++) paint(cyl(1600, 70, 9, Z0 + 74 + j * 16, 12, 20), {e, tone: 'hi', acc: GREEN, g: s.ci[j]});
  faceText('CI', [1612, 78, Z0 + 92], {size: 6, face: 'front', a: .55, e});
  paint(cyl(1500, 104, 6, Z0, 116, 18), {e, tone: 'mid'});
  paint(box(1494, 96, 12, 88, Z0 + 116, 10, 2, .6), {e, tone: 'mid'});
  faceText('REVIEW', [1496, 186, Z0 + 124], {size: 4.6, face: 'front', a: .5, e});
  for (let j = 0; j < 3; j++) {
    const y = 116 + j * 24, lc = s.glow ? (j === 1 ? GREEN : AMBER) : s.lens;
    paint(dcyl(1500, y, 7, Z0 + 100, 16, 18), {e, tone: 'hi', acc: lc, g: .4 + Math.max(s.scan, s.glow) * .6});
    if (s.scan > 0 && e > .5) {
      const a1 = iso([1500, y, Z0 + 100]), b1 = iso([1478, y - 8, Z0 + 12]), b2 = iso([1522, y + 8, Z0 + 12]);
      ctx.fillStyle = css(s.lens, .09 * s.scan); ctx.beginPath(); ctx.moveTo(...a1); ctx.lineTo(...b1); ctx.lineTo(...b2); ctx.closePath(); ctx.fill();
    }
  }
  let stackZ = Z0 + 6; const stackN = mergedCount(t);
  for (let j = 0; j < stackN; j++) { paint(box(1650, 122, 46, 36, stackZ, 3, 2), {e, tone: 'mid'}); stackZ += 3.6; }
  faceText('main', [1654, 160, Z0 + 5], {size: 5, face: 'front', a: .6, e});
  for (const c of s.cards) {
    if (c.merged) continue;
    paint(dyn(c.x - 23, 122, 46, 36, Z0 + 6, 4, 2, .5), {e, tone: 'hi', acc: c.col, g: .45});
    for (let r = 0; r < 4; r++) line(k.lineOnTop([c.x - 18, 128 + r * 6], [c.x - 18 + 14 + ((r * 13) % 20), 128 + r * 6], Z0 + 10.2, P), {e, tone: 'mid'});
    faceText(c.hash, [c.x - 18, 154, Z0 + 10.2], {size: 4.4, a: .7, e, col: c.col});
    c.fs.forEach((f, j) => {
      if (f.show <= 0) return; const fx = c.x + 4 + j * 6, fy = 132 + j * 7, gone = f.drop;
      const col = f.fixed > .5 ? GREEN : AMBER, a = f.show * (1 - f.fixed) * (1 - gone);
      if (a > .01) { dot([fx, fy, Z0 + 10.4 + (gone ? -gone * 20 : 0)], 3.2, col, a); spark([fx, fy, Z0 + 11], 12, col, .5 * a); }
      if (gone > 0 && gone < 1) dot([fx + gone * 18, fy + gone * 30, Z0 + 10 - gone * 18], 2.6, CREAM, .5 * (1 - gone));
    });
  }
  paint(cyl(1500, 176, 6, Z0, 116, 18), {e, tone: 'mid'});
  paint(box(1428, 196, 22, 22, Z0, 40, 2, .6), {e, tone: 'mid'});
  paint(cyl(1439, 207, 6, Z0 + 40, 4, 18), {e, tone: 'hi', acc: GREEN, g: s.key * .8});
  const ka = -.8 + s.key * 1.6; line(k.lineOnTop([1439 - Math.cos(ka) * 6, 207 - Math.sin(ka) * 6], [1439 + Math.cos(ka) * 6, 207 + Math.sin(ka) * 6], Z0 + 44.2, P), {e, col: s.key > .5 ? GREEN : CREAM, a: .95, w: 2.2});
  faceText('/merge', [1430, 218, Z0 + 30], {size: 4.6, face: 'front', a: .65, e});
}
function mergedCount(t) {
  let n = 0;
  if (t > at('g1', 9.4)) n++;
  if (t > at('x1', 3.3)) n++;
  if (t > at('x1', 7)) n++;
  return n;
}
// Reader behind the gate (/refine weekly): a week of session strips feed a drum; this week's correction count grows as an
// amber bar; the previous four runs rise beside it and a trend line joins them; proposed edits pass an evidence gate (one is
// turned back); one pull request rides the return pipe to the PR slot by the drawers, where it waits for you to review it.
function drawBack(t) {
  const e = emphasis(t, 'back'), n = nloc('i1', t), M = B.i1.S, L = live('i1', t);
  paint(box(1560, -38, 90, 52, Z0, 30, 4, 1), {e, tone: 'mid'});
  paint(dcyl(1605, -12, 16, Z0 + 30, 12, 28), {e, tone: 'hi', acc: GREEN, g: L && n > .3 && n < M.how + 1.6 ? .6 : 0});
  faceText('/refine weekly', [1566, 16, Z0 + 18], {size: 4.8, face: 'front', a: .6, e});
  // The return pipe's evidence gate, just behind the reader
  paint(box(1626, -56, 4, 24, Z0 + 4, 26, .8), {e, tone: 'mid'}); paint(box(1626, -56, 4, 24, Z0 + 30, 3, .8), {e, tone: 'mid', acc: GREEN, g: L ? win(n, M.how + .4, M.how + 2.4) * .8 : 0});
  // The PR slot by the drawers
  const ed = emphasis(t, 'drawers');
  paint(box(604, 206, 30, 26, Z0, 20, 2, .6), {e: ed, tone: 'mid'});
  faceText('PR', [612, 232, Z0 + 12], {size: 5.4, face: 'front', a: .65, e: ed});
  if (!L) return;
  for (let j = 0; j < 5; j++) { const f = ((n * .6 + j * .2) % 1); if (n > .3 && n < M.ans + .4) paint(dyn(1660 + 50 * (1 - f), -26, 18, 26, Z0 + 30 + 2, 1.5, 1), {e, tone: 'hi', alpha: Math.sin(Math.PI * f)}); }
  // The trend: a panel raised over the reader, four earlier runs (cream) and this week (amber), joined by a line
  const pin = sm(n / .5), PZ = Z0 + 58;
  paint(cyl(1640, -24, 2.5, Z0 + 30, 30, 12), {e, tone: 'mid', alpha: pin});
  paint(box(1580, -30, 104, 4, PZ, 58, 1.5), {e, tone: 'mid', alpha: pin});
  faceText('TREND · 5 RUNS', [1584, -26, PZ + 52], {size: 5, face: 'front', a: .7 * pin, e});
  const H = [14, 19, 16, 22, 34];
  for (let j = 0; j < 5; j++) {
    const now = j === 4, h = now ? H[4] * sm((n - .5) / (M.ans - .5)) : H[j] * sm((n - M.ans - .2 - j * .3) / .3);
    if (h > .3) paint(dyn(1590 + j * 18, -27, 11, 3, PZ + 6, h, .6), {e, tone: 'hi', acc: now ? AMBER : CREAM, g: now ? .8 : .2});
  }
  const tr = sm((n - M.ans - 1.5) / .4);
  if (tr > 0) { const pts = H.map((h, j) => iso([1595.5 + j * 18, -23.5, PZ + 6 + h + 4])); ctx.lineWidth = 1.8 / ZOOM; ctx.strokeStyle = css(AMBER, .95 * tr); glow(AMBER, .6 * tr);
    ctx.beginPath(); pts.forEach((p, j) => j ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.stroke(); noGlow(); }
  // Proposed edits meet the evidence gate: the first passes, the second is turned back
  for (let j = 0; j < 2; j++) { const a = M.how + .3 + j * .7, f = clamp((n - a) / .8); if (f <= 0) continue;
    if (j === 0) { if (f < 1) card(arc([1605, -12, Z0 + 42], [1628, -44, Z0 + 14], eio(f), 16), 10, 8, {e}); }
    else { const back = clamp((n - a - .8) / .6), p = f < 1 ? arc([1605, -12, Z0 + 42], [1622, -44, Z0 + 14], eio(f), 16) : [lerp(1622, 1600, back), lerp(-44, -20, back), Z0 + 14 - 14 * back];
      if (back < 1) card(p, 10, 8, {e, col: AMBER, alpha: 1 - back}); } }
  // The one pull request rides the pipe to the PR slot and waits there for you
  const go = M.how + 1.9, arrive = M.why + 1.4;
  if (n > go) {
    const f = clamp((n - go) / (arrive - go)), seg = 1032 + 258, d = eio(f) * seg;
    let x, y; if (d < 1032) { x = 1650 - d; y = -44; } else { x = 618; y = -44 + (d - 1032); }
    const wait = sm((n - arrive) / .3), z = lerp(Z0 + 12, Z0 + 21, wait);
    paint(dyn(x - 11, y - 7, 22, 14, z, 1.5, 1), {e: 1, tone: 'hi', acc: AMBER, g: .7 + .3 * wait * (.5 + .5 * Math.sin(t * 3))});
    if (wait > 0) faceText('1 PR', [x - 9, y, z + 1.7], {size: 4.6, a: .9 * wait, e: 1, col: AMBER});
  }
}

// ---- dust: seeded motes drifting across the whole stage (screen space)
const DUST = []; { const r = mulberry(29); for (let i = 0; i < 420; i++) DUST.push([r(), r(), r(), r()]); }
function drawDust(t, k0) {
  for (const [a, b, c, d] of DUST) {
    const x = ((a * 2200 + t * (6 + c * 16)) % 2200) - 140, y = b * 1180 - 50 + Math.sin(t * .2 + d * 6.3) * 18;
    const al = (.05 + .16 * d * d) * (.7 + .3 * Math.sin(t * 1.3 + c * 40)) * k0;
    ctx.fillStyle = css(d > .9 ? GREEN : CREAM, al); ctx.fillRect(x, y, 1.6 + c * 1.4, 1.6 + c * 1.4);
  }
}
function drawCorners() {
  ctx.strokeStyle = css(CREAM, .18); ctx.lineWidth = 1;
  for (const [x, y, sx, sy] of [[48, 48, 1, 1], [W - 48, 48, -1, 1], [48, H - 48, 1, -1], [W - 48, H - 48, -1, -1]]) { ctx.beginPath(); ctx.moveTo(x, y + sy * 22); ctx.lineTo(x, y); ctx.lineTo(x + sx * 22, y); ctx.stroke(); }
}

// ---- one frame
function frame(t, view) {
  const {w, h, d} = view; DPR = d;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = css(INK); ctx.fillRect(0, 0, w, h);
  const s = view.s, ox = view.ox, oy = view.oy;
  ctx.setTransform(s * d, 0, 0, s * d, ox * d, oy * d);
  drawDust(t, 1);
  const [cx, cy, cz, z, fx, fy] = camera(t), c = iso([cx, cy, cz]); ZOOM = z * s;
  // Assembly in the opening: the machine fades up from the dust over the first seconds.
  const up = sm((local('open', t) - 3.7) / 1.8);
  ctx.save(); ctx.globalAlpha = 1; ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-c[0], -c[1]);
  ZOOM = z * s;
  GA = up; ctx.globalAlpha = up;
  drawBench(t); drawRailBack(t); for (const h of ['cx', 'cc2', 'cc']) drawCarriage(h, t);
  drawPipe(t);
  drawKernel(t); drawRack(t); drawDrawers(t); drawBack(t); drawPlan(t); drawLine(t); drawArena(t); drawGate(t);
  // You: at the desk (each answer and GO in p1, starting the run in p2), at the gate (/merge, merging, deciding the open
  // /coordinate item, the final yes) and by the PR slot (reviewing the /refine PR).
  const n1 = nloc('p1', t), P1 = B.p1.S, n2 = nloc('p2', t), ux = local('x1', t), cut = id => live(id, t) ? 1 : 0;
  const desk = cut('p1') * Math.max(...p1Asks().map(a => win(n1, a + .5, a + 1.4)), win(n1, P1.why + 2, 99)) + cut('p2') * win(n2, .3, 2);
  const gate = Math.max(cut('g1') * win(local('g1', t), 1.8, 3.6), cut('open') * win(local('open', t), 9.4, 99), cut('x1') * Math.max(win(ux, 2.5, 3.5), win(ux, 6.2, 99)),
    cut('x2') * win(nloc('x2', t), B.x2.S.why + 1.9, 99), cut('close') * sm((nloc('close', t) - 3.6) / .4));
  person([744, 300, 0], {e: emphasis(t, 'plan'), lit: desk});
  person([1452, 300, 0], {e: emphasis(t, 'gate'), lit: gate});
  person([660, 290, 0], {e: emphasis(t, 'drawers'), lit: cut('i1') * win(nloc('i1', t), B.i1.S.why + 1.6, 99)});
  for (const h of ['cx', 'cc2', 'cc']) drawArm(h, t);
  ctx.restore();
  GA = 1; ctx.globalAlpha = 1;
  // Scrim under the copy: the left column in quote, extra and results beats, wider in the opening, an even
  // dim behind the centred statements.
  const sb = beatAt(t), prevB = BEATS[BEATS.indexOf(sb) - 1], f = sm((t - sb.start) / .8);
  const kind = b => !b ? null : b.kind === 'open' ? 'wide' : b.kind === 'mid' || b.kind === 'close' ? 'mid' : 'left';
  for (const [kb, a] of [[kind(prevB), 1 - f], [kind(sb), f]]) {
    if (!kb || a <= 0) continue;
    if (kb === 'mid') { ctx.fillStyle = css(INK, .55 * a); ctx.fillRect(0, 0, W, H); continue; }
    const wd = kb === 'wide' ? 1700 : 1150, lg = ctx.createLinearGradient(0, 0, wd, 0);
    lg.addColorStop(0, css(INK, .9 * a)); lg.addColorStop(.62, css(INK, .66 * a)); lg.addColorStop(1, css(INK, 0)); ctx.fillStyle = lg; ctx.fillRect(0, 0, wd, H);
  }
  drawCorners();
  // vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * 1.05); vg.addColorStop(0, 'rgba(15,18,16,0)'); vg.addColorStop(1, 'rgba(8,10,9,.75)');
  ctx.fillStyle = vg; ctx.fillRect(-200, -200, W + 400, H + 400);
}

// ---- captions: one layer per beat, built from the beat table; each element has data-at (seconds into the beat)
function captionHTML() {
  const words = s => s.split(/(\s+)/).map(w => /\s+/.test(w) ? w : `<span class="w">${w}</span>`).join('');
  const el = it => it && !it.ro ? `<${it.tag} class="${it.cls}" data-at="${it.at.toFixed(2)}"${it.until != null ? ` data-until="${it.until.toFixed(2)}"` : ''}${it.label ? ' data-label' : ''}${it.words ? ' data-words' : ''}>${it.words ? words(it.html) : it.html}</${it.tag}>` : '';
  const out = [];
  for (const b of BEATS) {
    const I = Object.fromEntries(b.items.map(it => [it.k, it])), E = k => el(I[k]);
    let h = '';
    if (b.kind === 'quote') h += `<div class="pf-copy pf-grp pf-grp-rec">${E('rl')}${E('rec')}${E('q')}${E('who')}</div>
      <div class="pf-answer pf-grp pf-grp-hf">${E('hl')}${E('tag')}${E('ans')}${E('how')}${E('why')}</div>`;
    else if (b.kind === 'x') h += `<div class="pf-answer pf-answer-x pf-grp pf-grp-hf">${E('xl')}${E('tag')}${E('ans')}${E('how')}${E('why')}</div>`;
    else if (b.kind === 'open') h += `<div class="pf-say-grp">${E('s1')}${E('s2')}${E('s3')}</div><div class="pf-open">${E('o0')}<div class="pf-rows">${[1, 2, 3].map(j => E(`o${j}p`) + E(`o${j}a`)).join('')}</div>${E('o4')}</div>${E('o6')}`;
    else h += `<div class="pf-stmt pf-${b.kind}">${b.items.map(el).join('')}</div>`;
    h += `<p class="pf-readout" data-readout></p>`;
    out.push(`<div class="pf-beat" data-beat="${b.id}">${h}</div>`);
  }
  return out.join('');
}
// Live readout, bottom right: the deck's readouts for the beat, each from its reveal time, when the machine
// shows that state.
function readout(t) {
  const b = beatAt(t), u = t - b.start; let r = '';
  for (const it of b.items) if (it.ro && u >= it.at) r = it.html;
  return r;
}
// /coordinate: the two chats exchange claims, read the PR diff, CI and main, then trade a numbered verdict per item: 1 agree,
// 2 disagree (the PR diff says otherwise), 3 agree. Item 2 is still open after a second exchange, so it goes to you.
function drawCoordinate(t) {
  if (!live('x2', t)) return;
  const n = nloc('x2', t), X = B.x2.S, a = headAt('cc', t), b = headAt('cc2', t); if (!a || !b || b[3] < .5) return;
  const tipA = [a[0], a[1], a[2] - 2], tipB = [b[0], b[1], b[2] - 2];
  // Claims cross between the chats
  for (let j = 0; j < 4; j++) { const f = clamp((n - X.ans - .2 - j * .4) / .6); if (f > 0 && f < 1) { const [p, q] = j % 2 ? [tipB, tipA] : [tipA, tipB]; spark(arc(p, q, f, 40), 16, CREAM, .8); } }
  // Each reads the sources itself: the PR diff, CI, main
  const SRC = [[1452, 140, Z0 + 10], [1600, 70, Z0 + 92], [1673, 140, Z0 + 18]];
  SRC.forEach((s, j) => { for (const h of [tipA, tipB]) { const f = clamp((n - X.how - .15 - j * .7) / .6); if (f > 0 && f < 1) spark(arc(s, h, f, 20), 15, GREEN, .85); } });
  // Verdicts: [item, from A?, time, agree]
  const V = [[1, 1, X.how + 2.2, 1], [2, 1, X.ro0 - .6, 0], [3, 1, X.ro0 + .3, 1], [2, 0, X.why + .2, 0]];
  const park = k => [1526, 50 + k * 32, Z0 + 150];
  const show = {};
  for (const [k, fromA, t0, ok] of V) { const f = clamp((n - t0) / .6); if (f <= 0) continue;
    const p = f < 1 ? arc(fromA ? tipA : tipB, park(k), eio(f), 30) : park(k); show[k] = {p, ok}; }
  // Item 2 after its second exchange: to you, at the gate
  const down = clamp((n - X.why - 1.1) / 1);
  if (show[2] && down > 0) show[2].p = arc(park(2), [1452, 290, 96], eio(down), 20);
  for (const [k, {p, ok}] of Object.entries(show)) {
    paint(dyn(p[0] - 12, p[1] - 12, 24, 24, p[2], 3, 2), {e: 1, tone: 'hi', acc: ok ? GREEN : AMBER, g: .9});
    faceText(k, [p[0] - 4, p[1] + .5, p[2] + 3.1], {size: 14, a: .95, e: 1, col: ok ? GREEN : AMBER});
  }
  // While item 2 is open, a beam from the PR diff to its chip
  const beam = win(n, X.ro0 - .2, X.why + 1.1); if (beam > .01 && show[2]) line(k.segment(SRC[0], show[2].p, P), {e: 1, col: AMBER, a: .7 * beam, w: 1.4, g: .5 * beam});
}

// ---- mount
function mount(root) {
  const stage = root.querySelector('.pf-stage'), canvas = root.querySelector('.pf-canvas'), ov = root.querySelector('.pf-ov');
  const playBtn = root.querySelector('.pf-play'), timeEl = root.querySelector('.pf-time'), range = root.querySelector('.pf-scrub'), ticks = root.querySelector('.pf-ticks');
  ctx = canvas.getContext('2d');
  headKeys();
  ov.innerHTML = captionHTML();
  const layers = [...ov.querySelectorAll('.pf-beat')].map(el => ({el, b: B[el.dataset.beat], items: [...el.querySelectorAll('[data-at]')].map(n => ({n, a: +n.dataset.at, until: n.dataset.until ? +n.dataset.until : null, words: n.hasAttribute('data-words') ? [...n.querySelectorAll('.w')] : null})), ro: el.querySelector('[data-readout]'), grps: [...el.querySelectorAll('.pf-grp')].map(g => ({g, first: g.querySelector('[data-at]')}))}));
  for (const b of BEATS) if (b.kind === 'quote' || b.kind === 'x' || b.id === 'res') { const i = document.createElement('i'); i.style.left = b.start / TOTAL * 100 + '%'; ticks.append(i); }
  const view = {w: 1, h: 1, d: 1, s: 1, ox: 0, oy: 0};
  let t = 0, state = 'idle', raf = 0, last = 0, onScreen = true, scrubbing = false;
  const fmt = x => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
  function paintCaptions(t) {
    const b = beatAt(t);
    for (const L of layers) {
      const u = t - L.b.start, on = t >= L.b.start - .01 && t < L.b.start + L.b.dur;
      if (!on) { if (L.vis) { L.el.style.opacity = 0; L.vis = false; } continue; }
      L.vis = true; const out = 1 - sm((u - (L.b.dur - .5)) / .5); L.el.style.opacity = L.b.id === 'close' ? 1 : out;
      for (const it of L.items) {
        let o = sm((u - it.a) / .5); if (it.until != null) o *= 1 - sm((u - it.until) / .4);
        it.o = o; it.n.style.opacity = o; it.n.style.transform = it.words ? '' : `translateY(${(1 - eo((u - it.a) / .6)) * 10}px)`;
        if (it.words) it.words.forEach((w, j) => { const p = eo((u - it.a - j * .035) / .5); w.style.opacity = p; w.style.transform = `translateY(${(1 - p) * 14}px)`; });
      }
      // A group's rule fades in with its first line.
      for (const G of L.grps) G.g.style.setProperty('--ga', (L.items.find(it => it.n === G.first)?.o ?? 1).toFixed(3));
      if (L.ro) L.ro.textContent = readout(t);
    }
    root.dataset.beat = b.id;
  }
  function draw() {
    frame(Math.min(t, TOTAL - .001), view);
    // Extra layers drawn in world space after the frame: the /coordinate chips.
    const [cx, cy, cz, z, fx, fy] = camera(t), c = iso([cx, cy, cz]);
    ctx.setTransform(view.s * view.d, 0, 0, view.s * view.d, view.ox * view.d, view.oy * view.d);
    ctx.save(); ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-c[0], -c[1]); drawCoordinate(t); ctx.restore();
    paintCaptions(Math.min(t, TOTAL - .001));
    timeEl.textContent = `${fmt(Math.min(t, TOTAL))} / ${fmt(TOTAL)}`;
    if (!scrubbing) range.value = Math.round(Math.min(t, TOTAL) / TOTAL * 1000);
    range.style.setProperty('--p', range.value / 1000);
  }
  const running = () => state === 'playing' && onScreen && !document.hidden;
  function setState(s) { state = s; root.dataset.state = s; playBtn.textContent = s === 'playing' ? 'Pause' : s === 'ended' ? 'Replay' : 'Play'; }
  function tick(now) {
    raf = 0; const dt = last ? Math.min(.1, (now - last) / 1000) : 1 / 60; last = now;
    if (running()) { t += dt; if (t >= TOTAL) { t = TOTAL; setState('ended'); } }
    draw();
    if (running()) raf = requestAnimationFrame(tick); else last = 0;
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };
  function play() { if (t >= TOTAL) t = 0; setState('playing'); wake(); }
  function pause() { setState('paused'); wake(); }
  function seek(x) { t = clamp(x, 0, TOTAL); if (state === 'ended' && t < TOTAL) setState('paused'); draw(); }
  playBtn.addEventListener('click', () => state === 'playing' ? pause() : play());
  range.addEventListener('input', () => seek(range.value / 1000 * TOTAL));
  range.addEventListener('pointerdown', () => { scrubbing = true; });
  addEventListener('pointerup', () => { scrubbing = false; });
  stage.addEventListener('click', () => playBtn.click());
  stage.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); playBtn.click(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); seek(t + 5); } else if (e.key === 'ArrowLeft') { e.preventDefault(); seek(t - 5); }
  });
  const layout = () => {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w) return;
    const s = Math.min(w / W, h / H), ox = (w - W * s) / 2, oy = (h - H * s) / 2, d = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * d); canvas.height = Math.round(h * d);
    Object.assign(view, {w: canvas.width, h: canvas.height, d, s, ox, oy});
    ov.style.left = ox + 'px'; ov.style.top = oy + 'px'; ov.style.transform = `scale(${s})`;
    draw();
  };
  new ResizeObserver(layout).observe(stage);
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (running()) wake(); }, {threshold: 0}).observe(stage);
  document.addEventListener('visibilitychange', () => { if (running()) { last = 0; wake(); } });
  const q = new URLSearchParams(location.search);
  setState('idle');
  document.fonts.ready.then(() => {
    layout();
    if (q.has('t')) seek(+q.get('t'));
    else if (!q.has('still') && !matchMedia('(prefers-reduced-motion: reduce)').matches) play();
  });
  window.promoFilm = {seek, frame: x => { seek(x); }, play, pause, TOTAL, BEATS: BEATS.map(({id, start, dur}) => ({id, start, dur})), get t() { return t; }};
}

const root = document.getElementById('promo');
if (root) mount(root);
