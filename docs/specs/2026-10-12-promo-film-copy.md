# Promo film: on-screen copy

Each beat now opens with the practice in plain words under an "industry speakers recommend" label, then a quote that states that practice on its own, then the firmware's answer as who does what to which file and what that buys you. Quotes that needed their talk's context to make sense were swapped for quotes from docs/promo/social-proof.md that say the practice outright, and every place the person acts (deciding in planning, starting long-horizon, typing /merge, merging the pull request /refine weekly opens, naming the chat /coordinate works with) is shown on screen.

## open
Line: Coding agents forget between sessions, grade their own work and get lost in long *jobs*
Line: Harness Firmware · a repository template for Claude Code and Codex
Row: Forgets | Facts and lessons saved in the repo, read only when a task needs *them*
Row: Grades its own work | Codex reviews Claude Code's pull requests and Claude reviews *Codex's*
Row: Gets lost in long jobs | Each step saved to a file on disk and checked by a separate *Auditor*
Line: You decide what to build and give the final *yes*
Frame: Industry speakers recommend practices for coding agents; each scene pairs one with how Harness Firmware does it
Line: The speakers talk about the practice in general; none of them reviewed or endorsed Harness Firmware
Sources: .claude/reference/product.md § What it is; product.md § Forgetting between sessions; product.md § Lost long tasks; product.md § Layer 5: review and the PR gate; product.md § Layer 6: human approval; docs/promo/social-proof.md § How to use it; social-proof.md § A second vendor's model reviews every pull request, in both directions

## f1
Recommends: Define the rules once and apply them everywhere
Quote: "You can define your guardrails, your agents, your docs, testing policies, really governance just one time and then standardize it across the organization."
Who: Davis Palmie · Factory
Talk: The Software Factory: From Bug Report to Production Code, AI Engineer
Tag: CLAUDE.md and AGENTS.md
Answer: Your project's rules, written once, load in every *session*
How: Claude Code reads CLAUDE.md, Codex reads AGENTS.md; detail waits in reference files
Why: You stop re-explaining the project, and the always-loaded part stays short
Readout: SESSION 1 · CLAUDE.md LOADED
Readout: SESSION 3 · SAME RULES · NOTHING RE-EXPLAINED
Sources: docs/promo/social-proof.md § Keep one governed set of skills and rules, defined once and applied everywhere; social-proof.md § Write the project's context down once, so you stop re-prompting; .claude/reference/product.md § Layer 1: kernel and token efficiency; product.md § Context cost; product.md § Runtimes

## f2
Recommends: Give the agent only the details the current task needs
Quote: "Don't pass everything to the agent. The agent doesn't need all that information."
Who: Elizabeth Fuentes Leone · AWS
Talk: Why Bigger Context Windows Won't Save Your Agent, AI Engineer
Tag: Skills
Answer: Skills, step-by-step guides like how to merge, load only when a task needs *one*
How: Each turn the agent sees one line per skill, its name and description; the full guide loads when used
Why: You can keep many guides while each turn reads one line apiece
Readout: SKILLS IDLE · ONE LINE EACH · NAME AND DESCRIPTION
Readout: ONE SKILL CALLED · FULL GUIDE LOADED
Sources: docs/promo/social-proof.md § Compress with care: summarize old turns, keep what the agent still needs; social-proof.md § Load details only when needed (progressive disclosure); .claude/reference/product.md § Layer 3: skill library; product.md § Context cost; product.md § What it is

## f3
Recommends: When one agent hits an outage, have it warn the others
Quote: "The first agent would hit it and then tell everybody that it happened and all the other agents would know that it already happened."
Who: Karthik Ranganathan · Yugabyte
Talk: Agent Memory Is Solved. Agent Learning Isn't., AI Engineer
Tag: /recall and pitfalls.md
Answer: A trap hit once is saved for the next *session*
How: A quirk that cost a retry goes into pitfalls.md, a file in git, without asking
Why: The next session reads it with /recall and steps around the trap
Readout: SESSION 1 · RETRY · CAUSE CONFIRMED
Readout: SAVED TO pitfalls.md · NO PROMPT
Readout: NEXT SESSION · /recall READS pitfalls.md
Readout: NEXT SESSION · TRAP AVOIDED
Sources: docs/promo/social-proof.md § Write the playbook down after cracking a hard problem; keep the rituals nobody should rediscover; social-proof.md § When one agent hits an outage, tell the others; .claude/reference/product.md § Repeated mistakes; product.md § Failure to saved lesson; product.md § Forgetting between sessions

## f4
Recommends: Point every coding agent at the same tickets and documentation
Quote: "They can point Devin to these tickets and the same documentation to give Devin the context it needs."
Who: Ryan Cooke · WorkOS
Talk: No, That's Not a Software Factory, AI Engineer
Tag: Claude Code and Codex
Answer: Claude Code and Codex share the same project *files*
How: Codex reads AGENTS.md, both read the same reference files, and most skills have Codex versions
Why: Switch tools mid-project and the rules and lessons are already there
Readout: CODEX JOINS · READS AGENTS.md
Readout: BOTH READ THE SAME .claude/reference FILES
Readout: MOST SKILLS · A SEPARATE CODEX VERSION
Sources: docs/promo/social-proof.md § Give every agent tool the same context; don't bet on one model; .claude/reference/product.md § Runtimes; product.md § Layer 1: kernel and token efficiency; product.md § Layer 3: skill library

## p1
Recommends: People make the decisions; agents show them every choice to make
Quote: "You still heavily need humans in the loop for architecture, for strategy, and for setting direction."
Who: Davis Palmie · Factory
Talk: The Software Factory: From Bug Report to Production Code, AI Engineer
Quote: "The danger is that the engineer never noticed that there was a choice to make."
Who: Gabriel Martinez · G2i
Talk: Generation Is Cheap, Review Is Expensive: How to Stop Shipping AI Slop, AI Engineer
Tag: /deep-plan
Answer: The agent finds the facts; you make the *choices*
How: Each open choice comes to you with a recommendation; nothing is built until you pick Go
Why: The build starts from decisions you made and facts the agent looked up
Readout: FACTS · LOOKED UP BY THE AGENT
Readout: OPEN CHOICES · EACH WITH A RECOMMENDATION
Readout: DECIDED BY YOU
Readout: GO · PICKED BY YOU
Sources: docs/promo/social-proof.md § Humans decide what to build; agents decide how; humans stay the gate for direction; social-proof.md § Resolve ambiguity instead of guessing; surface the choices someone has to own; .claude/reference/product-skills.md § Think before building (deep-plan)

## p2
Recommends: Once work starts, let the agent run without step-by-step supervision
Quote: "We don't need a human to be shepherding this agent through every single step of the life cycle."
Who: Ryan Cooke · WorkOS
Talk: No, That's Not a Software Factory, AI Engineer
Tag: /long-horizon
Answer: You start /long-horizon; a Manager agent works through a plan saved on *disk*
How: The Manager writes each step's checks first; a fresh agent does the step, and another runs the checks
Why: Only passed steps count, and if the chat runs out of room, work resumes from the file
Readout: /long-horizon · STARTED BY YOU
Readout: STATE FILE ON DISK · PLAN AND PROGRESS
Readout: STEP 3 · CHECKS WRITTEN FIRST
Readout: FRESH AGENT DOES IT · ANOTHER CHECKS IT
Readout: PASSED · COUNTS AS PROGRESS
Readout: STEP 4 STARTS · THE STEPS IT DEPENDS ON PASSED THEIR AUDIT
Sources: docs/promo/social-proof.md § Once the work starts, nobody shepherds each step; social-proof.md § Plan steps with dependencies; start each one when its dependencies are done; social-proof.md § Compress with care: summarize old turns, keep what the agent still needs; .claude/reference/product.md § Lost long tasks; product.md § Long work across sessions

## c1
Recommends: Check what the agent actually did before trusting its claim
Quote: "The agents will often overconfidently claim that they did something when in fact they did not do it."
Who: Miguel · Browserbase and Corby · Microsoft
Talk: Your LLM Judge Is a Confident Liar: Building Better Verifiers, AI Engineer
Tag: /long-horizon
Answer: An Auditor that did not do the step checks *it*
How: Checks are written before the step runs; a fresh Auditor runs them without the Executor's report
Why: A claimed DONE counts only when the checks pass
Readout: CHECKS WRITTEN · BEFORE THE STEP RUNS
Readout: EXECUTOR · CLAIMS DONE
Readout: AUDITOR · FAIL · STEP REDONE
Readout: EXECUTOR · DONE
Readout: AUDITOR · PASS · STEP COUNTS
Sources: docs/promo/social-proof.md § Evidence before trust; check the real state, never the agent's claim; social-proof.md § Validators judge work they did not write, against a contract written before the work; .claude/reference/product.md § Lost long tasks; product.md § Long work across sessions

## c3
Recommends: Try several versions and compare them side by side
Quote: "Being able to do this type of side-by-side comparison becomes the next evolution of the eval cycle that we see."
Who: Hussein · Braintrust
Talk: Why Building an Eval Platform Is Harder Than It Looks, AI Engineer
Tag: /arena
Answer: Several versions are built and compared side by *side*
How: A judge scores them blind on the same criteria; the strongest takes the others' best ideas
Why: You keep the best version plus the good parts of the rest
Readout: VERSIONS A, B, C · BUILT SEPARATELY
Readout: JUDGED BLIND · SAME CRITERIA
Readout: B WINS · IDEAS FROM A AND C ADDED
Sources: docs/promo/social-proof.md § Try several versions and compare them side by side; .claude/reference/product-skills.md § Think before building (arena)

## g1
Recommends: Run the slow, thorough checks once per pull request
Quote: "This is for expensive things you want to run once when the PR goes up."
Who: Dru Knox · Tessl
Talk: Harness Engineering: How to Build a Software Factory, AI Engineer
Tag: /merge
Answer: Codex reviews every pull request before it *merges*
How: You type /merge; fresh Codex reviewers check it, confirmed findings get fixed, and the whole diff is reviewed again
Why: It merges only after a clean review and passing CI, at the reviewed commit
Readout: YOU TYPED /merge
Readout: CODEX REVIEWERS · 3 FINDINGS
Readout: EACH FINDING CHECKED · 2 CONFIRMED
Readout: FIXED · PUSHED
Readout: WHOLE DIFF REVIEWED AGAIN · CLEAN
Readout: CI PASSED
Readout: MERGED · AT THE EXACT COMMIT REVIEWED
Sources: docs/promo/social-proof.md § Expensive checks once per pull request; social-proof.md § /merge: review, fix and merge on its own; social-proof.md § AI judges are often confidently wrong: check every finding; .claude/reference/product.md § Layer 5: review and the PR gate; product.md § Layer 6: human approval

## i1
Recommends: Find the requests people keep repeating and fix the cause
Quote: "What are scenarios that my users are experiencing frustration by prompting my agent for the same request over and over again?"
Who: Hussein · Braintrust
Talk: Why Building an Eval Platform Is Harder Than It Looks, AI Engineer
Tag: /refine weekly
Answer: Corrections you keep repeating become rule edits you review and *merge*
How: /refine weekly counts corrections in a week of Claude Code chats and pull request comments, edits the rules, and opens a pull request
Why: You stop repeating yourself; the rules change only when you merge its pull request
Readout: A WEEK OF CHATS · COUNTING CORRECTIONS
Readout: SAME CORRECTION · REPEATED
Readout: RULE EDITED · ON A NEW BRANCH
Readout: ONE PULL REQUEST OPENED · WAITING FOR YOU
Readout: MERGED BY YOU
Readout: THE NEXT CHAT READS THE NEW RULE
Sources: docs/promo/social-proof.md § Learn from feedback the user gives anyway: corrections, review comments, repeated requests; Harness-Firmware .claude/skills/refine/SKILL.md § Weekly mode; .claude/reference/product-skills.md § Memory and improvement (refine); .claude/reference/product.md § Claims to avoid or qualify ("Self-improving")

## x0
Line: No talk covered these
Line: Three more things Harness Firmware *does*
Sources: docs/promo/social-proof.md § Beyond what the talks covered

## x1
Tag: Every pull request
Answer: Every pull request gets a reviewer from the other *company*
How: OpenAI's Codex reviews Claude Code's pull requests; Anthropic's Claude reviews pull requests from Codex
Why: A reviewer trained by another company can catch what the author's model misses
Readout: AUTHOR CLAUDE CODE (ANTHROPIC) · REVIEWER CODEX (OPENAI)
Readout: AUTHOR CODEX (OPENAI) · REVIEWER CLAUDE (ANTHROPIC)
Sources: docs/promo/social-proof.md § A second vendor's model reviews every pull request, in both directions; .claude/reference/product.md § What it is; product.md § Layer 5: review and the PR gate

## x2
Tag: /coordinate
Answer: You name a second Claude Code chat; the two review each other's *work*
How: Each checks the other's claims against the pull request, CI and the main branch until they agree who does what
Why: A message from the other chat never counts as your approval; steps that need you come to you
Readout: /coordinate · OTHER CHAT NAMED BY YOU
Readout: VERDICTS EXCHANGED · NOT YET AGREED
Readout: AGREED · EACH TAKES ITS OWN STEP
Readout: A STEP NEEDS YOUR GO · ASKED OF YOU
Sources: docs/promo/social-proof.md § /coordinate: two sessions review each other and agree before acting; Harness-Firmware .claude/skills/coordinate/SKILL.md § 1. Find the session and read it yourself; Harness-Firmware .claude/skills/coordinate/SKILL.md § 5. Authorization stays with the user; coordinate SKILL.md § 6. Done

## x3
Tag: Claude Code and Codex skills
Answer: CI flags a skill whose Codex version falls *behind*
How: Each skill has a Codex version or is registered Claude-only; CI compares them on every push
Why: A Claude Code fix stays flagged until Codex gets it too
Readout: CI · CLAUDE CODE AND CODEX VERSIONS MATCH
Readout: CI · ONE CODEX VERSION BEHIND · FLAGGED
Sources: docs/promo/social-proof.md § Skills work in two different agent tools, checked in CI; social-proof.md § Give every agent tool the same context; don't bet on one model; .claude/reference/product.md § Contributing to the template; .claude/reference/product-skills.md § Adding or changing a skill

## res
Line: Results
Line: Harness-Firmware #211 · adds a weekly mode to /refine
Line: 2 findings, then 4, then *none*
Line: Three Codex review rounds · every finding fixed before merge
Line: Harness-Firmware #212
Line: 3 Codex reviewers, no *findings*
Line: CI passed on Ubuntu and Windows
Line: Harness-Firmware #214
Line: Review by the other company's model became the rule for every pull *request*
Sources: docs/promo/social-proof.md § Results

## close
Line: Lessons that persist, work another company's model checks, and you give the final *yes*
Line: Harness Firmware · a repository template for Claude Code and Codex
Line: harnessfirmware.com/new creates your repository from the template
Line: Quotes from AI Engineer and YouTube talks · no speaker reviewed or endorsed Harness Firmware
Sources: .claude/reference/product.md § What it is; product.md § Layer 6: human approval; product.md § How people get it; docs/promo/social-proof.md § How to use it
