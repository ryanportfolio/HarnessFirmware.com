# Director brief: Harness Firmware skills reel

Read this whole file, then the sources it names, before pitching.

## The job

Owner request (verbatim intent): a skills reel showing nine Harness Firmware skills: what each is, when to use it, why it is useful. Each skill is a self-contained 8 to 10 s scene module that loops seamlessly on its own (used on skill cards on the site's skills page; the description sits beside it in real HTML, not drawn). The same nine modules string into one ~90 s reel for sharing (exported to MP4 last; in the reel, the skill name and a short line are drawn into canvas because DOM text never reaches video).

The four goals of every run:
1. A stranger understands what each skill is and why to use it.
2. Worth watching as information on its own.
3. Matches the site's look (palette, fonts) without being limited by it. Creativity first.
4. Gorgeous enough that people watch to the end.

## The nine skills, in reel order

1. `/merge`. Open its scene with the cross-vendor review layers: `/codex-review` and `/codex-fullreview` (the owner's most-used skills). Owner framing: a simple-sounding skill that is easy to overlook, but it is a set-and-forget pipeline: a person types `/merge` once, then another vendor's model (Codex) reviews with several fresh reviewers, Claude fixes what survives, review runs again until clean, CI is checked, and the PR squash-merges. Codex reviewing every PR is the point, stated plainly, not a caveat.
2. `/long-horizon`
3. `/smart-compact`
4. `/deep-plan`
5. `/why`
6. `/wow-loop`
7. `/perf-loop`
8. `/arena`
9. `/showpiece`

(Order may be argued in your pitch if you have a strong reason.)

## Sources (all under docs/skill-reel/ in this worktree)

- `recon/merge-codex.md`: merge, codex-review, codex-fullreview mechanisms, true strings, false claims.
- `recon/lh-compact-plan.md`: long-horizon, smart-compact, deep-plan.
- `recon/why-wow-perf.md`: why, wow-loop, perf-loop.
- `recon/arena-showpiece.md`: arena, showpiece, and what the /arena demo page already draws.
- `recon/design-and-avoid.md`: palette, fonts, textures, easing, and the full inventory of metaphors the site already uses (AVOID them).
- `recon/site-map.md`: existing skills-page modules, card-art.mjs scenes for arena/showpiece/wow-loop/perf-loop (AVOID their pictures), engine patterns, copy rules, CSP.
- `inspiration.md`: teachings from animators; apply its recommendations A to C.
- Motion craft: read `C:\Users\Home\.claude\skills\motion-design\SKILL.md` and `references\story.md`. Follow its rules; do not restate them from memory.

## Hard rules

- Every scene shows its skill's MECHANISM as its own picture. No two scenes share a metaphor. Several skills are "agents then a judge" (merge's reviewers, wow-loop's critics, arena's blind judge, why's fresh reviewer, long-horizon's auditor, perf-loop's reviewers): each needs a visibly different picture. State in your pitch, per scene, the one physical metaphor and why it differs from the other eight.
- Do not redraw the homepage explainer's system story or any picture in `design-and-avoid.md` / `site-map.md` (five-node ring, VERIFIED stamp, scan-line sweeps, amber finding then repair then recheck, ghost sessions, file-glyph repo strip, person glyph with gate posts, strands/comets, three attempts merging, falling context meter, amber review lens, block pyramid, cracking DONE stamp, card-art.mjs scenes, skill-showcase four-stage gallery, flying letter chips).
- Mechanism truth: every on-screen element must match the recon files. Examples of traps: Codex never edits code (Claude fixes); only round 1 of /merge uses several reviewers; /why tests a recommendation with one fresh reviewer and changes nothing on disk (it is not a root-cause tool); smart-compact runs when the user types /smart-compact; arena is not always 3 candidates and the judge recommends a base, the parent decides; showpiece has no banned-defaults list.
- Copy: minimal words. No fine print or qualifiers about settings (rerun counts, caps, blocked exits, opt-in mechanics stay off screen), and nothing on screen may be false. Never claim "nothing merges without your approval". No skill counts. No em dashes. No periods in display text. On-screen strings come from the recon files (cite each). Model id `gpt-6.1-sol` is allowed.
- Silent. No audio.
- Tech: vanilla JS, SVG and/or 2D canvas (WebGL only if one hero scene truly needs it), the site's fonts (Lineal, Harness Text, Departure Mono, Fraunces Italic) and palette (ink #0f1210, paper #f3f3ec, green #53db76, amber #efc87e, etc. per design-and-avoid.md). Deterministic `frame(t)`; each module loops seamlessly (frame at t = period equals frame at t = 0, velocity matched at the seam).
- Each module must read on a card (roughly 480x270 or similar small 16:9 box) and at 1920x1080 in the reel. Design the picture for the small size first.
- Series grammar: one shared kit (stage, work-unit glyph, colours, a small set of named behaviours) so nine scenes feel like one family while each picture differs (inspiration.md recommendation A).

## What to deliver

Write your pitch to the file path given in your prompt:

1. Direction name and a one-sentence feeling-and-job line ("When the reel ends, the viewer feels X and knows Y").
2. The shared kit: stage, glyphs, colours, type use, named behaviours.
3. Per skill: the one metaphor; a timestamped beat sheet for its loop (0.0 s to period, key poses, where the loop seam is and why it is seamless); the at-most-one short on-screen label it needs in the reel (cite source); one HTML card description of what / when / why in plain words, under 30 words, cited.
4. The reel: intro (0 to ~5 s), the nine scenes with transitions (how one hands off to the next, ideally by morph, not cut), and end slate (~5 s, harnessfirmware.com). Total ~90 s. Timestamped.
5. A self-check table: each scene's metaphor vs the other eight and vs the avoid list, and every on-screen string with its source.
