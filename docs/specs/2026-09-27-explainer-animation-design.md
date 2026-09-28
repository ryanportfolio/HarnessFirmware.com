# Homepage explainer animation: storyboard and spec

Date: 2026-09-27. Status: design (round 1), amended in round 3 (amendment v2: reduced motion plays the same)
in round 6 (amendment v5: one short body sentence per beat, and every beat holds still for at least 2 s
before it ends) and in round 7 (amendment v6: beat 1 names what is missing, bigger desktop captions that
fill their column, no one-word last lines) and in round 13 (amendment v7: the owner-approved caption copy,
a layout per beat, caption lines revealed in step with the drawing, and a length of 90 to 110 s; it
replaces v5's 26-word budget and one-sentence body) and in round 14 (amendment v5's visual polish: beat 1
drawn larger, focal dimming, a drawing event for every caption line, 10px phone labels, and a detent
landing that never slices the title). Build rounds follow this file; where it gives a number, use it, and where it says "adjust",
the screenshot check decides.

A new dark section sits directly after the hero loop (`section.living-system#loop`). It autoplays once
when scrolled into view, has Pause and Replay buttons, and tells the whole story in nine beats: the
problem, what installing the firmware puts in the repository, how one task runs, how the repository
improves, and what the next session and the next project start from.

Design angle: the repository is the constant. One SVG stage holds a repository strip along its bottom
that stays on screen for the whole sequence. Sessions, agents and checks come and go above it, and every
beat either reads from the strip or writes into it. The model never changes; what the repository holds
does. The hero draws one task going round a loop. This section draws the system that
loop runs inside: sessions before and after, the files, the separate agents, and the path out to other
projects.

Copy rule: every line of visible text is in the table under `## On-screen copy`, cited to fact IDs in
`.tmp/long-horizon/hf-explainer/research/firmware-facts-v2.md` (Harness Firmware `main` at d9d2333). The
caption copy is the owner-approved v7 draft (`.tmp/long-horizon/hf-explainer/round-13/copy-draft.md`);
the build copies it verbatim. Never claim "nothing merges without your approval" (fact N9) or "no
lock-in", and state no skill counts (N1).

## Beats

Nine beats, one continuous story. Beat numbers are also the `data-beat` values used below. Each beat's
caption layout is its `data-layout` (see Visuals, Caption layouts).

| # | Beat | Layout | Purpose for the visitor | Facts |
|---|---|---|---|---|
| 1 | The problem | `cross-list` | Name the problems they already feel, one crossed-out line each: lessons lost between chats, progress lost to compaction, self-graded "done", a model sharing its own blind spots. Three empty sessions stay on screen as dim ghosts until beat 9. | P1 P2 P3 P4 |
| 2 | Project memory | `pairs` | Project knowledge as plain files in git, set against what goes wrong without it: memory on one machine, anything saved, contradicting facts. The repository strip appears and stays. | F2 F3 F5 S1 S4 S5 S8 |
| 3 | Recall | `example` | Before unfamiliar work the agent reads the project's own pitfalls, cites the note it acted on, and loads a skill only when a task calls it. | H1 O1 S6 F4 S12 |
| 4 | Plan | `rows` | The contract behind a big task: numbered checks, steps sized for one fresh context, progress on disk, a stall rule. | H3 S17 S18 S23 S24 |
| 5 | Checked apart | `sequence` | In audited rounds, the order that keeps the check independent: brief first, a content-hash baseline, the auditor running the checks, and a three-part pass. | H4 O2 S19 S20 S21 S22 |
| 6 | Review and your call | `checklist` | Review findings are checked before you see them, the other vendor's model reviews on request, and running a skill never authorizes a merge, release or deploy. The merge lands in the strip only after your stamp. | S28 S32 S41 H11 |
| 7 | Refine | `checklist` | Rules change on evidence: three checks before a rule edit, only your words as preferences, and an audit that flags what nobody reads. | S44 S45 S47 N14 |
| 8 | Next project | `statement` | With approval, a generic fix travels to the template; local stays the default. The across-projects view no other section draws. | I4 S49 |
| 9 | Next session | `outcome` | A new session opens next to the three ghosts and starts from what the project has learned, in plain files both agents read. | O1 O2 O7 |

## On-screen copy

Every row is one line of visible text: the section headline and bottom note, each beat's step label,
headline and caption lines, and each label drawn on the stage. Button text is excluded (`Replay ↺`, and
the Pause control `Pause ‖` / `Play ▷`). A pair is two rows (the without line, then the with line). A
labeled row is one row, `Label: text`, as the DOM text reads; step labels and row labels render uppercase
through CSS. File and command names keep their case. Caption markers (✕, ✓, step numbers) are CSS
decoration, not text. Facts are IDs in `research/firmware-facts-v2.md`; a caption row carries every ID
in its line's brackets in the approved draft.

| Beat | Copy | Facts |
|---|---|---|
| Section | The same agent, with a repository that remembers and checks | F1 F3 H4 |
| Section | Illustrative sequence · plain files in your repository | F1 |
| 1 | 01 / The problem | P1 |
| 1 | Without Harness Firmware, every session starts from scratch | P1 |
| 1 | Lessons vanish when the chat ends | P1 |
| 1 | Long tasks lose progress to compaction | P3 |
| 1 | "Done" is the agent grading its own work | P2 |
| 1 | A model reviewing itself shares its own blind spots | P4 |
| 1 | Session | P1 |
| 1 | Self-reported: done | P2 |
| 2 | 02 / Project memory | F3 S8 |
| 2 | Project knowledge lives in git, reviewable like code | F3 S8 |
| 2 | Memory stuck on one machine | S8 |
| 2 | Travels with git clone to every machine and sandbox | S8 |
| 2 | Anything gets saved | S1 S4 |
| 2 | Each save passes three tests; task status never gets in | S1 S4 |
| 2 | Old facts contradict new ones | S5 |
| 2 | A changed fact gets one dated "retired" line | S5 |
| 2 | CLAUDE.md · AGENTS.md | F2 |
| 2 | .claude/reference/ | F3 |
| 2 | .claude/skills/ | F5 |
| 2 | .agents/skills/ | F5 |
| 2 | Claude Code | F5 |
| 2 | Codex | F5 |
| 3 | 03 / Recall | H1 |
| 3 | Before unfamiliar work, the agent reads the project's own pitfalls | H1 O1 |
| 3 | per pitfalls.md (2026-03-14): reset the test database first | S6 |
| 3 | A fact that changes an action is cited with its file and date, so you can correct a stale one in one reply. | S6 |
| 3 | Skills cost one index line until a task calls the full playbook. | F4 S12 |
| 3 | New task | H1 |
| 3 | commands.md | F3 |
| 3 | pitfalls.md | F3 S6 |
| 3 | skill index | F4 S12 |
| 4 | 04 / Plan | H3 |
| 4 | Big tasks run against a written contract | H3 S17 |
| 4 | Checks: Numbered acceptance checks, never weakened to make a round pass | S17 |
| 4 | Steps: Each sized for one fresh context | H3 |
| 4 | Memory: Progress and dead ends saved to a file that survives compaction | S18 S23 |
| 4 | Stalls: A step that fails twice must change approach | S24 |
| 4 | Goal | H3 |
| 4 | Acceptance checks | H3 S17 |
| 5 | 05 / Checked apart | H4 |
| 5 | In audited rounds, the builder never grades its own work | H4 O2 |
| 5 | The auditor's brief is written before the builder exists | S20 |
| 5 | A content-hash baseline shows exactly what changed | S19 |
| 5 | The auditor runs the checks itself | S21 |
| 5 | Only complete, clean and aligned counts as progress | S22 |
| 5 | Auditor brief · written first | H5 S20 |
| 5 | Builder · fresh context | H4 |
| 5 | Auditor · fresh context | H4 S21 |
| 5 | Baseline | H4 S19 |
| 5 | VERIFIED | H6 H10 |
| 6 | 06 / Review and your call | S32 S41 |
| 6 | Reviews check every finding against the code before you see it | S32 |
| 6 | On request, the other vendor's model reviews the diff | S28 |
| 6 | Dismissed findings stay listed, so you can overrule them | S32 |
| 6 | Running a skill never authorizes a merge, release or deploy | S41 N9 |
| 6 | /codex-review | H9 S28 |
| 6 | You | S41 H11 |
| 7 | 07 / Refine | I1 S44 |
| 7 | Rules change on evidence, never on a one-off slip | S44 |
| 7 | Three checks must tie a failure to a rule; zero changes is valid | S44 |
| 7 | Only your own words count as a preference | S45 |
| 7 | An audit flags never-read notes and never-used skills to prune | S47 N14 |
| 7 | /refine | I1 S44 |
| 7 | candidate to prune | I2 S47 N14 |
| 8 | 08 / Next project | I4 |
| 8 | With your approval, one project's fix improves the template | I4 S49 |
| 8 | /sync-starter sends back only fixes that can be made generic, and you pick what moves; keeping a lesson local stays the default. | S49 I4 |
| 8 | /sync-starter | I4 S49 |
| 8 | Template | I4 |
| 8 | Next project | I4 O6 |
| 9 | 09 / Next session | O1 |
| 9 | The next session starts from what the project has learned | O1 |
| 9 | Decisions and pitfalls, read before unfamiliar work | O1 |
| 9 | In audited rounds, "done" means an independent check passed | O2 |
| 9 | Plain files, MIT licensed, read by Claude Code and Codex | O7 |

Source notes for the judges (facts file `research/firmware-facts-v2.md`, firmware `main` d9d2333):

- Beat 1: "Lessons vanish when the chat ends" is framing (P1; no firmware file says it). "Long tasks lose
  progress to compaction" is long-horizon SKILL.md:2 (P3). The "Done" line is long-horizon SKILL.md:135
  "The executor's report is a claim" (P2). "A model reviewing itself shares its own blind spots" is
  long-horizon SKILL.md:191-194 (P4).
- Beat 2: "Travels with git clone to every machine and sandbox" is CLAUDE.md:41 "(committed, travels to
  every machine and sandbox)" (S8). "Each save passes three tests; task status never gets in" is
  recall SKILL.md:24-28 and CLAUDE.md:41 (S1, S4). The "retired" line is recall SKILL.md:32-35 (S5).
- Beat 3: the mono line is recall SKILL.md:12-13's own example, shortened (S6); the next sentence is
  its reason. "Skills cost one index line" is README.md:89 and context-weight.sh:4-7 (F4, S12); no
  token figure is given (N13).
- Beat 4: each row is one clause of the long-horizon contract: S17 (numbered, never weakened), H3
  (steps sized for one fresh context), S18 and S23 (state file and dead ends), S24 (two failures, change
  approach).
- Beat 5: S20 (brief written at Plan), S19 (content-hash manifest), S21 (the auditor runs the
  done-check), S22 (complete + clean + aligned). The headline keeps the "In audited rounds" qualifier
  (O2 scope).
- Beat 6: S32 (every finding verified; dismissals shown), S28 (cross-vendor on request; the caption says
  "the other vendor's model" and names no company, N6), S41 (a skill invocation does not authorize
  publication). The caption scopes approval to what a skill may not do and does not say nothing merges
  without approval (N9, H11). The stage label `You` sits on the gate the tiles cross only after the
  person's stamp; S41 and H11 support "each needs its own authorization".
- Beat 7: S44 (three checks, zero changes valid), S45 (only the user's words), S47 with N14's limit: the
  audit flags candidates; the stage label says `candidate to prune`, not unused.
- Beat 8: sync-starter SKILL.md:30-32, :69 and README.md:67 (S49, I4).
- Beat 9: O1 (as mechanism), O2 (true of audited rounds, stated in the line), O7 (plain files, MIT, both
  runtimes; no "no lock-in").
- Nothing states a count of skills (N1), a measured number (N3), mentions CI (N4), or names a vendor as an
  endorser (N6).

## Visuals

### Section structure

One section, one SVG stage per breakpoint, all copy as HTML.

```html
<section class="explainer motion-block" id="explainer" aria-labelledby="explainer-title">
  <h2 class="ex-title" id="explainer-title">The same agent, with a repository that <em>remembers and checks</em></h2>
  <div class="ex-stage">
    <div class="ex-art-box" role="img" aria-label="(see Build notes)">
      <svg class="ex-art ex-art--wide" viewBox="0 0 960 560" aria-hidden="true" focusable="false">...</svg>
      <svg class="ex-art ex-art--tall" viewBox="0 0 360 480" aria-hidden="true" focusable="false">...</svg>
      <span class="ex-label" data-beat="1" style="--x:40;--y:38;--nx:16;--ny:14">Session</span>
      ... one span per stage label in the copy table ...
    </div>
    <ol class="ex-beats">
      <li class="ex-beat" data-beat="1" data-layout="cross-list">
        <small class="ex-step">01 / The problem</small>
        <h3>Without Harness Firmware, every session starts from scratch</h3>
        <ul class="ex-lines">
          <li class="ex-line">Lessons vanish when the chat ends</li>
          ... one li.ex-line per draft line ...
        </ul>
      </li>
      <li class="ex-beat" data-beat="4" data-layout="rows">
        ...
        <ul class="ex-lines">
          <li class="ex-line"><span class="ex-key">Checks:</span> Numbered acceptance checks, never weakened to make a round pass</li>
          ...
        </ul>
      </li>
      ... beats 2 to 9: ul (cross-list, pairs, rows, checklist, outcome), ol (sequence),
          div of p (example, statement) ...
    </ol>
    <div class="ex-index" aria-hidden="true"><span>[01]</span> ... <span>[09]</span></div>
  </div>
  <div class="ex-bottom">
    <span>Illustrative sequence · plain files in your repository</span>
    <div class="ex-controls">
      <button type="button" class="ex-pause" hidden>Pause ‖</button>
      <button type="button" class="ex-replay" hidden>Replay ↺</button>
    </div>
  </div>
</section>
```

- Both SVGs are inline in `index.html` and authored in their end state (every beat drawn, rest
  opacities applied), so no-JS gets the finished drawing with no script. CSS shows
  `.ex-art--wide` above 767px and `.ex-art--tall` at 767px and below.
- Stage labels are HTML spans over the SVG, placed in viewBox units: `left: calc(var(--x) / 960 * 100%)`,
  `top: calc(var(--y) / 560 * 100%)`; at 767px and below `--nx / 360` and `--ny / 480`. A label with no
  `--nx` carries `data-wide-only` and is `display:none` at 767px and below. Inline `style=""` is allowed
  by the CSP; inline script is not.
- The two headings of the beat list are real `h3` elements under the section `h2`.
- Every caption line is one `.ex-line` element, in draft order. A pair is two lines (`.ex-no`, then
  `.ex-yes`). A labeled row's DOM text reads `Label: text`, the label in `span.ex-key`. Markers are CSS
  `::before` content with empty alt text (`content: "✕" / ""`), or a screen-reader word for the pairs
  (`"✕" / "Without:"`, `"✓" / "With:"`), so the DOM text is the approved copy and nothing else.

### Ground, type and palette

- Root is `.motion-block`, so the global element rules in styles.css do not apply; the stylesheet sets
  its own box-sizing, margins, heading sizes and focus style.
- Ground `#0b100c`, `border-top: 1px solid #53db7633` (the `.self-improving` treatment), so it reads as a
  new section below the hero's `#070c08`. Padding
  `clamp(20px, calc(20px + 40*(100vw - 402px)/1518), 60px)` sides, `clamp(72px, 11vh, 140px)` top and
  bottom (`svh` after a `vh` fallback). The page grain overlay already covers it.
- `h2.ex-title`: `--font-display`, weight `var(--display-weight)`, tracking `var(--display-track)`,
  `clamp(36px, 4.4vw, 68px)/1.02`, color `#f2efdf`, max-width 15em. The `<em>` uses the accent set:
  `--font-accent`, `--accent-style`, `--accent-weight`, `--accent-vs`, color `var(--green)`.
  Round 16: the site header's scrolled background is 95% opaque (`#0f1210f2`), so a title under it
  showed through. While the title is not wholly below the header, the module gives it `.is-under` and
  it fades to opacity 0 over 200 ms (`transition: opacity .2s`, only once `.is-live` is set); it fades
  back once it is whole below the header again. An IntersectionObserver whose root margin is minus the
  header height (read on mount and on resize, the observer rebuilt when it changes, like the start
  trigger) decides; a title partly below the fold is not under the header and stays visible. No scroll
  listener and nothing in the frame loop. Without scripting the title is always visible.
- `.ex-step`: Departure Mono 12px, uppercase, tracking .1em, `#50d873`.
- Beat `h3`: `--font-display`, weight `var(--display-weight)`, tracking -.015em, `#f2efdf`,
  `text-wrap: balance`. Motion layout (scripting enabled, amendments v6 and v7): `clamp(24px, calc(6px +
  2.8vw), 58px)/1.06`, about 46px at 1440 and 58px at 1920; 21px at 767px and below. Static layout (no
  JS): `clamp(24px, 2.3vw, 36px)/1.08`, for the three-column list.
- Caption lines (`.ex-lines`, a grid of `.ex-line`, gap .55em): `--font-text`, `var(--text-weight)`,
  line-height 1.42, `#c2c9ba`, `text-wrap: balance`. Motion layout: `clamp(15px, calc(10.4px + .7vw),
  22px)`, about 20.5px at 1440; 15px (line-height 1.38, gap .4em) at 767px and below. Static layout:
  `clamp(16px, 1.2vw, 19px)`, max-width 34em.
- Step label to `h3`: 14px (18px at 1024px and up, 10px at 767px and below); `h3` to the lines: 16px
  (22px at 1024px and up, 12px at 767px and below). At 1024px and up the caption column is top-aligned
  with the drawing; at 1440x900 the tallest caption (beat 2) is 455px against a 438px drawing (the floor
  is 60%, 263px), so the caption column runs past the drawing's foot.
- No caption headline or line ends with a single word on its last line, at any width (checked at 1920,
  1536, 1440, 1280, 1024, 768 and 390). `balance` holds it; the copy carries no `&nbsp;`. In the rows
  layout the label's first-line top sits within 2px of the text's, so a one-line row reads as one line.
- Stage labels: Departure Mono `clamp(10px, 1.49cqi, 11px)` above 767px (round 16; `min(11px, 1.49cqi)`
  before, which fell to 7.9px at 1024 and 8.9px at 1152), so they keep their place on the drawing as it
  narrows and never drop below 10px; exactly 10px at 767px and below (round 14), however narrow the phone
  drawing gets, with the tall geometry sized for them (see Narrow layout). Compact stage (round 16): when
  the wide drawing is under 671px (the two-column layout from 1024 to about 1290px; a container query on
  `.ex-art-box`, above 767px only), the 10px floor makes labels up to 1.27 times larger against the
  drawing than it was drawn for, so they drop their tracking (`letter-spacing: 0`), set at line-height
  1.3, and take compact anchors where the wide ones collide: `--cx`, `--cy` and `--ctx`, each
  falling back to `--x`, `--y` and `--tx`. Compact anchors: `Self-reported: done` shifted left
  (`--ctx: -6%`) clear of the task frame; `CLAUDE.md · AGENTS.md` top at y 460; `pitfalls.md` and
  `commands.md` on one row at y 467 (`commands.md` from x 365), `.claude/reference/` below them at
  y 494; `skill index` on two lines (a compact-only `br.ex-cbr`) centred on y 441, right-aligned at
  572; `Auditor brief · written first` top at y 338; `candidate to prune` at (300,397); `/refine`
  at (678,397). `Acceptance checks` does not fit its 120-unit contract sheet at this size and is left
  out there (`data-roomy-only`), as on phones; `Goal` stays. Beat 1's labels keep their `--x` and
  `--y`, which the module reads for the zoom. File and command names (`CLAUDE.md`,
  `/refine`) keep case and use `#53db76`, as `code.cmd` does. Word labels (Session, You, Template) are
  uppercase, tracking .08em, `#97b29e`. `VERIFIED` is uppercase `#72f28c`. `Self-reported: done` and
  `candidate to prune` are `#efc87e`.
- SVG drawing, from card-art.mjs: root group `fill="none" stroke="#53db76" stroke-width="1.2"
  stroke-linecap="round" stroke-linejoin="round"`; occluding fills `#10150f`; scans and newly written
  lines `#72f28c` at 1.6; the self-report loop and the replaced skill line `#efc87e`; ghosts and unread
  files `#3e5a45`; secondary shapes opacity .45; the check stamp is card-art's
  `<circle r="16" fill="#10150f"/><path d="m-7 0 5 5 10-11" stroke-width="2"/>` (translated to each
  stamp position). The active beat's group gets class `is-active`, which applies
  `filter: drop-shadow(0 0 4px #53db7680)`; the filter is toggled, never animated. Dimming (see Focus) is
  opacity only.
- Index chips `[01]` to `[09]`: the card index style scaled down: `1px solid rgba(247,247,247,.15)`,
  Departure Mono 11px, padding 4px 6px, gap 6px. Future beats `#3e5a45` text; played beats `#97b29e`;
  current beat `#50d873` text with border `#53db76`.
- Pause and Replay follow the hero's `#system-replay`: `background:none; border:0; color:#bde5c7;
  font: 12px var(--font-mono)` (one size up from the hero's 11px, round 16), underline `1px #6a9474`
  (lighter than the hero's `#44614b`, round 16) 7px below the text, so they stay findable below a sequence
  that runs 103.8 s; position and row height are unchanged; and `min-height:44px` and
  `display:inline-flex; align-items:center` so the hit target is 44px tall. Focus:
  `outline: 2px solid #5fb775; outline-offset: 4px` on `:focus-visible`.

### Caption layouts (amendment v7)

Each `.ex-beat` carries `data-layout`; the layout sets how its lines read. Colors are the drawing's.

| Layout | Beats | Treatment |
|---|---|---|
| `cross-list` | 1 | Each line hangs from an amber `✕` (`#efc87e`), as the drawing marks failures in amber. |
| `pairs` | 2 | Two columns, one row per pair, a dashed rule (`rgba(247,247,247,.15)`) above each row: the without line in `#97b29e` after an amber `✕`, the with line in `#f2efdf` after a green `✓` (`#53db76`). At 767px and below the pair stacks, without above with, one rule per pair. |
| `example` | 3 | The recall citation as a cited note: Departure Mono at the line size, `#a4f5ba` on `#10150f`, a 2px `#53db76` rule on its left. The two sentences follow in body type. |
| `rows` | 4 | A label column (4.3em): the label in Departure Mono, uppercase, tracking .1em, `#50d873`, at `max(11px, .62em)`; the text beside it; a dashed rule above each row. |
| `sequence` | 5 | Numbers `01` to `04` in Departure Mono `#50d873` (a CSS counter) in a 2.2em left column. |
| `checklist` | 6, 7 | Each line hangs from a green `✓` (`#53db76`). |
| `statement` | 8 | One sentence at 1.2 times the line size, `#f2efdf`, line-height 1.34; `/sync-starter` in Departure Mono `#53db76`. |
| `outcome` | 9 | The green list the sequence ends on: text `#c4fad2` after a bright `✓` (`#72f28c`). |

### Stage geometry (wide viewBox 0 0 960 560)

Zones: sessions row top left; the task area top centre; the rounds rail across the middle; the builder,
auditor and brief below it; the repository strip along the bottom; the template and next project in a
right column. Coordinates are starting values; adjust by up to 20 units to clear label collisions found
in screenshots.

| Element | Beat | Wide geometry | Tall geometry (0 0 360 480) |
|---|---|---|---|
| Session frames S1-S4 (rect 64x48, three note lines inside) | 1, 9 | x 40/120/200/280, y 48 | 44x34 at x 16/70/124/178, y 20 |
| Beat 1 zoom (round 14): the whole beat 1 group, labels with it, during beat 1 | 1 | `translate(172.8 166.4) scale(1.6)`, centring the cluster (x 40 to 344 with its labels) on (480,280) | `translate(-10.4 188.8) scale(1.6)`, centring x 16 to 222 on (180,240) |
| Compaction bar (thin line with a fill segment) | 1 | y 116, x 40 to 344 | y 64, x 16 to 222 |
| Self-report loop (amber arc from S3's right edge back into S3, amber tick) | 1 | from (264,84) round to (264,56) | from (168,46) round to (168,28) |
| Repository strip (rect, rx 6) | 2 | x 40 to 760, y 410 to 510 | x 16 to 344, y 330 to 450 |
| Kernel compartment: two file glyphs 24x30 (hero Recall glyph path, scaled) | 2 | at (60,426), (94,426) | at (26,350), (54,350) |
| Reference compartment: six file glyphs 24x30; pitfalls.md first, commands.md fourth | 2 | x 228/266/304/342/380/418, y 424 | 3x2 grid, x 96/130/164, y 346/388; pitfalls.md (96,346), commands.md (130,346) |
| Contradicted line and dated retired line (round 14), on the third reference glyph | 2 | amber 2.8 over the glyph's middle line, (308,442) to (324,442) (round 15); retired line at its foot, amber 1.6, a date dot at 309 and a line from 312.5 to 322, y 451.5 | glyph (164,346): middle line y 364, amber line x 168 to 184; retired line y 373.5, x 169 to 182 |
| Third reference note brought forward (round 15): glyph, amber line and retired line together, during beat 2's third pair | 2 | centre (316,439) to (316,330), scale 3 | centre (176,361) to (176,250), scale 3 |
| Skills compartment: two rows of index ticks (rect 14x10, step 18) | 2 | row A y 424, row B y 460, x 580 to 724 | row A y 350, row B y 380, x 214 to 322 |
| Runtime chips with thin lines up to their rows (both also to the reference compartment) | 2 | below the strip, y 521 to 545; round 16: Claude Code x 552 to 704, Codex x 710 to 788 (were 572 to 704 and 712 to 778), so their labels fit at 10px; labels centred at x 634 and 755 | wide only |
| Task frame (rect 220x176 wide, 220x88 tall), task card inside | 3, 4 | frame x 420 to 640, y 30 to 206; card 120x28 at (440,44) | frame x 16 to 236, y 90 to 178; card 110x28 at (26,100) |
| Recall strands (from the pitfalls.md and commands.md glyphs up into the task frame) | 3 | from (240,424) and (354,424) up, then right into the frame's left edge at (420,172) and (420,188) | from (108,346) and (142,346) up between the builder and auditor frames to (138,178) and (142,178) |
| Skill scan and playbook sheet (a tick in row A grows into a sheet that rises into the task frame) | 3 | tick at (634,424) to a 40x52 sheet at (452,88) | tick at (268,350) to a 32x42 sheet at (36,132) |
| Contract sheet: goal line, three checkbox rows | 4 | 120x108 at (508,84) | 78x72 at (148,100) |
| Rounds rail and three step tiles 44x28 | 4, 5 | rail y 250, x 420 to 770; tiles x 450/560/670, ending at the gate at x 612/664/716 | rail y 216, x 40 to 300; tiles 36x24 at x 64/144/224, ending at x 180/222/264 |
| Stall marks and detour (round 14): two amber crosses above step 2, then a detour round it; gone as beat 5 opens | 4 | crosses at (569,225) and (581,225), 6x6; detour from the rail at x 540 down to y 276 and back up at x 624 | crosses at (154,194) and (164,194), 5x5; detour x 122 to 202, down to y 233 |
| Failing step brought forward (round 16): tile 2 and both crosses together, while it fails | 4 | centre (582,244.5) to (740,140), scale 2.5 (`GEOM.wide.stall`) | centre (162,211) to (294,146), scale 3 (`GEOM.tall.stall`) |
| Baseline tile (dashed, at the rail start) | 5 | x 384 to 420, y 236 to 264 | x 16 to 40, y 204 to 228 |
| Auditor brief card 36x26 with a small clock tick | 5 | appears at (718,296), ends in the auditor frame at (718,294) (706 until round 16) | 32x24; appears at (310,260), ends in the auditor frame's lower right at (280,286), clear of its label |
| Builder frame (starts dashed and empty) | 5 | x 364 to 534, y 280 to 336 (from x 384 until round 16, so its label fits at 10px); label at (374,288) | x 14 to 134, y 236 to 316; label at (19,240) |
| Auditor frame | 5 | x 550 to 758, y 280 to 336 (to 752 until round 16); `Auditor brief · written first` right-aligned at 748 | x 146 to 318, y 236 to 316; label at (151,240) |
| Codex reviewer frame (double outline, 3 unit inset; in beat 6's group since round 13) | 6 | x 660 to 760, y 110 to 170 | x 250 to 344, y 110 to 160 |
| Dismissed finding (round 14): the reviewer's third finding line turns dashed and an amber cross marks it | 6 | line (672,150) to (704,150), cross 6x6 at (710,147) | line (262,144) to (292,144), cross 5x5 at (297,141.5) |
| Merge gate (two posts) and the person glyph (hero human-gate path) | 6 | posts at x 772 and 788, open at 764 and 796, y 226 to 274; glyph at (780,186) | posts at x 316 and 332, open at 310 and 338, y 204 to 228; glyph at (324,186) |
| Merge strand from the gate into the strip | 6 | (780,274) curving to (740,410) | (324,228) to (330,330) |
| pitfalls.md new line; refine ticks and swapped line; prune marks | 7 | strand along y 250 from the rail start (384) to the pitfalls.md strand at x 240; new line on glyph (228,424); three ticks at x 631 to 662, y 398; row A tick at (652,424); prune on glyph (418,424) and row B tick at (706,460) | on glyph (96,346); ticks at x 258 to 283, y 324; row A tick at (286,350); prune on glyph (164,388) and row B tick at (304,380) |
| Template box and next project mini strip, joined by strands with a small approval glyph | 8 | template x 810 to 930, y 300 to 350; next project x 810 to 930, y 430 to 490; strand (760,490) to (780,490) to (780,325) to (810,325), approval glyph at (780,396) (x 800 until round 16), `/sync-starter` at (796,396), `Next project` centred at (870,504); template to next project round the right side at x 946 | template x 232 to 344, y 60 to 88; next project x 250 to 344, y 16 to 44; strand up the right edge x 352, approval glyph at (352,300) |
| S4 fill strands (from the kernel and pitfalls.md glyphs up into S4) | 9 | from (106,424) and (240,424) to (300,96) and (330,96) | from (38,350) up the left edge x 8 to (200,54) |

### Per beat: what is drawn and how it moves

Motion vocabulary for all beats: strokes draw in with `stroke-dasharray` / `stroke-dashoffset` from
lengths measured once in `parts()`; shapes move by `transform` and fade by `opacity`; nothing animates
`filter`. Every group stays once drawn, so the drawing accumulates; while the sequence plays, the groups
that carry the current beat's point are lit and the rest dim (see Focus), and the end state is the
composite, every group back at rest opacity .7 and beat 9 at 1.

1. The problem. S1 draws, three note lines write into it, then S2 opens empty while S1's notes fade (the
   history does not carry). S2 fills, S3 opens empty, S2's notes fade. Under the row the compaction bar
   fills to 70% of its length and drops back to 20% with an amber tick, twice. S3 marks itself done
   (amber tick, `Self-reported: done`), then the amber self-report arc draws from the frame's edge back
   into itself: the work checked by the context that did it. All of this is drawn at 1.6 times its
   resting size, centred in the stage (round 14; the group's `transform`, labels moved with it), so the
   problem reads at a glance. As the beat exits (its last 800 ms) S1 to S3 turn to ghost stroke
   `#3e5a45` and the cluster eases (smoothstep) to its resting place and size in the sessions row, where
   it stays.
   Reuses: card-art `frame(parts, t)` pattern, `smooth`, `lerp`, `opacity`, `move`; amber for the
   failure, as card-art does.
2. Project memory. The strip outline draws in (1500 ms), then its compartments ink in one at a time,
   each with a caption pair: kernel glyphs, the six reference glyphs (120 ms apart), the two skill tick
   rows (left to right, 40 ms a tick). Each compartment's label fades in with it. Then the third
   reference note leaves its slot and comes forward above the strip, drawn three times its size
   (round 15), turning amber as it goes; one of its lines is overwritten by a thick amber line (a new
   fact contradicts an old one). The amber goes and one short dated line writes in at the note's foot
   (the "retired" line, amber 1.6), which stays. The note holds there, then eases back into its slot.
   Nothing else inks in while it is forward; once it is back, the runtime chips appear below with thin
   lines up to their skill rows and to the reference compartment. Reuses: the hero's ink-in order idea (the drawing arrives in reading order) and the card-art glyph style.
3. Recall. The task frame draws; the task card slides down into it (translate y -24 to 0). The
   commands.md and pitfalls.md glyphs brighten to `#72f28c` and strands rise from them into the frame;
   the other four reference glyphs stay at .45. Later a scan line (`#72f28c`, 1.6) runs along skill row
   A; one tick grows into a playbook sheet and rises into the frame. The rest of the row stays a row of
   names. Reuses: card-art scan line (`dare-scan`) and the grow-and-move transform pattern.
4. Plan. Inside the task frame a contract sheet draws: a goal line, then three checkbox rows 250 ms
   apart. The sheet splits into three step tiles that slide down to the rail's line, then the rail
   draws under them. Then step 2 fails twice: its tile turns amber and two amber crosses appear above
   it, 500 ms apart; a detour draws round it along the rail and the tile turns green again (the next
   attempt changes approach). Round 16: so the stall reads at a glance on a phone (the crosses were 3.7px at
   390x844), the failing tile and its crosses come forward together, as beat 2's retired note does: from
   4900 to 5300 ms into the beat they move into room nothing else uses in beat 4 and grow to 2.5 times
   their size (3 on the tall drawing), hold while both crosses draw (5200 and 5700), and ease back to the
   rail from 5950 to 6300 ms, before the detour draws (6300). One transform goes to the tile and both
   crosses (`GEOM.*.stall`); the cue times are unchanged. The crosses and the detour fade out as beat 5 opens. Reuses: card-art `passDots` idea for the three checkboxes.
5. Checked apart. The auditor brief card appears first, alone, with its clock tick. Then the builder
   frame draws dashed and empty (fresh: no notes inside), turns solid, and bars ink into tile 1. The
   dashed baseline tile appears at the rail start. The auditor frame draws; the brief slides into it. A
   scan passes over the baseline tile and tile 1; a check stamp lands on tile 1, which fills `#53db76` at
   .35, and `VERIFIED` fades in above it. Tiles 2 and 3 then run the same build, audit and stamp in a
   compressed pulse. Reuses: card-art check stamp, scan line, `lightPass` idea for the tiles, `[01]`
   index chips below the captions.
6. Review and your call. The Codex reviewer frame (double outline, a second shape so it reads as a
   different family) draws above the rail with `/codex-review`, scans the tile's diff lines, and stamps
   its own check. One of its three finding lines turns dashed and an amber cross marks it: a dismissed
   finding that stays listed. The gate posts appear; the three tiles slide along the rail to the closed
   gate. The
   person glyph draws above it; a check stamp lands on the glyph; only then do the gate posts slide
   apart and the merge strand run down into the repository strip. Round 13 moved the reviewer frame
   from beat 5 to this beat (same geometry, now in beat 6's group), where its caption line is. Reuses:
   the hero's human-gate glyph path (copied, not the hero's DOM), card-art check stamp.
7. Refine. A strand drops from the rail to the pitfalls.md glyph and a new line writes inside it in
   `#72f28c`. Three small ticks appear 300 ms apart beside `/refine`; a strand reaches a tick in skill
   row A, whose middle line fades out in amber while a new line draws in green. A scan sweeps the
   reference glyphs and skill rows; one glyph and one tick fade to dashed `#3e5a45` and
   `candidate to prune` appears in amber. Nothing is added to the strip except the one note line.
8. Next project. A strand leaves the strip's right end, passes a small approval glyph that stamps a
   check, and reaches the template box as it draws. A second strand runs from the template to the next
   project strip, which inks in with the same three compartments in miniature.
9. Next session. S4 draws beside the three ghosts in the sessions row. Strands rise from the kernel and
   reference glyphs into it; a check stamp lands in its corner; its note lines write in. In the beat's
   last 800 ms the whole composite comes back: ghosts dim, S4 bright, every earlier beat at rest opacity.

### Focus

At each beat the groups (`g.ex-g[data-beat]`) that carry its point are lit and every other drawn group
dims, together with its HTML labels (round 14). A beat's own group is always lit; an earlier group is
lit only when the beat's drawing uses it, with one exception: the repository strip (group 2) is lit in
every beat from 3 on (round 16). Dimmed to .35 in beats 4 and 5, the strip and its labels nearly vanished on
a phone, and the sequence's point is that the repository stays present throughout. A row lights at most
3 groups. Lit groups sit at opacity 1 (the check wants at least .9), all
other drawn groups and their labels at .35 (at most .45). The change eases (smoothstep) over the first
600 ms of each beat, outside every hold. In the last 800 ms of beat 9 the composite comes back: groups 1
to 8 at their rest opacity .7, group 9 at 1 and every label at 1, the markup's no-JS state. `FOCUS`,
`DIMMED` = .35, `FOCUS_IN` = 600 and `END_IN` = 800 in `explainer.mjs` hold these numbers; the
dimming is a pure function of `t`, like the rest of `frame()`.

| Beat | Lit groups | Why the earlier groups |
|---|---|---|
| 1 | 1 | |
| 2 | 2 | |
| 3 | 2, 3 | the strip: its notes brighten, strands rise from it, the scan runs along its skill index |
| 4 | 2, 4 | the strip: the repository stays present while the plan is made (round 16) |
| 5 | 2, 4, 5 | the strip, which stays present; the step tiles: the builder fills tile 1, the auditor scans and stamps the tiles |
| 6 | 2, 4, 6 | the tiles slide to the gate; the merge runs down into the strip |
| 7 | 2, 7 | the strip: the new pitfalls line, the swapped skill line and the prune marks are in it |
| 8 | 2, 8 | the strip: the strand to the template leaves from its right end |
| 9 | 1, 2, 9 | the ghost sessions S4 opens beside, and the strip the fill strands rise from |

Captions (DOM): all nine `li` are stacked in one grid cell. Captions change in sequence, so two never
show at once: at each beat change the outgoing beat moves opacity 1 to 0 and `translateY(0)` to
`translateY(-.3em)` over the first 250 ms after the boundary (ink curve); once it is gone, the incoming
beat moves opacity 0 to 1 and `translateY(.45em)` to 0 from 250 to 850 ms (expo). Beat 1 is already in
place at t = 0. The headline arrives with its beat; each caption line then appears on its own, at the
moment the drawing shows what it says (see Timing, Caption reveals): opacity 0 to 1 (smooth) and
`translateY(.45em)` to 0 (expo) over 400 ms. This is the site's sub-line rise without its blur (see
Timing). The index chip for the beat lights on the boundary with a `.6s` color transition, the site's
glow and color timing.

## Timing

One clock, `t` in ms from 0 to `TOTAL`. Beat boundaries:

| Beat | Start | Duration | Screenshot at (hold) | Caption words | Reading minimum | Last line lands | Last cue ends |
|---|---|---|---|---|---|---|---|
| 1 The problem | 0 | 10600 | 9200 | 40 | 10000 | 6000 | 6400 (arc), then the exit 9800-10600 (ghosts, scale-down) |
| 2 Project memory | 10600 | 13200 | 22400 | 51 | 12750 | 6800 | 9600 |
| 3 Recall | 23800 | 14200 | 36600 | 55 | 13750 | 7200 | 8200 |
| 4 Plan | 38000 | 12400 | 49000 | 48 | 12000 | 5600 | 7000 |
| 5 Checked apart | 50400 | 11200 | 60200 | 43 | 10750 | 6000 | 6800 |
| 6 Review and your call | 61600 | 11400 | 71600 | 44 | 11000 | 4600 | 5400 |
| 7 Refine | 73000 | 11000 | 82600 | 42 | 10500 | 5200 | 5400 |
| 8 Next project | 84000 | 9400 | 92000 | 34 | 8500 | 1400 | 3800 |
| 9 Next session | 93400 | 10400 | 103800 (end) | 39 | 9750 | 4200 | 4500, then the end 9600-10400 |

`TOTAL` = 103800 ms (103.8 s). Round 13 retimed every beat for the v7 captions (amendment v7: up to
about 110 s; the check allows 90 to 110 s). Four rules set each duration and reveal:

- Reading time: at least 250 ms per word of the whole caption: step label, headline and every line,
  counting each word that contains a letter or digit (a row's label counts). Captions run 34 to 55
  words, so 8500 to 13750 ms (the table's reading minimum).
- Last line: it lands (its reveal time plus 400 ms) at least max(3000, its words x 250 + 1500) ms before
  the beat ends. Beat 8's single 22-word line needs 7000 ms, so it lands at 1400 in a 9400 ms beat.
- Stagger: in a beat with two or more lines, the last line starts at least 800 ms after the first.
- Stillness: every drawing cue and every stage label fade finishes at least 2000 ms before the beat ends,
  and nothing on the stage changes from 2000 ms until 800 ms before the end. Only an exit into the next
  beat may use the final 800 ms: beat 1's ghosting and scale-down, and the composite coming back in beat
  9's last 800 ms. The focal dimming changes in each beat's first 600 ms.

"Last line lands" and "Last cue ends" are ms from the beat's start. The screenshot times fall inside
each beat's still window, with every line shown. The hero's phases run 3000 to 4200 ms with five-word
lines; these beats carry a step label, a headline and up to six lines, so they run longer.

Cues inside each beat (ms from the beat's start; draw-ins use quart-out unless noted):

- 1: S1 draws 0-600, notes 600-1200; S2 draws 1400-2000 while S1 notes fade 1400-1900; S2 notes
  1900-2400; S3 draws 2800-3400 while S2 notes fade 2800-3300; compaction bar fills 400-2400, drops
  2400-2600 (amber tick 2400-2500), fills 2600-3800, drops 3800-4000; amber self-tick 4400-4600 and
  `Self-reported: done` 4400-4800; self-report arc 5600-6400; hold 6400-9800; ghosting and the cluster's
  scale-down from 1.6 to 1 (smoothstep, labels with it) 9800-10600 (the exit).
- 2: strip outline 0-1500, dividers 1200-1700; kernel glyphs 1700-2200 with `CLAUDE.md · AGENTS.md`;
  reference glyphs 3000-4000 (120 ms apart), `.claude/reference/` 4000-4400; skill tick rows 4400-5220 (row B from 4600),
  `.claude/skills/` 4400-4800, `.agents/skills/` 4600-5000; the third note comes forward 5400-5900
  (expo) and turns amber 5400-5600, its amber line draws 5600-6000; the amber leaves 6400-6700 while
  the retired line draws 6400-6900; the note holds forward to 8000 and goes back 8000-8800 (smoothstep);
  runtime chips and lines 8800-9600, `Claude Code` 8800-9200, `Codex` 9000-9400; hold to 13200.
- 3: task frame 0-700, `New task` 700-1100; card slide 500-1100 (expo); pitfalls.md and commands.md
  brighten 1400-1800 with their labels, strands rise 1400-3000; scan along skill row A 6800-7400 with
  `skill index`; sheet grows and rises 7400-8200; hold to 14200.
- 4: contract 0-600; goal line 200-800 with `Goal`; checkboxes 900-1650 with `Acceptance checks`
  900-1300; split and slide 2400-3600 (expo); rail 3800-4600; step 2 fails: tile amber 5200-5300,
  crosses 5200-5400 and 5700-5900; detour 6300-7000 and the tile back to green 6300-6600; hold to 12400.
- 5: brief card 600-1200 with `Auditor brief · written first`; builder frame 1200-1700 with `Builder ·
  fresh context`; tile 1 bars 1700-2800; baseline tile 2800-3200 with `Baseline`; auditor frame and
  brief slide 4000-4600 with `Auditor · fresh context`; scan 4600-5600; stamp 5600-5900, `VERIFIED`
  5800-6200; tiles 2 and 3 6000-6800; hold to 11200. Beat 4's crosses and detour fade out 0-600.
- 6: Codex frame 700-1400 with `/codex-review` 700-1100, scan 1300-1700, stamp 1700-2000; gate posts
  appear 2000-2400; tiles to gate 2200-3100 (expo); dismissed finding: dashed at 2900, amber cross
  2800-3100; person glyph 2800-3400 with `You`; stamp 4200-4500;
  gate opens 4600-5200 (quint); merge strand 4800-5400; hold to 11400.
- 7: strand and pitfalls line 0-1200; refine ticks 1600, 1900, 2200 with `/refine`; strand to the skill
  tick 2600-2800, line swap 2800-3800; prune scan 4000-4800, prune marks and `candidate to prune`
  4800-5400; hold to 11000.
- 8: strand and approval stamp 0-1100, `/sync-starter` 700-1100; template draws 1000-2000 with `Template`
  1200-1600; second strand and next project ink-in 2600-3800, `Next project` 3000-3400; hold to 9400.
- 9: S4 draws 0-700; fill strands 800-1800; stamp 2400-2700; S4 notes 3800-4500; hold to 9600; the
  composite comes back 9600-10400.
- Every beat: focal dimming 0-600 (see Focus).

Easing, from the site's list (hero-pillars.mjs): DOM caption in, expo `cubic-bezier(0.16,1,0.3,1)`;
caption out, ink `cubic-bezier(0.4,0,0.2,1)`; gate opening, quint `cubic-bezier(0.22,1,0.36,1)`. Inside
`frame()`, JS equivalents: `smooth` (smoothstep, copied from card-art.mjs) for fades, quart-out
`1 - (1 - u) ** 4` for draw-ins, expo-out `u >= 1 ? 1 : 1 - 2 ** (-10 * u)` for slides. No blur: the
per-beat caption swap drops the sub-line's `blur(4px)`, because each new blur radius costs a 50 to 100
ms first frame (pitfalls.md, animated CSS blur) and this section swaps nine times.

Autoplay and playback:

- Start (round 7, round 17): the first time beat 1's caption is wholly on screen below the fixed
  `.site-header` and at least half of `.ex-art-box` is on screen below it, wherever the room under the
  header can hold both. A second IntersectionObserver watches the caption and the art box with
  `rootMargin` set to minus the header's height (thresholds `[0, .5, need, .995, 1]`). On mount and on
  `resize`, never inside `frame`, the module reads the header height and the caption and art boxes,
  and works out the shortest span that holds the caption and a contiguous half of the drawing (the half
  nearer the caption). If that span fits the room under the header with 24 px to spare, the rule above
  applies (`need` = .994); it also starts when the caption is whole and the drawing already runs under the
  header, since scrolling on cannot show more of it. If it does not fit (landscape phones such as
  667x375, 740x360 and 844x390, or 390x500), it starts on the caption alone: wholly on screen when the
  caption is at least 40 px shorter than the room, otherwise once it fills 92% of what fits
  (`need` = .92 x min(1, room / caption height)). Round 7's rule never fired at 390x500, 667x375 or
  740x360: with the caption above the drawing, the caption went under the header before half the
  drawing was on screen. The observer is rebuilt only when the header height, the rule or `need`
  changes, and disconnects after the start. It plays once and stops at `TOTAL`; it does not loop.
- Pauses when the stage leaves the screen entirely (an observer on `.ex-stage`, threshold 0), when
  `document.hidden` is true, or when the visitor presses Pause. Resumes from the same `t` when any part
  of the stage is back on screen, the tab is visible, and Pause is not pressed. Starting asks for more
  than staying on does; that is the hysteresis, so a stage at the viewport edge does not flicker
  between states. `prefers-reduced-motion` neither starts, stops nor
  pauses playback (amendment v2).
- Focus does not pause or start anything. Focus on Pause or Replay stays where it is through every state
  change. Window blur without a hidden tab does not pause (same as the hero).
- Frame loop as card-art.mjs: one rAF loop while running, `dt` capped at 64 ms, cancelled when not
  running; `set()` writes an attribute only when its value changed.
- Replay: sets `t = 0`, clears Pause, paints `frame(parts, 0)` and beat 1's caption state (headline only, every line hidden), and starts at
  once (the stage is on screen when its button is pressed). Focus stays on Replay; nothing is announced.
- Pause: toggles its text between `Pause ‖` and `Play ▷`. At `TOTAL` it gets the `hidden` attribute; if it had focus,
  focus moves to Replay first. Once the module has run, a hidden Pause keeps its box (`display:inline-flex;
  visibility:hidden`), so Replay does not move at the end at any width; `visibility:hidden` keeps it out
  of the tab order and the accessibility tree and stops clicks.

End state (t = `TOTAL`): the full composite drawing (ghost sessions S1 to S3 dim, S4 bright with its
check, the strip with its new pitfalls line, refined tick and prune marks, the merged rail, the template
and next project), beat 9's caption, chip `[09]` current and `[01]` to `[08]` played, Replay visible,
Pause hidden. The inline SVG markup in `index.html` is this state.

### Caption reveals

The headline arrives with its beat (250 to 850 ms). Each `.ex-line` then appears at its own time, driven
by the same clock `t` that drives `frame()`, in the same paint (`REVEAL` in `explainer.mjs`; a pure function of `t`, no layout reads): opacity 0 to 1
(smooth) and `translateY(.45em)` to 0 (expo) over 400 ms, no blur. At is ms from the beat's start when
the line starts to appear; it is fully shown at At + 400. Pause freezes the reveals with the clock,
Replay hides every line again (t = 0), reduced motion plays them the same, and without JS every line
shows. Before its beat a line is hidden; after its time it stays shown, so at `TOTAL` every line of beat
9 is visible.

Every line has a drawing event of its own that starts within 300 ms of its At (the check allows -300 to
+700 ms). Round 13 tied four lines to a neighbouring cue and beat 6's second line to the person glyph;
round 14 gave beat 2's third pair, beat 4's `Stalls` row and beat 6's second line elements of their own
(the contradicted and retired lines, the stall marks and detour, the dismissed finding). Beat 7's second
line keeps the skill-line swap: the one rule edit `/refine` makes, which the line qualifies; no stage
element stands for "your own words".

| Beat | Line | At | Drawing event |
|---|---|---|---|
| 1 | Lessons vanish when... | 1400 | S2 opens empty while S1's notes fade (1400-1900) |
| 1 | Long tasks lose progress... | 2400 | the compaction bar drops from 70% to 20%, amber tick (2400-2600) |
| 1 | "Done" is the agent... | 4400 | S3's amber self-tick and `Self-reported: done` (4400-4800) |
| 1 | A model reviewing itself... | 5600 | the amber arc loops from S3's edge back into S3 (5600-6400) |
| 2 | Memory stuck on one... | 700 | the strip outline draws, still empty (0-1500) |
| 2 | Travels with git clone... | 1700 | kernel glyphs ink into the strip with `CLAUDE.md · AGENTS.md` (1700-2200) |
| 2 | Anything gets saved | 3000 | reference glyphs ink in one by one (3000-4000) |
| 2 | Each save passes three... | 4000 | the reference set is complete; `.claude/reference/` labels it (4000-4400) |
| 2 | Old facts contradict new... | 5400 | the third note comes forward, three times its size, and turns amber (5400-5900); a thick amber line overwrites one of its lines (5600-6000) |
| 2 | A changed fact gets... | 6400 | the amber leaves and one short dated retired line writes in at the forward note's foot (6400-6900); the note goes back to its slot (8000-8800) |
| 3 | per pitfalls.md (2026-03-14)... | 1400 | pitfalls.md and commands.md brighten and strands rise (1400-3000) |
| 3 | A fact that changes... | 3000 | the strands reach the task frame (3000) |
| 3 | Skills cost one index... | 6800 | scan along the skill index; one tick grows into a playbook in the task (6800-8200) |
| 4 | Checks: Numbered acceptance... | 900 | checkbox rows tick in under the goal with `Acceptance checks` (900-1650) |
| 4 | Steps: Each sized for... | 2400 | the sheet splits into three step tiles (2400-3600) |
| 4 | Memory: Progress and dead... | 3800 | the rail draws under the tiles, the track the steps keep across rounds (3800-4600) |
| 4 | Stalls: A step that... | 5200 | step 2 turns amber and gets a cross, then a second (5200-5900); a detour draws round it (6300-7000) |
| 5 | The auditor's brief is... | 600 | brief card appears alone with `Auditor brief · written first` (600-1200) |
| 5 | A content-hash baseline shows... | 2800 | dashed baseline tile appears with `Baseline` (2800-3200) |
| 5 | The auditor runs the... | 4000 | auditor frame draws and takes the brief, then scans (4000-5600) |
| 5 | Only complete, clean and... | 5600 | stamp on tile 1 and `VERIFIED`; tiles 2 and 3 follow (5600-6800) |
| 6 | On request, the other... | 700 | Codex reviewer frame draws with `/codex-review`, scans and stamps (700-2000) |
| 6 | Dismissed findings stay listed... | 2800 | one finding in the reviewer frame is crossed in amber and turns dashed, still listed (2800-3100) |
| 6 | Running a skill never... | 4200 | the person's stamp; only then the gate opens and the merge runs (4200-5400) |
| 7 | Three checks must tie... | 1600 | three ticks beside `/refine` (1600-2400) |
| 7 | Only your own words... | 2800 | the rule edit: the skill line `/refine` reached turns amber and is replaced (2800-3800) |
| 7 | An audit flags never-read... | 4800 | prune marks and `candidate to prune` after the scan (4800-5400) |
| 8 | /sync-starter sends back... | 1000 | the approval check stamps and the template draws (700-2000) |
| 9 | Decisions and pitfalls, read... | 800 | strands rise from the kernel and pitfalls glyphs into S4 (800-1800) |
| 9 | In audited rounds, "done"... | 2400 | a check stamp lands on S4 (2400-2700) |
| 9 | Plain files, MIT licensed... | 3800 | S4's note lines write in (3800-4500) |

### Scroll detent

Amendment v8, the owner's request: when a visitor scrolls down to the explainer and overshoots, the page
stays on it until they scroll some more. Amendment v9, after two failed attempts: no lock on touch. Only
mouse-wheel and trackpad scrolling is held.

- Reading position (round 14): the scroll offset at which the reading block, the union of `.ex-bottom`
  (the note row with Pause and Replay), `.ex-art-box` and `.ex-beats`, sits below the fixed
  `.site-header`, centred in the room left under the header when it fits:
  `docTop - hb - max(0, (innerHeight - hb - (bottom - top)) / 2)`, with `hb` the header's bottom, `top` and
  `bottom` the block's edges and `docTop` its top in document coordinates. When the section title (`h2`)
  fits in that room together with the block (`bottom` minus the title's top at most `innerHeight - hb`),
  the title joins the block and the union of both is centred instead. Otherwise the title must sit wholly
  under the header: the offset is at least the title's bottom minus `hb`, in document coordinates. The
  header never slices the title, and the note row never starts under the header. The result, clamped to
  the scrollable range and rounded, is published as `#explainer[data-reading]` (px) each time it is
  measured. Measured on mount, `resize`, `load`, `harness:motion-ready`, font load and when the section or
  the scroll layer changes size; never in the frame loop, and a scroll event triggers no measurement. The
  header height is read, not hard-coded. The title joins the block at 1920x1080, 1440x900 and 768x1024; at
  1280x800, 1024x768 and on phones it sits wholly under the header.
- Hold (wheel and trackpad only): the module acts on the `wheel` event before the browser scrolls. Each
  event's `deltaY` is converted to pixels (lines as 40 px, pages as the viewport height) and added to
  where the gesture's wheel input has sent the page so far (its target), which runs ahead of `scrollY`
  while the browser animates a notch. The target counts only while the page is still on its way to it:
  `scrollY` lies between its value at the gesture's previous wheel event and the target, give or take
  8 px. Anywhere else, a key, anchor, scrollbar or script scroll has moved the page since, so the target
  is dropped and the event is measured from `scrollY`. Whether the event crosses is judged from
  `scrollY`, never from the target: the page is short of the reading position and the event takes it
  there or past, in either direction. The one exception is a notch the browser ran long: the target
  still counts, the page was short of the reading position at the previous event, and it is now at it
  or at most 8 px past it. On a crossing the module calls `preventDefault()` and places the page at the
  reading position with
  `window.scrollTo({behavior: 'instant'})`. With the smooth-scroll layer the spring eases to that native
  position; under reduced motion (no layer) the instant scroll is final.
- Rest of the gesture: every later wheel event in the same gesture is cancelled, so the page stays held.
  Chrome makes the later events of a trackpad scroll sequence uncancelable when the sequence's first
  event was not cancelled; for those the module scrolls back the event's own distance with
  `scrollBy({behavior: 'instant'})` instead. Neither path moves the page anywhere else, so a script's
  scroll during a held gesture keeps its position.
- Gesture end: 300 ms with no wheel event. Notches spun off one flick of a wheel come tens of ms apart and
  trackpads send about one event per frame, so 300 ms keeps one flick one gesture, while a second scroll
  after a pause is free (the check waits 1.2 s before its second fling and 700 ms before its release
  wheel).
- Pause (owner request after testing the PR preview: a stop released by the next wheel click could not be
  felt, because the smooth-scroll layer's glide hides a short hold and a Windows wheel set to 7 lines sends
  about 233 px a click): after a stop, every wheel event for the next 2000 ms (`PAUSE`) is absorbed, in
  either direction, however large. A key, link, scrollbar or script that moves the page off the reading
  position ends the pause early.
- Release: after the pause, wheel input scrolls on. The detent re-arms only after the page leaves the band where the
  whole block stays on screen (the centring margin, at least 120 px each way), checked on each wheel
  event, or when the explainer moves more than two viewports from the screen. Small moves near the
  reading position are never caught twice.
- Listener: the `wheel` listener is non-passive, which makes the browser wait for the main thread before
  it scrolls each wheel sequence. An IntersectionObserver (`rootMargin: 200% 0px`) attaches it only while
  the explainer is within two viewports of the screen, farther than one wheel event reaches, and removes
  it otherwise, so everywhere else wheel scrolling keeps the browser's passive fast path.
- Never held: touch drags and flicks, taps and clicks, keyboard scrolling, anchor links (clicked or
  tapped, with the smooth-scroll layer or without), incoming fragments, `hashchange` and `popstate`, the
  scrollbar, focus scrolling, scroll anchoring, and every programmatic scroll: `window.scrollTo`,
  `scrollBy` or `scrollIntoView`, instant or smooth, including one made during or right after a held
  wheel gesture. The detent has no `scroll`, touch, key or pointer listeners, so none of these reaches it.
  Nor does the next wheel event undo one made during an unheld gesture: its crossing is judged from
  where the page now is (see Hold), so it is held only if its own input carries the page from there to
  the reading position or past, and then the page moves on to the reading position, in the event's
  direction. The one bound: a non-wheel scroll that leaves the page at most 8 px past the reading
  position, right after a notch aimed within 8 px of it, reads as that notch running long, and the next
  wheel event places the page back at the reading position, at most 8 px.
- Dead end (rounds 8 and 9): clamping `scrollY` on `scroll` events and inferring from time windows and
  delta budgets which steps the gesture caused. It could not tell an in-budget programmatic jump from
  wheel scrolling (an instant `scrollTo(R + 600)` right after four notches was held, and so was a smooth
  `scrollTo`), and it trapped repeated touch flicks. CSS scroll snapping was tried before that and does
  not hold either: one large wheel or a burst of notches runs straight through a
  `scroll-snap-stop: always` marker (`reviews/probe-snap.mjs`).
- Dead end (round 11): dropping the target only when the page moved further than the gesture's input
  could carry it (3 times the input in flight plus this event's, plus 40 px). A crossing was still
  judged across the old target, so a non-wheel jump inside that allowance to the other side of the
  reading position was undone (wheel down from R - 300, `scrollTo(R + 50)`, wheel down landed on R).
  Any threshold on how far the page may move keeps that hole open.

## Reduced motion and no-JS

Amendment v2 (user instruction): "No reduced motion: this animation will be full motion even if the user
has reduced motion on." Under `prefers-reduced-motion: reduce` the animation autoplays and plays exactly
the same as with motion allowed: the same layout, the same nine beats, the same timing and the same
autoplay trigger. Pause and Replay are available as they are with motion allowed. The preference is not
read by the CSS or the module, and changing it during play changes nothing.

No-JS static layout. With `scripting: none`, CSS (known at first paint) shows the stage as a static
sequence: the end-state drawing, then all nine beats as a readable ordered list. Nothing animates.

- Desktop (above 767px): the art box full width of the content column (max 1100px), then the nine beats
  in a three-column grid, reading order left to right, top to bottom, each with its step label, `h3` and
  caption lines. The index chips are hidden (the step labels carry the numbers).
- 767px and below (round 7): beat 1 (the problem), then the tall drawing, then beats 2 to 9, in one
  column, 28px apart, so the problem is stated before the finished diagram. CSS only, under
  `@media (scripting: none) and (max-width: 767px)`: `.ex-stage` is a one-column grid, the `ol` spans
  its first ten rows as a subgrid, beat 1 takes row 1, the art box row 2 and beats 2 to 9 rows 3 to 10.
  No markup change, and the `ol` keeps its list semantics.
- The complete static text is the caption copy in `## On-screen copy`, in order: each beat's step label,
  headline and every caption line, all fully visible (no line is hidden without the module). The caption
  layouts of Visuals apply without JS too, at the static sizes: markers, the pair rows, the row labels,
  the step numbers, the cited note and the larger statement.
- No-JS shows exactly this: the section headline, the static drawing with its labels, the nine beats,
  and the bottom note. The Pause and Replay buttons carry the `hidden` attribute in the markup and only
  the module removes it, so no-JS has no dead buttons. `.ex-controls` is `display:none` in the static
  layout, so no empty row is reserved.
- With JS, reduced motion or not, the section uses the motion layout below and the module plays the
  sequence; there is no reduced-motion variant of the layout, the drawing or the controls.

Motion layout before the first play: with `scripting: enabled`, the art box, the beat list and the index
are `visibility:hidden` until the module adds `.is-live`, with the hero's CSS fallback
(`animation: ex-fallback .3s 8s forwards` to visible), as living-system.css does for `.system-field`.
The module paints `frame(parts, 0)` and beat 1's caption state (headline only), then adds `.is-live`. If the module never
runs, the end state appears after 8 s. Before `.is-live` only beat 9's `li` is visible in the stacked
cell, with every line shown, so the fallback shows the end-state caption.

## Narrow layout

At 390x844 (and anything 767px wide or less):

- One column. Motion layout (round 7): `h2` (wraps to three or four lines at 36px), the bottom row
  (note, Pause, Replay), the stacked caption cell, the index bar, then the art box, 16px below the
  index. The caption sits above the drawing, as in the no-JS order, so it is read first and is whole on
  screen before the drawing is: a scroll that lands on the section starts playback about 0.7 s in, while
  the smooth-scroll spring is still settling (with the caption below the drawing it became whole only in
  the spring's last pixels, about 1.3 s in). No-JS layout: see Reduced motion and no-JS. Padding 20px
  each side.
- The art box uses the tall drawing (`viewBox 0 0 360 480`), centred and narrower than the content
  width since round 13: `width: clamp(220px, calc((100svh - 486px) * .75), 100%)` (`vh` fallback
  first), so about 269px wide and 358px tall at 390x844. The v7 captions run to several lines, and the
  width follows the viewport height, which CSS knows at first paint, so no script measures anything.
  Stage plus caption fit together in an 844px viewport, so the visitor can read a beat while its
  drawing plays.
- Phone caption type (round 13): headline 21px, lines 15px (line-height 1.38, .4em apart), step label
  11px; pairs stack (without above with, one dashed rule per pair) and rows keep their label column.
- Beat 4's stall cue (round 16): the failing tile and its two crosses come forward to the empty right
  side above the rail (centre (294,146)) at three times their size while the step fails, so the crosses
  are about 11px instead of 3.7px at 390x844, then go back to the rail before the detour draws (see Per
  beat, 4). Group 2 now stays lit in beats 4 and 5 (see Focus), so the strip does not fade out on a phone.
- Labels shown at this width: Session, `.claude/reference/`, skill index, VERIFIED, You, Template, Next
  project, `candidate to prune` (since round 14, centred below the strip at (180,465), so phones keep
  N14's qualifier on the audit line), and `Builder · fresh context` and `Auditor · fresh context` (three
  lines each on phones, broken by a phone-only `br.ex-nbr`, top left inside their frames), so the
  build-and-check-apart idea reads on a phone. All other stage labels are `data-wide-only`.
- Phone label size (round 14): every stage label is 10px at 767px and below, whatever the drawing's width
  (269px at 390x844, 221px at 360x780); round 13's `min(10px, 2.86cqi)` shrank them to 7.7px and 6.3px.
  At 360 wide a 10px character is about 11.6 viewBox units, so the tall geometry changed to fit them:
  builder and auditor frames x 14 to 134 and x 146 to 318, y 236 to 316, with the recall strands between
  them at x 138 and 142; the brief card at (280,286); the task frame 88 tall and the contract 72 tall, so
  `VERIFIED` (at y 191) clears both and the tiles; the template box x 232 to 344; the reference dividers
  end at y 420 above `.claude/reference/`; the refine ticks at y 324, below the auditor frame. Label
  anchors: Session (16,7); skill index right-aligned at (346,408); `Next project` right-aligned at (344,4);
  Template centred at (288,74). The art box, the phone fit and every caption are unchanged.
- Tall geometry changed in round 3 to fit those two labels (about 102 units wide at 10px): the builder
  frame is now x 14 to 122 and the auditor frame x 142 to 250, both y 236 to 304 (were 94x60 at x 16 and
  x 130, y 240); the recall strands between them move to x 128 and 136; the auditor brief card sits in
  the auditor frame's lower right at (212,274), clear of the label. The geometry table has the numbers. Every caption sentence still shows in the
  caption cell, so no copy is lost.
- The index turns into nine equal segments (`flex: 1`, 3px tall, text visually removed with
  `font-size:0`), because nine bracketed chips do not fit 350px. Colors follow the chip states.
- Between 701 and 767px the same narrow layout applies, following the site's 767px convention for
  motion sections re-orienting vertically. The hero's 700px canvas split does not matter here: the
  section has no canvas.
- Right edge: the bottom row keeps `padding-right: var(--gutter, 0px)` so a classic scrollbar does not
  cover the buttons. No element may be wider than the content box (no horizontal overflow at 390).

Fixed height at first paint, per breakpoint, with no JS involvement:

- Art box: `aspect-ratio: 960 / 560` above 767px, `aspect-ratio: 360 / 480` at 767px and below. Both SVGs
  are inline, so nothing arrives late.
- Caption cell: `display:grid` with every `li` in `grid-area: 1 / 1`. The cell is as tall as the tallest
  beat at the current width, computed by CSS from the text already in the HTML. JS changes only opacity
  and transform.
- Index: fixed height (chips 26px; segments 3px plus 10px margin).
- Bottom row: the note on its own line at 767px and below; `.ex-controls` has `min-height: 44px` whether
  or not its buttons are hidden, so unhiding them does not add height. Pause hiding at the end keeps its
  box, so Replay stays where it was (at 390 it would otherwise jump left by the width of Pause and the gap).
- Fonts: all four families are preloaded in `<head>` (index.html) and the swap fix from a67a68f stays in
  effect; the build round checks that the caption cell height does not change between first paint and
  `load` + 3 s.
- Phone fit (round 13): at 390x844 the controls (44px), the tallest caption (beat 2, 280px), the index
  bar and the drawing (358px) span about 723px, inside the 760px the check allows below the 76px header
  (768px less 8px).
- From 768 to 1023px the motion layout stays one column (drawing, captions, index), with the caption
  type between the phone and desktop sizes.
- Desktop (1024px and up; 1280px until round 14) for reference: two columns inside the stage,
  `grid-template-columns: minmax(0,5fr) minmax(0,7fr)`, gap `clamp(32px, 4vw, 72px)`: captions on the
  left, top-aligned with the art box (round 7; they were bottom-aligned), and the index at the bottom of
  that column; art box on the right. The `h2` spans both columns above. At 1440x900 the drawing is about
  751px wide and 438px tall and the caption cell 455px (beat 2), so controls, drawing and captions span
  about 596px of the 810px below the 90px header. Round 14 moved the two-column layout down to 1024px:
  in one column, the drawing (555px tall), captions and index at 1024x768 spanned 979px against 678px under
  the header, so the reading block could not be whole on screen; in two columns it spans 629px.

## Not duplicated from the hero

The hero loop (living-system.mjs `phases`) shows one task going round Recall, Plan, Execute, Audit,
Integrate, Human approval and Project memory, with a finding, a repair and a fresh audit, and a
lessons caption with the 390px navigation example. The other homepage sections each explain one
pillar. This section does not redraw the loop, the five stage nodes, the particle ring or the
finding-and-repair story, and it does not use the 390px example.

| Beat | What the hero or another section already shows | What this beat shows instead |
|---|---|---|
| 1 Without it | The problem statement after the hero says sessions start from zero. | Three sessions in a row losing their notes, plus self-grading and lost progress: the why behind each later beat, drawn as a before state that stays on screen. |
| 2 In your repository | Remembered shows file routing for one task. | The whole install as one strip: kernel, memory, both skill folders and both runtimes, the constant the rest of the story reads from. |
| 3 Recall | Hero: "Start with project memory". | What is not loaded: four notes stay unread and the skill row stays names. The reason is context size, not memory alone. |
| 4 Plan | Hero: "Define a result you can check". | The split into steps sized for one fresh context, laid on a rail that continues across sessions. |
| 5 Build and check apart | Hero: Audit, finding, repair, fresh audit. /long-horizon statement: fresh builder, separate auditor. | The ordering that makes the check independent (the brief exists before the builder), the baseline, and a second model family, with no finding or repair shown. |
| 6 Your approval | Hero: "Release stays your decision". | The merge landing in the repository strip, so approval is where the repository changes, not the end of a loop. |
| 7 Refine | Hero: "Keep the lesson for next time". Self-improving: /refine. | Three kinds of write-back and one kind of removal, with the three checks before a skill edit. Lessons become notes and skill edits (N2), not checks. |
| 8 Next project | Only the FAQ mentions sharing through the template. | The across-projects path, drawn: approval, template, next project, with local as the default. |
| 9 Next session | Problem statement: "This one starts where you left off". | The before and after side by side (ghost sessions next to a filled one) and the outcomes stated as mechanisms. |

## Build notes

Files:

- `site/explainer.mjs`: the module. No imports needed; copy `clamp01`, `smooth`, `lerp`, `set`,
  `opacity`, `move` from card-art.mjs (they are not exported). Exports nothing; runs on load like
  living-system.mjs.
- `site/explainer.css`: all styles, scoped under `.explainer` (the root is `.motion-block`, so global
  element rules do not reach it).
- Both names start with a letter and do not end in `.test.mjs`, so `.vercelignore` and
  `scripts/build-site.mjs` ship them.

Loading, pattern (a) from site-style.md section 2: in `<head>` add
`<link rel="stylesheet" href="explainer.css">` (render-blocking, so the reserved box is right at first
paint) and `<script type="module" src="explainer.mjs"></script>`. Not inside `effects.mjs`: the section
does not pin or scrub. No `blocking="render"`: every box is reserved by CSS, so the module can land
after first paint.

Insertion point: `site/index.html` line 90, between the hero's closing `</section>` (of
`section.living-system#loop`) and `<div id="problem" class="statement-block motion-block" ...>`. The
section is inside `main` and the smooth-scroll layer; it does not use `position: sticky`.

Module shape (mirrors card-art.mjs):

- `BEATS = [[1, 0, 10600], ...]` (number, start, duration) and `TOTAL = 103800`; cue times inside `frame`
  are offsets from each beat's start, read from `BEATS`. `FOCUS` (the Focus table), `DIMMED`, `FOCUS_IN`
  and `END_IN` drive the dimming through `focus(n, t, rest)`; `GEOM.*.zoom` and `zoom(G, t)` give beat 1's
  scale and offset; the caption paint uses both for the labels. `REVEAL = {1: [1400, 2400, 4400, 5600], ...}`
  holds each beat's line reveal times (ms from the beat's start, the Caption reveals table) and
  `LINE_IN = 400` their fade.
- `GEOM = {wide: {...}, tall: {...}}` with the coordinates above; `parts(svg)` collects elements by class
  and measures path lengths once; `frame(parts, t, g)` is pure and writes attributes through `set()`.
- The caption paint sets `data-beat` on the root and writes each `li`'s opacity and transform, and each
  `.ex-line`'s opacity and transform from `REVEAL`, through `el.style` only when the value changes. It
  is a pure function of `t` and reads no layout. CSS uses `[data-beat]` for chip states.
- The drawing in use follows `matchMedia('(max-width:767px)')`; on a change, the module re-collects parts
  for the shown SVG and repaints the current `t`.
- Three IntersectionObservers (the stage, for pausing; the start trigger, see Timing; the title, see Ground,
  type and palette), `resize` listeners that re-read the header height (and, for the start trigger, the caption and art
  boxes), and one `visibilitychange` listener. No
  reduced-motion listener: the preference does not change playback (amendment v2).
- `detent(root)`, the scroll detent (see Scroll detent): one non-passive `wheel` listener on `window`,
  attached and removed by an IntersectionObserver on the section (`rootMargin: 200% 0px`), and one
  ResizeObserver on the section and the scroll layer that re-measures the reading position. No `scroll`,
  touch, key or pointer listeners. It reads no layout during scrolling and adds nothing to the frame loop.

Observable hooks (built in round 4; checks and tests read these, so keep them stable):

- `#explainer[data-state]`: `idle` from mount until the start trigger fires (or Play or Replay is
  pressed); `playing` while the clock runs; `paused` after the first play whenever the clock
  is stopped by Pause, a fully offscreen stage or a hidden tab; `ended` at `TOTAL` until Replay. With no
  script the attribute is absent.
- `#explainer[data-beat]`: the beat on screen, `1` to `9`, written with the captions on every paint. It
  is `1` in `idle` (the painted start state), and the markup's `9` stands for the no-JS end state.
- `#explainer[data-reading]` (round 14): the detent's reading position in px of scroll offset, rewritten
  whenever it is measured. Absent without the module.
- Element hooks: every animated SVG element carries `data-p="<name>"` (for example `strip`, `ref`,
  `tA`, `tile`, `brief`, `stampt`, `scan5`); `parts(svg)` collects by these names in both drawings. The
  scan lines (`scan3`, `scan5`, `scancx`, `scan7`) exist only for the animation and sit at opacity 0 in
  the markup. Two paths were split in two (the beat 7 new lines, the beat 8 strands) and the three
  `.45` wrapper groups around unread reference glyphs became the same opacity on the glyph, so the
  static drawing renders as before.
- Pre-mount: `.explainer:not(.is-live)` keeps the art box, captions and index `visibility:hidden`
  under `scripting: enabled`, with the 8 s `ex-fallback` reveal.

Geometry adjusted in round 4 (within the 20 units allowed): on the wide rail, tile 1 sits at x 470
instead of 450, so `VERIFIED` above it clears the `Baseline` label; the scan in beat 5 runs x 378 to
520 to match. At 767px and below (motion layout only) the bottom row (note, Pause, Replay) sits between
the `h2` and the stage instead of after the index: below the captions, Pause was about 300px under the
fold whenever the drawing and its caption filled a 390x844 screen, and the smooth-scroll layer cannot
scroll a control into view for automation. The no-JS layout keeps its own order (see Reduced motion
and no-JS).

Round 7 (amendment v6): beat 1's label and headline changed and beat 1 runs 7300 ms; autoplay waits for
beat 1's caption below the header, and on phones the caption and index bar move above the drawing
(see Narrow layout); the no-JS phone view puts beat 1 before the drawing; the motion
layout's caption type grew and top-aligns beside the drawing; captions use `text-wrap` so no line ends
with a single word.

Round 8 (amendment v8): the scroll detent. A wheel or touch gesture that would carry the page past the
reading position stops there for the rest of the gesture; the next gesture continues. It lives in
`explainer.mjs` only; `smooth-scroll.mjs` and `effects.mjs` are unchanged, and no CSS was needed.

Round 9: the detent holds only scrolling the live gesture's own input caused. Round 8
held any crossing while a gesture was open, so a `window.scrollTo` issued 80 ms after a small wheel
stopped at the reading position, and under reduced motion a tapped header link stopped there too:
`touchend` opened the 250 ms window and only a mouse press ended it. Round 9 made taps, clicks, `hashchange` and
`popstate` end the gesture and checked each scroll step against the input; round 10 replaced
that approach.

Round 10 (amendment v9): the detent acts on wheel input only. A non-passive `wheel` listener cancels
the event that would cross the reading position and every later event in that gesture, and places the
page there with a native instant scroll. The rounds 8 and 9 `scroll`-event clamping, touch listeners and
cause inference are deleted (see Scroll detent, Dead end), so touch, keys, anchors, history moves, the
scrollbar and programmatic scrolls cannot be held.

Round 11: Round 10 measured each wheel event from where the gesture's earlier input had aimed the page,
so a key, anchor or script scroll made within 300 ms of a wheel event, across the reading position, was
undone by the next wheel event (wheel down, `scrollTo(R + 1500)`, wheel down landed on R). Round 11
dropped the target when the page moved further than the gesture's input could carry it; a jump inside
that allowance was still undone (see Scroll detent, Dead end).

Round 12: a stale gesture target can no longer make a crossing. The target counts only while `scrollY`
lies between its value at the gesture's previous wheel event and the target (8 px slack), and a
crossing is judged from `scrollY`, with one exception for a notch that ran at most 8 px past the reading
position (see Scroll detent, Hold). The distance allowance is deleted. Arming, the band, the held
branch including the `scrollBy` compensation for uncancelable events, the 300 ms gesture gap, the
listener's attach and detach and the `deltaMode` handling are unchanged.

Round 13 (amendment v7): the owner-approved caption copy (`round-13/copy-draft.md`) replaces the v5
captions. Each beat has a `data-layout` and one `.ex-line` per draft line (see Visuals, Caption
layouts); markers are CSS content. The lines reveal one by one on the drawing's clock (Timing, Caption
reveals), and the beats were retimed to `TOTAL` = 103800 ms for 250 ms a word. Cue order changed where a
line needed its own moment: beat 1's self-tick now comes before the arc, beat 4's rail draws after the
split, beat 5's baseline appears before the auditor, beat 9's stamp comes before S4's notes, and the
Codex reviewer frame moved from beat 5 to beat 6 (same geometry, now in beat 6's group, `/codex-review`
label with it). The phone drawing narrows with the viewport height so controls, caption and drawing
still fit below the header. `detent()` is unchanged.

Round 14 (amendment v5's visual polish and the round-13 review fixes): beat 1's cluster is drawn 1.6x,
centred, and eases to its place during beat 1's exit; focal dimming (Visuals, Focus); a drawing event of
its own for beat 2's third pair (new `old2` and `ret2` paths on the third reference glyph), beat 4's
`Stalls` row (`fail4` crosses and the `detour4` path, both transient, opacity 0 in the markup) and beat
6's second line (`cxl` split into `cxl` and the dashed `cxd`, plus the `cxx` cross); phone labels at 10px
with the tall geometry changes in Narrow layout and `candidate to prune` shown on phones; the two-column
motion layout from 1024px; and the detent's reading position measured from `.ex-bottom`, the drawing and
the captions, with the title rule and `data-reading` (Scroll detent). The detent's gesture logic is
unchanged.

Round 15: beat 2's third pair reads at a glance. The third reference note (with `old2` and `ret2`)
comes forward above the strip at three times its size for the pair and goes back (`GEOM.*.retire`, one
transform written to all three; see Stage geometry). `old2` is 2.8 wide and runs 16 units, so the
overwritten line stands apart from the note's own lines. The skill tick rows move to 4400-5220, before
the note comes forward, and the runtime chips to 8800-9600, after it is back, with their labels, so
nothing else inks in during the cue. Reveal times are unchanged.

Round 16 (the round-15 review fixes): the section title fades out (`.is-under`, 200 ms) while it is not
wholly below the fixed header, whose 95% opaque background let it show through at the wheel stop at 1024,
1152 and 390 (see Ground, type and palette); a third IntersectionObserver in `mount()` decides, re-armed on
resize. Stage labels above 767px are `clamp(10px, 1.49cqi, 11px)`, with compact anchors, no tracking and
line-height 1.3 when the drawing is under 671px wide, and `Acceptance checks` left out there; to fit the
labels at 10px the wide builder frame starts at x 364, the auditor frame ends at 758 with the brief card at
718, the runtime chips are 152 and 78 wide, and the beat 8 strand and approval glyph run at x 780 (see
Stage geometry). Group 2 is lit in beats 4 and 5 (Focus). Beat 4's failing tile comes forward at 2.5 times
its size (3 on phones) with its crosses while it fails (`GEOM.*.stall`, Per beat 4). Pause and Replay are
12px with a lighter underline. Timing, reveals, captions, the playback model and `detent()` are unchanged.

Round 17 (codex-review of PR #12): autoplay starts on short viewports. At 390x500, 667x375 and 740x360
the section stayed `idle` however slowly the page was scrolled, because round 7's rule (whole caption,
half the drawing) cannot hold when the room under the header is shorter than the span from the caption
to the drawing's middle. `arm()` now also reads the caption and art boxes on mount and resize and, when
that span does not fit, starts on beat 1's caption alone (see Timing, Autoplay and playback). Viewports
that can show both keep round 7's rule. Nothing was added to the frame loop and there is no scroll
listener; the drawing, captions, timing and `detent()` are unchanged.

Accessibility:

- `section` has `aria-labelledby="explainer-title"`; the page keeps its single `h1` (hero).
- `.ex-art-box` is `role="img"` with this `aria-label`: "Illustration: three sessions start empty; a
  repository of notes and skills is added; a task reads what it needs, is planned, built and checked by
  separate agents, approved by you and merged; lessons return to the repository and, with approval, to
  a template and a next project; a new session starts from the repository." Its labels are therefore
  presentational; the captions carry every sentence as text.
- Both SVGs are `aria-hidden="true" focusable="false"`.
- The beat list is an `ol`; its hidden `li` and caption lines stay in the accessibility tree (opacity
  only, never `visibility` or `display`), so a screen reader reads the whole sequence in order. Each
  beat's lines are a nested list (`ul`, or `ol` for the sequence) or paragraphs. Markers are CSS content
  with empty alt text; the pair markers read "Without:" and "With:". No live region; beat
  changes are silent. Inactive `li` get `pointer-events:none`.
- Replay: `<button type="button" class="ex-replay" hidden>Replay ↺</button>`, accessible name from its
  text, 44px tall target, visible `:focus-visible` outline, keyboard operable as a native button.
- Pause: `<button type="button" class="ex-pause" hidden>Pause ‖</button>`, text swaps to `Play ▷`.
  At the end it is `hidden` but keeps its box through `visibility:hidden` (see Timing), so Replay does not
  move. It exists because the sequence runs longer than five seconds next to other content (WCAG 2.2.2).

What the build rounds must measure (headed Chrome through `launchPlacedChrome()` with
`CHROME_PLACE=offscreen`, against `node site/server.mjs`, at 1440x900 and 390x844):

- Layout stability against origin/main: sample `document.documentElement.scrollHeight` and the boxes of
  the hero, the explainer and the problem statement every frame from FCP to `load` + 3 s, several runs.
  The explainer's height must not change in that window, and nothing above it may move.
- Screenshots at the hold times in the Timing table, the end state, JavaScript disabled, and reduced
  motion (which must match the motion run beat for beat). Read `data-beat` on the root to confirm each beat.
- Frame times during one full play at each size: rAF deltas and `long-animation-frame` / `longtask`
  entries; record the maximum, the count over 50 ms, and p95. Target: no frame over 50 ms after the
  first three frames of play.
- Pause behaviour: scroll away and back (resumes at the same beat), hidden tab (redefine
  `document.hidden` and dispatch `visibilitychange`, since Playwright never sets it), Pause and Play,
  Replay mid-play and at the end (focus stays on the button).
- Zero console errors; `scrollWidth <= clientWidth` at 390; no label overlaps in the end-state
  screenshots at both sizes.
- The copy on the page matches the table in `## On-screen copy` word for word.
- `node --test site/github-creator.test.mjs` still passes; `site/README.md` gets a paragraph under
  "Motion hooks" describing `explainer.mjs` like the other motion modules.
