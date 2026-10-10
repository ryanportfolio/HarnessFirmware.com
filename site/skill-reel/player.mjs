// Skills reel player on /skills: the whole reel, drawn live by ./reel.mjs into one canvas.
// Until the visitor presses play the figure shows its poster (posters/reel.webp, an intro frame made by
// scripts/skill-reel-posters.mjs) and this file is all that has loaded: ./reel.mjs, the kit and the
// nine scenes load on first play, or ahead of it when the pointer or focus reaches the play button.
// Never autoplays and makes no sound. Pauses when less than half of it is on screen or the tab is
// hidden, and stays paused until the visitor presses play again. While it plays (or prepares to) it
// sends `skill-reel:busy` on document with detail true, and false once it stops, so the card loops
// below (cards.mjs) hold their frames and the page keeps its frame rate.

const DPR_CAP = 1.5;
const DT_CAP = 0.1; // seconds; a long frame never jumps the reel forward more than this
const SEEK_STEP = 5; // seconds per arrow key on the scrubber
const RESIZE_SETTLE = 150; // ms the box size must hold before the canvas is rebuilt at the new size
const MB = 1024 * 1024;

const fmt = (s) => {
  const v = Math.max(0, Math.floor(s + 1e-6));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
};
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

function mount(fig) {
  const $ = (sel) => fig.querySelector(sel);
  const stage = $('.sr-reel-stage'), poster = $('.sr-reel-poster'), start = $('.sr-reel-start');
  const bar = $('.sr-reel-bar'), toggle = $('.sr-reel-toggle'), range = $('.sr-reel-range');
  const ticks = $('.sr-reel-ticks'), time = $('.sr-reel-time'), now = $('.sr-reel-now'), fsBtn = $('.sr-reel-fs');
  const cv = document.createElement('canvas');
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', poster.alt);
  stage.appendChild(cv);
  const ctx = cv.getContext('2d');

  // state
  let lib = null, kit = null, scenes = null, reel = null, loading = null;
  let t = 0, playing = false, ended = false, painted = false, raf = 0, last = null;
  let prep = []; // prepare steps still to run for the current canvas size
  let warmed = new Set(), warmT = -1, busy = false;

  const setBusy = (on) => {
    if (on === busy) return;
    busy = on;
    document.dispatchEvent(new CustomEvent('skill-reel:busy', { detail: on }));
  };

  // Loads the renderer and the scenes; resolves false if anything failed (the poster stays).
  const load = () => (loading ||= Promise.all([import('./reel.mjs'), import('./kit.mjs')])
    .then(async ([r, k]) => {
      lib = r;
      kit = k;
      scenes = await r.loadReel();
      reel = r.buildReel(scenes);
      buildTicks(); // the scrubber gets its chapters and the time its length as soon as they are known
      show();
      return true;
    })
    .catch((err) => {
      console.error('[skill-reel] the reel could not load; keeping its poster:', err);
      fig.classList.add('is-unavailable');
      return false;
    }));

  // The canvas fills the stage's content box at a device pixel ratio capped at DPR_CAP.
  const size = () => {
    const r = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const bw = Math.max(16, Math.round(r.width * dpr)), bh = Math.max(9, Math.round(r.height * dpr));
    if (cv.width === bw && cv.height === bh && prep.length === 0 && painted) return false;
    cv.width = bw;
    cv.height = bh;
    // the reel draws nine scenes' full-size layers in turn: hold the working set (about 25 layers)
    kit.setLayerBudget(Math.max(96 * MB, 30 * bw * bh * 4));
    prep = lib.prepareSteps(ctx, reel, scenes);
    warmed = new Set();
    return true;
  };

  const paint = () => {
    try {
      lib.drawReel(ctx, reel, scenes, t);
    } catch (err) {
      console.error('[skill-reel] the reel threw; keeping its poster:', err);
      fig.classList.add('is-unavailable');
      pause();
      return;
    }
    if (!painted) {
      painted = true;
      fig.classList.add('is-live');
    }
  };

  const chapterAt = (x) => {
    let c = null;
    for (const ch of chapters) if (ch.t <= x + 1e-6) c = ch;
    return c;
  };
  let chapters = [];
  const show = () => {
    const total = reel ? reel.total : 0;
    const ch = reel ? chapterAt(t) : null;
    time.textContent = reel ? `${fmt(t)} / ${fmt(total)}` : '0:00';
    now.textContent = ch ? ch.name : '';
    if (reel) {
      range.max = String(total);
      if (document.activeElement !== range || !dragging) range.value = String(t);
      range.style.setProperty('--p', `${(t / total) * 100}%`);
      range.setAttribute('aria-valuetext', `${fmt(t)} of ${fmt(total)}${ch ? ', ' + ch.name : ''}`);
      for (const b of ticks.children) b.classList.toggle('is-current', ch && b.dataset.t === String(ch.t));
    }
    const label = playing ? 'Pause the reel' : ended ? 'Replay the reel' : 'Play the reel';
    toggle.setAttribute('aria-label', label);
    toggle.dataset.state = playing ? 'pause' : ended ? 'replay' : 'play';
    start.querySelector('span').textContent = ended ? 'Replay the reel' : 'Play the reel';
    start.setAttribute('aria-label', ended ? 'Replay the reel' : 'Play the reel');
    fig.classList.toggle('is-playing', playing);
    fig.classList.toggle('is-ended', ended);
  };

  // One frame: run a pending prepare step before playback starts or after a resize, else advance.
  const frame = (ts) => {
    raf = 0;
    if (!reel) return;
    if (prep.length) {
      prep.shift()();
      if (!prep.length) last = null;
      if (!prep.length || playing) paint(); // the step may have drawn on the canvas; put t back
      raf = requestAnimationFrame(frame);
      return;
    }
    if (playing) {
      if (last !== null) t += Math.min(DT_CAP, (ts - last) / 1000);
      last = ts;
      if (t >= reel.total) {
        // hold the end slate
        t = reel.total - 1e-3;
        playing = false;
        ended = true;
      }
      paint();
      if (playing) {
        if (t < warmT) warmed.clear();
        warmT = t;
        lib.warmStep(reel, scenes, cv, t, warmed);
      }
      show();
    }
    if (playing) raf = requestAnimationFrame(frame);
    else {
      last = null;
      setBusy(false);
    }
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  const buildTicks = () => {
    chapters = [];
    if (reel.opener) chapters.push({ t: reel.opener.a, name: scenes[0].name });
    for (const L of reel.loops) if (!(L.i === 0 && reel.opener)) chapters.push({ t: L.a, name: L.sc.name });
    ticks.replaceChildren(...chapters.map((ch, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sr-reel-tick' + (i % 2 ? ' is-odd' : '');
      b.dataset.t = String(ch.t);
      b.style.left = `${(ch.t / reel.total) * 100}%`;
      b.tabIndex = i === 0 ? 0 : -1;
      b.setAttribute('aria-label', `Go to ${ch.name}, ${fmt(ch.t)}`);
      const s = document.createElement('span');
      s.textContent = ch.name;
      b.appendChild(s);
      return b;
    }));
  };

  // Gets the reel ready to show frames: load, size, then the prepare steps run one per frame.
  let ready = null;
  const ensure = () => (ready ||= load().then((ok) => {
    if (!ok) return false;
    size();
    return true;
  }));

  const play = async () => {
    if (playing) return;
    setBusy(true);
    fig.classList.add('is-loading');
    fig.setAttribute('aria-busy', 'true');
    const ok = await ensure();
    fig.classList.remove('is-loading');
    fig.removeAttribute('aria-busy');
    if (!ok) { setBusy(false); return; }
    if (ended || t >= reel.total - 0.01) { t = 0; ended = false; }
    playing = true;
    last = null;
    show();
    kick();
  };
  function pause() {
    if (!playing) return;
    playing = false;
    show();
    // frame() releases busy once it sees the pause; without a pending frame do it here
    if (!raf) setBusy(false);
  }
  const togglePlay = () => (playing ? pause() : play());

  const seek = async (x) => {
    if (!(await ensure())) return;
    t = Math.max(0, Math.min(reel.total - 1e-3, x));
    ended = false;
    last = null;
    if (!playing) {
      // a paused seek paints at once; pending prepare steps (first seek or resize) run first
      while (prep.length) prep.shift()();
      paint();
    }
    show();
  };

  // controls
  for (const b of [start, toggle]) b.addEventListener('click', togglePlay);
  const prefetch = () => { load(); };
  for (const b of [start, toggle]) {
    b.addEventListener('pointerenter', prefetch, { once: true });
    b.addEventListener('focus', prefetch, { once: true });
  }
  let dragging = false;
  range.addEventListener('pointerdown', () => { dragging = true; load(); });
  addEventListener('pointerup', () => { dragging = false; });
  range.addEventListener('input', () => seek(Number(range.value)));
  range.addEventListener('keydown', (e) => {
    if (!reel) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        ensure().then((ok) => ok && range.dispatchEvent(new KeyboardEvent('keydown', { key: e.key })));
      }
      return;
    }
    const list = chapters.map((c) => c.t);
    let x = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') x = t - SEEK_STEP;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') x = t + SEEK_STEP;
    else if (e.key === 'PageDown') x = list.find((c) => c > t + 0.05) ?? reel.total;
    else if (e.key === 'PageUp') x = [...list].reverse().find((c) => c < t - 0.5) ?? 0;
    else if (e.key === 'Home') x = 0;
    else if (e.key === 'End') x = reel.total;
    if (x === null) return;
    e.preventDefault();
    seek(x);
  });
  // chapter ticks: one tab stop, arrows move between them, Enter or Space jumps
  ticks.addEventListener('click', (e) => {
    const b = e.target.closest('.sr-reel-tick');
    if (b) seek(Number(b.dataset.t));
  });
  ticks.addEventListener('keydown', (e) => {
    const list = [...ticks.children];
    const i = list.indexOf(document.activeElement);
    if (i < 0) return;
    let j = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = Math.min(list.length - 1, i + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = Math.max(0, i - 1);
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = list.length - 1;
    if (j === null) return;
    e.preventDefault();
    list[i].tabIndex = -1;
    list[j].tabIndex = 0;
    list[j].focus();
  });
  // Space or k toggles while focus is in the player (a focused button keeps Space for itself)
  fig.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const onButton = e.target.closest('button');
    if (e.key === 'k' || e.key === 'K' || (e.code === 'Space' && !onButton)) {
      e.preventDefault();
      togglePlay();
    }
  });

  // full screen: the figure (stage and controls) fills the screen
  const canFs = document.fullscreenEnabled || document.webkitFullscreenEnabled;
  if (canFs) {
    fsBtn.hidden = false;
    fsBtn.addEventListener('click', () => {
      if (fsElement() === fig) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (fig.requestFullscreen || fig.webkitRequestFullscreen).call(fig);
    });
    const onFs = () => {
      const on = fsElement() === fig;
      fig.toggleAttribute('data-fullscreen', on);
      fsBtn.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen');
      fsBtn.dataset.state = on ? 'exit' : 'enter';
    };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
  }

  // pause when less than half of the player is on screen (in full screen it always is), or the tab hides
  new IntersectionObserver((entries) => {
    for (const e of entries) if ((!e.isIntersecting || e.intersectionRatio < 0.5) && !fsElement()) pause();
  }, { threshold: [0, 0.5] }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  // a settled size change rebuilds the canvas and its prepared layers (one step per frame)
  let resizeTimer = 0;
  new ResizeObserver(() => {
    if (!reel || !painted) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!size()) return;
      if (playing) kick();
      else seek(t);
    }, RESIZE_SETTLE);
  }).observe(stage);

  bar.hidden = false;
  start.hidden = false;
  fig.classList.add('is-ready');
  show();
}

const fig = document.querySelector('[data-reel-player]');
if (fig) mount(fig);
