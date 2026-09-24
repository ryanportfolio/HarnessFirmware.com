// Card media for the command cards (card-row.mjs). Each .cmd-card__media[data-art] gets a line
// drawing of what its command does, animated on one shared frame loop:
//   dare       one block breaks into four pieces, each piece is tested (one fails and drops out),
//              the survivors rebuild a new shape, and the shape is checked against a target
//   arena      three attempts run in parallel lanes; the strongest becomes the base and one part
//              from each of the others folds into it
//   lab        three sliders move and a live preview (an easing curve, a moving dot, a block)
//              follows them
//   showpiece  a scan passes over a generic page and leaves a composed layout behind it
//   wow-loop   the result is compared with the goal, a finding is repaired and rechecked, and a
//              round marker advances each loop
//   perf-loop  frame times are measured against a baseline, one change lands, the new run comes
//              in lower, and an independent check stamps it
// Drawn in a 480 x 240 box (the media box is 2:1). Frames run only while a card is on screen, the
// tab is visible and motion is allowed; reduced motion paints each drawing once at its most
// telling moment.

const GREEN = '#53db76';
const BRIGHT = '#72f28c';
const AMBER = '#efc87e';
const DIM = '#3e5a45';
const svg = (body, label) => `<svg viewBox="0 0 480 240" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="${GREEN}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const smooth = x => { const p = clamp01(x); return p * p * (3 - 2 * p); };
const lerp = (a, b, u) => a + (b - a) * u;
const set = (element, name, value) => { if (element.getAttribute(name) !== value) element.setAttribute(name, value); };
const opacity = (element, value) => set(element, 'opacity', value.toFixed(3));
const move = (element, x, y) => set(element, 'transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
// Loop fade: the drawing fades out over the last .6 s of its loop and back in over the first .4 s.
const loopFade = (u, period) => Math.min(smooth(u / .4), smooth((period - u) / .6));
const passDots = (x, y) => [0, 1, 2, 3].map(i => `<rect class="pass" x="${x + i * 22}" y="${y}" width="12" height="12"/>`).join('');
const lightPass = (dots, active) => dots.forEach((dot, i) => { set(dot, 'fill', i === active ? GREEN : 'none'); opacity(dot, i === active ? 1 : .45); });

// dare: four fresh passes, three seconds each.
const DARE = {
  period: 12,
  still: 10.4,
  joined: [[110, 70], [150, 70], [110, 110], [150, 110]],
  apart: [[-20, -20], [20, -20], [-20, 20], [20, 20]],
  rebuilt: [[300, 118], null, [345, 93], [390, 68]],
  markup: () => svg(`<path class="dare-target" d="M296 162V114H341V89H386V64H434V162Z" stroke-dasharray="5 5" opacity="0"/>
    ${[0, 1, 2, 3].map(i => `<g class="dare-piece"><rect width="40" height="40" fill="#10150f"/><path class="dare-mark" d="m13 21 5 5 10-11" opacity="0"/></g>`).join('')}
    <path class="dare-scan" d="M76 0H232" stroke="${BRIGHT}" stroke-width="1.6" opacity="0"/>
    <path class="dare-sweep" d="M0 52V170" stroke="${BRIGHT}" stroke-width="1.6" opacity="0"/>
    <g class="dare-stamp" opacity="0"><circle cx="434" cy="186" r="16" fill="#10150f"/><path d="m427 186 5 5 10-11" stroke-width="2"/></g>
    ${passDots(196, 214)}`, 'A problem broken into pieces, each assumption tested, the survivors rebuilt and checked against a target'),
  parts: art => ({pieces: [...art.querySelectorAll('.dare-piece')], target: art.querySelector('.dare-target'), scan: art.querySelector('.dare-scan'), sweep: art.querySelector('.dare-sweep'), stamp: art.querySelector('.dare-stamp'), dots: [...art.querySelectorAll('.pass')]}),
  frame(p, t) {
    const u = t % this.period;
    const phase = Math.min(3, Math.floor(u / 3));
    const apart = smooth((u - .3) / 1.6);
    const rebuild = smooth((u - 6.3) / 1.8);
    const scanY = lerp(38, 196, clamp01((u - 3.2) / 2.3));
    p.pieces.forEach((piece, i) => {
      const [jx, jy] = this.joined[i];
      const [ax, ay] = this.apart[i];
      let x = jx + ax * apart, y = jy + ay * apart;
      const failed = i === 1;
      if (!failed) { const [rx, ry] = this.rebuilt[i]; x = lerp(x, rx, rebuild); y = lerp(y, ry, rebuild); }
      move(piece, x, y);
      const tested = u > 3.2 && scanY > y + 20;
      const rect = piece.firstElementChild;
      set(rect, 'stroke', failed && tested ? AMBER : GREEN);
      opacity(piece, (failed ? 1 - smooth((u - 5.5) / .6) : 1) * loopFade(u, this.period));
      opacity(piece.lastElementChild, !failed && tested && u < 6.4 ? 1 : 0);
    });
    move(p.scan, 0, scanY);
    opacity(p.scan, u > 3.2 && u < 5.6 ? 1 : 0);
    opacity(p.target, smooth((u - 8.6) / .6) * loopFade(u, this.period));
    move(p.sweep, lerp(290, 440, clamp01((u - 9.2) / 1.6)), 0);
    opacity(p.sweep, u > 9.2 && u < 10.8 ? 1 : 0);
    opacity(p.stamp, smooth((u - 10.6) / .3) * loopFade(u, this.period));
    lightPass(p.dots, phase);
  },
};

// arena: three lanes, the middle attempt wins and takes a part from each of the others.
const ARENA = {
  period: 12,
  still: 9.6,
  frames: [[250, 26], [250, 95], [250, 164]],
  arrive: [2.4, 3.1, 3.9],
  markup: () => svg(`<circle cx="62" cy="120" r="9"/>
    ${[55, 120, 185].map((y, i) => `<path class="arena-lane" d="M71 120C160 120 150 ${y} 244 ${y}" opacity=".45"/>`).join('')}
    ${[0, 1, 2].map(i => `<g class="arena-frame"><rect width="92" height="50" fill="#10150f"/>${[12, 24, 36].map(y => `<path class="arena-bar" d="M12 ${y}H80" stroke-width="3" opacity="0"/>`).join('')}</g>`).join('')}
    ${[0, 1, 2].map(() => `<rect class="arena-packet" x="-3" y="-3" width="6" height="6" fill="${BRIGHT}" stroke="none"/>`).join('')}
    <path class="arena-part arena-part-a" d="M0 0H40" stroke="${BRIGHT}" stroke-width="3" opacity="0"/>
    <path class="arena-part arena-part-c" d="M0 0H40" stroke="${BRIGHT}" stroke-width="3" opacity="0"/>
    <g class="arena-best" opacity="0"><path d="M356 96h78v60h-78z" stroke="${BRIGHT}"/><path d="M362 108h52m-52 12h52" stroke-width="3"/></g>
    <g class="arena-stamp" opacity="0"><circle cx="434" cy="160" r="14" fill="#10150f"/><path d="m428 160 4 4 9-10" stroke-width="2"/></g>`, 'Three attempts run in parallel; the strongest becomes the base and takes the best part of each of the others'),
  parts: art => ({lanes: [...art.querySelectorAll('.arena-lane')], frames: [...art.querySelectorAll('.arena-frame')], packets: [...art.querySelectorAll('.arena-packet')], partA: art.querySelector('.arena-part-a'), partC: art.querySelector('.arena-part-c'), best: art.querySelector('.arena-best'), stamp: art.querySelector('.arena-stamp')}),
  frame(p, t) {
    const u = t % this.period;
    const fade = loopFade(u, this.period);
    const judged = smooth((u - 4.6) / .5);
    p.frames.forEach((frame, i) => {
      const [x, y] = this.frames[i];
      move(frame, x, y);
      const built = clamp01((u - this.arrive[i]) / .9);
      [...frame.querySelectorAll('.arena-bar')].forEach((bar, j) => opacity(bar, smooth(built * 3 - j) * (i === 1 ? 1 : 1 - .55 * judged)));
      set(frame.firstElementChild, 'stroke', i === 1 && judged > .5 ? BRIGHT : GREEN);
      opacity(frame, fade * (i === 1 ? 1 : 1 - .5 * judged));
      const lane = p.lanes[i];
      const run = clamp01(u / this.arrive[i]);
      const point = lane.getPointAtLength(run * lane.getTotalLength());
      move(p.packets[i], point.x, point.y);
      opacity(p.packets[i], u < this.arrive[i] ? fade : 0);
      opacity(lane, (i === 1 ? .45 + .4 * judged : .45 - .25 * judged) * fade);
    });
    // Parts fold in: A's second bar and C's third bar join the winner's two bars at the right.
    const foldA = smooth((u - 5.6) / 1.6), foldC = smooth((u - 6.2) / 1.6);
    move(p.partA, lerp(262, 362, foldA), lerp(50, 132, foldA));
    move(p.partC, lerp(262, 362, foldC), lerp(200, 144, foldC));
    opacity(p.partA, u > 5.6 && u < 11.4 ? fade : 0);
    opacity(p.partC, u > 6.2 && u < 11.4 ? fade : 0);
    opacity(p.best, smooth((u - 5.2) / .6) * fade);
    opacity(p.stamp, smooth((u - 8.2) / .3) * fade);
  },
};

// lab: sliders drift on slow sines; the preview follows them.
const LAB = {
  period: 1e9,
  still: 7.5,
  tracks: [78, 120, 162],
  speeds: [[.53, .4], [.37, 2.1], [.29, 4.2]],
  markup: () => svg(`<path d="M32 36h170v168H32zM262 36h186v168H262z" opacity=".55"/>
    ${[78, 120, 162].map(y => `<path d="M56 ${y}H178" stroke="${DIM}" stroke-width="2"/><path class="lab-fill" d="M56 ${y}H56" stroke-width="2"/><circle class="lab-knob" r="7" fill="#10150f" stroke="${BRIGHT}"/>`).join('')}
    <path d="M280 186H430M280 186V52" stroke="${DIM}"/>
    <path class="lab-curve" stroke="${BRIGHT}" stroke-width="1.6"/>
    <circle class="lab-dot" r="5" fill="${BRIGHT}" stroke="none"/>
    <rect class="lab-block" y="54" height="16" fill="#1b3a24"/>`, 'A live prototype: sliders tune an easing curve and a layout block while the preview follows'),
  parts: art => ({fills: [...art.querySelectorAll('.lab-fill')], knobs: [...art.querySelectorAll('.lab-knob')], curve: art.querySelector('.lab-curve'), dot: art.querySelector('.lab-dot'), block: art.querySelector('.lab-block')}),
  frame(p, t) {
    const values = this.speeds.map(([speed, phase]) => .5 + .38 * Math.sin(t * speed + phase));
    values.forEach((value, i) => {
      const x = lerp(56, 178, value);
      set(p.fills[i], 'd', `M56 ${this.tracks[i]}H${x.toFixed(2)}`);
      set(p.knobs[i], 'cx', x.toFixed(2));
      set(p.knobs[i], 'cy', String(this.tracks[i]));
    });
    // Cubic easing from (280,186) to (430,60); sliders one and two set the control points.
    const c1 = [lerp(280, 400, values[0]), 186], c2 = [lerp(310, 430, values[1]), 60];
    set(p.curve, 'd', `M280 186C${c1[0].toFixed(1)} ${c1[1]} ${c2[0].toFixed(1)} ${c2[1]} 430 60`);
    const s = (t % 2.4) / 2.4, k = 1 - s;
    const bx = k ** 3 * 280 + 3 * k * k * s * c1[0] + 3 * k * s * s * c2[0] + s ** 3 * 430;
    const by = k ** 3 * 186 + 3 * k * k * s * c1[1] + 3 * k * s * s * c2[1] + s ** 3 * 60;
    set(p.dot, 'cx', bx.toFixed(2));
    set(p.dot, 'cy', by.toFixed(2));
    set(p.block, 'x', '288');
    set(p.block, 'width', lerp(24, 72, values[2]).toFixed(2));
  },
};

// showpiece: a scan crosses the sheet; the composed layout is revealed behind it.
const SHOWPIECE = {
  period: 11,
  still: 6,
  markup: () => svg(`<defs><clipPath id="showpiece-done"><rect class="showpiece-clip-done" x="120" y="20" width="0" height="200"/></clipPath><clipPath id="showpiece-plain"><rect class="showpiece-clip-plain" x="120" y="20" width="240" height="200"/></clipPath></defs>
    <path d="M130 26h220v188H130z" fill="#10150f"/>
    <g clip-path="url(#showpiece-plain)" stroke="${DIM}"><path d="M200 56h80M190 72h100" stroke-width="3"/><path d="M175 92h130v56H175z"/><path d="M175 162h130m-130 12h130m-130 12h90" stroke-width="2"/></g>
    <g clip-path="url(#showpiece-done)"><path d="M148 52h112M148 72h84" stroke="#f7f7f7" stroke-width="7"/><path d="M148 92h60" stroke-width="2"/><path d="M270 44h64v104h-64z" fill="#1b3a24"/><path d="M270 148 334 84M270 120 306 84M298 148 334 112" stroke="${BRIGHT}"/><path d="M148 110h96m-96 10h96m-96 10h70" stroke="${DIM}" stroke-width="2"/><path d="M148 166h186" stroke-width=".8"/><path d="M148 182h40m18 0h40m18 0h40" stroke-width="2"/><rect x="148" y="194" width="8" height="8" fill="${GREEN}" stroke="none"/></g>
    <path class="showpiece-scan" d="M0 20V220" stroke="${BRIGHT}" stroke-width="1.6"/>`, 'A generic page layout is scanned and comes out composed, with a clear headline, an image block and a green accent'),
  parts: art => ({done: art.querySelector('.showpiece-clip-done'), plain: art.querySelector('.showpiece-clip-plain'), scan: art.querySelector('.showpiece-scan')}),
  frame(p, t) {
    const u = t % this.period;
    const x = lerp(130, 350, smooth((u - .8) / 3.4) * (1 - smooth((u - 9) / 1.6)));
    set(p.done, 'width', (x - 120).toFixed(2));
    set(p.plain, 'x', x.toFixed(2));
    set(p.plain, 'width', (360 - x).toFixed(2));
    move(p.scan, x, 0);
    opacity(p.scan, x > 131 && x < 349 ? 1 : 0);
  },
};

// wow-loop: compare with the goal, repair a finding, recheck; one round per loop.
const WOW = {
  period: 12,
  still: 11,
  markup: () => svg(`<g opacity=".4"><path d="M115 30h150v155H115z"/><path d="M137 76h91m-91 22h69m-69 22h91m-91 22h55" stroke-width="3"/><circle cx="244" cy="52" r="9"/><circle cx="244" cy="52" r="3.5"/></g>
    <g><path d="M200 54h149v157H200z" fill="#10150f"/><path d="M223 99h96m-96 22h68m-68 44h96m-96 22h54" stroke-width="3"/>
    <path class="wow-line" d="M236 143h70" stroke-width="3"/>
    <g class="wow-finding" stroke="${AMBER}" opacity="0"><path d="m360 127 8 9-8 9-8-9z"/><path d="M360 131v6m0 3v1M354 152q-8 18-34 8m6-4-6 4 5 5"/></g>
    <path class="wow-scan" d="M99 50h277" stroke="${BRIGHT}" stroke-width="1.7"/>
    <g class="wow-stamp" opacity="0"><circle cx="351" cy="206" r="18" fill="#10150f"/><path d="m343 206 6 6 11-13" stroke-width="2"/></g></g>
    ${[0, 1, 2].map(i => `<circle class="wow-round" cx="${46 + i * 22}" cy="210" r="6"/>`).join('')}`, 'A result compared with its goal, a finding repaired and checked again, round after round'),
  parts: art => ({line: art.querySelector('.wow-line'), finding: art.querySelector('.wow-finding'), scan: art.querySelector('.wow-scan'), stamp: art.querySelector('.wow-stamp'), rounds: [...art.querySelectorAll('.wow-round')]}),
  frame(p, t) {
    const u = t % this.period;
    const round = Math.floor(t / this.period) % 3;
    const repair = smooth((u - 6) / 2);
    set(p.line, 'transform', `translate(${(-13 * repair).toFixed(2)} 0)`);
    set(p.line, 'stroke', u >= 3 && u < 8 ? AMBER : GREEN);
    opacity(p.finding, u >= 3 && u < 7 ? 1 : 0);
    opacity(p.stamp, u >= 10 ? 1 : 0);
    move(p.scan, 0, u < 6 ? u / 6 * 150 : (u - 6) / 6 * 150);
    p.rounds.forEach((dot, i) => { set(dot, 'fill', i <= round ? GREEN : 'none'); opacity(dot, i <= round ? 1 : .45); });
  },
};

// perf-loop: baseline run, one change, a faster run, an independent check.
const PERF_BASE = [92, 104, 88, 110, 97, 101, 90, 108, 95, 99];
const PERF_NEXT = [58, 64, 55, 61, 57, 66, 54, 60, 59, 56];
const PERF = {
  period: 12,
  still: 10.2,
  markup: () => svg(`<path d="M52 196H436M52 196V36" stroke="${DIM}"/>
    <path class="perf-baseline" d="M52 96H436" stroke="#c2d1c5" stroke-dasharray="4 5" opacity=".7"/>
    ${PERF_BASE.map((_, i) => `<rect class="perf-ghost" x="${72 + i * 34}" width="18" fill="none" stroke="${DIM}"/><rect class="perf-bar" x="${72 + i * 34}" width="18" fill="#1b3a24"/>`).join('')}
    <g class="perf-change" opacity="0"><path d="m62 50 8-8 8 8-8 8z" fill="#10150f" stroke="${BRIGHT}"/></g>
    <path class="perf-scan" d="M0 36V196" stroke="${BRIGHT}" stroke-width="1.6" opacity="0"/>
    <g class="perf-stamp" opacity="0"><circle cx="420" cy="52" r="16" fill="#10150f"/><path d="m413 52 5 5 10-11" stroke-width="2"/></g>`, 'Frame times measured against a baseline, one change made, and a faster run confirmed by an independent check'),
  parts: art => ({bars: [...art.querySelectorAll('.perf-bar')], ghosts: [...art.querySelectorAll('.perf-ghost')], change: art.querySelector('.perf-change'), scan: art.querySelector('.perf-scan'), stamp: art.querySelector('.perf-stamp')}),
  frame(p, t) {
    const u = t % this.period;
    const fade = loopFade(u, this.period);
    const settle = smooth((u - 5) / 2.4);
    p.bars.forEach((bar, i) => {
      const grow = smooth((u - .3 - i * .28) / .6);
      const h = lerp(PERF_BASE[i] * grow, PERF_NEXT[i], settle);
      set(bar, 'y', (196 - h).toFixed(2));
      set(bar, 'height', h.toFixed(2));
      set(bar, 'stroke', settle > .5 ? BRIGHT : GREEN);
      opacity(bar, fade);
      const ghost = p.ghosts[i];
      set(ghost, 'y', String(196 - PERF_BASE[i]));
      set(ghost, 'height', String(PERF_BASE[i]));
      opacity(ghost, smooth((u - 5) / .5) * fade);
    });
    opacity(p.change, smooth((u - 4.1) / .4) * fade);
    move(p.scan, lerp(52, 436, clamp01((u - 8) / 1.8)), 0);
    opacity(p.scan, u > 8 && u < 9.8 ? 1 : 0);
    opacity(p.stamp, smooth((u - 9.7) / .3) * fade);
  },
};

const ARTS = {dare: DARE, arena: ARENA, lab: LAB, showpiece: SHOWPIECE, 'wow-loop': WOW, 'perf-loop': PERF};

export function mountCardArt(root) {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const mounted = new Map();
  let raf = 0, previous = null, elapsed = 0;
  const paint = () => {
    for (const data of mounted.values()) {
      if (preference.matches) data.art.frame(data.parts, data.art.still);
      else if (data.visible) data.art.frame(data.parts, elapsed / 1000 + data.art.still);
    }
  };
  // Frames run only while a card is on screen, the tab is visible and motion is allowed.
  const sync = () => {
    cancelAnimationFrame(raf); raf = 0; previous = null;
    const active = !preference.matches && !document.hidden;
    if (active && [...mounted.values()].some(data => data.visible)) raf = requestAnimationFrame(tick);
    else paint();
  };
  const tick = now => {
    if (previous !== null) elapsed += Math.min(now - previous, 64);
    previous = now; paint(); raf = requestAnimationFrame(tick);
  };
  const visibility = new IntersectionObserver(entries => {
    entries.forEach(entry => { const data = mounted.get(entry.target); if (data) data.visible = entry.isIntersecting; });
    sync();
  });
  root?.querySelectorAll('.cmd-card__media[data-art]').forEach(media => {
    const art = ARTS[media.dataset.art];
    if (!art) return;
    const host = document.createElement('div');
    host.className = 'card-art';
    host.innerHTML = art.markup();
    media.append(host);
    const data = {art, host, parts: art.parts(host), visible: false};
    mounted.set(media, data);
    art.frame(data.parts, art.still);
    visibility.observe(media);
  });
  document.addEventListener('visibilitychange', sync);
  preference.addEventListener('change', sync);
  return () => {
    visibility.disconnect();
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', sync);
    preference.removeEventListener('change', sync);
    for (const data of mounted.values()) data.host.remove();
    mounted.clear();
  };
}
