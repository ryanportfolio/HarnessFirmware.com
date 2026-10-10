# Recon: arena and showpiece

Source of truth: ryanportfolio/Harness-Firmware at commit 64e8f247dc7ca70cd6b03ac78f8786df06813c5c.

Source keys used below:

- `A:n` = `.claude/skills/arena/SKILL.md` line n at that commit.
- `S:n` = `.claude/skills/showpiece/SKILL.md` line n at that commit.
- `CR:n` = `.claude/skills/codex-review/SKILL.md` line n at that commit (read only to resolve the model id arena points to).
- `SITE-arena` = ryanportfolio/HarnessFirmware.com `site/arena.html` at main 2d740a9137cff389e568d3f28631a02e1ead9a02. The file is one line long, so quotes are located by section, not line.
- `SP:n` = HarnessFirmware.com `site/skill-pages.mjs` line n at main 2d740a9.
- `SK` = HarnessFirmware.com `site/skills.html` at main 2d740a9 (one-line catalog entries).

Neither skill has a `references/` folder at this commit: the directory listings for `.claude/skills/arena/` and `.claude/skills/showpiece/` return only `SKILL.md`, and both `references/` paths return 404. Neither SKILL.md links a reference file.

---

## Arena

### 1. What it is

"Builds parallel attempts at one task, judges them blind, and grafts the best ideas onto the strongest." (A:3)

### 2. When to use it

- "Use when the right shape of a solution is unclear and building several real versions will show it." (A:8)
- Triggers: `/arena`, "try a few approaches", "build me options", bakeoffs, competing versions, or a stalled `long-horizon` or `wow-loop` step. (A:8)
- Skip: "arena" meaning a game level or map; work whose shape is obvious; tuning values of a settled design (`lab`); comparing options on paper (`dare`); reviewing an existing diff (`impartial-review`). (A:9)

### 3. Why it is useful (outcome)

- Several real versions show the right shape of a solution when it is unclear. (A:8)
- Output is one final artifact that passes the real checks it claims (tests, build, render, measurement), plus a run record `note.md`. (A:57)
- The final artifact reads as one piece: "A reader of the final artifact should not be able to tell where one candidate ends and another begins." (A:47)

### 4. Mechanism, step by step

1. Preconditions. Every candidate and the judge run with fresh context: Agent tool workers, plus `codex exec` processes for Codex workers. No fresh-context route: tell the user and stop. The parent never builds a candidate itself. (A:13)
2. Scope. Work in scratch only. Commit, push, PR, merge, deploy and installs each need their own authorization. (A:15)
3. Arena folder. Everything lives under `.tmp/arena/<slug>/`; the access rules carry the blinding and isolation. (A:19)
   - `brief.md`: artifact, inputs, constraints. Written by parent; read by candidates and parent. (A:23)
   - `criteria.md`: 3 to 6 pass/fail criteria an outsider could check. Example given: "adds a `--dry-run` flag that performs no writes"; "clean code" is too vague. Read by parent and judge only; never copied into a candidate's folder or worktree. (A:24)
   - `c1/` ... `cN/`: one candidate's artifact plus `rationale.md` (options it considered and dropped, with reasons). Written by that candidate only, in this folder or its own git worktree. Read by parent only; the judge never sees `rationale.md`. (A:25)
   - `judge/`: each artifact copied under a neutral letter, with names, angle, vendor and model traces removed, content otherwise unaltered. Written by parent; judge reads it read-only. (A:26)
   - `note.md`: the run record. (A:27)
   - No two workers share a writable path. Parent holds the letter-to-candidate map until the verdict, then writes it to `note.md`. Any trace that cannot be removed is recorded as a blinding limit. (A:29)
4. Candidates. Three by default; more on request or when options are many. Each brief names a different angle, for example minimal change, failure-proof, or end-user-first. (A:33)
5. Isolation. Agent workers run with `isolation: "worktree"` on Opus, the latest Fable, or higher; never `sonnet` or `haiku`. A user-chosen model that meets that floor wins. (A:33)
6. Vendor mix. Mixed without asking. If Codex has an accepted route (a ChatGPT login or a `model_provider` gateway, as `codex-review` preflight defines), one candidate and the judge run through `codex exec` with the Sol model id `codex-review` pins. Never bypass approvals or the sandbox. Only the user's explicit request skips Codex. No accepted route: all workers run on Claude, noted; never switch Codex to an API key or paid credits. (A:35) The pinned id at this commit is `gpt-6.1-sol` (CR:15).
7. Browser artifacts: each candidate brief includes the `CLAUDE.md` browser rule. (A:37)
8. Dropouts. A candidate that returns nothing, or a Codex run the sandbox blocks, is a dropout: recorded, run continues. (A:39)
9. Blind judging. Judge starts only after all candidates return. Fresh and read-only; sees only `criteria.md` and `judge/`. Returns pass/fail per criterion with evidence for every letter, plus a recommended base. (A:41)
10. Parent decides. Reads every candidate completely, low scorers included, and scores the criteria itself. Before overruling the judge, rechecks the evidence the judge cited. (A:45)
11. Base choice. The base is the candidate whose design the planned merges would disturb least; if tied, the one with less code. (A:47)
12. Grafting, concretely. Take at most one or two ideas from each other candidate and rewrite them to the base's conventions. (A:47)
13. Split premise. If candidates split over a basic premise, `brief.md` has a gap: fix the brief and run a new round. A merge of both premises is never the answer. If all agree, still run the checks. (A:49)
14. Reruns. One rerun total, spent on a split premise or a verification failure traced to the brief. If verification fails on something another candidate already solved, return to merging. More reruns need the user's OK. (A:53)
15. Done when. Artifact passes the real checks it claims, and `note.md` lists in order: (1) worker table: letter, model, vendor, angle, outcome (returned, dropped, blocked); (2) blinding limits and the judge's verdict; (3) for each non-base candidate, every idea looked at, marked taken or left with reason, base choice and reason at the top; (4) check commands and results. (A:57-62)
16. Output location. Parent writes the final artifact to the path the user named, else where the base candidate's work belongs in the repo. Candidate folders stay in scratch. (A:64)

### 5. Exact short strings usable on screen

- "Builds parallel attempts at one task, judges them blind, and grafts the best ideas onto the strongest." (A:3)
- "try a few approaches" (A:8)
- "build me options" (A:8)
- `.tmp/arena/<slug>/` (A:19)
- `brief.md`, `criteria.md`, `c1/` ... `cN/`, `rationale.md`, `judge/`, `note.md` (A:23-27)
- "3 to 6 pass/fail criteria an outsider could check" (A:24)
- "adds a `--dry-run` flag that performs no writes" (A:24, example criterion)
- "Three by default" (A:33)
- "minimal change, failure-proof, or end-user-first" (A:33, example angles)
- `isolation: "worktree"` (A:33)
- "neutral letter" (A:26)
- "No two workers share a writable path." (A:29)
- "Fresh and read-only" (A:41)
- "pass/fail per criterion with evidence for every letter, plus a recommended base" (A:41)
- "Read every candidate completely, low scorers included" (A:45)
- "at most one or two ideas from each other candidate" (A:47)
- "rewrite them to the base's conventions" (A:47)
- "a merge of both premises is never the answer" (A:49)
- "One rerun total" (A:53)
- "returned, dropped, or blocked" (A:59)
- "taken or left" (A:61)
- "Candidate folders stay in scratch." (A:64)

### 6. False or risky to claim

- "Always three candidates." False. Three by default; more on request or when options are many. (A:33)
- "One candidate always runs on Codex" or naming Sol / `gpt-6.1-sol` unconditionally. Conditional on Codex having an accepted route (ChatGPT login or `model_provider` gateway). Without it, all workers run on Claude. User can also explicitly skip Codex. (A:35) The pinned id is a moment-in-time pin that codex-review itself says may go stale (CR:15); avoid putting the model id on screen.
- "Each candidate runs in its own git worktree." Partly conditional. Agent workers run with `isolation: "worktree"` (A:33); a candidate writes "in this folder or its own git worktree" (A:25). Codex candidates run through `codex exec` (A:35); the source does not say they get a worktree. Safe phrasing: separate writable paths (A:29).
- "The judge picks the winner." False. Judge returns a recommended base (A:41); the parent scores the criteria itself and may overrule after rechecking cited evidence (A:45).
- "The best-scoring candidate becomes the base." Not the stated rule. Base = the design the planned merges would disturb least, tie-break less code (A:47). The frontmatter says "onto the strongest" (A:3), so "strongest" is source language, but the decision rule is disruption-based.
- "Merges everything good from every candidate." False. At most one or two ideas per other candidate (A:47). Ideas are rewritten, not pasted (A:47).
- "Merges the two best approaches." False when candidates split on a premise: that triggers a brief fix and new round, never a merge of both premises (A:49).
- "Retries until it passes." False. One rerun total; more need the user's OK (A:53).
- "Ships / commits / opens a PR." False. Arena permits scratch work only; commit, push, PR, merge, deploy and installs need their own authorization (A:15).
- "Judge sees the reasoning." False. Judge never sees `rationale.md`; it sees only `criteria.md` and `judge/` (A:25, A:41).
- "Perfectly blind." Risky. Source records traces that cannot be removed as a blinding limit (A:29); blinding is best-effort by design.
- "Judge runs in parallel with candidates." False. Judge starts only after all candidates return (A:41).
- Showing Sonnet or Haiku as a worker: false (A:33).

### 7. What the existing site arena page already shows (avoid repeating)

Page: `site/arena.html` on HarnessFirmware.com main (2d740a9), script `site/skill-pages.mjs`.

- Hero: eyebrow "Explore approaches / 02", title "Arena", lead "Try different solutions before one shape becomes the whole project." (SITE-arena, `.skill-hero`)
- Demo frame header: "ILLUSTRATIVE / ONE SHARED HOMEPAGE BRIEF" with a "Play selection ▷" button. (SITE-arena, `.skill-demo`)
- Picture: three side-by-side cards for a fictional homepage brief (SITE-arena, `.arena-candidates`):
  - "CANDIDATE A / EDITORIAL", heading "Start with a story", verdict "Keep the opening / Next step is missing".
  - "CANDIDATE B / GUIDED", heading "Start with your project", button "Create a project ↗", verdict "Keep the hierarchy / One visible next step".
  - "CANDIDATE C / VISUAL", heading "See a first draft", a mini plan card "Homepage plan / 01 Explain the product / 02 Show the next step / 03 Review the draft", verdict "Keep the useful preview / Make it compact".
- Interaction: three-step autoplay, 3500 ms per step, pauses when offscreen or tab hidden, stops under reduced motion (SP:22-23). Step 0: three cards shown. Step 1: B selected. Step 2: cards hide and an assembly view appears (SP:8-10).
- Step 2 picture: a contribution list (B "Keep the base / Hierarchy + action", A "Add the opening / Explain the product", C "Add the preview / Show the first draft") beside an assembled mock browser page "FIELDNOTES / HOME" with origin tags "A / opening", "B / one visible next step", "C / compact preview". (SITE-arena, `.arena-assembly`)
- Motion: a letter chip (B, then A, then C) flies from each list row to the part it contributed, 750 ms each, 240 ms stagger, then scales to 0.6 and fades. (SP:12-19)
- Status captions per step (SP:6): "Three completed candidates. A blind judge and the manager check them against the same criteria." / "Select B: the clearest hierarchy and mobile layout. Record the reason for the choice." / "Combined result: B's hierarchy keeps Create a project visible. A explains the product; C shows the first draft. Now verify this result against the same rubric."
- Article cards below: "When the shape is still open", "Choose, then synthesize", "What you keep", "What it needs", "The example, without playback", "Make the comparison useful", plus a copyable invocation "$arena Explore three homepage approaches. Compare first-screen clarity, navigation at 390px, and maintainability." (SITE-arena, `.skill-article`)
- Catalog entry on /skills: "Build alternatives, judge them blind, combine the best." (SK, `#skill-arena`)

Already used, so the reel should avoid: three homepage cards labelled A/B/C with editorial/guided/visual angles; the "B becomes base" storyline; letter chips flying into an assembled mock homepage; the "FIELDNOTES / HOME" mock browser; the 390px navigation rubric.

Not yet pictured on the site (fresh ground, all sourced): the `.tmp/arena/<slug>/` folder tree with its access rules (A:21-27); the judge's restricted view (only `criteria.md` and `judge/`) and the letter-renaming that strips names, angle, vendor and model traces (A:26, A:41); `rationale.md` hidden from the judge (A:25); the dropout path (A:39); the split-premise branch back to `brief.md` (A:49); the one-rerun budget (A:53); the ordered `note.md` record (A:57-62).

Site vs source wording to note: the site says "each in its own scratch folder" and "With a ChatGPT-subscription Codex login" (SITE-arena, "Choose, then synthesize" and "What it needs"); source says "in this folder or its own git worktree" (A:25) and accepts "a ChatGPT login or a `model_provider` gateway" (A:35). Do not copy the site's narrower phrasing into the reel as if it were the whole rule.

---

## Showpiece

### 1. What it is

"Push an artifact past what people expect from its kind, in any medium." (S:3)

Body: "Make artifacts whose content, form, and execution feel specific to their subject and intended audience." (S:8)

### 2. When to use it

- Use for `/showpiece`, ambitious creative direction, portfolio-quality work, or replacing generic AI styling. (S:3)
- Not for quiet or faithful work: forms, dashboards, exact recreations, brand matching; use `frontend-design` or the project's UI skill instead. (S:3)
- Skip routine edits unless explicitly invoked. (S:3)

### 3. Why it is useful (outcome)

- "Aim for work people did not think was possible for this subject." (S:8)
- Content, form and execution feel specific to the subject and audience. (S:8)
- Delivery: the artifact plus "a short account of its central choice, what was verified, and any material limitations." (S:82)

### 4. Mechanism, step by step

The SKILL.md has six working sections. They are stages of judgment, not a numbered pipeline; the source does not number them.

1. Ambition default. "Ambition is the default." A plain or familiar treatment counts as a failure unless the user asked for one. Fixed requirements (contracts, accessibility, real content) still hold; push everything around them. Originality does not require an unprecedented technique; unusually good material can carry it. (S:10)
2. Establish the brief. Who encounters it, what they should understand, feel or do, where and when. Separate fixed requirements from room to explore: content, brand, medium, dimensions, accessibility, available assets, time, production limits. (S:14) Ask only about missing choices that would materially change direction; otherwise state an assumption and proceed. (S:16)
3. Concept sketching. Unless the user approved a direction, sketch two or three directions in words that differ in idea; pick the one that goes furthest while still doing the job. A major piece may need competing prototypes. An approved direction gets development, not another concept search. (S:18)
4. Find the material. Before a visual treatment, inspect the subject's actual material: language, images, objects, data, history, behavior, tensions, human details. (S:22) Use concrete material early (real headline, photograph, quotation, interaction). Verify claims that shape the concept. "Never invent specificity to make the subject seem richer." (S:24)
5. References. Inspect examples relevant to the medium and audience, adjacent fields when useful. Extract a principle (pacing, image scale, information density). "Name a specific work rather than a movement"; "Swiss" or "brutalist" alone tends to produce that style's stock version. Do not default to the visual treatment of a previous success. (S:26)
6. Choose a creative direction. Starting points: a story, an editorial argument, a remarkable image, a typographic composition, a useful interaction, a material quality, a system drawn from data, or a metaphor; "not a checklist or a closed menu." (S:30) Changing only colors and fonts does not test a different idea. (S:32) Describe each direction: what the viewer experiences, which material makes it specific, what could make it fail. Choose the one that would surprise someone who knows this kind of artifact, if its audience can still use it. One idea carried through; "a different borrowed object in each section is a collage, not a concept." (S:34)
7. Anti-generic test (the swap test). "if the name and logo changed, could this pass unchanged for many unrelated subjects?" If so, strengthen the content-treatment relationship. Keep a convention only where people need it to act. (S:36)
8. Clarity guard. If the idea needs a long explanation, find a clearer form of the same ambition. "Spectacle that ignores the subject is not ambition." If every direction fails at specimen scale, say so rather than presenting a safe treatment as the result. (S:38)
9. Prove at small scale. Build the smallest specimen that tests the biggest uncertainty in the actual medium: a representative spread, a working interaction, a poster at viewing distance, a short sequence with sound. An attractive cover alone cannot prove a dense report works. (S:42) Inspect the rendered result; if it fails, revise before extending. (S:44) Solve the hard part at specimen scale before retreating; if polishing leaves the same weakness, return to material or concept instead of adding effects. (S:46)
10. Develop with deliberate choices. Set a few working rules from the specimen (hierarchy, typography, image treatment, spacing, color roles, motion behavior). (S:50) "Give attention unevenly." Design every section; "a strong opening followed by template sections reads as unfinished." (S:52) Choose techniques for their result; check usage rights where relevant. (S:54)
11. Medium rules. (S:56-64)
    - Documents and PDFs: reading order, sustained readability, page turns, export or print behavior. (S:58)
    - Sites and interactive work: actual tasks, responsive composition checked in the same pass at the narrowest phone width supported (375 px when it supports phones and names no width), meaningful states, keyboard access, behavior under interaction. (S:59)
    - Decks: viewing distance, presenter's role, pacing between slides, whether it must work alone. (S:60)
    - Posters: recognition at intended distance, clear focal point, what closer viewing adds. (S:61)
    - Video and audio: duration, rhythm, transitions, sound, comprehension over time. "Still frames cannot establish timing quality." (S:62)
    - Other media: identify equivalent constraints. When adapting, reconsider how the strongest qualities work in the new medium. (S:64)
12. Critique. Inspect at representative sizes, durations, conditions; state inspection limits. (S:68) Three kinds of judgment: Purpose, Character and craft, Correctness. (S:72-74) Look for interchangeable copy, default compositions applied without regard to content, effects that obscure hierarchy, fabricated detail, repetition that flattens pacing. (S:76) Ground criticism in observable evidence; distinguish defects from taste. Fresh reviewers only when independent review is requested or authorized, otherwise self-review labelled as such. Model reviewers tend to rate polished, safe work highly; "never pick a safer candidate over a bolder one because of flaws that can be fixed." (S:78)
13. Stop rule. Fix the most consequential weakness first, re-inspect. Stop when the work meets the brief, consequential defects are resolved, the central idea carries through every section, and remaining changes are preference-level. Report unresolved failures. "Do not manufacture criticism or imply that originality has been objectively proven." (S:80)

What "distinctive" means in its rules: the word "distinctive" does not appear in the SKILL.md at this commit. The operative definition is subject-specificity: content, form and execution "specific to their subject and intended audience" (S:8), "Which choices arise from this subject?" (S:73), and failing the name-and-logo swap test (S:36).

Banned defaults list: none. The source explicitly rejects one: "A gradient, rounded corner, or symmetrical layout is not itself evidence of weak work." (S:76) The generic-signals it lists are diagnoses, not bans (S:76).

### 5. Exact short strings usable on screen

- "Push an artifact past what people expect from its kind, in any medium." (S:3)
- "Aim for work people did not think was possible for this subject." (S:8)
- "Ambition is the default." (S:10)
- "exuberant, strange, playful, or severe, but never timid" (S:10)
- "Originality does not require an unprecedented technique; unusually good material can carry it." (S:10)
- "sketch two or three directions in words that differ in idea" (S:18)
- "Never invent specificity to make the subject seem richer." (S:24)
- "Name a specific work rather than a movement" (S:26)
- "Changing only colors and fonts does not test a different idea." (S:32)
- "a different borrowed object in each section is a collage, not a concept." (S:34)
- "if the name and logo changed, could this pass unchanged for many unrelated subjects?" (S:36)
- "Spectacle that ignores the subject is not ambition." (S:38)
- "Build the smallest specimen that tests the biggest uncertainty in the actual medium." (S:42)
- "Give attention unevenly." (S:52)
- "a strong opening followed by template sections reads as unfinished." (S:52)
- "Still frames cannot establish timing quality." (S:62)
- "Purpose", "Character and craft", "Correctness" (S:72-74)
- "never pick a safer candidate over a bolder one because of flaws that can be fixed." (S:78)
- "Let the work carry the creative claim." (S:82)
- Medium names: "Documents and PDFs", "Sites and interactive work", "Decks", "Posters", "Video and audio" (S:58-62)

### 6. False or risky to claim

- "Showpiece has a banned-defaults list" or "bans gradients / rounded corners." False. S:76 says those are not themselves evidence of weak work.
- "Anti-generic pass" as a named stage. Not a named stage. The generic check is the swap test (S:36) plus the review diagnosis list (S:76). Fine to depict the swap test; do not label it a pass or step number the source does not have.
- "Generates three concepts every time." Conditional. Two or three word sketches only when no direction is approved; an approved direction skips concept search (S:18). "Competing prototypes" are "may need" for a major piece (S:18), not standard.
- "Independent reviewers critique the work." Conditional. Only when independent review is requested or already authorized; otherwise self-review, labelled as such (S:78, S:86).
- "Proves the work is original" or any originality score. False. "Do not manufacture criticism or imply that originality has been objectively proven." (S:80)
- "Always makes it loud / maximal." Risky. The work "can be exuberant, strange, playful, or severe" (S:10); severe is allowed; spectacle that ignores the subject is not ambition (S:38).
- "Overrides accessibility or brand." False. Fixed requirements such as contracts, accessibility and real content still hold (S:10).
- "Use it for dashboards / forms / brand matching." False per S:3.
- "Invents rich details." False. S:24.
- "Checks every site at 375 px." Conditional. 375 px only when the work supports phones and names no width; otherwise the narrowest width the work supports (S:59).
- Catalog drift: the local skills listing in this session describes showpiece as "Create distinctive, crafted artifacts in any medium"; the source at this commit says "Push an artifact past what people expect from its kind, in any medium." (S:3) Use S:3. The site catalog entry "Craft a distinctive artifact around its subject." (SK, `#skill-showpiece`) is a paraphrase, not source text.

### 7. Existing site coverage for showpiece

No dedicated showpiece page found in `site/` listing at main 2d740a9 (files matching arena/skill/showpiece: `arena.html`, `skill-directory.mjs`, `skill-pages.mjs`, `skill-scroll.mjs`, `skill-showcase.css`, `skill-showcase.mjs`, `skills-page.test.mjs`, `skills.html`). Only the catalog entry exists: "Craft a distinctive artifact around its subject." / "Choose a direction from the real material, test it in the intended medium, and refine the details people encounter." / invocation "Create a distinctive project landing page." (SK, `#skill-showpiece`)

---

## Unverified

- Whether Codex candidates in arena get a git worktree or another isolated path: the source does not say beyond "this folder or its own git worktree" (A:25) and "No two workers share a writable path" (A:29).
- Whether `skill-showcase.mjs` or `skill-scroll.mjs` animate arena or showpiece anywhere else on the site: not read.
- `gpt-6.1-sol` being the current newest Sol: CR:15 tells the runner to check for a newer one at launch; not checked here.
