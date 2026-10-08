# Harness Firmware: skill catalog

The full skill set of the Harness Firmware template, grouped by job, with the chains between skills and the checklist for adding or changing one. Product overview: `product.md`. This site's copy of the catalog: `product-site.md`.

## Sources and how to read the tables

- Facts come from template `ryanportfolio/Harness-Firmware` at `bbd0b5f39565c518ecf5176b44425df2e7c642d6`, read 2026-10-01. Counts, the manual and Codex-class lists, and the rows for `deep-plan`, `merge`, `servers`, `wrapup`, `design-prototypes`, `redesign-concepts`, `codex-image-gen` and `why` were re-read at `05034a38dca86a8febea909a18d8d933c4c0da55` on 2026-10-08. Check names, counts and model pins against template `main` before repeating them.
- **Row sources.** Each row comes from that skill's own `SKILL.md` at the pinned commit (template `.claude/skills/<name>/SKILL.md`, or `.agents/skills/<name>/SKILL.md` for Codex-only skills). `external-review` and `opus-fullreview` were read from their Codex `SKILL.md` during fact-checking. Rows tagged **unverified** had no reading of their own.
- **Invocation.** Claude uses `/name`, Codex uses `$name`.
- **Manual** means the skill runs only on explicit invocation: Claude frontmatter `disable-model-invocation: true`, or Codex `agents/openai.yaml` with `allow_implicit_invocation: false`. Claude manual: `adopt-repo`, `advocate`, `astra-fullreview`, `astra-review`, `claude-review`, `dare`, `forge-repo-ui-skill`, `lab`, `long-horizon-workflows`, `merge`, `optimize-context`. Codex manual: `adopt-repo`, `astra-review`, `claude-review`, `dare`, `deep-plan`, `external-review`, `forge-repo-ui-skill`, `lab`, `optimize-context`.
- **Codex class** (template `.agents/CODEX-SKILL-COMPATIBILITY.md`): 18 Native, 9 Adapted (Codex paths, approvals or UI substitutions), 10 Capability-gated (need a currently exposed tool), 1 Dangerous (explicit authorization for persistent side effects), 5 Claude-only. Capability-gated skills need fresh independent agents (`advocate`, `arena`, `dare`, `impartial-review`, `long-horizon`, `perf-loop`, `why`, `wow-loop`) or an image tool (`design-prototypes`, `redesign-concepts`) and must not claim success without them.
- **Bundled** lists files besides `SKILL.md` (and Codex `agents/openai.yaml`). Template `.agents/skill-sources.json` hashes the whole Claude skill folder, so editing any bundled file is drift until the Codex port is updated and re-baselined. Codex folders mirror the Claude ones unless noted.

## Counts

- Template `.claude/skills/`: 43 directories plus `PROVENANCE.md`. 41 have a `SKILL.md`; `writing-skills` is retired and holds reference files only; `smart-compact` is a Claude Code plugin mod (`.claude-plugin/plugin.json`, `hooks/`) with no `SKILL.md`, so it is a mod, not a skill. It replaced `compact-review` (template #208) and runs the review and `/compact` in one command.
- Template `.agents/skills/`: 40 directories. 38 have a `SKILL.md` (36 shared ports plus Codex-only `external-review` and `opus-fullreview`); `writing-skills` (retired) and `humanizer` have none. `humanizer/patterns.md` is a leftover from the `humanizer` skill that was folded into `writing`; it is not a skill and has no registry or manifest entry (template `.claude/skills/PROVENANCE.md`, `CHANGELOG.md` 1.3.0 Removed).
- Registry: 43 entries in `skill-modes.json`, 38 `native` and 5 `disabled`. Manifest groups: 9 core, 17 discipline, 17 specialist (43). README: 41 Claude skills and 38 Codex skills.
- Retired in both runtimes: `writing-skills` (replaced by `addskill`) and `unslop` (behavior lives in `caveman` and `writing`). Also gone from the template: `humanizer`, `purposeful-writing`, `automate-me`, `verify-this`, `long-horizon-swarm`, `merge-ready` (replaced by `merge`, template #188) and `compact-review` (replaced by the `smart-compact` mod, template #208) (template `CHANGELOG.md`, `.claude/skills/PROVENANCE.md`). `merge` was removed once and returned in #188.

## Communication and prose

| Skill | Purpose | Use when | Chains to | Runtime, Codex class | Bundled |
|---|---|---|---|---|---|
| `caveman` | Terse chat replies (lite, full, ultra; ultra default) with built-in unslop. Never compresses code, commands, commits, PR text or file contents | Every session reply; the kernel turns it on | `writing` for deliverables; `references/diff-cleanup.md` for code-diff cleanup | both; Native | `references/diff-cleanup.md` |
| `writing` | Rules for audience-facing prose: voice precedence, banned tells, a 54-pattern catalog, a 10-step review sweep, PASS/FAIL verdict | Docs, UI and site copy, emails, release notes, commit and PR prose | none; `caveman` owns chat | both; Native | `patterns.md`, `LICENSE`, `NOTICE.md` |
| `bro` | Restates a confusing reply or draft in plainer, shorter words, keeping every fact | `/bro`, "plain english", "I don't understand" | `writing` (plain pass), `caveman` carve-out | both; Native | none |
| `enhance-prompt` | Writes one self-contained, copy-ready prompt for another session; does not run it | "turn this into a prompt", "hand this off" | none | both; Native | none |

## Memory and improvement

| Skill | Purpose | Use when | Chains to | Runtime, Codex class | Bundled |
|---|---|---|---|---|---|
| `recall` | Looks up and saves project facts in `.claude/reference/`; pitfalls save without asking | Before unfamiliar work; when a quirk just cost a retry | none (reads `CLAUDE.md`/`AGENTS.md`) | both; Native | none |
| `refine` | Evidence-gated review of friction or user preferences; smallest change, possibly none, routed to exactly one home. Failure fixes need three checks; preferences need the user's words | Workflow-improvement review; "make this a rule" | `recall`, `addskill`, `memory-audit.mjs`, `references/evaluation.md` | both; Native | `references/evaluation.md` |
| `optimize-context` | Measures and trims always-loaded instructions; reports byte deltas apart from token claims | "Reduce per-turn context" | `context-weight.sh`, `sync-starter` | both, manual in both; Adapted | none |

## Think before building

| Skill | Purpose | Use when | Chains to | Runtime, Codex class | Bundled |
|---|---|---|---|---|---|
| `brainstorming` | Triages design needs: Skip, Quick alignment (at most one question) or Full design (one to three questions per turn, two or three approaches, one approval gate). Optional local visual companion | Unresolved goals or real tradeoffs | `references/shared-code-refactoring.md`, `visual-companion.md`; hands off to an unnamed "planning skill" only if enabled and applicable (inference: `writing-plans`) | both; Native | `references/shared-code-refactoring.md`, `visual-companion.md`, `scripts/` (`server.cjs`, `helper.js`, `frame-template.html`, `start-server.sh`, `stop-server.sh`), `LICENSE` |
| `writing-plans` | Ordered, verifiable step plan with a walking skeleton early; saves a file only when it must survive a handoff or reset | Clear multi-step work or a durable handoff | bundled plan-reviewer prompt (wiring unclear) | both; Native | `plan-document-reviewer-prompt.md`, `references/shared-code-refactoring.md`, `LICENSE` |
| `dare` | Four isolated fresh-context stages (Decompose, Audit, Recombine, Experiment) under an immutable contract | "First principles"; the standard answer keeps failing | `writing-plans`, `fable-mode` | both, manual in both; Capability-gated | none |
| `deep-plan` | Interviews a loose idea in rounds of at most 4 questions, recommendation first; keeps a ledger at `.tmp/deep-plan/<slug>/ledger.md`; runs `why` on the 1 to 3 weightiest decisions; builds nothing until the user picks Go at the gate | `/deep-plan`; a loose idea with decisions still open | `why` (required); hands off to `writing-plans`, a `long-horizon` contract or `enhance-prompt`; parks look-and-feel questions for `lab`, `arena`, `dare` or `design-prototypes` | both, manual in Codex only; Adapted | none |
| `why` | One fresh reviewer tests the previous recommendation; returns "Why it matters" and a calibrated bottom line | `/why` right after a recommendation | `impartial-review` (heavier alternative) | both; Capability-gated | none |
| `arena` | 3 candidates by default, built in isolation, judged blind on 3 to 6 criteria; best ideas grafted onto the strongest base | The solution's shape is unclear; a stalled step | `codex-review` preflight (Codex candidate and judge); `lab`, `dare`, `impartial-review` as alternatives | both; Capability-gated | none |
| `lab` | Throwaway one-file HTML page with live sliders seeded at current values; ports the chosen JSON into real constants, then deletes the page | Tuning a visual or game-feel element by eye | `templates.md` skeletons | both, manual in both; Adapted | `templates.md` |
| `design-prototypes` | Three distinct image concepts by default (different composition, metaphor, hierarchy or interaction, never recolors), then refines the chosen one; produces images only | Choosing a visual direction for a section, feature or brand before building | `codex-image-gen` (required; the Claude Code route to an image tool); Codex uses its built-in image tool; `redesign-concepts` when the UI already exists | both; Capability-gated | none |
| `redesign-concepts` | Screenshots a built UI, lists its concrete problems, and has Codex `image_gen` draw 10 redesign concepts by default (about 60-70k Codex tokens each); writes a synthesis for the owner's picks and edits nothing | `/redesign-concepts`; improving a UI that already exists | `design-prototypes` when nothing is built yet | both; Capability-gated | `scripts/make-prompts.mjs`, `scripts/run-batch.sh` |
| `codex-image-gen` | `codex exec` recipe (`gpt-6-astra`, medium) in which Codex's `image_gen` tool saves one PNG into the workspace, billed to the ChatGPT subscription; stops if `codex login status` fails | An image asset is needed from Claude Code | used by `design-prototypes` | Claude only; Claude-only | none |

## Execute with evidence

| Skill | Purpose | Use when | Chains to | Runtime, Codex class | Bundled |
|---|---|---|---|---|---|
| `fable-mode` | Evidence-led execution: scope, refute your own fix, prove it at the claim's layer, report VERIFIED, NOT VERIFIED or INCONCLUSIVE, name the fix tier | Hard or uncertain work; "did it work?" | none | both; Native | none |
| `long-horizon` | Manager, Executor and Auditor rounds with a state file, hash baselines and stagnation rules | Work too big for one context | `fable-mode`, `codex-review`, `codex-fullreview`, `arena`; Codex side `claude-review`, `opus-fullreview` | both (Codex version hand-authored); Capability-gated | `scripts/manifest.mjs` |
| `long-horizon-workflows` | Same contract; each round is one Workflow tool script with schema verdicts and a journal | `/long-horizon-workflows` in Claude Code | `long-horizon`, `fable-mode`, `codex-review` | Claude only, manual; Claude-only | none |
| `servers` | Lists dev servers (port 1024+, owned by node, bun, python and similar) and automation browsers with port, pid, age, folder and recorded purpose; flags `gone`, `old`, `unknown`, `protected`; shows a plan, then closes (`close stale`, `close old`, one port). A normally launched browser is never listed | `/servers`, after starting a dev server, "which port is X" | `launchPlacedChrome()` records its browsers; used by `wrapup` | both; Native | `scripts/servers.mjs` |
| `wrapup` | Read-only verdict, Ready to archive or Not yet, from uncommitted and unpushed work, the branch's PR (an open PR blocks), `.tmp/` scratch, servers and browsers from the checkout, and other worktrees; offers the fixes as one go | `/wrapup`, "good to archive?" | `servers` (required) | both; Native | `scripts/wrapup.mjs` |
| `session-hub` | Shared append-only HTML ledger (roster plus log, refreshes every 15 s) for 2+ parallel sessions; exclusive scope claims | Parallel sessions on one effort; unexplained commits appearing | none | both; Native | `template.html` |
| `perf-loop` | Measured optimization rounds: baseline, one hypothesis per round, two independent reviewers; triages every dimension first when no target is named | Broad performance work | `references/*` (`evidence-report.md` shared with `wow-loop`) | both; Capability-gated | `references/` (`triage.md`, `loading.md`, `rendering.md`, `services.md`, `evidence-report.md`) |
| `wow-loop` | Quality loop: frozen written bar from a named reference, fresh critics who disprove the work from their own captures, binary verdicts, resumable state | "Wow factor", "get it to 8/10", substantial visual work | `arena`, `lab`, `/recall save`, `/loop` | both; Capability-gated | `references/evidence-report.md`; the Codex copy adds `references/state.md` and `references/visual-review.md` |
| `showpiece` | Creative direction for crafted, subject-specific artifacts in any medium; starts from real material and builds a small specimen first | Ambitious or portfolio-grade work; removing generic AI styling | unnamed format workflows | both; Native | none |
| `forge-repo-ui-skill` | Researches current public UI skills (4 to 7 finalists scored out of 100) and distills one lean UI skill for this repo | Building a repo-specific UI skill | `addskill` | both, manual in both; Native | `references/` (`repo-intake.md`, `research.md`, `synthesis-and-validation.md`) |

## Review and shipping

| Skill | Purpose | Use when | Chains to | Runtime, Codex class | Bundled |
|---|---|---|---|---|---|
| `impartial-review` | Fresh-context reviewers; the main session verifies, dismisses with evidence and ranks. A tiny diff (under 50 changed lines, single file, no schema/auth/cache code) gets one fresh leaf reviewer. Everything else gets one reviewer per bucket A to E (correctness, data flow, perf and security, missed things, project rules) plus G (open lens); an author brief adds F (intent) | Review a change with independent agents | `codex-review` (process monitoring), strict rubric, shared-code reference | both (Codex version a shorter rewrite); Capability-gated | `strict-quality-rubric.md`, `references/shared-code-refactoring.md` |
| `codex-review` | `codex exec review` on `gpt-6.1-sol` at high effort, then local verification of every finding with evidence from the rollouts | `/codex-review`; template `CLAUDE.md` runs it whenever a PR is opened or updated (template #214) | `external-review`; `impartial-review` format | both; from Codex it is same-vendor, never call it cross-vendor; Adapted | none |
| `external-review` | Single-context read-only leaf review of an exact diff scope: correctness and types; data flow, compatibility and failure handling; performance, security and observability; missing integration and cleanup; project rules. No agents, nested reviews or edits. Required by the manifest | When `codex-review` or `astra-review` launches it, or on explicit `$external-review` | `references/shared-code-refactoring.md` (when the diff touches shared boundaries) | Codex only, manual; Native | `references/shared-code-refactoring.md` |
| `codex-fullreview` | One `codex exec` acting as `impartial-review` Manager with sub-reviewers; confirms spawned children from the session files | Multi-agent second opinion | `impartial-review` (required), `codex-review` fallback | Claude only; Claude-only | none |
| `astra-review` | `codex-review`'s contract on `gpt-6-astra` at medium effort; no silent fallback to another model | "Have Astra review this" | `codex-review`, `external-review` | both, manual in both; Adapted | none |
| `astra-fullreview` | `codex-fullreview` on Astra at medium effort | Full review on Astra | `codex-fullreview`, `impartial-review`, `astra-review` | Claude only, manual; Claude-only | none |
| `claude-review` | One headless, read-only Claude CLI reviewer (alias `fable`, high effort) on the user's subscription; fail-closed billing preflight; `ultrareview` only with consent | Cross-vendor review from Codex; template `AGENTS.md` runs it with `--model opus` whenever a PR is opened or updated (template #214) | `claude ultrareview` (CLI) | both, manual in both; Adapted | none |
| `opus-fullreview` | One Claude CLI process (`opus` alias, high effort) runs the Claude `impartial-review` as Manager with fresh Opus sub-reviewers; Codex then verifies each finding. Fail-closed preflight: claude.ai login, `firstParty`, `subscriptionType: max`, no API-key or provider env vars; never enables paid credits | Full Claude review from Codex | Claude `impartial-review` (required; if absent it stops and points to `claude-review`) | Codex only (cross-vendor from Codex; not flagged manual); Adapted | none |
| `handoff-audit` | Drafts one fenced audit prompt for a fresh session with exact SHAs and falsifiable claims; reviewer read-only by default | Before an independent cold review elsewhere | none | both; Native | none |
| `advocate` | One fresh subagent argues against a change just made on six axes; verdict keep, revise or drop | `/advocate` before a change lands | `why`, `impartial-review` (neighbors), `recall` | both; manual in Claude only; Capability-gated | none |
| `babysit-ci` | Watch mode reports only. Fix mode sorts each failure as base-branch, flake (1 rerun) or real, and stops after 3 fix pushes. Never merges | "watch CI", "fix CI" | `fable-mode`, `codex-review` (Codex side `claude-review`), `recall` | both; Native | none |
| `merge` | Starts only when the user types `/merge`; merge mode then covers every PR the session opens or updates until the user turns it off. Per PR: one `codex-fullreview`, fixes committed and pushed, then `codex-review` alone on the full PR diff, 3 reruns max after round 1; then all CI checks; then `gh pr merge --squash --match-head-commit`. Ends "merged <URL> at <SHA>" or "blocked" with the PR left open | `/merge` (user only, never self-started) | `codex-fullreview`, `codex-review` | Claude only, manual; Claude-only | none |

## Project setup and template

| Skill | Purpose | Use when | Chains to | Runtime, Codex class | Bundled |
|---|---|---|---|---|---|
| `init-project` | Configures a spawned project from detected facts: profile, minimal or full skill set, prose mode, template-only cleanup, starter remote, generated CI | Setup is requested; FILL IN markers alone do not authorize it | `write-ci-workflow.mjs` (its generated `ci.yml` has a `firmware` job running `sync-codex-skills.mjs --check`), `references/profiles.md`, `references/ci.md` | both; Adapted | `references/profiles.md`, `references/ci.md` |
| `adopt-repo` | Clones an outside repo with history, overlays the firmware minus template-only paths, runs a privacy sweep, runs `init-project`, publishes privately when authorized | Bringing an existing codebase into the firmware | `init-project` | both, manual in both; Dangerous | none |
| `sync-starter` | Two-way sync: Direction A pulls chosen shared paths from the template; Direction B pushes a genericized fix back by PR | Template drift; promoting a generic fix | sync scripts, `validate-template` CI | both; Adapted | none |
| `addskill` | Single entry point to create, import, update or install a skill: registration, Codex port, sync checks, license provenance | Any skill change | Codex built-in `skill-creator`; `references/evaluation.md` (also in `refine`) | both; Native | `references/` (`authoring.md`, `evaluation.md`, `LICENSE`) |
| `writing-skills` | Retired; licensed reference files only, no `SKILL.md`; replaced by `addskill` | Background reading only | `addskill` | retired in both | `anthropic-best-practices.md`, `persuasion-principles.md`, `testing-skills-with-subagents.md`, `graphviz-conventions.dot`, `render-graphs.js`, `examples/CLAUDE_MD_TESTING.md`, `LICENSE` |

## Skills outside the template

| Skill | Where | Status |
|---|---|---|
| `long-horizon-swarm` | This site repo's `.claude/skills/` on main; registered `disabled` in the site's `skill-modes.json` | Retired in template 1.7.0 (template `CHANGELOG.md`). No reading of its own: **unverified** beyond that |
| `threejs-scene` | Branch `lab/threejs-scene-skill` (checked out in the `lab-threejs-scene` worktree), not on main | Draft; **unverified** (seen only in the site-own-harness reading) |
| `apply-firmware`, `rebrand`, `winuse` and others | User-global personal skills | Not part of the template; contents **unverified** |

## Main skill chains

Step-by-step versions live in `product.md` ("The main chains end to end").

- **Idea to merged PR:** `brainstorming` or `dare` -> `writing-plans` -> `fable-mode` or `long-horizon` (with `arena`, `wow-loop`, `lab`, `perf-loop` as needed) -> optional `why` / `advocate` -> PR (opening it runs `codex-review`; `claude-review` with Opus from Codex) -> `babysit-ci` -> human squash-merge, or the user types `/merge` and `merge` runs the review loop and CI before it squash-merges.
- **Review stack:** `codex-review` -> `external-review`; `astra-review` -> `codex-review` + `external-review`; `codex-fullreview` -> `impartial-review`; `astra-fullreview` -> `codex-fullreview` + `impartial-review`; `merge` -> `codex-fullreview` + `codex-review`; `design-prototypes` -> `codex-image-gen`; `deep-plan` and `caveman` -> `why`; `wrapup` -> `servers`. From Codex: `claude-review`, and `opus-fullreview` -> Claude `impartial-review` (also a manifest dependency). The edges match `skills.dependencies` in the manifest.
- **Failure to lesson:** quirk -> `recall` (`pitfalls.md`); CI quirks via `babysit-ci`; standing quality bars via `wow-loop` (`/recall save`); recurring friction -> `refine` -> `recall` or `addskill`.
- **Project to template:** `adopt-repo` or a creator -> `init-project` -> work -> `refine` / `addskill` -> `sync-starter` Direction B -> template PR -> other projects pull with Direction A. `optimize-context` hands generic trims to `sync-starter`; `forge-repo-ui-skill` hands its output to `addskill`.
- **Hubs** (skill-graph reading): `codex-review` (reused by `astra-review`, `merge`, `long-horizon`, `long-horizon-workflows`, `babysit-ci`, `arena`), `impartial-review`, `recall`, and the `init-project` / `sync-starter` pair.

## Adding or changing a skill

Ordered checklist, from template `docs/codex-skills.md`, `CONTRIBUTING.md`, `GUIDE.md` and `CLAUDE.md`:

1. Start with `addskill` (create, import, update or install). In Codex it uses built-in `skill-creator`. Read the existing skill and its references first.
2. Edit the Claude source in `.claude/skills/<name>/` and the Codex port in `.agents/skills/<name>/` in the same change, translating tools per `.agents/codex-tools.md`. Preserve the other runtime unless its behavior is in scope. Never ship a generated adapter; `--write` deletes generated adapters, except under an enabled native skill.
3. Register a new name in `.agents/skill-modes.json` as `native` (with a port) or `disabled` (needs Claude-only tools; no port, no `skill-sources.json` entry). Native entries need no Claude counterpart. Retired names (`writing-skills`, `unslop`) cannot be registered `native` or regain a `SKILL.md`.
4. Classify each active Codex skill in `.agents/CODEX-SKILL-COMPATIBILITY.md` (exactly one class).
5. Put the skill in exactly one group under `skills.groups` in `.agents/template-manifest.json`; add `skills.dependencies` if it needs another skill.
6. Write the description to name trigger conditions, not the topic; keep it under 240 characters and the Codex catalog within its budget (7,500 characters, `test-codex-contract.mjs`).
7. Third-party origin: add a row to `.claude/skills/PROVENANCE.md` and keep the upstream LICENSE or NOTICE inside the skill folder, recording what changed.
8. For a native skill whose Claude source changed (any file in the folder), update the port, then run `node .claude/scripts/sync-codex-skills.mjs --baseline <name>` (template version; a repo whose local script lacks `--baseline` needs a firmware update first, see `product-site.md`, "Working on this repo"). A disabled skill skips this.
9. Run `node .claude/scripts/sync-codex-skills.mjs --check`, `node .claude/scripts/test-codex-contract.mjs`, and `node --test .claude/scripts/test-sync-codex-skills.mjs .claude/scripts/test-codex-skill-sync.mjs .claude/scripts/test-codex-skill-copies.mjs`. CI fails on drift or a missing registration.
10. For a large skill, run `bash .claude/scripts/context-weight.sh` before and after and report the numbers in the PR.
11. In the template, rebuild the README (`node scripts/readme/build.mjs`) so its skill list matches, add a `CHANGELOG.md` entry if user-visible, and bump the plugin version (minor for a new skill, patch for a fix).
12. Removing a skill: delete both folders, add the name to `.agents/removed-skills.json` (sorted, once each), run `node .claude/scripts/doctor.mjs`. Removal never fails a check.
13. In this site repo afterward: update `site/new/skill-catalog.js`, run `node scripts/refresh-upstream-skills.mjs`, and work through the site update checklist in `product-site.md`.
