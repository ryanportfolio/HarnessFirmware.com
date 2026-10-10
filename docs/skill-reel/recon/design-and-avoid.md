# Skills reel recon: visual system and metaphors to avoid

Source: worktree `skills-reel` at origin/main 2d740a9. Every path below is relative to the repo root.
Citations are file:line. Facts only; no design proposals.

## A. Visual system

### A1. Palette tokens (CSS custom properties)

Global tokens, `site/styles.css:2-15`:

| Variable | Hex | Use |
|---|---|---|
| `--ink` | `#0f1210` | page background and body text on light sections (`styles.css:12-13`, `.light` text `styles.css:103`) |
| `--paper` | `#f3f3ec` | light section ground (`.light`, `styles.css:101-104`), text on dark |
| `--green` | `#53db76` | the accent: `.green` ground (`styles.css:105-107`), heading `<em>` color, strokes, links |
| `--green-bright` | `#58e07b` | glow and hero accents (`styles.css:279` stroke, `styles.css:1163` drop-shadow; `living-system.css:1` sets `--glow:#58e07b`) |
| `--green-deep` | `#50d873` | step labels and mono accents (explainer `.ex-step`, spec line 248) |
| `--muted` | `#b2b5ab` | secondary text |
| `--line` | `rgba(243,243,236,.22)` | 1px rules (`styles.css:131,154,231,370,392,429,430,663,1170`) |

About page restates the tokens and adds one, `site/about.css:3`: `--amber:#efc87e`, `--line:rgba(243,243,236,.16)`.

Skills page scopes its own, `site/skill-showcase.css:1`: `--ss-lime:#53db76`, `--ss-ivory:#f1f0df`, `--ss-muted:#acb19e`, ground `#09100b`.

Type tokens, `site/fonts.css:33-45` (see A2).

### A2. Grounds in use (dark to light)

- Hero `section.living-system`: `#070c08` (`site/living-system.css:1`), text `#f2efdf`.
- Explainer: `#0b100c`, `border-top:1px solid #53db7633` (`site/explainer.css:14`; spec line 234).
- Skills page `#skills`: `#09100b` (`site/skill-showcase.css:1`).
- Page and about: `#0f1210` (`--ink`).
- Card row and converge: `#11120D` with `#F7F7F7` text (`site/card-row.css:8`; `site/converge.css:8-9`).
- Statement block: light panel `#F7F7F7` (`site/statement-block.css:7`), text `#181914` (`:5`); with motion the panel is `#53DB76` (`:11`).
- Footer: `#181914` (`site/site-footer.css:2`), separator fill `#030303` (`:15`).
- Motion fallback: `#0d120e` (`styles.css:1373`).
- Occluding fill inside line drawings: `#10150f` (`site/card-art.mjs:42,45`; spec line 284).

### A3. Line-drawing palette (shared by card-art and the explainer)

Constants, `site/card-art.mjs:18-21`, restated in the explainer spec lines 283-290:

| Name | Hex | Meaning |
|---|---|---|
| `GREEN` | `#53db76` | default stroke, 1.2 wide, round caps and joins (`card-art.mjs:22`) |
| `BRIGHT` | `#72f28c` | scans, newly written lines, at 1.6 (spec 284-285); also `VERIFIED` label (`explainer.css:50`) |
| `AMBER` | `#efc87e` | failure, self-report, contradicted or replaced line (spec 285-286); `Self-reported: done`, `candidate to prune` (`explainer.css:49`) |
| `DIM` | `#3e5a45` | ghosts, unread files, future index chips (spec 286, 292) |

### A4. Semantic colors (pass and fail)

- Pass: green `✓` `#53db76` (`explainer.css:77,85`); bright pass `#72f28c` (`explainer.css:50,103`); outcome text `#c4fad2` (`explainer.css:102`).
- Fail: amber `✕` `#efc87e` (`explainer.css:76,83`); site amber `--amber:#efc87e` (`about.css:3`).
- Amber variants elsewhere: `#efbb69` audit finding stroke on the skills page (`skill-showcase.css`, rule `.ss-audit-finding`); hero repair particles `#ffd299` (`site/living-system.mjs:89`); `#edb677`, `#ffce8e` in `living-system.css`.
- Check stamp glyph (card-art): `<circle r="16" fill="#10150f"/><path d="m-7 0 5 5 10-11" stroke-width="2"/>` (spec 287-288; `card-art.mjs:45,212`).

### A5. Text colors on dark (explainer)

Heading `#f2efdf`; caption body `#c2c9ba`; word labels `#97b29e`; without-line `#97b29e`; cited note `#a4f5ba` on `#10150f` (spec 248-282, 307-314; `explainer.css:27,48,82,84`). Pause/Replay `#bde5c7` with underline `#6a9474` (spec 294-296). Focus outline `#5fb775` (`explainer.css:25`; site-wide `styles.css:40` at 3px, offset 7px).

### A6. Type stack

`site/fonts.css:1-45`; files and licenses `site/PROVENANCE.md:9-14`.

| Role token | Family | File | Axes / weights | Used for (`fonts.css:9-13`) |
|---|---|---|---|---|
| `--font-display` | Lineal | `site/assets/fonts/lineal/Lineal-VF.woff2` (25.3K) | variable weight; `@font-face` declares 1-1000 (`fonts.css:15`); upstream axis 0-1500 (`PROVENANCE.md:9`); site uses `--display-weight:781`, `--display-track:-.015em` (`fonts.css:35-36`) | huge type: hero headline, statements, section and page headings |
| `--font-accent` | Fraunces Italic | `site/assets/fonts/fraunces/Fraunces-Italic.woff2` (22.7K) | one static instance: wght 600, opsz 144, SOFT 100, WONK 1 (`fonts.css:16,37-40`; `PROVENANCE.md:10`). Changing `--accent-weight` or `--accent-vs` needs a re-cut (`fonts.css:3-5`) | accent words: rotating hero word, pillar words, closing statement lines; every heading `<em>` in green (`about.css:22`, `explainer.css:28`) |
| `--font-text` | Harness Text (Mona Sans renamed) | `site/assets/fonts/harness-text/HarnessText-VF.woff2` (52.6K) | weight axis 200-900 kept; width fixed 100; optical size fixed 16 (`fonts.css:17`; `PROVENANCE.md:11`); site weight `--text-weight:500` | sub-lines, body, navigation, buttons |
| `--font-mono` | Departure Mono | `site/assets/fonts/departure-mono/DepartureMono-Regular.woff2` (6.8K) | one weight, 400 (`fonts.css:18`) | typed commands, tags, labels, canvas labels; all `code,kbd,samp,pre` (`fonts.css:48`) |

All four use `font-display:optional` with metric-matched local fallbacks (`fonts.css:20-31`). Subset ranges include arrows U+2190-21FF, geometric shapes U+25A0-25FF and check U+2713 (`PROVENANCE.md:14`). Canvas labels draw Departure Mono at 400 (`site/converge.mjs:54` `LABEL_FONT`).

Typical sizes: global `h2` `clamp(48px,6.3vw,94px)/1.02` (`styles.css:56-59`); explainer title `clamp(36px,4.4vw,68px)/1.02` (`explainer.css:27`); skills page `h1` `clamp(96px,15vw,240px)/.8` (`skill-showcase.css`, rule `#skills h1`); eyebrow mono 11px uppercase tracking .075em (`styles.css:66-70`); stage labels mono 10-11px (spec 264-267).

Font licensing lines, verbatim from `site/PROVENANCE.md`:

- Line 9: Lineal variable, version 2.000 (weight axis 0 to 1500), by Frank Adebiaye; Velvetyne; "Shipped unmodified"; "SIL Open Font License 1.1, Reserved Font Name "Lineal""; `assets/fonts/lineal/LICENSE.txt`.
- Line 10: Fraunces Italic, version 1.000, by Undercase Type, one static instance wght 600, opsz 144, SOFT 100, WONK 1; "SIL Open Font License 1.1"; `assets/fonts/fraunces/OFL.txt`.
- Line 11: Mona Sans variable, version 2.027, by GitHub, "as a modified version named Harness Text"; "Width axis fixed at 100, optical size fixed at 16, weight axis kept, subset, converted to woff2 and renamed: "Mona" is a Reserved Font Name, which a modified version may not use"; "SIL Open Font License 1.1, Reserved Font Name "Mona""; `assets/fonts/harness-text/OFL.txt`.
- Line 12: Departure Mono Regular, version 1.500, by Helena Zhang; Subset; "SIL Open Font License 1.1"; `assets/fonts/departure-mono/OFL.txt`.
- Line 14: subset method, fontTools 4.66, `pyftsubset --layout-features='*' --flavor=woff2`.
- Line 20-22: `assets/memory-forest.webp` is AI-generated for the project; `assets/grain.png` comes from `generate-grain.mjs`; `favicon.svg` and `harness-mark.svg` are the Harness H mark drawn for the project.

### A7. Grain, dither and pixel textures already in use

- Film grain tile: `site/generate-grain.mjs:1-49` writes `assets/grain.png`, 256x256 grayscale, triangular noise centred on mid-gray, std dev near 58 levels, seeded mulberry32 (`seed = 0x4a17c3d5`, line 9).
- Homepage overlay: `.grain-overlay` fixed, z-index 12, opacity faded to .05 after first frame, `translateX(.5px)` to soften, `grain-jitter .27s steps(1,end) infinite` through nine stepped offsets (`styles.css:1376-1391`; `site/effects.mjs:20-25`). Reduced motion stops the jitter (`styles.css:1391`).
- Hero field also jitters grain (`living-system.css:1`, `animation:grain-jitter .27s steps(1,end) infinite`).
- Skills page: `#skills:before` grain at opacity .09 under a radial tint `#22422a1c`, same nine offsets as `ss-grain` (`skill-showcase.css:3-6`).
- About page: `body:after` grain at .035, `mix-blend-mode:screen`, z-index 60 (`about.css:9`).
- About film WebGL look: `GRAIN = .05`, `VIGNETTE = .4`, `BLOOM = .8`, `TRAIL = .88` phosphor trails, `POINT_SIZE = 2.4` (`site/about-film.mjs:22-23`).
- Ordered dither: `site/dither-effects.mjs` 8x8 Bayer threshold over a Canvas2D wave field, 2px cells, `image-rendering:pixelated`; colors `#111a14` ground, `#466750`/`#36523e` dots, `#53db76` pointer wake (`dither-effects.mjs:4,18-31`). Two placements: the Audited evidence field `#audit-details .evidence-field` with an inspect, finding, repair, recheck caption cycle every 2.5 s (`dither-effects.mjs:22,43-44`) and a CTA backdrop `#start .cta-dither` at opacity .28 (`dither-effects.css:9-12`). A 4px dot mask over a green radial (`dither-effects.css:4`) and a 5px dot grid (`dither-effects.css:12`).
- Masked heading reveal: `.mask-reveal` clip-path inset plus 18px rise, `.7s cubic-bezier(.22,1,.36,1)` (`dither-effects.css:26-27`).
- Row-fill hover on skills list: green `scaleY` fill from top, `.65s cubic-bezier(.22,1,.36,1)` (`dither-effects.css:14-16`).
- Pixel wipe: `site/pixel-wipe.mjs` 17x9 grid of square SVG cells turning solid in shuffled (seedable mulberry32) order as progress runs 0 to 1; cells overlap 1.5% (`pixel-wipe.mjs:1-18,22`); CSS cover sizing `site/pixel-wipe.css:3-6`. Used by `card-row.mjs:193` (color from `data-wipe`, default `#F3F3EC`) and by `statement-block.mjs:17-19` (wipe over the last stretch of the pin, from 71.4%).
- Statement squares: a 5x5 block of light squares vanishes square by square, shuffled, 25 ms apart (`statement-block.mjs:13-14`).
- Hover grid: green light through gaps around the pointer (`statement-block.mjs:15-16`; `site/hover-grid.mjs`).
- Skills page feature corners: 8x8 green L-brackets at top-left and bottom-right (`skill-showcase.css`, `.ss-feature:before/:after`).

### A8. Easing curves and durations

Named entrance curves, `site/hero-pillars.mjs:65-71`:

- expo `cubic-bezier(0.16, 1, 0.3, 1)`
- expo-sharp `cubic-bezier(0.19, 1, 0.22, 1)`
- quint `cubic-bezier(0.22, 1, 0.36, 1)`
- quart `cubic-bezier(0.25, 1, 0.5, 1)`
- cubic `cubic-bezier(0.33, 1, 0.68, 1)`

Exit and ink curves, `hero-pillars.mjs:98-105`: exitMove `[0.45,0,0.85,0.45]`, exitFade `[0.25,0.4,0.45,1]`, ink `[0.4,0,0.2,1]`, glide `[0.4,0,0.2,1]`, clear `[0.35,0,0.15,1]`, soft `[0.22,1,0.36,1]`.

Hero headline defaults (`hero-pillars.mjs:73-90`): glyph entrance 1000 ms, pillar hold 1900 ms, tagline hold 5200 ms, 55 ms per em wave, 160 ms row gap, blur .08em at entrance start, rise .3em, lift .2em.

JS easing inside line-drawing frames (`site/explainer.mjs:105-109`, copied from card-art): `smooth` smoothstep, `quart` `1-(1-u)**4` for draw-ins, `expo` `1-2**(-10u)` for slides.

Other curves in CSS: `cubic-bezier(.33,1,.68,1)` .3s (`card-row.css:44`); `cubic-bezier(.83,0,.17,1)` 1s plus a sampled `linear(...)` (`card-row.css:63`); `cubic-bezier(.215,.61,.355,1)` .42s (`converge.css:69`); split reveal default `.5s ease-out` (`split-reveal.css:16-17`); hero ink-in `cubic-bezier(0.4,0,0.2,1)` with 6px blur, 900 ms default, staggered 150-200 ms (`living-system.mjs:24-26`).

Common durations: glow and color `.6s` (`living-system.css:1,31`; `explainer.css:106`); UI hovers `.18s` to `.2s` (`memory-cta.css:6`; `about.css:63,93,112,115`); grain step `.27s`; 8 s CSS fallback reveal (`explainer.css:162`, `living-system.css:17`). Frame loops cap `dt` at 64 ms (`card-art.mjs:257`; `explainer.mjs:559`) or 80 ms (`living-system.mjs:140`; `dither-effects.mjs` tick).

### A9. Border radii

The system is square-cornered. Radii in use: `2px` (`explainer.css:44`, labels); `3px` (`memory-cta.css:11`); `4px` (`living-system.css:56,69-71`); `5px` and `6px` (`converge.css:59,65,68`); pill `999px` (`about.css:63,93`; `home.css:24`); circles `50%` (dots, `styles.css:173,1317`; `about.css:71-72`; `home.css:25`; `hero-pillars.css:179`). The skills page forces `border-radius:0` on search and filters (`skill-showcase.css`, `#skill-search`, `.ss-filters button`). Repository strip in the explainer SVG is `rx 6` (spec line 329).

### A10. Line weights

- 1px solid rules everywhere (`styles.css:79,131,154,231,...`; `--line` color).
- 1px dashed `rgba(247,247,247,.15)` for command cards (`card-row.css:36`) and explainer pair rows (`explainer.css:80`).
- SVG strokes: 1.2 default, 1.6 for scans and new lines, 2 for check marks, 2.8 for the explainer's contradicted line, 3 for card-art bars (`card-art.mjs:22,43,45,85`; spec 284-288, 332).
- Skills page SVG: filament .65 at .45 opacity (faint ones dashed `1 3`), wire 1.65, planes .7, orbit .5, gate 1, audit finding 1.7, audit check 1.8 (`skill-showcase.css`, `.ss-filament` through `.ss-audit-check`).
- Hero canvas strand glow: 5px halo `#58e07b` at .16 under a 1.4px core `#a4f5ba` at .75; comet trail 7px under 2px `#c4fad2`, head dot `#e6ffec` (`living-system.mjs:131,136-138`).
- Focus outlines: 3px site-wide, 2px in motion blocks.

## B. Metaphors and pictures already used (avoid redrawing)

### B1. Explainer: nine beats (spec `docs/specs/2026-09-27-explainer-animation-design.md`; `site/explainer.mjs`)

Design angle: "the repository is the constant". A repository strip along the bottom stays on screen; sessions, agents and checks come and go above it (spec 19-24). SVG stage 960x560 wide, 360x480 tall (spec 181-182). `TOTAL = 103800` ms (`explainer.mjs:34`; spec 478).

| Beat | Start, length (ms) | What it draws (spec 363-424) |
|---|---|---|
| 1 The problem | 0, 10600 | Three session frames S1 to S3 open one by one; each opens empty while the previous one's notes fade. A compaction bar fills to 70% and drops to 20% with an amber tick, twice. S3 marks itself done with an amber tick (`Self-reported: done`), then an amber arc loops from S3 back into itself (self-review). Drawn at 1.6x, then shrinks to a row of ghost sessions `#3e5a45` that stay to the end. |
| 2 Project memory | 10600, 13200 | Repository strip outline draws, then compartments ink in: two kernel file glyphs (`CLAUDE.md · AGENTS.md`), six reference file glyphs, two rows of skill index ticks (`.claude/skills/`, `.agents/skills/`). A reference note comes forward 3x, turns amber, gets a thick amber overwrite (contradicted fact), then a short dated "retired" line, and goes back. Runtime chips `Claude Code` and `Codex` below with thin lines up. |
| 3 Recall | 23800, 14200 | Task frame draws, a task card slides down into it. `pitfalls.md` and `commands.md` glyphs brighten and strands rise into the frame; four other glyphs stay dim. A scan runs along skill row A; one tick grows into a playbook sheet that rises into the task. |
| 4 Plan | 38000, 12400 | Contract sheet: goal line plus three checkbox rows. Sheet splits into three step tiles that slide onto a rail. Step 2 fails twice (amber, two amber crosses, brought forward 2.5x), a detour draws round it, tile goes green. |
| 5 Checked apart | 50400, 11200 | Auditor brief card appears alone first with a clock tick. Builder frame draws dashed and empty, then solid; bars ink into tile 1. Dashed baseline tile at rail start. Auditor frame draws and takes the brief, scans, stamps tile 1; `VERIFIED`; tiles 2 and 3 pulse through. |
| 6 Review and your call | 61600, 11400 | Codex reviewer frame with a double outline (`/codex-review`) scans and stamps. One of three finding lines turns dashed with an amber cross (dismissed, still listed). Tiles slide to a closed two-post merge gate; a person glyph (`You`) draws; a stamp lands on the person; only then the gate opens and a merge strand runs down into the strip. |
| 7 Refine | 73000, 11000 | Strand drops from the rail to `pitfalls.md`, a new green line writes in it. Three ticks appear beside `/refine`; a skill-row line fades amber and is replaced in green. A scan sweeps the strip; one glyph and one tick go dashed `#3e5a45` with `candidate to prune`. |
| 8 Next project | 84000, 9400 | Strand leaves the strip's right end, passes an approval glyph that stamps (`/sync-starter`), reaches a `Template` box; second strand to a miniature `Next project` strip with the same three compartments. |
| 9 Next session | 93400, 10400 | S4 draws beside the three ghosts; strands rise from kernel and reference glyphs into it; a check stamp lands; its note lines write in. Last 800 ms: full composite. |

How the explainer depicts each concept (avoid these exact pictures):

- Session: a 64x48 rectangle with three note lines (spec 325). Lost memory: notes fading as the next frame opens. Ghost sessions: dim green outlines.
- Compaction: a thin progress bar that fills and drops with an amber tick.
- Self-grading: an amber arc looping back into its own frame.
- Repository: a long rounded strip with three compartments (kernel, reference glyphs, skill tick rows).
- Memory file: a 24x30 file glyph with lines; a stale fact: thick amber overwrite plus a short dated retired line.
- Recall: strands rising from file glyphs into a task frame; loading a skill: a tick growing into a sheet.
- Plan: contract sheet with checkboxes splitting into tiles on a rail; stall: amber crosses and a detour.
- Independent check: separate builder and auditor frames, brief written first, a dashed baseline tile, scan line, round check stamp, `VERIFIED`.
- Cross-vendor review: a double-outlined frame (second shape family).
- Human approval: a person glyph (hero human-gate path) over two gate posts that slide apart only after the person is stamped; a merge strand down into the strip.
- Refine: ticks beside `/refine`, a line swapped amber to green; prune: dashed dim glyph with an amber label.
- Template sync: strand through an approval glyph to a template box and a mini strip.
- Index chips `[01]` to `[09]` in mono with a 1px border (spec 291-293).

Caption layouts already used (spec 305-314): `cross-list` (amber ✕), `pairs` (✕ without / ✓ with), `example` (mono cited note on `#10150f` with a 2px green left rule), `rows` (mono uppercase label column), `sequence` (mono `01` to `04`), `checklist` (green ✓), `statement`, `outcome` (bright ✓ list).

### B2. Hero loop (`site/living-system.mjs`, `site/hero-pillars.mjs`)

- One task going round a five-node particle ring: Recall, Plan, Execute, Audit, Integrate, then Human approval and Project memory (`living-system.mjs:31-43`). Phases: Recall 3200, Plan 3200, Execute 3600, Audit 4200, Finding 3600, Repair 3600, Fresh audit 4200, Pass 3000, Integrate 3500, Human approval 3600, Memory 4200 ms.
- Particle ring: 1800 motes orbiting a centre (820,355), radius about 220 (`living-system.mjs:85-87`); `LOOP={x:820,y:355,r:230}` (`:101`).
- Feeds: strands from a "Your goal" branch with dots that light; comets of light (`COMET_DUR=620`) run from a skill name's dot along the strand round the loop to the lit stage (`living-system.mjs:93-139`).
- Amber repair particles `#ffd299` on the repair track (`:89`).
- Artifact gate and human gate glyphs; artifact label states "Candidate / awaiting checks", "Audit passed / ready to integrate", "Checked work / human review next" (`:47`).
- Lessons example: "pitfalls.md notes the 390px overflow" (`:42,45`).
- Headline: "Your agent's work," plus a rotating Fraunces pillar word (token-efficient, planned, audited, remembered, production-ready, self-improving), each naming its skills on the feeds, settling on "Better outcomes, every round" (`hero-pillars.mjs:48-63,73-77`). Glyph-by-glyph left-to-right sweeps with blur.
- Spec 783-787: the explainer must not redraw "the loop, the five stage nodes, the particle ring or the finding-and-repair story, and it does not use the 390px example." Same applies to a skills reel.

### B3. Converge (`site/converge.mjs`, homepage `#converge-block`)

Four labelled strands `MEMORY`, `SKILLS`, `CHECKS`, `TASK` wave in from the left (from the top on phones), fuse into one beam ending on a white-tinting `TASK` node with a radial halo; scroll-scrubbed and pinned over `min(10000px, 750svh)` (`converge.mjs:3-6,35-40`). Copy beside it: "Only what the task needs", "Token-efficient", "Skill names sit in a small index..." (`index.html:144-150`). Avoid: braided strands fusing into a beam; skills as one strand among four.

### B4. Command card art (`site/card-art.mjs`, homepage card rows Planned and Production-ready, `index.html:170-172,205-207`)

Per-skill line drawings in a 480x240 box, 12 s loops (`card-art.mjs:1-16`):

- `dare`: one block breaks into four pieces, a scan tests each, one fails amber and drops, survivors rebuild into a stepped shape checked against a dashed target; four pass dots (`:34-75`).
- `arena`: three lanes from one origin to three frames that fill with bars; middle one wins, brightens, and parts from the other two fold into it; stamp (`:77-119`).
- `lab`: three sliders on slow sines drive a live easing curve, a moving dot and a block width (`:121-153`).
- `showpiece`: a vertical scan wipes a generic page into a composed layout with a big headline and green accent (`:155-174`).
- `wow-loop`: result sheet over a ghost goal sheet; scan; amber diamond finding with a return arrow; line repaired; stamp; three round dots (`:176-199`).
- `perf-loop`: ten frame-time bars over a dashed baseline drop to lower values with ghost outlines, a diamond marks the one change, scan, stamp (`:201-235`).

Shared primitives: round check stamp, `#72f28c` scan line, pass dots, amber for failure, loop fade (`:29-32`). These are the closest existing "skills reel" pictures; a new reel redrawing dare, arena, lab, showpiece, wow-loop or perf-loop would duplicate them.

### B5. Skills page showcase (`site/skills.html`, `site/skill-showcase.mjs`)

Three feature cards with animated SVGs (`skills.html:1`, minified):

- Long Horizon (Build): "A goal travels through four saved rounds: define, build, audit, and save progress." States cycle "01 / Define the goal", "02 / Build a round", "03 / Fresh audit", "04 / Save progress" every 12 s (`skill-showcase.mjs:55,65`).
- Arena (Plan): "Three candidate approaches converge into one selected base with useful ideas combined." Branch opacity changes by stage (`skill-showcase.mjs:72`).
- Independent Review (Audit): "Independent review finds a gap, the worker repairs it, and the changed result is checked again."
- Visual vocabulary: filaments, wires, translucent planes, glowing nodes `#58e07b` with drop-shadow, orbits, a gate, amber audit finding `#efbb69`, green check (`skill-showcase.css`, `.ss-filament` through `.ss-audit-check`); corner brackets on cards.
- Directory below: searchable, filterable list with category tags and a green row-fill on hover.

### B6. About film (`site/about-film.mjs`)

WebGL2 particle film, 1920x1080, seven chapters (`about-film.mjs:15`): cold 14 s, flash 10, recall 11, skills 10, audit 14, round 10, resolve 8 (77 s).

- Cold open: Monday, the agent snags on one block of a ten-block pyramid (amber glitch, "TEST DATABASE NOT RESET"); you type a correction in chat; chat ends and the correction scatters to dust. Thursday, a new session snags on the same block beside the empty dashed outline (`:119-152,331-340`).
- Flash: the Harness H mark built from particles, "FLASHING" with a scan line and the five firmware file names, then the repository slab (five rows of words) labelled "YOUR REPOSITORY" (`:154-170,341-346`).
- Recall: next session reads `pitfalls.md` (a thread of light from the slab), then builds the whole pyramid ("What one session learns, the next one reads") (`:172-180,347-350`).
- Skills: token columns (REPLY, COMMAND OUTPUT, LARGE FILE READ) fill a CONTEXT meter; caveman, RTK and STK each cut one and the meter falls; "SKILLS, TOO, LOAD ONLY WHEN A TASK CALLS THEM" (`:182-204,351-358`).
- Audit: a DONE stamp ring slams and cracks ("SELF-REPORTED"); an amber lens labelled "CODEX · FRESH CONTEXT" sweeps and flags two blocks; builder fixes; "VERIFIED"; a person glyph lights "YOU / APPROVED" (`:206-232,359-366`).
- Round: five-node particle ring Recall, Plan, Execute, Audit, Integrate; three laps speed up; each lap drops a "+1 LESSON" packet into the repository slab (`:234-265,367-370`).
- Resolve: H mark with a sheen; "Better outcomes, every round"; "harnessfirmware.com" (`:371-373`).

### B7. About field log (`site/field-log.mjs`)

Eight scroll-driven beats (`field-log.mjs:26`): work, handoff, memory, review, judged, stale, fixed, inherit. Pictures: seven sessions as lanes on a three-day timeline with briefs handed along and one PR landing them (`:86-88`); two lanes zoomed, a perf pass saving two pitfalls the next engine reads (`:114-115`); six same-model audits pass, another vendor's lens finds the bug on line 11 (`:139`); 24 blind rounds fill a grid with one tie, three measured bars before and after (`:156`); four cards glitch amber then settle (`:169`); token-height bars, 460 px = 87,000 tokens, firmware 3,400 (`:178-179`); the H mark hands the fix to six repositories (`:205`).

### B8. Other homepage pictures

- Statement blocks: the problem statement and the `/long-horizon` statement, pinned panels with a shuffled 5x5 square reveal, hover grid, and a 17x9 pixel wipe hand-off (`statement-block.mjs:5-19`).
- Audited section: dither evidence field cycling "01 / Inspect", "02 / Finding", "03 / Repair", "04 / Recheck" with a vertical scan and three checklist rows (`dither-effects.mjs:22-31`); steps Inspect, Repair, Decide (`index.html:180-182`).
- Always-on section: "Some of it runs by itself" with caveman, recall, `pitfalls.md` cards (`index.html:159-164`).
- Memory page: AI-generated forest image `assets/memory-forest.webp` (`PROVENANCE.md:20`) and a bright lime palette (`#8cff50`, `#b4ff8b` and kin in `memory.css`).

### B9. Top metaphors to avoid, ranked by how often they recur

1. A loop or ring of five stages (Recall, Plan, Execute, Audit, Integrate): hero, about film round chapter.
2. Round check stamp on a dark disc plus `VERIFIED`: card-art, explainer, about film.
3. Scan line sweeping a drawing: card-art, explainer, dither field, about film.
4. Amber finding, repair, recheck: hero, card-art wow-loop, skills page review, dither field, about film audit.
5. Sessions as frames losing notes, ghost sessions: explainer beat 1, about film cold open.
6. Repository as a strip or slab with file glyphs and rows: explainer, about film.
7. Person glyph and a gate that opens after approval: hero, explainer beat 6, about film.
8. Strands of light carrying skills into a task or loop: hero feeds and comets, converge, explainer recall.
9. Three parallel attempts merging into one: card-art arena, skills page Arena.
10. Context meter falling as tools trim input: about film skills chapter, field log "why small".
11. H mark flashed or handing a fix to many repos: about film, field log, explainer beat 8 template strand.
12. A second-family reviewer as a double outline or amber lens: explainer beat 6, about film, field log.

## C. Explainer spec rules, quoted verbatim

### C1. Copy rules

- Spec line 26-30: "Copy rule: every line of visible text is in the table under `## On-screen copy`, cited to fact IDs in `.tmp/long-horizon/hf-explainer/research/firmware-facts-v2.md` (Harness Firmware `main` at d9d2333). The caption copy is the owner-approved v7 draft (`.tmp/long-horizon/hf-explainer/round-13/copy-draft.md`); the build copies it verbatim. Never claim "nothing merges without your approval" (fact N9) or "no lock-in", and state no skill counts (N1)."
- Spec line 51-57: "Every row is one line of visible text: the section headline and bottom note, each beat's step label, headline and caption lines, and each label drawn on the stage. Button text is excluded (`Replay ↺`, and the Pause control `Pause ‖` / `Play ▷`). ... Facts are IDs in `research/firmware-facts-v2.md`; a caption row carries every ID in its line's brackets in the approved draft."
- Spec line 141-142: "Beat 1: "Lessons vanish when the chat ends" is framing (P1; no firmware file says it)."
- Spec line 149-150: ""Skills cost one index line" is README.md:89 and context-weight.sh:4-7 (F4, S12); no token figure is given (N13)."
- Spec line 157-161: "Beat 6: S32 (every finding verified; dismissals shown), S28 (cross-vendor on request; the caption says "the other vendor's model" and names no company, N6), S41 (a skill invocation does not authorize publication). The caption scopes approval to what a skill may not do and does not say nothing merges without approval (N9, H11)."
- Spec line 162-163: "Beat 7: S44 (three checks, zero changes valid), S45 (only the user's words), S47 with N14's limit: the audit flags candidates; the stage label says `candidate to prune`, not unused."
- Spec line 165-166: "Beat 9: O1 (as mechanism), O2 (true of audited rounds, stated in the line), O7 (plain files, MIT, both runtimes; no "no lock-in")."
- Spec line 167-168: "Nothing states a count of skills (N1), a measured number (N3), mentions CI (N4), or names a vendor as an endorser (N6)."
- Spec line 155-156: "The headline keeps the "In audited rounds" qualifier (O2 scope)."
- Spec line 261-262: "No caption headline or line ends with a single word on its last line, at any width ... `balance` holds it; the copy carries no `&nbsp;`."
- Spec line 999: "The copy on the page matches the table in `## On-screen copy` word for word."
- Note for reuse: the facts file path is under `.tmp/` (gitignored), so it is not in this worktree; unverified whether it still exists on disk.

### C2. Engine requirements

- Single clock, pure frame: "One clock, `t` in ms from 0 to `TOTAL`" (spec 464). "`frame(parts, t, g)` is pure and writes attributes through `set()`" (spec 832); code signature is `function frame(P, t)` (`explainer.mjs:257`). Dimming "is a pure function of `t`, like the rest of `frame()`" (spec 438). Caption paint "is a pure function of `t` and reads no layout" (spec 834-835).
- Parts measured once: "strokes draw in with `stroke-dasharray` / `stroke-dashoffset` from lengths measured once in `parts()`; shapes move by `transform` and fade by `opacity`; nothing animates `filter`" (spec 357-359). Glow filter "is toggled, never animated" (spec 289).
- Frame loop: "one rAF loop while running, `dt` capped at 64 ms, cancelled when not running; `set()` writes an attribute only when its value changed" (spec 564-565).
- Seek: the explainer has no seek or scrub API; only Pause (freezes `t`) and Replay (`t = 0`) (spec 566-571). The about film has `seek(x)` that clamps `t`, resets trails and wakes the loop (`about-film.mjs:425`), with a range scrubber and ArrowLeft/ArrowRight 5 s (`:428,435`); its header says "Every frame is a pure function of the clock t, so the film can be scrubbed, paused and replayed; the one piece of state is the phosphor trail buffer, cleared on seek" (`about-film.mjs:2-3`).
- Flash limits: the explainer spec states none. Grep for "flash", "photosensitiv" and "seek" across the spec returned no matches. The about film's chapter named `flash` means firmware flashing, not a strobe rule.
- Timing rules (spec 481-490): reading time at least 250 ms per word; last line lands at least max(3000, words x 250 + 1500) ms before the beat ends; stagger at least 800 ms between first and last line; stillness: every cue finishes at least 2000 ms before the beat ends, only exits may use the final 800 ms; focal dimming in each beat's first 600 ms. Overall length 90 to 110 s (spec 478-479).
- Caption motion: in 400 ms, opacity smooth plus `translateY(.45em)` to 0 expo, no blur (spec 580-582); swap out 250 ms ink, in 250 to 850 ms expo (spec 452-458). "No blur: ... each new blur radius costs a 50 to 100 ms first frame (pitfalls.md, animated CSS blur)" (spec 535-537).
- Every caption line has a drawing event within 300 ms of its reveal (check allows -300 to +700) (spec 588-589).
- Focus: lit groups at opacity 1, others at `DIMMED = .35`, at most 3 lit groups per beat (spec 433-437; `explainer.mjs:44-45`).
- Playback: autoplay once on view (caption whole plus half the art box below the header), no loop; pauses offscreen, on hidden tab, or Pause; resumes from same `t` (spec 541-563).
- Reduced motion: "No reduced motion: this animation will be full motion even if the user has reduced motion on" (spec 668-669, amendment v2). Note the about film and card-art do the opposite (show a still under reduced motion: `about-film.mjs:4-5`, `card-art.mjs:14-16`).
- Pause control required: "It exists because the sequence runs longer than five seconds next to other content (WCAG 2.2.2)" (spec 980-981). Buttons 44px tall targets (spec 297-298).
- No-JS: inline SVG authored in its end state, captions as HTML, static three-column list (spec 217-219, 674-694).
- Layout stability: no height change from first paint to `load` + 3 s; fixed aspect ratios per breakpoint (spec 753-766, 986-988).
- Performance target: "no frame over 50 ms after the first three frames of play" (spec 991-993); zero console errors; `scrollWidth <= clientWidth` at 390 (spec 997).
- Verification: headed Chrome through `launchPlacedChrome()` with `CHROME_PLACE=offscreen`, at 1440x900 and 390x844 (spec 983-984).
- Observable hooks: `#explainer[data-state]` idle, playing, paused, ended; `#explainer[data-beat]`; `data-p` names on animated SVG elements (spec 847-864).
- Accessibility: art box `role="img"` with one `aria-label`; SVGs `aria-hidden`; captions stay in the a11y tree (opacity only); no live region (spec 963-976).
- Scroll hold: section gets a 150svh `::after` block with the smooth-scroll layer, content held still from the reading position; no input listeners (spec 629-661).
