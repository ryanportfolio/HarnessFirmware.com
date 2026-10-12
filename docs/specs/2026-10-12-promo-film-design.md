# Promo film: what the talks recommend, and what Harness Firmware already does

Date: 2026-10-12. Status: animatic, waiting for the owner's OK before the full build.

A shareable 16:9 silent film at `/promo` (`site/promo.html`, `site/promo-film.mjs`, `site/promo.css`). Each beat pairs one practice that AI Engineer speakers (and two YouTube educators) recommend, quoted and attributed, with a picture of how Harness Firmware already does it. It builds through foundations, planning, checking work, gating the pull request and improving over time, turns to what no talk covered, and closes on results.

Source for every quote, claim and number: `docs/promo/social-proof.md`. No other quotes are used.

## Rules this film follows

- Only practices the firmware matches or goes beyond, plus the unique items. No gaps, no totals, no percentages.
- Attribution, not endorsement: "Dru Knox · Tessl" beside the quote. No logos. The sources list under the film says the speakers did not review or endorse Harness Firmware; the close carries one small line saying the same (owner to keep or cut).
- Codex reviewing every pull request is stated plainly. Never "nothing merges without your approval", no skill counts, no rerun counts or other settings.
- Owner's setup items (weekly-review, disk-cleanup, token guard, Harness Console, the talk-by-talk comparison) are not shown. `/refine weekly`, which is in the template, carries the improvement beat.
- The human step appears wherever the loop is described: you decide in planning, you say go, you type `/merge`, you apply the proposals.
- Display text has no closing periods and no em dashes. Quotes keep their own punctuation.

## The look: anatomy on the site's palette

From the anatomy skill (github.com/wheresryan22/anatomy): the object is the explanation. One isometric machine, built from solid parts with the kit's four-tone side shading, lighter tops, thin lines, screws, a ruler strip and one engraved label plate, stands for a repository with the firmware in it. Its geometry comes from the kit itself (`site/iso-kit.mjs`, the geometry half of `kit/iso-kit.mjs`, MIT, vendored unmodified).

From the site: the ink ground (#0f1210), paper lines, green (#53db76) for Claude Code and anything verified, amber (#efc87e) for Codex, findings and open choices; Lineal for answers, Fraunces italic for quotes, Departure Mono for labels and readouts; dust motes, grain and a vignette as on the About film. Anatomy's card corners appear as crop marks, and its live readout sits bottom right.

Stations along the bench, left to right, with a gantry rail behind carrying two heads (Claude Code, green; Codex, amber):

| Station | Stands for |
|---|---|
| Kernel plinth with `CLAUDE.md` and `AGENTS.md` plates | The always-loaded kernel |
| Skill rack: front row `.claude/skills`, back row `.agents/skills`, two back slots holding only a tag | Skills, their Codex versions, skills registered as Claude only |
| Cabinet of six drawers `.claude/reference` | Project memory; `pitfalls.md` is the middle right drawer |
| Planning desk: fact tray, choice switches, Go lever, you in front | `deep-plan` |
| Line: Manager with `state.md`, Executor press, Auditor dial, a dependency rack of steps | `long-horizon` |
| Arena: three turntables, covered name plates, a judge lamp | `arena` |
| Review gate: track, arch of reviewer lenses, `/merge` key with you beside it, CI tower, merged stack | The cross-vendor review and `/merge` |
| Reader behind the gate, tally jars, return pipe to an apply slot by the drawers | `/refine weekly` and your apply |

## Beat sheet

Times in seconds; total 123.5. Beats after the opening start 2 s later than the times below, which were set before the opening grew to 11 s. Each quote beat shows: chapter index, the quote (Fraunces), the speaker (mono), then the answer (Lineal, the last word in green Fraunces) with the skill or "Harness Firmware" above it, and a live readout bottom right.

| # | Time | Practice (source heading) | Speaker and exact quote | Picture | On-screen words |
|---|---|---|---|---|---|
| Open | 0–11 | | | Dust; the problem line alone, then the machine fades up and each answer row lights its station (drawers, gate, line) | "Coding agents forget, grade their own work and get lost in long *jobs*" · HARNESS FIRMWARE · FOR CLAUDE CODE AND CODEX · three rows, the problem struck through in mono beside its answer: FORGETS → "Lessons committed to the repository, read when a task needs *them*"; GRADES ITS OWN WORK → "Another company's model reviews every pull *request*"; GETS LOST IN LONG JOBS → "Long jobs run in rounds a fresh Auditor *checks*" · WHAT THE TALKS RECOMMEND · WHAT HARNESS FIRMWARE ALREADY DOES |
| 01 | 9–15.5 | Write the project's context down once | Nick Saraev, YouTube educator: "Because you only ever need to create it once it saves you the time from having to continuously reprompt." ([6:24](https://www.youtube.com/watch?v=lNum1UFDYn0&t=384s)) | Claude Code's head reads the `CLAUDE.md` plate three times, one session each; the plate lights as it reads | "CLAUDE.md and AGENTS.md load in every *session*" · readout SESSION n · CLAUDE.md LOADED |
| 02 | 15.5–21.5 | Load details only when needed (progressive disclosure) | Tereza Tížková, Factory: "We just progressively disclose what's in the context and what tools to use." ([16:14](https://www.youtube.com/watch?v=vGCJ7diEtrw&t=974s)) | The rack sits dark with only spines showing; one cartridge lifts and its playbook unfolds as a sheet, then it drops back | "A skill's full playbook loads only when a task calls *it*" |
| 03 | 21.5–28.5 | Write the playbook down after cracking a hard problem | Rafal Wilinski, Runlayer: "If agents would try to figure out that from scratch, they are likely going to fail." ([4:38](https://www.youtube.com/watch?v=u-o0sW9nwmk&t=278s)) | Session one snags on its third block (amber); a lesson card files into the `pitfalls.md` drawer; the next session opens that drawer first and builds all four | "A quirk that cost a retry goes into pitfalls.md, without *asking*" |
| 04 | 28.5–35 | Give every agent tool the same context | Davis Palmie, Factory: "Even though humans and agents may use different services, everything should share the same underlying harness and context." ([12:52](https://www.youtube.com/watch?v=exiwa9QbQXI&t=772s)) | Codex's head arrives on the same rail; both read the kernel, the drawers open for both, the rack's back row lights amber | "Claude Code and Codex read the same *files*" |
| 05 | 35–43 | Humans decide what to build; resolve ambiguity instead of guessing | Tereza Tížková, Factory: "Deciding what to build in the software not how to build it." ([21:36](https://www.youtube.com/watch?v=vGCJ7diEtrw&t=1296s)); Gabriel Martinez, G2i: "The danger is that the engineer never noticed that there was a choice to make." ([1:00](https://www.youtube.com/watch?v=6qkzlT962es&t=60s)) | The agent drops facts in the tray; open choices rise as amber switches; you flip each one green | /deep-plan · "Every open choice comes to you as a *decision*" |
| 06 | 43–50 | Once the work starts, nobody shepherds each step; plan steps with dependencies | Ryan Cooke, WorkOS: "We don't need a human to be shepherding this agent through every single step of the life cycle." ([8:03](https://www.youtube.com/watch?v=HvboD89DyQ8&t=483s)) | You pull Go once; steps on the dependency rack light as their dependencies pass and ride the line in parallel rounds | /long-horizon · "You say go once. Ready steps run in *rounds*" |
| 07 | 50–58 | Evidence before trust; validators judge work they did not write, against a contract written first | Miguel (Browserbase) and Corby (Microsoft): "The agents will often overconfidently claim that they did something when in fact they did not do it." ([6:50](https://www.youtube.com/watch?v=xLxhT2ZI7UM&t=410s)) | The Manager seals a brief and slides it to the Auditor before the step runs; the Executor stamps DONE; the Auditor's dial fails it and it goes back; the second pass verifies | /long-horizon · "A fresh Auditor checks each step against a brief written *first*" |
| 08 | 58–65 | Try several versions and compare them side by side | Hussein, Braintrust: "Being able to do this type of side-by-side comparison becomes the next evolution of the eval cycle that we see." ([9:52](https://www.youtube.com/watch?v=mUQoVz7THu0&t=592s)) | Three attempts on turntables; the name plates are covered; the judge lamp sweeps; B lights and one piece each from A and C flies onto it | /arena · "Several attempts, judged blind, the best ideas *grafted*" |
| 09 | 65–75.5 | Expensive checks once per pull request (goes beyond) | Dru Knox, Tessl: "This is for expensive things you want to run once when the PR goes up." ([7:23](https://www.youtube.com/watch?v=X6l4lpA0_NY&t=443s)) | You turn the `/merge` key; the PR card rolls under the arch; amber lenses scan; three findings; one is dropped on checking, two are fixed; the whole card is scanned again; CI lights; the card merges at the commit reviewed | GOES BEYOND THE RECOMMENDATION · /merge · "Codex reviews every pull request before it *merges*" |
| 10 | 75.5–85 | Point agents at past sessions to find mistakes (goes beyond); nothing becomes durable without approval | Ryan Cooke, WorkOS: "We can actually point agents at sessions and see where are the gaps and how people are using our factory." ([17:24](https://www.youtube.com/watch?v=HvboD89DyQ8&t=1044s)) | Session strips feed the reader; repeated corrections stack in a jar; at three a proposal prints and rides the pipe to the apply slot; you apply it and it files into the drawers | GOES BEYOND THE RECOMMENDATION · /refine weekly · "Repeated corrections become proposed rules. You *apply* them" |
| Turn | 85–87.5 | Beyond what the talks covered | | Full view | NO TALK RECOMMENDED THESE · "Beyond what the talks *covered*" |
| 11 | 87.5–94.5 | A second vendor's model reviews every pull request, in both directions | | Claude Code's card goes under amber lenses; then Codex writes a card and the lenses turn green for Claude's review | Every pull request · "Work from Claude Code, reviewed by Codex" · "Work from Codex, reviewed by *Claude*" |
| 12 | 94.5–100.5 | `/coordinate`: two sessions review each other and agree before acting | | Two Claude Code heads trade verdict chips over the desk and the line until the last chip is green; then each takes its step | /coordinate · "Two sessions check each other and agree before *acting*" |
| 13 | 100.5–105.5 | Skills work in two different agent tools, checked in CI | | The rack's twin rows; one Codex version drifts amber and is flagged | Two tools, one skill set · "CI flags any skill whose Codex version *drifts*" |
| Results | 105.5–115 | Results | | The gate replays: three scans for #211, a clean pass with both CI lamps for #212 | Harness-Firmware #211 · "2 findings then 4 then *none*" · THREE CODEX REVIEW ROUNDS · EVERY FINDING FIXED · Harness-Firmware #212 · "3 reviewers, no *findings*" · CI PASSED ON UBUNTU AND WINDOWS · Harness-Firmware #214 · "Review by the other vendor's model, the rule for every pull *request*" |
| Close | 115–121.5 | | | Full view, the heads working | "Better outcomes, every *round*" · MEMORY, WORKFLOWS AND REVIEW FOR CLAUDE CODE AND CODEX, BUILT INTO THE REPOSITORY · harnessfirmware.com · small line on quotes and endorsement |

Practices covered with a quote on screen: 14 (beats 01 to 10, four of them pairing two related practices). Unique items: 3. Results: 3.

Candidates left out for length, each with a quote in the source file: keep always-loaded context small (Karthik Ranganathan, Yugabyte), cheap checks while the agent works, which goes beyond (Dru Knox, Tessl, with real-GPU visual checks as its picture), AI judges are confidently wrong (the "more competent liar" quote), `/why`, and nothing becomes durable without approval (Karthik Ranganathan). Any of them can swap in for a beat the owner finds weaker.

## Build and checks

- `frame(t)` is pure: every part's position, colour and caption opacity come from t. `window.promoFilm.seek(t)` jumps to any moment; `?t=<seconds>` opens on a frame; `?still` opens without autoplay.
- Animatic checks in this cloud session: stills at chosen times and contact sheets, from headed Chromium under Xvfb with no GPU (software rendering). Motion, frame timing and GPU behaviour were not checked here.
- Full build (after the owner's OK): anatomy-level detail on every station, closer framing per beat, motion polish, a wow-loop round with a check that a stranger can say what Harness Firmware is and why to use it after one playback, then a cross-vendor review before merge. No MP4 export until the owner approves the animation.

## Open questions for the owner

1. Keep the small endorsement line in the close, or rely on the sources list under the film?
2. Length is about 2:04. Trim to 1:45 by dropping beat 13 and shortening the opening, or keep?
3. Results: the #211 round counts and the #212 reviewer count come from the owner's review logs, not GitHub. Show them as is (the source file allows it), or show only what GitHub shows?
