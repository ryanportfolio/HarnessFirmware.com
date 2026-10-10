# Pitch B: Glyph physics

Director B. Sources: `director-brief.md`, `recon/*.md`, `inspiration.md`, motion-design `SKILL.md` and `references/story.md`. Citation keys follow the recon files (M, CR, CF, IRa, LH, DP, SCR, why, wow, perf, A, S).

## 1. Direction and feeling

**Glyph physics: type as matter.** The whole world is built from the site's own type. Departure Mono characters are the bricks, Lineal is weight, Fraunces Italic is the person's voice, and Bayer-dither pixels are the state between a glyph and nothing. Each skill is one physical law that text obeys: it gets annotated, cast, condensed, hooked, loaded, printed, raced, stripped, unfolded.

Feeling and job: **When the reel ends, the viewer feels the calm of watching type obey simple, predictable laws, and knows what each skill does to a piece of work, who checks it, and where the person decides.**

Why this direction: the product is text. Prompts, diffs, ledgers, state files and review reports are all characters on a grid. Showing text behaving like matter keeps every picture literal about the medium these skills work in, while the behaviours stay physical enough to read without words (Heider-Simmel, inspiration.md section 4).

## 2. The shared kit

### Stage

- One monospace grid: 32 columns by 18 rows (16:9). On a 480x270 card each cell is 15 px and Departure Mono sits at about 12 px; at 1920x1080 each cell is 60 px. Everything snaps to cell positions at rest. Faint corner ticks mark the cells, `#3e5a45` at 20% opacity.
- Ground `#09100b`, the skills page ground where the cards live (design-and-avoid A2), with the site grain at .05.
- **Baseline**: a 1px rule on row 15, `rgba(243,243,236,.22)` (`--line`). Accepted matter rests on or above it.
- **Tray**: rows 16 and 17, under the baseline. Matter that fails falls here, dims to `#3e5a45` and stays as a record. The tray holds a fixed number of glyphs; when one lands, the oldest dithers out, so every scene's tray loops.
- **Title band** (reel only): rows 0 to 2, left aligned. Card versions leave it empty because the HTML description sits beside the card. All scene art lives in rows 3 to 17, so the same module serves both sizes.

### Actors (one look per actor, the same in all nine scenes)

| Actor | Glyph | Colour | Rule |
|---|---|---|---|
| Builder (the Claude session, executor, implementer, candidate) | solid block cursor and solid mono glyphs | green `#53db76`; a glyph at the moment it sets is `#72f28c` for 300 ms | Only the builder changes the work. |
| Fresh-context checker (auditor, `/why` reviewer, critics, perf reviewers, arena judge) | hollow block cursor, outline only | green stroke, no fill | Hollow means no history. It is born by dithering in, does one job, dithers out. Never shares the stage with the builder it checks. |
| Codex (the other vendor, `/merge` only) | proofreader's marks in thin margin slits | amber `#efc87e` | Marks only. Never touches a glyph of the work (CF:43, CR:48). |
| The person | Fraunces Italic words | paper `#f3f3ec` | The only matter that enters from above the frame. |
| Discarded record | any glyph, outline, dim | `#3e5a45` | Lives in the tray. |

Amber means Codex and nothing else. Failure elsewhere is shown by physics, not colour: a glyph that fails loses its fill and falls. **Gravity is the verdict.** This keeps amber's site meaning (a finding) without repeating the site's amber finding, repair, recheck picture.

### Work unit

The **slug**: a run of solid green Departure Mono cells on one row. A PR, a round's step, a measured frame, a candidate: each scene's work is slugs. The slug is the QQL ring-dot of this set (inspiration.md section 5): recognisable in every frame of every scene.

### Type use

- Departure Mono 400: all matter, labels, IDs, marks.
- Lineal 781: reel titles; heavy objects (the `/why` beam, the wow-loop deliverable, the showpiece subject word). Lineal at weight 200 is one arena candidate's face.
- Harness Text 500: the reel's short line under each title, and one arena candidate's face.
- Fraunces Italic: the person only. Typed commands, answers, `Go`.

### Named behaviours (nothing else moves)

1. **Set**: a glyph lands in its cell from scale 1.08 to 1, quint out, 360 ms, brightens then settles to green. Glyphs in a row set 60 to 80 ms apart.
2. **Slide**: travel along one grid axis at constant speed, eased only at the two ends (expo). Rows open and close gaps this way (kerning). No arcs, no flights.
3. **Fall**: the bond breaks; fill drains to outline in 150 ms, the glyph drops into the tray with ease-in, lands, dims. Never deleted.
4. **Dither**: a glyph thresholds through an 8x8 Bayer matrix into 2 px pixels and out, or the reverse. Used for births, exits, captures and compaction. Not a wave field; it is always one glyph changing state.
5. **Drop-in**: the person's Fraunces word falls from above the frame on a spring (bounce .2) and lands on the beat. Nothing else enters from above.

Payoff rule (inspiration.md C2): at each scene's payoff every actor stops for at least 1.5 s; only the grain and a 0.5 px shimmer on the person's word continue.

### Seam rules for every module

`p = (t mod T) / T`, p = 1 never rendered (inspiration.md B1). Every element is either at rest at p = 0 and p = 1, or moving at the same constant speed on both sides of the wrap (Holden). Queues (columns, trays, trails) advance one slot per loop and are generated by index, so the frame after a one-slot shift equals the frame before it. Drift uses seeded noise sampled on a circle (Jacob). All jitter comes from a seeded mulberry32 keyed by element index, never `Math.random`.

### Technique note (no code here)

2D canvas, one per module. Each glyph is rasterised once per face and size into an offscreen bitmap after `document.fonts.load` for the exact faces; Dither thresholds that bitmap against the Bayer matrix as a pure function of t. Text is drawn into the canvas, so the reel exports to MP4 with no DOM layer. No WebGL needed. DPR capped at 1.5.

## 3. The nine scenes

Proposed reel order (argued in section 4): `/merge`, `/deep-plan`, `/long-horizon`, `/smart-compact`, `/why`, `/wow-loop`, `/perf-loop`, `/arena`, `/showpiece`. Scenes are written in that order.

### 3.1 `/merge` (with `/codex-fullreview` and `/codex-review`): margin marks

**Metaphor**: a galley of type goes through proofreading. Codex reviewers write amber proofreader's marks in the margin and never touch the type; Claude resets the marked glyphs; only a clean galley squashes into the main column. The person's `/merge` rests in the corner the whole time: typed once.

**Why it differs**: the only scene with a second vendor, the only scene where checkers annotate instead of acting on the work, and the only scene whose work unit leaves into a shared body of text. Its checkers are amber margin slits, not hollow cursors.

**Layout**: person's `/merge` (Fraunces, paper) at bottom-left on the prompt row; galley at centre-left; main column (the target branch, dim green set lines) at right, cols 22 to 30.

**Beat sheet, T = 10 s**

| t (s) | Beat |
|---|---|
| 0.0 to 1.0 | A galley of two slugs (two commits) slides in from off-stage left and comes to rest at centre-left. |
| 1.0 to 3.0 | Round 1. Label `/codex-fullreview` sets above. Five thin amber margin slits rise around the galley, one per fresh reviewer; each sets zero to two amber marks (`^`, `×`) in the margin, pointing at cells. Five marks total. No mark enters the galley. |
| 3.0 to 3.6 | Claude verifies. Two marks lose their bond and Fall into the tray (refuted, kept as record); three stay. |
| 3.6 to 4.4 | Fix. The three marked cells re-Set as new glyphs (bright, then green). A third slug sets under the galley: the fix commit. The three confirmed marks dither out. |
| 4.4 to 5.8 | Rerun. The label retypes: `full` dithers out and `review` slides left, reading `/codex-review`. One amber slit rises, sets no mark, lowers. Clean. |
| 5.8 to 6.4 | CI. Four mono cells under the galley turn from `·` to `■`, left to right. |
| 6.4 to 7.4 | Squash-merge. The galley slides right into the open slot at the bottom of the column; its three slugs squash into one dense line as the leading collapses. |
| 7.4 to 8.0 | The column slides up one line; the top line dithers out at the crop. |
| 8.0 to 10.0 | Hold, 2.0 s. Only the grain and the shimmer on `/merge`. |

**Seam**: at p = 0 and p = 1 the galley is off-stage, the column is at rest with the same line pattern (generated by index, shifted one slot), `/merge` rests, the tray has the same count (two old tray glyphs dither out while the two refuted marks land). All velocities are zero across the wrap.

**Truth checks**: Codex never edits (CF:36, CF:43); only round 1 has several reviewers, reruns have one (M:51, M:53, CR:7); refuted findings are dropped and listed (M:57-61); Claude fixes and commits (M:63); CI before merge (M:73); squash (M:78); the person types `/merge` once and never again (M:13, M:15-18). The blocked path and the rerun cap stay off screen (brief: no fine print).

**Label (reel and card)**: `/codex-fullreview` retyped to `/codex-review`, one slot (CF:3, CR:2).

**Reel short line**: "Every PR goes through the Codex loop and merges when clean" (M:15).

**Card description (27 words)**: "When work is finished, type /merge once. Codex reviews each PR (several fresh reviewers first), Claude fixes confirmed findings, review reruns, CI is checked, and it squash-merges." (M:3, M:13, M:15-18, M:51, M:53, M:57-63, M:73, M:78; CF:3)

### 3.2 `/deep-plan`: condensation

**Metaphor**: a loose idea is a drifting cloud of glyphs. The agent drops question marks into it; nothing condenses until the person's own word falls in. Each answer pulls its part of the cloud into one solid ledger row. The ledger closes only on the person's `Go`.

**Why it differs**: the only scene where the person, not a checker, decides each step; the only scene whose raw material is formless (Brownian drift) rather than a slug. No reviewer of any kind appears.

**Layout**: cloud at left (cols 2 to 14), ledger at right (cols 17 to 30), rows labelled `Q1`, `Q2` and so on.

**Beat sheet, T = 9 s**

| t (s) | Beat |
|---|---|
| 0.0 to 0.6 | Cloud drifts; ledger empty. |
| 0.6 to 1.4 | Round A. Three green `?` Set inside the cloud, each with option cells `a)` `b)`; `a)` sits first and slightly brighter (the recommendation). |
| 1.4 to 3.2 | Three Fraunces answers Drop in, 0.6 s apart. Each landing condenses the glyphs around its `?` into a solid row that Slides into the ledger as `Q1` to `Q3`. The second answer lands on `b)`, not the recommended `a)`: an override. |
| 3.2 to 3.8 | Round B. Two `?` Set: questions that depended on round A. |
| 3.8 to 5.0 | Two answers Drop in; rows `Q4`, `Q5`. The cloud is used up. |
| 5.0 to 5.6 | The ledger's leading tightens: the frontier is empty. |
| 5.6 to 6.2 | Gate. A last `?` with `a) Go`. The person's Fraunces `Go` Drops in; a rule draws under the ledger. Closed. |
| 6.2 to 7.8 | Hold, 1.6 s. |
| 7.8 to 8.4 | The sealed ledger Slides off-stage right (handoff). |
| 8.4 to 9.0 | A new cloud dithers in at left, reaching the p = 0 state. |

**Seam**: cloud drift is circle-sampled noise, periodic in p, so its motion is continuous across the wrap; only its dither threshold changes at the end. Ledger empty at both ends.

**Truth checks**: at most 4 questions per round (DP:49; scene uses 3 and 2); recommendation first (DP:58); answers recorded in the user's words, the assistant never answers (DP:10, DP:76, DP:32); a later round depends on settled answers (DP:46-48); Go is an explicit pick, never inferred (DP:89); after Go it only hands off, builds nothing (DP:12, DP:93).

**Label**: `Go`, set in Fraunces as the person's word (DP:89).

**Reel short line**: "Interview a loose idea into decisions the user made" (DP:6).

**Card description (29 words)**: "Use it when an idea is still loose. It asks a few questions per round, records your answers in your words, and builds nothing until you explicitly say Go." (DP:3, DP:10, DP:12, DP:32, DP:49, DP:89)

### 3.3 `/long-horizon`: stencil and set

**Metaphor**: before any builder exists, a hollow stencil row is drawn: the frozen check. A fresh builder cursor fills it and leaves. A separate fresh checker cursor arrives from the opposite edge and presses each cell. Glyphs that fit bond; a glyph that does not fit falls into the Dead ends tray, where the next builder can see it. Only a fully bonded row joins the Verified progress column.

**Why it differs**: the only scene where the check exists as a shape before the work (pre-registered brief, LH:61), and where builder and checker enter from opposite edges and never meet. Its failure goes to a named memory, Dead ends, which changes the next attempt.

**Layout**: Verified progress column at left (cols 2 to 9), rows stacked; bench at centre (cols 12 to 24); Dead ends tray under the baseline at right.

**Beat sheet, T = 9 s**

| t (s) | Beat |
|---|---|
| 0.0 to 0.6 | Rest. Column of verified rows; empty bench. |
| 0.6 to 1.2 | Plan. A hollow stencil row of six cells draws in on the bench. |
| 1.2 to 2.2 | Executor A, a solid cursor, dithers in at the left edge, Sets six glyphs into the stencil, dithers out. |
| 2.2 to 3.4 | Auditor A, a hollow cursor, dithers in from the right edge and presses each cell right to left. Cell 3 overhangs its stencil: it Falls into the Dead ends tray. The other five drain back to outline (not verified). Auditor dithers out. |
| 3.4 to 4.4 | Executor B, a new cursor, fills the stencil; cell 3 gets a different glyph, the one in the tray is not reused. Dithers out. |
| 4.4 to 5.4 | Auditor B, new and hollow, presses all six. All bond: bright, then green. |
| 5.4 to 6.2 | Integrate. The row Slides left into the column; the column Slides up one row and its top row leaves the crop. |
| 6.2 to 9.0 | Hold, 2.8 s. |

**Seam**: column shifted one slot equals the start pose (rows generated by index); the tray drops its oldest glyph when cell 3 lands; bench empty at both ends.

**Truth checks**: three roles, fresh executor and auditor (LH:7, LH:63); auditor brief written at Plan before the executor exists (LH:61, LH:91); auditor never sees the executor's report (LH:59); one step per round (LH:91); only complete, clean, aligned enters Verified progress (LH:106); Dead ends recorded so failed approaches are not re-proposed (LH:55). No round count on screen (LH:158).

**Label**: `Verified progress` (LH:22).

**Reel short line**: "Run big tasks in audited rounds" (LH:5).

**Card description (28 words)**: "For work bigger than one context window. Each round a fresh agent builds one step, a separate fresh auditor checks it, and only passing work counts as progress." (LH:2, LH:7, LH:91, LH:106)

### 3.4 `/smart-compact`: colon hooks

**Metaphor**: the session is a tall column of mixed text. When the person types `/smart-compact`, a copy of the column peels off (the fork), reads it, and writes a short block of rows, each starting with a colon hook. Then the column collapses: lines that catch on a hook slide in and kern tight; tool output and dead tangents catch on nothing and dither away.

**Why it differs**: the only scene with no checker at all; the instructions are written by a fork of the same session and shown before anything is removed. The behaviour is catching and condensing, not judging.

**Layout**: transcript column at centre-left; instruction block at right; the person's prompt row at the bottom.

**Beat sheet, T = 9 s**

| t (s) | Beat |
|---|---|
| 0.0 to 1.0 | The session continues: lines Set at the bottom at a steady rate and the column Slides up. Lines are green mono, dim long runs of noisy glyphs (tool output), and a few short Fraunces lines (the person's standing instructions). |
| 1.0 to 1.5 | The person's `/smart-compact` Drops in on the prompt row. |
| 1.5 to 3.0 | A translucent copy of the whole column Slides right by eight cells (the fork sees the whole transcript). Beside it, rows Set top to bottom, each beginning with `:`; the top row reads `Goal:`. |
| 3.0 to 3.4 | The fork copy dithers out. The instruction rows stay visible. |
| 3.4 to 5.4 | Compaction. Lines in the original column Slide right toward the hooks; Fraunces lines catch first on the top rows, then state and decision lines lower down. Noisy runs and dead tangents dither to pixels and fade. The result is one dense block. |
| 5.4 to 7.2 | Hold, 1.8 s. |
| 7.2 to 9.0 | The dense block Slides up to the head of the column; new lines Set beneath it at the same steady rate as 0.0 to 1.0. |

**Seam**: the line-setting rate at 7.2 to 9.0 equals the rate at 0.0 to 1.0, so velocity matches across the wrap; the column (dense block on top, K new lines under it) is the same at both ends. The previous dense block becomes part of the next transcript, which is true of compaction.

**Truth checks**: runs only when the user types it (SCR:43-51); a fork that sees the whole transcript writes the instructions (SCR:3-4, SCR:53); priority order, goal and standing instructions first (SCR:7-15); the user sees the instructions before compaction (SCR:65); drops tool output, tangents, superseded plans (SCR:17, SCR:31). No context meter, no threshold, no auto-trigger.

**Label**: `Goal:` (SCR:23). Other rows show only their `:` hook.

**Reel short line**: "Write custom /compact instructions from this session, then compact with them" (SCR:46).

**Card description (28 words)**: "When you want to compact, type /smart-compact. A fork of the session writes what to keep (goal, state, decisions, next step), shows it, then runs /compact with it." (SCR:7-15, SCR:43-53, SCR:65; CL:49-50)

### 3.5 `/why`: load test

**Metaphor**: a recommendation is a heavy Lineal beam resting on two small glyph supports (the one or two facts it leans on). One fresh hollow weight arrives with no history and walks along the beam. Where the span is weak the beam sags and the glyphs at the stress point loosen to pixels. The pick is refined; nothing under the baseline moves.

**Why it differs**: exactly one checker, and it applies weight instead of comparing, marking or measuring. The object is a single choice, not a body of work. The baseline row (the files) is visibly untouched.

**Beat sheet, T = 8 s**

| t (s) | Beat |
|---|---|
| 0.0 to 0.6 | Rest. Beam across cols 8 to 24 on two supports; a dim file row lies on the baseline. |
| 0.6 to 1.2 | The person's `/why` Drops in at left. |
| 1.2 to 1.8 | One hollow cursor dithers in above the beam. |
| 1.8 to 3.4 | It Slides along the beam. The beam flexes under it (each glyph offset by a sag curve centred on the weight). Over the unsupported span the sag deepens and two glyphs loosen into pixels. |
| 3.4 to 4.2 | The main agent refines: the two loosened glyphs re-Set as different glyphs, and a third support Sets under the weak span. The beam straightens. |
| 4.2 to 4.6 | The hollow cursor dithers out. |
| 4.6 to 6.6 | Hold, 2.0 s, with the label. |
| 6.6 to 7.4 | The refined beam Slides out left; the next recommendation Slides in from the right and comes to rest. |
| 7.4 to 8.0 | Rest. |

**Seam**: beam at rest in the start pose at both ends; the file row never moves.

**Truth checks**: one fresh reviewer, never a panel (why:2, why:102); it gets only the recommendation (why:39); it reviews a pick, not a past mistake (why:7, why:15); the recommendation can change (why:51, why:72); no file edits (why:76). No "other vendor" claim (why:38).

**Label**: `Why it matters` (why:58).

**Reel short line**: "Pressure-test a recommendation with one fresh reviewer" (why:2).

**Card description (28 words)**: "Run /why on a recommendation before you act on it. One fresh reviewer with no session history looks for weak spots; the pick may change, files do not." (why:2, why:11, why:39, why:51, why:76)

### 3.6 `/wow-loop`: impressions

**Metaphor**: the deliverable is a moving Lineal glyph. Critics never judge the glyph itself; they take impressions of it, dithered pixel copies peeled off mid-motion into a filmstrip, and measure those. A five-cell contract column fills one solid cell per passing check. The contract never moves; only the work changes.

**Why it differs**: the only scene where checkers work from copies of the output (captures), and where verdicts are a fixed binary contract. Two checkers act at once with different tools (pixel copies and a measuring rule). Earlier rounds' filmstrips persist below as a trail.

**Layout**: deliverable glyph at centre-left; filmstrip under it; contract column of five cells at right with a fixed rule on its left edge; trail of older filmstrips dimming under the baseline.

**Beat sheet, T = 9 s**

| t (s) | Beat |
|---|---|
| 0.0 to 0.6 | Rest. The glyph moves through a short repeating gesture; contract cells empty. |
| 0.6 to 2.2 | Two hollow cursors dither in. The experience critic peels four impressions off the moving glyph, each a dithered copy that Slides into the filmstrip; frame 3 shows a stroke out of line. The engineering critic lays a measuring rule of tick glyphs across the strip and marks the jump. |
| 2.2 to 2.8 | Verdicts. Four contract cells fill solid; cell 3 stays empty. Critics dither out. |
| 2.8 to 3.6 | The builder's solid cursor re-Sets the faulty stroke of the live glyph. |
| 3.6 to 5.0 | Two new hollow critics. The old filmstrip Slides down and dims into the trail; new impressions, new measurement: all frames in line. |
| 5.0 to 5.4 | Cell 3 fills. Label `passed`. |
| 5.4 to 7.4 | Hold, 2.0 s. |
| 7.4 to 8.4 | The item Slides out left; the next item of the set Slides in; contract cells clear by dither; the trail shifts one slot. |
| 8.4 to 9.0 | Rest. |

**Seam**: each loop is the next item of a set of like items, judged against the same shared rubric (wow:57); start and end poses match after the one-slot trail shift.

**Truth checks**: verdicts come from captures the verdict-giver read; self-review never establishes acceptance (wow:18); two fresh critics with distinct lenses (wow:112, wow:120-121); critics write captures and reports, never the deliverable (wow:20); binary verdicts, no scores (wow:21); the bar is never lowered (wow:23, wow:131); state persists so a later run resumes (wow:8). No score climbing, no blind A/B judges (conditional), no round budget on screen.

**Label**: `passed` (wow:79).

**Reel short line**: "Evidence-gated review and repair loop" (wow:3).

**Card description (29 words)**: "For visual work held to a written bar. Two fresh critics judge it from their own captures and measurements, each check passes or fails, the builder never grades itself." (wow:3, wow:8, wow:18, wow:21, wow:112)

### 3.7 `/perf-loop`: kerning race

**Metaphor**: a measured line of glyphs; its length is the time a scenario takes. Each round the builder closes one gap (one hypothesis). Then the line is re-set several times, baseline and candidate rows alternating, each typing out left to right at the same constant speed: a race where the shorter row finishes first. Over-tightening makes two glyphs collide; that is a regression, and the gap springs back open.

**Why it differs**: the only scene about repeated measurement and run-to-run spread; the checkers re-run and inspect rather than judge. The failure is a collision (quality loss), not a wrong answer.

**Layout**: measured line at centre; a fixed vertical budget rule; six run rows stack above it during measurement.

**Beat sheet, T = 9 s**

| t (s) | Beat |
|---|---|
| 0.0 to 0.6 | Rest. The line has five wide gaps and ends past the budget rule. A thin bracket marks the widest gap (top contributor). |
| 0.6 to 1.2 | Round 1. The solid cursor Slides one pair tight; the two glyphs overlap. |
| 1.2 to 2.4 | Runs. Six rows race, baseline and candidate alternating; each has a small seeded jitter in length. Candidates finish first. |
| 2.4 to 3.2 | Two hollow cursors. One re-runs a baseline and candidate pair; the other walks the line and stops at the collision. Label `discard`. The pair Slides back open (only this round's edit). Run rows dither out. |
| 3.2 to 3.8 | Round 2. The builder swaps the wide glyph for a narrower one; the gap closes with no overlap. |
| 3.8 to 5.0 | Runs race again; candidates finish clearly earlier than the spread. |
| 5.0 to 5.8 | Both reviewers pass it. Label `keep`. Run rows dither out. The line's end now sits inside the budget rule. |
| 5.8 to 8.2 | Hold, 2.4 s. |
| 8.2 to 9.0 | The line Slides out left; the next job's line Slides in from the right and comes to rest. |

**Seam**: start pose at rest at both ends.

**Truth checks**: one implementer, one testable hypothesis per round (perf:52); alternating baseline and candidate runs (perf:63); repeated baseline runs with visible spread (perf:40); failed experiment reverts only that round's edits (perf:67); keep needs a repeatable gain with no disallowed regressions (perf:67); measurement and regression reviewers, fresh (perf:73-78); bottleneck ranked by measured contribution (perf:48); quality is preserved (perf:8, perf:65). No numbers, no "all devices".

**Label**: one slot reading `discard`, later `keep` (perf:61).

**Reel short line**: "Run measured optimization rounds with independent review" (perf:3).

**Card description (28 words)**: "Use it to make something faster. Each round makes one change, measures it against repeated baseline runs, and keeps it only if the gain repeats and reviewers agree." (perf:3, perf:40, perf:52, perf:63, perf:67, perf:73)

### 3.8 `/arena`: strip the face

**Metaphor**: candidates build in separate sealed lanes, each in its own typeface. For judging, every candidate is copied, its face is stripped by dithering, and it is re-set in neutral Departure Mono under a neutral letter. The judge reads only those neutral copies against a small criteria grid and brackets a recommended base. The parent then reads every original and grafts one glyph from two other candidates into the base, where each glyph re-sets in the base's face.

**Why it differs**: the only scene where blinding is the picture (identity is literally the typeface, and stripping it is the mechanism); the only scene with parallel builders; the judge recommends and the parent decides. One lane is a dropout and stays empty, recorded.

**Layout**: four lanes at left separated by 1px rules; judge panel at right with neutral copies and a criteria grid (four criteria rows by three letter columns).

**Beat sheet, T = 9 s**

| t (s) | Beat |
|---|---|
| 0.0 to 0.4 | Rest. Four empty lanes. |
| 0.4 to 1.8 | Three lanes Set a short glyph cluster each, at once: Lineal 781, Lineal 200, Harness Text. Lane 4 sets nothing; its rule turns dashed and dim (dropout). |
| 1.8 to 2.6 | Blinding. A copy of each cluster dithers out of its face and resolves in Departure Mono in the judge panel, tagged `A`, `B`, `C` in an order that does not match the lanes. Originals stay in their lanes. |
| 2.6 to 3.8 | A hollow judge cursor dithers in, reads the neutral copies, and the criteria grid fills cell by cell (solid pass, empty fail). It brackets one letter as the recommended base and dithers out. |
| 3.8 to 4.6 | Parent. Lane tags dither in beside the lanes, revealing the map. A solid cursor Slides along all three lanes, including the low scorer; it keeps the recommended base (lane 2). |
| 4.6 to 5.8 | Graft. One glyph from lane 1 and one from lane 3 Slide along their lanes and down the shared edge into lane 2's cluster; as each enters, its outline morphs into lane 2's face. |
| 5.8 to 7.8 | Hold, 2.0 s. The base reads as one face. |
| 7.8 to 9.0 | Other candidates dim (they stay in scratch), then everything clears by dither to empty lanes. |

**Seam**: empty lanes at rest at both ends.

**Truth checks**: three by default, more on request (A:33); dropouts recorded, run continues (A:39); no two workers share a writable path (A:29); neutral letters with names, angle, vendor and model traces removed (A:26); judge starts after all candidates return, fresh and read-only, sees only criteria and judge copies, returns pass/fail per criterion plus a recommended base (A:41); parent reads every candidate and decides (A:45); at most one or two ideas from each other candidate, rewritten to the base's conventions (A:47). No vendor or model on screen (A:35 conditional).

**Label**: `judge/` (A:26).

**Reel short line**: "Builds parallel attempts at one task, judges them blind" (A:3).

**Card description (28 words)**: "When the right shape is unclear, it builds several real versions separately, has a fresh judge compare them blind, then grafts a few ideas onto the base." (A:3, A:8, A:29, A:41, A:47)

### 3.9 `/showpiece`: unfolding the subject

**Metaphor**: the subject's own word comes apart along its strokes, and those parts become the whole composition: a stem becomes a column rule, a counter becomes a frame, an arch becomes a motion path. It is proved small in one corner first, then grown. Then the swap test: replace the word with placeholder cells and the composition cannot stand, because every part came from that word.

**Why it differs**: the only scene with no checker and no pass or fail of a slug; the work is generated from the subject's letterforms, and the test is a substitution, not a review.

**Subject word**: `harness`, set in Lineal: the real subject of this site, so no invented specificity (S:24).

**Beat sheet, T = 9 s**

| t (s) | Beat |
|---|---|
| 0.0 to 0.6 | Rest. `harness` in Lineal at centre. |
| 0.6 to 2.0 | The letters come apart along stroke joins: stems, arches, counters Slide onto grid lines. |
| 2.0 to 3.2 | Specimen. In a small box at top-left the parts compose a tiny version: stem as rule, counter as frame, arch as a path a dot travels once. |
| 3.2 to 4.6 | The specimen's parts Slide out along grid lines to full stage size. |
| 4.6 to 6.0 | Swap test. The small name slot in the composition dithers to placeholder cells `▯▯▯▯▯▯▯`; parts that came from it lose their anchor and sag one cell. The name dithers back; the parts re-Set. |
| 6.0 to 8.0 | Hold, 2.0 s, with the label. |
| 8.0 to 9.0 | The composition folds back along the same grid lines into the word. |

**Seam**: the word at rest at both ends; the fold-back ends at rest.

**Truth checks**: ambition is the default (S:10); find the subject's material first (S:22); prove at small scale in the medium (S:42); the swap test (S:36); never invent specificity (S:24). No banned-defaults list, no originality score, no reviewers (S:76, S:78, S:80).

**Label**: `Ambition is the default` (S:10).

**Reel short line**: "Push an artifact past what people expect from its kind, in any medium" (S:3).

**Card description (29 words)**: "For work that should surprise people who know its kind. It finds the subject's material, builds a small specimen first, and reworks anything that could pass for any subject." (S:3, S:22, S:34, S:36, S:42)

## 4. The reel (91 s)

### Order, argued

Brief order with one move: `/deep-plan` goes from 4th to 2nd, ahead of `/long-horizon` and `/smart-compact`. Reason: it makes two handoffs literally true. deep-plan's closed ledger can be handed to long-horizon as a Contract and Acceptance block (DP:93, DP:89), so the ledger becomes the stencil; and long-horizon names progress lost to compaction in its trigger and resumes after it (LH:2, LH:115), so its column becomes the session that gets compacted. `/merge` stays first as the owner asked. If the owner keeps the brief order, every scene still works; only the three handoffs in that stretch fall back to dither cross-fades on the shared grid.

### Title treatment in the reel

Each scene's name sets in Lineal 781, `#f2efdf`, in the title band at scene start + 0.2 s (Set, 70 ms stagger). The short line sets in Harness Text 500, `#c2c9ba`, at + 0.9 s and holds until the handoff. Longest short line (13 words) needs 13 x 250 ms + 1 s = 4.25 s of reading; every scene gives it at least 6 s. Both dither out in the handoff.

### Timeline

| t (s) | Segment | Picture and handoff |
|---|---|---|
| 0.0 to 0.8 | Intro | Empty grid. A green block cursor blinks on the baseline. |
| 0.8 to 2.6 | Intro | `Skills` Sets in Lineal across the title band, large; under it the mono line `HARNESS FIRMWARE · FOR CLAUDE CODE AND CODEX`. |
| 2.6 to 4.0 | Intro | Hold. |
| 4.0 to 5.0 | Intro to `/merge` | `Skills` dithers out. The person's Fraunces `/merge` Drops in from above onto the prompt row: the one keystroke. A galley slides in from the left under it, so the scene opens on the review layers. |
| 5.0 to 15.0 | `/merge` | Module from round 1 (margin slits rise at 5.2) to the squash. The reel skips the module's own galley entry (done under the intro) and replaces its hold end with the handoff. |
| 14.2 to 15.6 | Handoff | The column's top line dithers out as in the loop, but its pixels drift left instead of vanishing and gather into a cloud. |
| 15.0 to 24.0 | `/deep-plan` | Module. The cloud is the one from `/merge`'s pixels. |
| 23.2 to 24.6 | Handoff | The sealed ledger does not leave the stage: it Slides to centre and its rows drain to outline, becoming long-horizon's hollow stencil. |
| 24.0 to 33.0 | `/long-horizon` | Module from Executor A (its Plan beat is the handoff). |
| 32.2 to 33.6 | Handoff | The Verified progress column Slides to centre-left and noisy lines Set between its rows: the long session's transcript. |
| 33.0 to 42.0 | `/smart-compact` | Module from the `/smart-compact` drop-in. |
| 41.2 to 42.6 | Handoff | The dense block Slides to centre; its `Goal:` row thickens and re-Sets in Lineal as the `/why` beam. |
| 42.0 to 50.0 | `/why` | Module. |
| 49.2 to 50.6 | Handoff | The refined beam's glyphs gather into one large Lineal glyph: the wow-loop deliverable. |
| 50.0 to 59.0 | `/wow-loop` | Module. |
| 58.2 to 59.6 | Handoff | The final filmstrip stretches into one row; its frames become the cells of perf-loop's measured line (frames into frame time). |
| 59.0 to 68.0 | `/perf-loop` | Module. |
| 67.2 to 68.6 | Handoff | The six run rows thin to four rules: arena's lanes. |
| 68.0 to 77.0 | `/arena` | Module. |
| 76.2 to 77.6 | Handoff | The base cluster re-Sets as `harness` in Lineal, centred: showpiece's subject. |
| 77.0 to 86.0 | `/showpiece` | Module. |
| 85.4 to 86.6 | Handoff | The composition folds into the word, then the word dithers to pixels that settle into nine rows. |
| 86.0 to 88.0 | End slate | Colophon: the nine skill names Set in Departure Mono, one per row, `#b2b5ab`, like a type specimen's index. |
| 88.0 to 88.6 | End slate | The nine rows' leading collapses into one line, as in `/smart-compact`: `harnessfirmware.com` in Departure Mono green, with `HARNESS FIRMWARE · FOR CLAUDE CODE AND CODEX` above it. |
| 88.6 to 91.0 | End slate | Hold, 2.4 s, with the cursor blinking after the URL. |

Each handoff runs inside the last 0.8 s of one scene and the first 0.6 s of the next. Every morph keeps one object's identity across the change (motion-design Continuity rule); no cuts.

### Contact-sheet QA before polish

Render all nine modules at p = 0, .25, .5 and .75 at 480x270 on one sheet (inspiration.md A3). Fix or cut any scene where the slug is not recognisable or where two scenes look alike at the same phase.

## 5. Self-check

### Metaphor distinctness

| Scene | Physical law | Checker and its verb | Differs from the other eight because | Avoid-list check |
|---|---|---|---|---|
| `/merge` | annotation, then squash | Codex amber margin slits; mark only | only second vendor; only checker that never touches the work; only work that leaves into a shared column | No double outline, no amber lens (marks in slits), no gate or person-with-posts, no stamp, no scan |
| `/deep-plan` | condensation | none; the person decides | only formless material; only scene driven by the person's words each step | No five-node ring, no session frames |
| `/long-horizon` | casting into a stencil | hollow cursor presses; misfit falls | only pre-drawn check shape; builder and checker enter from opposite edges; failure feeds Dead ends | Explainer beat 5 shows "brief first" with frames, scan, stamp and `VERIFIED`; this uses none of those. Not the skills-page four-stage rounds or the `/long-horizon` HTML round demo |
| `/smart-compact` | hooking and condensing | none; a fork writes instructions | only scene with a fork; instructions shown before removal | No context meter, no falling meter, no three trimmed columns (about film); the cut is driven by written hooks |
| `/why` | load and flex | one hollow weight | single checker applying weight to a single choice; files visibly untouched | No ghost sessions, no amber self-review arc |
| `/wow-loop` | printing impressions | two hollow critics, captures and a rule | judging copies of output; fixed binary contract; trail of rounds | Not card-art wow-loop (no ghost goal sheet, scan, amber diamond, stamp, round dots); no amber |
| `/perf-loop` | racing and kerning | two hollow cursors re-run and inspect | repeated runs with spread; collision as regression | Not card-art perf-loop bars, diamond or stamp; not field-log before/after bars; no numbers |
| `/arena` | stripping the face | one hollow judge reads neutral copies | blinding as typeface removal; parallel builders; dropout lane; parent decides | Not three cards or lanes merging into one frame (card-art, skills page); no letter chips flying to parts (tags dither in place); not the A/B/C homepage story; four lanes, one empty |
| `/showpiece` | unfolding letterforms | none | composition generated from the subject's strokes; substitution test | Not card-art showpiece's scan wiping a generic page into a layout: there is no generic page and no scan |

Also absent everywhere: the five-node ring, round check stamp and `VERIFIED`, scan-line sweeps, ghost sessions, file-glyph repository strip, strands and comets, block pyramid, cracking DONE stamp, H mark flash, skill-showcase four-stage gallery, 390px example.

### Every on-screen string

| String | Where | Source |
|---|---|---|
| `Skills` | intro | `site/skills.html` h1 (site-map section 1) |
| `HARNESS FIRMWARE · FOR CLAUDE CODE AND CODEX` | intro, end slate | about film resolve (site-map section 4) |
| `harnessfirmware.com` | end slate | about film resolve (site-map section 4) |
| `/merge`, `/deep-plan`, `/long-horizon`, `/smart-compact`, `/why`, `/wow-loop`, `/perf-loop`, `/arena`, `/showpiece` | reel titles, colophon, person's typed commands | brief skill list; M:3, DP:3, LH:2, SCR:45, why:2, wow:3, perf:3, A:8, S:3 |
| "Every PR goes through the Codex loop and merges when clean" | `/merge` short line | M:15 (clause of the announcement line) |
| `/codex-fullreview`, `/codex-review` | `/merge` label | CF:3, CR:2 |
| "Interview a loose idea into decisions the user made" | `/deep-plan` short line | DP:6 |
| `Go` | `/deep-plan` label | DP:89 |
| `Q1` to `Q5`, `a)`, `b)` | `/deep-plan` glyph matter | DP:56, DP:58 |
| "Run big tasks in audited rounds" | `/long-horizon` short line | LH:5 |
| `Verified progress` | `/long-horizon` label | LH:22 |
| "Write custom /compact instructions from this session, then compact with them" | `/smart-compact` short line | SCR:46 |
| `Goal:` | `/smart-compact` label | SCR:23 |
| "Pressure-test a recommendation with one fresh reviewer" | `/why` short line | why:2 |
| `Why it matters` | `/why` label | why:58 |
| "Evidence-gated review and repair loop" | `/wow-loop` short line | wow:3 |
| `passed` | `/wow-loop` label | wow:79 |
| "Run measured optimization rounds with independent review" | `/perf-loop` short line | perf:3 |
| `discard`, `keep` | `/perf-loop` label | perf:61 |
| "Builds parallel attempts at one task, judges them blind" | `/arena` short line | A:3 (first two clauses) |
| `judge/` | `/arena` label | A:26 |
| `A`, `B`, `C` | `/arena` neutral letters | A:26 |
| "Push an artifact past what people expect from its kind, in any medium" | `/showpiece` short line | S:3 |
| `Ambition is the default` | `/showpiece` label | S:10 |
| `harness` | `/showpiece` subject word | the site's own subject (product name, site-map section 4) |
| `^`, `×`, `·`, `■`, `?`, `:`, `▯` | glyph matter, not words | Departure Mono subset includes geometric shapes (design-and-avoid A6) |

Capital first letters on short lines are the only change from source text. No periods, no em dashes, no counts, no "nothing merges without your approval", no model id needed on screen.

### Open questions for the owner

1. Approve moving `/deep-plan` to second place (section 4)?
2. The `/merge` CI beat uses four `·` to `■` cells with no label. Keep it wordless, or drop CI from the picture?
3. The person's commands are set in Fraunces Italic in paper. This reserves Fraunces for the person across the reel; titles use Lineal. Acceptable?
