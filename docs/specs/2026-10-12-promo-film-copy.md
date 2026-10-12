# Promo film: on-screen copy

Every on-screen line is compressed to caveman ultra for strangers: fragments with no articles or filler, arrows for cause and sequence, and only the abbreviations a developer already knows (PR, CI, repo), while each line still names who does what to which file. The viewer already uses Claude Code or Codex, and the claim standard is the owner's: "better than the average setup, and it ships ready". Each Harness Firmware line names a specific mechanism and says it comes built in and switched on, where a stock user would have to find and wire up the parts themselves; the film never claims stock Claude Code or Codex cannot do something. Each quote beat and each x beat carries off-screen lines: `Stock:` (the stock parts a user would wire up, with their source) and `Edge:` (the Harness Firmware mechanism, named as an item on the audited list in `.tmp/long-horizon/promo-copy/claimable-edges.md` and tagged `[strong]` or `[ready]` to match it; the baseline is `docs/specs/2026-10-12-promo-film-stock-baseline.md`). The open leads with the owner's statement in the owner's words, each quote beat sets a "Best practice" group (the practice in plain words, a verbatim excerpt of a talk's quote, its speaker) beside an "In Harness Firmware" group (how Harness Firmware does it) with no wording that links a speaker to Harness Firmware, the person's step stays on screen wherever the loop appears, and the whole film reads in under 290 seconds at 3 words per second plus 1.5 seconds per beat.

## open
Line: Harness Firmware aims to solve the spikiness of agent quality by steering them to work better than they normally would through reliable and repeatable methods
Line: Models have basically solved code. They haven't solved reliable verification
Line: Harness Firmware is an ongoing engineering project to attack that bottleneck
Line: Harness Firmware · Claude Code + Codex repo template
Row: Repeated mistakes | Confirmed cause saved unasked to committed pitfalls.md
Row: Self-graded work | Other company's AI auto-reviews every PR
Row: Long jobs stall | 2 failed audits → new approach forced
Line: You give final *yes*
Line: No speaker reviewed or endorsed Harness Firmware
Edge: lessons, pitfall rule (row 1); cross-vendor, review on every PR in both directions (row 2); long-horizon forced new approach after two failed audits (row 3); sources as in m2, x1 and p2 [ready] [ready] [strong]
Sources: .claude/reference/product.md § What it is; product.md § Repeated mistakes; product.md § Failure to saved lesson; product.md § Layer 4: the loop and its supervisor; product.md § Layer 5: review and the PR gate; product.md § Layer 6: human approval; docs/promo/social-proof.md § How to use it; social-proof.md § A second vendor's model reviews every pull request, in both directions; social-proof.md § Notice when the agent is stuck repeating a failing approach, and change angle

## m1
Recommends: Define agent rules and policies once
Quote: "Define your guardrails, your agents, your docs, testing policies, really governance just one time"
Who: Davis Palmie · Factory
Talk: The Software Factory: From Bug Report to Production Code, AI Engineer
Tag: CLAUDE.md + /init-project
Answer: Template CLAUDE.md requires evidence before *done*
How: When asked, /init-project fills project sections, seeds notes from repo
Why: Working agreement on from day one
Readout: CHECK NOT RUN → RISK FLAGGED
Stock: parts a user would wire up for the working agreement: writing these rules into their own `CLAUDE.md` (the docs teach this kind of rule; `/init` "creates a file with build commands, test instructions, and project conventions it discovers"), Claude Code's built-in git instructions, and a project `verify` skill that `/verify` writes to `.claude/skills/verify/SKILL.md` (https://code.claude.com/docs/en/memory#set-up-a-project-claude-md, https://code.claude.com/docs/en/memory#write-effective-instructions, https://code.claude.com/docs/en/settings-reference#includegitinstructions, https://code.claude.com/docs/en/skills#run-and-verify-your-app)
Stock: for setup: `/init`, or interactive `/init` behind `CLAUDE_CODE_NEW_INIT=1`, which "explores your codebase with a subagent, fills in gaps via follow-up questions, and presents a reviewable proposal", prompted by the user to cover verification capability, the authoritative signal and deploy policy, which it does not ask about on its own (https://code.claude.com/docs/en/memory#set-up-a-project-claude-md)
Edge: rules, working agreement: the template `CLAUDE.md` ships rules switched on: inspect logs, run scripts and read code before claiming anything works; when the authoritative check cannot run, flag the risk instead of claiming a pass; Codex review on every PR; commit, push and PR on Complete, squash merge, no force-push; scope discipline (Harness-Firmware CLAUDE.md § CRITICAL: Verification, § Core principles, § Git: push on completion, § Codex review on every PR; docs/specs/2026-10-12-promo-film-stock-baseline.md § rules) [ready]
Edge: rules, /init-project: when the user asks for setup, `/init-project` fills the kernel's FILL IN sections (what the project is, what can be verified and which signal is authoritative, environment and deploy) from detected facts, asking only for consequential facts it cannot detect, and seeds `.claude/reference/` commands and tech-stack notes from the repo's manifests and deployment notes from its actual configuration; later it makes a narrow update only on request (Harness-Firmware .claude/skills/init-project/SKILL.md; Harness-Firmware .claude/skills/init-project/references/profiles.md § Spawned-project cleanup; Harness-Firmware CLAUDE.md § What this project is, § CRITICAL: Verification, § Environment & deploy target; .claude/reference/product-skills.md § Project setup and template (init-project)) [ready]
Sources: docs/promo/social-proof.md § Keep one governed set of skills and rules, defined once and applied everywhere; .claude/reference/product.md § Layer 1: kernel and token efficiency; product.md § One project to the template and the next project, step 2; .claude/reference/product-skills.md § Project setup and template (init-project); Harness-Firmware CLAUDE.md; Harness-Firmware .claude/skills/init-project/references/profiles.md

## k1
Recommends: Load details into context when needed
Quote: "We just progressively disclose what's in the context and what tools to use."
Who: Tereza Tížková · Factory
Talk: What It Actually Takes to Build a Software Factory, AI Engineer
Tag: CLAUDE.md structure
Answer: Ships short CLAUDE.md; detail in topic *files*
How: /recall reads task's topic file; rules favor pruning stale lines
Why: Less always-loaded context each turn
Stock: parts a user would wire up: the docs' structure advice ("target under 200 lines per CLAUDE.md file", procedures to skills, area rules to `.claude/rules/` with `paths:`), `/doctor` to migrate always-loaded guidance, `/doctor prompt-audit` and Code Review to catch stale lines (https://code.claude.com/docs/en/memory#write-effective-instructions, https://code.claude.com/docs/en/memory#path-specific-rules, https://code.claude.com/docs/en/skills#bundled-skills, https://code.claude.com/docs/en/memory#audit-your-instruction-files, https://code.claude.com/docs/en/code-review#claude-md)
Edge: rules, kernel structure: the template ships the kernel already split: `CLAUDE.md` holds cross-cutting rules (its line 3 blockquote: "Kernel rules. Read first. Cross-cutting only.") and topical facts live in on-demand `.claude/reference/` files indexed by a table, which `recall` reads by topic (Harness-Firmware CLAUDE.md § Project reference library; Harness-Firmware .claude/skills/recall/SKILL.md; .claude/reference/product.md § Layer 1: kernel and token efficiency) [ready]
Edge: context, thin kernel: standing kernel rules keep it thin: new rules must earn their place, pruning stale content is preferred over accreting, area detail moves to `.claude/reference/`, and nothing the harness already injects is restated (Harness-Firmware CLAUDE.md § Core principles) [ready]
Sources: docs/promo/social-proof.md § Load details only when needed (progressive disclosure); social-proof.md § Keep always-loaded context small; a bigger window does not help, because models lose the middle of a long context; .claude/reference/product.md § Layer 1: kernel and token efficiency; product.md § Context cost; product.md § Rules for changing the firmware

## m2
Recommends: Write down unwritten project rules
Quote: "When you join a new company there are a lot of rules that are not really codified anywhere."
Who: Tereza Tížková · Factory
Talk: What It Actually Takes to Build a Software Factory, AI Engineer
Tag: pitfalls.md + /recall
Answer: Preset rule saves confirmed quirks to *pitfalls.md*
How: Cost retry or correction → saved unasked to repo
Why: Git carries lesson to every machine
Readout: NEXT SESSION CITES PITFALLS.MD + DATE
Stock: parts a user would wire up: a custom subagent with `memory: project` plus a save instruction, delegated to or run as the session with `--agent` (and subagent memory has no effect when auto memory is off); Projects memory, which saves a pitfall when you tell Claude to remember it (Pro and Max cloud threads); rules written into `CLAUDE.md`; `/revise-claude-md` from the claude-md-management plugin; hookify rules; auto memory saves correction notes in `~/.claude/projects/<project>/memory/` on one machine, with `modified` dates, which a user would add an instruction to cite (https://code.claude.com/docs/en/sub-agents#enable-persistent-memory, https://code.claude.com/docs/en/claude-projects#when-to-use-a-project, https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-md-management, https://github.com/anthropics/claude-plugins-public/tree/main/plugins/hookify, https://code.claude.com/docs/en/memory#storage-location, https://code.claude.com/docs/en/memory#how-it-works)
Edge: lessons, pitfall rule: when a quirk cost a retry, a backed-out change or a user correction and its cause is confirmed (a guess does not count), the agent saves it to the committed `.claude/reference/pitfalls.md` before the task ends, without asking, amending an existing entry over adding one; git carries it to every machine and sandbox; built-in auto memory is off (`autoMemoryEnabled: false`); committing follows normal git authorization (Harness-Firmware CLAUDE.md § Project reference library, § Core principles; Harness-Firmware .claude/skills/recall/SKILL.md; .claude/reference/product.md § Failure to saved lesson; product.md § Layer 2: project memory) [ready]
Edge: lessons, recall cites file and date: when a stored fact changes an action, `recall` says so with its file and date ("per pitfalls.md (2026-03-14): ..."), so a stale fact surfaces as a dated claim the user can correct (Harness-Firmware .claude/skills/recall/SKILL.md; .claude/reference/product.md § Forgetting between sessions) [ready]
Sources: docs/promo/social-proof.md § Codify unwritten rules; turn repeated work into reusable skills; social-proof.md § Treat failures as the richest signal; .claude/reference/product.md § Repeated mistakes; product.md § Failure to saved lesson; product.md § Layer 2: project memory; product.md § Forgetting between sessions

## m3
Recommends: Stay agnostic on which AI wins
Quote: "It's so difficult to catch up but also to predict what we'll be winning. So it's best to be agnostic"
Who: Tereza Tížková · Factory
Talk: What It Actually Takes to Build a Software Factory, AI Engineer
Tag: Claude Code + Codex
Answer: Codex + Claude Code wired to share *lessons*
How: Both write .claude/reference; both built-in memories off
Why: Switch tools; lessons stay
Readout: CODEX · RECALLS SAME PITFALL
Stock: parts a user would wire up: a committed `memory: project` subagent folder plus an `AGENTS.md` line telling Codex to read and write it, or the ChatGPT desktop app's import sync, which carries Claude Code project memories into Codex's local store in one direction; each tool's own learned memory stays local (https://code.claude.com/docs/en/sub-agents#enable-persistent-memory, https://learn.chatgpt.com/docs/import, https://code.claude.com/docs/en/memory#storage-location, https://learn.chatgpt.com/docs/customization/memories)
Edge: two-tools, shared lesson store: Claude Code and Codex read and write the same committed `.claude/reference/` through `recall`, both built-in memories off (`autoMemoryEnabled: false`; "Do not use or enable Codex's built-in `memories` feature for project knowledge"), and the pitfall save rule applies in Codex too, so a lesson either tool saves reaches the other (Harness-Firmware .claude/settings.json; Harness-Firmware AGENTS.md § Safety; .claude/reference/product.md § Runtimes) [ready]
Sources: docs/promo/social-proof.md § Give every agent tool the same context; don't bet on one model; .claude/reference/product.md § Runtimes; product.md § Layer 2: project memory; Harness-Firmware AGENTS.md § Safety

## p1
Recommends: Surface choices someone must own
Quote: "The danger is that the engineer never noticed that there was a choice to make."
Who: Gabriel Martinez · G2i
Talk: Generation Is Cheap, Review Is Expensive: How to Stop Shipping AI Slop, AI Engineer
Tag: /deep-plan
Answer: Built-in ledger keeps decisions in your *words*
How: Guesses listed as assumptions; fresh reviewer tests top picks
Why: Nothing built until your go-ahead
Readout: Q9 ASSUMED UNLESS YOU OBJECT
Stock: parts a user would wire up: plan mode plus an "Interview me in detail using the AskUserQuestion tool ... then write a complete spec to SPEC.md" prompt, or Codex `/plan` with an interview request; a SPEC or decisions file the user writes; `/advisor` (which sees the whole conversation) or a reviewer subagent briefed by hand; Anthropic's feature-dev plugin (https://code.claude.com/docs/en/best-practices#let-claude-interview-you, https://learn.chatgpt.com/docs/long-running-work, https://code.claude.com/docs/en/advisor, https://github.com/anthropics/claude-plugins-public/tree/main/plugins/feature-dev)
Edge: planning, decision ledger: `/deep-plan` records each decision in `.tmp/deep-plan/<slug>/ledger.md` with stable question IDs, the user's own words and the rejected options, resumable after compaction or in a new session (Harness-Firmware .claude/skills/deep-plan/SKILL.md § Ledger) [ready]
Edge: planning, interview discipline: low-stakes items become numbered assumptions shown before the round ("Assumed unless you object: Q9 ..."), rounds of at most 4 questions, recommendation first, never answering a decision for the user (Harness-Firmware .claude/skills/deep-plan/SKILL.md § Building a round, § Handling answers) [ready]
Edge: planning, why reviewer before Go: before the Go gate the 1 to 3 weightiest decisions go to `why`, one fresh reviewer with no memory of the conversation; the user picks Go (Harness-Firmware .claude/skills/deep-plan/SKILL.md § Stop and gate; Harness-Firmware .claude/skills/why/SKILL.md) [ready]
Sources: docs/promo/social-proof.md § Resolve ambiguity instead of guessing; surface the choices someone has to own; social-proof.md § `/why`: a fresh reviewer for any recommendation; .claude/reference/product-skills.md § Think before building (deep-plan); product-skills.md § Think before building (why); Harness-Firmware .claude/skills/deep-plan/SKILL.md

## p2
Recommends: Change approach, try different angle
Quote: "You will change your approach."
Who: Matt Gibiec · Dynatrace
Talk: Your AI Agent Has No Nervous System, AI Engineer
Tag: /long-horizon
Answer: Two failed audits, same step → new *approach*
How: You start /long-horizon; ruled-out approaches stay logged
Why: Stuck run changes course, keeps verified work
Readout: AUDIT FAIL ×2 → NEW APPROACH
Stock: closest stock parts: `/goal` stops when its evaluator says met or impossible, on an unrecoverable error, or after several turns without tool calls; the workflows "Keep fixing until a check passes" pattern fixes "until the type check passes or two rounds in a row make no progress"; the advisor may be consulted "when stuck on a recurring error"; none keeps a list of ruled-out approaches or forces a different one (https://code.claude.com/docs/en/goal#how-evaluation-works, https://code.claude.com/docs/en/workflows#keep-fixing-until-a-check-passes, https://code.claude.com/docs/en/advisor)
Edge: long-horizon remembers ruled-out approaches (Dead ends in `.tmp/long-horizon/<slug>/state.md`, not retried without new evidence), forces a new approach after the same step fails audit twice, and rewrites the plan after three batches with nothing newly verified; only audited results enter Verified progress (Harness-Firmware .claude/skills/long-horizon/SKILL.md § Stagnation, § State file; .claude/reference/product.md § Layer 4: the loop and its supervisor; product.md § Lost long tasks) [strong]
Sources: docs/promo/social-proof.md § Notice when the agent is stuck repeating a failing approach, and change angle; .claude/reference/product.md § Lost long tasks; product.md § Long work across sessions; product.md § Layer 4: the loop and its supervisor

## c1
Recommends: Check agent work against real state
Quote: "The agents will often overconfidently claim that they did something when in fact they did not do it."
Who: Miguel · Browserbase and Corby · Microsoft
Talk: Your LLM Judge Is a Confident Liar: Building Better Verifiers, AI Engineer
Tag: /long-horizon
Answer: Shipped auditor never sees worker's *report*
How: Checks written before step; hash diff flags edited checks
Why: Final auditor reruns every check
Readout: AUDITOR · FAIL · NOT COUNTED
Stock: parts a user would wire up: a command Stop hook or an experimental agent Stop hook set up in settings (the agent hook receives Claude's final message); `Edit(...)` deny rules plus sandbox write limits, which prevent rather than detect edits to a check; a `/goal` condition, judged from the transcript, which the docs suggest can include "no other test file is modified"; the advisor "before declaring a task complete" (https://code.claude.com/docs/en/hooks-guide#agent-based-hooks, https://code.claude.com/docs/en/hooks#stop-input, https://code.claude.com/docs/en/permissions#how-permissions-interact-with-sandboxing, https://code.claude.com/docs/en/goal#write-an-effective-condition, https://code.claude.com/docs/en/advisor)
Edge: checking, blind auditor with checks written before the step: the auditor brief and its done-check are written at Plan, before the executor exists, saved with a recorded sha256 and dispatched unchanged; the fresh auditor never sees the executor's report and reruns the check itself (Harness-Firmware .claude/skills/long-horizon/SKILL.md § Context boundary, § Round loop) [ready]
Edge: checking, integrity by hash: a content-hash manifest of the workspace taken before each round (`scripts/manifest.mjs`) lets the auditor detect a worker that touched the check it is graded by and rate the round suspect (Harness-Firmware .claude/skills/long-horizon/SKILL.md § Round loop; Harness-Firmware .claude/skills/long-horizon/scripts/manifest.mjs) [ready]
Edge: checking, final recheck: a last fresh auditor reruns every acceptance check on the final workspace before the report (Harness-Firmware .claude/skills/long-horizon/SKILL.md § Completion) [ready]
Sources: docs/promo/social-proof.md § Evidence before trust; check the real state, never the agent's claim; social-proof.md § Validators judge work they did not write, against a contract written before the work; .claude/reference/product.md § Lost long tasks; product.md § Long work across sessions

## c3
Recommends: Compare several versions side by side
Quote: "Side-by-side comparison becomes the next evolution of the eval cycle"
Who: Hussein · Braintrust
Talk: Why Building an Eval Platform Is Harder Than It Looks, AI Engineer
Tag: /arena
Answer: Packaged blind judge checks each *criterion*
How: 3 isolated builds, names hidden; judge recommends base
Why: Base kept; best rival ideas grafted on
Stock: parts a user would wire up: fork subagents, multi-angle workflows, experimental agent teams, Codex cloud `--attempts` best-of-N; for a second vendor, the Codex plugin's `/codex:rescue` (https://code.claude.com/docs/en/sub-agents#fork-the-current-conversation, https://code.claude.com/docs/en/workflows#when-to-use-a-workflow, https://code.claude.com/docs/en/agent-teams, https://learn.chatgpt.com/docs/cli/reference#codex-cloud, https://github.com/openai/codex-plugin-cc)
Edge: attempts, arena: competing builds judged blind, best ideas grafted: three candidates by default from different angles in isolated worktrees, a fresh read-only judge scores them against 3 to 6 pass/fail criteria an outsider could check with names and rationale stripped, the strongest becomes the base and the best ideas from the others are grafted on (Harness-Firmware .claude/skills/arena/SKILL.md; .claude/reference/product-skills.md § Think before building (arena)) [ready]
Sources: docs/promo/social-proof.md § Try several versions and compare them side by side; .claude/reference/product-skills.md § Think before building (arena)

## g1
Recommends: Run expensive checks once per PR
Quote: "Expensive things you want to run once when the PR goes up."
Who: Dru Knox · Tessl
Talk: Harness Engineering: How to Build a Software Factory, AI Engineer
Tag: /merge
Answer: Included /merge reviews, fixes, re-reviews, *merges*
How: You type /merge → Codex reviewers; fixes → whole diff re-reviewed
Why: Squash-merge at reviewed commit, CI green
Readout: MERGED AT REVIEWED COMMIT
Stock: parts a user would assemble: Claude Code Review on every push (Team and Enterprise; its check run is always neutral), or a Claude or Codex GitHub Action review made a required check and written to fail on findings; auto-fix or `@codex fix`; GitHub auto-merge (https://code.claude.com/docs/en/code-review#check-run-output, https://code.claude.com/docs/en/github-actions, https://learn.chatgpt.com/docs/github-action, https://code.claude.com/docs/en/claude-code-on-the-web#auto-fix-pull-requests, https://learn.chatgpt.com/docs/third-party/github#act-on-review-findings)
Edge: merge, /merge loop: you type /merge; per PR one multi-reviewer Codex review; confirmed findings verified and fixed; a Codex review reruns on the whole PR diff (at most three reruns, then the PR is left open); every CI check must pass; squash-merge with `--match-head-commit` only at the reviewed commit with CI green; the user can turn merge mode off at any time (Harness-Firmware .claude/skills/merge/SKILL.md; .claude/reference/product.md § Layer 5: review and the PR gate; product.md § Layer 6: human approval) [ready]
Sources: docs/promo/social-proof.md § Expensive checks once per pull request; social-proof.md § /merge: review, fix and merge on its own; social-proof.md § Check a fix against everything it touches, not only the bug; .claude/reference/product.md § Layer 5: review and the PR gate; product.md § Layer 6: human approval

## i1
Recommends: Search past sessions for poor experiences
Quote: "Find me all traces in the last 24 hours where the user had a poor experience."
Who: Hussein · Braintrust
Talk: Why Building an Eval Platform Is Harder Than It Looks, AI Engineer
Tag: /refine weekly
Answer: Week of corrections → trend, one rule *PR*
How: Counts your corrections vs previous four runs; evidence-gated edits
Why: Never merges; you review the PR
Readout: ONE PR · WAITING FOR YOU
Stock: closest stock parts: `/insights` reports friction from up to 200 recent sessions on one machine and keeps a timestamped copy of each run for 30 days, but changes no files and computes no trend; auto memory keeps corrections as private notes; a schedule comes from a Desktop scheduled task, a routine or a Codex scheduled task the user sets up (https://code.claude.com/docs/en/costs#analyze-your-usage-patterns, https://code.claude.com/docs/en/memory#auto-memory, https://code.claude.com/docs/en/scheduled-tasks, https://code.claude.com/docs/en/routines)
Edge: /refine weekly turns a week of sessions into a measured correction trend and one evidence-gated PR: it reads the last 7 days of this repo's Claude Code transcripts on one machine, counts user turns that correct the agent or repeat an instruction and the user's comments on merged PRs, compares the dated row against the previous four, edits only what passes its evidence gate and opens one PR whose body is the report; it never merges, and the user sets up the schedule (the template ships none) (Harness-Firmware .claude/skills/refine/SKILL.md § Weekly mode; .claude/reference/product.md § Claims to avoid or qualify ("Self-improving")) [strong]
Sources: docs/promo/social-proof.md § Point agents at past sessions to find mistakes and the skills that should exist; social-proof.md § Learn from feedback the user gives anyway: corrections, review comments, repeated requests; Harness-Firmware .claude/skills/refine/SKILL.md § Weekly mode; .claude/reference/product-skills.md § Memory and improvement (refine); .claude/reference/product.md § Claims to avoid or qualify ("Self-improving")

## x0
Line: No talk covered these
Line: Three more things Harness Firmware *does*
Sources: docs/promo/social-proof.md § Beyond what the talks covered

## x1
Tag: Cross-company review
Answer: Cross-company review switched on for every *PR*
How: Codex reviews Claude Code PRs; Claude reviews Codex PRs
Why: Can catch what author's model misses
Readout: YOU MERGE OR TYPE /merge
Stock: parts a user would wire up: Codex automatic review (a settings toggle), Claude Code Review (Team and Enterprise), a GitHub Action review made a required check (which passes regardless of findings unless the workflow fails on them), or the Codex plugin's review gate (https://learn.chatgpt.com/docs/third-party/github, https://code.claude.com/docs/en/code-review#set-up-code-review, https://code.claude.com/docs/en/github-actions, https://github.com/openai/codex-plugin-cc)
Edge: cross-vendor, review on every PR in both directions: opening or updating a PR runs `/codex-review` (OpenAI's Codex) on the full diff from Claude Code and `$claude-review` (Anthropic's Claude) from Codex, in the same turn without asking; each finding is verified before anyone acts on it; if the reviewer's CLI is unavailable the agent stops before merging and never substitutes a self-review; the person merges or types `/merge` (Harness-Firmware CLAUDE.md § Codex review on every PR; Harness-Firmware AGENTS.md § Claude review on every PR; .claude/reference/product.md § Layer 5: review and the PR gate; product.md § Layer 6: human approval) [ready]
Sources: docs/promo/social-proof.md § A second vendor's model reviews every pull request, in both directions; .claude/reference/product.md § Layer 5: review and the PR gate; product.md § The main chains end to end (Idea to merged PR, step 8)

## x2
Tag: /coordinate
Answer: Bundled protocol makes chats cross-check *claims*
How: Read PR diff, CI, main; verdict per item until agreed
Why: Two exchanges unresolved → you decide
Readout: ITEM 2 · DISAGREE · PR DIFF
Stock: parts a user would wire up: cross-session messaging (`ListAgents`, `SendMessage`) as the transport, and experimental agent teams, whose teammates "challenge each other" (https://code.claude.com/docs/en/cross-session-messaging, https://code.claude.com/docs/en/agent-teams)
Edge: coordinate, /coordinate protocol: claims checked at the source (the PR diff and checks, `origin/main`), a numbered verdict per item (agree, agree with conditions, disagree), a loop until both agree, and a point still open after two exchanges taken to the user with both positions (Harness-Firmware .claude/skills/coordinate/SKILL.md § 1. Find the session and read it yourself, § 2. Critique, § 4. Loop until agreed) [ready]
Sources: docs/promo/social-proof.md § /coordinate: two sessions review each other and agree before acting; Harness-Firmware .claude/skills/coordinate/SKILL.md § 2. Critique; Harness-Firmware .claude/skills/coordinate/SKILL.md § 4. Loop until agreed

## x3
Tag: Codex skill sync
Answer: Ships hand-translated Codex skill *ports*
How: Hash per Claude skill; CI warns when port lags
Why: Edited skill → Codex port flagged for update
Readout: CI · ONE CODEX SKILL BEHIND
Stock: parts a user would wire up: one symlinked skill folder, the shared skill format, or import (one-time, or kept in sync one way by the ChatGPT desktop app); a symlink gives both tools the same text, so a skill naming Claude-only tools is not adapted for Codex (https://learn.chatgpt.com/docs/build-skills, https://code.claude.com/docs/en/skills#using-skill-frontmatter-outside-claude-code, https://learn.chatgpt.com/docs/import)
Edge: skill-sync, native ports and drift check, as the firmware's design choice: every Claude skill is registered `native` (a hand-maintained Codex port with tool calls translated per `.agents/codex-tools.md`) or `disabled` (Claude-only); `.agents/skill-sources.json` holds a SHA-256 hash of each covered Claude skill folder, and `sync-codex-skills.mjs --check` warns, locally and in CI, when a Claude skill changed after its port was last reviewed (Harness-Firmware CLAUDE.md § Codex compatibility; Harness-Firmware .agents/skill-modes.json; Harness-Firmware .claude/scripts/sync-codex-skills.mjs) [ready]
Sources: docs/promo/social-proof.md § Skills work in two different agent tools, checked in CI; .claude/reference/product.md § Layer 3: skill library; product.md § Contributing to the template; .claude/reference/product-skills.md § Adding or changing a skill

## res
Line: Results
Line: Harness-Firmware #211 · 3 Codex reviews: 2 findings → 4 → *none*, all fixed
Line: #212 · 3 Codex reviewers, zero findings, CI passed
Line: #214 · cross-company review became rule for every PR
Sources: docs/promo/social-proof.md § Results

## close
Line: Evidence-before-done rule, pitfall log, cross-company PR review, switched on · your final *yes*
Line: Harness Firmware · Claude Code + Codex repo template
Line: harnessfirmware.com/new creates your repo
Line: No speaker reviewed or endorsed Harness Firmware
Edge: rules, working agreement: the evidence-before-done rule (inspect logs, run scripts and read code before claiming anything works; flag the risk when the authoritative check cannot run), source as in m1 [ready]; lessons, pitfall rule, source as in m2 [ready]; cross-vendor, review on every PR in both directions, source as in x1 [ready]; the final yes is stated as a property of the loop, not an edge
Sources: .claude/reference/product.md § What it is; product.md § Repeated mistakes; product.md § Layer 5: review and the PR gate; product.md § Layer 6: human approval; product.md § How people get it; docs/promo/social-proof.md § How to use it
