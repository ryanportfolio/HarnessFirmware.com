# Skills reel: chosen brief

Status: direction chosen, animatic pending owner approval. Nothing is built for the site until the owner approves the beat sheet and animatic.

## Job

Nine self-contained looping scene modules (8 to 10 s each) for skill cards on the skills page, with the description beside each card in real HTML, plus one ~90 s reel of the same modules for sharing, exported to MP4 last. Skills: `/merge` (opening on its review layers `/codex-fullreview` and `/codex-review`), `/deep-plan`, `/long-horizon`, `/smart-compact`, `/why`, `/wow-loop`, `/perf-loop`, `/arena`, `/showpiece`. Silent. Vanilla JS, 2D canvas, site fonts and palette, deterministic `frame(t)`.

Feeling and job: when the reel ends, the viewer feels the calm satisfaction of watching good machinery run, and knows that each skill is a specific, repeatable mechanism that checks its own output instead of trusting it.

## Direction: The bench (pitch A) with grafts

Base: `pitches/A-bench.md`, sections 2 to 5, is the beat sheet of record. Nine precise instruments stand on one workbench; one ivory blank (clipped corner, registration hole) passes from one to the next. Clean outline = fresh agent; hatched green = persistent session; steel = Codex (merge only); the person's action is a typewriter key.

Grafts and changes against pitch A:

1. **Codex never marks the work** (from pitch B). In `/merge`, the steel tips touch the stack and leave amber tags hanging on a rail beside it at the height of each finding; nothing is raised in the sheets. The green arm reads each tag: one tag drops off on its own (refuted), the arm fixes the sheet at the other two and lays the fix sheet. Source: CF:36, CF:43, M:57-63.
2. **The person speaks in Fraunces Italic** (from pitch B). Wherever a key cap or plate carries what the person typed (`/merge`, `/smart-compact`, Go), it is set in Fraunces Italic paper. Instrument plates stay Departure Mono.
3. **"Latest Sol", no model id** (owner, 2026-10-08). No `gpt-6.1-sol` plate, because the skills switch to a newer Sol when one exists (CR:15). A shared plate on the Codex housing in the opener reads `Latest Sol`. Opener plates: `/codex-fullreview`, `/codex-review`, `Latest Sol`, `/merge`.
4. **Order**: merge, deep-plan, long-horizon, smart-compact, why, wow-loop, perf-loop, arena, showpiece (both A and B moved deep-plan second so its real handoff to long-horizon happens on screen). Owner to confirm.
5. **No CI in `/merge`** (owner, 2026-10-08: "CI is the least important part of /merge and is basic"). No flags and no CI in the card copy. In the build, the freed second goes to the Codex review layers.
6. **No measured numbers** (owner, 2026-10-08: "the point is the loop and the process, not specific ms reductions"). `/perf-loop` shows relative dots on the strip chart, never a figure; the /about results stay off screen.
7. **Automatic Codex review on PRs: pending owner decision.** The owner wants it highlighted. The template at `64e8f24` only reminds Claude to run codex-review "AFTER substantive changes, before merging" (`.claude/hooks/session-start.sh:105`). The rule that fires on every PR open lives in the owner's global CLAUDE.md, not the template. Either the template gains that rule first, or the reel states only what `/merge` guarantees.

## Copy (on screen)

Reel captions per pitch A section 5.2, minus `gpt-6.1-sol`. Cards carry no drawn words except arena's neutral letters; the HTML card descriptions in pitch A section 3 go through the `writing` skill before shipping. No periods, no em dashes, no counts, no rerun caps, never "nothing merges without your approval". Facts: `facts.md`.

## Files

- Animatic: `docs/skill-reel/animatic/` (not deployed).
- Ship target after approval: `site/skill-reel/` modules plus the skills-page cards; reel page or export harness decided in build.
