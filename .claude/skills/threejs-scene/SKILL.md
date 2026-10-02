---
name: threejs-scene
description: Design, build and prove one three.js scene (hero, background, product or diagram) that people remember. Use on /threejs-scene, for a new WebGL scene, or when one reads generic, feels rushed, clips or stutters.
---

# three.js scene

People remember how a site made them feel. This skill aims a scene at one feeling and one moment, then proves it with pictures: every pixel is a function of scene time, so any moment can be frozen with `?t=` and judged as a frame, and the timeline can be laid out as a strip and watched as a video.

Two kinds of check, never confused:

- **Defect gates** (machine): console, repeatability, layout, intersections, fallbacks, budgets. They prove the scene is not broken, and nothing more.
- **Quality gates** (eyes): idea, feeling, peak, look, pacing. Only the user or a fresh judge passes these, by comparison (step 7). The builder never grades its own taste.

Read [references/checklist.md](references/checklist.md) first, start the brief from [references/brief-template.md](references/brief-template.md), and take recipes from [references/techniques.md](references/techniques.md) and [references/feel.md](references/feel.md).

## When not to use it

If a 2D canvas, SVG or CSS gives the same picture, do not ship three.js. Proof or numbers: HTML, SVG or a chart. A story with many steps: an explainer section, not a hero. One full-screen shader: raw WebGL on one quad. Pre-rendered cinematic: video scrubbed by scroll. 2D or CSS motion: a motion skill such as `motion-design` if installed. A project on React Three Fiber or Babylon: build in that. Slow after this skill: `/perf-loop`. Stuck on taste: `/wow-loop` (step 8).

## 1. Idea and feeling

Write two sentences before anything else:

- **The idea:** what a visitor understands in about three seconds, with no caption. More than four beats to say it means it is an explainer: move it below the fold and pick one moment of it for the hero.
- **The feeling:** what it should make people feel, stated as a physical moment ("the hush when a gallery light comes up on one object"), never an adjective ("premium", "sleek").

Test: describe the settled frame to someone who has never seen the product. If that sentence carries neither the idea nor the feeling, change the idea.

## 2. Diverge, then direct

Make three directions, each a different metaphor with its own key frame (and a concept image when a generator is available). Same idea and feeling, different worlds. Then write the brief from the template for the chosen one:

- **Reference board:** three to five real references, each with the one thing to take (a light ratio, a material, a camera height, a rhythm).
- **Key frame:** camera height and lens, what fills the frame, light direction, darkest and brightest areas, where the eye lands. The settled end frame must work as a poster.
- **Signature moment:** the one thing a visitor would describe to a friend. It gets the slowest anticipation and the longest hold; every other beat serves it. The settled frame stays the end.
- **Tactile response:** what the material does under the pointer or a touch, with weight (spring, inertia, damping), answering within one frame, with a touch equivalent on phones.
- **Techniques:** each effect with the method's name and a source link (for example Tessendorf FFT ocean, Wallace caustics, Hillaire atmosphere, shell texturing, PBF). Named methods get the real technique; unnamed ones get a guess.
- **Light plan, materials, storyboard, palette and color pipeline, stop point:** as in the template.

**Brand fit:** the first entry on every reference board is the site itself: screenshots of its existing pages and sections. Put each key frame beside them; a direction that would look at home on another company's site is out, however well it scores against outside references. Blind wins against an earlier prototype and an outside painter's look said nothing about this: a painterly interior beat the earlier lab prototype in every blind A/B and was still scrapped by the owner as off brand.

**Gate A:** the user picks a direction and approves the brief, reference board and key frame before any code. Unattended, a fresh judge picks one and says why, and its objections go into the brief; brand fit is then the first thing the user checks on return.

## 3. Banned defaults

A default is banned when it is a reflex: the scene could be pasted into an unrelated product unchanged (paste test), or deleting it loses nothing (removal test). Name the job of anything that looks like these, or remove it; never add an effect to make up for one removed.

- A lone primitive turning on its axis; `OrbitControls` with `autoRotate` (allowed for product inspection).
- Random points as a starfield, galaxy swirls, floating dust with no job.
- `MeshNormalMaterial` rainbow; untouched grey `MeshStandardMaterial`; boxes with text textures standing in for real objects.
- Purple, blue and cyan neon; bloom on everything; radial lights with no source; a shader as ornamental noise.
- Camera at `(0, 0, 5)`, fov 75; a camera that never moves when the composition needs it to.
- One ambient plus one directional light at default intensity; flat light with no falloff.
- `GridHelper` or a tron floor; fog that does not match the background.
- Everything moving at once; every move on the same ease and duration; dead-still holds; an idle that visibly loops.
- Camera lerped toward the mouse as the only interaction.
- Detail finer than 12 px per period at 1440; reduced motion that only shortens.
- `Math.random()` in the render loop; three.js from a CDN; uncapped `setPixelRatio(devicePixelRatio)`.

The project's brand outranks this list.

## 4. Pacing

- **One focus at a time:** one thing moves with intent; the rest holds.
- **Holds breathe:** during a hold, motion just below notice (under about 2 percent amplitude, slow, periods that do not divide evenly), so the scene is alive without competing with the focus.
- **Every beat:** anticipation (about 0.15 to 0.3 s), action, a hold of at least 1.2 s and one second per three words of text it brings. The signature moment gets the longest of each.
- **Vary the timing:** big moves slow, small moves quick, 10 to 30 percent overlap, no two consecutive moves on one ease and duration.
- **Camera:** moves when attention moves, settles before a hold, never moves during a read.
- **Length:** about 6 to 12 s to the settled frame. Then design the idle and the exit as the visitor scrolls away. When the owner wants a piece that never settles (rounds that keep running), record that exception in the brief: the first 6 to 12 s must still carry the idea alone, the endless part must visibly change in one direction rather than repeat, and it gets a pause control.

Numbers and recipes: references/feel.md.

## 5. Build contract

Hooks the shoot drives. They stay in shipped code.

- `?t=<seconds>` freezes the scene clock, renders, and stops. Motion is a function of scene time plus seeded randomness; state that cannot be (pointer springs, simulations) is listed in the brief as exempt.
- `?gl=0` forces the fallback: an `<img data-scene-fallback>`, which the shoot checks is shown and decoded. A page with more than one canvas passes the scene's to the shoot with `--canvas <css>`.
- `<html data-scene>` becomes `ready` in the `requestAnimationFrame` after the first frame, or `fallback`. Before `ready`: `await document.fonts.ready` if text is measured or drawn, and `await renderer.compileAsync(scene, camera)` with every beat's objects visible.
- `window.__scene = { duration, frames, info, labels, intersections }`: timeline length; frame counter (a number, incremented per rendered frame); `info()` returning one flat object, `{ calls, triangles, programs, geometries, textures, pixelRatio }`, read from `renderer.info.render`, `renderer.info.memory`, `renderer.info.programs.length` and the renderer; `labels()` with screen rects of in-canvas labels; `intersections()` with solid objects whose oriented boxes overlap. Optional `lines()`: screen polylines of light lines (threads, glowing strokes); the shoot fails any that passes under `--overlay` text.

Behaviors, each with the failure it prevents:

- **First second:** frame 0 matches the load poster shown under the canvas before WebGL starts, so the handoff cannot be seen and nothing pops in. The no-WebGL fallback is a different image: the settled frame, which carries the idea.
- Pixel ratio capped at 1.5 or the project's cap. Uncapped DPR 3 renders 4x the pixels.
- One camera owner, one camera write per frame. Two writers jitter.
- Tone map and encode color once. A second pass shifts every brand hex.
- DOM that tracks the scene is set from scene time every frame, no CSS transitions. Transitions make two shots of one `?t=` differ.
- Frame the subject in the space the overlay text leaves (`camera.setViewOffset`), at both widths.
- The loop stops off screen and on a hidden tab, resumes with a reset time base, clamps dt to 1/30 s.
- `ResizeObserver` sizing that skips zero sizes; `webglcontextlost` shows the fallback.
- `prefers-reduced-motion: reduce` renders the brief's reduced-motion `t` once; the tactile response stays, without its spring overshoot.
- Decorative canvas `aria-hidden`; a meaningful interaction has a DOM control. Sound, if any, starts only on a user click.
- three.js from the project's origin; without a bundler, vendor a tree-shaken bundle and record the command.

## 6. Rounds

Build in this order; each stage has its own gate.

1. **Animatic.** Grey boxes, final camera, final timing. Shoot with `--strip 0.25 --final` for the strip and a real-speed video. **Gate B (pacing):** the user watches the live page at full speed; otherwise a fresh judge gets the strip (timing) and the video (ease and frame pacing).
2. **Look development.** Light and materials on the key frame only, frozen with `?t=`. **Gate C (look):** comparison, step 7.
3. **Full build.** Detail, every beat, the tactile response, both widths. Defect gates every round.
4. **Polish.** The three weakest things, plus the one strongest thing pushed further.

Before every shoot, confirm the server serves the latest edit (a sentinel string); do not edit served files during a shoot; open full-size frames before fixing anything seen on a sheet.

## 7. Judge by comparison

"Is it good" gets a polite yes. Every quality gate puts the scene beside the reference board and two or three standouts from an `/inspiration` report, when one exists, and asks which one a person would stop scrolling for, and why.

**Blind read** (when the builder claims a pass, and in the final round): a fresh subagent with [templates/blind-read.md](templates/blind-read.md) gets the scene-only sheets, the strip and the comparison set, never the brief. It reports what the scene says, what it makes it feel, and its signature moment. A mismatch with the idea, the feeling or the signature moment fails.

## Shoot

`node .claude/skills/threejs-scene/scripts/shoot.mjs <url> --times <t,...> --out <dir> --labels <css> --overlay <css,css> [--strip <step>] [--poster] [--final]`

Headed Chrome through `scripts/lib/launch-chrome.mjs`. Writes frozen frames at 1440x900 and 390x844 (DPR 2), labelled sheets, scene-only crops, reduced-motion and fallback frames, and `report.json` (console, repeatability, ready time, `info()` and intersections at every t, layout fails, off-screen and reduced-motion counts). `--strip <step>` adds timing sheets at 1440, 24 frames each. `--final` adds an uncapped perf run, a forced context loss, memory numbers and a real-speed video. Screenshots go under the project's screenshot location in `scene-<name>/round-<n>/`.

## 8. Stop

Stop at the first of these:

- Every defect gate passes, gates A, B and C passed, the blind read matches, and the user (when present) says it is good.
- The same weakness survives two fixes: escalate to `/wow-loop` with the brief as its spec and the checklist as its gating checks, or give the user two concrete options.
- The round cap is reached: hand over with the open weaknesses named.

Gates are pass, fail or blocked; never relax one. Never report a scene as done on defect gates alone.

## Handover

The three directions and the pick; the brief with reference board, key frame, signature moment and tactile response; final sheets, strip and video; reduced-motion and fallback frames; the blind read and the comparison verdicts; `report.json` numbers; the round log with each gate's verdict and who gave it; and what was not judged: feel on a real phone, phone GPU cost.
