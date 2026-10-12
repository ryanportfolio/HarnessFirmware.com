# Promo film: on-screen copy

Every on-screen line is compressed to caveman ultra for strangers: fragments with no articles or filler, arrows for cause and sequence, and only the abbreviations a developer already knows (PR, CI, repo), while each line still names who does what to which file. The viewer already uses Claude Code or Codex, so every Harness Firmware line states what the firmware does that a stock setup does not; a stock feature appears only as the base a line builds on. Each quote beat and each x beat carries two off-screen lines: `Stock:` (what stock Claude Code or Codex already does, with its source) and `Edge:` (the Harness Firmware mechanism beyond it, with its source). The open leads with the owner's statement in the owner's words, each quote beat sets a "Best practice" group (the practice in plain words, a verbatim excerpt of a talk's quote, its speaker) beside an "In Harness Firmware" group (how Harness Firmware does it) with no wording that links a speaker to Harness Firmware, the person's step stays on screen wherever the loop appears, and the whole film reads in under 290 seconds at 3 words per second plus 1.5 seconds per beat.

## open
Line: Harness Firmware aims to solve the spikiness of agent quality by steering them to work better than they normally would through reliable and repeatable methods
Line: Models have basically solved code. They haven't solved reliable verification
Line: Harness Firmware is an ongoing engineering project to attack that bottleneck
Line: Harness Firmware · Claude Code + Codex repo template
Row: Agent repeats mistakes | Confirmed mistakes saved unasked, committed
Row: Agent grades itself | Other company's model reviews every PR
Row: Agent loses long jobs | State on disk, separate auditor
Line: You give final *yes*
Line: No speaker reviewed or endorsed Harness Firmware
Sources: .claude/reference/product.md § What it is; product.md § Forgetting between sessions; product.md § Repeated mistakes; product.md § Failure to saved lesson; product.md § Lost long tasks; product.md § Long work across sessions; product.md § Layer 5: review and the PR gate; product.md § Layer 6: human approval; docs/promo/social-proof.md § How to use it; social-proof.md § A second vendor's model reviews every pull request, in both directions

## m1
Recommends: Define agent rules and policies once
Quote: "Define your guardrails, your agents, your docs, testing policies, really governance just one time"
Who: Davis Palmie · Factory
Talk: The Software Factory: From Bug Report to Production Code, AI Engineer
Tag: CLAUDE.md + /init-project
Answer: Shipped rule demands evidence before *done*
How: /init-project records which check proves done; drafts CI
Why: Kernel cross-cutting only → followed more consistently
Readout: DETAIL IN 6 TOPIC FILES
Stock: `/init` analyzes the codebase and writes a CLAUDE.md of the build commands, test instructions and conventions it finds, or suggests improvements to an existing one; with `CLAUDE_CODE_NEW_INIT=1` it "explores your codebase with a subagent, fills in gaps via follow-up questions, and presents a reviewable proposal"; `~/.claude/CLAUDE.md` holds "Personal preferences for all projects" and `~/.claude/rules/` "apply to every project on your machine"; the docs advise under 200 lines per CLAUDE.md because "Longer files consume more context and reduce adherence", and leave writing the rules to you; Codex reads AGENTS.md every run (https://code.claude.com/docs/en/memory § Set up a project CLAUDE.md, § Choose where to put CLAUDE.md files, § User-level rules, § Write effective instructions; https://learn.chatgpt.com/docs/agent-configuration/agents-md)
Edge: the template's CLAUDE.md ships its own process rules instead of build notes: inspect logs, run scripts and read code before claiming anything works, and when the authoritative check can't run, flag the risk instead of claiming a pass; Codex review on every PR; commit, push and PR on Complete, squash merge, no force-push; scope discipline; pitfalls saved without asking. The kernel holds cross-cutting rules only and detail lives in six committed `.claude/reference/` files read by topic, so the always-loaded file stays short. `/init-project` fills the kernel's FILL IN sections, which `/init` does not know exist: what the project is and won't compromise on, the authoritative verification signal (CI, deploy log, local tests), and environment and deploy, from facts it detects, asking only what it cannot detect; it also offers a skill profile, wires the `starter` remote for later template syncs, and drafts the project's own `ci.yml` (with a `firmware` job) that it writes after the user approves (Harness-Firmware CLAUDE.md § What this project is, § CRITICAL: Verification, § Environment & deploy target, § Git: push on completion, § Codex review on every PR, § Core principles; Harness-Firmware .claude/skills/init-project/SKILL.md; .claude/reference/product.md § Layer 1: kernel and token efficiency; product.md § One project to the template and the next project, step 2; .claude/reference/product-skills.md § Project setup and template (init-project))
Sources: docs/promo/social-proof.md § Keep one governed set of skills and rules, defined once and applied everywhere; social-proof.md § Write the project's context down once, so you stop re-prompting; .claude/reference/product.md § Layer 1: kernel and token efficiency; product.md § Layer 2: project memory; product.md § One project to the template and the next project; .claude/reference/product-skills.md § Project setup and template (init-project); Harness-Firmware CLAUDE.md; https://code.claude.com/docs/en/memory § Write effective instructions

## m2
Recommends: Write down unwritten project rules
Quote: "When you join a new company there are a lot of rules that are not really codified anywhere."
Who: Tereza Tížková · Factory
Talk: What It Actually Takes to Build a Software Factory, AI Engineer
Tag: pitfalls.md + /recall
Answer: Agent logs confirmed mistakes in *pitfalls.md*
How: Cost retry or correction, cause confirmed → saved unasked, dated
Why: Git carries lessons to every machine
Readout: NEXT SESSION · SAME TRAP AVOIDED
Stock: auto memory lets Claude save notes from your corrections, but the notes live in `~/.claude/projects/<project>/memory/` on one machine: "Files are not shared across machines or cloud environments" (https://code.claude.com/docs/en/memory § Auto memory, § Storage location)
Edge: a quirk that cost a retry, a backed-out change or a user correction, with its cause confirmed (a guess does not count), is saved to the committed `.claude/reference/pitfalls.md` before the task ends, without asking, amending an existing entry over adding one; git carries it to every machine and sandbox; entries are dated and carry evidence, a session that acts on one cites it ("per pitfalls.md (date)"), and a stale one is retired in place with a dated line; Claude Code's built-in auto memory is off (`autoMemoryEnabled: false`). Field log, one project: a session saved two pitfalls after a wipe, and another session read pitfalls.md and avoided the same trap 69 minutes later (Harness-Firmware CLAUDE.md § Project reference library, § Core principles; .claude/reference/product.md § Forgetting between sessions; product.md § Repeated mistakes; product.md § Layer 2: project memory; product.md § Failure to saved lesson)
Sources: docs/promo/social-proof.md § Codify unwritten rules; turn repeated work into reusable skills; social-proof.md § Treat failures as the richest signal; .claude/reference/product.md § Repeated mistakes; product.md § Failure to saved lesson; product.md § Layer 2: project memory; product.md § Forgetting between sessions

## m3
Recommends: Stay agnostic on which AI wins
Quote: "It's so difficult to catch up but also to predict what we'll be winning. So it's best to be agnostic"
Who: Tereza Tížková · Factory
Talk: What It Actually Takes to Build a Software Factory, AI Engineer
Tag: Claude Code + Codex
Answer: Codex reads lessons Claude Code *saved*
How: AGENTS.md routes Codex to same project facts, reference files
Why: Switch tools; lessons stay
Readout: CODEX · RECALLS SAME PITFALL
Stock: Codex reads only AGENTS.md and fallback names you configure ("Filenames not on this list are ignored for instruction discovery"); Claude Code can read AGENTS.md too, so one shared instruction file is stock; each tool's own memory stays on one machine and with that tool: Claude Code's auto memory "Files are not shared across machines or cloud environments", and Codex memories live under `~/.codex/memories/`, with the docs advising "Keep required team guidance in `AGENTS.md` or checked-in documentation" (https://learn.chatgpt.com/docs/agent-configuration/agents-md § Customize fallback filenames; https://learn.chatgpt.com/docs/customization/memories; https://code.claude.com/docs/en/memory § AGENTS.md, § Storage location)
Edge: AGENTS.md tells Codex to read three CLAUDE.md sections (What this project is; CRITICAL: Verification; Environment & deploy target) and to use `.claude/reference/` through the `recall` skill as project memory, with Codex's built-in memories left off; the pitfalls save rule applies in Codex too, so a lesson either tool saves is read by the other (Harness-Firmware AGENTS.md § Defaults, § Safety; .claude/reference/product.md § Runtimes; product.md § Layer 1: kernel and token efficiency)
Sources: docs/promo/social-proof.md § Give every agent tool the same context; don't bet on one model; .claude/reference/product.md § Runtimes; product.md § Layer 1: kernel and token efficiency; product.md § Layer 2: project memory; Harness-Firmware AGENTS.md § Safety

## p1
Recommends: Surface choices someone must own
Quote: "The danger is that the engineer never noticed that there was a choice to make."
Who: Gabriel Martinez · G2i
Talk: Generation Is Cheap, Review Is Expensive: How to Stop Shipping AI Slop, AI Engineer
Tag: /deep-plan
Answer: Ledger keeps each decision in your *words*
How: Agent's guesses shown as assumptions you can overrule
Why: Reviewer without chat history tests top picks
Readout: Q9 ASSUMED UNLESS YOU OBJECT
Stock: plan mode has Claude read files and write a plan (plan files sit in `~/.claude/plans/`), with edits blocked until you approve the plan; the built-in `AskUserQuestion` tool "Asks multiple-choice questions to gather requirements or clarify ambiguity" (https://code.claude.com/docs/en/permission-modes § Analyze before you edit with plan mode, § Review and approve a plan; https://code.claude.com/docs/en/tools-reference § AskUserQuestion tool behavior)
Edge: `/deep-plan` never answers a decision for the user and records each one in `.tmp/deep-plan/<slug>/ledger.md` with the user's own words for an override, the rejected options and what it depends on; a low-stakes question becomes a numbered assumption shown before the round ("Assumed unless you object: Q9 ..."), so the user sees every choice the agent made and can overrule it; a changed premise voids the decisions that depended on it; at the gate it runs `why`, one fresh reviewer with no memory of the conversation, on the one to three weightiest decisions and asks "If this decision were reversed, what would go wrong?"; nothing is built until the user picks Go, and the receiving skill maps every decision ID to a step or N/A (Harness-Firmware .claude/skills/deep-plan/SKILL.md § Ledger, § Building a round, § Asking a round, § Handling answers, § Stop and gate, § Handoff; .claude/reference/product-skills.md § Think before building (deep-plan, why))
Sources: docs/promo/social-proof.md § Resolve ambiguity instead of guessing; surface the choices someone has to own; social-proof.md § Humans decide what to build; agents decide how; humans stay the gate for direction; social-proof.md § `/why`: a fresh reviewer for any recommendation; .claude/reference/product-skills.md § Think before building (deep-plan); product-skills.md § Think before building (why); Harness-Firmware .claude/skills/deep-plan/SKILL.md

## p2
Recommends: Let agents run long jobs alone
Quote: "We don't need a human to be shepherding this agent through every single step"
Who: Ryan Cooke · WorkOS
Talk: No, That's Not a Software Factory, AI Engineer
Tag: /long-horizon
Answer: You start it; state file keeps *progress*
How: Same step fails audit twice → new approach forced
Why: Dead ends recorded; retry needs new evidence
Readout: AUDIT FAIL ×2 → NEW APPROACH
Stock: `/goal` keeps Claude taking turns until a small fast model judges a condition met; on resume only the condition carries over, with turn count and timer reset (https://code.claude.com/docs/en/goal § How evaluation works, § Resume with an active goal)
Edge: the user invokes `/long-horizon`; the Manager writes `.tmp/long-horizon/<slug>/state.md` (versioned contract, Verified progress, Remaining, Current round, Dead ends, Audit log) and resumes from it after compaction; approaches that failed audit go to Dead ends and are not retried without new evidence; the same step failing audit twice forces a new approach, and three rounds with nothing newly verified force a rewrite of the Remaining list (.claude/reference/product.md § Long work across sessions; product.md § Layer 4: the loop and its supervisor; product.md § Lost long tasks; docs/promo/social-proof.md § Notice when the agent is stuck repeating a failing approach, and change angle)
Sources: docs/promo/social-proof.md § Once the work starts, nobody shepherds each step; social-proof.md § Notice when the agent is stuck repeating a failing approach, and change angle; .claude/reference/product.md § Lost long tasks; product.md § Long work across sessions; product.md § Layer 4: the loop and its supervisor

## c1
Recommends: Check agent work against real state
Quote: "The agents will often overconfidently claim that they did something when in fact they did not do it."
Who: Miguel · Browserbase and Corby · Microsoft
Talk: Your LLM Judge Is a Confident Liar: Building Better Verifiers, AI Engineer
Tag: /long-horizon
Answer: Auditor never sees worker's *report*
How: Runs checks frozen before step; hashes flag edits
Why: Only audited steps count as done
Readout: AUDITOR · FAIL · NOT COUNTED
Stock: the `/goal` evaluator judges the condition only from what Claude surfaced in the conversation; it "doesn't run commands or read files independently" (https://code.claude.com/docs/en/goal § Write an effective condition, § Evaluation model and cost)
Edge: each round, before the executor exists, the Manager records a hash baseline of the workspace with `scripts/manifest.mjs` and writes the auditor brief with its done-check; a fresh executor does one step from its own brief; a fresh auditor gets the pre-written brief only, never the executor's report, and returns status, integrity and contract verdicts; only a complete, clean and aligned round enters Verified progress (.claude/reference/product.md § Long work across sessions, steps 3 to 5; product.md § Lost long tasks; docs/promo/social-proof.md § Validators judge work they did not write, against a contract written before the work)
Sources: docs/promo/social-proof.md § Evidence before trust; check the real state, never the agent's claim; social-proof.md § Validators judge work they did not write, against a contract written before the work; social-proof.md § Define "done" so a loop can be verified; .claude/reference/product.md § Lost long tasks; product.md § Long work across sessions

## c3
Recommends: Compare several versions side by side
Quote: "Side-by-side comparison becomes the next evolution of the eval cycle"
Who: Hussein · Braintrust
Talk: Why Building an Eval Platform Is Harder Than It Looks, AI Engineer
Tag: /arena
Answer: Blind judge ranks rival builds, same *task*
How: Isolated builds scored on same criteria, authors hidden
Why: Strongest kept; others' best ideas grafted on
Stock: `/batch` splits one change into independent units and gives each unit its own subagent and worktree; subagents return results to the caller (https://code.claude.com/docs/en/commands § /batch; https://code.claude.com/docs/en/agent-teams § Compare with subagents)
Edge: `/arena` builds three candidates for the same task by default, each in isolation, has a judge score them blind on three to six criteria an outsider could check, keeps the strongest as the base and grafts the best ideas from the others onto it (.claude/reference/product-skills.md § Think before building (arena); docs/promo/social-proof.md § Try several versions and compare them side by side)
Sources: docs/promo/social-proof.md § Try several versions and compare them side by side; social-proof.md § Per-task criteria: grade only what was asked, keep criteria separate, and set aside failures the agent could not control; .claude/reference/product-skills.md § Think before building (arena)

## g1
Recommends: Run expensive checks once per PR
Quote: "Expensive things you want to run once when the PR goes up."
Who: Dru Knox · Tessl
Talk: Harness Engineering: How to Build a Software Factory, AI Engineer
Tag: /merge
Answer: Merges only the reviewed commit, CI *green*
How: You type /merge → Codex reviewers; fixes → whole diff re-reviewed
Why: Late edits can't slip in unreviewed
Readout: MERGED AT REVIEWED COMMIT
Stock: Claude Code Review (Team and Enterprise) has Anthropic's agents review each PR and post findings, and its check run "always completes with a neutral conclusion so it never blocks merging"; `/code-review` reviews a diff locally; neither merges (https://code.claude.com/docs/en/code-review § How reviews work, § Check run output, § Review a diff locally)
Edge: `/merge` starts only when the user types it; per PR it runs one multi-reviewer Codex review, fixes and pushes confirmed findings, reruns a Codex review on the whole PR diff (at most three reruns, then it stops and leaves the PR open), waits for every CI check, and squash-merges with `--match-head-commit` only at the head that the clean review and passing CI covered (.claude/reference/product.md § Layer 5: review and the PR gate; product.md § Layer 6: human approval; .claude/reference/product-skills.md § Review and shipping (merge))
Sources: docs/promo/social-proof.md § Expensive checks once per pull request; social-proof.md § /merge: review, fix and merge on its own; social-proof.md § Check a fix against everything it touches, not only the bug; social-proof.md § AI judges are often confidently wrong: check every finding; .claude/reference/product.md § Layer 5: review and the PR gate; product.md § Layer 6: human approval

## i1
Recommends: Search past sessions for poor experiences
Quote: "Find me all traces in the last 24 hours where the user had a poor experience."
Who: Hussein · Braintrust
Talk: Why Building an Eval Platform Is Harder Than It Looks, AI Engineer
Tag: /refine weekly
Answer: Week's repeated corrections → one rule-edit *PR*
How: Reads 7 days of sessions, PR comments; your words only
Why: Rules change only when you merge
Readout: ONE PR · WAITING FOR YOU
Stock: auto memory saves notes from your corrections to a private folder on one machine, loaded at the start of each session; a note reaches CLAUDE.md only when you ask Claude to add it there (https://code.claude.com/docs/en/memory § Auto memory, § Storage location, § View and edit with `/memory`)
Edge: `/refine weekly` reads the last 7 days of the project's sessions, counts user turns that correct the agent or repeat an instruction and the user's comments on merged PRs, skips turns an agent typed, compares against the previous four weeks, edits rules on a fresh branch from `origin/main` and opens one PR whose body is the report; it never merges (Harness-Firmware .claude/skills/refine/SKILL.md § Weekly mode; .claude/reference/product.md § Repeated mistakes; product.md § Claims to avoid or qualify ("Self-improving"))
Sources: docs/promo/social-proof.md § Point agents at past sessions to find mistakes and the skills that should exist; social-proof.md § Learn from feedback the user gives anyway: corrections, review comments, repeated requests; Harness-Firmware .claude/skills/refine/SKILL.md § Weekly mode; .claude/reference/product-skills.md § Memory and improvement (refine); .claude/reference/product.md § Claims to avoid or qualify ("Self-improving")

## x0
Line: No talk covered these
Line: Three more things Harness Firmware *does*
Sources: docs/promo/social-proof.md § Beyond what the talks covered

## x1
Tag: Cross-company review
Answer: Other company's AI reviews every *PR*
How: Codex reviews Claude Code PRs; Claude reviews Codex PRs
Why: Can catch what author's model misses
Readout: YOU MERGE OR TYPE /merge
Stock: Claude Code Review and `/code-review` review with Anthropic's own agents, and Codex's `codex review` reviews with OpenAI's model, so stock review comes from the same company as the author (https://code.claude.com/docs/en/code-review § How reviews work; https://learn.chatgpt.com/docs/developer-commands?surface=cli)
Edge: opening or updating a PR runs `/codex-review` (OpenAI's Codex) on the full diff from Claude Code, and `$claude-review` (Anthropic's Claude) from Codex, in the same turn without asking; each finding is verified before anyone acts on it; if the reviewer's CLI is unavailable the agent stops before merging and never substitutes a self-review (Harness-Firmware CLAUDE.md § Codex review on every PR; Harness-Firmware AGENTS.md § Claude review on every PR; .claude/reference/product.md § Layer 5: review and the PR gate)
Sources: docs/promo/social-proof.md § A second vendor's model reviews every pull request, in both directions; .claude/reference/product.md § What it is; product.md § Layer 5: review and the PR gate; product.md § The main chains end to end (Idea to merged PR, step 8)

## x2
Tag: /coordinate
Answer: Two chats check each other's *claims*
How: Read PR diff, CI, main; verdict per item until agreed
Why: Unresolved after two exchanges → you decide
Readout: ITEM 2 · DISAGREE · PR DIFF
Stock: cross-session messaging lets Claude pass a finding, status or decision from one of your sessions to another; the receiving session is told the message came from another session, and it "can't approve anything" because a peer message "never counts as your consent"; the docs describe no step that checks the sender's claims, answers item by item or hands an unsettled point to you (https://code.claude.com/docs/en/cross-session-messaging § When to use cross-session messaging, § How a session treats an incoming message; https://code.claude.com/docs/en/agent-teams § Messages between agents)
Edge: `/coordinate` reads the named session's transcript itself, checks each claim at the source (the PR diff and checks, `origin/main`), sends a numbered verdict per item (agree, agree with conditions, disagree) and who does what next, and loops until both agree; a point still open after two exchanges goes to the user with both positions; a peer message is never relayed as the user's approval (Harness-Firmware .claude/skills/coordinate/SKILL.md § 1. Find the session and read it yourself, § 2. Critique, § 4. Loop until agreed, § 5. Authorization stays with the user)
Sources: docs/promo/social-proof.md § /coordinate: two sessions review each other and agree before acting; Harness-Firmware .claude/skills/coordinate/SKILL.md § 1. Find the session and read it yourself; Harness-Firmware .claude/skills/coordinate/SKILL.md § 4. Loop until agreed; Harness-Firmware .claude/skills/coordinate/SKILL.md § 5. Authorization stays with the user

## x3
Tag: Codex skill sync
Answer: CI flags Codex skills lagging *behind*
How: Each skill: Codex copy or marked Claude-only; hashes compared
Why: Fixes can't silently skip Codex
Readout: CI · ONE CODEX SKILL BEHIND
Stock: Claude Code loads skills from `.claude/skills/`; Codex scans `.agents/skills` from the working directory up to the repo root; neither documents comparing one folder against the other (https://code.claude.com/docs/en/skills; https://learn.chatgpt.com/docs/build-skills)
Edge: every Claude skill is registered in `.agents/skill-modes.json` as `native` (a hand-maintained Codex copy) or `disabled` (Claude-only); `.agents/skill-sources.json` holds a SHA-256 hash of each covered Claude skill folder; `sync-codex-skills.mjs --check` warns on drift or a missing registration, locally and in CI (Harness-Firmware CLAUDE.md § Codex compatibility; .claude/reference/product.md § Layer 3: skill library; product.md § Contributing to the template)
Sources: docs/promo/social-proof.md § Skills work in two different agent tools, checked in CI; social-proof.md § Give every agent tool the same context; don't bet on one model; .claude/reference/product.md § Contributing to the template; .claude/reference/product-skills.md § Adding or changing a skill

## res
Line: Results
Line: Harness-Firmware #211 · 3 Codex reviews: 2 findings → 4 → *none*, all fixed
Line: #212 · 3 Codex reviewers, zero findings, CI passed
Line: #214 · cross-company review became rule for every PR
Sources: docs/promo/social-proof.md § Results

## close
Line: Mistakes saved unasked · other company's model reviews every PR · your final *yes*
Line: Harness Firmware · Claude Code + Codex repo template
Line: harnessfirmware.com/new creates your repo
Line: No speaker reviewed or endorsed Harness Firmware
Sources: .claude/reference/product.md § What it is; product.md § Forgetting between sessions; product.md § Repeated mistakes; product.md § Layer 6: human approval; product.md § How people get it; docs/promo/social-proof.md § How to use it
