# Skills reel: build spec

Read with `BRIEF.md` (decisions), `facts.md` (truth: every on-screen string and every mechanism detail must be supported there), `pitches/A-bench.md` sections 2 and 3 (kit, behaviours, loop law, per-scene beat sheets), and the animatic scenes in `docs/skill-reel/animatic/scenes/` (approved timing and mechanism). Craft rules: `C:\Users\Home\.claude\skills\motion-design\SKILL.md` and its references; load them, do not work from memory.

## Quality bar

The `/why` style frame (`site/skill-reel/scenes/why.mjs`, stills in `D:\screenshots\HarnessFirmware.com\skill-reel\styleframe\`) is the bar. Every scene draws at that level with the shared kit `site/skill-reel/kit.mjs`: the oblique bench, a lamp pool on the active station with idle parts dimmer, real instrument parts, materials with gradients and lit edges, contact shadows, hatching on cut faces, quiet centre and dimension lines, springs and damped settles, and grain. Same clarity as the animatic: one instrument, one idea, readable at a glance on a 480x270 card.

The owner's verdict on the animatic: "on one hand I like the simplicity and ease of understanding, clear and to the point, but the fidelity/quality is horrible." Keep the first half and fix the second.

## Layout

```
site/skill-reel/base.mjs         stage constants, easing, seeded rng (from the animatic kit.js; do not edit)
site/skill-reel/kit.mjs          final-fidelity shared look (do not edit; put helpers in your scene file and propose kit additions in your report)
site/skill-reel/scenes/<id>.mjs  one scene per skill
site/skill-reel/cards.mjs        mounts looping card canvases on the skills page (integration agent)
docs/skill-reel/reel/            reel player and MP4 export harness, not deployed (integration agent)
```

## Scene contract

```js
import { ... } from '../kit.mjs';
export default {
  id: 'merge',                // merge | deep-plan | long-horizon | smart-compact | why | wow-loop | perf-loop | arena | showpiece
  name: '/merge',
  kind: undefined,            // 'mod' for smart-compact only
  caption: '...',             // reel caption line, from BRIEF.md / pitch A 5.2
  period: 10.0,               // seconds; keep the animatic's period
  draw(ctx, t) {},            // pure function of t in [0, period); ctx is in 1920x1080 logical space, ground not drawn (draw your own bench via the kit)
  opener: {                   // merge only, reel only
    duration: 5.5,
    draw(ctx, t) {},
    captions: [{ from: 0.4, to: 2.4, name: '', line: 'Every PR from Claude Code gets a Codex review' }, { from: 3.0, to: 5.5, name: '/merge', line: '...' }],
  },
};
```

Rules for every scene:
- Pure function of t. No state across calls, no `Math.random`, no `Date`, no `ctx.setTransform`. Static-layer caches keyed by size are fine if output is identical.
- Seamless loop: pixels at t = 0 equal t = period - 1e-6, velocity matched.
- The caption band y 60 to 220 stays empty. Card loops carry no drawn words except arena's neutral letters, the Fraunces key caps (the person's words), and merge's opener plates (reel only).
- Colours: site palette only (`P` in kit.mjs). Steel = Codex, merge only. Clean green outline = fresh agent; hatched green = the session. Amber = a defect or rejected result, a different physical form per scene. No saturated red, no 1 px coloured lines.
- Flash limits per motion-design. At most a few parts moving at once.
- 60 fps at 1080p on this machine; cache static layers.

## Per-scene decisions (from BRIEF.md)

- merge: no CI anywhere. Codex never marks the work; findings hang as amber tags on a rail beside the stack. The reel-only opener is 5.5 s: (a) 0 to 2.5 s, a PR stack arrives and the single Codex tip with plate `/codex-review` swings in by itself, with no key pressed, touches it and leaves (caption line "Every PR from Claude Code gets a Codex review", no name); (b) 2.5 to 5.5 s, the gang head with plate `/codex-fullreview` lowers, a shared plate `Latest Sol` on the Codex housing, then the person's key `/merge` presses and latches (caption name `/merge`, line "every PR goes through the Codex loop and merges when clean"). The opener ends exactly on the loop's t = 0 pose. No model id anywhere.
- smart-compact: `kind: 'mod'`.
- why: polish the style frame's open items: chamfered vice jaws with shadow under the jaw tops; the gusset slides under the bowed arm, not in front of it; the seated gusset reads clearly as a separate fitted plate; the outgoing bracket clearly feeds out right in the seam; the parked session hand must read as a tool at rest.
- perf-loop: no numbers.

## Verification each builder runs

playwright-core is installed in the worktree. Launch your own headed Chrome with `launchPlacedChrome({ channel: 'chrome' })` from `scripts/lib/launch-chrome.mjs` (falls back without channel; it parks offscreen). Never headless, never minimized, one browser per agent. Serve the repo root with `PORT=<your port> node docs/skill-reel/animatic/serve.mjs` on the port given in your brief, and stop it when done. You may need a small harness page under `.tmp/` (gitignored) that loads only your scene and exposes `renderAt(t)`; do not edit `docs/skill-reel/animatic/animatic.js` (another agent owns the reel).

Captures go to `D:\screenshots\HarnessFirmware.com\skill-reel\build\<id>\` (check D: is writable; fall back to `.tmp/` and say so): stills at 1920x1080 and 480x270 for at least five beats, plus a 4-up contact strip at p = 0, .25, .5, .75 at card size. Measure fps over 5 s at full view; check seam pixels (t = 0 vs period - 1e-6) and seek stability. Look at your own stills critically against the `/why` stills and iterate at least twice. Watch at natural speed too: sample frames every 1/30 s across one loop and look at a contact sheet of a whole beat for motion problems (pops, collisions mid-transition, dead holds).

Do not commit. Report: files, what each beat looks like, fps, seam and seek results, still paths, open weaknesses.

## Card copy (HTML, beside each card; integration agent sets these)

Final wording passes the `writing` skill. Sources are in facts.md.

- /merge: Type /merge once. Each PR this session touches gets a Codex review with fresh reviewers, Claude fixes what holds up, Codex rechecks, and it merges when clean.
- /deep-plan: Turns a loose idea into a plan made of your decisions: a few questions per round, a recommended answer you can override, and nothing built until you say Go.
- /long-horizon: For work too big for one context window. Each round a fresh agent builds one step, a separate fresh auditor checks it, and only checked steps count as progress.
- /smart-compact (mod): Type /smart-compact when you want to compact. A fork reads the whole session, writes what to keep (goal, state, decisions, next step), then runs /compact with it.
- /why: Run /why on a recommendation before acting on it. One fresh reviewer sees only the pick and hunts for weak spots; the pick is refined, confirmed or overturned.
- /wow-loop: For visual work held to a written bar. Two fresh critics judge it from their own captures, the builder fixes what fails, and it passes only when they can't break it.
- /perf-loop: To make something faster: measure a baseline, change one thing per round, rerun the same workload, and keep only gains that repeat and a fresh reviewer confirms.
- /arena: When the right shape is unclear: fresh agents build separate versions, a blind judge checks each against the criteria, and one version becomes the base that takes the others' best ideas.
- /showpiece: For work that shouldn't look generic. It studies the real subject, proves the idea on a small specimen, then pushes past what people expect from its kind.
