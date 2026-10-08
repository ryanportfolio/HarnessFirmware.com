# Pitch A: The bench

Director A. Starting angle kept: every skill is one precise instrument on one long workbench, doing its one job to a small ivory blank. No glyph physics (director 1), no water, light, growth or weather (director 2). Every picture is a machine part moving because another part pushed it.

Sources: `recon/merge-codex.md` (M, CR, CF, IRa keys), `recon/lh-compact-plan.md` (LH, SCR, SCP, DP keys), `recon/why-wow-perf.md` (`why/`, `wow-loop/`, `perf-loop/` keys), `recon/arena-showpiece.md` (A, S keys), `recon/design-and-avoid.md`, `recon/site-map.md`, `inspiration.md`, motion-design `SKILL.md` and `references/story.md`. Citations below use those keys.

## 1. Direction and feeling

**The bench.** Nine instruments stand along one workbench. The same small ivory blank passes from one to the next, and each instrument does exactly what its skill does: probe, cut, punch, press, load, gauge, time, sort, profile.

**Feeling and job line:** When the reel ends, the viewer feels the calm satisfaction of watching good machinery run, and knows that each skill is a specific, repeatable mechanism that checks its own output instead of trusting it.

Why this angle carries the job: developers already read a machine by watching what pushes what (Heider-Simmel and Michotte in `inspiration.md` section 4). An instrument has one job, a rest pose and a cycle, which is exactly what an 8 to 10 s seamless loop needs (Zanotto: "the satisfying loop starts from a mechanism", `inspiration.md` section 1).

## 2. The shared kit

### Stage

- One long workbench seen in flat side elevation, like a technical drawing. Ground `#0f1210`. The bench top is a band of `#10150f` with a 1-unit rule along its front edge carrying millimetre ticks in dim `#3e5a45`. The rule is the series motif (Hobbs's ring-dot): it is in every frame of every module and never moves.
- Bench line at 74% of frame height. Instruments stand on it; work travels left to right along it, so left to right always means earlier to later.
- Card (480x270): instruments live in the box from x 24 to 456, y 36 to 200. Nothing smaller than 6 px carries meaning. At most five parts move in any 1 s window.
- Reel (1920x1080): the same drawing scaled 4x, strokes about 3 px (no 1 px coloured lines that 4:2:0 video blurs). The top band, y 60 to 220, is reserved for the drawn caption plate; nothing animates there except the plate itself.
- Drawing style: line art at 1.2 stroke (card scale), round caps and joins, the site's line-drawing house style. New to the site: cut faces carry 45 degree section hatching, as in an engineering drawing.

### The work unit: the blank

A small ivory (`#f3f3ec`) filled tile, 2:3, one corner clipped at 45 degrees, one round registration hole near the top. It is the only filled shape in the reel, so the eye always finds it. It is a solid tile, not an outlined file glyph with text lines, so it does not echo the explainer's file glyphs or task card.

Each scene shapes the blank into its own form, and the clipped corner and hole stay visible in all nine:

| Scene | The blank becomes |
|---|---|
| merge | a stack of thin sheets (commits) |
| deep-plan | a key blank (the hole becomes the key's ring) |
| long-horizon | a chain of blanks end to end, one per step |
| smart-compact | a perforated paper tape, one perforated tile per stretch of session |
| why | a bracket stood on edge in a vice |
| wow-loop | a workpiece |
| perf-loop | a load riding a sled |
| arena | a brief, then candidate pieces |
| showpiece | a plain blank that gets a profiled edge |

### Colour: one hue per actor

| Colour | Actor or state |
|---|---|
| ivory `#f3f3ec` fill | the work |
| green `#53db76` line | Claude-side tools: session, manager, builder, parent, fixer |
| steel `#b2b5ab` line | Codex tools (the other vendor's model). Used only in the merge scene, where the source makes the vendor fact unconditional |
| bright `#72f28c` | the 120 ms instant a tool touches the work. A contact flash at one point, never a sweep |
| amber `#efc87e` | a defect or a rejected result. Each scene gives it a different physical form (see section 5) |
| dim `#3e5a45` | the bench rule, section hatching, idle parts |

Two line treatments encode a fact the skills keep repeating:

- **Hatched** (green line plus dim hatching): a persistent actor that carries history, such as the session, the long-horizon Manager or the arena parent.
- **Clean outline** (no hatching): a fresh agent. It arrives new, does one job and leaves. A viewer learns within two scenes that clean-outlined tools are strangers to the work.

### The human key

The user's own action is always the same object: a typewriter key with an ivory cap on a green stem, mounted at the left end of a station. It presses down 4 units and springs back. In merge it latches down and stays down (merge mode is on). It replaces the site's person glyph and gate posts and never opens a gate; it only starts or decides things the sources say only the user starts or decides.

### Type

- Drawn caption plate (reel only): skill name in Lineal at weight 781, tracked -0.015em; one short line under it in Harness Text 500. Both in `#f2efdf`. No periods, no em dashes.
- In-picture labels: Departure Mono, engraved on a small maker's plate (thin rectangle, four screw dots). Used only where noted per scene.
- Fraunces Italic: one accent phrase in the outro, nowhere else.
- Card loops carry no drawn words. The card's HTML description does the talking. The one exception is arena's neutral letters, which are part of the mechanism.

### Named behaviours

Only these five behaviours may move anything (Vucko's "behaviours, not outputs", `inspiration.md` section 5):

1. **Feed.** The work moves along the bench at constant speed, or eases in-out between stations when it starts and stops at rest. Queues use Jacob's replacement method: unit i is drawn at stage `(i + p)`, so after one loop every unit has advanced one stage and the frame at p = 1 equals the frame at p = 0. Units enter and leave off frame or at opacity 0 and scale 0.9, never from 0.
2. **Engage.** A tool closes on the work: ease in-out travel, a 120 ms bright contact at the touch point, a 200 ms dwell, ease-in withdrawal at 75% of the approach time.
3. **Index.** A discrete one-step click: a ratchet tooth, a flag flip, a detent. 140 ms, 4% overshoot, settle. Rounds and counts are always shown as index clicks, never as numbers.
4. **Fresh.** A clean-outlined tool drops in from above the frame (ease-out, 0.5 s), does its job, and lifts out to above the frame (ease-in, 0.4 s). It never comes back in the same loop. A new one arrives instead.
5. **Settle.** Accepted work eases out into its rest place and stops. Settle starts the payoff hold: everything else on the bench is still for at least 1.5 s (Lasseter's stillness cue, `inspiration.md` recommendation C2).

No ambient drift, no idle bobbing. Stillness is the default state of a machine at rest, and it makes every engage read.

### Loop law (applies to all nine)

- `p = (t mod T) / T`; p = 1 is never drawn (`inspiration.md` recommendation B1).
- At p = 0 every tool is at its rest pose with zero velocity, so the seam has no velocity jump (Holden). Anything moving across the seam moves at constant speed (only the perf-loop chart paper and arriving queue units do).
- Progress across rounds is a trail drawn as a function of p (the row of ruled blanks, the stacked evidence cards, the chart paper), never a buffer (`inspiration.md` recommendation B2).
- Arrows do not exist. A path is only visible while a part travels it (B3).

## 3. The nine scenes

Reel order proposed (one change from the brief): **merge, deep-plan, long-horizon, smart-compact, why, wow-loop, perf-loop, arena, showpiece.** The reason: deep-plan really does hand off to long-horizon ("b) long-horizon contract", DP:89; the user runs `/long-horizon`, deep-plan does not start it, DP:93). Placing them next to each other lets the one true handoff in the reel happen on screen, with the human key pressed during the move. Every other handoff resets the blank to its plain form, so the reel never implies the skills chain in a fixed pipeline. If the owner prefers the brief's order, every transition still works; only the deep-plan to long-horizon handoff becomes a plain reset.

Each scene lists: metaphor and why it differs, loop beat sheet, reel caption, card description.

---

### 3.1 `/merge` (opening with `/codex-fullreview` and `/codex-review`)

**Metaphor: a transfer line ending in a squash press.** A PR is a small stack of thin sheets (commits). It rides a line past a Codex gang head with several different tool tips (round 1), a green fixing arm, a single Codex tip (rerun), a rank of CI flags, and a press that flattens the stack into one sheet, which drops into the main tray. The squash press is literal: a squash merge turns many commits into one.

Why it differs: the only scene with the other vendor's colour, the only conveyor of several stations, and the only press. Its reviewers are cutting-tool tips on one bar, which differs from long-horizon's single disposable bit, wow-loop's camera and caliper, why's proving ring, perf-loop's caliper on a chart and arena's pegboard.

Mechanism truth carried in the picture:

- The human key is latched down for the whole loop and never moves: typed once, every PR after that flows through with no further press (M:13, M:15, M:18).
- Steel tools only touch; they never change the work. Codex is read-only (CF:36, CF:43). The green arm makes every fix (M:29, M:63).
- Only round 1 has several tips (`/codex-fullreview`, M:51). The rerun is one tip (`/codex-review`, M:53, CR:7).
- Claude verifies each finding before fixing it: one raised pin sinks back on its own when the arm touches it (refuted, CR:152-154, M:61).
- The round's fixes become one new sheet on the stack (M:63).
- CI checks pass before the press (M:73). The press is squash (M:78).

**Loop beat sheet, T = 10.0 s**

| t (s) | Beat | Key pose |
|---|---|---|
| 0.0 | Rest | Key latched down. PR stack (three sheets) at rest at the entry. Previous merged sheets lie in the tray. |
| 0.0 to 0.7 | Feed | Stack eases to the review station. |
| 0.7 to 2.2 | Fresh: round 1 | Steel gang head (one bar, six different tips) drops in clean. The tips touch in one ripple left to right (index, 140 ms apart, bright contact at each). Three tips leave amber pins standing up in the top sheet. The gang head lifts out above frame. |
| 2.2 to 4.0 | Engage: verify and fix | Green arm (hatched: the session) touches pin 1: it sinks back by itself, dims (refuted, no fix). Arm taps pin 2 flush, then pin 3 flush. Arm lays one new thin sheet on the stack (the fix commit). |
| 4.0 to 5.0 | Fresh: rerun | A single steel tip swings in, touches once, no pin rises, swings out. |
| 5.0 to 6.0 | Feed and index | Stack passes under a post with four small flags; each flips from dim to green (CI). |
| 6.0 to 7.0 | Engage: squash | Press descends, the four-sheet stack flattens into one thicker sheet. Press lifts. |
| 7.0 to 7.6 | Settle | The single sheet slides into the tray and stops. |
| 7.6 to 9.2 | Hold | Bench still, 1.6 s. |
| 9.2 to 10.0 | Feed (seam) | The tray floor indexes down one sheet thickness while the next PR stack feeds in from off frame left, from opacity 0, and reaches the entry at rest. Frame at 10.0 equals frame at 0.0. |

**Reel opener, 3.0 s, reel only.** Before the loop, the camera holds on the review station while the two Codex instruments are introduced: the gang head lowers into view with its maker's plate `/codex-fullreview`; the single tip swings in beside it with its plate `/codex-review`; a plate on the shared housing reads `gpt-6.1-sol`. Then the human key, plated `/merge`, presses and latches. The caption plate arrives as the key latches. The brief requires this opening, so the merge scene carries more in-picture labels than the others; they are skill names and the model pin only.

- Plates: `/codex-fullreview` (CF:3), `/codex-review` (CR:2), `gpt-6.1-sol` (CR:2, CF:3; allowed by the brief), `/merge` (M:3).
- Reel caption: name `/merge`; line "every PR goes through the Codex loop and merges when clean" (M:15, trailing period dropped).

**Card description (HTML, 25 words):** "Type /merge once when work is done. Each PR this session opens or updates gets Codex review, Claude fixes, re-review until clean, CI, then squash-merge." (M:13, M:17-18, M:51-53, M:63, M:73, M:78)

---

### 3.2 `/deep-plan`

**Metaphor: a key-cutting jig.** The loose idea is an uncut key blank. Each decision cuts one bit of the key, at a depth only the user's key press sets. A depth selector shows the options with a small green tick at the recommended depth, and the user can pick another. When every bit is cut and the user presses Go, the finished key slides out to be handed on. The plan is literally the shape of the user's decisions.

Why it differs: the only scene where the human key acts more than once, and the only one where the work's final shape comes from the user. Nothing in it reviews anything.

Mechanism truth:

- Every cut waits for the human key; the machine only proposes (DP:10, DP:58, DP:76).
- One cut overrides the recommendation (DP:74 "override").
- At most four questions per round: round 1 cuts three bits, round 2 one (DP:49).
- The fourth bit depends on the second: a thin tie line from bit 2 to bit 4 stays dim until bit 2 is cut (frontier, DP:46).
- Go is a separate, explicit press; no cut counts as Go (DP:89).
- After Go the key only leaves the jig. Nothing is built (DP:12, DP:93).

**Loop beat sheet, T = 9.0 s**

| t (s) | Beat | Key pose |
|---|---|---|
| 0.0 | Rest | Uncut key blank at the entry, jig open, cutter parked. |
| 0.0 to 0.8 | Feed and engage | Blank slides into the clamp; jaws close. |
| 0.8 to 1.2 | Index | Three bit positions light along the blade (open frontier). Position four stays dim, tied to position two. |
| 1.2 to 4.0 | Three cuts | For each position: selector shows its detents with the green recommended tick; the human key presses; the selector snaps to the chosen detent (position 1: recommended; position 2: a different detent; position 3: recommended); the cutter drops to that depth and cuts the notch (bright contact). About 0.9 s each. |
| 4.0 to 5.1 | Round 2 | The tie line from cut 2 turns solid; position four lights; key press; cut. |
| 5.1 to 5.9 | Go | A last key press; the selector shows no detents this time; the clamp opens in response. |
| 5.9 to 6.5 | Settle | The cut key slides out of the jig onto a holder at the right and stops. |
| 6.5 to 8.1 | Hold | Bench still, 1.6 s. |
| 8.1 to 9.0 | Feed (seam) | Holder slides the key off frame right to opacity 0 while a new uncut blank feeds in from off frame left and stops at the entry at rest. |

- In-picture label: none. Go reads by consequence (the clamp opens).
- Reel caption: name `/deep-plan`; line "interview a loose idea into decisions the user made" (DP:6).

**Card description (HTML, 28 words):** "Before building, /deep-plan turns a loose idea into your decisions: a few questions per round, a recommended answer you can override, and nothing built until you say Go." (DP:3, DP:10, DP:49, DP:58, DP:89)

---

### 3.3 `/long-horizon`

**Metaphor: a dividing engine.** The historical instrument that rules precise scales one exact step at a time. A long lead screw spans the bench. A carriage (the Manager, hatched green) rides it. The work is a chain of blanks end to end, one per step. Each round, a fresh cutting bit drops in, rules one mark on the current blank, and is thrown into a discard bin. A gauge that was set and sealed before the bit arrived then measures the mark itself. Only then does the ratchet pawl drop and the carriage index one pitch along the screw. The trail of ruled blanks behind the carriage is Verified progress.

Why it differs: the only scene with a ratchet and lead screw, the only one where progress is a position along a long axis, and the only reviewer that is set up before the worker exists. Merge's reviewers are steel tips on a line; this one is a sealed dial gauge.

Mechanism truth:

- The gauge is placed and sealed at Plan, before the bit drops in (pre-registered auditor brief, LH:61, LH:91).
- One bit, one mark: each round works one step (LH:91).
- Executor and auditor are both fresh (clean outline); the bit is gone before the gauge engages, so the auditor never sees the executor (LH:59, LH:63, LH:98-99).
- The carriage moves only after the gauge reads in tolerance: "Only complete + clean + aligned enters Verified progress" (LH:106).
- The bench never shows a round count (LH:158).

**Loop beat sheet, T = 9.0 s**

| t (s) | Beat | Key pose |
|---|---|---|
| 0.0 | Rest | Carriage at the left third, screw and ruled trail to its left, unruled blanks to its right. |
| 0.0 to 1.0 | Plan | A dial gauge (clean outline) drops in beside the cutting point; a small ivory seal tab clicks onto its setting (index). |
| 1.0 to 1.5 | Fresh | A cutting bit (clean outline) drops into the carriage's tool post. |
| 1.5 to 3.0 | Execute | The bit engages and rules one mark across the current blank (bright contact along the cut only). |
| 3.0 to 3.5 | Fresh: out | The bit lifts out and drops into the discard bin at the bench's far right. |
| 3.5 to 5.0 | Audit | The sealed gauge rotates down onto the new mark; its needle swings and settles inside the tolerance band. |
| 5.0 to 5.6 | Integrate | The ratchet pawl drops; the carriage indexes one pitch to the right (index with overshoot). |
| 5.6 to 7.4 | Hold | Bench still, 1.8 s. The ruled trail is one blank longer. |
| 7.4 to 8.2 | Fresh: out | The gauge lifts out above frame. |
| 8.2 to 9.0 | Feed (seam) | Screw, trail and carriage translate left by exactly one pitch together, so the carriage is back at its start and the trail pattern is identical. The bin's contents sink by one bit (index). |

- In-picture label: none.
- Reel caption: name `/long-horizon`; line "run big tasks in audited rounds" (LH:5).

**Card description (HTML, 29 words):** "For work too big for one context: your session plans, a fresh agent does each step, a separate fresh auditor checks it, and only checked steps count as progress." (LH:2, LH:7, LH:98-106)

---

### 3.4 `/smart-compact`

**Metaphor: a paper-tape reader, a card punch and a die press.** The session is a long perforated ivory tape. The user presses the key. The tape runs through a reader (a fork that sees the whole transcript). A card punch beside it punches a control card in seven rows: the keep list. The card drops into a die press, the press comes down on the folded tape, and out comes one dense blank. The offcuts fall into a scrap bin. Then the session tape starts growing again behind the new blank.

Why it differs: the only scene where the work gets smaller, the only paper tape, and the only one where a written instruction (the punched card) physically shapes the result. There is no meter anywhere, so it does not echo the about film's falling context meter.

Mechanism truth:

- The key starts it; nothing fires on its own (SCR:43-51).
- The reader passes the whole tape (the fork sees the whole transcript, SCR:3-4, SCR:53).
- The card has seven hole rows for the seven keep categories (SCR:7-15). The rows carry no words on screen.
- The card is shown for 0.6 s as it ejects, matching "compacting with these instructions:" (SCR:65). There is no approval step: the card goes straight into the press (CL:66-68).
- The offcuts fall: compaction drops tool output, tangents and superseded plans, so it is not lossless (SCR:17).

**Loop beat sheet, T = 8.0 s**

| t (s) | Beat | Key pose |
|---|---|---|
| 0.0 | Rest | A long tape lies along the bench; its leading tile is a dense blank from the last compaction. Reader, punch and press at rest. |
| 0.0 to 0.5 | Key | The human key presses and springs back. |
| 0.5 to 2.3 | Feed | The tape runs through the reader's rollers at constant speed and folds into a stack on the far side. The reader does not move; the tape does. |
| 2.3 to 3.3 | Index | The punch punches seven rows of holes into a card, one click per row. |
| 3.3 to 3.9 | Show | The card ejects and stands upright, still, for 0.6 s. |
| 3.9 to 4.5 | Feed | The card drops into the press head. |
| 4.5 to 5.3 | Engage | The press comes down on the folded stack; one dense blank remains; offcut strips fall into the scrap bin below the bench line. |
| 5.3 to 5.8 | Settle | The dense blank eases to the bench centre and stops. |
| 5.8 to 7.3 | Hold | Bench still, 1.5 s. |
| 7.3 to 8.0 | Feed (seam) | The dense blank slides left to the tape-head position while new tape extrudes behind it from the right at constant speed. The scrap bin floor indexes down. Frame at 8.0 equals frame at 0.0. |

- In-picture label: none.
- Reel caption: name `/smart-compact`; line "Write custom /compact instructions from this session, then compact with them" (SCR:46).

**Card description (HTML, 26 words):** "When you want to compact but keep what matters, type /smart-compact: a fork reads the whole session, writes the keep list, then runs /compact with it." (SCR:3-17, SCR:43-63)

Note for the owner: smart-compact is a Claude Code mod, not a skill (CL:51). Nothing in this scene calls it a skill; the reel's intro title "Skills" sits above it, which is the one place that could be read that way.

---

### 3.5 `/why`

**Metaphor: a proving ring on a load stand.** A proving ring is the classic calibrated force gauge: a steel ring with a dial inside that reads how hard it presses. The recommendation is an ivory bracket clamped in a vice, with one small slip clipped to it (the user's message that prompted it). A hood lowers over the rest of the bench so only the bracket and its slip stay in view. One fresh proving ring drops in and presses the bracket at three points. At the third, the bracket bows and the dial needle passes an amber mark. The ring leaves, the hood lifts, and the green session hand fits a gusset at the weak spot. The bracket stands straight.

Why it differs: the only scene with a single reviewer applying force, the only hood (the reviewer's restricted view), and the only one where the result is a strengthened recommendation rather than processed work. Nothing goes into a tray or a drawer, because `/why` changes nothing on disk.

Mechanism truth:

- One reviewer, exactly one (why:102). Clean outline: fresh context, same colour as the session, because the reviewer inherits the session model unless the user names one (why:38). No steel.
- The hood: the reviewer sees only the recommendation plus at most one user message (why:39).
- Three presses for unstated assumptions, edge cases and the conditions where it is the wrong call (why:40). Not labelled.
- The session hand, not the ring, changes the pick (synthesis by the main agent, why:43, why:51).
- No tray, no file, no stamp (why:76).

**Loop beat sheet, T = 8.0 s**

| t (s) | Beat | Key pose |
|---|---|---|
| 0.0 | Rest | Unreinforced bracket in the vice, slip clipped on, hood raised. |
| 0.0 to 0.7 | Hood | The hood lowers over the bench; only a window over the bracket stays open. |
| 0.7 to 1.4 | Fresh | The proving ring drops in above the bracket. |
| 1.4 to 3.8 | Engage x3 | Three presses along the bracket, 0.8 s each. Presses 1 and 2: needle swings and returns inside the band. Press 3: the bracket bows; the needle passes the amber mark and holds there for 300 ms. |
| 3.8 to 4.4 | Fresh: out | Ring lifts out above frame; hood rises. The bow stays. |
| 4.4 to 5.4 | Engage | The green hand slides a gusset into the bow; the bracket straightens (bright contact at the joint). |
| 5.4 to 7.0 | Hold | Bench still, 1.6 s. |
| 7.0 to 8.0 | Feed (seam) | Vice opens; the reinforced bracket feeds out right to opacity 0; a new plain bracket with a new slip feeds in from the left, vice closes, all at rest by 8.0. |

- In-picture label: none.
- Reel caption: name `/why`; line "Pressure-test a recommendation with one fresh reviewer" (why:2, trailing period dropped).

**Card description (HTML, 27 words):** "Run /why on a pick before committing. One fresh reviewer, given only the pick and its prompt, hunts weak spots; the pick is refined, confirmed or overturned." (why:2, why:39-40, why:51, why:72)

---

### 3.6 `/wow-loop`

**Metaphor: a sealed gauge line and two critics with their own instruments.** The quality contract is a row of fixed ring gauges bolted to the bench, each bolt capped with an ivory seal: the bar cannot be moved. The workpiece slides through the rings (scripted checks). Then two fresh critics drop in: an experience critic that is a camera on an arm, and an engineering critic that is a micrometer. The camera takes its own pictures; each picture ejects as a small card into an evidence tray. One card comes out with an amber ring drawn around a corner of the piece. The critics leave. The green builder files that corner. A new pair of critics drops in, captures and measures again, and the cards come out clean. The piece settles in its cradle. The rings never moved.

Why it differs: the only scene with a camera, the only one where the defect lives on a piece of evidence and not on the work, and the only one where the standard is shown as a fixed, sealed object. Merge raises pins on the work; why bends the work; wow-loop photographs it.

Mechanism truth:

- Scripted checks run before critics are dispatched (wow-loop:51).
- Two fresh critics per round, two lenses (wow-loop:112, :120-121), clean outline, green line: they inherit the configured model (wow-loop:27). No steel.
- Every verdict comes from a capture the critic made (wow-loop:18). The cards are the evidence paths.
- Critics write captures, never the deliverable (wow-loop:20). Only the builder files.
- Sealed rings: "Never weaken a check to obtain a pass" (wow-loop:23).
- No scores, no numbers (wow-loop:21).

**Loop beat sheet, T = 9.0 s**

| t (s) | Beat | Key pose |
|---|---|---|
| 0.0 | Rest | Workpiece at the entry. Five sealed rings in a row. Evidence tray holds earlier cards. |
| 0.0 to 0.5 | Feed | Piece slides to the rings. |
| 0.5 to 1.3 | Feed and index | Piece passes through five rings; each ring gives one small index tick as the piece clears it. |
| 1.3 to 1.8 | Fresh | Camera arm drops in left, micrometer drops in right. |
| 1.8 to 3.2 | Engage | Camera clicks twice (two views); two cards eject into the tray; the second carries an amber ring around the piece's upper corner and rests face up for 300 ms. The micrometer closes on the piece; its card ejects plain. |
| 3.2 to 3.6 | Fresh: out | Both critics lift out. |
| 3.6 to 4.5 | Engage | The green builder (hatched) files the flagged corner (bright contact). |
| 4.5 to 4.9 | Fresh | A new camera and a new micrometer drop in. |
| 4.9 to 5.9 | Engage | Capture and measure again; three plain cards eject. |
| 5.9 to 6.3 | Fresh: out | Critics lift out. |
| 6.3 to 6.8 | Settle | Piece eases into the accepted cradle. |
| 6.8 to 8.3 | Hold | Bench still, 1.5 s. |
| 8.3 to 9.0 | Feed (seam) | Cradle tips the piece off frame right to opacity 0; the next piece feeds in from off frame left and stops at the entry at rest; the tray floor indexes down by this loop's card stack height. |

- In-picture label: none.
- Reel caption: name `/wow-loop`; line "Evidence-gated review and repair loop" (wow-loop:3).

**Card description (HTML, 26 words):** "For visual work: a frozen written bar, two fresh critics who capture and measure it themselves, and a pass only when they fail to break it." (wow-loop:3, :8, :18, :51, :112, :156)

---

### 3.7 `/perf-loop`

**Metaphor: an inclined-plane timing rig with a strip-chart recorder.** Galileo's inclined plane, rebuilt as a bench instrument. A sled carrying the blank runs down a track through two timing gates; a pen marks each run's time as a dot on a moving paper strip. One section of the track sits on a two-position selector: the current section (baseline) and a candidate section (one change). Runs alternate between them. A fresh caliper drops onto the chart, spans the gap between the two rows of dots against their spread, and lifts. In round 1 the candidate's dots sit clearly lower: the green hand bolts it in and the old section retires to a rack. In round 2 the candidate's dots overlap the baseline: it slides back out with an amber edge. Same rig, two rounds, one kept, one reverted.

Why it differs: the only scene about time, the only gravity, and the only result drawn as scattered repeated measurements. It does not redraw card-art's ten frame-time bars over a dashed baseline; there are no bars, no diamond and no stamp.

Mechanism truth:

- One swapped section per round: "1 implementer/round, 1 testable hypothesis" (perf-loop:52).
- Alternating baseline and candidate runs on the same workload (perf-loop:63). Several dots per row show repeated runs; no count is shown.
- A fresh measurement reviewer checks the comparison (perf-loop:73, :75), clean outline, green line (reviewers inherit the configured model, perf-loop:73).
- Not every round is kept: within-noise means inconclusive, and the round is reverted (perf-loop:67).
- The chart is drawn relative to the current baseline, so no absolute number appears.

**Loop beat sheet, T = 10.0 s**

| t (s) | Beat | Key pose |
|---|---|---|
| 0.0 | Rest | Sled at the top gate. Selector holds the baseline section and an empty candidate slot. Chart paper moving left at constant speed (it moves for the whole loop). |
| 0.0 to 0.4 | Engage | Green hand slots candidate section B into the selector. |
| 0.4 to 2.8 | Four runs | Run, return, run, return: the selector indexes between baseline and B before each run; the sled drops (gravity ease-in), passes the gates, the pen marks a dot, a lift returns the sled. 0.6 s per run. B's dots land clearly below the baseline row. |
| 2.8 to 3.6 | Fresh | Caliper drops onto the chart, spans the gap between rows, lifts out. |
| 3.6 to 4.2 | Engage: keep | B locks into the track (bright contact at the bolts); the old section slides to the retired rack. |
| 4.2 to 4.6 | Engage | Hand slots candidate C. |
| 4.6 to 7.0 | Four runs | C's dots land inside the baseline row's spread. |
| 7.0 to 7.6 | Fresh | Caliper drops, spans, lifts: no gap. |
| 7.6 to 8.2 | Engage: revert | C slides back out of the selector with an amber edge and leaves off frame right. |
| 8.2 to 9.7 | Hold | Everything still except the chart paper, 1.5 s. |
| 9.7 to 10.0 | Index (seam) | Retired rack indexes down one section. Sections are identical in shape, so the selector at 10.0 matches 0.0; the chart has advanced exactly one loop width and its dot pattern repeats. |

- In-picture label: none.
- Reel caption: name `/perf-loop`; line "Run measured optimization rounds with independent review" (perf-loop:3).

**Card description (HTML, 27 words):** "When something feels slow: measure a baseline, change one thing per round, rerun the same workload, and keep only gains a fresh reviewer confirms beyond run-to-run noise." (perf-loop:3, :52, :63, :67, :73-80)

---

### 3.8 `/arena`

**Metaphor: sealed booths, a badge grinder and a blind pegboard.** One brief card is copied into separate booths with shutters (no shared workspace). A fourth booth stands empty and dim beside them, so the count reads as "some", not "three". Each booth builds its own piece, marked with its angle symbol. The pieces drop through a grinder collar that grinds the mark off and punches a neutral letter. Behind a screen, a fresh judge sees only a criteria card and the lettered pieces, and fills a pegboard: rows for criteria, columns for letters, green peg for pass, amber for fail. A pointer swings to the recommended base. The screen lifts. The green parent touches every piece, low scorers included, takes the base, and inlays one small section from each of the others, re-cut so its hatching matches the base. The inlays are flush; you cannot see where one candidate ends.

Why it differs: the only scene about blinding (grinder, letters, screen), the only pegboard, and the only inlay. It does not use card-art's three lanes folding into a winner, the site's A/B/C homepage cards, or flying letter chips: here the letters are punched into the pieces and never move on their own, and what joins the base is a small re-cut inlay, not a whole candidate.

Mechanism truth:

- Separate booths: "No two workers share a writable path" (A:29). Shown as shutters; no worktree claim.
- "Three by default; more on request" (A:33): three lit booths plus one empty booth.
- Names, angle, vendor and model traces removed; neutral letters (A:26). No vendor colour on any booth, because Codex is conditional (A:35).
- Judge starts after all candidates return; fresh and read-only; sees only criteria and the lettered copies (A:41). Never sees `rationale.md` (A:25).
- Judge returns pass/fail per criterion plus a recommended base (A:41); the parent reads every candidate and decides (A:45).
- At most one or two ideas from each other candidate, rewritten to the base's conventions (A:47).

**Loop beat sheet, T = 10.0 s**

| t (s) | Beat | Key pose |
|---|---|---|
| 0.0 | Rest | Booths open and empty; a brief card at the entry. |
| 0.0 to 0.6 | Feed | The brief slides under the booth row; three copies slide up into the three lit booths. |
| 0.6 to 2.4 | Fresh | Shutters close. Through each booth's slatted window a clean-outlined hand works; three pieces emerge from the booth slots, each with a different edge profile and its own angle mark. |
| 2.4 to 3.6 | Feed and index | Pieces drop down a chute through the grinder collar one by one: mark ground off, letter punched (A, B, C), 0.4 s each. |
| 3.6 to 5.6 | Fresh: judge | Screen down. A pegboard judge drops in behind it with a criteria card. Pegs fall into the grid row by row (index). The pointer swings to B. Judge lifts out. |
| 5.6 to 6.4 | Engage | Screen lifts. The green parent (hatched) touches A, B and C in turn, then holds B. |
| 6.4 to 7.9 | Engage x2 | A small section is cut from A, its hatching re-cut to B's angle, and inlaid flush into B. Same from C. Bright contact at each joint. |
| 7.9 to 9.4 | Hold | Bench still, 1.5 s. |
| 9.4 to 10.0 | Feed (seam) | The finished piece leaves right; A and C remains drop into a scratch bin below the bench line; shutters reopen; a new brief arrives at the entry at rest. |

- In-picture label: the neutral letters A, B, C on the pieces (A:26, "neutral letter"). This is the scene's one label.
- Reel caption: name `/arena`; line "Builds parallel attempts at one task, judges them blind" (A:3, first clause).

**Card description (HTML, 28 words):** "When the right shape is unclear: fresh agents build separate versions, a blind judge checks each against pass/fail criteria, and the result is one base plus grafted ideas." (A:3, A:8, A:24, A:29, A:41, A:47)

---

### 3.9 `/showpiece`

**Metaphor: a contour gauge taken from the real subject.** A contour gauge is a comb of sliding pins that copies the shape of whatever you press it against. On the bench stands the subject: an odd, specific casting. Beside it, dim, stand two other castings. A plain rectangular blank waits. The gauge presses against the subject and takes its profile. The cutter first cuts a short specimen from one corner of the blank and test-fits it against the subject: it fits. Then it cuts the full edge, deeper and bolder than the scribe line. The finished piece slides past the two other castings, where it leaves visible gaps, and mates flush with its own subject.

Why it differs: the only scene where the work takes its shape from an object outside the machine, and the only swap test. It does not redraw card-art's scan that turns a generic page into a composed layout: there is no page, no scan, no wipe.

Mechanism truth:

- Material first: the gauge reads the subject before anything is cut (S:22).
- Specimen first: a small cut tests the biggest uncertainty before the full piece (S:42).
- Swap test: the piece does not fit other subjects (S:36).
- Bolder but still a fit: "the one that goes furthest while still doing the job" (S:18).
- No banned list, no score, no reviewer shown (S:76, S:78, S:80).

**Loop beat sheet, T = 9.0 s**

| t (s) | Beat | Key pose |
|---|---|---|
| 0.0 | Rest | Plain blank at the centre. Subject casting at left on a stand, two dim castings at right. Gauge pins flat. |
| 0.0 to 1.4 | Engage | The gauge (green, hatched: the session's own tool) presses against the subject; its pins slide back to copy the profile (index ripple across the pins). |
| 1.4 to 2.0 | Feed | The gauge moves to the blank and scribes the profile along one edge. |
| 2.0 to 3.0 | Engage: specimen | The cutter cuts a short section at one corner; the specimen is offered to the subject and mates. |
| 3.0 to 5.0 | Engage: full cut | The cutter runs the whole edge, cutting past the scribe line into a bolder profile (bright contact travelling with the cutter tip only). |
| 5.0 to 6.0 | Swap test | The piece slides past the two dim castings; gaps show against each. |
| 6.0 to 6.4 | Settle | The piece mates flush with its subject; one bright contact line along the join. |
| 6.4 to 7.9 | Hold | Bench still, 1.5 s. |
| 7.9 to 9.0 | Feed (seam) | The piece lifts away off frame right; gauge pins spring back flat; a new plain blank feeds in to the centre at rest. |

- In-picture label: none.
- Reel caption: name `/showpiece`; line "Push an artifact past what people expect from its kind" (S:3, first clause).

**Card description (HTML, 28 words):** "For work that should not look generic: it studies the subject first, proves the idea on a small specimen, then aims for something no other subject could wear." (S:3, S:22, S:36, S:42)

## 4. The reel (90.5 s)

One continuous bench. The camera trucks right along it from instrument to instrument; it never cuts. Each transition is a 1.0 s truck (ease in-out) that starts during scene N's exit feed, follows the work piece, and ends on scene N+1's entry. During the truck the piece morphs into the next scene's work form. The truck overlaps 0.5 s of each neighbouring loop. Each scene plays exactly one loop from p = 0. The caption plate for scene N slides in 0.6 s after its loop starts (ease-out, 400 ms), holds, and slides out 0.4 s before the truck (ease-in, 300 ms). Every caption line is at most 11 words, so it gets at least 250 ms per word plus 1 s (story.md).

| t (s) | Beat | Picture | Words on screen |
|---|---|---|---|
| 0.0 to 4.0 | Intro | Black. The bench rule draws in left to right (1.2 s, quart draw-in). A single plain blank feeds in from the left and stops at centre. A human key rises into place beside it. Hold from 2.8. | "Skills" in Lineal (site-map section 1, `h1#ss-title`), then "HARNESS FIRMWARE · FOR CLAUDE CODE AND CODEX" in Departure Mono (site-map section 4, about film resolve). |
| 4.0 to 7.0 | Merge opener | The blank becomes a stack of three sheets. The Codex gang head and the single tip lower into view; the key presses and latches. | Plates `/codex-fullreview`, `/codex-review`, `gpt-6.1-sol`, `/merge`; caption "/merge" + "every PR goes through the Codex loop and merges when clean" from 5.0. |
| 7.0 to 17.0 | 1 `/merge` | Loop 3.1. | Caption holds to 16.1. |
| 16.5 to 17.5 | Truck | The squashed sheet rides the camera right and morphs back into a plain blank, then thins into an uncut key blank. | none |
| 16.5 to 25.5 | 2 `/deep-plan` | Loop 3.2. | "/deep-plan" + DP:6 line. |
| 25.0 to 26.0 | Truck: the real handoff | The cut key rides right and slides into the long-horizon carriage's seat as its contract; the human key at the long-horizon station presses once during the truck (the user runs `/long-horizon`, DP:93). The key then becomes the first blank of the chain. | none |
| 25.0 to 34.0 | 3 `/long-horizon` | Loop 3.3. | "/long-horizon" + LH:5 line. |
| 33.5 to 34.5 | Truck | The chain of ruled blanks unrolls into a perforated tape. Visual continuity only. | none |
| 33.5 to 41.5 | 4 `/smart-compact` | Loop 3.4. | "/smart-compact" + SCR:46 line. |
| 41.0 to 42.0 | Truck | The dense blank stands up on edge and grows a foot: the bracket. | none |
| 41.0 to 49.0 | 5 `/why` | Loop 3.5. | "/why" + why:2 line. |
| 48.5 to 49.5 | Truck | The gusseted bracket folds flat into a workpiece; the gusset melts back into the plain blank (new job). | none |
| 48.5 to 57.5 | 6 `/wow-loop` | Loop 3.6. | "/wow-loop" + wow-loop:3 line. |
| 57.0 to 58.0 | Truck | The accepted workpiece is lifted onto the perf-loop sled at the top gate. | none |
| 57.0 to 67.0 | 7 `/perf-loop` | Loop 3.7. | "/perf-loop" + perf-loop:3 line. |
| 66.5 to 67.5 | Truck | The sled's blank becomes the arena brief card. | none |
| 66.5 to 76.5 | 8 `/arena` | Loop 3.8. | "/arena" + A:3 clause; letters A B C. |
| 76.0 to 77.0 | Truck | The inlaid piece loses its inlays and profile and becomes a plain rectangular blank, set down beside the showpiece subject. | none |
| 76.0 to 85.0 | 9 `/showpiece` | Loop 3.9, ending on the 1.5 s hold of the flush fit. | "/showpiece" + S:3 clause. |
| 85.0 to 87.0 | Pull back | The camera pulls back (ease in-out, 2.0 s) until all nine instruments stand at rest in one row on the bench, each at its p = 0 pose. Nothing moves on the bench. | none |
| 87.0 to 90.5 | End slate | A maker's plate slides in above the bench. Hold 3.5 s, URL readable for at least 3 s. | "harnessfirmware.com" in Departure Mono; "Better outcomes, *every round*" with "every round" in Fraunces Italic (site-map section 4, about film resolve; design-and-avoid B2). |

Total 90.5 s. If the owner wants exactly 90, trim the intro hold by 0.5 s.

Morph rule in every truck: one object carries its identity through the change (motion-design Continuity rule). The blank's clipped corner and registration hole stay visible through every morph, so the viewer tracks one thing across the whole reel.

Story check against `story.md`: the cold open is concrete (a key press and a machine waking, no definition); each beat has one idea; the payoff of each scene is a settled piece followed by stillness; the resolve converges every element onto one bench and one plate, holding the URL more than 3 s. There is no logo flash and no H mark, which the avoid list rules out.

## 5. Self-check

### 5.1 Metaphor against the other eight and the avoid list

| Scene | Metaphor | Distinct from the other eight because | Avoid-list items it could be confused with, and why it is not them |
|---|---|---|---|
| merge | transfer line: Codex gang head, green fixer, single Codex tip, CI flags, squash press | only steel tools, only conveyor, only press; reviewers are cutting-tool tips | Amber finding then repair then recheck: here the finding is a physical pin raised by a tip and tapped flush, one pin is refuted, and there is no scan, diamond or stamp. Double-outline reviewer and amber lens: Codex is a colour on separate tools, not an outline or lens. Person and gate: replaced by a latched key; there is no gate and no approval claim. |
| deep-plan | key-cutting jig, user sets every depth | only scene where the user acts repeatedly and shapes the result; no review at all | Contract sheet with checkboxes splitting into tiles (explainer beat 4): no sheet, no tiles, no rail. |
| long-horizon | dividing engine: lead screw, sealed gauge, disposable bit, ratchet | only lead screw and ratchet; only reviewer set up before the worker | Tiles on a rail, separate builder and auditor frames with a scan and VERIFIED (explainer beat 5): no frames, no scan, no stamp; the auditor is a dial gauge. Five-node ring: progress is linear along the screw. Skills page "four saved rounds" filaments: no filaments. |
| smart-compact | tape reader, card punch, die press | only scene where the work gets smaller; only tape; only written instruction as an object | Falling context meter (about film): no meter, no bar. Scan-line sweep: the tape moves through a fixed reader; nothing sweeps. Ghost sessions: none. |
| why | proving ring on a bracket, hood over the bench | only single force-applying reviewer; only hood; result is a stronger recommendation, nothing stored | Self-grading amber arc (explainer beat 1): the reviewer is a separate fresh object. Amber lens: the ring presses, it does not look. |
| wow-loop | sealed ring gauges, camera and micrometer critics, evidence cards | only camera; defect lives on evidence, not on the work; standard shown as sealed and fixed | Card-art wow-loop (result over ghost goal sheet, scan, diamond, stamp, round dots): none of those parts. Dither evidence field: no dither, no caption cycle. |
| perf-loop | inclined-plane timing rig, strip chart, swappable section | only gravity and time; result as repeated dots; shows a revert | Card-art perf-loop (ten frame-time bars over dashed baseline, diamond, scan, stamp): no bars, no dashed baseline, no stamp. Field log three measured bars: no bars, no numbers. |
| arena | sealed booths, badge grinder, blind pegboard, inlay | only blinding mechanism; only pegboard; only inlay | Three attempts merging, card-art three lanes folding, site A/B/C homepage cards, flying letter chips: an empty fourth booth breaks the "three" picture; letters are punched in place and never fly; what joins the base is a small re-cut inlay, not a whole candidate. |
| showpiece | contour gauge from a real subject, specimen cut, swap test | only scene shaped by an outside object; only swap test | Card-art showpiece (scan wipes a generic page into a layout): no page, no scan, no wipe. |

Shared-parts audit: no round check stamp and no `VERIFIED` anywhere; no scan line anywhere; no strands, comets, particle ring, repository strip, file glyphs, ghost sessions, pyramid, cracking stamp, H mark or person glyph. Amber appears in six scenes as six different physical forms: raised pins (merge), a dial needle past a mark (why), a ring drawn on a photo card (wow-loop), an edge on a rejected section (perf-loop), fail pegs (arena), and none in deep-plan, long-horizon, smart-compact or showpiece.

Mechanism traps from the brief, checked: Codex never edits (merge: steel only touches). Only round 1 has several reviewers (merge: gang head once, single tip on rerun). `/why` uses one fresh reviewer and changes nothing on disk, and is shown as testing a recommendation, not finding a root cause. smart-compact starts on the key press. Arena shows a dim fourth booth and the parent deciding after the judge recommends. Showpiece shows no banned list.

### 5.2 Every on-screen string and its source

| String | Where | Source |
|---|---|---|
| Skills | intro | site-map section 1: `h1#ss-title` "Skills" |
| HARNESS FIRMWARE · FOR CLAUDE CODE AND CODEX | intro | site-map section 4 (about film resolve) |
| /codex-fullreview | merge plate | merge-codex: CF:3 |
| /codex-review | merge plate | merge-codex: CR:2 |
| gpt-6.1-sol | merge plate | merge-codex: CR:2, CF:3 (allowed by the brief) |
| /merge | merge plate and caption | merge-codex: M:3 |
| every PR goes through the Codex loop and merges when clean | merge caption | merge-codex: M:15 |
| /deep-plan | caption | lh-compact-plan: DP:3 |
| interview a loose idea into decisions the user made | caption | lh-compact-plan: DP:6 |
| /long-horizon | caption | lh-compact-plan: LH:2 |
| run big tasks in audited rounds | caption | lh-compact-plan: LH:5 |
| /smart-compact | caption | lh-compact-plan: SCR:45 |
| Write custom /compact instructions from this session, then compact with them | caption | lh-compact-plan: SCR:46 |
| /why | caption | why-wow-perf: `why/SKILL.md:2` |
| Pressure-test a recommendation with one fresh reviewer | caption | why-wow-perf: `why/SKILL.md:2` |
| /wow-loop | caption | why-wow-perf: `wow-loop/SKILL.md:3` |
| Evidence-gated review and repair loop | caption | why-wow-perf: `wow-loop/SKILL.md:3` |
| /perf-loop | caption | why-wow-perf: `perf-loop/SKILL.md:3` |
| Run measured optimization rounds with independent review | caption | why-wow-perf: `perf-loop/SKILL.md:3` |
| /arena | caption | arena-showpiece: A:8 |
| Builds parallel attempts at one task, judges them blind | caption | arena-showpiece: A:3 |
| A, B, C | arena pieces | arena-showpiece: A:26 "neutral letter" |
| /showpiece | caption | arena-showpiece: S:3 |
| Push an artifact past what people expect from its kind | caption | arena-showpiece: S:3 |
| harnessfirmware.com | end slate | site-map section 4 (about film resolve) |
| Better outcomes, every round | end slate | site-map section 4; design-and-avoid B2 (hero-pillars) |

No string contains a period, an em dash, a skill count, a rerun count, or "nothing merges without your approval".

## 6. Risks and open questions for the owner

1. Merge is the densest scene: five stations in a 480 px card. If the Hobbs contact sheet (p = 0, 0.25, 0.5, 0.75) shows it unreadable at card size, the card version drops the CI flags into the press station (flags on the press frame) and keeps the reel version as written.
2. The opening merge plates exceed the "one label per scene" rule; the brief's own instruction to open on `/codex-review` and `/codex-fullreview` requires them. They are names and the model pin only.
3. `gpt-6.1-sol` is a pin the skills tell runners to update (CR:15). If a newer Sol ships before export, the plate changes or goes.
4. The order change (deep-plan second) is the only departure from the brief. It buys the one honest on-screen handoff in the reel.
5. Smart-compact sits under an intro titled "Skills" although it is a mod (CL:51). Options: keep (the site's skills page already lists it as a neighbour), or retitle the intro.
6. The amber reading of the wow-loop evidence card and the why dial needle are small at card size; both get a 300 ms hold so they read.
