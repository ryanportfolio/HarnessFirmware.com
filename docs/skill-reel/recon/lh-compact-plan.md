# Recon: long-horizon, smart-compact, deep-plan

Source of truth: ryanportfolio/Harness-Firmware at commit `64e8f247dc7ca70cd6b03ac78f8786df06813c5c`, read through `gh api`. PR #208 read with `gh pr view 208`. Line numbers are at that commit.

Source keys used below:

- LH = `.claude/skills/long-horizon/SKILL.md`
- MF = `.claude/skills/long-horizon/scripts/manifest.mjs`
- DP = `.claude/skills/deep-plan/SKILL.md`
- SCR = `.claude/skills/smart-compact/hooks/register.ts`
- SCP = `.claude/skills/smart-compact/.claude-plugin/plugin.json`
- SCH = `.claude/skills/smart-compact/hooks/hooks.json`
- MK = `.claude-plugin/marketplace.json`
- CL = `CHANGELOG.md`
- IT = `scripts/readme/items.json`
- SM = `.agents/skill-modes.json`
- PR208 = description of Harness-Firmware PR #208 (merged, 4/4 checks passed)

Folder contents at the commit: `long-horizon/` holds `SKILL.md` and `scripts/manifest.mjs` only; there is no `references/` folder (directory listing returned 404). `smart-compact/` holds `.claude-plugin/plugin.json`, `hooks/hooks.json`, `hooks/register.ts` and no `SKILL.md`. `deep-plan/` holds `SKILL.md` only.

---

## 1. long-horizon

### What it is

- Skill title: "long-horizon: run big tasks in audited rounds". (LH:5)
- Three roles: Manager, Executor, Auditor. The current context is the Manager: it holds the goal, keeps the state file true, and delegates every round. Executors and auditors are fresh subagents. (LH:7)
- Changelog origin line: "Manager/Executor/Auditor rounds with audit-gated durable state for tasks bigger than one context window". (CL:541-543)

### When to use it

- "work too big for one context window: long multi-step tasks, progress lost to compaction or failed retries, work spanning hours or sessions, or when the user says /long-horizon or asks to run a task in verified rounds." (LH:2)
- Not for small work: under about 3 dependent steps, skip the harness and run fable-mode directly. (LH:157)
- Size each step so one fresh context finishes it: one slice, one migration, one bug. (LH:154)

### Why it is useful (outcome)

- Only audit-passed results enter Verified progress, so the record of what is done holds only checked work. (LH:50, LH:106)
- A fresh context per round splits implementation from independent evidence. (LH:7)
- The run survives compaction and restarts by reading the state file back. (LH:50, LH:115)
- Failed approaches are recorded as Dead ends so they are not re-proposed rounds later. (LH:55)
- Final report comes from Verified progress alone; an unfinished run is a valid report stating what is verified and what remains. (LH:149)

### Mechanism, step by step

State saved where:

1. State file: `.tmp/long-horizon/<task-slug>/state.md` (gitignored scratch), created before round one. (LH:11)
2. State file sections: Contract (Goal, Acceptance as a numbered list of checks, Version), Amendments, Verified progress, Remaining, Current rounds, Dead ends, Method notes, Audit log. (LH:13-48)
3. Each Current round block records Round, Batch, Phase (`planned | executing | awaiting-audit | audited`), Contract version, Workspace, Workers, Step, Done-check, Write scope, Baseline, Auditor brief path, Residue. (LH:29-38)
4. Long-lived processes a worker starts (pid, port, command) are appended to `processes.log` in the task dir. (LH:95)
5. Evidence files are copied into `evidence/round-<N>/`. (LH:84, LH:107)
6. Baseline = a manifest file (path plus content hash) under the task's `.tmp` dir, plus a Git snapshot from `git stash create` pinned with `git update-ref refs/long-horizon/<task-slug>/round-<N> <sha>` so gc cannot prune it across sessions. (LH:97)
7. `scripts/manifest.mjs` builds that manifest (`<root> <out.json> --ref <ref> [paths]`) and diffs it for audit (`--diff <out.json>`). (LH:97; MF:4-12) It hashes with sha256 every dirty tracked file, every untracked file, and every file under extra paths; records deleted paths, HEAD and the stash snapshot. (MF:5-8) Anything it could not inspect is listed under `uncovered`, never reported as clean or deleted. (MF:16-17)

What a round is (Round loop, LH:89-107):

1. Plan: read the state file, pick a batch, write each round's Current round block with phase `planned` before spawning anything. Each round works ONE step. Then per round: take Baseline, write the auditor brief to its recorded path, write the executor brief. The Done-check is frozen from here. (LH:91)
2. Execute: phase `executing`; spawn a fresh subagent with the brief alone, no Manager history. It does the step and reports changes and how to check. Then phase `awaiting-audit`. (LH:98)
3. Audit: spawn a second fresh subagent with the prewritten auditor brief and nothing else. (LH:99) The auditor (a) rebuilds the manifest and diffs it against Baseline, (b) runs the done-check itself from the recorded cwd, (c) returns three verdicts: status complete / incomplete / blocked; integrity clean / suspect / violation; contract aligned / drifted. (LH:100-105)
4. Integrate: pass means the step moves to Verified progress with auditor evidence. Fail means affected claims are marked stale, findings appended, and the next round is scheduled by the auditor's `repairable` verdict. (LH:107)

What verifies a round:

- "Executor report = claim; auditor inspection = evidence. Only complete + clean + aligned enters Verified progress." (LH:106)
- Auditor brief is pre-registered: written at Plan, before the executor exists, and dispatched unchanged; it can be checked by sha256 recorded at Plan. (LH:61)
- The auditor never sees the executor's turns or report. (LH:59)
- Auditors must be fresh context; never `subagent_type: fork` or any history-inheriting option. (LH:63)

How it resumes across sessions and compaction:

- "Resume from existing state file; reconcile w/ real workspace + latest user instructions." (LH:50)
- After compaction or restart: read state, reconcile workspace and latest user instructions, inspect recorded workers before touching a round; stop `processes.log` processes whose worker no longer runs. (LH:115)
- Reconcile by phase: `planned`, `executing` / `awaiting-audit`, `audited` each have a rule. (LH:119-122)
- If the state file changed in the last 30 minutes or a listed worker still runs, ask the user before taking over: "Two Managers writing one state file corrupt it." (LH:51)
- Drift guard: 3 rounds without a state-file write means stop and rebuild the file from the real workspace. (LH:109)

Other always-on parts:

- Parallel rounds: run as many safe rounds at once as rules allow; ready steps share a batch only if write scopes do not overlap, no shared resource (port, dev server, browser profile, DB, GPU), and capacity covers them. (LH:69-76) Each parallel round gets its own Git worktree. (LH:78)
- Stagnation: same step fails audit twice in a row means the next brief must change approach; three batches in a row with nothing new verified means stop spawning and rewrite Remaining. (LH:130-131)
- Completion: one last fresh auditor runs every current acceptance check against the final workspace before reporting. (LH:147)

### On-screen strings (each sourced)

- "run big tasks in audited rounds" (LH:5)
- "Manager, Executor, Auditor" (LH:7)
- "Verified progress" (LH:22)
- "Dead ends" (LH:40)
- "Audit log" (LH:46)
- "Plan", "Execute", "Audit", "Integrate" (LH:91, LH:98, LH:99, LH:107)
- `.tmp/long-horizon/<task-slug>/state.md` (LH:11)
- Phase labels: `planned`, `executing`, `awaiting-audit`, `audited` (LH:29)
- Verdicts: `complete`, `clean`, `aligned` (LH:106)
- "Executor report = claim; auditor inspection = evidence." (LH:106)
- "Dead ends = memory." (LH:55)
- "Audit independence = the point" (LH:155)

### False or risky to claim

- Do not show a `references/` folder; none exists at this commit. (directory listing)
- Do not show one round doing several steps: each round works ONE step. (LH:91)
- Do not show the executor or Manager marking work done. Only the auditor's own run can move a step to Verified progress. (LH:106)
- Do not show the auditor reading the executor's report. (LH:59)
- Conditional, not always-on: the draft review by another model family runs only for rounds whose execution or done-check costs hours; cheap rounds skip it. (LH:93)
- Conditional: Codex supervisor consult only on a stagnation trigger and only if Codex is logged in or a gateway is set; one consult per trigger. (LH:135-143)
- Conditional: cross-vendor review of a verification tool only when a round builds one. (LH:111)
- Conditional: `codex-fullreview` / `codex-review` at phase end, not per round. (LH:113)
- Conditional: parallel batches only when the overlap, resource and capacity rules allow; a sequential run is batches of one. (LH:69-76)
- Conditional: `git update-ref` pin applies to Git workspaces; non-Git workspaces use an equivalent snapshot. (LH:97)
- Do not claim the run never needs the user: ownership takeover, amendments, and missing user-owned decisions go to the user. (LH:51, LH:53, LH:159)
- Do not claim it publishes, installs, deploys or messages: "Invocation does not authorize publication, installation, deployments, or external messages." (LH:159)
- Do not claim auditors are a different model by default. Manager, executor and auditor may all be Claude; the skill names this as a shared-blindspot risk. (LH:135)
- Avoid a fixed round count on screen; the `max(5, 2 * initial step count)` figure is a reassessment threshold only, not a limit. (LH:158)

---

## 2. smart-compact

### What it is

- "write custom /compact instructions from the session, then compact with them" (SCP:4)
- "It is a Claude Code mod, not a skill: a plugin in `.claude/skills/smart-compact/` whose hooks module registers the command". (CL:51-52)
- Plugin manifest name `smart-compact`, version `0.1.0`. (SCP:2-3) Hooks module list: `{ "modules": ["./register.ts"] }`. (SCH:1)
- Replaced the `compact-review` skill in PR #208: "/smart-compact replaces it with the same review prompt and runs /compact itself". (CL:66-68; PR208 title "Replace compact-review with the /smart-compact mod")

### When to use it

- When the user wants to compact the session and keep what matters: the user types `/smart-compact`. (SCR:44-47; CL:49-50)
- Claude Code only. (CL:49) Works "in the terminal and in the desktop app's Code tab". (CL:54-55)

### Why it is useful (outcome)

- One command does the review and the compaction. (PR208 summary; CL:49-50)
- The summarizer gets explicit directions for what to keep, in priority order, instead of a default summary. (SCR:5-15)
- The session's named reply style, such as caveman, survives compaction as the first line of the instructions. (SCR:19; CL:56-58)

### Mechanism, step by step

Trigger: the user types `/smart-compact`. It does not fire on its own. (SCR:43-51)

1. At `session.start` the hooks module registers the command `smart-compact` with the description "Write custom /compact instructions from this session, then compact with them". (SCR:43-47)
2. On `command.run` for `smart-compact`, the status line shows `smart-compact: writing instructions`. (SCR:51-52)
3. A fork of the session, which sees the whole transcript, answers `REVIEW_PROMPT`. (SCR:3-4, SCR:53)
4. If the fork does not answer, the status clears and the command returns "review failed (<reason>); nothing compacted. Run /compact yourself." (SCR:54-57)
5. The fork's answer is one fenced `text` block; the hook takes its body as the instructions. (SCR:36-40, SCR:59)
6. Status changes to `smart-compact: compacting`. (SCR:60)
7. The command returns "compacting with these instructions:" followed by the block, so the user sees them. (SCR:65)
8. A timer fires 500 ms later and runs `/compact <instructions>` via `$.command.run`, because the engine refuses to run a command from inside the hook that still holds the turn. (SCR:61-63, SCR:73)
9. Retry: only the refusal for a command run from inside a hook is retried, every 1000 ms, 10 tries total. A cancelled or interrupted `/compact` stays cancelled. (SCR:63, SCR:76-80; PR208 "retrying every second up to 10 times")
10. If compaction fails otherwise, it logs "smart-compact: compaction failed (<err>). Paste the instructions above after /compact." (SCR:83)

What the instructions keep, in priority order (SCR:7-15):

1. The user's goal for the session and standing instructions or preferences (style, scope limits, things to never do).
2. Current state: repo, branch, worktree path, PR URL, last commit SHA, deploy or preview URL, files created or changed.
3. Decisions made and the reason for each, including options the user rejected.
4. What is verified and how, and what is still unverified.
5. Open work: next concrete step, pending questions, background tasks still running.
6. Failed approaches and gotchas that would otherwise be retried.
7. Exact identifiers verbatim: paths, commands, error strings, IDs, numbers.

What it tells the summarizer to drop: "resolved tangents, raw tool output, superseded plans, and anything re-readable from files or CLAUDE.md." (SCR:17)

Other rules in the prompt: "Never invent a fact; if a state item is unknown, leave it out." Keep the block under about 300 words; cut from the bottom of the priority list first. (SCR:17)

Output template lines (SCR:21-32): `Always use <reply style>.`, `Goal:`, `Keep:`, `State:`, `Decisions:`, `Verified:` / `Unverified:`, `Next:`, `Don't retry:`, `Verbatim:`, `Drop tool output, resolved tangents, and superseded plans.` Lines with nothing to say are omitted. (SCR:34)

What the user types: `/smart-compact`, nothing else. (SCR:45, SCR:51)

Install routes: the project copy in `.claude/skills/smart-compact/`; copy the folder to `~/.claude/skills/smart-compact/` for every project; or install `smart-compact@claude-starter` from the repo's marketplace. Installing `claude-starter` alone does not include it. (CL:58-62; MK:12-17)

### On-screen strings (each sourced)

- `/smart-compact` (SCR:45)
- "Write custom /compact instructions from this session, then compact with them" (SCR:46)
- `smart-compact: writing instructions` (SCR:52)
- `smart-compact: compacting` (SCR:60)
- "compacting with these instructions:" (SCR:65)
- Template line labels `Goal:`, `State:`, `Decisions:`, `Verified:`, `Next:`, `Don't retry:`, `Verbatim:` (SCR:23-30)
- "Drop tool output, resolved tangents, and superseded plans." (SCR:31)
- `Always use <reply style>.` (SCR:22)

### False or risky to claim

- Do not call it a skill or show a `SKILL.md`; it is a plugin mod with a hooks module. (CL:51; PR208 "a plugin folder with no SKILL.md")
- Do not show it firing automatically at auto-compaction or at a context threshold. The only trigger is the user typing `/smart-compact`. (SCR:43-51) Plain `/compact` and auto-compact are not intercepted by this code. (SCR, whole file: no hook other than `session.start` and `command.run`)
- Do not show a separate "review then decide" step; there is no longer a way to get the instructions without compacting. (CL:66-68)
- Do not claim it is available in Codex. Claude Code only. (CL:49, CL:68)
- Conditional: the `Always use <style>.` first line appears only when the session has a named reply style; otherwise it is left out. Do not show "caveman" as always present. (SCR:19; CL:56-58; PR208 "no longer always force `Always use caveman ultra.`")
- Conditional: on review failure nothing is compacted. (SCR:54-57)
- Do not claim a fixed summary length; "under about 300 words" is an instruction to the fork, not an enforced limit. (SCR:17)
- Risky: auto-loading the project copy from `.claude/skills/` was not verified in PR #208; only the global copy at `~/.claude/skills/smart-compact/` was shown loading in a debug log, and the model call did not run in that test. The end-to-end run was in the desktop Code tab with an earlier copy loaded from a dev-mods folder. (PR208 Verification) Do not show it as working out of the box in every new repo.
- Do not count it in the README skill total as a skill; PR #208 regenerated counts from 39 to 38 skills, and the repo scripts treat the folder as a resource folder. (PR208 Summary) It has no entry in IT (`grep` returned none).
- Do not show compaction as lossless or as keeping the full transcript; the prompt drops raw tool output and tangents by design. (SCR:17)

---

## 3. deep-plan

### What it is

- "deep-plan: interview a loose idea into decisions the user made" (DP:6)
- "Turn a loose idea on any subject (code, product, process, writing, a personal plan) into decisions the user made. Decisions belong to the user; facts are your job." (DP:10)

### When to use it

- "Use for /deep-plan: interview a loose idea in short rounds of decisions and stop for an explicit go before anything is built." (DP:3)
- Works with or without a repo. (DP:11)
- In Codex it starts as `$deep-plan` and Codex never starts it on its own; in Claude Code the model can also load it when asked. (CL:46-48)

### Why it is useful (outcome)

- Every decision is the user's own, recorded in the user's words; the assistant never answers a decision for the user. (DP:10, DP:76)
- Nothing gets built before an explicit Go. (DP:12, DP:89)
- A ledger file lets a later session resume. (CL:42-44; DP:17)
- The result is a handoff block other skills consume without reopening settled decisions. (DP:93)

### Mechanism, step by step

Round 0 (scope):

1. Look for an open ledger under `.tmp/deep-plan/*/ledger.md`. If one was updated within 30 minutes, warn that another session may be running it. Otherwise offer "a) Resume <slug> (Recommended)" or "b) Start new". (DP:17)
2. Else propose, in one popup: a one-sentence destination, the out-of-scope list, and a kebab-case slug of at most about 5 words. (DP:18)
3. If the idea is too big for one session, propose a split; a large piece can go to `long-horizon` later. (DP:19)
4. Goal and scope are settled by the user, never assumed. Round 0 starts at Q1; IDs never reset. (DP:20)

Ledger (the saved state):

- Path `.tmp/deep-plan/<slug>/ledger.md`, written whenever a working directory exists. (DP:24)
- Header line: `Status: open | Round: <n> | Next ID: Q<n> | Pace: <questions per round> | Updated: <ISO time>`. (DP:30)
- Table columns: ID, Title, Status, Answer (user's words), Depends on, Rejected options, Round. (DP:32)
- Statuses: `open`, `settled`, `assumed`, `unknown`, `parked`, `reopened`, `void`. (DP:38)
- Written after round 0, after each round's answers, on a premise change, at the gate, and on Go (`Status: closed`). Re-read before every round and after any compaction. (DP:40)

A round:

1. Frontier = open or reopened questions whose dependencies are all settled or assumed. (DP:46)
2. Ask only where a wrong guess forces rework; low-stakes items become assumptions with their own ID. (DP:47)
3. No question in a round may depend on another in the same round. (DP:48)
4. Cap: at most 4 questions per round, the ones with highest rework cost; the user can set a lower Pace. (DP:49)
5. Chat preface lists the round's assumptions and the line "Pick Other to override, ask for an explanation, say you don't know, or change a premise." (DP:54)
6. One `AskUserQuestion` popup with 1-4 questions. Header `Q<n> <topic>`, 12 characters or fewer, e.g. `Q12 Storage`. 2-4 options labelled `a) ...`, `b) ...`; the recommendation comes first and its label ends "(Recommended)". (DP:55-58)
7. With no popup tool, the same round is asked in chat in a fixed format. (DP:60-68)
8. Each answer is classified and echoed one line per question, e.g. `Q4 -> override: Postgres`. (DP:74)
9. A premise change voids dependent questions and shows e.g. "Dropped because Q3 changed: Q9 (cache), Q12 (storage)". (DP:80)
10. Look, feel or layout questions are parked and routed to another skill the user runs (`/arena`, `/dare`, `design-prototypes`, `/lab`), only if available. (DP:79)
11. Only a user reply ends a round. (DP:82)

Stop and go gate:

1. Stop when the frontier is empty and a short paragraph a newcomer could follow can be written on how the result works. (DP:86)
2. Recap in chat numbered by ID: decisions, assumptions, unknowns, parked items. (DP:87)
3. Pick the 1-3 weightiest decisions, run `why` on each, then ask once: "If this decision were reversed, what would go wrong?" (DP:88)
4. Gate popup with two questions: `Q<n> Go` with "a) Go (Recommended)" / "b) Not yet: reopen something", and `Q<n+1> Handoff` with "a) writing-plans (Recommended)", "b) long-horizon contract", "c) enhance-prompt", "d) None". "Go must be this explicit pick, never inferred from a round answer." (DP:89)

Artifact:

- On Go the ledger gets `Status: closed` and is rendered into a handoff block: Goal, Non-goals, Decisions (ID, choice, rejected options and why), Assumptions, Unknowns, Parked. (DP:93)
- For writing-plans or enhance-prompt the block is passed to that skill. For long-horizon the block is printed shaped as its Contract and Acceptance sections and the user gets the `/long-horizon` command; deep-plan does not start it. (DP:93)
- The receiving skill maps every decision ID to a step or N/A and does not reopen settled decisions. (DP:93)

### On-screen strings (each sourced)

- "interview a loose idea into decisions the user made" (DP:6)
- "Decisions belong to the user; facts are your job." (DP:10)
- `Q12 Storage` (DP:56)
- "a) ...", "(Recommended)" (DP:58)
- `Q4 -> override: Postgres` (DP:74)
- "Dropped because Q3 changed: Q9 (cache), Q12 (storage)" (DP:80)
- "If this decision were reversed, what would go wrong?" (DP:88)
- "a) Go (Recommended)" / "b) Not yet: reopen something" (DP:89)
- "a) writing-plans (Recommended)", "b) long-horizon contract" (DP:89)
- `.tmp/deep-plan/<slug>/ledger.md` (DP:24)
- Statuses `settled`, `assumed`, `parked`, `void` (DP:38)

### False or risky to claim

- Do not show more than 4 questions in one round. (DP:49)
- Do not show the assistant answering a decision, or the recommendation recorded as the answer. (DP:10, DP:76, DP:98)
- Do not show silence or a round answer counting as Go. (DP:89, DP:98)
- Do not show deep-plan building, drafting code, or starting long-horizon after Go. After Go it only hands off. (DP:12, DP:93)
- Do not show a fixed number of rounds; it stops when the frontier is empty. (DP:86)
- Conditional: the popup is used when the tool is exposed; otherwise a chat format stands in. (DP:60; CL:41-42)
- Conditional: the ledger is written only when a working directory and write permission exist. (DP:24, DP:42)
- Conditional: handoff options are only skills available in the session; None is always kept. (DP:89)
- Conditional: the `why` check runs only at the gate on 1-3 decisions, never inside rounds. (DP:88)
- Conditional: repo probing (files, git, code) only when a repo is present. (DP:11)
- Do not show a glossary, ADR, or "quick vs full mode" output; the skill rules them out. (DP:97)

---

## Cross-skill links (sourced)

- deep-plan can hand off to long-horizon as a Contract and Acceptance block; the user runs `/long-horizon`. (DP:93, DP:89)
- deep-plan proposes a split and sends a large piece to long-horizon later. (DP:19)
- long-horizon names "progress lost to compaction" in its trigger, and resumes from its state file after compaction. (LH:2, LH:115)
- deep-plan re-reads its ledger after any compaction. (DP:40)
- README group for both long-horizon and deep-plan: `discipline`; labels "Long horizon" and "Deep plan". (IT:53-55, IT:73-75)
- Both are registered `native` in `.agents/skill-modes.json`. (SM:18, SM:27)

## Unverified

- Whether `/compact <instructions>` in current Claude Code treats the argument exactly as summarizer instructions: the code and PR assert it (SCR:3-4, PR208), but this recon did not run it.
- Whether the project copy of smart-compact auto-loads from `.claude/skills/` in a fresh repo: PR #208 lists this as not verified.
- CL:48 says the Codex deep-plan is "classified Adapted" while SM:18 lists `deep-plan` as `native`; this recon did not reconcile the two. Avoid any Codex-mode claim for deep-plan on screen.
- `/lab`, named as a parking route in DP:79, was not checked for existence in the template at this commit.
