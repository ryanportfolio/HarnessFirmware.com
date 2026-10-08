# Recon: site map for the skills reel

Facts only. No design decisions are made here.

## Sources and citation format

- Site: worktree `.claude/worktrees/skills-reel`, branch `feat/skills-reel`, HEAD `2d740a9` (equal to `origin/main`). Paths below are relative to the repo root unless they start with `site/`.
- Template: `ryanportfolio/Harness-Firmware` `main` at `64e8f247dc7ca70cd6b03ac78f8786df06813c5c` (2026-10-06, "Keep answer keys out of the run being evaluated (#212)"), read through `gh api` on 2026-10-07.
- Citations are `file:line`. `site/skills.html` packs most of the page onto line 1 (25,540 characters), so places on that line also give a column (`skills.html:1 c3606`). `site/arena.html` and `site/long-horizon.html` are each one line, so they are cited as `:1`.
- "Inference" marks a conclusion the sources imply but do not state.

## 1. `site/skills.html`

### Page structure

- `<head>` loads, in order: `/fonts.css`, `styles.css`, `experience.css`, `skill-showcase.css`, `dither-effects.css`, `site-footer.css`, `site-header.css`, then five module scripts: `site-header.mjs`, `skill-showcase.mjs`, `skill-directory.mjs`, `skill-scroll.mjs`, `site-footer.mjs` (`skills.html:1`). Three font files are preloaded: Lineal, Harness Text, Departure Mono (`skills.html:1`).
- `main#main > section.skill-library#skills` (`skills.html:1 c3062`) holds:
  - `.ss-heading`: `h1#ss-title` "Skills", the lede `p.ss-lede`, and `#ss-motion-status` "Illustrative workflows" (`skills.html:1 c3190`, `c3519`).
  - `.ss-gallery` (`skills.html:1 c3582`): three `article.ss-feature` cards with an inline SVG `svg.ss-illustration` each: `.ss-horizon` (Long Horizon, `c3606`), `.ss-arena` (Arena, `c17637`), `.ss-review` (Independent Review, `c20494`). Each card has `.ss-feature-top` (category word), `.ss-feature-copy` (h3, p, link) and `.ss-scene-state` (a stage label the script rewrites).
  - `.ss-directory` (`skills.html:1 c22594`): `h3` "Explore all skills", `span.ss-count` "12 shown" (`c22687`), `.ss-tools` (search `#skill-search` and six filter buttons `data-ss-filter` all, plan, build, audit, improve, project; Audit ships `aria-pressed="true"`), `aside.ss-preview` (`c23498`), then `.ss-index` (`c24050`) with the entries.
  - Entries run from `skills.html:1 c24072` to `skills.html:33`, one or two per line, with blank lines 6, 20 and 25. Line 34 closes the index and holds `p.empty-skills` and `p.ss-source-note`: "From the Harness Firmware skill library. Examples are requests you can adapt. Runtime and tool requirements vary by skill." Lines 35 to 41 are the footer.
- Entry count: 38 `details.ss-entry` (parsed with the same regex the test uses, `site/skills-page.test.mjs:14`).

### How one entry renders

Every entry has this exact shape (example `skills.html:13`):

```html
<details class="ss-entry" id="skill-why" data-skill-id="why" data-category="audit">
  <summary><div><h4>Why</h4><p>Take a fresh look at the last recommendation.</p></div>
    <span class="ss-category">audit</span><span class="ss-plus" aria-hidden="true">+</span></summary>
  <div class="ss-detail"><p>...</p><code>...</code>
    <a href="https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/why/SKILL.md">Read Why source ↗</a></div>
</details>
```

- Entries outside the Audit category carry `data-ss-off`; `@media(scripting:enabled)` hides them until `skill-showcase.mjs` swaps the attribute for `hidden` (`site/skill-showcase.css:59-60`). Without scripting every entry shows and the count and tools are hidden (`site/skill-showcase.css:61`).
- The first Audit entry, Impartial Review, carries `data-preview` and the preview aside ships filled with its copy (`skills.html:3`, `skills.html:1 c23498`).
- Summary is a 3-column grid (name block, category, plus), minimum height 88px; the plus rotates 45deg when open (`site/skill-showcase.css:62-68`). Detail `code` is a block with a left rule (`site/skill-showcase.css:71`). No entry has an image, SVG or animation today.

### Current copy of the requested skills

Present on the page:

| Skill | Where | Category | `h4` | Summary `p` | Detail `p` | `code` |
|---|---|---|---|---|---|---|
| `long-horizon` | `skills.html:1 c24072` | build (`data-ss-off`) | Long Horizon | "Carry a goal across verified rounds." | "Save the goal, progress, evidence, and next action between rounds. Independent audits require fresh agents." | "Build and verify the homepage in bounded rounds." |
| `arena` | `skills.html:2` | plan (`data-ss-off`) | Arena | "Build alternatives, judge them blind, combine the best." | "Parallel candidates build the same brief in a scratch folder. A blind judge checks each against pass/fail criteria, the strongest becomes the base, and a few ideas from the others are grafted in. With a ChatGPT-subscription Codex login, one candidate and the judge run on Codex." | "Explore three approaches to the homepage." |
| `wow-loop` | `skills.html:5` | improve (`data-ss-off`) | Wow Loop | "Review and repair against a clear quality bar." | "Critics judge the deliverable from their own captures and measurements against a written quality contract. Every check passes or fails, state is saved to disk, and a later run resumes at the weakest part." | "Refine this page against the approved reference." |
| `perf-loop` | `skills.html:5` (second entry on the line) | improve (`data-ss-off`) | Perf Loop | "Measure, change one thing, measure again." | "Each round starts from a baseline, makes one focused change, and checks the result with an independent review. Covers frame rate, loading, latency, throughput and resource use." | "Make the homepage load faster on a phone." |
| `why` | `skills.html:13` | audit | Why | "Take a fresh look at the last recommendation." | "Explicit invocation asks for an independent challenge to the previous recommendation." | "/why" |
| `codex-review` | `skills.html:15` | audit | Codex Review | "Get a second opinion through Codex CLI." | "Run codex exec review with gpt-6.1-sol at high reasoning over a PR, branch, commit, or uncommitted diff. Verify each finding." | "Review this pull request with Sol." |
| `codex-fullreview` | `skills.html:16` (second entry) | audit | Codex Full Review | "Run a multi-agent review through Codex CLI." | "Codex runs Impartial Review as manager with fresh sub-reviewers at gpt-6.1-sol, then each finding is verified. Uses more of your Codex plan than Codex Review. Claude Code only; in Codex, use Impartial Review directly." | "Run a full Codex review of this branch." |
| `showpiece` | `skills.html:18` | build (`data-ss-off`) | Showpiece | "Craft a distinctive artifact around its subject." | "Choose a direction from the real material, test it in the intended medium, and refine the details people encounter." | "Create a distinctive project landing page." |

Stale entries standing in for requested skills:

| On the page | Where | Copy | Template now |
|---|---|---|---|
| `merge-ready` (audit) | `skills.html:16` (fifth entry on the line) | h4 "Merge Ready"; summary "Review an open pull request until it is ready to merge."; detail "Codex Full Review and Codex Review run in parallel on the pull request. Confirmed findings are fixed and pushed, then Codex Review reruns on the new head until a round confirms nothing above minor, with at most three reruns. It never merges and never starts on its own; you start it with /merge-ready. Claude Code only."; code "/merge-ready" | Replaced by `merge` in template commit `8d29558` "Combine merge-ready and /merge into one merge skill (#188)", 2026-10-02. Template description: "Merge PRs through a Codex review loop: /codex-fullreview, fix, then /codex-review reruns (3 max) until clean, then CI and squash-merge. Runs only when the user types /merge; from then on, every PR in the session goes through the same loop and merges." (template `.claude/skills/merge/SKILL.md` frontmatter, `disable-model-invocation: true`). The commit message says `/merge` runs `/codex-fullreview` first, then `/codex-review` reruns, not both in parallel. |
| `compact-review` (improve) | `skills.html:24` (second entry) | h4 "Compact Review"; summary "Write what /compact should keep."; detail "Review the session and return one copy-ready block of instructions to paste after /compact: the goal, current state, decisions, what is verified, the next step, and approaches that failed. It does not run /compact. Claude Code only."; code "/compact-review" | Replaced by `/smart-compact` in template commit `add20ea` "Replace compact-review with the /smart-compact mod (#208)", 2026-10-06. `smart-compact` is a Claude Code mod (plugin folder with `.claude-plugin/plugin.json` and `hooks/hooks.json`, `hooks/register.ts`), not a skill: it has no `SKILL.md`, the repo scripts treat it as a resource folder, and the README skill list does not include it (commit message; template `README.md`). Plugin description: "/smart-compact: write custom /compact instructions from the session, then compact with them". Behavior change: it now runs `/compact` itself after the review. |

Absent from the page: `merge`, `smart-compact`, `deep-plan`. Template `deep-plan` description: "Use for /deep-plan: interview a loose idea in short rounds of decisions and stop for an explicit go before anything is built." (template `.claude/skills/deep-plan/SKILL.md`, both runtimes).

Drift check output (`node scripts/refresh-upstream-skills.mjs --check`, run 2026-10-07 against template `64e8f24`, 18 differences): catalog missing `deep-plan`, `merge`, `servers`, `wrapup`; catalog lists `merge-ready` and `compact-review`, which the template does not have; `upstream-skills.json` and `skill-rules.js` are out of date; dependency changes include "merge needs: ... manifest says codex-fullreview, codex-review". `site/new/skill-catalog.js` carries the same stale entries (`merge-ready`, `compact-review`), and the page test ties `skills.html` to that catalog (section 8), so swapping the page entries alone fails the test.

Wording drift that is not a rename (inference: older text, not wrong):

- `showpiece`: page "Craft a distinctive artifact around its subject." Template now: "Push an artifact past what people expect from its kind, in any medium. ... Not for quiet or faithful work such as forms, dashboards, exact recreations or brand matching" (template `.claude/skills/showpiece/SKILL.md`).
- `wow-loop`: template now covers "one deliverable or a set of like items" and "a target score to reach" (template `.claude/skills/wow-loop/SKILL.md`); the page does not mention either.
- `why`: template "Pressure-test a recommendation with one fresh reviewer" (template `.claude/skills/why/SKILL.md`); page copy agrees in substance.
- `codex-review`, `codex-fullreview`, `arena`, `perf-loop`, `long-horizon`: page copy matches the template descriptions (model pin `gpt-6.1-sol`, high, in both).

Reference files are stale the same way: `.claude/reference/product.md:130`, `:136`, `:240` and `.claude/reference/product-skills.md:78`, `:102`, `:103` describe `merge-ready` and say it never merges. The template `merge` skill does squash-merge once the user types `/merge`. `product-skills.md:19` lists `merge` as gone from the template, which commit `8d29558` reversed.

### Gallery copy on the same page

- Lede (`skills.html:1 c3190`): "`/dare` questions a plan from first principles. `/codex-review` gets a second model's review. `/long-horizon` splits a big task into rounds, each built by a fresh agent and checked by an independent auditor, while your session only plans."
- Long Horizon card (`skills.html:1 c17218`): h3 "Long Horizon"; p "Carry a goal across verified rounds."; `p.ss-ultra` "Ultra version for Claude Code: `/long-horizon-workflows` runs the rounds through Claude Code's built-in workflows with judges and a run journal."; link "Explore the workflow" to `/long-horizon`. Top label "Build".
- Arena card (`skills.html:1 c20259`): h3 "Arena"; p "Test alternatives. Combine the strongest ideas."; link to `/arena`. Top label "Plan".
- Independent Review card (`skills.html:1 c22348`): h3 "Independent Review"; p "Fresh context. Verified findings."; link to `/#audit-details`. Top label "Audit".

### Unrelated defect seen in passing

The main nav lists "About" twice on `skills.html:1` and `memory.html:1`; `about.html:3` and `index.html:47` list it once.

## 2. Existing skill modules and what they already draw

### `site/skill-showcase.mjs` (96 lines)

- Runs at module top level when `#skills` exists; no exports (`skill-showcase.mjs:1-2`).
- Directory filter (`:3-42`): default category `audit`; a `#skill-<name>` hash opens that entry and switches to its category (`:7-15`); filtering matches `entry.textContent` against the search box (`:20`), sets `hidden`, writes "`N` shown", toggles `.empty-skills`, and dispatches `harness:layout-change` (`:16-27`); every `details` toggle dispatches the same event (`:42`).
- Gallery motion (`:44-95`): one 12 s loop in four stages (`:55-56`). Moves `circle` dots along `[data-ss-path]` paths with `getPointAtLength` (`:48`, `:57-62`); per stage it rewrites the three `.ss-scene-state` labels ("01 / Define the goal" ... "04 / Save progress"; "Explore alternatives" ... "Graft useful ideas"; "Inspect the work" ... "Recheck the result", `:65-67`), lights one of four `[data-ss-gate]` rectangles green (`:68`), fades an amber audit finding and a green check (`:69-70`), turns the repair wire amber in stage 3 (`:71`), and dims or lights the arena branches and synthesis (`:72-73`).
- Loop control: one rAF, elapsed capped at 64 ms per frame (`:81`); runs only while the gallery intersects (IntersectionObserver threshold 0, `:92`), the tab is visible (`visibilitychange`, `:93`) and reduced motion is off (`:77`); under reduced motion it paints once and the status reads "Static diagrams" (`:89`, `:95`).

### `site/skill-showcase.css` (97 lines)

- Scoped under `#skills`. Tokens `--ss-lime:#53db76`, `--ss-ivory:#f1f0df`, `--ss-muted:#acb19e`; ground `#09100b` (`:1`).
- Film grain: `#skills:before` with `assets/grain.png` at opacity .09 and `ss-grain .27s steps(1,end) infinite`, off under reduced motion (`:3-6`).
- Gallery: 2-column grid `1.62fr 1fr`, rows 238px and 258px; Long Horizon spans both rows (`:13`, `:18`). Cards have green corner brackets (`:15-17`). SVG classes: `.ss-filament` (thin bundled curves, `:34-35`), `.ss-wire`, `.ss-planes`, `.ss-node` (green dot with drop-shadow glow), `.ss-orbit`, `.ss-gate`, `.ss-audit-finding` (amber `#efbb69`), `.ss-audit-check` (`:36-43`).
- Breakpoints at 1000px, 620px and 1600px (`:77-80`, `:94-95`).

### `site/skill-directory.mjs` (15 lines)

- Fallback: if `skill-showcase.mjs` failed, removes `data-ss-off` from every entry and resets the count (`:3-4`).
- Hover, focus or click on an entry fills `aside.ss-preview`: `strong` from the `h4`, `p` from the first sentence of the first `.ss-detail p`, the `href` from the first `.ss-detail a`, and one of five static category diagrams drawn as a single SVG path (`audit`, `build`, `design`, `write`, `project`; others fall back to `project`) (`:7`, `:11-12`). A MutationObserver re-selects when the shown entry is hidden (`:13`). No motion.

### `site/skill-scroll.mjs` (92 lines)

- Mounts the shared spring smooth scroll (`smooth-scroll.mjs`) for the skill pages and `/about`; reduced motion keeps native scroll and the preference change remounts (`:1-12`, `:91-92`).
- Moves `main` and the footer into a `[data-scroll-layer]`, adds a spacer, publishes `window.harnessScroll` and `html[data-smooth-scroll]` (`:13-51`), handles same-page hash links and keyboard focus reveal (`:52-83`), and re-lands an incoming fragment after `document.fonts.ready` (`:84`).

### `site/skill-pages.mjs` (27 lines), used by `/arena` and `/long-horizon`

- Imports `./skill-scroll.mjs` (`:1`).
- Three-step demo driven by `setTimeout` every 3500 ms after the user presses the play button; no autoplay (`:24-25`). Long Horizon swaps round labels, state text and worker text per step (`:5-6`). Arena toggles candidate and assembly panels and, in step 3, flies the letters B, A and C to their parts with the Web Animations API (750 ms, 240 ms stagger, `cubic-bezier(.2,.7,.2,1)`) (`:8-22`).
- An IntersectionObserver only records visibility, so ticks skip while offscreen (`:26`); reduced motion stops playback and skips the flights (`:12`, `:26`). Also wires the copy-invocation button with a select-text fallback (`:27`).

### `site/card-art.mjs` (286 lines): existing looping scenes for four of the requested skills

This is the homepage module closest to "looping 8 to 10 s scene for a skill card". It already animates six commands, four of which are on the reel list (`card-art.mjs:1-13`):

- `arena` (`:77-120`, period 12 s): "three attempts run in parallel lanes; the strongest becomes the base and one part from each of the others folds into it".
- `showpiece` (`:155-175`, period 11 s): "a scan passes over a generic page and leaves a composed layout behind it".
- `wow-loop` (`:176-200`, period 12 s): "the result is compared with the goal, a finding is repaired and rechecked, and a round marker advances each loop".
- `perf-loop` (`:201-236`, period 12 s): "frame times are measured against a baseline, one change lands, the new run comes in lower, and an independent check stamps it".
- Also `dare` (`:34-76`, 12 s: one block splits into four pieces, one fails, survivors rebuild) and `lab` (`:121-154`: three sliders drive a live preview).

Pattern: each art is an object `{period, still, markup(), parts(host), frame(p, t)}`; `frame` is a function of `t` that writes SVG attributes through a compare-before-set helper (`:25-28`); `loopFade` fades out over the last .6 s and in over the first .4 s of each loop (`:29-30`); all drawings are 480 x 240 SVG with a root group `fill="none" stroke="#53db76" stroke-width="1.2"` (`:22`). `mountCardArt(root)` (`:239-286`) is exported, injects the markup into `.cmd-card__media[data-art]`, runs one shared rAF loop with elapsed capped at 64 ms, observes each card with an IntersectionObserver, pauses on `visibilitychange`, paints each `still` frame under reduced motion, and returns a disposer. Glow on scans and stamps is a CSS `drop-shadow(0 0 4px #53db7680)` (`site/card-art.css:4`). The homepage copy for these cards is at `site/index.html:170-172` (dare, arena, lab) and `site/index.html:205-207` (showpiece, wow-loop, perf-loop).

### Other motion already on the site (pictures a scene would repeat)

- Hero loop (`site/living-system.mjs`): one task around Recall, Plan, Execute, Audit, Integrate, Human approval, Project memory, with a finding, a repair, a fresh audit and the 390px navigation example (`docs/specs/2026-09-27-explainer-animation-design.md:783-787`). Canvas particles at DPR up to 1.5 (`living-system.mjs:83`).
- Explainer (`site/explainer.mjs`): nine beats on one SVG with a repository strip along the bottom (`site/index.html:129-137`; spec `:19-24`).
- Converge (`site/converge.mjs:3-6`): four labelled strands fuse into one beam ending on a TASK node, scroll-scrubbed.
- Statement blocks, card rows: split-text reveals, a hover light grid, and a shuffled pixel wipe (`site/README.md:36-44`). The `/long-horizon` statement reads "Your session holds the plan / A fresh agent builds each round / A separate auditor checks the real files / Only work that passes moves forward" (`site/index.html:197`).
- `#audit-details`: Inspect, Repair, Decide (`site/index.html:180-182`).
- About film and field log: WebGL2 particles (section 4).
- Footer: WebGL perspective grid floor (`site/footer-floor.mjs:1-6`). Dither: 8x8 Bayer thresholding on Canvas2D (`site/dither-effects.mjs:2-3`).
- Common devices across these: a green check stamp that pops from 1.6x (`explainer.mjs:217-222`; card-art), a bright scan line, an amber finding then green recheck, a dot travelling a path, and focal dimming to .35 (`explainer.mjs:44-45`).

## 3. `site/arena.html` and `site/long-horizon.html`

Both load only `/fonts.css`, `styles.css`, `experience.css` and `skill-pages.mjs`, use `body.skill-page`, a reduced header (brand, "All skills", "Get started") and the same article layout (`arena.html:1`, `long-horizon.html:1`).

- `/arena` picture (`arena.html:1`): header label "ILLUSTRATIVE / ONE SHARED HOMEPAGE BRIEF", button "Play selection ▷". Three paper-colored HTML cards: "CANDIDATE A / EDITORIAL" "Start with a story"; "CANDIDATE B / GUIDED" "Start with your project" with a "Create a project ↗" action; "CANDIDATE C / VISUAL" "See a first draft" with a mini "Homepage plan" list. Each has a two-line verdict. Step 2 outlines B in green and lifts it 10px (`site/experience.css` rule `.arena-candidates[data-phase='1']`); step 3 fades A and C to .5 at scale .94, then shows an assembly: a contribution list (B "Keep the base", A "Add the opening", C "Add the preview") beside a mock browser "FIELDNOTES / HOME" made of the three parts, with origin tags. Static statement: "Compare clarity, mobile fit, and maintainability. Candidate workers use separate output paths." Invocation: "$arena Explore three homepage approaches. Compare first-screen clarity, navigation at 390px, and maintainability."
- `/long-horizon` picture (`long-horizon.html:1`): header label "ILLUSTRATIVE / THREE BOUNDED ROUNDS", button "Play rounds ▷". A three-column `.round-demo`: round list "01 / Build", "02 / Repair", "03 / Continue" (active one green with a left border, `site/experience.css` `.round-numbers div.active`); a state card "STATE.MD / MANAGER OWNS THIS" with title and four lines (Goal, Check, Phase, Worker); a worker card. Text changes per step (`skill-pages.mjs:5-6`); the example is the 390px navigation repair. Invocation: "$long-horizon Build and verify the homepage in bounded rounds. Check Firefox 140, Chromium, and navigation at 390px." The source link points at `.agents/skills/long-horizon/SKILL.md`, while `arena.html` points at `.claude/skills/arena/SKILL.md`.

Both pictures are mostly typeset HTML cards that swap content on a timer; no SVG or canvas.

## 4. `site/about-film.mjs` (461 lines)

- Engine: WebGL2 particles (22,000 above 1100px wide, else 12,000) on a 1920 x 1080 stage, with HTML captions positioned over the canvas (`:1-2`, `:381`). Renderer and easing come from `site/particle-engine.mjs` (`:11-12`; engine pipeline `particle-engine.mjs:1-6`: additive gaussian points, phosphor trail, two-level blur, tone-mapped composite with grain and vignette).
- Determinism: "Every frame is a pure function of the clock t, so the film can be scrubbed, paused and replayed; the one piece of state is the phosphor trail buffer, cleared on seek" (`:2-3`). `fillBuf(t)` evaluates per-role keyframe tracks (`:319-325`); `frame(now)` advances `t` by `dt` capped at .1 s, fills the buffer, draws, paints captions (`:415-421`). `seek(x)` clamps, resets trails and wakes the loop (`:425`). A range input scrubs it; arrow keys seek 5 s (`:428-436`). None of these are exported; the module only mounts `#film` (`:460-461`).
- DPR capped at 1.5 (`:446`). Autoplay when half the stage is on screen unless reduced motion; under reduced motion the last frame shows and waits for Play (`:4-5`, `:380`, `:395`, `:450-454`). Pauses offscreen and on hidden tab, resumes by itself (`:6-7`, `:455`). Without WebGL2: `data-state="unsupported"` and a static message (`:9`, `:383-384`).
- Chapters (`:15`): `cold` 14 s, `flash` 10, `recall` 11, `skills` 10, `audit` 14, `round` 10, `resolve` 8 (77 s total).
- Metaphors and captions (`:119-121`, `:154`, `:172`, `:206-207`, `:234`, `:327-376`):
  - cold: particle block pyramid; Monday the build snags ("TEST DATABASE NOT RESET"), your chat note fixes it, "CHAT ENDS" and the note scatters; Thursday the same snag; statement "Every session starts from zero".
  - flash: the H mark flashed by a scan line; file list `CLAUDE.md`, `AGENTS.md`, `.claude/reference/`, `.claude/skills/`, `.agents/skills/`; "Memory, skills and review, built into the repository"; a "YOUR REPOSITORY" row set.
  - recall: the next session reads `pitfalls.md` first, builds the whole pyramid; "What one session learns, the next one reads".
  - skills: three text columns (REPLY / COMMAND OUTPUT / LARGE FILE READ) trimmed by CAVEMAN, RTK, STK while a CONTEXT meter drains; "SKILLS, TOO, LOAD ONLY WHEN A TASK CALLS THEM".
  - audit: a self-reported DONE stamp cracks; an amber lens "CODEX · FRESH CONTEXT" flags two blocks; "FIXED · RECHECKING", "VERIFIED"; a person glyph "YOU" "APPROVED"; "A second model checks it. You approve".
  - round: a five-node ring (Recall, Plan, Execute, Audit, Integrate), three laps that speed up, "+1 LESSON" dropped into the repository rows; "Each round starts from what the last one learned".
  - resolve: "Better outcomes, every round", "HARNESS FIRMWARE · FOR CLAUDE CODE AND CODEX", "harnessfirmware.com".

## 5. `site/explainer.mjs` engine (713 lines)

- Medium: inline SVG in `index.html` (two drawings, wide 960 x 560 and tall 360 x 480, swapped at 767px) with HTML captions; no canvas, so no DPR handling (`:1`, `:52-60`, `:501`, `:504`).
- No public API: the module exports nothing, has no `seek` or `renderAt`, and exposes no global or URL hook (grep of `export|location|URLSearchParams|window.__` found none). It mounts `#explainer` on load (`:713`).
- Internal shape, documented as "Pattern from card-art.mjs: parts(svg) collects elements once, frame(parts, t) is pure and writes attributes only when they change, one rAF loop with dt capped at 64 ms runs only while playing" (`:19-20`):
  - Timeline constants: `BEATS` as `[beat, start, duration]` in ms and `TOTAL = 103800` (`:33-34`); `REVEAL` caption line times (`:49`); `FOCUS` dimming table (`:44-45`).
  - `parts(svg)` collects `[data-p="name"]` elements and measures path lengths once (`:161`).
  - Helpers copied, not imported: `clamp01`, `smooth`, `lerp`, `span`, `quart`, `expo`, a `bezier` solver, `easeExpo` `(0.16,1,0.3,1)`, `easeInk` `(0.4,0,0.2,1)`, `easeQuint` `(0.22,1,0.36,1)`, `pulse`, `mix` (`:104-135`). Writes go through a per-element `WeakMap` cache so unchanged values cost no DOM work (`:136-149`). Primitives: `draw` (dash-offset stroke draw-in), `inkIn` (fade with a 6-unit rise), `stamp` (check pops from 1.6x), `scan` (`:200-232`).
  - `frame(P, t)`: "Pure: the same t always gives the same attributes" (`:256-257`). Captions are painted from `t` in the same pass (`mount` `paint`, `:506-540`).
  - Clock: `t += Math.min(now - previous, 64)` per rAF (`:558-559`); state machine `idle | playing | paused | ended` on `#explainer[data-state]`, plus `data-beat` (`:14-15`, `:542-556`).
- Offscreen pause: an IntersectionObserver with threshold 0 on the stage sets `inView` (`:574-579`); `running()` also requires `!document.hidden` and no user pause (`:542`); `visibilitychange` calls `sync` (`:636`). The start trigger is a second observer with header-aware `rootMargin` (`:580-616`).
- Fonts: the module does not await fonts before painting. Only the scroll hold re-measures on `document.fonts?.ready` (`:705`). Elsewhere: `hero-pillars.mjs:268-276` calls `document.fonts.load` for the exact faces it measures ("fonts.ready alone only covers faces the page has already requested"), and `converge.mjs:359-372` warms canvas glyphs once.
- Reduced motion: deliberately not read; the explainer plays the same (`:13`; spec amendment v2, `docs/specs/2026-09-27-explainer-animation-design.md:666-672`). Every other motion module on the site honors the preference (sections 2 and 4).
- Before `.is-live` the stage is hidden, with a CSS fallback that reveals it after 8 s (`:569`; spec `:696-700`).

Comparison: the about film has a working internal `seek` and canvas DPR handling but is WebGL2 and 77 s long; the explainer is SVG and pure in `t` but has no seek entry point; `card-art.mjs` is SVG, pure in `t`, loops per card in 11 to 12 s, honors reduced motion with a `still` time, and is the only one of the three with an exported mount function (`card-art.mjs:239`).

## 6. Copy rules already written

Project kernel (`CLAUDE.md`, "What this project is"): "Won't compromise on: claims the template sources support (cite them; check counts and model ids against template main), and the human approval step in every description of the loop." Before changing copy or the skill catalog, read `product.md`, `product-skills.md` and `product-site.md`.

Explainer spec (`docs/specs/2026-09-27-explainer-animation-design.md`):

- `:26-30`: "Copy rule: every line of visible text is in the table under `## On-screen copy`, cited to fact IDs ... the build copies it verbatim. Never claim "nothing merges without your approval" (fact N9) or "no lock-in", and state no skill counts (N1)."
- `:157-161`: the cross-vendor caption "says "the other vendor's model" and names no company, N6"; approval is scoped "to what a skill may not do and does not say nothing merges without approval (N9, H11)".
- `:167-168`: "Nothing states a count of skills (N1), a measured number (N3), mentions CI (N4), or names a vendor as an endorser (N6)."
- `:283-290`: SVG house style "from card-art.mjs": root group `fill="none" stroke="#53db76" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"`; occluding fills `#10150f`; scans and new lines `#72f28c` at 1.6; failure `#efc87e`; ghosts `#3e5a45`; secondary opacity .45; the check stamp `<circle r="16" fill="#10150f"/><path d="m-7 0 5 5 10-11" stroke-width="2"/>`; glow by toggled class, "never animated".
- `:532-537`: easing list, and "No blur ... because each new blur radius costs a 50 to 100 ms first frame".
- `:781-787`: "Not duplicated from the hero": do not redraw the loop, the five stage nodes, the particle ring, the finding-and-repair story, or the 390px example.

`.claude/reference/product.md` "Claims to avoid or qualify" (`:233-247`), the lines that bear on skill scenes:

- `:235` "Skill counts. Say what each number counts." (the counts in that bullet are pinned to `bbd0b5f` and are now out of date: template README says "38 Claude Code skills · 36 Codex skills", template `README.md:78`).
- `:238` "**Illustrative demos** (hero, explainer, arena, long-horizon) are not measurements."
- `:239` "Never call a same-vendor review cross-vendor. A full review requires sub-reviewers that actually spawned; with zero, report it incomplete."
- `:240` "`merge-ready` and `babysit-ci` never merge; permissions allow `gh pr merge` and nothing in the template enforces review first. Never say CI passes until a GitHub run shows it." (The `merge-ready` half is stale, section 1.)
- `:241` "Model ids (`gpt-6.1-sol`, `gpt-6-astra`, `fable`, `opus`) are pins, not proof of availability."
- `:242` "RTK and STK are external. Say "supported" or "pairs with", not "includes"."
- `:246` "Retired names. `unslop` and `writing-skills` are retired ... Do not revive them."
- `:237` "Self-improving." Improvements are proposed, reviewed and merged by a person, never applied automatically.
- Layer 6 (`:136`): "Merge and release stay with a person. ... Invoking a skill does not authorize commit, push, PR, merge, deploy or installs unless the skill says so". `merge` is a skill that says so, on an explicit `/merge` (section 1).
- Vocabulary (`:226`): "Codex reviewing Codex is not cross-vendor."

`.claude/reference/product-site.md`: page claims table (`:15-23`), including for `/arena` and `/long-horizon` "Illustrative only" and Long Horizon's "Saved state does not schedule a future run, and the skill does not authorize publishing or merging" (`:22`); `AGENTS.md` adds "When creating copy for a site, UI, or anything else: less is more." (`:69`); the site update checklist (`:89-103`) lists every hard-coded place, including `site/skills.html` entries, "12 shown" and model pins (`:95`).

`.claude/reference/product-skills.md`: no banned-phrase list; it is the row source for each skill. The rows used here: `why` `:46`, `arena` `:47`, `long-horizon` `:55`, `perf-loop` `:58`, `wow-loop` `:59`, `showpiece` `:60`, `codex-review` `:68`, `codex-fullreview` `:70`, `merge-ready` `:78` (stale). No rows exist for `merge`, `deep-plan` or `smart-compact`.

Session-wide writing rules (user global `~/.claude/CLAUDE.md`, "Always-on unslop"): no em dashes, no listed AI vocabulary, no puffery, sentence-case headings, straight quotes.

## 7. CSP and README notes

`vercel.json:17` (applies to every path, `:10`):

```
default-src 'self'; script-src 'self' 'sha256-VDVDNNRTREupwUTWnq6itaNdc1TFEVFbXV4xlAS7Gow='; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

- The one script hash matches the inline script at `site/new.html:31`, `document.documentElement.className = 'js';` (hash recomputed locally). Any other inline executable script is blocked; module scripts from `'self'` are allowed. The JSON-LD block at `site/index.html:20` is a data block, not executed (inference: `script-src` does not block non-executed data blocks).
- `style-src 'unsafe-inline'`: inline `style=""` attributes, `<style>` and `el.style` writes are allowed. The explainer spec records "Inline `style=""` is allowed by the CSP; inline script is not" (`docs/specs/2026-09-27-explainer-animation-design.md:222-223`).
- Canvas 2D and WebGL need no CSP directive (inference; the site already ships both under this policy: `converge.mjs:80`, `particle-engine.mjs:53`). `img-src data: blob:` allows data-URL and blob images; `media-src blob:` and `worker-src blob:` allow a blob video or worker; `connect-src 'self'` allows same-origin `fetch`.
- Other headers: `X-Frame-Options: DENY`, `frame-ancestors 'none'` (the reel cannot be iframed on another site), COOP `same-origin` (`vercel.json:12-16`). Cache: `/assets/*` one day plus stale-while-revalidate, fonts immutable, other paths `max-age=0, must-revalidate` (`vercel.json:20-37`).

`site/README.md` animation notes:

- `:3`: "No package installation or build step is needed" for local preview (`node site/server.mjs`).
- `:13`: the hero loop replay "is illustrative and does not execute repository actions. Reduced motion shows the complete example immediately. With JavaScript disabled, the default stage and the source disclosure explain the full process."
- `:19-26`: four font tokens (`--font-display` Lineal 781, `--font-accent` Fraunces italic, `--font-text` Harness Text, `--font-mono` Departure Mono, also for canvas labels); "every page links it first and preloads the faces its first screen uses"; huge type tracked -0.015em.
- `:34`: "With `prefers-reduced-motion: reduce`, every page scrolls natively."
- `:44`: card art "Reduced motion visitors get the static cards with each drawing as a still frame."
- `:46`: the explainer paragraph, including "Every box has its size at first paint, and the script changes only opacity, transforms and SVG attributes" and its reduced-motion exception "by the site owner's decision (spec amendment v2)".

Related pitfalls (`.claude/reference/pitfalls.md`): Playwright motion captures, three traps (`:111-127`: `document.hidden` never turns true under CDP; `recordVideo` webm cannot be seeked; freezing WAAPI needs `playbackRate = 0`); animated CSS blur first-visit long frames (`:129-138`); reveal animations must not keep a clip-path (`:193-198`); CLS 0 does not mean no load shift, scroll scenes need final height at first paint (`:200-209`); `npm install` prunes the `playwright-core` the checks use (`:211-216`).

## 8. Tests that read `skills.html`

`site/skills-page.test.mjs` (62 lines), run in CI by `.github/workflows/readme.yml:32`:

- Parses entries with `/<details class="ss-entry"([^>]*)>([\s\S]*?)<\/details>/g` and reads `id`, `data-skill-id`, `data-category`, `data-ss-off`, and the first `<a href="...">Read ... source` link in the body (`:14-20`). A nested `</details>` inside an entry would end the match early.
- Test 1 (`:22-33`): the page names equal `HARNESS_SKILL_CATALOG` names from `site/new/skill-catalog.js`: no missing, extra or duplicate.
- Test 2 (`:35-47`): each entry's `id` is `skill-<name>` and its source link is `https://github.com/ryanportfolio/Harness-Firmware/blob/main/<folder>/SKILL.md`, where `<folder>` is the first runtime folder from `harnessSkillFolders(skill)`.
- Test 3 (`:49-55`): `data-ss-off` is on every entry outside `audit` and only there, and the page contains `<span class="ss-count" ...>N shown</span>` where N is the Audit count (12 today: impartial-review, handoff-audit, advocate, why, astra-review, codex-review, claude-review, codex-fullreview, astra-fullreview, opus-fullreview, external-review, merge-ready).
- Test 4 (`:57-62`): `site/new.html` says "`N` enabled" for the catalog total.
- `site/github-creator.test.mjs` (CI `readme.yml:30`) fails when `skill-catalog.js` drifts from `site/new/upstream-skills.json` (`.claude/reference/product-site.md:59`).

Runtime readers of entry markup (not tests, but they break the same way): search matches `entry.textContent` (`skill-showcase.mjs:20`), so text inside an entry (SVG `<text>`, captions) becomes searchable; the preview reads the first `.ss-detail p` and the first `.ss-detail a` (`skill-directory.mjs:11`), so a new `p` or `a` placed ahead of them inside `.ss-detail` changes the preview.

## 9. Where new files would live and how pages load modules

- Layout: page modules and stylesheets sit flat in `site/` (`site/*.mjs`, `site/*.css`). One feature subfolder exists, `site/new/` (`new-project.css`, `new-project.js`, `skill-catalog.js`, `skill-rules.js`, `upstream-skills.json`, and a `package.json` that only marks its `.js` files as modules, `scripts/build-site.mjs:17`). Static media in `site/assets/` (fonts, grain, favicon, social preview). A `site/skill-reel/` folder would follow the `site/new/` precedent; `.mjs` files need no `package.json`.
- Loading: every page uses `<script type="module" src="...">` tags in `<head>`, one per entry module, no bundler and no inline script (`skills.html:1`; `new.html` uses root-absolute `/site-header.mjs`, the others relative names). Modules run at top level and query the DOM (`skill-showcase.mjs:1-2`, `explainer.mjs:712-713`) or export a `mountX(root)` that a boot module imports statically (`effects.mjs:1-6`, `card-art.mjs:239`) or dynamically (`living-system.mjs:253`). Shared helpers are imported as ES modules (`about-film.mjs:12` from `particle-engine.mjs`) or copied (`explainer.mjs` copies card-art's helpers, spec `:805-807`).
- Build: `scripts/build-site.mjs` copies all of `site/` (skipping dotfiles and `package.json`) into `dist/` and minifies each `.js`, `.mjs` and `.css` file on its own with esbuild, "no bundling, so every module keeps its URL and its imports" (`scripts/build-site.mjs:1-4`, `:17-31`). A subfolder ships with its relative imports intact.
- Upload filter: `.vercelignore` uploads `/site` and excludes `/site/.*`, `/site/server.mjs`, `/site/*.test.mjs`, `/site/generate-grain.mjs`, `/site/README.md`. These patterns are top-level only, so a test file inside `site/skill-reel/` would be uploaded and minified unless a pattern is added.
- Local server: serves any file under `site/` (`site/server.mjs:26-34`, `:47`); clean routes come from the `pages` map (`:19`: `/about`, `/skills`, `/memory`, `/new`, `/arena`, `/long-horizon`). A new standalone page would need an entry there; Vercel's `cleanUrls: true` covers it in production (`vercel.json:6`). `site/sitemap.xml:3-9` lists the same seven URLs by hand.
- Tests in CI are named explicitly (`.github/workflows/readme.yml:28-42`), so a new test file runs only if added there.
- Docs: `docs/skill-reel/recon/` already holds `arena-showpiece.md`, `design-and-avoid.md`, `lh-compact-plan.md`, `merge-codex.md`, `why-wow-perf.md` from parallel researchers.
