# Skills reel facts

Compiled from the six recon files in `docs/skill-reel/recon/` only. No new research. Anything the recon left open is marked **unverified**.

## 1. Sources

| Repo | Commit | Read through |
|---|---|---|
| Template `ryanportfolio/Harness-Firmware` | `64e8f247dc7ca70cd6b03ac78f8786df06813c5c` | `gh api` (recon) |
| Site `ryanportfolio/HarnessFirmware.com` | `2d740a9` (`2d740a9137cff389e568d3f28631a02e1ead9a02`) | worktree `skills-reel` |

Citation format:

- Template skill files are cited relative to `.claude/skills/`: `merge/SKILL.md:3` means template `.claude/skills/merge/SKILL.md` line 3. Other template files carry their full path (`.agents/skills/impartial-review/SKILL.md`, `CHANGELOG.md`).
- Site files are cited from the site repo root (`site/...`, `docs/specs/...`, `.claude/reference/...`).
- `spec` = site `docs/specs/2026-09-27-explainer-animation-design.md`.
- "Owner brief" = the reel brief given for this task; it has no file.
- On-screen strings below drop the source's terminal period (rule 3.4). Everything else is verbatim.

## 2. Per skill

Row kinds: **Name**, **What**, **When**, **Why**, **Show** (mechanism nouns true on every run), **Do not** (conditional, opt-in, false, or settings fine print).

### 2.1 merge (review layers: codex-fullreview, then codex-review)

| Kind | String or fact | Source |
|---|---|---|
| Name | `/merge` | `merge/SKILL.md:3`, `:13` |
| What | Merge PRs through a Codex review loop | `merge/SKILL.md:3` |
| What | Merge via Codex review loop (heading) | `merge/SKILL.md:7` |
| When | Runs only when you type /merge; the model cannot start it | `merge/SKILL.md:3`, `:4` (`disable-model-invocation: true`) |
| When | Never self-start, even if PR looks ready | `merge/SKILL.md:13` |
| Why | From then on, every PR in the session goes through the same loop and merges | `merge/SKILL.md:3`, `:18` |
| Why | Merge mode is on for this session: every PR goes through the Codex loop and merges when clean | `merge/SKILL.md:15` |
| Show | Commit, push, open or reuse the PR | `merge/SKILL.md:9`, `:42` |
| Show | First review: `/codex-fullreview` on the full PR diff | `merge/SKILL.md:51` |
| Show | Claude fixes confirmed findings, one commit per round, pushed | `merge/SKILL.md:29`, `:63` |
| Show | Review again: `/codex-review` on the full PR diff at the new head | `merge/SKILL.md:53` |
| Show | Codex only reviews; it runs read-only | `codex-fullreview/SKILL.md:36`, `:43` |
| Show | CI is checked; never admin-bypass checks (see 3.7, owner decision) | `merge/SKILL.md:73` |
| Show | Merges only at the head the loop and CI passed | `merge/SKILL.md:77-78` |
| Show | Report line `merged <PR URL> at <head SHA>` or `blocked` | `merge/SKILL.md:85` |
| Do not | "Nothing merges without your approval" or "a person approves every merge": one `/merge`, then no further prompt | `merge/SKILL.md:13`, `:18`; `spec:26-30` |
| Do not | Rerun cap "3 max" (fine print) | `merge/SKILL.md:3`, `:67` |
| Do not | Unlimited reruns or "until clean, no matter what": capped, then `blocked` | `merge/SKILL.md:67` |
| Do not | Codex fixing code | `codex-fullreview/SKILL.md:36`, `:43`; `merge/SKILL.md:63` |
| Do not | Several fresh reviewers every round: only round 1 is multi-reviewer | `merge/SKILL.md:51`, `:53` |
| Do not | Every finding fixed: only confirmed red/yellow; green opportunistic; user may waive | `merge/SKILL.md:57-61` |
| Do not | Fully unattended, never asks: stops on review failure, fix needing a decision, conflict needing a decision, missing CI, Codex unreachable | `merge/SKILL.md:37`, `:43`, `:51`, `:61`, `:73` |
| Do not | Runs across sessions: ends at session end, "stop merging", or `/main` | `merge/SKILL.md:21` |
| Do not | Merges any open PR: untouched PRs left alone unless named | `merge/SKILL.md:17` |
| Do not | "Squash" as the only method: default unless user or repo says otherwise | `merge/SKILL.md:78` |
| Do not | Free reviews: each is billed to the user's Codex subscription | `merge/SKILL.md:28` |
| Do not | "CI passes" unless a GitHub run shows it | `.claude/reference/product.md:240` |
| Do not | Old name `merge-ready` (site copy is stale) | `site/skills.html:16`; template commit `8d29558` |

#### Layer: codex-review (every rerun)

| Kind | String or fact | Source |
|---|---|---|
| Name | `/codex-review` | `codex-review/SKILL.md:2` |
| What | Cross-vendor second-opinion review | `codex-review/SKILL.md:2` |
| Show | One fresh Codex reviewer, single context, no sub-reviewers | `codex-review/SKILL.md:7`, `:91` |
| Show | Claude verifies every finding: Confirmed, Refuted, Kept with caveat | `codex-review/SKILL.md:150-156` |
| Show | Codex hallucinates too | `codex-review/SKILL.md:150` |
| Show | BLOCKING, SHOULD-FIX, NITPICK (red, yellow, green) | `codex-review/SKILL.md:160` |
| Show | N of M findings survived verification (template; any filled number is illustrative) | `codex-review/SKILL.md:160` |
| Do not | "Cross-vendor" outside a Claude-run review; from Codex it is fresh context only | `codex-review/SKILL.md:7`; `.claude/reference/product.md:226`, `:239` |
| Do not | Model id `gpt-6.1-sol` on screen: a pin, may be replaced by a newer Sol at launch | `codex-review/SKILL.md:15`; `.claude/reference/product.md:241` |
| Do not | "OpenAI" or any company as endorser (see 3.8) | `codex-review/SKILL.md:2`; `spec:157-161`, `:167-168` |

#### Layer: codex-fullreview (round 1)

| Kind | String or fact | Source |
|---|---|---|
| Name | `/codex-fullreview` | `codex-fullreview/SKILL.md:3` |
| What | Full multi-agent Codex review | `codex-fullreview/SKILL.md:3` |
| Show | A Manager spawns fresh-context sub-reviewers | `codex-fullreview/SKILL.md:3`, `:8` |
| Show | No file edits, no Git writes, no publication | `codex-fullreview/SKILL.md:43` |
| Show | Each sub-reviewer is a leaf: no agents of its own, no fixes | `.agents/skills/impartial-review/SKILL.md:59` |
| Show | Findings pass three filters: sub-reviewers, then the Codex Manager, then Claude | `.agents/skills/impartial-review/SKILL.md:110-114`; `codex-fullreview/SKILL.md:128` |
| Show | A full review needs sub-reviewers that actually spawned | `merge/SKILL.md:51`; `.claude/reference/product.md:239` |
| Do not | A fixed reviewer count (5 areas + open lens + intent, up to 7): depends on diff size and brief | `.agents/skills/impartial-review/SKILL.md:63-75`; `codex-fullreview/SKILL.md:52` |
| Do not | Intent reviewer, open-lens reviewer, the five area names: all conditional | `codex-fullreview/SKILL.md:52`; `.agents/skills/impartial-review/SKILL.md:63-75` |
| Do not | All reviewers in parallel: bounded batches by capacity (**unverified** per machine) | `.agents/skills/impartial-review/SKILL.md:63-64`, `:75-77` |
| Do not | Flags `fork_turns "none"`, `spawn_agent`, `-s read-only` (fine print) | `codex-fullreview/SKILL.md:36`, `:43` |
| Do not | Model id on screen | `codex-fullreview/SKILL.md:18`; `.claude/reference/product.md:241` |

### 2.2 long-horizon

| Kind | String or fact | Source |
|---|---|---|
| Name | `/long-horizon` | `long-horizon/SKILL.md:2` |
| What | Run big tasks in audited rounds | `long-horizon/SKILL.md:5` |
| When | Work too big for one context window, progress lost to compaction, work spanning hours or sessions | `long-horizon/SKILL.md:2` |
| Why | Only audit-passed work enters Verified progress | `long-horizon/SKILL.md:50`, `:106` |
| Why | Survives compaction and restarts by reading the state file back | `long-horizon/SKILL.md:50`, `:115` |
| Show | Manager, Executor, Auditor | `long-horizon/SKILL.md:7` |
| Show | Executors and auditors are fresh subagents; the Manager delegates every round | `long-horizon/SKILL.md:7` |
| Show | State file `.tmp/long-horizon/<task-slug>/state.md` | `long-horizon/SKILL.md:11` |
| Show | Sections: Verified progress, Remaining, Dead ends, Audit log | `long-horizon/SKILL.md:13-48` (`:22`, `:40`, `:46`) |
| Show | Round steps: Plan, Execute, Audit, Integrate | `long-horizon/SKILL.md:91`, `:98`, `:99`, `:107` |
| Show | Each round works one step | `long-horizon/SKILL.md:91` |
| Show | Baseline taken before the executor starts | `long-horizon/SKILL.md:91`, `:97` |
| Show | Auditor brief written before the executor exists, sent unchanged | `long-horizon/SKILL.md:61` |
| Show | Auditor never sees the executor's turns or report | `long-horizon/SKILL.md:59` |
| Show | Verdicts `complete`, `clean`, `aligned` | `long-horizon/SKILL.md:106` |
| Show | Executor report = claim; auditor inspection = evidence | `long-horizon/SKILL.md:106` |
| Show | Dead ends = memory | `long-horizon/SKILL.md:55` |
| Show | Audit independence = the point | `long-horizon/SKILL.md:155` |
| Show | One final fresh auditor runs every acceptance check | `long-horizon/SKILL.md:147` |
| Do not | A `references/` folder (none exists) | recon `lh-compact-plan.md:19` |
| Do not | Executor or Manager marking work done | `long-horizon/SKILL.md:106` |
| Do not | Parallel rounds and per-round worktrees (only when rules allow) | `long-horizon/SKILL.md:69-78` |
| Do not | Draft review by another model family (only for hours-long rounds) | `long-horizon/SKILL.md:93` |
| Do not | Codex supervisor consult (stagnation trigger plus login) | `long-horizon/SKILL.md:135-143` |
| Do not | Cross-vendor review of a verification tool; codex reviews per round (phase end only) | `long-horizon/SKILL.md:111`, `:113` |
| Do not | `git update-ref` pin (Git workspaces only) | `long-horizon/SKILL.md:97` |
| Do not | Auditors as a different model by default | `long-horizon/SKILL.md:135` |
| Do not | Never needs the user; publishes, installs, deploys | `long-horizon/SKILL.md:51`, `:53`, `:159` |
| Do not | A round count; stagnation and drift thresholds (fine print) | `long-horizon/SKILL.md:109`, `:130-131`, `:158` |

### 2.3 smart-compact

A Claude Code mod (plugin with a hooks module), not a skill. If the reel groups it with skills, do not label it a skill.

| Kind | String or fact | Source |
|---|---|---|
| Name | `/smart-compact` | `smart-compact/hooks/register.ts:45` |
| What | Write custom /compact instructions from this session, then compact with them | `smart-compact/hooks/register.ts:46` |
| When | You type `/smart-compact`; nothing else triggers it | `smart-compact/hooks/register.ts:43-51` |
| Why | One command does the review and the compaction | `CHANGELOG.md:49-50`; PR #208 body |
| Why | The summarizer gets a priority list of what to keep | `smart-compact/hooks/register.ts:5-15` |
| Show | A fork of the session reads the whole transcript and writes the instructions | `smart-compact/hooks/register.ts:3-4`, `:53` |
| Show | Status `smart-compact: writing instructions`, then `smart-compact: compacting` | `smart-compact/hooks/register.ts:52`, `:60` |
| Show | compacting with these instructions: | `smart-compact/hooks/register.ts:65` |
| Show | Labels `Goal:` `State:` `Decisions:` `Verified:` `Next:` `Don't retry:` `Verbatim:` | `smart-compact/hooks/register.ts:23-30` |
| Show | Drop tool output, resolved tangents, and superseded plans | `smart-compact/hooks/register.ts:31` |
| Show | It runs `/compact` itself with the instructions | `smart-compact/hooks/register.ts:61-63` |
| Do not | "Skill" label or a `SKILL.md` | `CHANGELOG.md:51`; PR #208 body |
| Do not | Firing at auto-compact or a context threshold | `smart-compact/hooks/register.ts:43-51` |
| Do not | A review-then-decide step | `CHANGELOG.md:66-68` |
| Do not | Codex availability | `CHANGELOG.md:49`, `:68` |
| Do not | `Always use caveman` first line (only when a named reply style exists) | `smart-compact/hooks/register.ts:19` |
| Do not | Word limit, 500 ms timer, retry count (fine print) | `smart-compact/hooks/register.ts:17`, `:61-63`, `:76-80` |
| Do not | Lossless compaction | `smart-compact/hooks/register.ts:17` |
| Do not | Works out of the box in every new repo (**unverified**: project copy auto-load not shown in PR #208) | PR #208 Verification |
| Do not | Old name `compact-review` (site copy is stale) | `site/skills.html:24`; template commit `add20ea` |

### 2.4 deep-plan

| Kind | String or fact | Source |
|---|---|---|
| Name | `/deep-plan` | `deep-plan/SKILL.md:3` |
| What | Interview a loose idea into decisions the user made | `deep-plan/SKILL.md:6` |
| When | A loose idea on any subject, before anything is built; with or without a repo | `deep-plan/SKILL.md:3`, `:10-11` |
| Why | Decisions belong to the user; facts are your job | `deep-plan/SKILL.md:10` |
| Why | Nothing gets built before an explicit Go | `deep-plan/SKILL.md:12`, `:89` |
| Show | Short rounds of questions; only a user reply ends a round | `deep-plan/SKILL.md:46-49`, `:82` |
| Show | Options `a) ...`, recommendation first, label ends `(Recommended)` | `deep-plan/SKILL.md:58` |
| Show | Answers recorded in the user's words | `deep-plan/SKILL.md:32`, `:76` |
| Show | Echo line `Q4 -> override: Postgres` (example) | `deep-plan/SKILL.md:74` |
| Show | Dropped because Q3 changed: Q9 (cache), Q12 (storage) (example) | `deep-plan/SKILL.md:80` |
| Show | Recap: decisions, assumptions, unknowns, parked | `deep-plan/SKILL.md:87` |
| Show | If this decision were reversed, what would go wrong? (at the gate) | `deep-plan/SKILL.md:88` |
| Show | Gate `a) Go (Recommended)` / `b) Not yet: reopen something` | `deep-plan/SKILL.md:89` |
| Show | On Go: a handoff block (Goal, Non-goals, Decisions, Assumptions, Unknowns, Parked) | `deep-plan/SKILL.md:93` |
| Do not | The assistant answering a decision, or the recommendation recorded as the answer | `deep-plan/SKILL.md:10`, `:76`, `:98` |
| Do not | Silence or a round answer counting as Go | `deep-plan/SKILL.md:89`, `:98` |
| Do not | deep-plan building, drafting code, or starting long-horizon | `deep-plan/SKILL.md:12`, `:93` |
| Do not | Questions-per-round cap (4) or a fixed round count (fine print; stops when frontier is empty) | `deep-plan/SKILL.md:49`, `:86` |
| Do not | Popup UI as always (chat format stands in) | `deep-plan/SKILL.md:60` |
| Do not | Ledger file as always (needs a working directory and write permission) | `deep-plan/SKILL.md:24`, `:42` |
| Do not | Specific handoff targets (only skills available in the session) | `deep-plan/SKILL.md:89` |
| Do not | Glossary, ADR, quick vs full mode | `deep-plan/SKILL.md:97` |
| Do not | Any Codex-mode claim (**unverified**: `CHANGELOG.md:48` "Adapted" vs `.agents/skill-modes.json:18` `native`) | as cited |
| Do not | `/lab` as a parking route (**unverified** existence) | `deep-plan/SKILL.md:79` |

### 2.5 why

| Kind | String or fact | Source |
|---|---|---|
| Name | `/why` | `why/SKILL.md:2` |
| What | Pressure-test a recommendation with one fresh reviewer | `why/SKILL.md:2` |
| When | You type `/why`; the ordinary word "why" never triggers it | `why/SKILL.md:9`, `:105` |
| Why | A model reviewing its own turn tends to rubber-stamp | `why/SKILL.md:11` |
| Why | Honest over flattering | `why/SKILL.md:72` |
| Show | One pick under review (a library, an approach, a file layout, a fix, a tradeoff call) | `why/SKILL.md:7`, `:15` |
| Show | Exactly one fresh subagent with no memory of the session | `why/SKILL.md:11`, `:36-38`, `:102` |
| Show | It sees only the recommendation plus at most one user message | `why/SKILL.md:39` |
| Show | It hunts unstated assumptions, ignored edge cases, hidden costs, when it is the wrong call | `why/SKILL.md:40` |
| Show | Main agent drops off-base findings, never relays raw output | `why/SKILL.md:43` |
| Show | Output headings: Why it matters, What it could be missing, Bottom line | `why/SKILL.md:58`, `:65`, `:67` |
| Show | The pick can change; self-correcting is a feature | `why/SKILL.md:72` |
| Do not | Edits files, saves a pitfall, writes a rule | `why/SKILL.md:52`, `:76` |
| Do not | Investigating a past mistake | `why/SKILL.md:7`, `:15` |
| Do not | A panel of reviewers | `why/SKILL.md:102` |
| Do not | A different model or vendor (inherits session model) | `why/SKILL.md:38` |
| Do not | Reviewer reading the conversation | `why/SKILL.md:39` |
| Do not | Self-run on every answer; `Pressure-tested (/why):` line (self-run only, weighty picks) | `caveman/SKILL.md:30`; `why/SKILL.md:51` |
| Do not | Always independent (failed dispatch is disclosed as self-review) | `why/SKILL.md:41` |
| Do not | The Wouter example as a real run | `why/SKILL.md:82`, `:93` |

### 2.6 wow-loop

| Kind | String or fact | Source |
|---|---|---|
| Name | `/wow-loop` | `wow-loop/SKILL.md:3` |
| What | Evidence-gated review and repair loop | `wow-loop/SKILL.md:3` |
| When | Wow factor, "dial it to 11", substantial visual work; not routine cosmetic edits | `wow-loop/SKILL.md:3` |
| Why | Self-review never establishes acceptance | `wow-loop/SKILL.md:18` |
| Why | State and evidence saved on disk; a later run resumes from the weakest module | `wow-loop/SKILL.md:8` |
| Show | A written quality contract of named checks | `wow-loop/SKILL.md:8`, `:51` |
| Show | Mechanisms, not adjectives | `wow-loop/SKILL.md:49` |
| Show | The bar is torn down from one named reference | `wow-loop/SKILL.md:49` |
| Show | Every check passes or fails; no numeric scores | `wow-loop/SKILL.md:21` |
| Show | Two fresh critics per round, distinct lenses, each briefed to disprove the work | `wow-loop/SKILL.md:112` |
| Show | Experience critic, Engineering critic | `wow-loop/SKILL.md:120-121` |
| Show | Critics work from their own captures and never edit the deliverable | `wow-loop/SKILL.md:8`, `:18`, `:20` |
| Show | Critics never see the target or the builder's hopes | `wow-loop/SKILL.md:22`, `:112` |
| Show | Reading code never establishes a visual | `wow-loop/SKILL.md:18` |
| Show | Stills cannot establish motion | `wow-loop/SKILL.md:62` |
| Show | Severity: blocker, major, minor | `wow-loop/SKILL.md:116-118` |
| Show | Implementer reproduces, fixes, proves with a fresh capture | `wow-loop/SKILL.md:127` |
| Show | Never weaken a check to obtain a pass; never a lowered bar | `wow-loop/SKILL.md:23`, `:131` |
| Show | A finding not mentioned is not fixed | `wow-loop/SKILL.md:112` |
| Show | Whole-deliverable pass by a fresh critic at the end | `wow-loop/SKILL.md:135` |
| Do not | A score climbing (6/10 to 9/10) | `wow-loop/SKILL.md:21`, `:158` |
| Do not | One verdict or average for a set of items | `wow-loop/SKILL.md:57`, `:159` |
| Do not | Blind A/B judges (only for reference fidelity) or judges deciding acceptance | `wow-loop/SKILL.md:137` |
| Do not | Bakeoff, second experience critic, baseline pass (all conditional) | `wow-loop/SKILL.md:67`, `:127`, `:131` |
| Do not | Test promotion or scorecard as automatic (offers needing a yes) | `wow-loop/SKILL.md:143` |
| Do not | Round budgets, checks-per-module range (fine print) | `wow-loop/SKILL.md:51`, `:82`, `:102` |
| Do not | "Runs until perfect" (can end `blocked` or `budget_exhausted`) | `wow-loop/SKILL.md:83` |
| Do not | Critics as another vendor (inherit configured model) | `wow-loop/SKILL.md:27` |
| Do not | "23 of 24" site result: measured number (N3); link to current skill **unverified** | `site/about.html:34`; `site/field-log.mjs:291` |

### 2.7 perf-loop

| Kind | String or fact | Source |
|---|---|---|
| Name | `/perf-loop` | `perf-loop/SKILL.md:3` |
| What | Run measured optimization rounds with independent review | `perf-loop/SKILL.md:3` |
| When | Broad performance requests; skip isolated fixes | `perf-loop/SKILL.md:3` |
| Why | Faster via reproducible experiments and independent review; behavior and quality preserved | `perf-loop/SKILL.md:8` |
| Why | Never keep speculative changes just because they look efficient | `perf-loop/SKILL.md:67` |
| Show | A baseline before any change | `perf-loop/SKILL.md:36` |
| Show | One implementer, one testable hypothesis per round | `perf-loop/SKILL.md:52` |
| Show | Same workload measured after each change | `perf-loop/SKILL.md:63` |
| Show | Verdicts: keep, discard, inconclusive | `perf-loop/SKILL.md:61` |
| Show | Failed experiment → revert only this round's edits | `perf-loop/SKILL.md:67` |
| Show | Gain within run variation → inconclusive | `perf-loop/SKILL.md:67` |
| Show | Meaningful win → re-profile; bottleneck may move | `perf-loop/SKILL.md:67` |
| Show | Measurement reviewer, Regression reviewer: one fresh agent per lens (see 3.9) | `perf-loop/SKILL.md:75-78` |
| Show | No findings ≠ proof of gain | `perf-loop/SKILL.md:80` |
| Show | Avg FPS alone hides stutter | `perf-loop/references/rendering.md:7` |
| Show | Outcomes: Target met; Improved, target unmet; Inconclusive; No retained improvement | `perf-loop/SKILL.md:90-93` |
| Do not | Triage table (only when no target is named) | `perf-loop/SKILL.md:28`, `:32` |
| Do not | Agent choosing the focus after triage | `perf-loop/SKILL.md:30` |
| Do not | Every change kept | `perf-loop/SKILL.md:67` |
| Do not | Quality cut without agreement | `perf-loop/SKILL.md:65` |
| Do not | Round wins summed into one speedup | `perf-loop/SKILL.md:86` |
| Do not | Results on all devices | `perf-loop/SKILL.md:46`, `:95` |
| Do not | Reviewers as another vendor | `perf-loop/SKILL.md:73` |
| Do not | Round cap, no-gain stop, baseline run count (fine print) | `perf-loop/SKILL.md:40`, `:84` |
| Do not | Site numbers 6.01 → 0.06 ms, 4.10 → 2.43 MB, 50.8 → 64.9 fps: measured (N3); "MB per full scroll" undefined (**unverified**) | `site/field-log.mjs:287-289`; `site/about.html:34` |

### 2.8 arena

| Kind | String or fact | Source |
|---|---|---|
| Name | `/arena` | `arena/SKILL.md:8` |
| What | Builds parallel attempts at one task, judges them blind, and grafts the best ideas onto the strongest | `arena/SKILL.md:3` |
| When | The right shape of a solution is unclear; "try a few approaches", "build me options" | `arena/SKILL.md:8` |
| Why | Several real versions show the right shape | `arena/SKILL.md:8` |
| Why | One final artifact that passes the real checks it claims, reading as one piece | `arena/SKILL.md:47`, `:57` |
| Show | One shared brief, `brief.md` | `arena/SKILL.md:23` |
| Show | Pass/fail criteria an outsider could check, `criteria.md`, never given to candidates | `arena/SKILL.md:24` |
| Show | Candidates each take a different angle (minimal change, failure-proof, end-user-first) | `arena/SKILL.md:33` |
| Show | Three by default | `arena/SKILL.md:33` |
| Show | Every candidate and the judge run with fresh context; the parent never builds a candidate | `arena/SKILL.md:13` |
| Show | No two workers share a writable path | `arena/SKILL.md:29` |
| Show | Each candidate writes `rationale.md`; the judge never sees it | `arena/SKILL.md:25` |
| Show | Judge sees only `criteria.md` and `judge/`: copies under neutral letters, name, angle, vendor and model traces removed | `arena/SKILL.md:26`, `:41` |
| Show | Judge starts only after all candidates return; fresh and read-only | `arena/SKILL.md:41` |
| Show | Judge returns pass/fail per criterion with evidence, plus a recommended base | `arena/SKILL.md:41` |
| Show | Parent reads every candidate completely, low scorers included, and scores the criteria itself | `arena/SKILL.md:45` |
| Show | At most one or two ideas from each other candidate, rewritten to the base's conventions | `arena/SKILL.md:47` |
| Show | Split premise → fix the brief, new round; a merge of both premises is never the answer | `arena/SKILL.md:49` |
| Show | Run record `note.md`; candidate folders stay in scratch | `arena/SKILL.md:57-64` |
| Do not | Always three candidates | `arena/SKILL.md:33` |
| Do not | A Codex candidate or judge, or any model id (needs an accepted Codex route; user may skip) | `arena/SKILL.md:35`; `codex-review/SKILL.md:15` |
| Do not | Every candidate in its own git worktree (Codex candidates: **unverified**) | `arena/SKILL.md:25`, `:33`, `:35` |
| Do not | The judge picking the winner (parent decides; base = least disturbed by planned merges) | `arena/SKILL.md:41`, `:45`, `:47` |
| Do not | Everything good merged from every candidate | `arena/SKILL.md:47` |
| Do not | Retries until it passes; rerun budget (fine print) | `arena/SKILL.md:53` |
| Do not | Commits, PRs, deploys | `arena/SKILL.md:15` |
| Do not | Perfectly blind (unremovable traces are logged as limits) | `arena/SKILL.md:29` |
| Do not | Sonnet or Haiku workers | `arena/SKILL.md:33` |
| Do not | Site phrasing "each in its own scratch folder", "ChatGPT-subscription Codex login" as the whole rule | `site/arena.html:1`; `arena/SKILL.md:25`, `:35` |

### 2.9 showpiece

| Kind | String or fact | Source |
|---|---|---|
| Name | `/showpiece` | `showpiece/SKILL.md:3` |
| What | Push an artifact past what people expect from its kind, in any medium | `showpiece/SKILL.md:3` |
| When | Ambitious creative direction, portfolio-quality work, replacing generic AI styling | `showpiece/SKILL.md:3` |
| When | Not for forms, dashboards, exact recreations, brand matching | `showpiece/SKILL.md:3` |
| Why | Aim for work people did not think was possible for this subject | `showpiece/SKILL.md:8` |
| Why | Content, form and execution specific to the subject and audience | `showpiece/SKILL.md:8` |
| Show | Ambition is the default | `showpiece/SKILL.md:10` |
| Show | Fixed requirements (accessibility, real content, contracts) still hold | `showpiece/SKILL.md:10` |
| Show | The subject's real material first: language, images, objects, data, history | `showpiece/SKILL.md:22-24` |
| Show | Never invent specificity to make the subject seem richer | `showpiece/SKILL.md:24` |
| Show | Name a specific work rather than a movement | `showpiece/SKILL.md:26` |
| Show | Changing only colors and fonts does not test a different idea | `showpiece/SKILL.md:32` |
| Show | One idea carried through; a different borrowed object in each section is a collage, not a concept | `showpiece/SKILL.md:34` |
| Show | If the name and logo changed, could this pass unchanged for many unrelated subjects? | `showpiece/SKILL.md:36` |
| Show | Spectacle that ignores the subject is not ambition | `showpiece/SKILL.md:38` |
| Show | Build the smallest specimen that tests the biggest uncertainty in the actual medium | `showpiece/SKILL.md:42` |
| Show | Inspect the rendered result; revise before extending | `showpiece/SKILL.md:44` |
| Show | Give attention unevenly | `showpiece/SKILL.md:52` |
| Show | Still frames cannot establish timing quality | `showpiece/SKILL.md:62` |
| Show | Critique: Purpose, Character and craft, Correctness | `showpiece/SKILL.md:72-74` |
| Show | Delivered with its central choice, what was verified, and limits | `showpiece/SKILL.md:82` |
| Do not | A banned-defaults list or "bans gradients / rounded corners" | `showpiece/SKILL.md:76` |
| Do not | "Anti-generic pass" as a named stage or numbered steps | `showpiece/SKILL.md:36`, `:76` |
| Do not | Two or three concepts every time (skipped once a direction is approved); competing prototypes | `showpiece/SKILL.md:18` |
| Do not | Independent reviewers (only when requested or authorized) | `showpiece/SKILL.md:78`, `:86` |
| Do not | Proof or score of originality | `showpiece/SKILL.md:80` |
| Do not | Always loud or maximal ("severe" is allowed) | `showpiece/SKILL.md:10`, `:38` |
| Do not | 375 px check as always | `showpiece/SKILL.md:59` |
| Do not | "Distinctive" as source wording (site paraphrase, not in SKILL.md) | `site/skills.html:18` |

### Review on every PR (template rule, added 2026-10-08)

Source: Harness-Firmware `CLAUDE.md` at `8884312` (PR #214, merged 2026-10-08). The rule did not exist at `64e8f24`.

| Kind | Fact or string | Source |
|---|---|---|
| Fact | Claude Code opening or updating a PR runs `/codex-review` in the same turn, without asking | `CLAUDE.md:65` @ 8884312 |
| Fact | Nothing merges until surviving findings are fixed or waived by the user | `CLAUDE.md:63` @ 8884312 (instruction to the agent; do not put this on screen, it collides with the site's "never claim nothing merges without your approval" rule) |
| Fact | In merge mode the `/merge` loop replaces the trigger | `CLAUDE.md:65` @ 8884312 |
| Fact | Codex sessions get the mirror rule: `$claude-review` with Opus | `AGENTS.md` @ 8884312 |
| String | "Every PR from Claude Code gets a Codex review" | paraphrase of `CLAUDE.md:65` @ 8884312; scoped to Claude Code because Codex-opened PRs get a Claude review instead |
| Picture | A PR arrives and the single Codex tip swings in with no key pressed (automatic) | `CLAUDE.md:65` @ 8884312 |
| Do not | "Codex reviews every PR" with no scope (false for PRs Codex opens) | `AGENTS.md` @ 8884312 |
| Do not | Rerun counts, the user's OK for reruns, billing | brief: no settings fine print |

## 3. Global copy rules

| # | Rule | Source |
|---|---|---|
| 3.1 | Never claim "nothing merges without your approval" | `spec:26-30` (N9), `spec:157-161`; `merge/SKILL.md:13`, `:18` |
| 3.2 | No skill counts | `spec:26-30` (N1), `spec:167-168`; `.claude/reference/product.md:235` |
| 3.3 | No em dashes | user global `~/.claude/CLAUDE.md`, "Always-on unslop" (recon `site-map.md:213`) |
| 3.4 | No periods in display text | owner brief |
| 3.5 | Minimal words | `AGENTS.md` "less is more", via `.claude/reference/product-site.md:69` |
| 3.6 | No fine print about settings (caps, budgets, thresholds, flags, model pins) | owner brief; `.claude/reference/product.md:241` (model ids are pins) |
| 3.7 | Nothing false: every claim backed by template source | site `CLAUDE.md`, "What this project is" |
| 3.8 | Illustrative demos are not measurements | `.claude/reference/product.md:238` |
| 3.9 | Never call a same-vendor review cross-vendor | `.claude/reference/product.md:226`, `:239` |
| 3.10 | Never say CI passes until a GitHub run shows it | `.claude/reference/product.md:240` |
| 3.11 | Stale names `merge-ready`, `compact-review` never appear | `site/skills.html:16`, `:24`; template commits `8d29558`, `add20ea` |

Explainer spec N-rules. These are **explainer rules**; the owner's reel brief explicitly includes "CI is checked" for `/merge`. **Flagged for owner decision.**

| Rule | Text | Source |
|---|---|---|
| N3 | No measured number | `spec:167-168` |
| N4 | No CI mention (conflicts with "CI is checked", `merge/SKILL.md:73`) | `spec:167-168` |
| N6 | No vendor named as an endorser; the explainer caption says "the other vendor's model" and names no company | `spec:157-161`, `:167-168` |

Other points for owner decision:

- `/codex-review` and `/codex-fullreview` carry "codex" in their names; whether a command name counts as naming a vendor under N6 is open. "OpenAI" appears in `codex-review/SKILL.md:2`.
- Rule 3.4 vs source strings: the tables drop terminal periods; internal punctuation (`;`, `:`, `→`, `≠`) is kept.
- `/why` and `/perf-loop` reviewers are the skills' stated design; when agents are unavailable the skill discloses the gap (`why/SKILL.md:41`, `perf-loop/SKILL.md:78`). Shown here as always-on.
- `/merge` "until clean": true about what merges (`merge/SKILL.md:65`, `:67`) but implies unlimited reruns. The tables use "merges when clean" (`merge/SKILL.md:15`) instead.

## 4. Palette and fonts

Global tokens, `site/styles.css:2-15`:

| Variable | Hex | Use |
|---|---|---|
| `--ink` | `#0f1210` | page ground |
| `--paper` | `#f3f3ec` | light ground, text on dark |
| `--green` | `#53db76` | accent, strokes, heading `<em>` |
| `--green-bright` | `#58e07b` | glow (`site/living-system.css:1` `--glow`) |
| `--green-deep` | `#50d873` | step labels, mono accents |
| `--muted` | `#b2b5ab` | secondary text |
| `--line` | `rgba(243,243,236,.22)` | 1px rules |

Page-scoped tokens:

| Variable | Hex | Source |
|---|---|---|
| `--amber` | `#efc87e` | `site/about.css:3` |
| `--line` (about) | `rgba(243,243,236,.16)` | `site/about.css:3` |
| `--ss-lime` | `#53db76` | `site/skill-showcase.css:1` |
| `--ss-ivory` | `#f1f0df` | `site/skill-showcase.css:1` |
| `--ss-muted` | `#acb19e` | `site/skill-showcase.css:1` |
| skills ground | `#09100b` | `site/skill-showcase.css:1` |

Line-drawing constants, `site/card-art.mjs:18-21` (restated `spec:283-290`):

| Name | Hex | Meaning |
|---|---|---|
| `GREEN` | `#53db76` | default stroke, 1.2 wide (`site/card-art.mjs:22`) |
| `BRIGHT` | `#72f28c` | scans, new lines at 1.6 |
| `AMBER` | `#efc87e` | failure, self-report |
| `DIM` | `#3e5a45` | ghosts, unread |
| occluding fill | `#10150f` | `site/card-art.mjs:42`, `:45` |

Other grounds and text: hero `#070c08` (`site/living-system.css:1`); explainer `#0b100c` (`site/explainer.css:14`); card row `#11120D` (`site/card-row.css:8`); audit finding amber `#efbb69` (`site/skill-showcase.css`, rule `.ss-audit-finding`, no line); text on dark `#f2efdf` heading, `#c2c9ba` caption, `#97b29e` labels (`spec:248-282`; `site/explainer.css:27`, `:48`, `:82`, `:84`).

Fonts, tokens `site/fonts.css:33-45`, faces `site/fonts.css:15-18`, licenses `site/PROVENANCE.md:9-14`:

| Token | Family | File | Notes |
|---|---|---|---|
| `--font-display` | Lineal | `site/assets/fonts/lineal/Lineal-VF.woff2` | variable; `--display-weight:781`, `--display-track:-.015em` (`site/fonts.css:35-36`) |
| `--font-accent` | Fraunces Italic | `site/assets/fonts/fraunces/Fraunces-Italic.woff2` | one static instance wght 600, opsz 144, SOFT 100, WONK 1; other settings need a re-cut (`site/fonts.css:3-5`) |
| `--font-text` | Harness Text (renamed Mona Sans) | `site/assets/fonts/harness-text/HarnessText-VF.woff2` | weight 200-900; `--text-weight:500` |
| `--font-mono` | Departure Mono | `site/assets/fonts/departure-mono/DepartureMono-Regular.woff2` | 400 only; canvas labels (`site/converge.mjs:54`) |

Glyph subset includes arrows U+2190-21FF, geometric shapes U+25A0-25FF, check U+2713 (`site/PROVENANCE.md:14`). Characters outside the subset fall back.

## 5. Weekly-review

`/weekly-review` must never appear in the reel: no name, no frame, no mention. Source: owner brief.

## Unverified (from recon)

- Whether `/compact <instructions>` treats the argument as summarizer instructions in current Claude Code (recon `lh-compact-plan.md:305`).
- Whether a newer Sol than `gpt-6.1-sol` exists today (`codex-review/SKILL.md:15`).
- What "MB per full scroll" measures; hardware and run counts behind site perf numbers (recon `why-wow-perf.md:290-292`).
- Whether the September site results ran the skill text at `64e8f24` (recon `why-wow-perf.md:293-294`).
- Whether the repo and global copies of `merge/SKILL.md` match (recon `merge-codex.md:205`).
