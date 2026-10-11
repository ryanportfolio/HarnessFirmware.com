# Social proof: what conference speakers recommend, and how Harness Firmware does it

Source pack for promotional material about [Harness Firmware](https://github.com/ryanportfolio/Harness-Firmware). Built 2026-10-11 from talk-by-talk comparisons the owner keeps locally; this file is the public extract a cloud session or a designer can work from.

How to use it:

- Every quote is copied verbatim from the talk's YouTube captions and checked by script against the full transcript. Words in [square brackets] replace a proper noun the captions misspelled. Timestamps link to the moment it was said. Auto-captions sometimes mishear ordinary words too (for example "content window" for "context window"); watch the moment before putting a quote on screen.
- The speakers recommend practices. None of them reviewed or endorsed Harness Firmware. Attribute ("Dru Knox, Tessl, recommends..."); never write "X recommends Harness Firmware", and use no company logos.
- Only practices the firmware matches or goes beyond are listed. Gaps, partial matches and practices that don't apply to a one-person setup are left out on purpose, so this file has no totals or percentages.
- "What we do" links to the public file that proves it. Items marked "owner's setup" run on the owner's machine and are not part of the public template; don't present them as something a visitor installs.

Talks drawn on (14): Dru Knox (Tessl), Marc Klingen (Langfuse), Hussein (Braintrust), Miguel (Browserbase) and Corby (Microsoft), Karthik Ranganathan (Yugabyte), Ryan Cooke (WorkOS), Tereza Tížková (Factory), Davis Palmie (Factory), Rafal Wilinski (Runlayer), Nick Saraev (YouTube educator), Elizabeth Fuentes Leone (AWS), Matt Gibiec (Dynatrace), Gabriel Martinez (G2i), Austin Marchese (YouTube educator).

## Foundations: context, memory, tools, permissions

### Write the project's context down once, so you stop re-prompting

- What we do: kernel [`CLAUDE.md`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/CLAUDE.md), [`AGENTS.md`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/AGENTS.md), [`.claude/reference/`](https://github.com/ryanportfolio/Harness-Firmware/tree/main/.claude/reference), the owner's global rules files (owner's setup), SessionStart hook
- Verdict: matches
- Recommended by:
  - Nick Saraev, YouTube educator: "Because you only ever need to create it once it saves you the time from having to continuously reprompt." ([AI Harnesses Explained in 24 Minutes For Normal People, YouTube, 6:24](https://www.youtube.com/watch?v=lNum1UFDYn0&t=384s))

### Keep always-loaded context small; a bigger window does not help, because models lose the middle of a long context

- What we do: kernel restraint rule; [`context-weight.sh`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/scripts/context-weight.sh) and [`doctor.mjs`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/scripts/doctor.mjs) report always-loaded weight; [`optimize-context`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/optimize-context/SKILL.md); built-in auto memory off
- Verdict: matches
- Recommended by:
  - Nick Saraev, YouTube educator: "When we reach the context window, there are certain dynamics that change. The model's intelligence tends to go down a little bit." ([AI Harnesses Explained in 24 Minutes For Normal People, YouTube, 7:02](https://www.youtube.com/watch?v=lNum1UFDYn0&t=422s))
  - Elizabeth Fuentes Leone, AWS: "It's only going to remember the first part and the last part that we sent to that content window." ([Why Bigger Context Windows Won't Save Your Agent, AI Engineer, 2:25](https://www.youtube.com/watch?v=DrfyORO8RqA&t=145s))
  - Karthik Ranganathan, Yugabyte: "It just means there's a whole bunch of garbage there and now LLMs get to burn even more tokens to give you even worse results." ([Agent Memory Is Solved. Agent Learning Isn't., AI Engineer, 3:58](https://www.youtube.com/watch?v=9_oy4owGtPI&t=238s))
  - Karthik Ranganathan, Yugabyte: "A lot higher precision and a lot less money burned on tokens." ([Agent Memory Is Solved. Agent Learning Isn't., AI Engineer, 6:49](https://www.youtube.com/watch?v=9_oy4owGtPI&t=409s))

### Load details only when needed (progressive disclosure)

- What we do: skills load their description first and body on use; `stk` (owner's setup) hook returns an outline for files over 16 KB
- Verdict: matches
- Recommended by:
  - Tereza Tížková, Factory: "We just progressively disclose what's in the context and what tools to use." ([What It Actually Takes to Build a Software Factory, AI Engineer, 16:14](https://www.youtube.com/watch?v=vGCJ7diEtrw&t=974s))
  - Rafal Wilinski, Runlayer: "At the very beginning the harness or a client sees just a summary of the skill or a short description of the skill." ([From 36% to 100%: How Self-Improving Agents Write Their Own Skills, AI Engineer, 2:38](https://www.youtube.com/watch?v=u-o0sW9nwmk&t=158s))

### Externalize large data and pass pointers, between tools and between agents

- What we do: review runs write `report.md` and `run.log` to a run folder; `weekly-review` (owner's setup) writes its digest to a file and hands subagents slices; subagent briefs carry paths, never the conversation
- Verdict: matches
- Recommended by:
  - Elizabeth Fuentes Leone, AWS: "You can create a memory pointer to storage that data." ([Why Bigger Context Windows Won't Save Your Agent, AI Engineer, 3:23](https://www.youtube.com/watch?v=DrfyORO8RqA&t=203s))
  - Elizabeth Fuentes Leone, AWS: "You are going to retrieve an ID for that storage." ([Why Bigger Context Windows Won't Save Your Agent, AI Engineer, 8:35](https://www.youtube.com/watch?v=DrfyORO8RqA&t=515s))

### Compress with care: summarize old turns, keep what the agent still needs

- What we do: `/smart-compact` with per-session keep and drop instructions ([#208](https://github.com/ryanportfolio/Harness-Firmware/pull/208)); [`long-horizon`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/long-horizon/SKILL.md) state file survives compaction
- Verdict: matches
- Recommended by:
  - Elizabeth Fuentes Leone, AWS: "Don't pass everything to the agent. The agent doesn't need all that information." ([Why Bigger Context Windows Won't Save Your Agent, AI Engineer, 14:26](https://www.youtube.com/watch?v=DrfyORO8RqA&t=866s))

### Keep agent output short; never expand a light brief into a long artifact for someone else to read

- What we do: the owner's global token guard (owner's setup: result, not route; no closing summary); [`writing`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/writing/SKILL.md) skill cuts filler
- Verdict: matches
- Recommended by:
  - Gabriel Martinez, G2i: "In code, a vague task becomes a large PR. A small feature becomes a pile of files." ([Generation Is Cheap, Review Is Expensive: How to Stop Shipping AI Slop, AI Engineer, 9:46](https://www.youtube.com/watch?v=6qkzlT962es&t=586s))

### Build a domain harness on top of an existing one instead of rebuilding the base: rules, skills, MCP servers, context, hooks, subagents

- What we do: Harness Firmware itself: [`CLAUDE.md`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/CLAUDE.md) and [`AGENTS.md`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/AGENTS.md), skills, [`.mcp.json`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.mcp.json), [`.claude/reference/`](https://github.com/ryanportfolio/Harness-Firmware/tree/main/.claude/reference), SessionStart hooks, subagents, all on Claude Code and Codex extension points
- Verdict: matches
- Recommended by:
  - Austin Marchese, YouTube educator: "At a foundational level, a harness is a way to alter AI's output so it works specific for your situation." ([The Smartest People Aren't Prompting Claude. They're Harness Engineering, YouTube, 2:35](https://www.youtube.com/watch?v=bIYWxYm5cOY&t=155s))
  - Austin Marchese, YouTube educator: "Going back to our equation before, right, we're not building the base harness. We're just building the domain harness." ([The Smartest People Aren't Prompting Claude. They're Harness Engineering, YouTube, 7:22](https://www.youtube.com/watch?v=bIYWxYm5cOY&t=442s))

### Give the harness an interface people actually use

- What we do: [Harness Console](https://github.com/ryanportfolio/Harness-Console), a local Node app: clone and update repos, create projects from the template, sync skills, track Claude Code and Codex usage
- Verdict: matches
- Recommended by:
  - Austin Marchese, YouTube educator: "At the end of the day, who cares if you have an amazing tool set if it's just hard and complicated to use it." ([The Smartest People Aren't Prompting Claude. They're Harness Engineering, YouTube, 12:43](https://www.youtube.com/watch?v=bIYWxYm5cOY&t=763s))

### Give every agent tool the same context; don't bet on one model

- What we do: Claude Code and Codex read the same reference files; every skill has a Codex version or is registered as needing Claude-only tools, and CI reports any version that drifts ([`sync-codex-skills.mjs --check`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/scripts/sync-codex-skills.mjs))
- Verdict: matches
- Recommended by:
  - Ryan Cooke, WorkOS: "They can point Devin to these tickets and the same documentation to give Devin the context it needs." ([No, That's Not a Software Factory, AI Engineer, 11:14](https://www.youtube.com/watch?v=HvboD89DyQ8&t=674s))
  - Tereza Tížková, Factory: "It's so difficult to catch up but also to predict what we'll be winning. So it's best to be agnostic for everyone." ([What It Actually Takes to Build a Software Factory, AI Engineer, 5:12](https://www.youtube.com/watch?v=vGCJ7diEtrw&t=312s))
  - Davis Palmie, Factory: "Even though humans and agents may use different services, everything should share the same underlying harness and context." ([The Software Factory: From Bug Report to Production Code, AI Engineer, 12:52](https://www.youtube.com/watch?v=exiwa9QbQXI&t=772s))
  - Karthik Ranganathan, Yugabyte: "I can do that because all of the context is shared in our cloud now." ([Agent Memory Is Solved. Agent Learning Isn't., AI Engineer, 10:25](https://www.youtube.com/watch?v=9_oy4owGtPI&t=625s))

### Keep one governed set of skills and rules, defined once and applied everywhere

- What we do: the template repo itself: new repos start from it, and [`sync-starter`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/sync-starter/SKILL.md) pulls chosen template improvements into an existing repo
- Verdict: matches
- Recommended by:
  - Dru Knox, Tessl: "Typically, that ends up being something like a skills registry or a shared GitHub repo where you push skills that improve agent quality." ([Harness Engineering: How to Build a Software Factory, AI Engineer, 12:36](https://www.youtube.com/watch?v=X6l4lpA0_NY&t=756s))
  - Davis Palmie, Factory: "You can define your guardrails, your agents, your docs, testing policies, really governance just one time and then standardize it across the organization." ([The Software Factory: From Bug Report to Production Code, AI Engineer, 11:48](https://www.youtube.com/watch?v=exiwa9QbQXI&t=708s))

### Write the playbook down after cracking a hard problem; keep the rituals nobody should rediscover

- What we do: kernel: a quirk that cost a retry, a backed-out change or a correction goes into [`pitfalls.md`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/reference/pitfalls.md) without asking; skills such as [`merge`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/merge/SKILL.md) and `main` (owner's setup) hold the release sequence
- Verdict: matches
- Recommended by:
  - Rafal Wilinski, Runlayer: "If agents would try to figure out that from scratch, they are likely going to fail." ([From 36% to 100%: How Self-Improving Agents Write Their Own Skills, AI Engineer, 4:38](https://www.youtube.com/watch?v=u-o0sW9nwmk&t=278s))

### Vet third-party skills before installing them

- What we do: [`addskill`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/addskill/SKILL.md): inspect the real source, keep provenance, never run imported scripts just to install; every change goes through a cross-vendor review
- Verdict: matches
- Recommended by:
  - Rafal Wilinski, Runlayer: "At [Runlayer] we are scanning thousands of skills every day and there is really weird stuff inside." ([From 36% to 100%: How Self-Improving Agents Write Their Own Skills, AI Engineer, 6:15](https://www.youtube.com/watch?v=u-o0sW9nwmk&t=375s))

### Return clear tool results; handle slow calls asynchronously

- What we do: scripts print JSON with documented exit codes; Codex reviews run in the background with bounded polling
- Verdict: matches
- Recommended by:
  - Elizabeth Fuentes Leone, AWS: "You can invoke your [MCP], your external API. So then you can save that and you can retrieve the answer in the next invocation." ([Why Bigger Context Windows Won't Save Your Agent, AI Engineer, 12:30](https://www.youtube.com/watch?v=DrfyORO8RqA&t=750s))

### Cut cost without cutting usage (caching)

- What we do: the owner's global token guard (owner's setup): never compact to save cost (it rewrites the cached prefix); choose effort at launch
- Verdict: matches
- Recommended by:
  - Tereza Tížková, Factory: "They continue growing and token maxing but they stopped spending so much money." ([What It Actually Takes to Build a Software Factory, AI Engineer, 6:00](https://www.youtube.com/watch?v=vGCJ7diEtrw&t=360s))

### Prove token savings from the traces

- What we do: `rtk gain` (owner's setup) analytics; [`memory-audit.mjs`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/scripts/memory-audit.mjs) attributes tokens to skills
- Verdict: matches
- Recommended by:
  - Karthik Ranganathan, Yugabyte: "You can actually look at the decision trace all the way down to the tool call." ([Agent Memory Is Solved. Agent Learning Isn't., AI Engineer, 16:14](https://www.youtube.com/watch?v=9_oy4owGtPI&t=974s))

### Permissions, sandboxes and least privilege for every action

- What we do: each skill states what invoking it authorizes and what it does not; Codex reviewers run read-only; sessions work in their own worktrees; the owner's global rule to ask before destructive or paid actions (owner's setup)
- Verdict: matches
- Recommended by:
  - Nick Saraev, YouTube educator: "Here is where the harness will actually check through additionally every single tool call that is made." ([AI Harnesses Explained in 24 Minutes For Normal People, YouTube, 14:23](https://www.youtube.com/watch?v=lNum1UFDYn0&t=863s))
  - Nick Saraev, YouTube educator: "First, if there are any issues with the way the model is running, the damage will stay inside of the sandbox." ([AI Harnesses Explained in 24 Minutes For Normal People, YouTube, 17:03](https://www.youtube.com/watch?v=lNum1UFDYn0&t=1023s))
  - Davis Palmie, Factory: "It operates under your standards with role-based access control and least privilege." ([The Software Factory: From Bug Report to Production Code, AI Engineer, 15:10](https://www.youtube.com/watch?v=exiwa9QbQXI&t=910s))

### Let another model check risky actions

- What we do: `disk-cleanup auto` (owner's setup) deletes only what two Codex reviewers and an adversarial check agree on; Codex review gates every merge
- Verdict: matches
- Recommended by:
  - Nick Saraev, YouTube educator: "Using another AI model as the permission checker attached to your core AI model harness." ([AI Harnesses Explained in 24 Minutes For Normal People, YouTube, 14:44](https://www.youtube.com/watch?v=lNum1UFDYn0&t=884s))

## Plan before building

### Humans decide what to build; agents decide how; humans stay the gate for direction

- What we do: [`deep-plan`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/deep-plan/SKILL.md): decisions belong to the user, facts are the agent's job; proposals wait for "apply"
- Verdict: matches
- Recommended by:
  - Tereza Tížková, Factory: "Deciding what to build in the software not how to build it." ([What It Actually Takes to Build a Software Factory, AI Engineer, 21:36](https://www.youtube.com/watch?v=vGCJ7diEtrw&t=1296s))
  - Davis Palmie, Factory: "You still heavily need humans in the loop for architecture, for strategy, and for setting direction." ([The Software Factory: From Bug Report to Production Code, AI Engineer, 15:35](https://www.youtube.com/watch?v=exiwa9QbQXI&t=935s))
  - Matt Gibiec, Dynatrace: "Giving you the control at the end of it, to make the decision whether you want to push the feature out there." ([Your AI Agent Has No Nervous System, AI Engineer, 14:22](https://www.youtube.com/watch?v=YNT7Plf9KIg&t=862s))
  - Gabriel Martinez, G2i: "In a world where anything is possible, deciding what to build is more important than ever." ([Generation Is Cheap, Review Is Expensive: How to Stop Shipping AI Slop, AI Engineer, 2:53](https://www.youtube.com/watch?v=6qkzlT962es&t=173s))

### Encode the whole engineering process; generating code is the easy part

- What we do: chained skills: [`deep-plan`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/deep-plan/SKILL.md), [`writing-plans`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/writing-plans/SKILL.md), [`long-horizon`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/long-horizon/SKILL.md), [`merge`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/merge/SKILL.md)
- Verdict: matches
- Recommended by:
  - Ryan Cooke, WorkOS: "We subscribe to webhooks through TARS so that TARS can actually track the progress of projects in addition to generating the code outputs." ([No, That's Not a Software Factory, AI Engineer, 4:05](https://www.youtube.com/watch?v=HvboD89DyQ8&t=245s))
  - Tereza Tížková, Factory: "Code writing code that's the easy part compared to all the others." ([What It Actually Takes to Build a Software Factory, AI Engineer, 3:10](https://www.youtube.com/watch?v=vGCJ7diEtrw&t=190s))
  - Davis Palmie, Factory: "The real need you have today is cohesion across all of these surfaces." ([The Software Factory: From Bug Report to Production Code, AI Engineer, 5:20](https://www.youtube.com/watch?v=exiwa9QbQXI&t=320s))
  - Gabriel Martinez, G2i: "ORC is taking those lessons and baking them into the workflow." ([Generation Is Cheap, Review Is Expensive: How to Stop Shipping AI Slop, AI Engineer, 16:07](https://www.youtube.com/watch?v=6qkzlT962es&t=967s))

### Know what not to build; every line and every pull request is a maintenance commitment

- What we do: kernel: scope discipline (no unrequested features or abstractions, minimum complexity) and "restraint is a feature"
- Verdict: matches
- Recommended by:
  - Gabriel Martinez, G2i: "It's almost as if they've forgotten that any line of code you write is a liability, that the best code is no code at all." ([Generation Is Cheap, Review Is Expensive: How to Stop Shipping AI Slop, AI Engineer, 2:53](https://www.youtube.com/watch?v=6qkzlT962es&t=173s))
  - Gabriel Martinez, G2i: "It's easy to yeet a PR, but who has to own that thing? Who's responsible for the repercussions of what that means?" ([Generation Is Cheap, Review Is Expensive: How to Stop Shipping AI Slop, AI Engineer, 7:06](https://www.youtube.com/watch?v=6qkzlT962es&t=426s))
  - Austin Marchese, YouTube educator: "The simplest solution that actually solves the problem is better than any complex solution, especially when you're first starting." ([The Smartest People Aren't Prompting Claude. They're Harness Engineering, YouTube, 8:54](https://www.youtube.com/watch?v=bIYWxYm5cOY&t=534s))

### Resolve ambiguity instead of guessing; surface the choices someone has to own

- What we do: [`deep-plan`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/deep-plan/SKILL.md) rounds turn each open choice into the user's decision; [`why`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/why/SKILL.md) pressure-tests weighty picks
- Verdict: matches
- Recommended by:
  - Gabriel Martinez, G2i: "The danger is that the engineer never noticed that there was a choice to make." ([Generation Is Cheap, Review Is Expensive: How to Stop Shipping AI Slop, AI Engineer, 1:00](https://www.youtube.com/watch?v=6qkzlT962es&t=60s))
  - Gabriel Martinez, G2i: "If we do not see those choices, we cannot own them. And if we do not own them, we are not really engineering." ([Generation Is Cheap, Review Is Expensive: How to Stop Shipping AI Slop, AI Engineer, 1:23](https://www.youtube.com/watch?v=6qkzlT962es&t=83s))

### Plan steps with dependencies; start each one when its dependencies are done

- What we do: [`long-horizon`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/long-horizon/SKILL.md): every step lists "depends on"; ready steps run in parallel rounds
- Verdict: matches
- Recommended by:
  - Ryan Cooke, WorkOS: "It can automatically pick up the next ticket in a cycle." ([No, That's Not a Software Factory, AI Engineer, 5:38](https://www.youtube.com/watch?v=HvboD89DyQ8&t=338s))

### Once the work starts, nobody shepherds each step

- What we do: [`deep-plan`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/deep-plan/SKILL.md) ends at an explicit Go and hands off; once the user starts [`long-horizon`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/long-horizon/SKILL.md), its rounds run unattended; in [`/merge`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/merge/SKILL.md) mode, which the user starts once per session, every clean pull request merges without a further prompt
- Verdict: matches
- Recommended by:
  - Ryan Cooke, WorkOS: "We don't need a human to be shepherding this agent through every single step of the life cycle." ([No, That's Not a Software Factory, AI Engineer, 8:03](https://www.youtube.com/watch?v=HvboD89DyQ8&t=483s))

### Get past the blank page without letting the agent inflate scope

- What we do: [`deep-plan`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/deep-plan/SKILL.md) interviews the user into decisions instead of drafting scope to cut; kernel scope-discipline rule
- Verdict: matches
- Recommended by:
  - Ryan Cooke, WorkOS: "It's really about that like cold start problem where we can kind of get over the hump of creating all these different resources." ([No, That's Not a Software Factory, AI Engineer, 8:25](https://www.youtube.com/watch?v=HvboD89DyQ8&t=505s))

### Set the agent's direction early, before it digs a rabbit hole

- What we do: kernel: read the reference library before unfamiliar work; skills trigger before the work starts
- Verdict: matches
- Recommended by:
  - Rafal Wilinski, Runlayer: "The initial trajectory matters a lot and that's why skills are so important because they guide the agent towards the right target." ([From 36% to 100%: How Self-Improving Agents Write Their Own Skills, AI Engineer, 4:13](https://www.youtube.com/watch?v=u-o0sW9nwmk&t=253s))
  - Matt Gibiec, Dynatrace: "We'll be able to actually plan before you prompt." ([Your AI Agent Has No Nervous System, AI Engineer, 12:08](https://www.youtube.com/watch?v=YNT7Plf9KIg&t=728s))

## Inner loop: check the work while doing it

### Cheap checks the agent runs while it works

- What we do: kernel "CRITICAL: Verification" rules; headed Chrome checks on the real GPU; evidence-gated loops ([`wow-loop`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/wow-loop/SKILL.md), [`perf-loop`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/perf-loop/SKILL.md), [`long-horizon`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/long-horizon/SKILL.md))
- Verdict: goes beyond the recommendation
- Recommended by:
  - Dru Knox, Tessl: "These are very fast iterative loops. You want them to be cheap. You're expecting the agent to run them all the time." ([Harness Engineering: How to Build a Software Factory, AI Engineer, 7:07](https://www.youtube.com/watch?v=X6l4lpA0_NY&t=427s))

### Evidence before trust; check the real state, never the agent's claim

- What we do: kernel: inspect logs, run scripts and read code before claiming anything works; never claim a visual check you did not do
- Verdict: matches
- Recommended by:
  - Miguel (Browserbase) and Corby (Microsoft), Browserbase and Microsoft: "The agents will often overconfidently claim that they did something when in fact they did not do it." ([Your LLM Judge Is a Confident Liar: Building Better Verifiers, AI Engineer, 6:50](https://www.youtube.com/watch?v=xLxhT2ZI7UM&t=410s))
  - Nick Saraev, YouTube educator: "The reason why is because models don't have an inherent sort of way of standardizing verification." ([AI Harnesses Explained in 24 Minutes For Normal People, YouTube, 12:04](https://www.youtube.com/watch?v=lNum1UFDYn0&t=724s))
  - Gabriel Martinez, G2i: "This is where someone has to read the code, test the behavior, own the trade-offs, notice the missing requirements." ([Generation Is Cheap, Review Is Expensive: How to Stop Shipping AI Slop, AI Engineer, 6:23](https://www.youtube.com/watch?v=6qkzlT962es&t=383s))

### Define "done" so a loop can be verified

- What we do: [`long-horizon`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/long-horizon/SKILL.md) done-checks and pre-registered auditor briefs; [`wow-loop`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/wow-loop/SKILL.md) target scores
- Verdict: matches
- Recommended by:
  - Tereza Tížková, Factory: "It's really difficult to define how do you verify that the loop was done that the task was accomplished." ([What It Actually Takes to Build a Software Factory, AI Engineer, 10:38](https://www.youtube.com/watch?v=vGCJ7diEtrw&t=638s))

### Long-running work split across an orchestrator, workers and validators, each with fresh context

- What we do: [`long-horizon`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/long-horizon/SKILL.md): Manager, Executor and Auditor roles, fresh context per round, a state file across sessions
- Verdict: matches
- Recommended by:
  - Tereza Tížková, Factory: "To summarize, the orchestrator just decides and writes the conditions what it needs to be done. Then it gives it to the agents called workers." ([What It Actually Takes to Build a Software Factory, AI Engineer, 12:36](https://www.youtube.com/watch?v=vGCJ7diEtrw&t=756s))
  - Tereza Tížková, Factory: "Validators they review the output and provide feedback and send it back to the beginning." ([What It Actually Takes to Build a Software Factory, AI Engineer, 13:00](https://www.youtube.com/watch?v=vGCJ7diEtrw&t=780s))

### Teams of agents working in parallel

- What we do: kernel: run independent work in parallel subagents; [`session-hub`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/session-hub/SKILL.md) for parallel sessions
- Verdict: matches
- Recommended by:
  - Nick Saraev, YouTube educator: "We're going to have ways to try many versions of things at once." ([AI Harnesses Explained in 24 Minutes For Normal People, YouTube, 22:09](https://www.youtube.com/watch?v=lNum1UFDYn0&t=1329s))

### Try several versions and compare them side by side

- What we do: [`arena`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/arena/SKILL.md): parallel attempts judged blind against the same criteria; the strongest becomes the base and the best ideas from the others are grafted onto it
- Verdict: matches
- Recommended by:
  - Hussein, Braintrust: "Being able to do this type of side-by-side comparison becomes the next evolution of the eval cycle that we see." ([Why Building an Eval Platform Is Harder Than It Looks, AI Engineer, 9:52](https://www.youtube.com/watch?v=mUQoVz7THu0&t=592s))

### Per-task criteria: grade only what was asked, keep criteria separate, and set aside failures the agent could not control

- What we do: [`arena`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/arena/SKILL.md) criteria an outsider could check; [`wow-loop`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/wow-loop/SKILL.md) checks frozen before work, with dependencies and an "unavailable" status
- Verdict: matches
- Recommended by:
  - Miguel (Browserbase) and Corby (Microsoft), Browserbase and Microsoft: "A rubric has like maybe 10 different criteria of what success looks like." ([Your LLM Judge Is a Confident Liar: Building Better Verifiers, AI Engineer, 5:02](https://www.youtube.com/watch?v=xLxhT2ZI7UM&t=302s))
  - Miguel (Browserbase) and Corby (Microsoft), Browserbase and Microsoft: "They would artificially deflate the scores because the agent didn't do something it wasn't asked to do." ([Your LLM Judge Is a Confident Liar: Building Better Verifiers, AI Engineer, 7:30](https://www.youtube.com/watch?v=xLxhT2ZI7UM&t=450s))
  - Miguel (Browserbase) and Corby (Microsoft), Browserbase and Microsoft: "The model made one arithmetic mistake in one criteria of the rubric and that should not cascade to the next criteria of the rubric." ([Your LLM Judge Is a Confident Liar: Building Better Verifiers, AI Engineer, 7:52](https://www.youtube.com/watch?v=xLxhT2ZI7UM&t=472s))
  - Miguel (Browserbase) and Corby (Microsoft), Browserbase and Microsoft: "Here we say that the agent gets full marks for doing its best effort." ([Your LLM Judge Is a Confident Liar: Building Better Verifiers, AI Engineer, 9:21](https://www.youtube.com/watch?v=xLxhT2ZI7UM&t=561s))

### Notice when the agent is stuck repeating a failing approach, and change angle

- What we do: [`long-horizon`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/long-horizon/SKILL.md) keeps a list of dead ends (approaches that failed their audit) and does not retry them without new evidence; [`fable-mode`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/fable-mode/SKILL.md) for repeated failures; [`why`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/why/SKILL.md) sends the stuck decision to a fresh reviewer
- Verdict: matches
- Recommended by:
  - Matt Gibiec, Dynatrace: "You will change your approach. You approach it from a different angle." ([Your AI Agent Has No Nervous System, AI Engineer, 2:06](https://www.youtube.com/watch?v=YNT7Plf9KIg&t=126s))

### Change one variable at a time

- What we do: [`perf-loop`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/perf-loop/SKILL.md) measured rounds
- Verdict: matches
- Recommended by:
  - Karthik Ranganathan, Yugabyte: "As we improved them one variable at a time, we were able to jump to 65 74 82." ([Agent Memory Is Solved. Agent Learning Isn't., AI Engineer, 6:49](https://www.youtube.com/watch?v=9_oy4owGtPI&t=409s))

## Outer loop: gate the pull request

### Expensive checks once per pull request

- What we do: a second vendor's model (Codex) reviews every pull request before merge; [`/merge`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/merge/SKILL.md) runs a multi-reviewer pass, fixes and re-reviews, checks CI, and squash-merges at the exact commit reviewed
- Verdict: goes beyond the recommendation
- Recommended by:
  - Dru Knox, Tessl: "This is for expensive things you want to run once when the PR goes up." ([Harness Engineering: How to Build a Software Factory, AI Engineer, 7:23](https://www.youtube.com/watch?v=X6l4lpA0_NY&t=443s))

### Validators judge work they did not write, against a contract written before the work

- What we do: [`long-horizon`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/long-horizon/SKILL.md) writes the auditor brief before execution and sends it unchanged to a fresh-context auditor
- Verdict: matches
- Recommended by:
  - Tereza Tížková, Factory: "It doesn't care how it was made it just goes it works in its virtual computer and it clicks on the stuff." ([What It Actually Takes to Build a Software Factory, AI Engineer, 13:46](https://www.youtube.com/watch?v=vGCJ7diEtrw&t=826s))

### AI judges are often confidently wrong: check every finding

- What we do: [`codex-review`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/codex-review/SKILL.md): each finding gets a real check before anyone acts on it; reviews use a written rubric and must read the diff
- Verdict: matches
- Recommended by:
  - Miguel (Browserbase) and Corby (Microsoft), Browserbase and Microsoft: "You're not really training a better agent. You're just training a more competent liar." ([Your LLM Judge Is a Confident Liar: Building Better Verifiers, AI Engineer, 3:14](https://www.youtube.com/watch?v=xLxhT2ZI7UM&t=194s))

### Check a fix against everything it touches, not only the bug

- What we do: [`/merge`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/merge/SKILL.md) re-reviews the whole pull request diff with another vendor's model after every fix round
- Verdict: matches
- Recommended by:
  - Matt Gibiec, Dynatrace: "After you change that one line of code, what happens to the rest of your environment? What happens to the rest of your application?" ([Your AI Agent Has No Nervous System, AI Engineer, 11:35](https://www.youtube.com/watch?v=YNT7Plf9KIg&t=695s))

### Keep the answer key away from the system being tested

- What we do: was partial; closed 2026-10-06 by [#212](https://github.com/ryanportfolio/Harness-Firmware/pull/212) (all copies of [`evaluation.md`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/addskill/references/evaluation.md)) and the `weekly-review` (owner's setup) dry mode, which also withholds text that mentions the key
- Verdict: done (built after the talk)
- Recommended by:
  - Miguel (Browserbase) and Corby (Microsoft), Browserbase and Microsoft: "For the other hundred trajectories, they were basically held out to us." ([Your LLM Judge Is a Confident Liar: Building Better Verifiers, AI Engineer, 19:03](https://www.youtube.com/watch?v=xLxhT2ZI7UM&t=1143s))

### Start narrow and earn trust before letting a loop run

- What we do: the owner's weekly review ran three scored, report-only dry runs before it was trusted (owner's setup); its pull requests wait for [`/merge`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/merge/SKILL.md)
- Verdict: matches
- Recommended by:
  - Davis Palmie, Factory: "Each step in the software factory needs careful ownership and monitoring before you even think about letting the the pipeline loop." ([The Software Factory: From Bug Report to Production Code, AI Engineer, 7:35](https://www.youtube.com/watch?v=exiwa9QbQXI&t=455s))

### Diagrams as a compressed review surface for structural changes

- What we do: was a gap; closed 2026-10-09 by [#218](https://github.com/ryanportfolio/Harness-Firmware/pull/218): the [`merge`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/merge/SKILL.md) skill puts a short Mermaid diagram in the description of every pull request that changes flows, boundaries, data model or state, and the same diagram in [`architecture.md`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/reference/architecture.md) when the project keeps one
- Verdict: done (built after the talk)
- Recommended by:
  - Gabriel Martinez, G2i: "A good diagram lets us see the shape of the system in a way code often obscures." ([Generation Is Cheap, Review Is Expensive: How to Stop Shipping AI Slop, AI Engineer, 12:46](https://www.youtube.com/watch?v=6qkzlT962es&t=766s))

### A person understands the main flows, boundaries and data model of what merged

- What we do: was partial; closed 2026-10-09 by the same change: the owner reads the diagram instead of the diff, alongside [`architecture.md`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/reference/architecture.md), pull request descriptions and the merge recap
- Verdict: done (built after the talk)
- Recommended by:
  - Gabriel Martinez, G2i: "Main flows, the boundaries, the data model and product behaviors have to be understood." ([Generation Is Cheap, Review Is Expensive: How to Stop Shipping AI Slop, AI Engineer, 3:36](https://www.youtube.com/watch?v=6qkzlT962es&t=216s))

## Meta loop: improve over time

### Point agents at past sessions to find mistakes and the skills that should exist

- What we do: `weekly-review` (owner's setup) (Friday routine) plus [`/refine weekly`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/refine/SKILL.md) ([#211](https://github.com/ryanportfolio/Harness-Firmware/pull/211)): reads every session, proposes rules from repeated corrections and skills from repeated tasks, tracks recurring review findings
- Verdict: goes beyond the recommendation
- Recommended by:
  - Ryan Cooke, WorkOS: "We can actually point agents at sessions and see where are the gaps and how people are using our factory." ([No, That's Not a Software Factory, AI Engineer, 17:24](https://www.youtube.com/watch?v=HvboD89DyQ8&t=1044s))
  - Nick Saraev, YouTube educator: "Every time the AI model will make a mistake using a harness it'll pick up on that." ([AI Harnesses Explained in 24 Minutes For Normal People, YouTube, 23:01](https://www.youtube.com/watch?v=lNum1UFDYn0&t=1381s))
  - Dru Knox, Tessl: "It's basically finding mistakes that are making their way through the pipeline to your users or that you had to correct as a human." ([Harness Engineering: How to Build a Software Factory, AI Engineer, 8:06](https://www.youtube.com/watch?v=X6l4lpA0_NY&t=486s))
  - Hussein, Braintrust: "Find me all traces in the last 24 hours where the user had a poor experience." ([Why Building an Eval Platform Is Harder Than It Looks, AI Engineer, 14:42](https://www.youtube.com/watch?v=mUQoVz7THu0&t=882s))

### Humans review changes to the evaluators; don't tune to quirks

- What we do: [`refine`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/refine/SKILL.md) evidence table: only the user's own words count, and a one-task instruction never becomes a standing rule; [`evaluation.md`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/addskill/references/evaluation.md): a changed evaluator needs an independent anchor
- Verdict: goes beyond the recommendation
- Recommended by:
  - Marc Klingen, Langfuse: "Where humans are currently still involved is one you need to align data sets of example questions of how the agents are used." ([The Self-Improving OSS Agent Stack, AI Engineer, 4:08](https://www.youtube.com/watch?v=TeErpYBUIeM&t=248s))
  - Marc Klingen, Langfuse: "You use AI mostly for like proposing improvements to the agent implementation." ([The Self-Improving OSS Agent Stack, AI Engineer, 5:03](https://www.youtube.com/watch?v=TeErpYBUIeM&t=303s))

### Learn from feedback the user gives anyway: corrections, review comments, repeated requests

- What we do: [`/refine weekly`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/refine/SKILL.md) counts corrections and pull request comments; repeated corrections become proposed rules (global ones through the owner's weekly review)
- Verdict: matches
- Recommended by:
  - Marc Klingen, Langfuse: "There's like a lot of like implicit signal that can feed into your process without you as the agent developer needing to do this manually." ([The Self-Improving OSS Agent Stack, AI Engineer, 9:42](https://www.youtube.com/watch?v=TeErpYBUIeM&t=582s))
  - Hussein, Braintrust: "What are scenarios that my users are experiencing frustration by prompting my agent for the same request over and over again?" ([Why Building an Eval Platform Is Harder Than It Looks, AI Engineer, 16:02](https://www.youtube.com/watch?v=mUQoVz7THu0&t=962s))

### Treat failures as the richest signal

- What we do: pitfalls rule (a quirk that cost a retry or a correction goes into [`pitfalls.md`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/reference/pitfalls.md)); recurring review-finding kinds and a hook that records failed tool calls (owner's setup)
- Verdict: matches
- Recommended by:
  - Rafal Wilinski, Runlayer: "It exposes the missing guardrail, the missing library, some kind of edge case that you haven't thought about up front." ([From 36% to 100%: How Self-Improving Agents Write Their Own Skills, AI Engineer, 12:19](https://www.youtube.com/watch?v=u-o0sW9nwmk&t=739s))
  - Hussein, Braintrust: "Grab those failure modes and create test cases so that I can iterate offline, so I can improve my agent quality without introducing new regressions." ([Why Building an Eval Platform Is Harder Than It Looks, AI Engineer, 6:56](https://www.youtube.com/watch?v=mUQoVz7THu0&t=416s))

### Codify unwritten rules; turn repeated work into reusable skills

- What we do: [`refine`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/refine/SKILL.md) and `weekly-review` (owner's setup) turn tasks asked in three or more sessions into skill candidates; [`/recall save`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/recall/SKILL.md)
- Verdict: matches
- Recommended by:
  - Tereza Tížková, Factory: "When you join a new company there are a lot of rules that are not really codified anywhere." ([What It Actually Takes to Build a Software Factory, AI Engineer, 19:29](https://www.youtube.com/watch?v=vGCJ7diEtrw&t=1169s))
  - Karthik Ranganathan, Yugabyte: "We realized that every repeatable workflow was being reinvented on the fly." ([Agent Memory Is Solved. Agent Learning Isn't., AI Engineer, 6:11](https://www.youtube.com/watch?v=9_oy4owGtPI&t=371s))

### Nothing becomes durable without approval; trace every fact to its source

- What we do: reference edits go through [`/recall save`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/recall/SKILL.md), which requires dated entries linked to evidence; weekly proposals wait for "apply"
- Verdict: matches
- Recommended by:
  - Karthik Ranganathan, Yugabyte: "Not anyone can contribute. You need to go through a process of supervised promotion. And only then does it make it durable." ([Agent Memory Is Solved. Agent Learning Isn't., AI Engineer, 5:13](https://www.youtube.com/watch?v=9_oy4owGtPI&t=313s))
  - Karthik Ranganathan, Yugabyte: "Be able to trace it back to something, a data source, a person, a conversation from which it was extracted." ([Agent Memory Is Solved. Agent Learning Isn't., AI Engineer, 5:27](https://www.youtube.com/watch?v=9_oy4owGtPI&t=327s))

### Record what the human declines, as a signal of taste

- What we do: was partial; closed 2026-10-06: `weekly-review` (owner's setup) keeps declined proposals with a reason and checks them before proposing again
- Verdict: done (built after the talk)
- Recommended by:
  - Karthik Ranganathan, Yugabyte: "You can actually start training maybe in the future an agent that's trained on your taste and your preferences long term." ([Agent Memory Is Solved. Agent Learning Isn't., AI Engineer, 16:48](https://www.youtube.com/watch?v=9_oy4owGtPI&t=1008s))

### Run improvement on a schedule

- What we do: the Friday `weekly-review` (owner's setup) routine
- Verdict: matches
- Recommended by:
  - Marc Klingen, Langfuse: "Usually like a [cron] job like every day every week whenever you have like a batch of basically interesting user data." ([The Self-Improving OSS Agent Stack, AI Engineer, 15:17](https://www.youtube.com/watch?v=TeErpYBUIeM&t=917s))

### Measure outcomes, not output; token and line counts invite gaming

- What we do: weekly metrics count corrections and review comments (the reviewer false-alarm rate is added in the owner's setup); never tokens, lines or pull requests
- Verdict: matches
- Recommended by:
  - Ryan Cooke, WorkOS: "It's very hard to distinguish whether the output is actually driving outcomes." ([No, That's Not a Software Factory, AI Engineer, 1:47](https://www.youtube.com/watch?v=HvboD89DyQ8&t=107s))
  - Davis Palmie, Factory: "It's not about who spends the most on tokens. It's about who can get the highest leverage outcomes from that spend." ([The Software Factory: From Bug Report to Production Code, AI Engineer, 16:59](https://www.youtube.com/watch?v=exiwa9QbQXI&t=1019s))

### Use adoption as a signal

- What we do: `weekly-review` (owner's setup) writes per-skill session counts and lists unused skills
- Verdict: matches
- Recommended by:
  - Ryan Cooke, WorkOS: "A sign that this is giving them value and accelerating their work." ([No, That's Not a Software Factory, AI Engineer, 16:44](https://www.youtube.com/watch?v=HvboD89DyQ8&t=1004s))

### Judge a skill change against a baseline

- What we do: [`evaluation.md`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/addskill/references/evaluation.md): baseline and candidate, an independent anchor, "inconclusive" without a baseline
- Verdict: matches
- Recommended by:
  - Rafal Wilinski, Runlayer: "Included in all the future runs and the success ratio went to 100%." ([From 36% to 100%: How Self-Improving Agents Write Their Own Skills, AI Engineer, 13:12](https://www.youtube.com/watch?v=u-o0sW9nwmk&t=792s))

### Capture procedures while the best model is available; keep them portable

- What we do: skills and reference files are plain text in git, read by two vendors' tools
- Verdict: matches
- Recommended by:
  - Rafal Wilinski, Runlayer: "We have skills as a way to retain procedures and improve agents and guide models." ([From 36% to 100%: How Self-Improving Agents Write Their Own Skills, AI Engineer, 14:28](https://www.youtube.com/watch?v=u-o0sW9nwmk&t=868s))

### Keep up with practice that changes weekly

- What we do: `/inspiration` (owner's setup), `/extract` (owner's setup), `/learnings` (owner's setup) and this catalogue
- Verdict: matches
- Recommended by:
  - Dru Knox, Tessl: "You're reading papers, you're watching blogs, you're coming up with best practices that go out of date the next week." ([Harness Engineering: How to Build a Software Factory, AI Engineer, 9:16](https://www.youtube.com/watch?v=X6l4lpA0_NY&t=556s))

### When one agent hits an outage, tell the others

- What we do: [`session-hub`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/session-hub/SKILL.md); machine quirks go into the owner's global rules, which every session loads (owner's setup)
- Verdict: matches
- Recommended by:
  - Karthik Ranganathan, Yugabyte: "The first agent would hit it and then tell everybody that it happened and all the other agents would know that it already happened." ([Agent Memory Is Solved. Agent Learning Isn't., AI Engineer, 17:14](https://www.youtube.com/watch?v=9_oy4owGtPI&t=1034s))

### Group runs, distill, check for injection and personal data, then publish

- What we do: `weekly-review` (owner's setup) groups a week's sessions, redacts secrets, writes no quoted chat, and proposes changes; applied to the template, they are in every new repo
- Verdict: matches
- Recommended by:
  - Rafal Wilinski, Runlayer: "Once it's good, it's landing in our skill library and thanks to our [MCP] gateway, it's being served to each and every client." ([From 36% to 100%: How Self-Improving Agents Write Their Own Skills, AI Engineer, 15:44](https://www.youtube.com/watch?v=u-o0sW9nwmk&t=944s))

## Beyond what the talks covered

Practices the firmware runs that none of the 14 talks recommended. Each links to its public proof.

### A second vendor's model reviews every pull request, in both directions

- What we do: work done in Claude Code is reviewed by OpenAI's Codex before it merges; work done in Codex is reviewed by Claude. Merged in [#214](https://github.com/ryanportfolio/Harness-Firmware/pull/214) ("Review every PR: Codex from Claude Code, Opus from Codex"). Skills: [`codex-review`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/codex-review/SKILL.md), [`codex-fullreview`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/codex-fullreview/SKILL.md), [`claude-review`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/claude-review/SKILL.md).
- Why it matters: the talks recommend checking an agent's work with another agent; here the checker is trained by a different company, so it can catch mistakes the author's model misses.

### `/merge`: review, fix and merge on its own

- What we do: once you start it with `/merge`, every pull request in the session gets a full review by several fresh Codex reviewers, the confirmed findings are fixed and reviewed again, and the pull request is squash-merged only after a clean review and passing CI, at the exact commit that was reviewed. [`merge`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/merge/SKILL.md).

### Skills work in two different agent tools, checked in CI

- What we do: each skill has a Codex version beside its Claude Code version, or is registered as needing Claude-only tools, and CI reports any version that drifts or registration that is missing ([`sync-codex-skills.mjs`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/scripts/sync-codex-skills.mjs), run in [`validate-template.yml`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.github/workflows/validate-template.yml)).

### `/coordinate`: two sessions review each other and agree before acting

- What we do: one session reads another session's work, checks its claims at the source (the pull request diff, its checks, `main`), sends a verdict on each recommendation, and the two go back and forth until they agree on who does what; the user hears from them only when a step needs the user. Messages between sessions never count as the user's approval. [`coordinate`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/coordinate/SKILL.md).

### `/why`: a fresh reviewer for any recommendation

- What we do: before a weighty recommendation is presented, one reviewer with no memory of the conversation looks for what it is missing, and the answer changes or confirms the pick. [`why`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/.claude/skills/why/SKILL.md).

### Visual checks on the real GPU, never headless

- What we do: browser checks run in a real, visible Chrome on the machine's GPU, placed away from the user's work; headless mode is not accepted for visual or motion claims. Kernel "Verification" section in [`CLAUDE.md`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/CLAUDE.md), launcher [`launch-chrome.mjs`](https://github.com/ryanportfolio/Harness-Firmware/blob/main/scripts/lib/launch-chrome.mjs).

### Every talk is compared against the setup (owner's setup)

- What we do: each conference talk the owner watches is turned into a comparison table against the firmware, with timestamps, and adopted ideas are built the same week. This file is one result of that. Not part of the public template.

## Results

Figures from the firmware's own history. "On GitHub" means anyone can check it on the pull request page; "owner's review logs" means it comes from the Codex session records on the owner's machine, which are not public.

| Figure | Source |
|---|---|
| A pull request that added an unattended weekly mode to the `refine` skill went through 3 Codex review rounds before merging: 2 findings, then 4, then none; every finding was fixed | fix commits ("Address Codex review of refine weekly mode", "Fix round 1 findings in refine weekly mode") on GitHub: [#211](https://github.com/ryanportfolio/Harness-Firmware/pull/211); round counts and findings: owner's review logs |
| A later pull request passed a full review by 3 independent Codex reviewers with no findings, and CI passed on Ubuntu and Windows | CI results on GitHub: [#212](https://github.com/ryanportfolio/Harness-Firmware/pull/212); reviewer count and findings: owner's review logs |
| Review by the other vendor's model became the rule for every pull request, from both tools | on GitHub: [#214](https://github.com/ryanportfolio/Harness-Firmware/pull/214) |
