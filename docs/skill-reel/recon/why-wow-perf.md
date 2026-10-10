# Recon: why, wow-loop, perf-loop

Facts slice for the skills reel. No design here.

## Sources

- Template: `ryanportfolio/Harness-Firmware` at commit `64e8f247dc7ca70cd6b03ac78f8786df06813c5c`. Paths below drop the `.claude/skills/` prefix: `why/SKILL.md:7` means `.claude/skills/why/SKILL.md` line 7 at that commit.
- Files read: `why/SKILL.md` (105 lines, no references folder), `wow-loop/SKILL.md` (166), `wow-loop/references/evidence-report.md` (62), `perf-loop/SKILL.md` (95), `perf-loop/references/{evidence-report,loading,rendering,services,triage}.md`. The two `evidence-report.md` copies are byte-identical (checked with `diff`; the file says so at `perf-loop/references/evidence-report.md:61-62`).
- Also read: template `CLAUDE.md:43` and `caveman/SKILL.md:30` (where `/why` self-run is wired in).
- Site numbers: `ryanportfolio/HarnessFirmware.com` main at `2d740a9137cff389e568d3f28631a02e1ead9a02`, files `site/field-log.mjs`, `site/about.html`, `.claude/reference/product.md`, `.claude/reference/product-site.md`.

## why

### 1. What it is

- "Pressure-test a recommendation with one fresh reviewer." (`why/SKILL.md:2`)
- It reviews and explains a pick; it does not implement. Source: "No file edits while running it." (`why/SKILL.md:76`)

### 2. When to use it

- When the user types `/why`, or before the agent presents its own weighty recommendation: "hard to undo, two or more real options, or real time or money at stake" (`why/SKILL.md:2`).
- The ordinary word "why" never triggers it (`why/SKILL.md:9`, `why/SKILL.md:105`).
- Self-run is wired through the caveman skill: "For a weighty pick (hard to undo, two or more real options, or real time or money at stake), run the `why` skill on it before presenting it. ... Skip this for simple yes/no calls." (`caveman/SKILL.md:30`). The template kernel restates it: "Weighty recommendations get a `/why` pressure-test before they're presented (caveman skill); the user can also run `/why` on any recommendation." (`CLAUDE.md:43`)

### 3. Why it is useful

- A model reviewing its own previous turn "tends to rubber-stamp" (same blind spots, same biases), so `/why` gets "a single fresh subagent with no memory of this session, to get genuine distance on the weak spots" (`why/SKILL.md:11`).
- Outcome: the weak spots of a pick surface before the user commits; "If a harder look shows the recommendation was wrong or weak, lead with that; self-correcting here is a feature." (`why/SKILL.md:72`)

### 4. Mechanism

What it investigates: a recommendation (a pick), not a past mistake. Examples given: "a library, an approach, a file layout, a fix, a tradeoff call" (`why/SKILL.md:7`).

1. Lock on the pick. Default target is the assistant message directly before `/why` (`why/SKILL.md:15`). An argument can redirect it (`why/SKILL.md:16`). Several picks and no argument: ask one short question (`why/SKILL.md:17`). No recommendation in that turn: say so in one line and stop (`why/SKILL.md:18`).
2. Ground it. Confirm the one or two repo facts the pick leans on with a fast grep or read (`why/SKILL.md:26`, `why/SKILL.md:32`). Check `CLAUDE.md` and the relevant `.claude/reference/` file when the pick touches a project landmine (`why/SKILL.md:27`).
3. Fresh eyes. Dispatch exactly one `general-purpose` subagent with fresh context (`why/SKILL.md:36-38`). It receives only the recommendation text plus at most the one user message that prompted it (`why/SKILL.md:39`). It is asked for "unstated assumptions, edge cases the pick ignores, costs or risks not surfaced, and the conditions under which this is the *wrong* call" (`why/SKILL.md:40`). Model: the user's explicit choice, else the session model (`why/SKILL.md:38`).
4. Synthesis by the main agent: drop off-base findings, integrate the rest, never relay raw output (`why/SKILL.md:43`).
5. Output (user-run): one line restating the pick, a `### Why it matters` header, then the real reasoning, what it could be missing, alternatives if a real one exists, and a one-line bottom line (`why/SKILL.md:56-67`).
6. Output (self-run): the refined recommendation plus one line `Pressure-tested (/why): <what the reviewer changed or confirmed>`; if the check overturns the pick, the new pick leads (`why/SKILL.md:51`). No file edits for the pick until the user answers (`why/SKILL.md:52`).
7. Failure path: if fresh dispatch fails, disclose that the independent check did not complete; any critique continues labeled as self-review (`why/SKILL.md:41`).

What it changes: nothing on disk. It writes no rule, no `pitfalls.md` entry, no code (`why/SKILL.md:76`, `why/SKILL.md:52`). What can change is the recommendation itself (`why/SKILL.md:51`, `why/SKILL.md:72`).

### 5. On-screen strings

- "Pressure-test a recommendation with one fresh reviewer." (`why/SKILL.md:2`)
- "Pressure-tested (/why):" (`why/SKILL.md:51`)
- "### Why it matters" / "Why it matters" (`why/SKILL.md:58`)
- "What it could be missing" (`why/SKILL.md:65`)
- "Bottom line" (`why/SKILL.md:67`)
- "Honest over flattering." (`why/SKILL.md:72`)
- "hard to undo, two or more real options, or real time or money at stake" (`why/SKILL.md:2`)
- Worked-example lines usable as a sample review: "**Pick:** Wouter for the new settings pages, not React Router." (`why/SKILL.md:82`); "**Bottom line:** Right call, high confidence. Flip only if settings needs route-loaders → revisit then, don't pre-build." (`why/SKILL.md:93`). These are an illustration in the skill, not a logged real run.

### 6. False or risky to claim

- False: `/why` saves a pitfall, writes a rule, or edits files. It edits nothing (`why/SKILL.md:76`).
- False: it investigates a mistake after the fact. It reviews a recommendation (`why/SKILL.md:7`, `why/SKILL.md:15`).
- False: a panel or several reviewers. "`/why` gets exactly **one** scoped reviewer." (`why/SKILL.md:102`)
- Risky: "a different model" or "another vendor". The reviewer inherits the session model unless the user names one (`why/SKILL.md:38`). Its independence is fresh context, not a different model.
- Risky: the reviewer sees the conversation. It sees only the recommendation plus at most one user message (`why/SKILL.md:39`).
- Conditional: automatic self-run fires only for weighty picks and comes from the caveman skill rule (`caveman/SKILL.md:30`); not on every answer.
- Conditional: if the subagent cannot be dispatched, the check is disclosed as incomplete (`why/SKILL.md:41`); do not show it as always independent.

## wow-loop

### 1. What it is

- "Evidence-gated review and repair loop for one deliverable or a set of like items." (`wow-loop/SKILL.md:3`)
- "Improve one deliverable, or every item in a set of like items, until independent critics, working from their own captures and measurements, establish that it meets a written quality contract." (`wow-loop/SKILL.md:8`)

### 2. When to use it

- "/wow-loop, requests for wow factor or dial it to 11, a target score to reach ... or substantial visual work (3D, animation, UI, rendered documents) that needs reference fidelity or repeated visual correction." (`wow-loop/SKILL.md:3`)
- Not for routine cosmetic edits (`wow-loop/SKILL.md:3`). A request only to rate something, with no improvement asked, is outside the loop (`wow-loop/SKILL.md:10`).

### 3. Why it is useful

- Acceptance comes from critics who try to break the work, not from the builder: the listed anti-pattern is "Ending because the work looks done, rather than because critics armed with captures failed to break it." (`wow-loop/SKILL.md:156`)
- "State and evidence persist on disk so a later invocation resumes from the weakest module instead of starting over." (`wow-loop/SKILL.md:8`)

### 4. Mechanism

Contract of named checks:

1. Recon: one read-only agent gathers code excerpts with line refs, live measurements and reference material (`wow-loop/SKILL.md:45`).
2. A director writes `spec.md` and `bar.md` (`wow-loop/SKILL.md:47`). `bar.md` is "torn down from one named reference": a model, page, video or document, with captures stored under `captures/reference/` (`wow-loop/SKILL.md:49`).
3. "Mechanisms, not adjectives." Example checks: "headline is 5x body size, three type sizes total", "nothing animates for under 400 ms" (`wow-loop/SKILL.md:49`).
4. Each check gets a stable ID, gating or advisory, method `scripted` or `judged`, and a pass condition with tolerance (`wow-loop/SKILL.md:51`). Scripted checks live in `check.sh` (`wow-loop/SKILL.md:51`). "Five to twelve checks per module is the working range." The contract freezes before implementation; amendments append a version (`wow-loop/SKILL.md:51`).
5. Sets of like items get one shared rubric of three to six checks instantiated per item as `<check>@<item>`; each item gets its own verdicts (`wow-loop/SKILL.md:57`).
6. Optional baseline pass on the untouched deliverable when the user named a target score, asked for before/after, or the work is a set of items (`wow-loop/SKILL.md:67`).

Evidence gate:

- "Self-review never establishes acceptance. Reading code never establishes a visual. Every visual verdict comes from a capture the verdict-giver read." (`wow-loop/SKILL.md:18`)
- Critics are dispatched only once every gating scripted check passes (baseline pass excepted) (`wow-loop/SKILL.md:51`).
- A gating finding without an evidence path is returned to the critic, not accepted (`wow-loop/SKILL.md:123`).
- Visual and animation evidence comes from headed Chrome on the real GPU; "A headless, minimized, or software-rendered run is never evidence for GPU, WebGL, or animation claims." (`wow-loop/SKILL.md:25`)
- Verdicts are binary per check; "No numeric quality scores" (`wow-loop/SKILL.md:21`).

Critics:

- "Two fresh critics per round, distinct lenses, each briefed to disprove the work." (`wow-loop/SKILL.md:112`)
- Experience critic: own captures at every named state, plus at least two views the contract did not list, plus a natural run; compares against stored reference captures (`wow-loop/SKILL.md:120`).
- Engineering critic: reruns `check.sh`, tests, typecheck, build, console checks, performance measurement, full diff read for regressions (`wow-loop/SKILL.md:121`).
- Critics never see the user's target score, earlier verdicts before their own assessment, or the builder's hopes (`wow-loop/SKILL.md:22`, `wow-loop/SKILL.md:112`). Critics write captures and reports, never the deliverable (`wow-loop/SKILL.md:20`).
- Severity anchors: blocker, major, minor (`wow-loop/SKILL.md:116-118`).
- Reports are JSON with `checks`, `findings`, `resolutions`, `gaps` (`wow-loop/SKILL.md:123`).

On fail:

1. Orchestrator reconciles findings; disputes are recorded, not deleted (`wow-loop/SKILL.md:127`). A disputed judged verdict goes to one second fresh experience critic; "the stricter verdict stands unless a measurement refutes it" (`wow-loop/SKILL.md:127`). "Only the user waives a gating finding." (`wow-loop/SKILL.md:127`)
2. Confirmed gating findings go to the implementer, who reproduces each defect, fixes it, and proves the fix with a fresh capture (`wow-loop/SKILL.md:127`).
3. Same check failing twice forces a changed approach, "never a lowered bar" (`wow-loop/SKILL.md:131`). Third failure may justify a bakeoff: two fresh implementers in separate worktrees, one fresh judge picks blind (`wow-loop/SKILL.md:131`).
4. "Never weaken a check to obtain a pass." (`wow-loop/SKILL.md:23`)
5. The user gets one update per round with before and current captures (`wow-loop/SKILL.md:129`).

Whole deliverable and blind judging:

- After every module passes, a fresh experience critic reviews the complete deliverable (full playback, complete journey, every page) (`wow-loop/SKILL.md:135`).
- When reference fidelity is a goal and comparable evidence exists, two fresh judges get matched pairs labeled only A and B, order shuffled; "Preference votes locate unmet requirements; they do not gate on their own" (`wow-loop/SKILL.md:137`).

When it stops:

- `passed`: every gating check passed on the current fingerprint and contract version, both critic lenses and the whole-deliverable pass complete, no open gating finding, evidence paths present (`wow-loop/SKILL.md:141`).
- Other outcomes: `blocked` (missing capability) and `budget_exhausted` (`wow-loop/SKILL.md:83`, `wow-loop/SKILL.md:131`).
- After `passed`, it offers to promote scripted checks into the project's test runner and to commit a scorecard; it does neither without a yes (`wow-loop/SKILL.md:143`).

### 5. On-screen strings

- "Evidence-gated review and repair loop" (`wow-loop/SKILL.md:3`)
- "Self-review never establishes acceptance." (`wow-loop/SKILL.md:18`)
- "Reading code never establishes a visual." (`wow-loop/SKILL.md:18`)
- "Mechanisms, not adjectives." (`wow-loop/SKILL.md:49`)
- "nothing animates for under 400 ms" (`wow-loop/SKILL.md:49`)
- "Two fresh critics per round, distinct lenses, each briefed to disprove the work." (`wow-loop/SKILL.md:112`)
- "Experience critic" / "Engineering critic" (`wow-loop/SKILL.md:120-121`)
- "blocker / major / minor" (`wow-loop/SKILL.md:116-118`)
- "Never weaken a check to obtain a pass." (`wow-loop/SKILL.md:23`)
- "never a lowered bar" (`wow-loop/SKILL.md:131`)
- "A finding not mentioned is not fixed." (`wow-loop/SKILL.md:112`)
- "Stills cannot establish motion." (`wow-loop/SKILL.md:62`)
- Check statuses: `passed`, `failed`, `unavailable`, `stale` (`wow-loop/SKILL.md:79`)
- Example report line: "41 of 49 items meet the bar; 38 failed it at baseline" (`wow-loop/SKILL.md:145`). This is a format example in the skill, not a real result.

### 6. False or risky to claim

- False: a quality score that climbs (for example 6/10 to 9/10). The loop produces no numeric scores (`wow-loop/SKILL.md:21`, `wow-loop/SKILL.md:158`).
- False: the builder grades its own work. Self-review never establishes acceptance (`wow-loop/SKILL.md:18`).
- False: critics see the target or the builder's notes (`wow-loop/SKILL.md:22`, `wow-loop/SKILL.md:112`).
- False: one verdict or an average for a set of items (`wow-loop/SKILL.md:57`, `wow-loop/SKILL.md:159`).
- False: blind judges decide acceptance. Their votes do not gate on their own (`wow-loop/SKILL.md:137`). Acceptance is the checks.
- Conditional: blind A/B judges run only "When reference fidelity is a goal and comparable evidence exists" (`wow-loop/SKILL.md:137`); bakeoff only on a third failure "within remaining budget and exposed capacity" (`wow-loop/SKILL.md:131`); second experience critic only on a dispute (`wow-loop/SKILL.md:127`); baseline pass only in the three cases at `wow-loop/SKILL.md:67`.
- Conditional: "Lock it in" test promotion and scorecard are offers needing a yes (`wow-loop/SKILL.md:143`). Do not show them as automatic.
- Fine print to keep off screen: round budget 12 total and 4 per module (`wow-loop/SKILL.md:82`, `wow-loop/SKILL.md:102`), five to twelve checks per module (`wow-loop/SKILL.md:51`), resume and `/loop` mechanics (`wow-loop/SKILL.md:37-39`). Four rounds on a module is "a reassessment checkpoint ... not a pass and not an automatic stop" (`wow-loop/SKILL.md:131`); do not show it as a hard stop.
- Risky: "runs until perfect". It can end `blocked` or `budget_exhausted` (`wow-loop/SKILL.md:83`).
- Risky: critics are another vendor's model. The skill says to inherit the configured model unless the user names one (`wow-loop/SKILL.md:27`). Independence is fresh context.

## perf-loop

### 1. What it is

- "Run measured optimization rounds with independent review for FPS, loading, latency, throughput, and resource use; with no named target, triage every dimension first." (`perf-loop/SKILL.md:3`)

### 2. When to use it

- "/perf-loop or broad performance requests; skip isolated fixes." (`perf-loop/SKILL.md:3`)
- An audit request stops at findings and recommendations (`perf-loop/SKILL.md:12`).

### 3. Why it is useful

- "Goal: faster user-facing perf via reproducible experiments + independent review. Preserve behavior + quality." (`perf-loop/SKILL.md:8`)
- Gains are kept only when repeatable and meaningful; "Never keep speculative changes just because they look efficient." (`perf-loop/SKILL.md:67`)

### 4. Mechanism

What is measured, by dimension (`perf-loop/references/triage.md:11-17`):

- Loading and readiness: time to visible content and successful first action, cold and warm.
- Delivery size: compressed transfer and decoded bytes per route or artifact.
- Rendering: frame-time distribution and hitch count in the heaviest scene, animation or scroll.
- Input responsiveness: input to visible response.
- Memory: peak, retained after idle, growth over repeated cycles.
- Service latency and throughput: latency percentiles, completed ops/s, errors at stated load.
- CPU, disk and startup.

Detail per dimension: frame times in ms with percentiles, "Avg FPS alone hides stutter" (`perf-loop/references/rendering.md:7`); frame budget `1000 / target FPS` (`perf-loop/references/rendering.md:8`); cold and warm runs as separate scenarios (`perf-loop/references/loading.md:11`); memory peak vs retained vs growth (`perf-loop/references/services.md:15`).

Triage when no target is named:

1. Trigger: the request names no metric or scenario ("make it faster", "optimize everything") (`perf-loop/SKILL.md:28`).
2. Measure each applicable dimension against a reference, profile just far enough to name its top contributor, present a ranked table. No code changes (`perf-loop/SKILL.md:28`, `perf-loop/references/triage.md:3`, `perf-loop/references/triage.md:25`).
3. Reference order: existing project budget, then a published reference labeled inferred, then judged user impact labeled judgment (`perf-loop/references/triage.md:29-33`).
4. Every row stays; non-applicable rows say "not applicable" with a reason, unmeasurable rows "not measured" (`perf-loop/references/triage.md:19`).
5. The agent names its pick in one or two sentences, then stops; "Never start a round on own choice." (`perf-loop/references/triage.md:42`, `perf-loop/SKILL.md:30`)
6. Triage numbers are diagnostic only; the chosen target gets its own full baseline (`perf-loop/SKILL.md:32`, `perf-loop/references/triage.md:44`).

Baseline vs round:

1. Baseline from the current working state, on a representative optimized build, with recorded build mode, commands, device, dataset, scenario (`perf-loop/SKILL.md:36`).
2. Repeat baseline enough to expose variation; at least 3 runs for quick deterministic scenarios; keep raw measurements; never silently drop inconvenient results (`perf-loop/SKILL.md:40`).
3. Before editing: primary outcome metric, success threshold, protected scenarios, regression tolerances (`perf-loop/SKILL.md:46`).
4. Profile the slow scenario; rank bottlenecks by measured contribution (`perf-loop/SKILL.md:48`).
5. Each round: one implementer, one testable hypothesis (`perf-loop/SKILL.md:52`). Record scenario, hypothesis, change, measurements, regression checks, verdict (`perf-loop/SKILL.md:54-61`).
6. Same workload after each change; alternate baseline and candidate runs to detect drift; report absolute and relative change (`perf-loop/SKILL.md:63`).

Accept or revert:

- Keep: "repeatable, practically meaningful gains w/ no disallowed regressions." (`perf-loop/SKILL.md:67`)
- "Failed experiment → revert only this round's edits." (`perf-loop/SKILL.md:67`)
- "Gain within run variation → inconclusive." (`perf-loop/SKILL.md:67`)
- Meaningful win: re-profile, since the bottleneck may move (`perf-loop/SKILL.md:67`).
- Cutting resolution, effects or content needs explicit agreement when it changes the intended experience (`perf-loop/SKILL.md:65`, `perf-loop/references/rendering.md:24`).

Independent review:

- "Before accepting a round → fresh independent review via exposed agents." (`perf-loop/SKILL.md:73`) Reviewers get the diff, reproduction commands and raw evidence paths; implementer conclusions are labeled unverified (`perf-loop/SKILL.md:73`).
- Measurement reviewer: challenges comparability, sample sufficiency, noise, interpretation; reproduces the decisive comparison when feasible (`perf-loop/SKILL.md:75`).
- Regression reviewer: reads the full diff, exercises affected behavior, challenges quality losses and accessibility damage; reads actual captures for visual changes (`perf-loop/SKILL.md:76`).
- One separate fresh agent per lens (`perf-loop/SKILL.md:78`). Findings come back confirmed, refuted or unresolved; "No findings ≠ proof of gain." (`perf-loop/SKILL.md:80`)
- Unavailable review is reported as a gap; "self-review ≠ independent" (`perf-loop/SKILL.md:78`).

Stop and report:

- Stops when the target is reached, after two consecutive rounds without a retained gain, or when progress needs a missing capability or a user-owned tradeoff (`perf-loop/SKILL.md:84`).
- One of four outcomes: Target met; Improved, target unmet; Inconclusive; No retained improvement (`perf-loop/SKILL.md:90-93`).
- Report includes a before/after table, kept and discarded changes, evidence paths; "Claim only devices, workloads, envs actually tested." (`perf-loop/SKILL.md:95`)

### 5. On-screen strings

- "Run measured optimization rounds with independent review" (`perf-loop/SKILL.md:3`)
- "with no named target, triage every dimension first" (`perf-loop/SKILL.md:3`)
- "1 implementer/round, 1 testable hypothesis" (`perf-loop/SKILL.md:52`)
- "Failed experiment → revert only this round's edits." (`perf-loop/SKILL.md:67`)
- "Gain within run variation → inconclusive." (`perf-loop/SKILL.md:67`)
- "Meaningful win → re-profile; bottleneck may move." (`perf-loop/SKILL.md:67`)
- "Measurement reviewer" / "Regression reviewer" (`perf-loop/SKILL.md:75-76`)
- "No findings ≠ proof of gain." (`perf-loop/SKILL.md:80`)
- "Avg FPS alone hides stutter." (`perf-loop/references/rendering.md:7`)
- "`1000 / target FPS`" (`perf-loop/references/rendering.md:8`)
- "Number alone ≠ problem." (`perf-loop/references/triage.md:29`)
- Verdict words: "Keep, discard, or inconclusive" (`perf-loop/SKILL.md:61`)
- Outcome labels: "Target met", "Improved, target unmet", "Inconclusive", "No retained improvement" (`perf-loop/SKILL.md:90-93`)
- Triage table columns: "Rank | Dimension | Scenario | Measured (unit, runs, spread) | Reference (source) | Gap | Top contributor | Confidence | Fix cost | Evidence" (`perf-loop/references/triage.md:37`)

The `→` and `≠` characters are in the source text; rewrite in plain words if the reel prefers.

### 6. False or risky to claim

- False: triage changes code. "No code changes during triage." (`perf-loop/SKILL.md:28`)
- False: the agent picks the focus itself after triage. "Never pick for them." (`perf-loop/SKILL.md:30`)
- False: every round's change is kept. Failed rounds are reverted; within-noise gains are inconclusive (`perf-loop/SKILL.md:67`).
- False: faster by dropping quality without asking (`perf-loop/SKILL.md:65`).
- False: a combined speedup equals the sum of round wins. "Independent wins ≠ guaranteed combined speedup." (`perf-loop/SKILL.md:86`)
- False: results on all devices. "Claim only devices, workloads, envs actually tested." (`perf-loop/SKILL.md:95`); "No universal score targets or unsupported all-device promises." (`perf-loop/SKILL.md:46`)
- Risky: "measured by another vendor". Reviewers inherit the configured model unless the user names one (`perf-loop/SKILL.md:73`).
- Conditional: triage runs only when no target is named (`perf-loop/SKILL.md:28`, `perf-loop/SKILL.md:32`). An unattended run ends at the table (`perf-loop/SKILL.md:30`).
- Conditional: independent review depends on agents being exposed; missing review is reported as a gap (`perf-loop/SKILL.md:78`).
- Fine print to keep off screen: default at most 5 rounds, stop after 2 rounds without gain (`perf-loop/SKILL.md:84`), at least 3 baseline runs (`perf-loop/SKILL.md:40`).

## Published perf-loop and wow-loop results on the site

All from `ryanportfolio/HarnessFirmware.com` main at `2d740a9137cff389e568d3f28631a02e1ead9a02`.

Perf-loop, three before/after pairs:

| Label on site | Before → after | Source |
| --- | --- | --- |
| `MASTHEAD · MS PER FRAME` | `6.01 → 0.06` | `site/field-log.mjs:287`, `site/field-log.mjs:289` |
| `HOME PAGE · MB PER FULL SCROLL` | `4.10 → 2.43` | `site/field-log.mjs:287`, `site/field-log.mjs:289` |
| `ABOUT PAGE · FPS ON INTEGRATED GPU` | `50.8 → 64.9` | `site/field-log.mjs:287`, `site/field-log.mjs:289` |

- Caption above the bars: "/perf-loop · ONE CHANGE PER ROUND, MEASURED" (`site/field-log.mjs:286`).
- Bar widths before/after: `BARS = [[360, 1, .01], [500, 1, .593], [640, .783, 1]]` (`site/field-log.mjs:162`). Ratios match the numbers: 0.06/6.01 ≈ 0.01, 2.43/4.10 ≈ 0.593, 50.8/64.9 ≈ 0.783.
- Written log wording: "`/perf-loop` made one measured change per round: the masthead went from 6.01 to 0.06 ms per frame, the home page from 4.10 to 2.43 MB per full scroll, and the About page from 50.8 to 64.9 fps on an integrated GPU." (`site/about.html:34`)
- Same numbers in project memory: `.claude/reference/product.md:65`, `.claude/reference/product-site.md:20`.
- Lanes that ran `/perf-loop`: the masthead lane ("/perf-loop · /refine") and the perf pass lane ("/perf-loop · /codex-fullreview") (`site/field-log.mjs:259`, `site/about.html:30`).

Wow-loop result:

- "In `/wow-loop` a blind judge compared new against old, and the new version won 23 of 24 rounds." (`site/about.html:34`)
- Caption "/wow-loop · BLIND JUDGE, NEW VS OLD" (`site/field-log.mjs:285`) and "23 OF 24" (`site/field-log.mjs:291`). The grid has 24 cells with one tie at index 17 (`site/field-log.mjs:156-160`).

/why on the site: only as a lane tag, "/why · /long-horizon-swarm" for the study engine (`site/field-log.mjs:259`, `site/about.html:30`). No published `/why` result.

Session dates: the lanes span 2026-09-24 12:00 UTC plus 3.55 to 108.7 hours (`site/field-log.mjs:88-89`), date labels SEP 25 to SEP 29 (`site/field-log.mjs:261`).

## Unverified

- What "MB PER FULL SCROLL" measured (memory growth, transferred bytes, or something else). The site gives only the label (`site/field-log.mjs:287`, `site/about.html:34`); no source found that defines it.
- Which lane produced which of the three perf numbers, beyond the label naming the page (masthead, home page, About page).
- Hardware, run counts, spread and build mode behind the three perf numbers. Not on the site.
- Whether the September sessions (SEP 25 to SEP 29) ran the skill text at commit `64e8f24`. Commit date not checked; the skills may have changed since those sessions. A reel scene that shows a real result next to the current mechanism should not imply that exact version produced it.
- The "23 of 24" blind judging compared new vs old. In the current skill, blind A/B judges compare "ours vs reference" (`wow-loop/SKILL.md:137`) and a bakeoff judge picks between two candidates (`wow-loop/SKILL.md:131`). Whether the 23-of-24 run used either of these paths, or an older version of the skill, is not established by the site sources.
