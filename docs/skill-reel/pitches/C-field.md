# Pitch C: Field studies

Nine plates from a naturalist's notebook. Each skill is one natural or material process, drawn as a precise line and particle study in the site's palette: refraction, tidal deposits, a leaf skeleton, rimstone pools, load on ice, an orb web in weather, granular flow, grafting, crystal habit. No machines, no instruments, no letterforms doing physics. The processes do the explaining.

Sources: every mechanism claim below cites the recon files under `docs/skill-reel/recon/` with their own keys (M, CR, CF, IRa for `merge-codex.md`; LH, SCR, SCP, DP for `lh-compact-plan.md`; `why/`, `wow-loop/`, `perf-loop/` paths for `why-wow-perf.md`; A and S for `arena-showpiece.md`). Avoid-list references point at `design-and-avoid.md` section B and `site-map.md` section 2.

## 1. Direction and feeling

**Field studies.** When the reel ends, the viewer feels the calm of watching nine processes run to rest, and knows what each skill does, what outside check tests the work, and where the person steps in.

Why nature: every skill in the set is a process with a cause, a test and a result that holds or fails. Natural processes show that without boxes or arrows (inspiration.md B3: arrows only as paths something travels). Light bends where glass has a flaw; ice cracks where it is thin; a crystal's shape comes from its own material. A stranger reads those before reading a word.

## 2. The shared kit

### Stage: the plate

- Ground `#0f1210` (ink) with the site grain tile at .05, stepped jitter off (the reel exports to video; a fixed seed per frame keeps it deterministic).
- A hairline plate border at `rgba(243,243,236,.16)`, inset 4% of the short side, with small `+` registration crosses at the four corners. Not the skills page's L-brackets (design-and-avoid A7).
- **The datum**: one horizontal hairline at 62% of plate height, paper at .22, present in all nine plates. It is always "the surface" of that plate's world: pool surface, sea level, the specimen sheet's fold, terrace lip, far shoreline, the branch, the gully mouth, soil, dish rims. In the reel the datum never cuts: it changes material from scene to scene, which is how the reel morphs.
- Card plate 480x270. Reel plate 1600x900 placed at the top of the 1920x1080 frame, centred, with a 180 px caption band below it, the way a figure caption sits under a plate. Stroke widths scale by the square root of the zoom (1.2 on the card, about 2.2 in the reel), not linearly.

### The work unit: the grain

A small almond (vesica) about 10x6 px on the card, paper `#f3f3ec` stroke 1.2, occluding fill `#10150f`. It appears in every plate as the thing being worked on:

| Plate | The grain is |
|---|---|
| /merge | the glass bead on the thread (one PR) |
| /long-horizon | the grains that settle into one round's layer |
| /smart-compact | the leaf, enlarged (the vesica is a leaf outline) |
| /deep-plan | each pool basin, seen from above (one question) |
| /why | the pick on the far bank |
| /wow-loop | the web's hub |
| /perf-loop | the grain whose run is timed |
| /arena | the seed in each plot |
| /showpiece | the seed crystal |

### Colours: one hue per actor

| Hue | Actor | Rule |
|---|---|---|
| green `#53db76`, bright `#72f28c` while a line is being written | the Claude session: builder, manager, executor, fixer, parent, fork | Only green changes the specimen. |
| amber `#efc87e` | a fresh outside eye: reviewer, auditor, critic, judge | Amber never changes the specimen. It passes through or presses on it and leaves traces. What it reveals shows in amber, which keeps the site's "amber is a finding" reading (design-and-avoid A3). |
| amber entering from beyond the plate edge | Codex | Only in /merge. Same-vendor fresh eyes start inside the plate; Codex's light comes from outside it, so cross-vendor is a visible fact, not a label (CR:7, CF:8). |
| paper `#f3f3ec` | the user, and the specimen's own structure | Only the user places pins. |
| dim `#3e5a45` | history: baselines, earlier layers, previous runs | Drawn as a function of p, never a buffer (inspiration.md B2). |
| paper hatching at .12 to .2 | media: water, air, solution, ice | Media drift; actors do not. |

### Type

- Cards: no drawn text. The HTML description sits beside the card.
- Reel caption band: the command in Departure Mono at 34 px, paper at .8; under it the line in Lineal 781 at 54 px, tracking -0.015em, paper, with one accent word in Fraunces Italic green. Words arrive with a 70 ms stagger, cumulative, no blur (story.md captions; design-and-avoid C2 on blur cost). No periods.
- Small in-scene mono labels only where noted (/merge only).

### Named behaviours

Nothing moves except through these.

1. **Drift.** Media move by seeded noise sampled on a circle, `(R cos 2πp, R sin 2πp)`, so they close at the seam at constant speed (inspiration.md section 1, Jacob, Alexander-Adams). Only media drift.
2. **Settle.** Accepted work comes to rest with a quint ease-out (`0.22,1,0.36,1`) and stays. Nothing that has settled moves again except by subsidence or turn.
3. **Pass through.** The outside eye is always a medium crossing the specimen: light, a tide's absence and a core, pressure, wind and dew, a re-run grain, a measuring rod. It leaves traces (glints, rings, afterimages, notches) and never alters the specimen.
4. **Pin.** The user's act: a round paper pin presses in on a spring (visual duration 300 ms, bounce .2) and stays until the act is spent. One gesture, the same in every plate where the person acts (inspiration.md A1). Never a person glyph, never a gate (design-and-avoid B9 items 7).

Two loop devices sit under the behaviours:

- **Subside.** The whole specimen sinks at constant speed by one unit per loop while one unit is added, so the frame at p = 1 equals p = 0 (Jacob's replacement queue, inspiration.md section 1). Used by /long-horizon and /perf-loop.
- **Turn.** The finished plate slides left at constant speed while a fresh one arrives from the right, straddling the seam so the speed matches across it (Holden, inspiration.md section 1). Used by /deep-plan, /wow-loop, /arena.

Easing defaults follow the motion-design skill: arrivals ease out, exits ease in at about 75% of the entrance time, on-screen moves ease in-out, nothing scales up from 0 (starts at .9 or arrives from out of frame). Every scene holds its payoff still for at least 1.5 s with only shimmer allowed. Glints stay under 20% of the frame and at most 3 per second.

## 3. The nine plates

Each module computes `p = (t mod T) / T` and never renders p = 1. Times below are seconds within the loop.

### 3.1 /merge: refraction (T = 10.0 s)

**Metaphor.** A pull request is a glass bead sliding down a thread from a pin. Codex's light enters from beyond the plate, splits through a prism into several rays on the first pass and a single ray after that; where a ray meets a flaw inside the bead, it glints. Green clears what the light found. The clean bead drops into the pool as one drop.

**Why this picture.** It is the only plate whose outside eye is light from another source, the only one that changes from many rays to one (round 1 `/codex-fullreview`, reruns `/codex-review`, M:51, M:53), and the only one where the pin is placed once and never again: one `/merge` covers every PR the session touches (M:15-18). The rays only illuminate; the bead changes only when green acts, because Codex runs read-only and Claude fixes (CF:43, M:29, M:63).

| t | Beat |
|---|---|
| 0.0 | Pin at top-left, already in. A thread runs from it down to a point above the pool. Prism at upper right, unlit. Pool surface (the datum) flat. The next bead is hidden under the pin head. |
| 0.0 to 1.4 | The bead slides out from under the pin head and down the thread (ease in-out), stopping in the light's path. Three faint specks sit inside it. |
| 1.4 to 1.8 | An amber beam enters from the right edge of the plate and reaches the prism. |
| 1.8 to 3.4 | The prism fans the beam into six rays that draw in with a 60 ms stagger and converge on the bead from different angles. Where a ray crosses a speck, the speck glints amber. Two glint. The third stays dark. |
| 3.4 to 3.8 | Rays retract into the prism. Nothing in the bead has changed while the light was on (M:55). |
| 3.8 to 4.2 | A green ring touches each glinted speck in turn (Claude checks each finding, CR:150-156, CF:128-134). |
| 4.2 to 5.4 | Both specks dissolve into clear glass from their centres outward. A single green rim draws once around the bead: the round's fixes as one commit (M:63). |
| 5.4 to 6.6 | The beam returns. The prism passes one ray, which goes straight through the bead and out the other side, undeflected, no glint. |
| 6.6 to 7.4 | Ray out. Stillness. |
| 7.4 to 8.2 | The bead slides off the thread's end and falls (ease-in), meeting the pool at 8.2 with a small crown splash (after Worthington's splash studies). One drop: the squash. |
| 8.2 to 10.0 | Rings spread across the pool surface, drawn as ellipses on the datum, amplitude decaying with `(1-u)^3` to zero slope at 10.0. The bead dissolves into the pool. |

**Seam.** At 0.0 and 10.0: no bead visible (under the pin head at the start, dissolved at the end), rings at zero amplitude and zero velocity, light off, pin and prism static. The pool's surface drift closes on its noise circle.

**Reel caption.** Command `/merge` (M:3, M:13). Line: "Every PR goes through the Codex loop and merges when clean", a substring of M:15, accent word "Codex". Two small Departure Mono tags timed to their cues, as the owner asked to open with the review layers: `/codex-fullreview` beside the fan at 1.8 s (CF:3), `/codex-review` beside the single ray at 5.4 s (CR:2). This is two tags over the one-label limit; they are skill names, not claims, and appear only in the reel.

**Card description (29 words).** "Type /merge once: every PR this session opens or updates gets Codex review, several fresh reviewers on the first pass, Claude's fixes, re-review, CI, then a squash-merge when clean." Sources: M:13, M:15-18, M:51, M:53, M:63, M:73, M:78; "several fresh reviewers on the first pass" is the wording merge-codex.md section 7 recommends.

### 3.2 /long-horizon: tidal laminae (T = 9.0 s)

**Metaphor.** A cross-section of a tidal flat. Each round is one tide: fresh water floods in, lays down one thin layer of grain, plants a small flag, and drains away completely. Then an auditor arrives on its own, ignores the flag, drives a core through the new layer and pulls up the evidence. Only a layer the core confirms turns to stone and enters the column at the plate's left margin. The basin subsides as layers build, so the surface stays at the datum.

**Why this picture.** Fresh water each tide is a fresh context each round (LH:7). The flag is the executor's report, a claim; the core is the auditor's own inspection, evidence: "Executor report = claim; auditor inspection = evidence" (LH:106). The core site is marked before the tide arrives, because the auditor brief is written at Plan, before the executor exists (LH:61, LH:91). Stone survives every tide the way the state file survives compaction (LH:50, LH:115). No other plate has an outside eye that digs into the real material instead of looking at it.

| t | Beat |
|---|---|
| 0.0 | Flat surface at the datum, layers of dim stone below, the stratigraphic column at the left margin with its rows. No water. |
| 0.0 to 0.6 | A new row outline opens at the top of the column (planned, not filled). |
| 0.6 to 0.9 | A dashed amber ring appears on the flat: the auditor's pre-registered core site. |
| 0.9 to 3.3 | Green tide floods in from the right, hatch lines drifting. Grains sink through it and settle into one new layer across the flat (one step per round, LH:91). |
| 3.3 to 3.6 | A small green flag pricks up on the new surface. |
| 3.6 to 5.0 | The tide drains out to the right, all of it. The flag stays. |
| 5.0 to 5.4 | An amber core tube descends from above to its ring. The flag dims to history as the auditor passes it: the auditor never sees the executor's report (LH:59). |
| 5.4 to 6.6 | The tube drives through the new layer and lifts, showing the layer's grains inside it. |
| 6.6 to 7.2 | The new layer's dotted lines join into solid stone. The column row fills. The flag fades. The core hole stays as a short dashed mark inside the layer. |
| 7.2 to 9.0 | Hold. Only the basin's slow subsidence moves. |

Subsidence runs the whole loop at constant speed: the stack, the column and every core mark sink by one layer's thickness per loop.

**Seam.** At 9.0 the new layer sits exactly where the previous top layer sat at 0.0, the surface is back at the datum, and no water, flag or ring is present. Subsidence keeps the same speed across the wrap; deposition starts and ends at zero rate.

**Reel caption.** `/long-horizon` (LH:2). Line: "Run big tasks in audited rounds" (LH:5, first letter capitalised), accent word "audited".

**Card description (28 words).** "For work too big for one context window. Each round, a fresh agent does one step, a fresh auditor checks the real files, and only checked work counts." Sources: LH:2, LH:7, LH:91, LH:99-106; "checks the real files" also matches the site statement (`site/index.html:197`, site-map.md section 2).

### 3.3 /smart-compact: leaf skeleton (T = 9.0 s)

**Metaphor.** The session is a leaf, full of soft tissue. When the user pins it, a tracing sheet (the fork, which sees the whole leaf) lays over it and traces the veins in order of importance, thickest first. The tracing is shown, then the soft tissue falls away and the traced skeleton is what remains. New tissue grows back on the kept veins: the session goes on from what was kept.

**Why this picture.** The skeleton is the leaf's own structure, which is the point of custom instructions written from the session itself rather than a default summary (SCP:4, SCR:5-15). The trace order follows the priority list: goal first, then state, decisions, what is verified, next step, failed approaches, exact identifiers (SCR:7-15). The tissue that falls is what the prompt says to drop: tool output, resolved tangents, superseded plans (SCR:17). The pin lands every loop, because the only trigger is the user typing `/smart-compact` (SCR:43-51). No other plate removes material by choice; every other plate adds or tests it.

| t | Beat |
|---|---|
| 0.0 | A large leaf lies across the datum, dense with stippled tissue. Paper veins show faintly through it. |
| 0.4 to 0.8 | The pin presses in at the leaf stalk. |
| 0.8 to 1.4 | A translucent green-edged sheet slides over the leaf from the left (ease in-out). |
| 1.4 to 4.0 | Green traces the veins on the sheet: the midrib first, then the main laterals, then finer veins, then a few bright veinlets near the tip. Draw-in with a quart ease. |
| 4.0 to 5.4 | The sheet lifts a few pixels and holds: the user sees the instructions before compaction (SCR:65). |
| 5.4 to 7.0 | The stipple drifts outward and fades, grain by grain, staggered by distance from the nearest traced vein. The sheet settles into the leaf and its green lines become the skeleton. The pin lifts at 7.0. |
| 7.0 to 8.2 | Hold on the skeleton. |
| 8.2 to 9.0 | New stipple grows between the kept veins and eases to rest; the green trace softens back to paper veins. |

**Seam.** Tissue density is 1 at 0.0 and at 9.0, the regrowth eases to zero velocity by 9.0, and nothing moves from 0.0 to 0.4. No pin at either end.

**Reel caption.** `/smart-compact` (SCR:45). Line: "Write custom /compact instructions from this session, then compact with them" (SCR:46), accent word "custom". Eleven words, one over the ten-word guide; no shorter sourced line keeps both halves of the mechanism.

**Card description (26 words).** "Type /smart-compact in Claude Code. A fork reads the whole session, writes what to keep (goal, state, decisions, next step), shows you, then compacts with it." Sources: SCR:3-4, SCR:7-15, SCR:45-65, CL:49. It is a mod, not a skill, so the card does not call it one (CL:51).

### 3.4 /deep-plan: rimstone pools (T = 9.5 s)

**Metaphor.** A slope of terraced pools, like travertine terraces. Each pool is a question. Water reaches a pool only when the pools it depends on are full and settled. When water reaches a pool, notches show on its inner wall (the options), the first one ticked green (recommended). The user pins one notch, the pool fills to that level and its rim hardens. When the user changes an upstream answer, the pools below it drain and refill. At the end, an explicit pin at the lowest lip lets the water leave the plate: the handoff.

**Why this picture.** Water finding its level is the dependency rule: the frontier is open questions whose dependencies are all settled (DP:46), and no question in a round depends on another in the same round (DP:48), so pools on one tier fill together. The water never picks a level by itself: decisions belong to the user, and the recommendation is never recorded as the answer (DP:10, DP:76). Draining on a premise change is the void rule (DP:80). Go is its own explicit pin, never inferred (DP:89), and after Go the water leaves the plate rather than building anything in it (DP:93). No other plate shows dependency.

| t | Beat |
|---|---|
| 0.0 to 0.4 | Turn completes: a dry terrace slope settles in. Top pool, two pools on the second tier, one on the third. |
| 0.4 to 1.4 | Round 0. Water arrives at the top pool; three notches appear, the first with a small green tick. A pin presses into a notch. The pool fills to it; its rim turns solid. |
| 1.4 to 2.8 | Round 1. Overflow reaches both second-tier pools at once. Each shows notches. One pin goes into the recommended notch; the other goes into a different notch (the user overrides). Both fill. |
| 2.8 to 4.0 | Round 2. The third-tier pool, fed by both, gets notches and a pin, and fills. |
| 4.0 to 5.6 | Premise change. The left second-tier pin pulls out and presses into another notch. Its level shifts. The third-tier pool drains, its rim goes dashed and dim (void), then refills from the new overflow and takes a new pin. |
| 5.6 to 6.4 | All rims solid. No pool waits for water. |
| 6.4 to 7.2 | A final pin presses into the lowest lip. A thin stream leaves the slope and runs off the plate's right edge. |
| 7.2 to 8.9 | Hold. The stream shimmers; nothing else moves. |
| 8.9 to 9.5 | Turn begins (ease-in to constant speed at the seam). |

**Seam.** The turn straddles the wrap: it reaches constant speed at 9.5 and continues at that speed from 0.0, easing out by 0.4. The arriving plate is the same dry slope every loop.

**Reel caption.** `/deep-plan` (DP:3). Line: "Interview a loose idea into decisions the user made" (DP:6, first letter capitalised), accent word "decisions". Not "Decisions belong to the user; facts are your job" (DP:10): out of context, "your job" reads as addressed to the viewer.

**Card description (25 words).** "Type /deep-plan with a loose idea. It asks a few questions per round, you make every decision, and nothing is built until you pick Go." Sources: DP:3, DP:10, DP:12, DP:49, DP:89.

### 3.5 /why: load on ice (T = 8.5 s)

**Metaphor.** Seen from above: a frozen pond, its ice thickness drawn as contour hatching, thin where a stream flows in. Green draws a dotted path across the ice to the pick on the far bank: the recommendation. The user pins it. One amber weight arrives from outside, after the path is drawn, and presses at points along and beside it. Where the ice holds, stress rings spread and fade; where it is thin, hairline cracks run out. The weight leaves. The ice is not mended. Green redraws the path around the weak spot.

**Why this picture.** One prober, never a panel: "`/why` gets exactly one scoped reviewer" (`why/SKILL.md:102`). It arrives after the path is drawn and sees only the path, the way the reviewer gets only the recommendation text (`why/SKILL.md:39`), and it looks for the conditions where the pick is wrong (`why/SKILL.md:40`). Nothing on disk changes, so the ice stays as it is; only the recommendation can change (`why/SKILL.md:51`, `:76`). It is the only plate where the outside eye applies load instead of looking, and where the output is a changed route rather than a changed object.

| t | Beat |
|---|---|
| 0.0 | Pond, hatched ice, the inflow at right drifting under the ice, the pick grain on the far bank. No path. |
| 0.0 to 1.2 | Green dots ink in left to right: the path to the pick. |
| 1.2 to 1.6 | The pin presses in beside the path's start. |
| 1.6 to 2.2 | A small amber weight descends from the top edge. |
| 2.2 to 3.0 | It presses on the path mid-pond. Rings spread and fade: the ice holds. |
| 3.0 to 4.2 | It presses beside the path near the inflow. Rings tighten; four amber hairline cracks run outward and stop. |
| 4.2 to 5.0 | It presses near the far bank. Rings fade: holds. |
| 5.0 to 5.4 | The weight lifts out of the plate. Crack lines stay as traces. |
| 5.4 to 6.6 | The section of path over the thin ice fades; green redraws it in a curve through the thick ice. |
| 6.6 to 8.1 | Hold. |
| 8.1 to 8.5 | Path, cracks and pin fade out (ease-in). |

**Seam.** At 0.0 and 8.5 the pond has no path, no cracks, no pin and no weight. The under-ice current drifts on a noise circle.

**Reel caption.** `/why` (`why/SKILL.md:2`). Line: "Pressure-test a recommendation with one fresh reviewer" (`why/SKILL.md:2`, period dropped), accent word "fresh".

**Card description (27 words).** "Type /why after a recommendation. One fresh reviewer, with no memory of the session, hunts for the conditions where the pick is wrong. Changes nothing on disk." Sources: `why/SKILL.md:2`, `:11`, `:39-40`, `:76`.

### 3.6 /wow-loop: orb web in weather (T = 9.5 s)

**Metaphor.** A frame of twigs with anchor knots set before any silk is spun: the written checks. Green spins an orb web, each radial tied to an anchor. Then weather tests it from two sides: a gust from an angle the anchors do not cover, and dew that beads along the threads and shows where they sag. Where the web fails, the weather leaves an afterimage of the failure. Green respins those spots. The second weather finds nothing. The anchors never move.

**Why this picture.** Two fresh critics with distinct lenses, each trying to disprove the work (`wow-loop/SKILL.md:112`): the gust is the experience critic's natural run and unlisted views (`:120`); the dew is the engineering critic's measurement (`:121`). The afterimages are their captures: a finding without evidence is not accepted (`:123`), and critics never write the deliverable (`:20`). The anchors are the contract, frozen before building (`:51`); "Never weaken a check to obtain a pass" (`:23`). The plate turns along the branch to the next frame, the way a set of like items gets its own verdicts per item (`:57`). It is the only plate tested by two different forces at once, and the only one where the bar is visible before the work exists.

| t | Beat |
|---|---|
| 0.0 to 0.5 | Turn completes along a branch: a twig frame with seven paper anchor knots settles in. |
| 0.5 to 3.0 | The green hub grain moves to the centre. Radials draw out to each anchor, then the spiral winds in (quart draw-in). |
| 3.0 to 3.8 | Gust: amber flow lines cross from lower left. The web billows. One sector stretches past the line between its anchors; a dim amber afterimage of the stretched shape stays. |
| 3.8 to 4.6 | Dew: small amber beads condense along the threads. Along one radial they hang in a deep curve; the curve stays as a trace. |
| 4.6 to 6.2 | Green respins both spots: an extra radial in the stretched sector, a tighter attachment on the sagging one. The anchors brighten once, unmoved. |
| 6.2 to 7.4 | Gust and dew again, shorter. The web flexes and returns; the beads sit level. No afterimage. |
| 7.4 to 8.8 | Hold. Dew glints, one bead at a time. |
| 8.8 to 9.5 | Turn begins: the frame slides left along the branch, the web intact. |

**Seam.** The turn straddles the wrap at constant speed, and the branch repeats with the frame spacing, so the arriving frame at 0.0 is identical every loop.

**Reel caption.** `/wow-loop` (`wow-loop/SKILL.md:3`). Line: "Self-review never establishes acceptance" (`wow-loop/SKILL.md:18`, period dropped), accent word "acceptance".

**Card description (27 words).** "Use /wow-loop for visual work. Two fresh critics try to break it against checks written before building; it passes only when they cannot, with captures as proof." Sources: `wow-loop/SKILL.md:3`, `:18`, `:51`, `:112`, `:123`, `:141`.

### 3.7 /perf-loop: granular flow (T = 9.0 s)

**Metaphor.** A rocky gully in cross-section, descending left to right, with narrows between rocks. Grains run down it and leave stroboscopic dots at fixed time steps (after Marey's chronophotographs): wide spacing is fast, bunched dots are a stall. Baseline runs sit in dim history. Green moves one rock, three new runs go down, and only a gain clearly beyond the baselines' spread is kept; otherwise the rock goes back. An amber grain re-runs the decisive comparison. When one narrow is cleared, the dots bunch at the next one down.

**Why this picture.** One change per round, one hypothesis (`perf-loop/SKILL.md:52`); several runs so the spread shows (`:40`); "Gain within run variation → inconclusive" and a failed experiment reverts only that round's edit (`:67`); the measurement reviewer reproduces the decisive comparison and the regression reviewer checks nothing else broke (`:75-76`); "Meaningful win → re-profile; bottleneck may move" (`:67`). Strobe spacing shows stutter that an average would hide (`perf-loop/references/rendering.md:7`). It is the only plate where the outside eye repeats the work to check a number, and where a change is visibly undone.

| t | Beat |
|---|---|
| 0.0 | Gully with narrow N1 above, N2 below. Three dim baseline trails, their dots bunched at N1, end points slightly apart (the spread). |
| 0.0 to 0.6 | Green eases a rock near N1 aside; a dashed outline marks where it was. |
| 0.6 to 1.8 | Three green runs. Dots still bunch at N1; end points land inside the baseline spread. |
| 1.8 to 2.4 | The rock eases back into its outline. The three trails fade. |
| 2.4 to 3.0 | Green eases the rock that forms N1 aside; dashed outline. |
| 3.0 to 4.2 | Three green runs pass N1 with even spacing; end points land well past the baseline spread. |
| 4.2 to 5.0 | One amber grain runs the same course; its dots land on the green ones. |
| 5.0 to 5.4 | An amber hairline traces along the gully wall below the moved rock: nothing else shifted. |
| 5.4 to 5.8 | The dashed outline vanishes. The green trails turn dim: the new baseline. |
| 5.8 to 7.0 | In the new baseline the dots now bunch at N2. |
| 7.0 to 9.0 | Hold. Only the scroll moves. |

The view scrolls down the gully at constant speed all loop, by exactly one narrow's spacing, so N2 arrives where N1 was.

**Seam.** The gully geometry repeats with the narrow spacing. At 9.0 the new baseline bunched at N2 sits exactly where the old baseline bunched at N1 at 0.0, and the scroll keeps its speed across the wrap.

**Reel caption.** `/perf-loop` (`perf-loop/SKILL.md:3`). Line: "Run measured optimization rounds with independent review" (`perf-loop/SKILL.md:3`), accent word "measured".

**Card description (29 words).** "Use /perf-loop for speed: frame rate, loading, latency. Each round makes one change, measures it against a baseline, and keeps it only if the gain is real and reviewed." Sources: `perf-loop/SKILL.md:3`, `:36-40`, `:52`, `:67`, `:73`.

### 3.8 /arena: grafting (T = 9.5 s)

**Metaphor.** A nursery bed split into four plots by thin boards. The same seed drops into each. Four seedlings grow, each in its own form. Their name tags turn blank. An amber measuring rod with a few notches is held beside each plant in turn; notches mark pass or stay open. The rod's tip rests at one plant's base: the recommended rootstock. Green looks over all four, takes one cutting from each of two others (the third gives none), and grafts them onto the rootstock; the grafted leaves take on the rootstock's leaf shape. The other plots stay where they are, dimmed.

**Why this picture.** Grafting is the skill's own word: it "grafts the best ideas onto the strongest" (A:3). Separate plots are separate writable paths (A:29). Blank tags are the neutral relabelling that strips names, angle, vendor and model (A:26); the judge measures only against the criteria (A:41). The judge recommends, the parent decides after reading every candidate (A:41, A:45). At most one or two ideas from each other candidate, rewritten to the base's conventions (A:47), which is why the cuttings change leaf shape. Candidate folders stay in scratch (A:64), so the plots dim rather than vanish. Four plots, not three: three is the default, more on request (A:33), and four keeps clear of the site's three-candidate pictures (design-and-avoid B9 item 9). It is the only plate where the work is joined, not repaired.

| t | Beat |
|---|---|
| 0.0 to 0.4 | Turn completes: four empty plots behind thin boards on the datum (soil). |
| 0.4 to 0.9 | One seed grain drops into each plot from the same point above, 120 ms apart. |
| 0.9 to 3.0 | Four seedlings grow: upright, low and branching, climbing, compact. |
| 3.0 to 3.4 | Each plot's tag flips to blank. |
| 3.4 to 5.0 | The amber rod stands beside each plant in turn. Of its four notches, some lengthen into marks (pass) and some stay short (fail). The rod's tip comes to rest at the base of the second plant. |
| 5.0 to 5.6 | A green outline passes over all four plants, low scorers included, and settles on the second. |
| 5.6 to 7.4 | Green cuts one shoot from the third plant and one from the fourth, carries each to the second, and binds it at a union with a short spiral wrap. The grafted leaves turn to the rootstock's leaf shape. The first plant gives nothing. |
| 7.4 to 8.8 | Hold. The other three plots dim to history. |
| 8.8 to 9.5 | Turn begins. |

**Seam.** The turn straddles the wrap at constant speed; the arriving bed is the same four empty plots every loop.

**Reel caption.** `/arena` (A:8). Line: "Grafts the best ideas onto the strongest" (A:3 substring, first letter capitalised), accent word "grafts".

**Card description (28 words).** "Use /arena when the right shape is unclear. Several fresh agents build real versions, a blind judge checks them, and the best ideas are grafted onto the strongest." Sources: A:3, A:8, A:13, A:33, A:41.

### 3.9 /showpiece: crystal habit (T = 9.5 s)

**Metaphor.** Two shallow dishes on the datum, each holding a different solution: one with a faint six-fold lattice of motes, one four-fold. The same smooth bead lowers into both, the beads swap dishes, and nothing changes: the generic form fits anywhere. The beads dissolve. Each solution's own motes brighten and align, a small seed crystal grows in each, then a full crystal whose shape comes from its own material: a hexagonal prism in one, a cube in the other. Dashed outlines of each crystal flick into the other dish and plainly do not fit.

**Why this picture.** The bead swap is the skill's swap test: "if the name and logo changed, could this pass unchanged for many unrelated subjects?" (S:36). Crystal habit is form from the subject's actual material (S:22, S:8). The seed crystal is the small specimen that tests the idea before it is extended (S:42). One face growing larger than the rest is "Give attention unevenly" (S:52). Nothing is invented: the crystals grow only from motes already in the solution (S:24). It is the only plate built on a comparison between two subjects, and the only one with no outside eye: showpiece uses fresh reviewers only when asked (S:78).

| t | Beat |
|---|---|
| 0.0 to 0.8 | Two identical smooth beads lower from above into the two dishes. |
| 0.8 to 1.6 | The beads lift, cross and trade dishes. Nothing about either dish changes. |
| 1.6 to 2.4 | The beads dissolve into their solutions. |
| 2.4 to 3.2 | Each solution's motes brighten and line up along its lattice: sixty degrees in one, ninety in the other. |
| 3.2 to 4.4 | A seed grain nucleates in each dish and grows into a small crystal. A fine green line traces its facets once. |
| 4.4 to 6.8 | Both crystals grow, facet by facet, line by line. In each, one face grows larger than the others. |
| 6.8 to 7.6 | A dashed paper outline of each crystal appears in the other dish, misaligned with that dish's lattice, and fades. |
| 7.6 to 9.0 | Hold. Facets glint one at a time. |
| 9.0 to 9.5 | Both crystals lift out of the top of the plate (ease-in). Motes fade back to faint. |

**Seam.** At 0.0 and 9.5 both dishes are empty, the motes faint, nothing in frame above them; the beads enter from out of frame and the crystals leave out of frame. The motes drift on noise circles.

**Reel caption.** `/showpiece` (S:3). Line: "Push an artifact past what people expect from its kind" (S:3 substring), accent word "past".

**Card description (29 words).** "Use /showpiece for portfolio-grade work. It starts from the subject's real material, proves the idea in a small specimen, and tests whether the result could pass for unrelated subjects." Sources: S:3, S:22, S:36, S:42.

## 4. The reel (about 94 s)

Each scene plays one full loop. The caption band fills 0.3 s after the scene starts, word by word, holds, and leaves 1.2 s before the scene ends (exit 0.4 s). Every line holds at least 5 s, above the reading budget of 250 ms per word plus 1 s. Morphs take the last 0.8 s of one scene and replace the arriving scene's turn or entry, so nothing cuts: the datum line and a grain carry across every boundary.

| Reel time | Scene | What happens |
|---|---|---|
| 0.0 to 5.0 | Intro | 0.0 empty plate, grain texture. 0.4 to 1.6 the datum draws left to right (quart). 1.6 to 2.6 one grain falls from top centre, slowing as it nears, and settles on the datum with a slight bounce. 2.6 to 4.2 caption band: "Harness Firmware" in Lineal, "for Claude Code and Codex" in Departure Mono under it. 4.2 to 5.0 the caption leaves; a pin presses in at top-left and a thread draws from it to the grain; the grain lifts onto the thread and becomes the first bead. The datum becomes the pool surface. |
| 5.0 to 15.0 | /merge | Full loop, entering at 0.0 with the intro grain as the first bead. |
| 14.2 to 15.0 | Morph | The last rings flatten. The pool drains to the right and the draining water becomes the ebbing tide over a tidal flat. The bead's dissolved trace settles as the first layer. Prism and pin fade. |
| 15.0 to 24.0 | /long-horizon | Full loop. |
| 23.2 to 24.0 | Morph | The stone layers curve up at both ends and close into a leaf outline; the parallel layer lines become lateral veins and the last core mark becomes the midrib. |
| 24.0 to 33.0 | /smart-compact | Loop runs to the skeleton hold (7.0 to 8.2). |
| 32.2 to 33.0 | Morph | Instead of regrowing, the skeleton's outline becomes the top pool of a terrace slope; its veins become the dry channels between pools. |
| 33.0 to 42.5 | /deep-plan | Loop from 0.4 to 8.9. |
| 41.7 to 42.5 | Morph | The handoff stream runs off the terraces, flattens, and freezes into a pond. Where it enters, the ice is thin. The terraces fade. |
| 42.5 to 51.0 | /why | Full loop until the hold; the final fade is replaced by the morph. |
| 50.2 to 51.0 | Morph | The ice dims; the pick grain lifts to the centre and becomes a web hub; the pond's far shore rises into a twig frame. |
| 51.0 to 60.5 | /wow-loop | Loop from 0.5 to 8.8. |
| 59.7 to 60.5 | Morph | Dew beads drop from the web; the twigs rotate into gully walls; the beads land as grains at the top of the gully. |
| 60.5 to 69.5 | /perf-loop | Full loop. |
| 68.7 to 69.5 | Morph | The grains run out of the gully mouth onto level soil; four of them roll into four plots as boards rise between them. |
| 69.5 to 79.0 | /arena | Loop from 0.9 (the seeds already landed) to 8.8. |
| 78.2 to 79.0 | Morph | The grafted plant drops two seeds; the plots sink away and the soil line becomes two dish rims; the two seeds become the two identical beads. |
| 79.0 to 88.5 | /showpiece | Loop from 0.8 (beads already in the dishes) to 9.0. |
| 88.5 to 91.0 | Outro, part 1 | The two crystals lift out. The camera pulls back: all nine plates appear as a 3x3 contact sheet, each frozen at its payoff hold. Over 1.2 s the plates dim except their datum lines, which slide together into one line across the frame. |
| 91.0 to 94.0 | End slate | One grain falls and settles on the joined datum, as in the intro. Below it: "harnessfirmware.com" in Departure Mono and "Better outcomes, every round" in Lineal with "every round" in Fraunces Italic green. Hold 3 s. |

Order: the brief's order is kept. It alternates materials well (light and water, sediment, leaf, pools, ice, silk and air, rock, soil, crystal), and each scene's end state hands a real object to the next. Deep-plan's handoff into long-horizon (DP:93) would argue for swapping scenes 2 and 4, but that breaks /merge's opening and the morph chain; not worth it.

## 5. Self-check

### Metaphors against each other

| Scene | Process | Outside eye | Differs from the other eight because |
|---|---|---|---|
| /merge | refraction through a bead, drop into a pool | Codex light from beyond the plate, fanned once, then single | only light; only cross-vendor source; only pin placed once for the whole session |
| /long-horizon | tidal deposits, subsidence, coring | an auditor that digs into the deposit | only outside eye that inspects the material, not the claim; only plate where state accumulates in stone |
| /smart-compact | leaf decays to its skeleton | none (the fork is the same session, green) | only plate that removes material by choice |
| /deep-plan | water filling terraced pools | none; the user decides | only plate showing dependency; only plate with many user pins |
| /why | load on ice | one weight pressing | only outside eye that applies force; only output that is a changed route, object untouched |
| /wow-loop | orb web tested by gust and dew | two forces from two directions | only two-lens test at once; only plate with the bar visible before the work |
| /perf-loop | granular flow, strobe dots | a grain that re-runs the course | only plate measuring a number; only plate that visibly undoes a change |
| /arena | parallel seedlings, grafting | a measuring rod beside blank-tagged plants | only plate that joins pieces from several candidates |
| /showpiece | crystal habit from a solution | none (self-inspection, green) | only comparison between two subjects; form comes from material |

### Against the avoid list (design-and-avoid B, site-map section 2)

| Avoid | Where it could creep in | How this pitch stays clear |
|---|---|---|
| Five-node ring, particle ring | /wow-loop's orb web | Seven radials to irregular twig anchors, no nodes or labels, no orbit; the web is a structure under load, not a cycle. Risk noted. |
| Round check stamp, `VERIFIED` | every pass moment | No stamps anywhere. Passes are physical: glass clears, stone sets, ice holds, the web stays level. |
| Scan line sweeps | /merge rays, /long-horizon core | Rays are fixed lines that draw in and retract; the core is a vertical tube. Nothing sweeps. |
| Amber finding, repair, recheck | /merge, /wow-loop | Findings are inclusions in glass and afterimages of a stretched web, not diamond marks; no return arrow. The beat order is the real mechanism of both skills; the pictures differ. Risk noted. |
| Ghost sessions, notes fading | /smart-compact | The leaf keeps its structure; tissue falls by distance from chosen veins. No frames, no note lines. |
| Repository strip or slab, file glyphs | /long-horizon strata | Wavy hairline layers in cross-section with core marks; no rows of words, no compartments, no file glyphs. Risk noted. |
| Person glyph and gate | every user step | The pin. No figure, no posts. |
| Strands or comets of light | /merge beam | One straight beam and fixed rays; no curving strands carrying anything. |
| Three attempts merging | /arena | Four plots, grafting by cuttings, one candidate gives nothing. Not lanes into one frame. |
| Falling context meter | /smart-compact | No meter or bar. |
| Amber review lens | /merge | A prism that splits light, not a lens that sweeps. |
| Block pyramid | /long-horizon | Thin wavy layers, no blocks. |
| Cracking DONE stamp | /why cracks | Cracks are in ice under a weight and mark a weak route, not a self-report. Risk noted. |
| card-art scenes | /arena, /showpiece, /wow-loop, /perf-loop | No lanes, no scan-wipe of a page, no result sheet over a ghost goal, no frame-time bars over a dashed baseline. Strobe dots replace bars. |
| Flying letter chips | /arena tags | Tags turn blank in place; no letters. |
| Skills-page filaments, planes, orbits | all | Not used. |

### Every on-screen string

| String | Where | Source |
|---|---|---|
| Harness Firmware | intro | product name; about film resolve, site-map.md section 4 (`about-film.mjs:371-373`) |
| for Claude Code and Codex | intro | same line, "HARNESS FIRMWARE · FOR CLAUDE CODE AND CODEX", site-map.md section 4 |
| /merge | reel caption | M:3, M:13 |
| Every PR goes through the Codex loop and merges when clean | reel caption | M:15, substring |
| /codex-fullreview | reel tag, /merge | CF:3 |
| /codex-review | reel tag, /merge | CR:2 |
| /long-horizon | reel caption | LH:2 |
| Run big tasks in audited rounds | reel caption | LH:5 |
| /smart-compact | reel caption | SCR:45 |
| Write custom /compact instructions from this session, then compact with them | reel caption | SCR:46 |
| /deep-plan | reel caption | DP:3 |
| Interview a loose idea into decisions the user made | reel caption | DP:6 |
| /why | reel caption | `why/SKILL.md:2` |
| Pressure-test a recommendation with one fresh reviewer | reel caption | `why/SKILL.md:2` |
| /wow-loop | reel caption | `wow-loop/SKILL.md:3` |
| Self-review never establishes acceptance | reel caption | `wow-loop/SKILL.md:18` |
| /perf-loop | reel caption | `perf-loop/SKILL.md:3` |
| Run measured optimization rounds with independent review | reel caption | `perf-loop/SKILL.md:3` |
| /arena | reel caption | A:8 |
| Grafts the best ideas onto the strongest | reel caption | A:3, substring |
| /showpiece | reel caption | S:3 |
| Push an artifact past what people expect from its kind | reel caption | S:3, substring |
| harnessfirmware.com | end slate | brief; about film resolve, site-map.md section 4 |
| Better outcomes, every round | end slate | hero headline and about film resolve, design-and-avoid.md B2 and B6 |

Capitalising a first letter and dropping a terminal period are the only edits to any source string. Cards draw no text.

### Truth traps, checked

- Codex never edits: rays only light the bead; green fixes (CF:43, M:63).
- Only round 1 of /merge has several reviewers: the fan appears once, then a single ray (M:51, M:53).
- No "nothing merges without your approval": the /merge pin is placed once and the loop runs on its own (M:15-18).
- /why changes nothing on disk and is not a root-cause tool: the ice is never mended; only the route changes (`why/SKILL.md:7`, `:76`). Note that inspiration.md C1 calls it a "root-cause scene"; that framing is wrong and is not used.
- /smart-compact runs when the user types it: the pin lands every loop (SCR:43-51).
- /arena: four candidates, not "always three"; the judge recommends and the parent decides (A:33, A:41, A:45).
- /showpiece: no banned-defaults list, no originality score, no reviewers unless asked (S:76, S:78, S:80).
- /deep-plan: at most two questions in any round shown (cap is four, DP:49); Go is its own pin (DP:89); nothing is built in the plate (DP:93).
- /wow-loop: no numeric score; critics leave traces only (`wow-loop/SKILL.md:20-21`).
- /perf-loop: one change per round, an inconclusive change reverted, both review lenses shown (`perf-loop/SKILL.md:52`, `:67`, `:75-76`).
- /long-horizon: one step per round; only the auditor's core moves a layer to stone; the auditor never sees the flag (LH:59, LH:91, LH:106).

## 6. Risks and open questions

1. Amber means "outside eye" here, where the site uses it for failure. The two mostly agree, because what the outside eye reveals is a finding. If the owner wants amber kept for failure only, reviewers can become paper light and findings stay amber.
2. The /merge reel caption carries two extra mono tags (`/codex-fullreview`, `/codex-review`) beyond the one-label rule, because the owner asked to open with those layers.
3. CI is in the /merge card copy but not drawn. A drawn CI beat would need a new picture inside a 10 s loop that is already full; the owner may want one.
4. Four pictures sit near the avoid list in story, not in drawing: /merge and /wow-loop (finding then fix then recheck), /long-horizon strata (near the repository slab), /why ice cracks (near the cracking stamp), /wow-loop's orb web (near a ring). The self-check says why each differs; a contact-sheet review at p = .25, .5, .75 (inspiration.md A3) should confirm before polish.
5. /showpiece shows two subjects to stage the swap test; the skill works on one artifact at a time. The second dish exists only to ask the swap-test question.
6. Reel length is about 94 s, a little over the ~90 s target. The intro can lose 1 s and the outro contact sheet 1 s if needed.
7. Tech: all nine plates fit 2D canvas (stipple, motes, rings, strobe dots); no plate needs WebGL. Captions draw into the same canvas for the MP4.
