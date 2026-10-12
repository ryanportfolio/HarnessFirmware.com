# Promo film: on-screen copy

Every on-screen line is compressed to caveman ultra for strangers: fragments with no articles or filler, arrows for cause and sequence, and only the abbreviations a developer already knows (PR, CI, repo), while each line still names who does what to which file. Each quote beat reads as a comparison (the practice in plain words under "Industry speakers recommend", a verbatim excerpt of the speaker's quote, then how Harness Firmware does it), the person's step stays on screen wherever the loop appears, and the whole film reads in under 270 seconds at 3 words per second.

## open
Line: Harness Firmware · Claude Code + Codex repo template
Row: Agent forgets | Repo keeps lessons
Row: Agent grades itself | Other company's model reviews every PR
Row: Agent loses long jobs | Plan on disk
Line: You give final *yes*
Frame: Industry speakers recommend → Harness Firmware's version
Line: No speaker reviewed or endorsed Harness Firmware
Sources: .claude/reference/product.md § What it is; product.md § Forgetting between sessions; product.md § Lost long tasks; product.md § Layer 5: review and the PR gate; product.md § Layer 6: human approval; docs/promo/social-proof.md § How to use it; social-proof.md § A second vendor's model reviews every pull request, in both directions

## f1
Recommends: Define agent rules and policies once
Quote: "Define your guardrails, your agents, your docs, testing policies, really governance just one time"
Who: Davis Palmie · Factory
Talk: The Software Factory: From Bug Report to Production Code, AI Engineer
Tag: CLAUDE.md and AGENTS.md
Answer: Project rules written once, loaded every *chat*
How: Claude Code reads CLAUDE.md; Codex reads AGENTS.md
Why: You stop re-explaining your project
Readout: CHAT 3 · SAME RULES LOADED
Sources: docs/promo/social-proof.md § Keep one governed set of skills and rules, defined once and applied everywhere; social-proof.md § Write the project's context down once, so you stop re-prompting; .claude/reference/product.md § Layer 1: kernel and token efficiency; product.md § Context cost; product.md § Runtimes

## f2
Recommends: Give agent only what task needs
Quote: "Don't pass everything to the agent."
Who: Elizabeth Fuentes Leone · AWS
Talk: Why Bigger Context Windows Won't Save Your Agent, AI Engineer
Tag: Skills
Answer: Skills: step-by-step guides, loaded only when *needed*
How: Each turn sees name + description; full guide loads when used
Why: Many guides, context stays small
Readout: IDLE · ONE LINE EACH
Readout: CALLED · FULL GUIDE LOADED
Sources: docs/promo/social-proof.md § Compress with care: summarize old turns, keep what the agent still needs; social-proof.md § Load details only when needed (progressive disclosure); .claude/reference/product.md § Layer 3: skill library; product.md § Context cost; product.md § What it is

## f3
Recommends: Write down unwritten project rules
Quote: "When you join a new company there are a lot of rules that are not really codified anywhere."
Who: Tereza Tížková · Factory
Talk: What It Actually Takes to Build a Software Factory, AI Engineer
Tag: /recall and pitfalls.md
Answer: Agent writes project *lessons* into repo
How: Mistake you correct → pitfalls.md; /recall save → reference files
Why: Later chats read lessons, avoid known mistakes
Sources: docs/promo/social-proof.md § Codify unwritten rules; turn repeated work into reusable skills; .claude/reference/product.md § Repeated mistakes; product.md § Failure to saved lesson; product.md § Layer 2: project memory; product.md § Forgetting between sessions

## f4
Recommends: Don't bet on one AI model
Quote: "It's best to be agnostic for everyone."
Who: Tereza Tížková · Factory
Talk: What It Actually Takes to Build a Software Factory, AI Engineer
Tag: Claude Code + Codex
Answer: Claude Code and Codex share project *notes*
How: Both read .claude/reference; most skills have Codex versions
Why: Switch tools; rules and lessons stay
Readout: CODEX JOINS · READS AGENTS.md
Sources: docs/promo/social-proof.md § Give every agent tool the same context; don't bet on one model; .claude/reference/product.md § Runtimes; product.md § Layer 1: kernel and token efficiency; product.md § Layer 3: skill library

## p1
Recommends: Show engineers every choice to make
Quote: "The danger is that the engineer never noticed that there was a choice to make."
Who: Gabriel Martinez · G2i
Talk: Generation Is Cheap, Review Is Expensive: How to Stop Shipping AI Slop, AI Engineer
Tag: /deep-plan
Answer: Agent finds facts, you make *choices*
How: Each choice comes with recommendation; build waits for Go
Why: Open choices reach you before build
Readout: GO · PICKED BY YOU
Sources: docs/promo/social-proof.md § Resolve ambiguity instead of guessing; surface the choices someone has to own; social-proof.md § Humans decide what to build; agents decide how; humans stay the gate for direction; .claude/reference/product-skills.md § Think before building (deep-plan)

## p2
Recommends: Let agents run long jobs alone
Quote: "We don't need a human to be shepherding this agent through every single step"
Who: Ryan Cooke · WorkOS
Talk: No, That's Not a Software Factory, AI Engineer
Tag: /long-horizon
Answer: You start it; plan saved to *disk*
How: Fresh agent per step, another runs prewritten checks
Why: Only passed steps count; resumes from file
Readout: CHAT FULL → RESUMED FROM FILE
Sources: docs/promo/social-proof.md § Once the work starts, nobody shepherds each step; social-proof.md § Compress with care: summarize old turns, keep what the agent still needs; .claude/reference/product.md § Lost long tasks; product.md § Long work across sessions

## c1
Recommends: Check agent work against real state
Quote: "The agents will often overconfidently claim that they did something when in fact they did not do it."
Who: Miguel · Browserbase and Corby · Microsoft
Talk: Your LLM Judge Is a Confident Liar: Building Better Verifiers, AI Engineer
Tag: /long-horizon
Answer: Separate agent checks each *step*
How: Checks written first; checker never reads worker's report
Why: DONE counts only when checks pass
Readout: CHECKER · FAIL · NOT COUNTED
Sources: docs/promo/social-proof.md § Evidence before trust; check the real state, never the agent's claim; social-proof.md § Validators judge work they did not write, against a contract written before the work; .claude/reference/product.md § Lost long tasks; product.md § Long work across sessions

## c3
Recommends: Compare several versions side by side
Quote: "Side-by-side comparison becomes the next evolution of the eval cycle"
Who: Hussein · Braintrust
Talk: Why Building an Eval Platform Is Harder Than It Looks, AI Engineer
Tag: /arena
Answer: Agents build several versions *separately*
How: Judge scores them blind against same criteria
Why: Strongest kept, plus others' best ideas
Sources: docs/promo/social-proof.md § Try several versions and compare them side by side; .claude/reference/product-skills.md § Think before building (arena)

## g1
Recommends: Run expensive checks once per PR
Quote: "Expensive things you want to run once when the PR goes up."
Who: Dru Knox · Tessl
Talk: Harness Engineering: How to Build a Software Factory, AI Engineer
Tag: /merge
Answer: Codex reviews every PR before *merge*
How: You type /merge → confirmed findings fixed, whole diff re-reviewed
Why: Merges only after clean review, passing CI
Readout: MERGED AT REVIEWED COMMIT
Sources: docs/promo/social-proof.md § Expensive checks once per pull request; social-proof.md § /merge: review, fix and merge on its own; social-proof.md § AI judges are often confidently wrong: check every finding; .claude/reference/product.md § Layer 5: review and the PR gate; product.md § Layer 6: human approval

## i1
Recommends: Find requests users keep repeating
Quote: "Prompting my agent for the same request over and over again"
Who: Hussein · Braintrust
Talk: Why Building an Eval Platform Is Harder Than It Looks, AI Engineer
Tag: /refine weekly
Answer: Repeated corrections → rule edits in one *PR*
How: Counts corrections across week of chats, PR comments
Why: Rules change only when you merge it
Readout: ONE PR · WAITING FOR YOU
Sources: docs/promo/social-proof.md § Learn from feedback the user gives anyway: corrections, review comments, repeated requests; Harness-Firmware .claude/skills/refine/SKILL.md § Weekly mode; .claude/reference/product-skills.md § Memory and improvement (refine); .claude/reference/product.md § Claims to avoid or qualify ("Self-improving")

## x0
Line: No talk covered these
Line: Three more things Harness Firmware *does*
Sources: docs/promo/social-proof.md § Beyond what the talks covered

## x1
Tag: Cross-company review
Answer: Other company's AI reviews every *PR*
How: OpenAI's Codex reviews Claude Code PRs; Anthropic's Claude reviews Codex's
Why: Can catch what author's model misses
Readout: YOU MERGE OR TYPE /merge
Sources: docs/promo/social-proof.md § A second vendor's model reviews every pull request, in both directions; .claude/reference/product.md § What it is; product.md § Layer 5: review and the PR gate; product.md § The main chains end to end (Idea to merged PR, step 8)

## x2
Tag: /coordinate
Answer: You name second Claude Code *chat*
How: They check each other's claims against PR, CI, main
Why: Other chat never approves for you
Readout: AGREED · WHO DOES WHAT
Sources: docs/promo/social-proof.md § /coordinate: two sessions review each other and agree before acting; Harness-Firmware .claude/skills/coordinate/SKILL.md § 1. Find the session and read it yourself; Harness-Firmware .claude/skills/coordinate/SKILL.md § 4. Loop until agreed; Harness-Firmware .claude/skills/coordinate/SKILL.md § 5. Authorization stays with the user

## x3
Tag: Codex skill sync
Answer: CI flags Codex skills lagging *behind*
How: Each skill: Codex version or marked Claude-only; checked every push
Why: Fixes can't silently skip Codex
Readout: CI · ONE CODEX SKILL BEHIND
Sources: docs/promo/social-proof.md § Skills work in two different agent tools, checked in CI; social-proof.md § Give every agent tool the same context; don't bet on one model; .claude/reference/product.md § Contributing to the template; .claude/reference/product-skills.md § Adding or changing a skill

## res
Line: Results
Line: Harness-Firmware #211 · 3 Codex reviews: 2 findings → 4 → *none*, all fixed
Line: #212 · 3 Codex reviewers, zero findings, CI passed
Line: #214 · cross-company review became rule for every PR
Sources: docs/promo/social-proof.md § Results

## close
Line: Lessons kept · other company's model reviews · your final *yes*
Line: Harness Firmware · Claude Code + Codex repo template
Line: harnessfirmware.com/new creates your repo
Line: No speaker reviewed or endorsed Harness Firmware
Sources: .claude/reference/product.md § What it is; product.md § Layer 6: human approval; product.md § How people get it; docs/promo/social-proof.md § How to use it
