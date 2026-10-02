# Harness Firmware: product identity

## How to use this file

This is the identity source for Harness Firmware: what it is, why it helps, how its parts fit, and what not to claim. Read it before you change site copy, the `/new` creator, the skill catalog, or any text that explains the firmware. The skill catalog lives in `product-skills.md`; this website repo lives in `product-site.md`.

- **Pinned sources.** Template facts come from `ryanportfolio/Harness-Firmware` at commit `bbd0b5f39565c518ecf5176b44425df2e7c642d6`, read on 2026-10-01. Template paths are written "template `path`"; other paths belong to this repo, `ryanportfolio/HarnessFirmware.com`, at `main` `2969a4a`.
- **Freshness.** The template changes often. Check every count, version and model id against template `main` before you repeat it. `node scripts/refresh-upstream-skills.mjs --check` covers the skill list.
- **Labels.** "Inference" marks a conclusion the sources imply but do not state. "Unverified" marks a fact nobody confirmed against a source.

## What it is

**In plain terms.** A coding AI forgets everything when a chat ends, grades its own work, and gets lost in long jobs. Harness Firmware is a set of files you add to a code repository to fix those three problems. The AI gets a short rulebook it reads on every turn, a notebook of lessons it writes into the repo itself, and a shelf of step-by-step guides, called skills, that it loads only when a task needs one. Before work merges, a second AI that never saw the work checks it. A person still gives the final yes.

**Precisely.** Harness Firmware is a repository template and skill set for Claude Code and OpenAI Codex. It ships:

- a thin always-loaded kernel: `CLAUDE.md` for Claude and `AGENTS.md` for Codex;
- committed project memory in six `.claude/reference/` files, read and written through the `recall` skill;
- 36 Claude skills and 33 Codex skills that load on demand (template `README.md`);
- one SessionStart hook, a caveman output style and a permission allow/deny list (template `.claude/settings.json`);
- an isolated Playwright MCP server for parallel browser work (template `.mcp.json`);
- health, sync and context-measurement scripts in `.claude/scripts/`;
- a manifest that says which files a new project receives (template `.agents/template-manifest.json`);
- a CI workflow that validates the whole package (template `.github/workflows/validate-template.yml`).

It reaches users as a GitHub template, a skills-only Claude Code plugin named `claude-starter`, bootstrap scripts, the `adopt-repo` skill, the Harness-Console app and this site's `/new` creator. It is MIT licensed (template `LICENSE`, template `GUIDE.md`). The README's own limit applies to all of it: "Structural checks validate the package; actual execution still needs the appropriate model, tools, credentials, and evidence" (template `scripts/readme/readme.mjs`).

## Why it helps

Each problem lists what the firmware does, then the proof the sources give. Field-log proof comes from one project (`site/about.html`, confirmed on main at `2969a4a`); treat it as a case study, not a measured rate.

### Forgetting between sessions

Every session starts empty, so quirks, tech picks and commands get rediscovered or never found.

- **What it does.** Facts live in six committed files: `architecture`, `commands`, `deployment`, `pitfalls`, `secrets`, `tech-stack` (template `.claude/reference/`). Git carries them to every machine and sandbox. `recall` reads only the topics a task needs. When a stored fact changes an action, `recall` cites the file and date, so an old fact shows up as a dated claim the user can correct (template `.claude/skills/recall/SKILL.md`). Claude Code's built-in auto memory is off (`autoMemoryEnabled: false`, template `.claude/settings.json`).
- **Proof.** At 16:52 a session ran recall and read the pitfalls, architecture and commands notes. At 22:40 a forced removal wiped a shared `node_modules`; the session saved two pitfalls. At 22:51 another session's recall read `pitfalls.md`, and at 23:49 it met the same trap and avoided it, 69 minutes after the wipe (`site/about.html`).

### Self-graded work

The model that wrote a change defends it, and approves its own work when it reviews itself.

- **What it does.** Review skills hand the diff to reviewers that never saw the conversation. `impartial-review` spreads coverage across buckets and the main session verifies every finding before reporting it. `codex-review` and `codex-fullreview` use a reviewer from a different vendor. `impartial-review`, `merge-ready` and `codex-fullreview` say a self-review or plain prompt cannot stand in for the independent check (template `.claude/skills/{impartial-review,merge-ready,codex-fullreview}/SKILL.md`).
- **Proof.** Six same-model `/long-horizon` audits passed the About page; `/codex-review` then found a door-hole layering bug they had missed. On one page `/codex-review` and `/astra-review` found 10 real bugs, all fixed (`site/about.html`). On an 11-round `long-horizon-swarm` run, a review of the finished branch found 3 real defects in a verification tool that eleven rounds of peer review had never examined; the template cited this when it retired the skill in 1.7.0 (template `CHANGELOG.md`, 1.7.0 Removed).

### Context cost

Every turn pays again for whatever is always loaded. Noisy command output and large file reads fill the window.

- **What it does.** The kernel holds cross-cutting rules only; detail lives in reference files. Skills load their body only when called, so the always-loaded cost is each name and description. Chat replies default to terse "caveman ultra". `context-weight.sh` and `optimize-context` measure and trim the always-loaded layer. External tools RTK (shell output) and STK (large file reads) are supported, not bundled.
- **Proof.** The site estimates that loading everything every turn costs about 87,000 tokens, and the firmware about 3,400: `CLAUDE.md` plus one index line for each of 36 skills. A build-bug recall adds 4,100 and one playbook adds 2,160, about 9,700 in all (`site/about.html`, `site/field-log.mjs`). These are estimates; the template's own measure is chars/4 on source files (see "Claims to avoid"). RTK logs on the author's machine, snapshot 2026-10-01: 47.0% of output tokens removed across 269,284 commands, 302.7M tokens saved (`ryanportfolio/savetokens` README).

### Repeated mistakes

The same environment quirk costs a retry session after session.

- **What it does.** Pitfalls carry standing authorization: when a quirk cost a retry, a backed-out change or a user correction and its cause is confirmed, the session saves it to `pitfalls.md` before the task ends, without asking (template `.claude/skills/recall/SKILL.md`, template `CLAUDE.md`). `refine` turns recurring friction or stated user preferences into the smallest justified change, or into no change. A failure fix must pass three checks first: the failure traces to an instruction, tool or configuration; the causal link is stated from evidence; and the changed rule was active in the failure. A preference needs the user's own words as evidence (template `.claude/skills/refine/SKILL.md`).
- **Proof.** The two pitfalls saved at 22:40 above. The field log also records four stale findings: `CLAUDE.md` and `AGENTS.md` were reviewed in the firmware; `/refine` updated review skills that named a retired model; reviewers became read-only after one with write access deleted the build; and `/init-project` now runs before release work after setup had never been run (`site/about.html`).

### Lost long tasks

Long work dies at context compaction or in failed retries, and one context both implements and judges it.

- **What it does.** `long-horizon` runs the work in rounds. A Manager owns a state file on disk; a fresh Executor does one step; a fresh Auditor checks it against a brief written before the Executor existed, using a hash-based baseline (template `.claude/skills/long-horizon/SKILL.md`). Only audited results count as progress. Dead ends are recorded so they are not retried, and stagnation rules force a change of approach.
- **Proof** (`site/about.html`). 80 rounds of `/long-horizon-workflows` built the About page; the log covers seven sessions over three days, one production site, and one PR of 575 files among six PRs. In `/long-horizon-workflows` a judge flagged a round that had tuned its code to pass its own check. `/wow-loop` blind judge: new beat old in 23 of 24 rounds. `/perf-loop`: masthead 6.01 to 0.06 ms per frame; home page 4.10 to 2.43 MB per full scroll; About page 50.8 to 64.9 fps on an integrated GPU.

## How it works together

### The official diagram's model

The canonical picture is template `assets/diagrams/harness-loop-{light,dark}.svg`, generated by template `scripts/diagrams/harness-loop.mjs`. Every label links to the real file or skill.

```
INPUTS                        LOOP (clockwise, around "Manager session: one context holds the goal")
Kernel: CLAUDE.md always      Recall -> Plan -> Execute -> Audit -> Integrate -> (Recall)
  loaded; 6 ref files on      /recall  long-horizon  fable-mode  long-horizon  refine
  demand; TOKEN EFFICIENCY:            brainstorming             advocate, codex-review
  caveman, RTK, STK                    why                       arena, wow-loop, impartial-review
Skill library
Evaluators: CI, tests,        SUPERVISOR: STAGNATION WATCH (conditional intervention)
  audited evidence              2 audit fails on one step -> change approach
                                3 rounds, no new verified progress -> rewrite plan
OUTPUT
loop -> Candidate (branch + PR, evidence attached) -> checks pass? --merge-->
        Updated lineage (squash-merge to main, checkout pulled, lessons -> /refine)
        fail: "repair and retry, babysit-ci" back into the loop
        "lessons merge back into the firmware: kernel, skills, reference" -> Inputs
```

Inference: this is a closed loop; merged lessons rewrite the kernel, skills and reference files that feed the next run. The diagram hard-codes labels such as "6 reference files" and "gpt-6.1-sol". Neither the README build nor CI regenerates or checks it (template `scripts/readme/build.mjs`, `scripts/readme/verify.mjs`).

### Layer 1: kernel and token efficiency

- **`CLAUDE.md`** opens "Kernel rules. Read first. Cross-cutting only." Sections: project identity (FILL IN markers that `init-project` fills), prose mode, cleanup, verification, core principles, subagents, git, environment, reference index, Codex compatibility. Git: on "Complete", commit, push and open or update the PR; squash-merge by default; no force-push (template `CLAUDE.md`).
- **`AGENTS.md`** is the Codex boundary. Codex reads only three `CLAUDE.md` sections (What this project is; CRITICAL: Verification; Environment & deploy target), never runs the Claude hook, spawns subagents with `fork_turns: "none"`, and calls `rtk` explicitly because Codex has no rewrite hook (template `AGENTS.md`).
- **SessionStart hook** (template `.claude/hooks/session-start.sh`) prints the caveman-ultra directive, an unslop routing note and a reminder of `caveman`, `recall`, `brainstorming` and `codex-review`. It fetches origin with up to 4 attempts, waiting 2, 4 and 8 s between them (the script's comment also lists 16 s, but that wait never happens). It checks template drift at most every 604,800 s (7 days) and suggests `/sync-starter`, warns when the plugin sits on top of the template, and in cloud sessions rebases onto `origin/main`; local sessions only fetch.
- **Output style** `.claude/output-styles/caveman.md`, selected by `outputStyle`, carries the same caveman contract.
- **Permissions.** Allowed: read-only commands plus `git add/commit/push/merge` and `gh pr create/merge`. Denied: `git push --force*`, `git push -f *`, `gh pr merge --admin*` (template `.claude/settings.json`). Inference: the allow list removes prompts; nothing (hook or permission) enforces review before merge.
- **Token tools.** `caveman` shortens replies; `context-weight.sh` estimates always-loaded weight as chars/4; `optimize-context` trims it and reports byte deltas apart from token claims. RTK (`rtk-ai/rtk`) and STK (`ryanportfolio/STK`) are separate binaries the firmware points to and does not install.

**Verification wiring.** Visual checks use headed Chrome on the real GPU through `launchPlacedChrome()` (template `scripts/lib/launch-chrome.mjs`, with `scripts/lib/window-place.ps1` placing the window on a monitor the user is not using and handing focus back). Never headless (WebGL falls back to the CPU), never minimized (rAF drops to 1 fps). For subagent or parallel browser work, each agent opens its own browser through `mcp__playwright-iso__*` or `launchPlacedChrome()`. Template `.mcp.json` defines `playwright-iso` as `npx @playwright/mcp@latest --isolated`. The shared Playwright plugin and the desktop Browser pane each hold one browser and deadlock a second user (template `CLAUDE.md` Verification). `@latest` is unpinned, so inference: the MCP version can drift between runs.

### Layer 2: project memory

- **Six files** (template `.claude/reference/*.md`): `architecture.md` (flow, auth, state); `commands.md` (build, dev, test); `deployment.md` (target, artifacts); `pitfalls.md` (gotchas, dated, newest last, split by area past about 200 lines); `secrets.md` (names and purposes, never values); `tech-stack.md` (non-default picks and why). All ship as skeletons; the template's own `pitfalls.md` stays empty by design.
- **Save rules** (template `.claude/skills/recall/SKILL.md`). Pitfalls save without asking; every other fact needs user authorization, else the session proposes the note. A saved fact must change future decisions, be durable (not task status) and carry evidence. A stale fact is amended in place with one line: `retired YYYY-MM-DD: <old claim>; reason: <what changed>`.
- **Audit.** `memory-audit.mjs` reports never-read files and dated entries older than six months. Advisory only; counts are lower bounds; it reads local Claude transcripts only (template `.claude/scripts/memory-audit.mjs`).

### Layer 3: skill library

- Skills live in template `.claude/skills/<name>/SKILL.md` (canonical) and `.agents/skills/<name>/` (Codex). Only the name and description load every turn.
- Every Claude skill is registered in template `.agents/skill-modes.json` as `native` (hand-maintained Codex port) or `disabled` (Claude only): 38 entries, 33 native and 5 disabled. Template `.agents/skill-sources.json` holds a SHA-256 hash of each covered Claude skill folder (31 entries); editing any file in that folder is drift until the port is updated and re-baselined.
- The manifest groups 38 skills as core, discipline and specialist: 7, 16 and 15. The README shows 7, 14 and 15 for its 36 Claude skills, leaving out the Codex-only `external-review` and `opus-fullreview` (template `.agents/template-manifest.json`, `README.md`).
- Descriptions are capped at 240 characters and the Codex catalog at 7,000 characters (template `.claude/scripts/test-codex-contract.mjs`). Full catalog: `product-skills.md`.

### Layer 4: the loop and its supervisor

| Stage | Skills | Rule |
|---|---|---|
| Recall | `recall` | Read the reference files before unfamiliar work. |
| Plan | `brainstorming`, `dare`, `why`, `writing-plans`, `long-horizon` | Pick one step with a done-check frozen before execution. |
| Execute | `fable-mode` | Classify the claim, prove it at the layer it is made, report VERIFIED, NOT VERIFIED or INCONCLUSIVE. |
| Audit | `long-horizon` Auditor, `advocate`, `codex-review`, `arena`, `wow-loop`, `impartial-review` | Executor reports count only as claims. |
| Integrate | `refine` | Only audited results enter "Verified progress". |

The supervisor is `long-horizon`'s stagnation rules: the same step failing audit twice forces a new approach; three rounds with nothing newly verified force a rewrite of the Remaining list; at max(5, 2 x initial step count) rounds the Manager reassesses the plan (template `.claude/skills/long-horizon/SKILL.md`). `wow-loop` and `perf-loop` have their own stop rules.

### Layer 5: review and the PR gate

- `codex-review` is a single-context Codex review on `gpt-6.1-sol` at high effort. `codex-fullreview` has Codex run `impartial-review` as Manager over sub-reviewers. `merge-ready` runs both in parallel, fixes confirmed findings, commits and pushes each round, then reruns `codex-review` alone, at most 3 reruns after round 1, and never merges (template `.claude/skills/merge-ready/SKILL.md`). Every review skill verifies each finding locally and reports attribution such as "N of M findings survived verification".
- `babysit-ci` watches checks and fixes failures, capped at 3 fix pushes; it never merges. A project's own `ci.yml` comes from `init-project` through `write-ci-workflow.mjs` and includes a `firmware` job running the Codex sync check. The template runs `validate-template.yml` (gates listed under "Contributing to the template").
- The user's global `CLAUDE.md` adds that nothing merges before `/codex-review` has run on the PR and its findings are fixed or waived. That rule lives outside the template.

### Layer 6: human approval

Merge and release stay with a person. `merge-ready` and `babysit-ci` never merge. Auto-merge needs explicit intent in the current session; Caveman Ultra is a communication default, not permission for side effects (template `AGENTS.md`). Invoking a skill does not authorize commit, push, PR, merge, deploy or installs unless the skill says so; most skills state this (for example `arena`, `lab`, `dare`, `long-horizon`, `init-project`, `adopt-repo`, `addskill`). The site says "a human approves" merge and release (`site/index.html`).

### Layer 7: refine and sync back to the template

1. `refine` finds the smallest justified change. Quirks and facts go through `recall`; repeatable procedures become a skill through `addskill`.
2. `sync-starter` Direction B carries a generic improvement back: genericize it, open a template PR, and bump the plugin `version` when the shared surface changed. For a native skill, update the Codex port and run `sync-codex-skills.mjs --baseline <name>`; a disabled skill only needs `--check` (template `.claude/skills/sync-starter/SKILL.md`).
3. Other projects pull it with Direction A. The hook's weekly drift nudge prompts that pull. Harness-Console's skill sync opens PRs on `harness-sync/<template commit>` branches across the user's clones. Nothing is applied to other projects automatically.

## The main chains end to end

### Idea to merged PR

1. **Clarify.** `brainstorming` picks a lane (Skip, Quick alignment, Full design), or `dare` questions the problem in four isolated stages and hands its tree and audit table to `writing-plans`.
2. **Plan.** `writing-plans` orders verifiable steps, each with an observable outcome and a completion check.
3. **Build.** Small work runs directly under `fable-mode`; big work runs in `long-horizon` rounds (Plan, Execute, Audit, Integrate). A stuck step can go through `arena`; visual work can use `wow-loop`, or `lab` for hand tuning; performance work uses `perf-loop`.
4. **Challenge** (optional, on request): `why` checks a recommendation, `advocate` checks a change.
5. **Commit and open a PR** on "Complete": verified to the environment's limits. Run `gh pr list --head <branch>` first so you never open a second PR.
6. **Watch CI.** `babysit-ci` diagnoses before it waits: one cause per push, at most one flake rerun, stop after 3 fix pushes.
7. **Review gate.** `/codex-review`, or `/merge-ready` for the two-review loop. A personal `/merge` skill reads `merge-ready` as its gate; it is not in the template (the template removed its own `merge`, template `.claude/skills/PROVENANCE.md`).
8. **A person approves**, and the PR squash-merges.

### Failure to saved lesson

1. A quirk costs a retry, a backed-out change or a user correction. Confirm the cause; a guess does not count.
2. `recall` saves it to `.claude/reference/pitfalls.md` without asking, amending an existing entry over adding one. `babysit-ci` routes CI quirks the same way.
3. The file is tracked, so the next commit carries it everywhere. Committing still follows normal git authorization.
4. The next session runs `/recall <topic>` before unfamiliar work, changes its action, and cites "per pitfalls.md (date): ...".
5. Recurring friction goes to `refine` (three checks for a failure fix, the user's own words for a preference). A repeating procedure becomes a skill through `addskill`.

### One project to the template and the next project

1. **Start.** Template route: GitHub template, `bootstrap/new-claude-project.sh`, the Windows launchers, Harness-Console or this site's `/new`. Adoption route: `adopt-repo` overlays the firmware onto an existing repo and keeps its history. Every creator reads the manifest, removes `templateOnly` paths and writes a stub README.
2. **Configure.** `init-project` fills the FILL IN sections from detected facts, asks only for what it cannot detect, offers a skill profile, generates CI and wires the `starter` remote.
3. **Work and learn.** Project-only lessons stay local.
4. **Promote.** `sync-starter` Direction B strips project names, paths and stack assumptions and opens a template PR. Template CI runs on push and pull_request; only squash merges. Bump the plugin version if the shared surface changed.
5. **Pull.** Direction A diffs only shared paths, picks changes from a numbered list, merges `settings.json` instead of overwriting, and never bulk-pulls `CLAUDE.md` or `.claude/reference/*`.

### Long work across sessions

1. Invoke `/long-horizon` (`$long-horizon` in Codex). Under about 3 dependent steps, skip it and use `fable-mode`.
2. The Manager writes `.tmp/long-horizon/<slug>/state.md`: Contract (numbered, versioned acceptance checks), Amendments, Verified progress, Remaining, Current round, Dead ends, Method notes, Audit log.
3. Each round: baseline manifest of hashes with `scripts/manifest.mjs`; pin the snapshot under `refs/long-horizon/<slug>/round-<N>`; write the auditor brief and record its sha256; then the executor brief.
4. A fresh executor runs on the brief alone. A fresh auditor gets the pre-written brief only, never the executor's report, and returns status, integrity and contract verdicts. A round passes only on complete + clean + aligned.
5. Passes go to Verified progress. Failures get one recovery round when the auditor marks them repairable; otherwise the approach goes to Dead ends.
6. To resume after compaction, read the state file and reconcile it with the workspace. If it changed in the last 30 minutes or a worker still runs, ask before taking over.
7. At phase end run `codex-fullreview` on the phase diff (`codex-review` if small) and fix surviving findings in an audited round; one PR per phase is allowed. A last fresh auditor runs every acceptance check; the report draws only on Verified progress, and "unfinished" is a valid report.
8. Parallel sessions coordinate through `session-hub`, an append-only `HUB-<slug>.html` ledger with exclusive scope claims.

## Runtimes

| | Claude Code | Codex |
|---|---|---|
| Kernel | `CLAUDE.md` (all) | `AGENTS.md` plus three `CLAUDE.md` sections |
| Skills | `.claude/skills/` (canonical) | `.agents/skills/`: hand-maintained native ports, never generated adapters |
| Memory | `.claude/reference/` through `recall` | Same, through `recall`. Do not enable Codex built-in memories |
| Hook and style | SessionStart hook, caveman output style, permissions | Never run `session-start.sh`; Caveman Ultra comes from `AGENTS.md` |
| Subagents | Agent tool | Exposed multi-agent tools with `fork_turns: "none"`; config flags do not prove the tools exist |
| Workflow tool | Available (`long-horizon-workflows`) | No equivalent |
| RTK | Applied by an installed rewrite hook | Call `rtk` explicitly; native commands for mutations and exact output |
| Cross-vendor review | `codex-review`, `codex-fullreview`, `astra-*`, `merge-ready` | `claude-review`, `opus-fullreview` |

Sources: template `AGENTS.md`, `.agents/CODEX-SKILL-COMPATIBILITY.md`, `.agents/codex-tools.md`. A same-vendor review gives fresh context, not vendor independence, and the result must say so. Never ship a generated adapter; `--write` deletes generated adapters, except under an enabled native skill (template `.claude/scripts/sync-codex-skills.mjs`).

## How people get it

| Path | For | What you get |
|---|---|---|
| Plugin `claude-starter` (v1.7.0, template `.claude-plugin/plugin.json`) | An existing repo on Claude Code | Skills and output styles only. `/plugin marketplace add ryanportfolio/Harness-Firmware`, then `/plugin install claude-starter@claude-starter`; skills are namespaced `/claude-starter:<skill>` (template `README.md`) |
| GitHub "Use this template" | A new repo, or Codex support | The full template; run `init-project` after. Template-only files must still be removed |
| `bootstrap/new-claude-project.sh` | macOS, Linux | `gh repo create --template` when gh is signed in, else a shallow clone; strips `templateOnly` and writes the stub. Needs git and node; no offline mode |
| `bootstrap/New-ClaudeProject.cmd`, `New-ClaudeProject-UI.cmd`, `new-claude-project.ps1` | Windows | Same flow through `NewProjectCore.psm1`; the UI release zip bundles an offline snapshot |
| `adopt-repo` skill | Someone else's codebase | A private mirror that keeps history, firmware overlaid and configured |
| Harness-Console (`ryanportfolio/Harness-Console`) | The owner's local fleet | New-project, skill-sync PR and DSH-install tabs, manifest-driven; ports 43127 and 4545 on 127.0.0.1 |
| This site's `/new` | Anyone with a GitHub account | Hosted creator (`product-site.md`) |

Helpers: `bootstrap/retarget-fork.sh <owner>/<repo>` repoints a fork's template references. `bootstrap/setup-machine.ps1` (PowerShell only) copies personal files from `bootstrap/machine/home-claude/` into `~/.claude`; it skips `*.example` files, `-Force` overwrites, `-DryRun` previews. At the pinned commit that folder holds only `CLAUDE.md.example` (template `GUIDE.md`).

**The manifest is the hub** (template `.agents/template-manifest.json`, version 1): `requiredFiles` 5; `projectPaths` 9 (including `.mcp.json`, `scripts/lib`, `docs/codex-skills.md`); `templateOnly` 16 (for example `.claude-plugin`, `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `GUIDE.md`, `LICENSE`, `bootstrap`, `docs/research`, `docs/specs`, `validate-template.yml`); `readmeStub` `# {name}\n`; `skills.required` `external-review`, `init-project`; `skills.dependencies` (for example `codex-review` needs `external-review`; `merge-ready` needs `codex-fullreview` and `codex-review`); `presets.minimal.omit` 7 skills (`advocate`, `enhance-prompt`, `fable-mode`, `forge-repo-ui-skill`, `handoff-audit`, `lab`, `why`). An unknown version or top-level key stops a consumer (template `docs/specs/2026-10-01-template-manifest-design.md`).

## Vocabulary

- **Firmware / harness.** The rule, memory, skill, hook and script layer that shapes agent behavior in a repo. "Harness" is a real term here, not a style tell.
- **Template / starter.** `ryanportfolio/Harness-Firmware`. Older names: `claude-starter` (still the plugin id, `Sync from claude-starter` commits, `AGENTS.md` Starter Maintenance) and `AI-Firmware` (profile README link).
- **Spawned project.** A repo created from the template; it freezes at its spawn date until synced. **Kernel**: `CLAUDE.md` or `AGENTS.md`, always loaded, cross-cutting only.
- **Reference / project memory.** `.claude/reference/*.md`, committed, loaded on demand. **Pitfall**: a confirmed quirk that cost a retry, a backed-out change or a correction; saved without asking.
- **Skill.** A folder whose `SKILL.md` has a name and description; only those load every turn. **Native / disabled / port**: Codex registry states; a port is the hand-maintained Codex copy of a native skill. **Baseline**: the recorded hash of the Claude skill folder a port matches (`skill-sources.json`).
- **Manifest, `templateOnly`, `readmeStub`.** `.agents/template-manifest.json`; paths stripped from new projects; the README that replaces the template's. **Removal record**: `.agents/removed-skills.json`, a deliberate deletion that silences missing-skill warnings.
- **Starter remote.** The `starter` git remote `sync-starter` uses. **Drift**: differences between a project, or this site's catalog, and template main.
- **Caveman ultra / unslop.** The terse default chat style, and its built-in removal of filler and AI tells.
- **Fresh context.** A subagent that receives only a self-contained brief, no history. **Leaf reviewer**: may not spawn agents, start nested reviews or edit.
- **Cross-vendor.** A reviewer from a different model vendor than the author. Codex reviewing Codex is not cross-vendor.
- **Sol / Astra / Fable.** Model names in pins: `gpt-6.1-sol`, `gpt-6-astra`, Claude alias `fable`.
- **Manager / Executor / Auditor.** `long-horizon` roles. **Round**: one step, one executor, one audit. **Done-check**: the frozen acceptance check. **Dead ends**: approaches ruled out. **Stagnation / supervisor**: rules that force a new approach or plan rewrite.
- **Author brief.** Facts-only context given only to the intent reviewer (Bucket F). **Buckets A to G**: `impartial-review` coverage areas.
- **Gating check / `bar.md`.** `wow-loop`'s frozen acceptance checks from a named reference. **Triage**: `perf-loop`'s ranked measurement of every dimension before any change. **VERIFIED / NOT VERIFIED / INCONCLUSIVE**: standard verdicts from `fable-mode` and `evaluation.md`.
- **RTK / STK.** External binaries: RTK filters shell output (`rtk-ai/rtk`); STK outlines large file reads (`ryanportfolio/STK`).

## Claims to avoid or qualify

- **Skill counts.** Say what each number counts. Template `.claude/skills/` holds 37 directories: 36 skills with a `SKILL.md` plus the retired `writing-skills` (reference files only). README: 36 Claude, 33 Codex. Site About page: 36. `site/new.html` and `site/skills.html`: 38, which is those 36 plus the Codex-only `external-review` and `opus-fullreview` (inference, consistent with `skill-modes.json`: 33 native + 5 disabled = 38). Template `.agents/skills/` holds 35 directories: 33 with a `SKILL.md`, plus `writing-skills` and `humanizer` (a leftover `patterns.md` with no `SKILL.md` and no registry entry, kept from the `humanizer` skill folded into `writing`; template `.claude/skills/PROVENANCE.md`). Neither leftover counts toward 36, 33 or 38.
- **Token savings.** 87,000 / 3,400 / about 9,700 are site estimates without the template's caveat. Template `GUIDE.md` calls its measure "a source-file trend measure, not runtime billing"; `context-weight.sh` says "an approximation for trend lines, not billing". MCP tools, marketplace descriptions and auto-memory are excluded. `optimize-context` forbids extrapolating local byte cuts into per-turn savings. RTK's "up to 90%" covers bash output only (`rtk-ai/rtk` README). STK's `stk gain` is an upper bound, and STK is unverified on macOS and Linux (`ryanportfolio/STK` README). Caveman's "about 50% shorter" is an estimate with no log (`ryanportfolio/savetokens` README).
- **"Self-improving."** Improvements are proposed, reviewed and merged by a person, never applied automatically. The `refine` evaluation record's effect on future tasks "remains unmeasured" (template `docs/research/2026-09-13-rsi-harness.md`). Structural checks do not prove behavior.
- **Field log** numbers come from one project, seven sessions over three days. **Illustrative demos** (hero, explainer, arena, long-horizon) are not measurements.
- **Cross-vendor / full review.** Never call a same-vendor review cross-vendor. A full review requires sub-reviewers that actually spawned; with zero, report it incomplete.
- **Merge and CI.** `merge-ready` and `babysit-ci` never merge; permissions allow `gh pr merge` and nothing in the template enforces review first. Never say CI passes until a GitHub run shows it. README drift and missing skills only warn.
- **Model ids** (`gpt-6.1-sol`, `gpt-6-astra`, `fable`, `opus`) are pins, not proof of availability. Skills confirm locally and never substitute silently.
- **RTK and STK** are external. Say "supported" or "pairs with", not "includes".
- **Diagram.** `harness-loop` labels are hard-coded; no check regenerates or diffs it, and the README generator does not embed it.
- **Snapshot lag.** `site/new/upstream-skills.json` on main records template commit `16ff5b3`, not `bbd0b5f`.
- **Unshipped work.** The eval-flywheel plan's replay scenarios (`.claude/evals/`) are absent at `bbd0b5f` and not in the CHANGELOG, so treat them as not shipped. Plan item P1 (`memory-audit.mjs` with `test-memory-audit.mjs`) is present. Whether its other items shipped was not checked (template `docs/superpowers/plans/2026-09-26-eval-flywheel.md`).
- **Retired names.** `unslop` and `writing-skills` are retired in both runtimes; cleanup routes to `caveman` and `writing`, authoring to `addskill`. Do not revive them (template `docs/codex-skills.md`).
- **Model floor.** This site's `CLAUDE.md` forbids Sonnet and Haiku subagents; the template's says omit `model` unless the user names one. An explicit user instruction in the session decides; flag the conflict rather than choose silently.

## Rules for changing the firmware

From the kernel's Core principles (template `CLAUDE.md`; same intent in this repo's `CLAUDE.md`):

- The kernel stays cross-cutting and thin; it loads every turn. Area detail goes to `.claude/reference/`.
- New kernel rules, skills and reference entries must earn their place. Prefer pruning stale content over adding. Improve an existing skill before adding a neighbor (template `CONTRIBUTING.md`).
- Never restate what the harness already injects (skills list, environment block, tool docs). See `/optimize-context`.
- The "What this project is" section is a FILL IN capped at about 10 lines; `init-project` fills it, and the FILL IN markers alone do not authorize running setup.
- Prose default lives in two places that must agree: `CLAUDE.md` "Default prose mode" and the three marked caveman blocks in the hook (template `GUIDE.md`).
- Run `bash .claude/scripts/context-weight.sh` before and after; if a change adds always-loaded weight, say so in the PR and say what it buys (template `CONTRIBUTING.md`).
- Skill changes follow the checklist in `product-skills.md`.

## Contributing to the template

From template `CONTRIBUTING.md`, `CHANGELOG.md`, `GUIDE.md` and `.github/workflows/validate-template.yml`:

- **PR flow.** One open PR per unit of work; squash merge. No secrets, tokens, private checkout paths, maintainer-only mandates or local-machine assumptions in shipped files. Runtime-specific rules stay runtime-specific.
- **ASCII.** CONTRIBUTING says shipped files are ASCII-only; CI enforces it only for `bootstrap/`, because Windows PowerShell 5.1 decodes BOM-less files as ANSI and multi-byte characters break the parse.
- **Changelog.** Keep a Changelog 1.1.0 format, aiming at Semantic Versioning. User-visible changes go under an unreleased or upcoming version heading. Boundaries before 1.2.0 are reconstructed from git history. Latest release at the pin: 1.7.0, 2026-10-01.
- **Plugin version.** Bump `version` in `.claude-plugin/plugin.json` when a change touches the shared surface (`.claude/skills`, `.claude/hooks`, `.claude/output-styles`, `.claude/settings.json`): patch for fixes, minor for new skills. Plugin installs only update when this number changes; spawned projects get changes through Direction A regardless (template `.claude/skills/sync-starter/SKILL.md`).
- **Manifest coverage.** A new file outside listed paths needs a `projectPaths` entry (new projects get it) or a `templateOnly` entry (it maintains or distributes the template). Every skill folder sits in exactly one group.
- **CI gates** (`validate` on Ubuntu, then `generator-smoke` on Windows), in order: `bootstrap/` ASCII-only; PowerShell scripts parse; hooks pass `bash -n`; POSIX bootstrap `bash -n`, `shellcheck` and `--help`, plus the smoke script parsed and linted; `check-template-manifest.mjs` and its test; POSIX creator smoke build (gh blocked); `sync-codex-skills.mjs --check`; `test-codex-contract.mjs`; sync and copies tests; long-horizon manifest test; CI generator test; memory-audit test; `removed-skills.mjs` (warns only); README tests; README `verify.mjs` (warns only); `settings.json` and both plugin manifests parse as JSON. `generator-smoke` runs `bootstrap/tests/Test-NewProjectGenerator.ps1`.
- **Issues.** Bug and skill-proposal templates live in `.github/ISSUE_TEMPLATE/`. A good report names the harness, the skill and what the agent actually did.

## Where to look

| Template path | Holds |
|---|---|
| `CLAUDE.md`, `AGENTS.md` | Kernel and Codex boundary |
| `.claude/reference/` | Six memory skeletons |
| `.claude/skills/<name>/`, `.claude/skills/PROVENANCE.md` | Claude skills; upstream origins and licenses |
| `.agents/skills/`, `skill-modes.json`, `skill-sources.json`, `removed-skills.json`, `CODEX-SKILL-COMPATIBILITY.md`, `codex-tools.md` | Codex layer |
| `.agents/template-manifest.json` | What ships, what is stripped, skill groups and rules |
| `.claude/settings.json`, `.claude/hooks/session-start.sh`, `.claude/output-styles/caveman.md`, `.mcp.json` | Settings, hook, style, isolated Playwright MCP |
| `scripts/lib/` | `launch-chrome.mjs`, `window-place.ps1`: headed Chrome placement |
| `bootstrap/`, `bootstrap/machine/home-claude/`, `bootstrap/tests/` | Creators, `retarget-fork.sh`, `setup-machine.ps1` and its seed files, creator tests |
| `.claude-plugin/plugin.json`, `marketplace.json` | Plugin `claude-starter` |
| `.github/workflows/validate-template.yml` | Template CI |
| `README.md` (generated by `scripts/readme/`), `GUIDE.md`, `CHANGELOG.md`, `CONTRIBUTING.md` | Docs |
| `scripts/diagrams/harness-loop.mjs`, `assets/diagrams/` | Official diagram |
| `docs/codex-skills.md`, `docs/specs/`, `docs/research/`, `docs/superpowers/plans/` | Skill maintenance, design and research records |

`.claude/scripts/` (14 files; "CI" means `validate-template.yml` runs it):

| Script | Role |
|---|---|
| `doctor.mjs` | One-command health check: settings and hook, skill frontmatter, Codex registration and drift, skill coverage and removal record, reference library, leftover FILL IN markers, plugin manifests, INFO line for context weight. Exit 1 on any FAIL. Not in CI |
| `context-weight.sh` | Always-loaded weight, chars/4. Not in CI |
| `memory-audit.mjs` | Advisory read/write counts from local Claude transcripts. Not in CI |
| `sync-codex-skills.mjs` | Registration and drift: `--check` (CI), `--baseline <name>`, `--write` |
| `check-codex-skill-copies.mjs` | Read-only byte comparison of personal skill copies against `.agents/skills` (`<personal-skills-root>` argument). Not in CI |
| `removed-skills.mjs` | Prints the removal record; warns on missing, required or dependency breaks (CI, warn-only) |
| `write-ci-workflow.mjs` | Builds a project `ci.yml` for Node, Python, Rust, Go; prints by default, `--write`, `--force` |
| `test-codex-contract.mjs` | One classification per active skill; Codex routing within budget (CI) |
| `test-sync-codex-skills.mjs`, `test-codex-skill-sync.mjs`, `test-codex-skill-copies.mjs` | Sync preserves standalone workflows; copies check (CI) |
| `test-long-horizon-manifest.mjs`, `test-write-ci-workflow.mjs`, `test-memory-audit.mjs` | Tests for the manifest script, CI generator and memory audit (CI) |

Related repos (all `ryanportfolio/`): `Harness-Console` (local create, sync, DSH install, manifest-driven); `STK` (file-read outlining); `savetokens` (token datasheet behind savetokens.tips); `winuse-mcp` (Windows computer-use MCP; inference: it backs the `winuse` skill); `dsh-branchline` (fresh-origin worktrees for DeepSeek Harness); `good-codex-subagents` (Codex subagent discipline); `tracebench` (replayable agent evals); `fullbuild.ai` (portfolio with a Harness Firmware page); `ryanportfolio` (the owner's profile README plus an agentic-SDLC audit tool, `AUDIT.md`; the README links to `AI-Firmware` and to fullbuild.ai/harness-firmware); `Corewise.Academy` (guides).

Changes to the manifest's shape, the skill folder layout, `skill-modes.json`, `skill-sources.json`, `removed-skills.json` or the sync scripts can break Harness-Console and this site's creator. Check both.
