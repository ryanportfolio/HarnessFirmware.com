// The featured trio on /skills. Every 7 s the three panels move on to the next three of eleven skills,
// wrapping around the list, so each skill passes through the large and both small panels in turn.
// skills.html ships the first trio (Long Horizon, Arena, Independent Review) as static markup; this
// module binds that markup in place and builds every other panel from the scene definitions below.
//
// Scenes share one vocabulary, read by bind():
//   data-st="0,3"   lit in those states, dim otherwise      data-from="2"  lit from that state on
//   data-half="2"   half lit in those states                data-seq="2" data-i data-n: lights one by one through state 2
//   data-path="x"   motion path (data-t="a,b": share of the state span it covers); data-dot="x" rides it
// Small scenes draw in a 480 x 170 box. The large panel draws the same scene, measured and scaled to fit
// 740 x 365, plus a `more` layer of labels and detail that only the large panel has room for.

const gallery = document.querySelector('#skills .ss-gallery');
const INTERVAL = 7000, FADE = 650, STAGGER = 110, SPAN = 5600;

const L = (x, y, text, a = '') => `<text class="ss-diagram-label" x="${x}" y="${y}"${a ? ' ' + a : ''}>${text}</text>`;
const P = (d, cls = 'ss-filament', a = '') => `<path class="${cls}" d="${d}"${a ? ' ' + a : ''}/>`;
const C = (x, y, r, cls = 'ss-node', a = '') => `<circle class="${cls}" cx="${x}" cy="${y}" r="${r}"${a ? ' ' + a : ''}/>`;
const R = (x, y, w, h, cls = 'ss-box', a = '') => `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}"${a ? ' ' + a : ''}/>`;
const T = (x, y, text, cls, a = '') => `<text class="${cls}" x="${x}" y="${y}"${a ? ' ' + a : ''}>${text}</text>`;
const G = (a, inner) => `<g ${a}>${inner}</g>`;
const each = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');
const bundle = (n, f) => each(n, (i) => P(f(i), i % 3 ? 'ss-filament faint' : 'ss-filament'));
const move = (id, d, t = '0,1') => `<path data-path="${id}" data-t="${t}" fill="none" stroke="none" d="${d}"/>`;
const dot = (id, x, y, r = 3, a = '') => C(x, y, r, 'ss-node', `data-dot="${id}"${a ? ' ' + a : ''}`);
const seq = (stage, i, n) => `data-seq="${stage}" data-i="${i}" data-n="${n}"`;
const mid = 'text-anchor="middle"';

// Copy and facts come from each skill's SKILL.md on template main; categories match the directory below.
const SKILLS = [
  { id: 'long-horizon', cat: 'Build', title: 'Long Horizon', summary: 'Carry a goal across verified rounds.',
    extra: 'Ultra version for Claude Code: <code>/long-horizon-workflows</code> runs the rounds through Claude Code\'s built-in workflows with judges and a run journal.',
    href: '/long-horizon', link: 'Explore the workflow',
    label: 'A goal travels through four saved rounds: define, build, audit, and save progress.',
    states: ['01 / Define the goal', '02 / Build a round', '03 / Fresh audit', '04 / Save progress'] },
  { id: 'arena', cat: 'Plan', title: 'Arena', summary: 'Test alternatives. Combine the strongest ideas.',
    extra: 'Candidates build the same brief in parallel. A blind judge checks each against pass/fail criteria, and the strongest becomes the base.',
    href: '/arena', link: 'Explore the workflow',
    label: 'Three candidate approaches converge into one selected base with useful ideas combined.',
    states: ['01 / Explore alternatives', '02 / Compare the work', '03 / Choose a base', '04 / Graft useful ideas'] },
  { id: 'impartial-review', cat: 'Audit', title: 'Independent Review', summary: 'Fresh context. Verified findings.',
    extra: 'Reviewers that never saw the work inspect the change, and each finding is verified before it reaches you.',
    href: '/#audit-details', link: 'Explore the workflow',
    label: 'Independent review finds a gap, the worker repairs it, and the changed result is checked again.',
    states: ['01 / Inspect the work', '02 / Finding confirmed', '03 / Repair the gap', '04 / Recheck the result'] },
  { id: 'refine', cat: 'Improve', title: 'Refine', summary: 'Evidence first. The smallest fix, or none.',
    extra: 'Only your own words count as a preference. A failure fix must pass three checks first, and zero changes is a valid result.',
    label: 'A session is read for your own words; a fix passes three checks, then goes to one home: kernel, pitfalls, a skill, or nowhere.',
    states: ['01 / Read the session', '02 / Only your words count', '03 / Pass three checks', '04 / Route to one home'] },
  { id: 'showpiece', cat: 'Build', title: 'Showpiece', summary: 'Start from real material. Prove it small first.',
    extra: 'It sketches two or three directions that differ in idea, picks the one that goes furthest, and tests it on a small specimen in the real medium.',
    label: 'Real material leads to three directions; the one that goes furthest is proven on a small specimen, then developed into the full piece.',
    states: ['01 / Study the real material', '02 / Sketch 2 or 3 directions', '03 / Prove a small specimen', '04 / Develop the details'] },
  { id: 'redesign-concepts', cat: 'Build', title: 'Redesign Concepts', summary: 'Critique the real build, then pick a redesign.',
    extra: 'Codex draws ten concepts by default, one screen and one idea each. It writes a build plan for your pick and edits nothing.',
    label: 'Screenshots of the current build are marked with real problems, ten concepts are drawn, and the one you pick becomes a build plan.',
    states: ['01 / Capture the build', '02 / List its real problems', '03 / Generate concepts', '04 / You pick, it plans'] },
  { id: 'lab', cat: 'Build', title: 'Lab', summary: 'Tune it by eye with live controls, then port it.',
    extra: 'A throwaway HTML page starts at the current values. Your settings port into the real constants, then the page is deleted.',
    label: 'Sliders start at the current values and you tune a live preview; the settings JSON is ported into the code and the lab is deleted.',
    states: ['01 / Seed current values', '02 / You tune by eye', '03 / Copy settings JSON', '04 / Port it, delete the lab'] },
  { id: 'perf-loop', cat: 'Improve', title: 'Perf Loop', summary: 'Measure, change one thing, measure again.',
    extra: 'Each round reruns the same workload and keeps only gains that repeat and pass a fresh review. Two rounds without a gain end the loop.',
    label: 'A repeated baseline, then one change per round; a gain inside the noise is inconclusive, and reviewed gains are kept.',
    states: ['01 / Baseline, 3+ runs', '02 / One change per round', '03 / Noise is inconclusive', '04 / Reviewed gains stay'] },
  { id: 'deep-plan', cat: 'Plan', title: 'Deep Plan', summary: 'Your decisions, in rounds. Nothing built before Go.',
    extra: 'At most four questions per round, with a recommended answer first. A ledger records every decision you make.',
    label: 'A loose idea is scoped, then asked about in rounds of up to four questions; a ledger records decisions and nothing moves until you pick Go.',
    states: ['01 / Agree the scope', '02 / Up to 4 questions', '03 / Ledger keeps decisions', '04 / Built only after Go'] },
  { id: 'merge', cat: 'Audit', title: 'Merge', summary: 'You type /merge. Review, fixes, CI, then merge.',
    extra: 'One full Codex review, then at most three reruns. It squash-merges once a review round and CI pass on the same commit; otherwise the pull request stays open.',
    label: 'You type /merge; a full review and up to three reruns fix the pull request, CI passes on the same commit, and it is squash-merged.',
    states: ['01 / You type /merge', '02 / Full review, fixes', '03 / Reruns, at most 3', '04 / CI passes, squash-merge'] },
  { id: 'why', cat: 'Audit', title: 'Why', summary: 'One fresh reviewer tests the last pick.',
    extra: 'The reviewer sees only the recommendation and the message that prompted it, and looks for hidden assumptions, missed costs and cases where it is the wrong call.',
    label: 'The last recommendation is singled out and its key facts checked; one fresh reviewer sees only the pick, and the pick is confirmed, refined or overturned.',
    states: ['01 / Lock onto the pick', '02 / Verify its key facts', '03 / One fresh reviewer', '04 / Confirm or overturn'] },
];
for (const skill of SKILLS) if (!skill.href) { skill.href = `#skill-${skill.id}`; skill.link = 'See the skill'; }

const SCENES = {
  'long-horizon': {
    small: () => bundle(9, (i) => `M34 66 C110 ${10 + 6 * i}, 300 ${116 - 2 * i}, 420 76 C360 ${124 - 4 * i}, 40 ${100 - 3 * i}, 34 66`)
      + each(4, (i) => { const x = 118 + 68 * i; return P(`M${x} 44 l30 -13 v64 l-30 13 Z`, 'ss-planes', `data-st="${i}"`) + L(x + 2, 24, `R${i + 1}`); })
      + P('M34 66 C90 58 120 52 160 64 S230 92 276 88 S360 62 420 76', 'ss-wire')
      + move('h', 'M34 66 C90 58 120 52 160 64 S230 92 276 88 S360 62 420 76')
      + C(420, 76, 9, 'ss-orbit') + C(420, 76, 16, 'ss-orbit') + C(420, 76, 23, 'ss-orbit')
      + C(34, 66, 3.4) + C(420, 76, 4.6) + dot('h', 34, 66, 2.8) + L(404, 40, 'GOAL'),
  },
  arena: {
    more: () => L(20, 22, 'CANDIDATES') + L(236, 26, 'BLIND JUDGE')
      + L(214, 162, 'PASS/FAIL CRITERIA', 'data-st="1"') + L(370, 136, 'BASE + GRAFTS', 'data-from="2"')
      + L(20, 150, 'SAME BRIEF, SEPARATE BUILDS'),
  },
  'impartial-review': {
    more: () => L(121, 14, 'THE WORK') + L(130, 150, 'FRESH REVIEWER') + L(30, 76, 'CHANGE')
      + L(306, 106, 'FINDING VERIFIED', 'data-st="1,2"') + L(406, 124, 'RECHECKED', 'data-st="3"'),
  },
  refine: {
    small: () => {
      const lens = [70, 52, 78, 44, 66, 58, 74];
      return R(22, 18, 94, 92, 'ss-frame', 'data-st="0"')
        + each(7, (i) => P(`M30 ${28 + 12 * i} h${lens[i]}`))
        + each(2, (k) => { const y = [40, 76][k]; return G('data-from="1"', P(`M30 ${y} h${lens[k * 3 + 1]}`, 'ss-ink') + R(14, y - 2.5, 5, 5, 'ss-mark')); })
        + P('M116 64 C140 64 150 63 176 63 L268 63 C292 63 300 63 320 63', 'ss-wire')
        + each(3, (i) => P(`M${176 + 36 * i} 34 l20 -9 v58 l-20 9 Z`, 'ss-planes', seq(2, i, 3)))
        + each(4, (i) => { const y = [26, 50, 76, 100][i]; return P(`M320 63 C350 63 362 ${y} 410 ${y}`) + C(414, y, 4, 'ss-orbit'); })
        + P('M320 63 C350 63 362 50 410 50', 'ss-wire', 'data-st="3"') + C(414, 50, 3.2, 'ss-node', 'data-st="3"')
        + L(424, 29, 'KERNEL') + L(424, 53, 'PITFALLS') + L(424, 79, 'SKILL') + L(424, 103, 'NONE')
        + C(320, 63, 3) + move('f', 'M116 64 C140 64 150 63 176 63 L268 63 C292 63 300 63 320 63 C350 63 362 50 410 50', '0.22,0.95')
        + dot('f', 116, 64, 2.8);
    },
    more: () => L(22, 10, 'SESSION') + L(14, 124, 'USER TURNS ONLY', 'data-from="1"')
      + L(172, 16, 'CAUSE') + L(208, 7, 'LINK') + L(240, -2, 'ACTIVE')
      + L(176, 124, 'A FAILURE FIX NEEDS ALL THREE', 'data-from="2"') + L(298, 86, 'SMALLEST FIX', 'data-st="3"'),
  },
  showpiece: {
    small: () => G('data-st="0" data-half="1,2,3"',
      R(28, 28, 20, 14, 'ss-box') + C(72, 34, 7, 'ss-ring') + P('M36 84 l10 -17 l10 17 Z', 'ss-ink')
      + P('M70 58 h24 M70 65 h16 M70 72 h21') + R(80, 84, 15, 10, 'ss-box') + C(34, 58, 2.6, 'ss-mark') + C(58, 100, 2, 'ss-mark'))
      + P('M104 62 C130 50 150 34 176 30', 'ss-ink', 'data-st="1"') + C(178, 30, 4, 'ss-orbit') + L(186, 33, 'A')
      + P('M104 62 C134 72 160 92 200 96', 'ss-ink', 'data-st="1"') + C(202, 96, 4, 'ss-orbit') + L(210, 99, 'B')
      + P('M104 62 C150 60 230 58 292 58') + P('M104 62 C150 60 230 58 292 58', 'ss-wire', 'data-from="1"') + L(282, 44, 'C')
      + R(292, 50, 16, 16, 'ss-gate', 'data-from="2"')
      + P('M308 50 L340 18 M308 66 L340 106', 'ss-filament faint', 'data-from="3"')
      + R(340, 18, 112, 88, 'ss-frame', 'data-from="3"')
      + each(6, (i) => P(['M350 30 h60', 'M350 38 h38', 'M350 54 h92', 'M350 62 h92', 'M350 70 h66', 'M350 90 h30'][i], 'ss-ink', seq(3, i, 6)))
      + C(104, 62, 3) + move('s', 'M104 62 C150 60 230 58 292 58 L300 58 L396 62', '0.2,1') + dot('s', 104, 62, 2.8),
    more: () => L(26, 16, 'MATERIAL') + L(120, 124, '2 OR 3 DIRECTIONS', 'data-st="1"') + L(214, 52, 'GOES FURTHEST', 'data-from="2"')
      + L(276, 84, 'SPECIMEN', 'data-from="2"') + L(340, 10, 'THE PIECE', 'data-from="3"')
      + L(340, 124, 'PURPOSE / CRAFT', 'data-from="3"') + L(340, 135, '/ CORRECTNESS', 'data-from="3"'),
  },
  'redesign-concepts': {
    small: () => {
      const minis = ['M5 6 h18 M5 11 h10 M5 16 h14', 'M5 5 v12 M9 6 h14 M9 11 h14 M9 16 h8', 'M5 6 h18 M5 11 h18 M5 16 h18', 'M5 5 h8 v12 h-8 Z M16 6 h7 M16 11 h7', 'M5 16 h18 M8 6 h12 M10 11 h8'];
      return R(26, 24, 86, 64, 'ss-frame') + P('M26 34 H112') + R(32, 40, 30, 20) + R(66, 40, 40, 8) + R(66, 52, 40, 8) + R(32, 66, 74, 6) + R(32, 76, 50, 6)
        + P('M20 28 V18 H30 M108 18 H118 V28 M118 84 V94 H108 M30 94 H20 V84', 'ss-ink', 'data-st="0"')
        + G('data-from="1"', P('M62 38 l5 9 h-10 Z', 'ss-flag') + P('M104 50 l5 9 h-10 Z', 'ss-flag') + P('M82 74 l5 9 h-10 Z', 'ss-flag'))
        + P('M120 56 H156', 'ss-wire')
        + each(10, (k) => { const x = 162 + 34 * (k % 5), y = k < 5 ? 32 : 60; return G(seq(2, k, 10), R(x, y, 28, 22) + P(minis[k % 5], 'ss-filament', `transform="translate(${x} ${y})"`)); })
        + R(225, 55, 38, 32, 'ss-gate', 'data-st="3"')
        + P('M263 71 C300 71 340 61 390 61', 'ss-wire', 'data-st="3"')
        + R(390, 26, 56, 70, 'ss-frame', 'data-from="3"') + P('M398 38 h40 M398 46 h30 M398 54 h36 M398 66 h40 M398 74 h22 M398 82 h32', 'ss-ink', 'data-from="3"')
        + move('r1', 'M112 56 H160', '0,0.45') + dot('r1', 112, 56, 2.8)
        + move('r2', 'M263 71 C300 71 340 61 390 61', '0.75,1') + dot('r2', 263, 71, 2.8, 'data-from="3"');
    },
    more: () => L(20, 10, 'SCREENSHOTS') + L(24, 108, 'REAL PROBLEMS', 'data-from="1"') + L(162, 24, 'CODEX IMAGE_GEN')
      + L(162, 96, '10 CONCEPTS BY DEFAULT', 'data-from="2"') + L(390, 18, 'BUILD PLAN', 'data-from="3"') + L(390, 108, 'EDITS NOTHING', 'data-from="3"'),
  },
  lab: {
    small: () => R(16, 16, 270, 96, 'ss-frame dash', 'data-st="0,1,2"')
      + each(4, (i) => { const y = 34 + 18 * i, s = [60, 98, 74, 110][i]; return P(`M34 ${y} H134`) + P(`M${s} ${y - 5} v10`, 'ss-ink', 'data-st="0" data-half="1,2,3"') + C(s, y, 3.4, 'ss-node', `data-knob="${i}"`); })
      + C(220, 64, 20, 'ss-ring', 'data-pv="ring"') + `<rect class="ss-ink" x="-9" y="-9" width="18" height="18" data-pv="sq" transform="translate(220 64) rotate(0)"/>`
      + C(220, 64, 30, 'ss-orbit') + C(250, 64, 2.4, 'ss-mark', 'data-pv="orb"')
      + G('data-from="2"', P('M312 38 c-6 0 -7 3 -7 9 v8 c0 5 -2 8 -6 9 c4 1 6 4 6 9 v8 c0 6 1 9 7 9 M358 38 c6 0 7 3 7 9 v8 c0 5 2 8 6 9 c-4 1 -6 4 -6 9 v8 c0 6 -1 9 -7 9', 'ss-ink')
        + P('M316 50 h34 M316 60 h26 M316 70 h30 M316 80 h22'))
      + P('M371 64 H390', 'ss-wire', 'data-from="3"')
      + R(392, 36, 62, 56, 'ss-frame', 'data-from="3"') + P('M400 48 h30 M400 58 h44 M400 68 h22 M400 78 h38', 'ss-ink', 'data-from="3"')
      + move('l', 'M252 64 H392', '0.5,0.92') + dot('l', 252, 64, 2.6, 'data-from="2"'),
    more: () => L(16, 8, 'ONE THROWAWAY HTML FILE') + each(4, (i) => L(34, 29 + 18 * i, ['RADIUS', 'SCALE', 'ANGLE', 'ORBIT'][i]))
      + L(16, 124, 'STARTS AT CURRENT VALUES', 'data-st="0"') + L(190, 124, 'LIVE PREVIEW')
      + L(300, 28, 'COPY SETTINGS', 'data-from="2"') + L(392, 28, 'REAL CONSTANTS', 'data-from="3"') + L(392, 104, 'LAB DELETED', 'data-st="3"'),
    setup(svg) {
      const knobs = [...svg.querySelectorAll('[data-knob]')], ring = svg.querySelector('[data-pv="ring"]'), sq = svg.querySelector('[data-pv="sq"]'), orb = svg.querySelector('[data-pv="orb"]');
      const seed = [60, 98, 74, 110], aim = [100, 64, 124, 80];
      return (lt) => {
        const p = Math.min(1, Math.max(0, (lt - SPAN / 4) / (SPAN / 4))), e = p * p * (3 - 2 * p);
        const v = seed.map((s, i) => s + (aim[i] - s) * e);
        knobs.forEach((k, i) => k.setAttribute('cx', v[i].toFixed(1)));
        const n = v.map((x) => (x - 34) / 100);
        ring.setAttribute('r', (8 + 22 * n[0]).toFixed(1));
        const s = 0.6 + n[1] * 1.1;
        sq.setAttribute('transform', `translate(220 64) rotate(${(n[2] * 90).toFixed(1)}) scale(${s.toFixed(2)})`);
        const a = n[3] * Math.PI * 2;
        orb.setAttribute('cx', (220 + 30 * Math.cos(a)).toFixed(1)); orb.setAttribute('cy', (64 + 30 * Math.sin(a)).toFixed(1));
      };
    },
  },
  'perf-loop': {
    small: () => {
      const tops = [[30, 34, 28], [56, 60, 55], [58, 53, 61], [78, 82, 77]];
      const bars = (g, cls) => each(3, (j) => { const x = 62 + 90 * g + 10 * j; return P(`M${x} 108 V${tops[g][j]}`, cls) + C(x, tops[g][j], 1.6, cls === 'ss-bar warn' ? 'ss-flag-dot' : 'ss-node'); });
      return P('M40 18 V108 H452')
        + P('M138 52 H282 M138 64 H282', 'ss-filament faint', 'data-from="2"')
        + G('data-from="0"', bars(0, 'ss-bar')) + G('data-from="1"', bars(1, 'ss-bar')) + G('data-st="2" data-half="3"', bars(2, 'ss-bar warn')) + G('data-from="3"', bars(3, 'ss-bar'))
        + P('M50 30 H150 V57 H330 V79 H446', 'ss-filament faint')
        + P('M156 44 l4 4 8 -9', 'ss-audit-check', 'data-from="1"') + P('M245 40 h14', 'ss-flag', 'data-st="2" data-half="3"') + P('M336 66 l4 4 8 -9', 'ss-audit-check', 'data-from="3"')
        + C(384, 42, 6, 'ss-orbit', 'data-from="3"') + C(400, 42, 6, 'ss-orbit', 'data-from="3"')
        + move('p', 'M50 30 H150 V57 H330 V79 H446') + dot('p', 50, 30, 2.8);
    },
    more: () => L(40, 10, 'TIME, LOWER IS BETTER') + L(72, 122, 'BASE', mid) + L(162, 122, 'R1', mid) + L(252, 122, 'R2', mid) + L(342, 122, 'R3', mid)
      + L(162, 133, 'KEEP', `${mid} data-from="1"`) + L(252, 133, 'INCONCLUSIVE', `${mid} data-from="2"`) + L(342, 133, 'KEEP', `${mid} data-from="3"`)
      + L(372, 28, 'FRESH REVIEW', 'data-from="3"') + L(40, 150, 'TWO ROUNDS WITHOUT A GAIN END THE LOOP'),
  },
  'deep-plan': {
    small: () => {
      const specks = [[38, 44], [52, 36], [66, 48], [44, 62], [60, 66], [74, 60], [36, 78], [52, 84], [70, 80], [48, 52], [80, 72], [30, 60]];
      const q = (x, y) => R(x, y, 30, 13) + C(x + 8, y + 6.5, 2.2, 'ss-node') + C(x + 18, y + 6.5, 2.2, 'ss-orbit');
      return each(specks.length, (i) => C(specks[i][0], specks[i][1], 1.7, 'ss-speck', `data-speck="${i}"`))
        + C(55, 62, 36, 'ss-ring dash', 'data-st="0" data-half="1,2,3"')
        + each(4, (i) => P(`M91 62 C104 62 106 ${32 + 19 * i} 118 ${32 + 19 * i}`))
        + G('data-from="1"', each(4, (i) => q(118, 26 + 19 * i)))
        + each(3, (i) => P(`M148 ${42 + 19 * i} C160 ${42 + 19 * i} 166 ${42 + 19 * i} 178 ${42 + 19 * i}`, 'ss-filament faint'))
        + G('data-from="2"', each(3, (i) => q(178, 36 + 19 * i)))
        + R(236, 22, 80, 84, 'ss-frame')
        + each(7, (i) => P(`M244 ${33 + 11 * i} h${[56, 40, 62, 48, 58, 36, 50][i]}`, 'ss-ink', `data-from="${i < 4 ? 1 : 2}"`))
        + P('M352 30 V96 M380 30 V96', 'ss-ink') + R(352, 56, 28, 14, 'ss-gate', 'data-st="3"') + T(366, 66, 'GO', 'ss-go', `${mid} data-st="3"`)
        + P('M380 63 H446', 'ss-wire', 'data-st="3"') + C(450, 63, 3.4, 'ss-node', 'data-st="3"')
        + move('d', 'M91 62 C104 62 108 51 118 51 H148 C160 51 168 61 178 61 H208 C220 61 228 62 236 62 H316 C330 62 340 63 352 63 H450', '0.1,1')
        + dot('d', 91, 62, 2.8);
    },
    more: () => L(26, 16, 'LOOSE IDEA') + L(116, 16, 'ROUND 1', 'data-from="1"') + L(176, 26, 'ROUND 2', 'data-from="2"') + L(236, 14, 'LEDGER')
      + L(112, 118, 'RECOMMENDED FIRST', 'data-from="1"') + L(340, 22, 'YOUR GO') + L(398, 54, 'HANDOFF', 'data-st="3"') + L(236, 118, 'EVERY DECISION', 'data-from="2"'),
    setup(svg) {
      const specks = [...svg.querySelectorAll('[data-speck]')].map((el) => ({ el, x: +el.getAttribute('cx'), y: +el.getAttribute('cy') }));
      return (lt, stage, t) => specks.forEach(({ el, x, y }, i) => {
        const pull = Math.min(1, lt / (SPAN / 4)) * 0.25;
        el.setAttribute('cx', (x + (55 - x) * pull + Math.sin(t / 900 + i * 1.7) * 2).toFixed(1));
        el.setAttribute('cy', (y + (62 - y) * pull + Math.cos(t / 1100 + i * 2.3) * 2).toFixed(1));
      });
    },
  },
  merge: {
    small: () => P('M110 100 H460') + P('M110 100 C122 100 124 63 136 63', 'ss-filament')
      + R(18, 52, 66, 22, 'ss-frame', 'data-st="0" data-half="1,2,3"') + T(26, 67, '/merge', 'ss-cmd') + R(72, 57, 5, 11, 'ss-mark', 'data-cursor')
      + P('M84 63 H136 M168 63 H307', 'ss-wire')
      + C(152, 63, 16, 'ss-orbit') + C(152, 63, 6, 'ss-ring', 'data-from="1"')
      + G('data-from="1"', each(3, (i) => C(152, 47, 2.2, 'ss-node', `data-orb="${i}"`)))
      + P('M190 55 l7 12 h-14 Z', 'ss-audit-finding', 'data-st="1"')
      + each(3, (i) => R(212 + 26 * i, 54, 18, 18, i === 2 ? 'ss-box dash' : 'ss-box') + T(221 + 26 * i, 66, String(i + 1), 'ss-num', mid))
      + each(2, (i) => R(212 + 26 * i, 54, 18, 18, 'ss-gate', seq(2, i, 2)))
      + C(316, 63, 9, 'ss-orbit') + P('M311 63 l4 4 7 -8', 'ss-audit-check', 'data-from="3"')
      + P('M325 63 C360 63 372 100 404 100 H460', 'ss-wire', 'data-from="3"') + C(404, 100, 3.4, 'ss-node', 'data-from="3"')
      + move('m', 'M84 63 H325 C360 63 372 100 404 100 H460', '0.05,1') + dot('m', 84, 63, 2.8),
    more: () => L(18, 44, 'YOU TYPE IT') + L(130, 38, 'FULL REVIEW') + L(206, 44, 'RERUNS, MAX 3') + L(306, 44, 'CI')
      + L(290, 90, 'SAME COMMIT', 'data-from="3"') + L(412, 92, 'SQUASH', 'data-from="3"') + L(440, 112, 'MAIN')
      + P('M270 72 C276 100 268 118 282 128', 'ss-flag dash ss-label-art') + L(288, 131, 'STILL FAILING: PR STAYS OPEN'),
    setup(svg) {
      const orbs = [...svg.querySelectorAll('[data-orb]')], cursor = svg.querySelector('[data-cursor]');
      return (lt, stage, t) => {
        orbs.forEach((el, i) => { const a = t / 650 + i * 2.094; el.setAttribute('cx', (152 + 16 * Math.cos(a)).toFixed(1)); el.setAttribute('cy', (63 + 16 * Math.sin(a)).toFixed(1)); });
        cursor.style.opacity = stage === 0 && Math.floor(t / 450) % 2 ? '0' : stage === 0 ? '1' : '.2';
      };
    },
  },
  why: {
    small: () => {
      const lens = [60, 74, 0, 50, 66, 40];
      return each(6, (i) => (i === 2 ? '' : P(`M24 ${26 + 14 * i} h${lens[i]}`)))
        + P('M24 54 h86', 'ss-ink') + R(18, 46, 98, 16, 'ss-frame', 'data-st="0" data-half="1,2,3"')
        + P('M116 54 C122 54 120 36 126 36 M116 54 C122 54 120 72 126 72')
        + G('data-from="1"', R(126, 30, 12, 12) + R(126, 66, 12, 12) + P('M129 36 l3 3 5 -6 M129 72 l3 3 5 -6', 'ss-audit-check'))
        + P('M116 54 C170 54 190 58 222 58')
        + C(250, 58, 30, 'ss-ring dash', 'data-from="2"') + C(250, 58, 4, 'ss-node', 'data-from="2"')
        + each(3, (i) => P(['M236 38 l5 9 h-10 Z', 'M268 70 l5 9 h-10 Z', 'M268 36 l5 9 h-10 Z'][i], 'ss-flag', seq(2, i, 3)))
        + each(3, (i) => { const y = [30, 58, 86][i]; return P(`M280 58 C320 58 330 ${y} 370 ${y}`) + R(370, y - 5, 10, 10, 'ss-box'); })
        + P('M280 58 H370', 'ss-wire', 'data-st="3"') + R(370, 53, 10, 10, 'ss-gate', 'data-st="3"')
        + L(388, 33, 'CONFIRM') + L(388, 61, 'REFINE') + L(388, 89, 'OVERTURN')
        + move('w', 'M110 54 C170 54 190 58 250 58 H375', '0.3,0.95') + dot('w', 110, 54, 2.8);
    },
    more: () => L(18, 16, 'LAST TURN') + L(18, 76, 'THE PICK', 'data-st="0"') + L(144, 30, 'KEY FACTS', 'data-from="1"')
      + L(206, 18, 'SEES ONLY THE PICK', 'data-from="2"') + L(186, 110, 'ASSUMPTIONS, COSTS, EDGE CASES', 'data-from="2"') + L(18, 124, 'NO FILE EDITS'),
  },
};

if (gallery) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const slots = [...gallery.querySelectorAll('.ss-feature')];
  const SIZE = ['big', 'small', 'small'];
  const status = document.querySelector('#ss-motion-status');
  // The shipped panels are the first trio in their home slots; keep their SVG for when they come back there.
  const home = {};
  slots.forEach((article, i) => {
    const skill = SKILLS[i], svg = article.querySelector('svg');
    home[skill.id] = { size: SIZE[i], outer: svg.outerHTML, inner: svg.innerHTML };
  });

  const svgFor = (skill, size) => {
    const own = home[skill.id];
    if (own && own.size === size) return own.outer;
    const scene = SCENES[skill.id];
    const body = scene.small ? scene.small() : own.inner;
    const label = `role="img" aria-label="${skill.label}"`;
    if (size === 'small') return `<svg class="ss-illustration" viewBox="0 0 480 170" ${label}>${body}</svg>`;
    return `<svg class="ss-illustration" viewBox="0 0 740 365" ${label}><g class="ss-scaled">${body}${scene.more ? scene.more() : ''}</g></svg>`;
  };
  const markup = (skill, size) => `<div class="ss-feature-top"><span>${skill.cat}</span></div>${svgFor(skill, size)}<div class="ss-feature-copy"><h3>${skill.title}</h3><p>${skill.summary}</p>${size === 'big' && skill.extra ? `<p class="ss-ultra">${skill.extra}</p>` : ''}<a href="${skill.href}">${skill.link} <span aria-hidden="true">↗</span></a></div><div class="ss-scene-state">${skill.states[0]}</div>`;

  const list = (v) => (v ? v.split(',').map(Number) : null);
  function bind(article, skill) {
    const svg = article.querySelector('svg'), caption = article.querySelector('.ss-scene-state');
    // A small scene in the large panel: measure what it draws and scale it to fill the panel's drawing area.
    const scaled = svg.querySelector('.ss-scaled');
    if (scaled) {
      const b = scaled.getBBox(), k = Math.min(640 / b.width, 270 / b.height, 1.6);
      scaled.setAttribute('transform', `translate(${(370 - (b.x + b.width / 2) * k).toFixed(1)} ${(170 - (b.y + b.height / 2) * k).toFixed(1)}) scale(${k.toFixed(3)})`);
    }
    const n = skill.states.length, seg = SPAN / n;
    const lit = [...svg.querySelectorAll('[data-st],[data-from],[data-half]')].map((el) => ({ el, st: list(el.dataset.st), from: el.dataset.from == null ? null : +el.dataset.from, half: list(el.dataset.half) }));
    const steps = [...svg.querySelectorAll('[data-seq]')].map((el) => ({ el, stage: +el.dataset.seq, at: +el.dataset.i / +el.dataset.n }));
    const paths = [...svg.querySelectorAll('[data-path]')].map((p) => ({ p, len: p.getTotalLength(), t: list(p.dataset.t) || [0, 1], dots: [...svg.querySelectorAll(`[data-dot="${p.dataset.path}"]`)] }));
    const tick = SCENES[skill.id]?.setup?.(svg);
    let last = -1;
    const slot = { t: 0, paint(t) {
      const lt = t % INTERVAL, stage = Math.min(n - 1, Math.floor(lt / seg)), sub = Math.min(1, (lt - stage * seg) / seg);
      if (stage !== last) {
        last = stage;
        caption.textContent = skill.states[stage];
        for (const { el, st, from, half } of lit) {
          el.classList.toggle('on', (st ? st.includes(stage) : false) || (from != null && stage >= from));
          el.classList.toggle('half', !!half && half.includes(stage));
        }
      }
      for (const { el, stage: s, at } of steps) el.classList.toggle('on', stage > s || (stage === s && sub >= at));
      for (const { p, len, t: [a, b], dots } of paths) {
        const q = Math.min(1, Math.max(0, (lt / SPAN - a) / (b - a)));
        const pt = p.getPointAtLength(len * q);
        for (const d of dots) { d.setAttribute('cx', pt.x.toFixed(1)); d.setAttribute('cy', pt.y.toFixed(1)); }
      }
      tick?.(lt, stage, t);
    } };
    slot.paint(0);
    return slot;
  }

  let offset = 0, live = slots.map((article, i) => bind(article, SKILLS[i]));
  let raf = 0, previous = null, dwell = 0, turning = false;
  let visible = false, hover = false, focused = false, paused = false;
  gallery.classList.add('is-live');

  function mount(i) {
    const skill = SKILLS[(offset + i) % SKILLS.length], article = slots[i];
    article.innerHTML = markup(skill, SIZE[i]);
    article.dataset.skill = skill.id;
    live[i] = bind(article, skill);
  }
  function advance() {
    if (turning) return;
    offset = (offset + slots.length) % SKILLS.length;
    dwell = 0;
    if (reduced.matches) { slots.forEach((_, i) => mount(i)); return; }
    turning = true;
    slots.forEach((article, i) => {
      setTimeout(() => { article.inert = true; article.setAttribute('aria-hidden', 'true'); article.classList.add('is-out'); }, i * STAGGER);
      setTimeout(() => { mount(i); void article.offsetWidth; article.classList.remove('is-out'); }, i * STAGGER + FADE);
      setTimeout(() => {
        article.inert = false; article.removeAttribute('aria-hidden');
        if (i === slots.length - 1) turning = false;
      }, i * STAGGER + 2 * FADE);
    });
  }

  const animating = () => visible && !document.hidden && !reduced.matches && !paused;
  function frame(now) {
    raf = 0;
    if (!animating()) { previous = null; return; }
    const dt = previous === null ? 0 : Math.min(now - previous, 64);
    previous = now;
    for (const slot of live) { slot.t += dt; slot.paint(slot.t); }
    // The 7 s count runs through the fades, so a new trio starts every 7 s; hover and focus hold it.
    if (!hover && !focused) { dwell += dt; if (!turning && dwell >= INTERVAL) advance(); }
    raf = requestAnimationFrame(frame);
  }

  // Pause and next controls sit beside the motion status above the trio (WCAG 2.2.2).
  const icons = {
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3h3v10H4zM9 3h3v10H9z"/></svg>',
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.5v11l9-5.5z"/></svg>',
    next: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 7.2h9.2L7.6 3.6 8.7 2.5l5.5 5.5-5.5 5.5-1.1-1.1 3.6-3.6H2z"/></svg>',
  };
  const controls = document.createElement('div');
  controls.className = 'ss-rotate';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Featured skills');
  controls.innerHTML = `<button type="button" class="ss-rotate-toggle"></button><button type="button" class="ss-rotate-next" aria-label="Show the next three skills">${icons.next}</button>`;
  const toggle = controls.querySelector('.ss-rotate-toggle');
  (status?.parentElement || gallery.parentElement).append(controls);

  function sync() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; previous = null;
    toggle.hidden = reduced.matches;
    toggle.innerHTML = paused ? icons.play : icons.pause;
    toggle.setAttribute('aria-label', paused ? 'Play the featured skills' : 'Pause the featured skills');
    gallery.classList.toggle('is-still', reduced.matches || paused);
    if (status) status.textContent = reduced.matches ? 'Static diagrams' : paused ? 'Paused' : '';
    if (reduced.matches) live.forEach((slot) => { slot.t = 0; slot.paint(0); });
    if (animating()) raf = requestAnimationFrame(frame);
  }
  toggle.addEventListener('click', () => { paused = !paused; sync(); });
  controls.querySelector('.ss-rotate-next').addEventListener('click', advance);
  gallery.addEventListener('pointerenter', () => { hover = true; });
  gallery.addEventListener('pointerleave', () => { hover = false; });
  gallery.addEventListener('focusin', () => { focused = true; });
  gallery.addEventListener('focusout', (event) => { if (!gallery.contains(event.relatedTarget)) focused = false; });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: 0 }).observe(gallery);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  sync();
}
