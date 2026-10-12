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
// f4, c1 and x3 are choreographed directly in beat seconds from the caption schedule: an identity warp.
const BEAT_SECONDS = (S, d) => [[0, 0], [d, d]];
const extra = o => ({kind: 'x', order: ['xl', 'tag', 'ans', 'how', 'why', 'ro0'], ...o});
const BEATS = [
  {id: 'open', od: 11, kind: 'open', lead: .6, lines: [
    ['s1', 'pf-say', 'Harness Firmware aims to solve the spikiness of agent quality by steering them to work better than they normally would through reliable and repeatable methods', 1],
    ['s2', 'pf-say', 'Models have basically solved code. They haven’t solved reliable verification', 1],
    ['s3', 'pf-say', 'Harness Firmware is an ongoing engineering project to attack that bottleneck', 1, 1],
    ['o0', 'pf-sub', 'Harness Firmware · Claude Code + Codex repo template'],
    ['o1p', 'pf-was', 'Agent forgets'], ['o1a', 'pf-now', 'Repo keeps lessons', 1],
    ['o2p', 'pf-was', 'Agent grades itself'], ['o2a', 'pf-now', 'Other company’s model reviews every PR', 1],
    ['o3p', 'pf-was', 'Agent loses long jobs'], ['o3a', 'pf-now', 'Plan on disk', 1],
    ['o4', 'pf-big', 'You give final <em>yes</em>', 1],
    ['o6', 'pf-fine', 'No speaker reviewed or endorsed Harness Firmware']],
    // The statement reads over the dust; the machine assembles as the tagline comes up.
    warp: S => [[0, 2], [S.o0, 3.4], [S.o1p, 4.5], [S.o2p, 6.1], [S.o3p, 7.7], [S.o4, 9.3]]},
  quote({id: 'f1', od: 6.5, rec: 'Define agent rules and policies once',
    q: '“Define your guardrails, your agents, your docs, testing policies, really governance just one time”', who: 'Davis Palmie · Factory',
    tag: 'CLAUDE.md and AGENTS.md', ans: 'Project rules written once, loaded every <em>chat</em>', how: 'Claude Code reads CLAUDE.md; Codex reads AGENTS.md',
    why: 'You stop re-explaining your project', ro: ['CHAT 3 · SAME RULES LOADED'], warp: S => [[0, 0], [S.ro0, 5.05]]}),
  quote({id: 'f2', od: 4.5, rec: 'Give agent only what task needs', q: '“Don’t pass everything to the agent.”', who: 'Elizabeth Fuentes Leone · AWS',
    tag: 'Skills', ans: 'Skills: step-by-step guides, loaded only when <em>needed</em>', how: 'Each turn sees name + description; full guide loads when used',
    why: 'Many guides, context stays small', ro: ['IDLE · ONE LINE EACH', 'CALLED · FULL GUIDE LOADED'],
    order: ['rl', 'rec', 'q', 'who', 'hl', 'tag', 'ro0', 'ans', 'how', 'ro1', 'why'], warp: S => [[0, 0], [S.ro0, .9], [S.ro1 - .5, 1.5], [S.ro1 + .3, 2.4]]}),
  quote({id: 'f3', od: 7, rec: 'Write down unwritten project rules',
    q: '“When you join a new company there are a lot of rules that are not really codified anywhere.”', who: 'Tereza Tížková · Factory',
    tag: '/recall and pitfalls.md', ans: 'Agent writes project <em>lessons</em> into repo', how: 'Mistake you correct → pitfalls.md; /recall save → reference files',
    why: 'Later chats read lessons, avoid known mistakes', warp: S => [[0, 0], [S.tag, 1.2], [S.ans, 2.3], [S.how, 3.6], [S.why, 4.6]]}),
  quote({id: 'f4', od: 6.5, rec: 'Don’t bet on one AI model', q: '“It’s best to be agnostic for everyone.”', who: 'Tereza Tížková · Factory',
    tag: 'Claude Code + Codex', ans: 'Claude Code and Codex share project <em>notes</em>', how: 'Both read .claude/reference; most skills have Codex versions',
    why: 'Switch tools; rules and lessons stay', ro: ['CODEX JOINS · READS AGENTS.md'],
    order: ['rl', 'rec', 'q', 'who', 'hl', 'tag', 'ro0', 'ans', 'how', 'why'], warp: BEAT_SECONDS}),
  quote({id: 'p1', od: 8, rec: 'Show engineers every choice to make',
    q: '“The danger is that the engineer never noticed that there was a choice to make.”', who: 'Gabriel Martinez · G2i',
    tag: '/deep-plan', ans: 'Agent finds facts, you make <em>choices</em>', how: 'Each choice comes with recommendation; build waits for Go',
    why: 'Open choices reach you before build', ro: ['GO · PICKED BY YOU'], warp: S => [[0, 0], [S.ans, 1], [S.how, 4.3], [S.why, 5.8], [S.ro0, 7.1]]}),
  quote({id: 'p2', od: 7, rec: 'Let agents run long jobs alone',
    q: '“We don’t need a human to be shepherding this agent through every single step”', who: 'Ryan Cooke · WorkOS',
    tag: '/long-horizon', ans: 'You start it; plan saved to <em>disk</em>', how: 'Fresh agent per step, another runs prewritten checks',
    why: 'Only passed steps count; resumes from file', ro: ['CHAT FULL → RESUMED FROM FILE']}),
  quote({id: 'c1', od: 5.6, rec: 'Check agent work against real state',
    q: '“The agents will often overconfidently claim that they did something when in fact they did not do it.”', who: 'Miguel · Browserbase and Corby · Microsoft',
    tag: '/long-horizon', ans: 'Separate agent checks each <em>step</em>', how: 'Checks written first; checker never reads worker’s report',
    why: 'DONE counts only when checks pass', ro: ['CHECKER · FAIL · NOT COUNTED'], warp: BEAT_SECONDS}),
  quote({id: 'c3', od: 7, rec: 'Compare several versions side by side', q: '“Side-by-side comparison becomes the next evolution of the eval cycle”',
    who: 'Hussein · Braintrust', tag: '/arena', ans: 'Agents build several versions <em>separately</em>', how: 'Judge scores them blind against same criteria',
    why: 'Strongest kept, plus others’ best ideas', warp: (S, d) => [[0, 0], [S.ans, .5], [S.how, 2.6], [S.why, 4.9], [d - .5, 6.6]]}),
  quote({id: 'g1', od: 10.5, rec: 'Run expensive checks once per PR', q: '“Expensive things you want to run once when the PR goes up.”', who: 'Dru Knox · Tessl',
    tag: '/merge', ans: 'Codex reviews every PR before <em>merge</em>', how: 'You type /merge → confirmed findings fixed, whole diff re-reviewed',
    why: 'Merges only after clean review, passing CI', ro: ['MERGED AT REVIEWED COMMIT'], warp: S => [[0, 0], [S.ans, 1.4], [S.how, 2.3], [S.why, 7], [S.ro0, 9.45]]}),
  quote({id: 'i1', od: 8, rec: 'Find requests users keep repeating', q: '“Prompting my agent for the same request over and over again”', who: 'Hussein · Braintrust',
    tag: '/refine weekly', ans: 'Repeated corrections → rule edits in one <em>PR</em>', how: 'Counts corrections across week of chats, PR comments',
    why: 'Rules change only when you merge it', ro: ['ONE PR · WAITING FOR YOU'], warp: S => [[0, 0], [S.ans, .3], [S.how, .9], [S.why, 3.2], [S.ro0, 6.45]]}),
  {id: 'x0', od: 2.5, kind: 'mid', lines: [['x0a', 'pf-sub', 'No talk covered these'], ['x0b', 'pf-big', 'Three more things Harness Firmware <em>does</em>', 1]]},
  extra({id: 'x1', od: 7.6, xl: 'More · 1 of 3', tag: 'Cross-company review', ans: 'Other company’s AI reviews every <em>PR</em>',
    how: 'OpenAI’s Codex reviews Claude Code PRs; Anthropic’s Claude reviews Codex’s', why: 'Can catch what author’s model misses', ro: ['YOU MERGE OR TYPE /merge'],
    warp: S => [[0, 0], [S.ans, .4], [S.why, 4.2], [S.ro0, 6.9]]}),
  extra({id: 'x2', od: 5.6, xl: 'More · 2 of 3', tag: '/coordinate', ans: 'You name second Claude Code <em>chat</em>',
    how: 'They check each other’s claims against PR, CI, main', why: 'Other chat never approves for you', ro: ['AGREED · WHO DOES WHAT'],
    warp: S => [[0, 0], [S.ans, .2], [S.how, 1.1], [S.ro0, 4.2]]}),
  extra({id: 'x3', od: 4.6, xl: 'More · 3 of 3', tag: 'Codex skill sync', ans: 'CI flags Codex skills lagging <em>behind</em>',
    how: 'Each skill: Codex version or marked Claude-only; checked every push', why: 'Fixes can’t silently skip Codex', ro: ['CI · ONE CODEX SKILL BEHIND'], warp: BEAT_SECONDS}),
  {id: 'res', od: 9.5, kind: 'res', lines: [['r0', 'pf-eye', 'Results'],
    ['r1', 'pf-fig', 'Harness-Firmware #211 · 3 Codex reviews: 2 findings → 4 → <em>none</em>, all fixed', 1],
    ['r2', 'pf-fig', '#212 · 3 Codex reviewers, zero findings, CI passed', 1], ['r3', 'pf-fig', '#214 · cross-company review became rule for every PR', 1]],
    warp: S => [[0, 0], [S.r1, .3], [S.r2, 3.9], [S.r3, 6]]},
  {id: 'close', od: 6.5, kind: 'close', lines: [['c0', 'pf-big', 'Lessons kept · other company’s model reviews every PR · your final <em>yes</em>', 1],
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
  [at0('f1', 1), ...camAt('kernel', 1.95)], [at0('f2', 1), ...camAt('rack')], [at0('f3', 1), ...camAt('drawers', 1.75, 1260, 580)],
  [at0('f4', 1), 330, 90, 60, 1.2, 1240, 640], [at0('p1', 1), ...camAt('plan', 1.85)], [at0('p2', 1), 960, 120, 50, 1.55, 1270, 620],
  [at0('c1', 1), ...camAt('line', 1.8)], [at0('c3', 1), ...camAt('arena', 1.9)], [at0('g1', 1), ...camAt('gate', 1.8)],
  [at0('i1', 1), 1560, -10, 40, 1.8, 1260, 640], [at('i1', 2.6), 1560, -10, 40, 1.8, 1260, 640], [at('i1', 6.4), 680, 80, 40, 1.5, 1260, 600],
  [at0('x0', .6), ...FULL], [at0('x1', 1), ...camAt('gate', 1.8)], [at0('x2', 1), 1000, 80, 80, 1.7, 1400, 620],
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
const lp = d => { let o = lineCache.get(d); if (!o) { o = new Path2D(d); lineCache.set(d, o); } return o; };

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
const OPEN_FOCUS = [['drawers', 'kernel'], ['gate', 'cx'], ['line', 'cc']];
const FOCUS = {open: null, f1: ['kernel', 'cc'], f2: ['rack', 'cc'], f3: ['drawers', 'cc'], f4: ['kernel', 'rack', 'drawers', 'cc', 'cx'], p1: ['plan', 'cc'],
  p2: ['line', 'plan', 'cc'], c1: ['line', 'cc'], c3: ['arena', 'cc'], g1: ['gate', 'cc', 'cx'], i1: ['back', 'drawers', 'gate'], x0: null, x1: ['gate', 'cc', 'cx'],
  x2: ['plan', 'line', 'cc', 'cc2'], x3: ['rack', 'cx'], res: ['gate', 'cx'], close: null};
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
  const S4 = B.f4.S, SX = B.x2.S;
  const park = (h, id, u, x) => K(h, id, u, x, -20, 140, 1);
  // Claude Code
  park('cc', 'open', 0, -10); K('cc', 'open', 4, 400, 60, 150); K('cc', 'open', 8, 60, 90, 140);
  // f1: three sessions read the kernel
  for (let s = 0; s < 3; s++) { K('cc', 'f1', .8 + s * 1.9, 85, 90, 120); K('cc', 'f1', 1.3 + s * 1.9, 85, 90, 60); K('cc', 'f1', s < 2 ? 2.1 + s * 1.9 : 6.6, 85, 90, s < 2 ? 120 : 60); }
  // f2: to the rack, over the cartridge that lifts
  K('cc', 'f2', .9, 300, 110, 140); K('cc', 'f2', 1.6, 300, 110, 140); K('cc', 'f2', 4.4, 300, 110, 140);
  // f3: build four blocks, snag, save, next session reads pitfalls first and builds all four
  K('cc', 'f3', .4, 470, 212, 70); for (let j = 0; j < 3; j++) { K('cc', 'f3', .7 + j * .45, 466 + j * 36, 212, 52); K('cc', 'f3', .9 + j * .45, 466 + j * 36, 212, 70); }
  K('cc', 'f3', 2.3, 540, 212, 62); K('cc', 'f3', 3.4, 540, 212, 80);
  K('cc', 'f3', 4.6, 556, 150, 110); K('cc', 'f3', 5.1, 556, 165, 100);
  for (let j = 0; j < 4; j++) { K('cc', 'f3', 5.6 + j * .35, 466 + j * 36, 212, 52); K('cc', 'f3', 5.75 + j * .35, 466 + j * 36, 212, 70); }
  // f4: read CLAUDE.md, then .claude/reference once Codex has joined
  K0('cc', 'f4', 1.2, 70, 70, 80); K0('cc', 'f4', S4.ans + .4, 70, 70, 80); K0('cc', 'f4', S4.how - .3, 540, 110, 170); K0('cc', 'f4', B.f4.dur, 540, 110, 170);
  // p1: drop facts in the tray, then wait while you decide
  K('cc', 'p1', .6, 700, 80, 90); for (let j = 0; j < 3; j++) { K('cc', 'p1', 1 + j * .55, 692 + (j % 2) * 12, 74 + j * 8, 72); K('cc', 'p1', 1.25 + j * .55, 692, 80, 92); }
  K('cc', 'p1', 3.2, 640, 40, 150); K('cc', 'p1', 7.6, 640, 40, 150);
  // p2: over the line while it runs
  K('cc', 'p2', 1.2, 1006, 118, 140); K('cc', 'p2', 6.5, 1006, 118, 140);
  // c1: the worker at the press, dipping for each of its two presses
  K0('cc', 'c1', .6, 1006, 118, 120); for (const p of C1.press) { K0('cc', 'c1', p - .3, 1006, 118, 120); K0('cc', 'c1', p + .1, 1006, 118, 100); K0('cc', 'c1', p + .5, 1006, 118, 120); } K0('cc', 'c1', B.c1.dur, 1006, 118, 120);
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
  // x2: chat A over the desk; once agreed, each does its own step where it is and both stay to the end
  K('cc', 'x2', .5, 820, 110, 130); K0('cc', 'x2', SX.ro0 + .4, 820, 110, 130); K0('cc', 'x2', SX.ro0 + 1, 790, 100, 96); K0('cc', 'x2', SX.ro0 + 1.8, 790, 100, 96); K0('cc', 'x2', SX.ro0 + 2.4, 820, 110, 130);
  park('cc', 'x3', .6, 160); park('cc', 'x3', B.x3.dur, 160); park('cc', 'close', .5, 700); K('cc', 'close', 3.5, 1006, 118, 120); K('cc', 'close', 6.5, 1430, 140, 90);
  // Codex: joins in f4 with its readout and stays over AGENTS.md to the end of the beat, reviews at the gate,
  // writes in x1 and leaves before x2 (two Claude Code chats), returns over its lagging skill in x3
  K('cx', 'open', 0, -60, -20, 140, 0); K0('cx', 'f4', S4.ro0 - .6, -60, -20, 140, 0); K0('cx', 'f4', S4.ro0, 30, 70, 140, 1); K0('cx', 'f4', S4.ro0 + .5, 30, 136, 80);
  K0('cx', 'f4', B.f4.dur, 30, 136, 80);
  K('cx', 'p1', .5, 200, -20, 140); K('cx', 'c3', 6.6, 200, -20, 140); K('cx', 'g1', 0, 1660, -20, 140); K('cx', 'x1', 2.6, 1600, -20, 140);
  K('cx', 'x1', 3.2, 1430, 140, 70); K('cx', 'x1', 4, 1430, 140, 70); K('cx', 'x1', 4.4, 1620, 30, 150);
  K0('cx', 'x1', B.x1.dur - .9, 1620, 30, 150); K0('cx', 'x1', B.x1.dur - .1, 1660, -20, 140, 0);
  K0('cx', 'x3', .2, 200, 60, 140, 0); K0('cx', 'x3', 1.2, 321, 70, 140, 1); K0('cx', 'x3', B.x3.dur, 321, 70, 140); K('cx', 'close', 1, 1660, -20, 140);
  // A second Claude Code session for /coordinate
  // Nothing of it shows before x2: it slides in when you name it and stays until x2 ends.
  K('cc2', 'open', 0, 1700, -20, 140, 0); K0('cc2', 'x2', SX.ans - .9, 1300, -20, 140, 0); K0('cc2', 'x2', SX.ans, 1150, 40, 140, 1); K0('cc2', 'x2', SX.ans + .9, 1006, 118, 130);
  K0('cc2', 'x2', SX.ro0 + .4, 1006, 118, 130); K0('cc2', 'x2', SX.ro0 + 1, 1006, 118, 104); K0('cc2', 'x2', SX.ro0 + 1.8, 1006, 118, 104); K0('cc2', 'x2', SX.ro0 + 2.4, 1006, 118, 130);
  K0('cc2', 'x2', B.x2.dur, 1006, 118, 130); K0('cc2', 'x3', .9, 1400, -20, 140, 0);
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
// Kernel: CLAUDE.md and AGENTS.md as two engraved plates on a plinth.
function drawKernel(t) {
  const e = emphasis(t, 'kernel'), u = local('f1', t);
  // Three chats read the kernel; the third read holds to the end of the beat under its readout.
  let read = 0; for (let s = 0; s < 3; s++) read = Math.max(read, sm((u - 1.2 - s * 1.9) / .25) * (1 - sm((u - (s < 2 ? 1.9 + s * 1.9 : 6.4)) / .3)));
  // f4: Claude Code reads CLAUDE.md until it moves to the drawers; Codex reads AGENTS.md from its readout to the end.
  const u4 = nloc('f4', t), S4 = B.f4.S; read = Math.max(read, sm((u4 - 1.6) / .3) * (1 - sm((u4 - S4.ans - .4) / .4)));
  paint(box(0, 20, 170, 150, Z0, 22, 6, 1.4, 6), {e, tone: 'mid'});
  for (const [x, y] of k.corners({x: 0, y: 20, w: 170, d: 150}, 7)) dot([x, y, Z0 + 22], 1.4, CREAM, .4 * e);
  paint(box(12, 32, 146, 74, Z0 + 22, 4, 3, .8), {e, tone: 'hi', acc: GREEN, g: read * .9});
  const n1 = nloc('f1', t) - B.f1.S.how - 1.2, cx4 = sm((u4 - S4.ro0 - .4) / .3) * (1 - sm((u4 - B.f4.dur) / .4)), agents = Math.max(cx4, sm(n1 / .3) * (1 - sm((n1 - 1.6) / .4)));
  paint(box(12, 114, 146, 44, Z0 + 22, 4, 3, .8), {e, tone: 'hi', acc: AMBER, g: agents * .9});
  faceText('CLAUDE.md', [20, 42, Z0 + 26], {size: 8, a: .75, e});
  faceText('AGENTS.md', [20, 124, Z0 + 26], {size: 8, a: .75, e});
  for (let r = 0; r < 6; r++) line(k.lineOnTop([20, 54 + r * 8], [20 + 60 + ((r * 37) % 60), 54 + r * 8], Z0 + 26, P), {e, tone: 'lo'});
  for (let r = 0; r < 3; r++) line(k.lineOnTop([20, 134 + r * 8], [20 + 50 + ((r * 41) % 70), 134 + r * 8], Z0 + 26, P), {e, tone: 'lo'});
  if (read > 0) { const sy = 50 + ((u * 60) % 54); line(k.lineOnTop([14, sy], [156, sy], Z0 + 26.2, P), {e, col: GREEN, a: read * .9, w: 1.6, g: read * .6}); }
  if (cx4 > 0) { const sy = 118 + ((u4 * 30) % 36); line(k.lineOnTop([14, sy], [156, sy], Z0 + 26.2, P), {e, col: AMBER, a: cx4 * .9, w: 1.6, g: cx4 * .6}); }
}
// Skill rack: front row .claude/skills, back row .agents/skills (Codex versions); two back slots
// hold a small registration tag instead (skills registered as Claude only).
const RACK_N = 11, RACK_X = i => 230 + i * 14.5, CLAUDE_ONLY = [3, 8];
function drawRack(t) {
  const e = emphasis(t, 'rack'), u = local('f2', t), lift = sm((u - 1.5) / .8) * (1 - sm((u - 5) / .7)), unf = sm((u - 2.2) / .7) * (1 - sm((u - 4.7) / .5));
  // x3: a fix lands in one Claude skill (front row); its Codex version (back row) lags and sinks; CI sweeps the
  // back row on every push, finds it on the first sweep and keeps it flagged to the end of the beat.
  const n4 = nloc('f4', t), ux = nloc('x3', t), X = B.x3.S, live = 1 - sm((ux - B.x3.dur) / .5);
  const fix = sm((ux - X.ans + .4) / .3) * (1 - sm((ux - X.ans - 1.6) / .5)), drift = sm((ux - X.ans - .2) / .5) * live;
  const sweeps = [X.ans + .7, X.how + 1, X.why - .2, X.ro0 + 1], SWEEP = 1.4, hit = sweeps[0] + SWEEP * (RACK_X(6) + 4.5 - 226) / 162;
  const flag = sm((ux - hit) / .2) * live, sweep = sweeps.map(a => (ux - a) / SWEEP).find(f => f >= 0 && f < 1);
  const twin = Math.max(sm((n4 - B.f4.S.how - .8) / .5) * (1 - sm((n4 - B.f4.dur) / .5)), sm(ux / .5) * live);
  paint(box(220, 28, 172, 146, Z0, 10, 4, 1, 4), {e, tone: 'mid'});
  // CI post at the back left of the rack: its lamp checks the back row against the front.
  const ciOn = sm(ux / .5) * live, lampG = Math.max(sweep != null ? .7 : 0, flag * (.75 + .25 * Math.sin(t * 5)));
  paint(cyl(198, 40, 3.5, Z0, 80, 14), {e, tone: 'mid'});
  paint(cyl(198, 40, 8, Z0 + 80, 10, 20), {e, tone: 'hi', acc: flag > .5 ? AMBER : GREEN, g: lampG * ciOn});
  if (lampG * ciOn > .05) spark([198, 40, Z0 + 86], 30, flag > .5 ? AMBER : GREEN, .6 * lampG * ciOn * e);
  paint(box(202, 38, 20, 3, Z0 + 62, 14, .8), {e, tone: 'mid'});
  faceText('CI', [205, 41, Z0 + 69], {size: 9, face: 'front', a: .8, e, col: flag > .5 && ciOn > .5 ? AMBER : CREAM});
  paint(box(220, 28, 172, 8, Z0 + 10, 44, 2, .6), {e, tone: 'mid'});
  faceText('.agents/skills', [226, 40, Z0 + 10], {size: 5.5, a: .55, e, col: twin ? AMBER : CREAM});
  faceText('.claude/skills', [226, 170, Z0 + 10.2], {size: 5.5, a: .55, e});
  for (let i = 0; i < RACK_N; i++) {
    const x = RACK_X(i);
    if (CLAUDE_ONLY.includes(i)) paint(box(x, 52, 9, 16, Z0 + 10, 6, 1), {e, tone: 'lo'});
    else {
      const dr = i === 6 ? drift : 0;
      paint(dr > .01 ? dyn(x, 46, 9, 50, Z0 + 10, 40 - 12 * dr, 1.2) : box(x, 46, 9, 50, Z0 + 10, 40, 1.2), {e, tone: 'mid', acc: AMBER, g: twin * .5 + dr * .8});
      if (i === 6 && flag > .01) spark([x + 4.5, 70, Z0 + 44], 30, AMBER, .7 * flag);
    }
  }
  // The sweep: a bar of light along the back row; the beam from the lamp to the flagged slot.
  if (sweep != null) { const sx = 226 + 162 * sweep, a = Math.sin(Math.PI * sweep);
    line(k.segment([sx, 44, Z0 + 53], [sx, 98, Z0 + 53], P), {e, col: GREEN, a: .9 * a, w: 2, g: .6 * a}); spark([sx, 70, Z0 + 53], 18, GREEN, .5 * a); }
  if (flag > .01) line(k.segment([198, 40, Z0 + 86], [RACK_X(6) + 4.5, 70, Z0 + 38], P), {e, col: AMBER, a: .8 * flag, w: 1.4, g: .5 * flag});
  for (let i = 0; i < RACK_N; i++) {
    const x = RACK_X(i), up = i === 5 ? lift * 70 : 0;
    paint(i === 5 ? dyn(x, 104, 9, 56, Z0 + 10 + up, 46, 1.2) : box(x, 104, 9, 56, Z0 + 10, 46, 1.2), {e, tone: i === 5 || (i === 6 && fix > .05) ? 'hi' : 'mid', acc: GREEN, g: i === 5 ? lift : i === 6 ? fix : 0});
    line(k.lineOnTop([x + 4.5, 110], [x + 4.5, 110 + 14 + (i * 7) % 24], Z0 + 56 + up, P), {e, tone: 'lo'});
    if (i === 5 && unf > 0) {
      // The full guide unfolds: a sheet of rule lines rises out of the lifted cartridge.
      const hgt = 70 * unf;
      paint(dyn(x - 40, 120, 90, 2, Z0 + 56 + up, hgt, .5), {e, tone: 'hi', acc: GREEN, g: .5});
      for (let r = 0; r < 8; r++) { const z = Z0 + 56 + up + hgt - 8 - r * 8; if (z > Z0 + 58 + up) line(k.segment([x - 34, 122, z], [x - 34 + 30 + ((r * 29) % 48), 122, z], P), {e, tone: 'mid'}); }
    }
  }
}
// Reference drawers: six files in a cabinet; pitfalls is the middle right drawer.
const DRAWERS = ['architecture', 'commands', 'deployment', 'pitfalls', 'secrets', 'tech-stack'];
function drawerOpen(t) {
  const u = local('f3', t), u4 = nloc('f4', t);
  return Math.max(sm((u - 3.1) / .4) * (1 - sm((u - 3.9) / .4)), sm((u - 4.6) / .4) * (1 - sm((u - 5.4) / .4)), sm((u4 - B.f4.S.how + .4) / .4) * (1 - sm((u4 - B.f4.dur) / .4)));
}
function drawDrawers(t) {
  const e = emphasis(t, 'drawers'), u = local('f3', t), open = drawerOpen(t) * 46;
  paint(box(440, 30, 160, 120, Z0, 124, 3, 1, 4), {e, tone: 'mid'});
  line(k.sideSeam({x: 440, y: 30, w: 160, d: 120, r: 3}, Z0 + 120, P, 4), {e, tone: 'faint'});
  faceText('.claude/reference', [446, 40, Z0 + 124], {size: 6.5, a: .6, e});
  for (let j = 0; j < 6; j++) {
    const c = j % 2, r = 2 - Math.floor(j / 2), x = 446 + c * 78, z = Z0 + 6 + r * 39, pit = j === 3, o = pit ? open : 0;
    if (o > .5) { paint(dyn(x + 3, 150, 66, o, z + 3, 28, 1), {e, tone: 'mid'}); }
    const g = pit ? Math.max(sm((u - 2.6) / .3) * (1 - sm((u - 6.6) / .5)), drawerOpen(t)) : 0;
    paint(pit ? dyn(x, 150 + o, 72, 5, z, 35, 1, .5) : box(x, 150, 72, 5, z, 35, 1, .5), {e, tone: pit ? 'hi' : 'mid', acc: GREEN, g: g * .8});
    paint(pit ? dyn(x + 24, 155 + o, 24, 3, z + 22, 4, 1) : box(x + 24, 155, 24, 3, z + 22, 4, 1), {e, tone: 'lo'});
    faceText(DRAWERS[j] + '.md', [x + 6, 155 + o, z + 13], {size: 5.4, face: 'front', a: pit ? .8 : .5, e});
  }
  // Work blocks on the bench in front: the first session snags on the third, the second clears it.
  const s1 = u < 5.4, n = s1 ? 3 : 4;
  for (let j = 0; j < 4; j++) {
    const tb = s1 ? .8 + j * .45 : 5.75 + j * .35; if (u < tb || (s1 && j > 2) || u > B.f3.od + .5) continue;
    const snag = s1 && j === 2, g = snag ? sm((u - 2.2) / .2) : 0;
    const fade = s1 ? 1 - sm((u - 4.4) / .5) : sm((u - tb) / .2);
    paint(dyn(454 + j * 36, 200, 26, 26, Z0, 16, 2), {e, tone: 'hi', acc: snag ? AMBER : GREEN, g: snag ? g : (s1 ? .15 : .5), alpha: Math.max(0, fade)});
  }
  void n;
  // The lesson card: printed after the snag, filed into pitfalls.md.
  const c0 = 2.6, c1 = 3.5;
  if (u > c0 && u < 4.2) {
    const f = eio((u - c0) / (c1 - c0)), x = lerp(530, 600 - 70, f), y = lerp(212, 175 + open, f), z = lerp(Z0 + 40, Z0 + 6 + 39 + 30, f) + Math.sin(Math.PI * f) * 30;
    paint(dyn(x, y, 22, 14, z - (u > c1 ? (u - c1) * 40 : 0), 1.5, 1), {e, tone: 'hi', acc: GREEN, g: .8});
  }
  // f4: both tools read the open drawer of .claude/reference, sparks rising to each head.
  const u4 = nloc('f4', t);
  if (u4 > B.f4.S.how && u4 < B.f4.dur) for (const [h, col] of [['cc', GREEN], ['cx', AMBER]]) {
    const hd = headAt(h, t); if (!hd || hd[3] < .5) continue;
    for (let j = 0; j < 3; j++) { const f = ((u4 - B.f4.S.how) * .55 + j / 3) % 1, a = Math.sin(Math.PI * f) * sm((u4 - B.f4.S.how) / .4);
      spark([lerp(560, hd[0], f), lerp(196, hd[1], f), lerp(Z0 + 70, hd[2] - 2, f) + Math.sin(Math.PI * f) * 60], 16, col, .85 * a); }
  }
}
// Planning desk: facts drop into the tray; open choices rise as switches; you flip each; Go.
const SW = [0, 1, 2, 3].map(j => 744 + j * 20);
function drawPlan(t) {
  const e = emphasis(t, 'plan'), u = local('p1', t), up = local('p2', t);
  paint(box(660, 40, 184, 124, Z0, 36, 4, 1.2, 4), {e, tone: 'mid'});
  paint(box(670, 50, 164, 104, Z0 + 36, 3, 3, .6), {e, tone: 'hi'});
  paint(box(678, 62, 40, 40, Z0 + 39, 1, 2), {e, tone: 'lo', flat: true});
  faceText('FACTS', [680, 108, Z0 + 39], {size: 5, a: .5, e});
  for (let j = 0; j < 3; j++) { const tj = 1.15 + j * .55; if (u > tj || up > 0) paint(dcyl(688 + (j % 2) * 14, 72 + j * 9, 5, Z0 + 40 + Math.max(0, 14 * (1 - sm((u - tj) / .25))) * (up > 0 ? 0 : 1), 3, 14), {e, tone: 'hi', acc: GREEN, g: .5}); }
  faceText('YOUR CALL', [740, 108, Z0 + 39], {size: 5, a: .5, e});
  for (let j = 0; j < 4; j++) {
    const x = SW[j], rise = up > 0 ? 1 : sm((u - 2.6 - j * .15) / .4), flip = up > 0 ? 1 : sm((u - 4.4 - j * .32) / .25);
    if (rise <= 0) continue;
    paint(dcyl(x, 128, 6, Z0 + 39, 3 * rise, 16), {e, tone: 'hi', acc: flip > .5 ? GREEN : AMBER, g: .7});
    const [bx, by] = iso([x, 128, Z0 + 42 * rise]), [tx, ty] = iso([x + lerp(-6, 6, flip), 128, Z0 + 42 + 14 * rise]);
    ctx.lineWidth = 2.4 / ZOOM; ctx.strokeStyle = css(flip > .5 ? GREEN : AMBER, .9 * (.35 + .65 * e)); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
    dot([x + lerp(-6, 6, flip), 128, Z0 + 42 + 14 * rise], 3, CREAM, .8 * e);
  }
  // Go lever: you pull it at the end of p1, once every open choice is yours
  const go = sm((u - 6.8) / .4);
  paint(box(822, 112, 12, 26, Z0 + 39, 4, 2), {e, tone: 'mid'});
  const [bx, by] = iso([828, 125, Z0 + 43]), [tx, ty] = iso([828 + lerp(-10, 12, go), 125, Z0 + 43 + 30]);
  ctx.lineWidth = 3 / ZOOM; ctx.strokeStyle = css(go > .5 ? GREEN : CREAM, (.5 + .5 * go) * (.35 + .65 * e)); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
  dot([828 + lerp(-10, 12, go), 125, Z0 + 73], 4.5, go > .5 ? GREEN : CREAM, .9 * e);
  faceText('GO', [820, 146, Z0 + 39], {size: 6, a: .6, e});
}
// Long-horizon line: the chat (a column that fills as context grows) with the plan file state.md beside it,
// the worker press and the checker: a dial, three check lamps and a beam it turns on the step. In p2 the steps
// wait in a queue in front and run one at a time: onto the belt, pressed by a fresh worker, carried to the
// checker, which runs its three checks (lamps light green), then set down in the passed row. The chat fills,
// empties and reads state.md back, and the next step runs. In c1 the checks are written first and handed to the
// checker; a step is pressed, claims DONE, fails its third check and goes back; it runs again and fails again
// under the readout. It never reaches the passed row.
const QUEUE = [0, 1, 2, 3].map(i => [896 + i * 26, 206]), PASSED = [0, 1, 2, 3].map(i => [1062 + i * 26, 206]);
const BELT = {in: 900, press: 1006, check: 1110};
let LINE = null;
function lineScript() { // p2 times in beat seconds, from the caption schedule
  if (LINE) return LINE;
  const S = B.p2.S, D = 2.8, t0 = Math.max(2.5, S.ans - 1), sp = Math.max(2.2, (S.ro0 - .9 - D - t0) / 2);
  return (LINE = {D, run: [t0, t0 + sp, t0 + 2 * sp, S.ro0 + .15], save: t0 - 1.2, ro: S.ro0});
}
// A p2 step, v seconds into its run: lift onto the belt, to the press (pressed .9-1.1), to the checker (checks
// 1.5-2.4), down into the passed row.
const P2_CHECK = [1.5, 2.4];
function stepAt(i, n) {
  const L = lineScript(), [qx, qy] = QUEUE[i], [dx, dy] = PASSED[i], v = n - L.run[i], top = Z0 + 14;
  if (v < 0) return {x: qx, y: qy, z: Z0, g: 0, v};
  if (v >= L.D) return {x: dx, y: dy, z: Z0, g: .9, v};
  if (v < .4) { const f = eio(v / .4); return {x: lerp(qx, BELT.in, f), y: lerp(qy, 120, f), z: lerp(Z0, top, f), g: .4, v}; }
  if (v < .85) return {x: lerp(BELT.in, BELT.press, eio((v - .4) / .45)), y: 120, z: top, g: .4, v};
  if (v < 1.15) return {x: BELT.press, y: 120, z: top, g: .4, v};
  if (v < P2_CHECK[0]) return {x: lerp(BELT.press, BELT.check, eio((v - 1.15) / .35)), y: 120, z: top, g: .4, v};
  if (v < P2_CHECK[1]) return {x: BELT.check, y: 120, z: top, g: .4 + .5 * sm((v - P2_CHECK[1] + .15) / .15), v};
  const f = eio((v - P2_CHECK[1]) / (L.D - P2_CHECK[1])); return {x: lerp(BELT.check, dx, f), y: lerp(120, dy, f), z: lerp(top, Z0, f), g: .9, v};
}
// c1, in beat seconds: the chat writes the checks and hands them to the checker; then two runs of the same step.
// Each run: to the press, pressed and stamped DONE (the worker's report chit is set down by the press), to the
// checker, three checks (two pass, the third fails), back to the start. The second run fails as the readout
// shows.
const C1 = (() => {
  const S = B.c1.S, runs = [{go: 3.6, check: [5.8, 7.6]}, {go: 10.6, check: [13.2, S.ro0]}];
  for (const r of runs) { r.press = r.go + .85; r.leave = r.press + .4; r.back = r.check[1] + .4; }
  return {write: [.8, 2.4], card: [2, 3.4], runs, press: runs.map(r => r.press), how: S.how};
})();
function c1Step(n) {
  let x = BELT.in, fail = 0, done = 0, run = null;
  for (const r of C1.runs) if (n >= r.go) run = r;
  if (!run) return {x, fail, done, run};
  const r = run;
  x = n < r.press ? lerp(BELT.in, BELT.press, eio(clamp((n - r.go) / .75))) : n < r.leave ? BELT.press
    : n < r.back ? lerp(BELT.press, BELT.check, eio(clamp((n - r.leave) / .6))) : lerp(BELT.check, BELT.in, eio(clamp((n - r.back) / 1)));
  done = sm((n - r.press - .2) / .2); fail = sm((n - r.check[1]) / .15);
  return {x, fail, done, run: r};
}
// The checker's state at t: needle 0..1 across the dial, three lamps (0 off, 1 pass, 2 fail), the beam onto the step.
function checker(t) {
  const n = nloc('p2', t), nc = nloc('c1', t), o = {needle: 0, col: CREAM, lamps: [0, 0, 0], beam: 0, bx: BELT.check};
  const lit = (pr, failLast) => [0, 1, 2].map(k => pr >= (k + 1) / 3 - .02 ? (failLast && k === 2 ? 2 : 1) : 0);
  if (t < B.c1.start && n > 0) {
    const L = lineScript();
    for (let i = 0; i < 4; i++) { const v = n - L.run[i]; if (v < P2_CHECK[0] - .1 || v > P2_CHECK[1] + .25) continue;
      const pr = clamp((v - P2_CHECK[0]) / (P2_CHECK[1] - P2_CHECK[0] - .1));
      o.needle = .92 * pr * (1 - sm((v - P2_CHECK[1]) / .2)); o.col = pr >= 1 ? GREEN : AMBER; o.lamps = lit(pr, false);
      o.beam = sm((v - P2_CHECK[0] + .1) / .15) * (1 - sm((v - P2_CHECK[1]) / .15)); }
    return o;
  }
  if (nc < 0 || nc > B.c1.dur) return o;
  for (const r of C1.runs) { const [a, b] = r.check; if (nc < a - .2) continue;
    const pr = clamp((nc - a) / (b - a)), held = nc < (r === C1.runs[0] ? C1.runs[1].go - .4 : B.c1.dur + 1);
    if (!held) { o.needle = 0; o.lamps = [0, 0, 0]; o.beam = 0; continue; }
    o.needle = .92 * pr; o.col = nc >= b ? AMBER : pr > .05 ? GREEN : CREAM; o.lamps = lit(pr * (nc >= b ? 1 : .999), nc >= b);
    if (nc < b) o.lamps[2] = 0;
    o.beam = sm((nc - a + .2) / .2) * (1 - sm((nc - b - .3) / .3)); o.bx = BELT.check; }
  return o;
}
function chatFill(t) {
  const n = nloc('p2', t), L = lineScript(); if (n < 0) return 0;
  let f = [0, 1, 2].reduce((s, i) => s + sm((n - L.run[i] - L.D + .3) / .4), 0) / 3;
  f *= 1 - sm((n - L.ro) / .5);
  f += sm((n - L.run[3] - L.D + .3) / .4) / 3;
  return f * (1 - sm((n - B.p2.dur) / .6));
}
function drawLine(t) {
  const e = emphasis(t, 'line'), nc = nloc('c1', t), inC1 = nc > 0 && nc < B.c1.dur, n = nloc('p2', t), L = lineScript(), inP2 = n >= 0 && t < B.c1.start;
  // The plan file, beside the chat: saved at the start of the run, read back when the chat restarts.
  const saved = sm((n - L.save) / .3) * (1 - sm((n - L.save - 1.6) / .5)), reread = sm((n - L.ro - .2) / .3) * (1 - sm((n - L.ro - 2) / .5));
  paint(box(846, 30, 30, 46, Z0, 5, 2, .6), {e, tone: 'mid', acc: GREEN, g: Math.max(saved, reread) * .9});
  faceText('state.md', [849, 56, Z0 + 5], {size: 5, a: .7, e});
  // The chat: pedestal and a column that fills as the run uses context; amber when full.
  paint(box(884, 24, 58, 58, Z0, 40, 3, 1), {e, tone: 'mid'});
  faceText('CHAT', [888, 84, Z0 + 32], {size: 5, face: 'front', a: .5, e});
  const fill = chatFill(t), full = sm((n - L.ro + .5) / .2) * (1 - sm((n - L.ro) / .3));
  const brief = inC1 ? sm((nc - C1.write[0]) / .3) * (1 - sm((nc - C1.write[1]) / .3)) : 0;
  paint(cyl(913, 53, 19, Z0 + 40, 34, 32), {e, tone: 'hi', acc: GREEN, g: brief * .8});
  for (let r = 1; r < 6; r++) line(k.sideArc(913, 53, 19, Z0 + 40 + r * 6, P, 20), {e, tone: 'faint'});
  if (fill > .01) paint(dcyl(913, 53, 19.6, Z0 + 40, 34 * Math.min(1, fill), 32), {e, tone: 'hi', acc: full > .1 ? AMBER : GREEN, g: .5 + .5 * full});
  // Plan saved: a spark from the desk to the file. Resume: sparks from the file back up into the chat.
  if (saved > 0 && n < L.save + 1.2) { const f = eio(clamp((n - L.save) / 1)); spark([lerp(760, 861, f), lerp(100, 53, f), Z0 + 40 + Math.sin(Math.PI * f) * 40], 18, GREEN, .9); }
  for (let j = 0; j < 3; j++) { const f = clamp((n - L.ro - .3 - j * .3) / .8); if (f > 0 && f < 1) spark([lerp(861, 913, f), 53, lerp(Z0 + 5, Z0 + 74, f) + Math.sin(Math.PI * f) * 20], 16, GREEN, .9); }
  // Belt with moving cleats
  paint(box(880, 98, 286, 44, Z0, 14, 6, .8), {e, tone: 'mid'});
  for (let j = 0; j < 14; j++) { const x = 888 + ((j * 20 + (t * 22) % 20)); if (x < 1160) line(k.lineOnTop([x, 102], [x, 138], Z0 + 14, P), {e, tone: 'faint'}); }
  // Checker pedestal (behind the belt): dial, needle, three check lamps
  const ck = checker(t);
  paint(box(1086, 24, 84, 58, Z0, 30, 3, 1), {e, tone: 'mid'});
  faceText('CHECKER', [1090, 84, Z0 + 22], {size: 5, face: 'front', a: .5, e});
  paint(cyl(1114, 52, 23, Z0 + 30, 7, 48), {e, tone: 'hi'});
  const tk = k.radialTicks(1114, 52, 21, 30, 5, Z0 + 37, [2, 4], P, -2.2, 4.4); line(tk.minor, {e, tone: 'lo'}); line(tk.major, {e, tone: 'mid'});
  const na = -2.2 + 4.4 * ck.needle;
  line(k.lineOnTop([1114, 52], [1114 + Math.sin(na) * 18, 52 - Math.cos(na) * 18], Z0 + 37.4, P), {e, col: ck.col, a: .95, w: 1.6, g: ck.needle > .02 ? .4 : 0});
  ck.lamps.forEach((s, j) => { paint(cyl(1157, 36 + j * 16, 6, Z0 + 30, 4, 18), {e, tone: s ? 'hi' : 'mid', acc: s === 2 ? AMBER : GREEN, g: s ? 1 : 0});
    if (s) spark([1157, 36 + j * 16, Z0 + 35], s === 2 ? 26 : 16, s === 2 ? AMBER : GREEN, (s === 2 ? .9 : .6) * e); });
  // c1: the checks, written first, fly from the chat to the checker before the worker starts, and stay there.
  if (inC1 && nc > C1.card[0] - .2) {
    const fb = sm((nc - C1.card[0]) / (C1.card[1] - C1.card[0])), hi = sm((nc - C1.how) / .3) * (1 - sm((nc - C1.how - 1.6) / .4));
    paint(dyn(lerp(904, 1134, fb), lerp(44, 64, fb), 16, 12, Z0 + lerp(74, 30, fb) + Math.sin(Math.PI * fb) * 30, 2, 1), {e, tone: 'hi', acc: AMBER, g: .6 + .4 * hi});
    if (fb > .9) for (let r = 0; r < 3; r++) line(k.lineOnTop([1137, 67 + r * 3], [1137 + 6 + (r % 2) * 3, 67 + r * 3], Z0 + 32.2, P), {e, tone: 'mid'});
  }
  // Worker press over the belt
  for (const y of [92, 148]) paint(cyl(1006, y, 4.5, Z0 + 14, 82, 16), {e, tone: 'mid'});
  paint(box(1000, 88, 12, 64, Z0 + 96, 9, 2, .5), {e, tone: 'mid'});
  faceText('WORKER', [992, 150, Z0 + 108], {size: 5, face: 'front', a: .5, e});
  let press = 0;
  // p2: the queue, the step on the belt, the passed row
  if (t < B.c1.start) for (let i = 0; i < 4; i++) {
    const s = inP2 ? stepAt(i, n) : {x: QUEUE[i][0], y: QUEUE[i][1], z: Z0, g: 0, v: -1};
    paint(dyn(s.x - 9, s.y - 9, 18, 18, s.z, 12, 2), {e, tone: s.v >= 0 ? 'hi' : 'mid', acc: GREEN, g: s.g});
    if (s.v > .85 && s.v < 1.2) press = Math.max(press, sm((s.v - .9) / .08) * (1 - sm((s.v - 1.05) / .08)));
  }
  // c1: the step, its DONE stamp and the worker's report chit; on a failed check the stamp is struck through.
  if (inC1) {
    const s = c1Step(nc), acc = s.fail > .5 ? AMBER : GREEN;
    paint(dyn(s.x - 10, 110, 20, 20, Z0 + 14, 14, 2), {e, tone: 'hi', acc, g: s.fail > .5 ? .9 : .4});
    if (s.done > 0) {
      faceText('DONE', [s.x - 9, 120, Z0 + 28.2], {size: 6.5, a: .9 * s.done, e, col: acc});
      if (s.fail > 0) line(k.lineOnTop([s.x - 9, 120], [s.x - 9 + 18 * s.fail, 120], Z0 + 28.4, P), {e, col: AMBER, a: .95, w: 1.6});
    }
    // The report chit stays beside the press: the checker never reads it.
    const chit = Math.max(...C1.runs.map(r => sm((nc - r.press - .2) / .3) * (1 - sm((nc - r.back - 1.2) / .4))));
    if (chit > .01) { paint(dyn(1018, 150, 22, 14, Z0, 2, 1), {e, tone: 'hi', alpha: chit}); faceText('REPORT', [1020, 157, Z0 + 2.2], {size: 3.6, a: .75 * chit, e}); }
    for (const p of C1.press) press = Math.max(press, sm((nc - p + .05) / .12) * (1 - sm((nc - p - .2) / .12)));
  }
  // The checker's beam on the step it is checking
  if (ck.beam > .01 && e > .5) {
    const a1 = iso([1114, 70, Z0 + 37]), b1 = iso([ck.bx - 12, 112, Z0 + 28]), b2 = iso([ck.bx + 12, 128, Z0 + 28]);
    ctx.fillStyle = css(ck.col === AMBER && ck.lamps[2] === 2 ? AMBER : GREEN, .12 * ck.beam); ctx.beginPath(); ctx.moveTo(...a1); ctx.lineTo(...b1); ctx.lineTo(...b2); ctx.closePath(); ctx.fill();
  }
  paint(dcyl(1006, 120, 9, Z0 + 96 - 30 - press * 22, 30, 18), {e, tone: press > .05 ? 'hi' : 'mid', acc: GREEN, g: press});
}
// Arena: three turntables; a blind judge lamp sweeps them; B is the base and takes one idea from A and C.
function drawArena(t) {
  const e = emphasis(t, 'arena'), u = local('c3', t);
  paint(box(1196, 30, 178, 172, Z0, 8, 6, 1, 6), {e, tone: 'mid'});
  const judge = [[3, 3.6, 0], [3.6, 4.2, 1], [4.2, 4.8, 2]], win = sm((u - 5) / .4);
  for (let j = 0; j < 3; j++) {
    const cx = 1226 + j * 58, cy = 140, rot = t * .6 + j;
    paint(cyl(cx, cy, 24, Z0 + 8, 6, 40), {e, tone: 'mid', acc: GREEN, g: j === 1 ? win * .8 : 0});
    const tk = k.radialTicks(cx, cy, 23, 24, 6, Z0 + 14, [1.5, 3], P, rot % 6.283); line(tk.minor, {e, tone: 'faint'});
    const built = sm((u - .7 - j * .7) / .3) + (u > 5 ? 0 : 0);
    if (built > 0 || u > B.c3.od) {
      const hts = [[12, 10], [16, 8, 10], [8, 14]][j]; let z = Z0 + 14;
      hts.forEach((h, q) => { paint(dyn(cx - 8 + q * 2, cy - 8, 14 - q * 2, 14, z, h * built, 1.5), {e, tone: 'hi', acc: GREEN, g: j === 1 ? win * .7 : .15}); z += h * built; });
      // Grafted ideas fly from A and C onto B.
      if (j !== 1 && u > 5.4) {
        const f = eio(clamp((u - 5.4 - (j ? .3 : 0)) / .8)), bx = 1284, sx = cx, x = lerp(sx, bx, f), zz = lerp(z, Z0 + 14 + 34 + (j ? 6 : 0), f) + Math.sin(Math.PI * f) * 30;
        paint(dyn(x - 4, cy - 4, 8, 8, zz, 5, 1), {e, tone: 'hi', acc: GREEN, g: .9});
      }
    }
    paint(box(cx - 12, 172, 24, 12, Z0 + 8, 2, 1), {e, tone: 'lo'});
    faceText('ABC'[j], [cx - 3, 178, Z0 + 10], {size: 7, a: .7, e});
    // The blind: a cover slides over each name plate while judging.
    const cover = sm((u - 2.6) / .3) * (1 - sm((u - 4.9) / .3));
    if (cover > 0) paint(dyn(cx - 13, 171, 26 * cover, 14, Z0 + 10, 2, 1), {e, tone: 'mid'});
  }
  // Judge lamp on a post at the back
  paint(cyl(1286, 46, 6, Z0 + 8, 92, 18), {e, tone: 'mid'});
  let jx = 1284, bright = 0; for (const [a, b, j] of judge) if (u >= a && u < b) { jx = 1226 + j * 58; bright = sm((u - a) / .15) * (1 - sm((u - b + .1) / .15)); }
  if (u >= 4.8) { jx = 1284; bright = win; }
  paint(dyn(1282, 46, 8, 70, Z0 + 96, 6, 2), {e, tone: 'mid'});
  if (bright > 0 && e > .5) {
    const a1 = iso([1286, 110, Z0 + 92]), b1 = iso([jx - 22, 140, Z0 + 14]), b2 = iso([jx + 22, 140, Z0 + 14]);
    ctx.fillStyle = css(CREAM, .07 * bright); ctx.beginPath(); ctx.moveTo(...a1); ctx.lineTo(...b1); ctx.lineTo(...b2); ctx.closePath(); ctx.fill();
  }
  paint(dcyl(1286, 112, 10, Z0 + 92, 10, 20), {e, tone: 'hi', acc: CREAM, g: bright * .6});
}
// Review gate: a PR card rides the track under an arch of reviewer lenses; you turn the /merge key;
// findings are checked, the confirmed ones fixed, the whole card scanned again, CI lights, and the card
// merges at the commit that was reviewed.
function gateScript(t) {
  // returns {key, card: [{x, col, findings: [{state}], scan, lensCol}], ci}
  const ug = local('g1', t), ux = local('x1', t), ur = local('res', t);
  const o = {key: 0, cards: [], ci: [0, 0], lens: AMBER, scan: 0};
  if (ug >= 0 && ug < B.g1.od + .5) {
    o.key = sm((ug - 2) / .3);
    const x = ug < 2 ? lerp(1404, 1440, sm(ug / 1.2)) : ug < 2.6 ? lerp(1440, 1500, eio((ug - 2) / .6)) : ug < 7.8 ? 1500 : lerp(1500, 1676, eio((ug - 8.6) / .8));
    o.scan = Math.max(sm((ug - 2.6) / .3) * (1 - sm((ug - 3.8) / .3)), sm((ug - 6.4) / .3) * (1 - sm((ug - 7.6) / .3)));
    const fs = [0, 1, 2].map(j => ({show: sm((ug - 3 - j * .2) / .2), drop: j === 1 ? sm((ug - 4.3) / .4) : 0, fixed: j !== 1 ? sm((ug - 5.6 - j * .2) / .3) : 0}));
    o.cards.push({x, col: GREEN, fs, merged: ug > 9.4, stack: 0});
    o.ci = [sm((ug - 7.9) / .3), sm((ug - 8.1) / .3)];
  }
  if (ux >= 0 && ux < B.x1.od + .3) {
    const x1 = ux < .4 ? 1404 : ux < 1.6 ? lerp(1404, 1500, eio((ux - .4) / 1.2)) : ux < 2.7 ? 1500 : lerp(1500, 1676, eio((ux - 2.7) / .7));
    o.cards.push({x: x1, col: GREEN, fs: [], merged: ux > 3.3, stack: 1});
    o.scan = Math.max(sm((ux - 1.6) / .2) * (1 - sm((ux - 2.5) / .2)), sm((ux - 4.7) / .2) * (1 - sm((ux - 6.2) / .2)));
    o.lens = ux < 3.6 ? AMBER : GREEN;
    if (ux > 3.2) { const x2 = ux < 4.2 ? lerp(1404, 1500, eio((ux - 3.2) / 1)) : ux < 6.3 ? 1500 : lerp(1500, 1676, eio((ux - 6.3) / .7)); o.cards.push({x: x2, col: AMBER, fs: [], merged: ux > 7, stack: 2}); }
    o.ci = [sm((ux - 2.4) / .2) * (1 - sm((ux - 3.4) / .3)) + sm((ux - 6) / .2), sm((ux - 2.5) / .2) * (1 - sm((ux - 3.4) / .3)) + sm((ux - 6.1) / .2)];
  }
  if (ur >= 0) {
    // Results: #211 three rounds 2, 4, 0; #212 three reviewers, 0, CI on two systems; #214 the rule.
    o.lens = AMBER; o.res = ur;
    o.scan = [[.4, 1], [1.3, 1.9], [2.2, 2.8], [4.1, 4.9]].reduce((m, [a, b]) => Math.max(m, sm((ur - a) / .15) * (1 - sm((ur - b) / .2))), 0);
    o.ci = [sm((ur - 5.1) / .3), sm((ur - 5.3) / .3)];
  }
  return o;
}
function drawGate(t) {
  const e = emphasis(t, 'gate'), s = gateScript(t);
  paint(box(1400, 118, 290, 44, Z0, 6, 4, .6), {e, tone: 'mid'});
  for (let j = 0; j < 14; j++) line(k.lineOnTop([1408 + j * 20, 122], [1408 + j * 20, 158], Z0 + 6, P), {e, tone: 'faint'});
  // CI tower, behind the track
  paint(cyl(1600, 70, 5, Z0, 74, 16), {e, tone: 'mid'});
  for (let j = 0; j < 2; j++) { paint(cyl(1600, 70, 9, Z0 + 74 + j * 16, 12, 20), {e, tone: 'hi', acc: GREEN, g: s.ci[j]}); }
  faceText('CI', [1612, 78, Z0 + 92], {size: 6, face: 'front', a: .55, e});
  // Arch: back post, lintel with lenses, front post drawn after the card
  paint(cyl(1500, 104, 6, Z0, 116, 18), {e, tone: 'mid'});
  paint(box(1494, 96, 12, 88, Z0 + 116, 10, 2, .6), {e, tone: 'mid'});
  faceText('REVIEW', [1496, 186, Z0 + 124], {size: 4.6, face: 'front', a: .5, e});
  for (let j = 0; j < 3; j++) {
    const y = 116 + j * 24; paint(dcyl(1500, y, 7, Z0 + 100, 16, 18), {e, tone: 'hi', acc: s.lens, g: .4 + s.scan * .6});
    if (s.scan > 0 && e > .5) {
      const a1 = iso([1500, y, Z0 + 100]), b1 = iso([1478, y - 8, Z0 + 12]), b2 = iso([1522, y + 8, Z0 + 12]);
      ctx.fillStyle = css(s.lens, .09 * s.scan); ctx.beginPath(); ctx.moveTo(...a1); ctx.lineTo(...b1); ctx.lineTo(...b2); ctx.closePath(); ctx.fill();
    }
  }
  // Merged stack at the exit
  const merged = s.cards.filter(c => c.merged).length + (s.res != null ? 0 : 0);
  let stackZ = Z0 + 6; const stackN = Math.max(0, mergedCount(t));
  for (let j = 0; j < stackN; j++) { paint(box(1650, 122, 46, 36, stackZ, 3, 2), {e, tone: 'mid'}); stackZ += 3.6; }
  void merged;
  for (const c of s.cards) {
    if (c.merged) continue;
    paint(dyn(c.x - 23, 122, 46, 36, Z0 + 6, 4, 2, .5), {e, tone: 'hi', acc: c.col, g: .45});
    for (let r = 0; r < 4; r++) line(k.lineOnTop([c.x - 18, 128 + r * 6], [c.x - 18 + 14 + ((r * 13) % 20), 128 + r * 6], Z0 + 10.2, P), {e, tone: 'mid'});
    faceText('a3f9c1e', [c.x - 18, 154, Z0 + 10.2], {size: 4.4, a: .7, e, col: c.col});
    c.fs.forEach((f, j) => {
      if (f.show <= 0) return; const fx = c.x + 4 + j * 6, fy = 132 + j * 7, gone = f.drop;
      const col = f.fixed > .5 ? GREEN : AMBER, a = f.show * (1 - f.fixed) * (1 - gone);
      if (a > .01) { dot([fx, fy, Z0 + 10.4 + (gone ? -gone * 20 : 0)], 3.2, col, a); spark([fx, fy, Z0 + 11], 12, col, .5 * a); }
      if (gone > 0 && gone < 1) dot([fx + gone * 18, fy + gone * 30, Z0 + 10 - gone * 18], 2.6, CREAM, .5 * (1 - gone));
    });
  }
  paint(cyl(1500, 176, 6, Z0, 116, 18), {e, tone: 'mid'});
  // The /merge key switch, with you beside it
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
// Reader behind the gate: session strips feed a drum; corrections tally in three jars; at three one pull
// request of rule edits prints and rides the pipe to the PR slot beside the drawers, where it waits for you.
function drawBack(t) {
  const e = emphasis(t, 'back'), u = local('i1', t);
  paint(box(1560, -38, 90, 52, Z0, 30, 4, 1), {e, tone: 'mid'});
  paint(dcyl(1605, -12, 16, Z0 + 30, 12, 28), {e, tone: 'hi', acc: GREEN, g: u > 0 && u < 5 ? .6 : 0});
  faceText('/refine weekly', [1566, 16, Z0 + 18], {size: 4.8, face: 'front', a: .6, e});
  for (let j = 0; j < 5; j++) { const f = ((u * .6 + j * .2) % 1); if (u > .3 && u < 4.6) paint(dyn(1660 + 50 * (1 - f), -26, 18, 26, Z0 + 30 + 2, 1.5, 1), {e, tone: 'hi', alpha: Math.sin(Math.PI * f)}); }
  const tallies = [[.9, 1.6, 2.4], [1.3], [2, 3.1]];
  tallies.forEach((ts, j) => {
    const x = 1470 + j * 30; paint(cyl(x, -16, 10, Z0, 6, 20), {e, tone: 'mid'});
    let z = Z0 + 6; ts.forEach(tt => { if (u > tt) { paint(dcyl(x, -16, 8, z, 3, 18), {e, tone: 'hi', acc: AMBER, g: j === 0 && ts.length === 3 && u > 2.4 ? 1 : .4}); z += 3.6; } });
  });
  // The one pull request rides the pipe to the PR slot beside the drawers and waits there for you.
  paint(box(604, 206, 30, 26, Z0, 20, 2, .6), {e: emphasis(t, 'drawers'), tone: 'mid'});
  faceText('PR', [612, 232, Z0 + 12], {size: 5.4, face: 'front', a: .65, e: emphasis(t, 'drawers')});
  if (u > 2.8 && u < B.i1.od + .5) {
    const f = clamp((u - 3) / 3.4), seg = 1032 + 258, d = eio(f) * seg;
    let x, y; if (d < 1032) { x = 1650 - d; y = -44; } else { x = 618; y = -44 + (d - 1032); }
    const wait = sm((u - 6.3) / .3), z = lerp(Z0 + 12, Z0 + 21, wait);
    paint(dyn(x - 11, y - 7, 22, 14, z, 1.5, 1), {e: 1, tone: 'hi', acc: AMBER, g: .7 + .3 * wait * (.5 + .5 * Math.sin(t * 3))});
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
  // You: at the desk (choices, Go, starting the run, naming the second chat), at the gate (/merge, merging,
  // the final yes) and by the drawers (correcting a mistake).
  const pulse = (u, a, b) => sm((u - a) / .3) * (1 - sm((u - b) / .4)), n2 = nloc('p2', t), ux = local('x1', t);
  person([744, 300, 0], {e: emphasis(t, 'plan'), lit: Math.max(sm((local('p1', t) - 4.2) / .3) * (1 - sm((n2 - .6) / .4)), pulse(n2, lineScript().save - .4, lineScript().save + 1.6), pulse(local('x2', t), .1, 1.1))});
  person([1452, 300, 0], {e: emphasis(t, 'gate'), lit: Math.max(pulse(local('g1', t), 1.8, 3.6), pulse(local('open', t), 9.4, 11.3), pulse(ux, 2.5, 3.5), pulse(ux, 6.2, 7.9))});
  person([660, 290, 0], {e: emphasis(t, 'drawers'), lit: pulse(local('f3', t), 2.2, 3.3)});
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
// /coordinate: verdict chips arc between the two sessions until both agree.
function drawCoordinate(t) {
  const u = local('x2', t); if (u < 1 || u > 4.6) return;
  const a = headAt('cc', t), b = headAt('cc2', t); if (!a || !b) return;
  for (let j = 0; j < 4; j++) {
    const t0 = 1.1 + j * .75, f = clamp((u - t0) / .6); if (f <= 0 || f >= 1) continue;
    const [p, q] = j % 2 ? [b, a] : [a, b], x = lerp(p[0], q[0], f), y = lerp(p[1], q[1], f), z = lerp(p[2], q[2], f) + Math.sin(Math.PI * f) * 50;
    spark([x, y, z], 22, j === 3 ? GREEN : AMBER, .9); dot([x, y, z], 3, CREAM, .9);
  }
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
