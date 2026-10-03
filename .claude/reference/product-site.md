# HarnessFirmware.com: the site repo

What this repository (`ryanportfolio/HarnessFirmware.com`) is, what its pages claim, how it builds and deploys, how the `/new` creator works, and how to keep it in step with the template. Product facts: `product.md`. Skill catalog: `product-skills.md`.

**Sources.** Site facts come from `main` at `2969a4a`, checked 2026-10-01. Page claims were first read from the `lab-threejs-scene` worktree and then rechecked on main for `about.html`, `new.html`, `skills.html`, `index.html`, `memory.html` and `long-horizon.html`; `arena.html` was not rechecked. Template facts come from `ryanportfolio/Harness-Firmware` at `bbd0b5f`.

## What the website is for

harnessfirmware.com is the public front door. It explains the firmware by outcome and lets a visitor create a ready repo without copying files by hand. The repo is MIT licensed; its fonts are SIL OFL 1.1 (`README.md`). Font and asset licenses: `site/PROVENANCE.md` (Lineal, Fraunces Italic, Mona Sans shipped as Harness Text, Departure Mono; `assets/memory-forest.webp` is AI-generated).

Homepage headline: "Better outcomes, every round", lede "Memory, workflows and review for Claude Code and Codex, built into the repository." Six pillars: token-efficient, planned, audited, remembered, production-ready, self-improving (`site/hero-pillars.mjs`). Footer on every page: "Open source · Human directed", MIT, "Made by Fullbuild" linking fullbuild.ai.

## Pages and their claims

| Page | Purpose | Claims and numbers (source) |
|---|---|---|
| `/` (`site/index.html`) | Hero, 9-beat explainer (about 103.8 s, `site/explainer.mjs`, `site/README.md`), skill groups, 7-question FAQ, install CTAs (GitHub template, web creator, Claude Code plugin) | Example pitfall "per pitfalls.md (2026-03-14): reset the test database first", marked illustrative. FAQ: memory is project files and retention depends on workflow; improvements are not auto-applied to every project; the plugin needs Claude Code on an existing repo, while new projects or Codex need the full template |
| `/skills` (`site/skills.html`) | Filterable directory (plan, build, audit, improve, project) linking each skill's source on GitHub | 38 entries (`<h4>` count), "12 shown" by default. `codex-review`: `gpt-6.1-sol`, high. Astra skills: `gpt-6-astra`, medium. `merge-ready`: at most three reruns, never merges. Babysit CI stops to ask after three fix pushes. Caveats: Opus Full Review "Requires a Claude CLI signed in with a Claude Max plan. Codex only"; Claude Review needs an authenticated Claude CLI; Impartial Review needs exposed agents or an authenticated Codex CLI; Codex Full Review uses more Codex plan |
| `/memory` (`site/memory.html`) | How `CLAUDE.md`, `AGENTS.md` and the six reference topics route; three save tests; lifecycle Find, Save, Reuse, Amend | "Saving grants no permission to commit, push, or share across repos." Read-audit "Coverage is partial; Codex is excluded." `secrets.md` holds names, never values |
| `/about` (`site/about.html`) | "The 77-second film" (`site/about-film.mjs`: chapters 14+10+11+10+14+10+8 = 77 s) and the field log (`site/field-log.mjs`) | 7 sessions, 3 days, 1 production site; 80 rounds; 575-file PR, 6 PRs; 6 same-model audits; 10 real bugs; 23 of 24 rounds; perf-loop 6.01 to 0.06 ms, 4.10 to 2.43 MB, 50.8 to 64.9 fps; 87,000 / 3,400 / 4,100 / 2,160 / about 9,700 tokens (3,400 + 4,100 + 2,160 = 9,660); "36 skills"; recall timestamps 16:52, 22:40, 22:51, 23:49 |
| `/new` (`site/new.html`) | Hosted creator ("Start warm") | "38 enabled"; `init-project` and `external-review` always included |
| `/arena`, `/long-horizon` | Skill demo pages driven by `site/skill-pages.mjs` | Illustrative only. Arena: 3 candidates, blind judge, B as base with A and C ideas grafted, candidates in `.tmp/arena/`. Long Horizon: a failed audit "does not quietly weaken the acceptance checks"; "Saved state does not schedule a future run, and the skill does not authorize publishing or merging" |
| `404.html` | Fallback | none |

`site/explainer.mjs` holds a timing constant `'Next project': 87000` (milliseconds). It is not the 87,000-token figure; do not change one when you change the other.

**Lab work, not on main.** `site/lab-hero.html`, `site/lab/` (three.js hero prototype, `hero-spiral`, `hero-desk`, vendored three 0.186.1) and the draft `threejs-scene` skill live on branch `lab/threejs-scene-skill`, checked out in the `lab-threejs-scene` worktree. Main has none of them. Do not describe them as shipped.

## How it is built and deployed

- **Stack.** Static HTML, CSS, JS modules and SVG with no runtime dependencies. One dev dependency: `esbuild` 0.28.2 (`package.json`, private package `harnessfirmware-com`, one script `build`).
- **Local preview.** `node site/server.mjs` serves on 127.0.0.1:4348, `PORT` overrides (`site/server.mjs`). It mounts the creator handler first, serves only GET/HEAD for static files, blocks dot-path segments and traversal, serves clean routes (`/about`, `/skills`, `/memory`, `/new`, `/arena`, `/long-horizon`) with 308 redirects from `.html`, falls back to `404.html`, and sends `Cache-Control: no-store`.
- **Build.** `node scripts/build-site.mjs` empties `dist/`, copies `site/` (skipping dotfiles and `package.json`) and minifies each `.js`, `.mjs` and `.css` file on its own with esbuild. Nothing is bundled, so module URLs stay the same; HTML, SVG, images, fonts and JSON copy unchanged.
- **Vercel** (`vercel.json`): `framework: null`, `buildCommand: node scripts/build-site.mjs`, `outputDirectory: dist`, `cleanUrls: true`, `trailingSlash: false`. Headers: `nosniff`, Referrer-Policy, `X-Frame-Options: DENY`, Permissions-Policy, COOP `same-origin`, a CSP with `default-src 'self'` and one sha256 script hash. Cache: fonts `max-age=31536000, immutable`; `/assets/*` one day plus stale-while-revalidate 604800; other non-API paths `max-age=0, must-revalidate`.
- **Upload filter.** `.vercelignore` uploads only `site/`, `api/`, `vercel.json`, `package.json`, `package-lock.json` and `scripts/build-site.mjs`, and excludes site dotfiles, `server.mjs`, tests, `generate-grain.mjs` and `site/README.md`.
- **Vercel project.** `harnessfirmware-com`, scope `sardonicasts-projects`. Link with `vercel link --project harnessfirmware-com --scope sardonicasts-projects --yes` before `vercel curl`; in an unlinked worktree `--yes` creates a new empty project (`.claude/reference/pitfalls.md`, 2026-09-25).
- **Function.** `api/harness/github/[action].mjs` buffers the request body, replays it, and calls the same `node:http` handler the local server uses (`site/github-creator.mjs`); unknown actions get a 404 JSON.
- **CI never deploys.** Vercel deploys on its own. `.github/workflows/readme.yml` (PR and push to main) runs `scripts/readme/verify.mjs`, the creator, skills-page and refresh-script tests, plus `meta.mjs --lint` on PRs and `meta.mjs --check` on push. `.github/workflows/template-drift.yml` runs `node scripts/refresh-upstream-skills.mjs --check` daily at 06:37 UTC (cron `37 6 * * *`) and on demand; a failed run is the alert, and it never commits.
- **README.** `README.md` is generated by `node scripts/readme/build.mjs` from five inputs: `site/hero-pillars.mjs`, `site/server.mjs`, `scripts/readme/glyphs.json`, `scripts/readme/items.json`, `scripts/readme/repo.json`. Never edit it by hand; rebuild after editing any input. The social preview PNG is rasterized by hand with `node scripts/readme/social.mjs` (headed Chrome; upload it in GitHub Settings, since GitHub has no API for it).

## The `/new` creator

GitHub App with user OAuth: PKCE S256, encrypted HttpOnly cookies scoped to `/api/harness/github`, a same-origin check on every POST. Endpoints: `status`, `connect`, `callback`, `select`, `disconnect`, `create` (`site/github-creator.mjs`).

What `create` does:

1. Validates the repo name (letters, digits, `.`, `-`, `_`), caps the description at 350 characters, defaults to private.
2. Rejects a selection that removes a required skill or one that a kept skill needs.
3. Fetches the template manifest. An invalid manifest aborts with a 502 before anything is created. An unreachable manifest falls back to the built-in rules in `site/new/skill-rules.js` (a code comment says this path exists for a template without a manifest).
4. Generates the repo from `ryanportfolio/Harness-Firmware`.
5. Makes one setup commit: deletes `templateOnly` paths, writes the README from `readmeStub`, checks `requiredFiles` remain, and for deselected skills writes `"off"` under `skillOverrides`, records them in `.agents/removed-skills.json` and deletes their folders.

If setup fails, the repo is kept and the visitor sees a warning that template-only files remain and all skills stay enabled. Without App credentials, `/new` links to GitHub's template `/generate` page.

**Environment variables** (names only, `site/.env.example`): `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `HARNESS_SESSION_SECRET` (at least 32 random bytes; rotating it disconnects all sessions). Session cookie lifetime was not read: **unverified**.

**Catalog files.**

- `site/new/skill-catalog.js` is hand-written: 38 entries in 3 groups (core, discipline, specialist), each with name, label, group, description and a `runtime` only when the skill ships in one runtime. It must match the template; `site/github-creator.test.mjs` fails when it drifts from `upstream-skills.json`.
- `site/new/upstream-skills.json` (template snapshot: repository, commit, Claude and Codex folders, groups, removal rules) and `site/new/skill-rules.js` (required skills and dependencies) are generated by `scripts/refresh-upstream-skills.mjs`. The script reads template main (or `--ref`) through the GitHub API, uses `GITHUB_TOKEN` if set, never edits the catalog, and lists what the catalog still gets wrong. `--check` writes nothing and exits 1 on drift.
- The snapshot on main records template commit `16ff5b3`, not `bbd0b5f`.
- `site/new.html` ships the static text "38 enabled"; `site/new/new-project.js` then recomputes the count from the catalog.

## How this repo's `.claude` differs from the template

Spawned from the template on 2026-09-22 (initial commit `5f44e39`; `68ae91b` stripped template files and added the README stub). The "Sync skills from Harness-Firmware" commits `948badc` (2026-09-24), `cd52dc9` and `cb84ae5` (2026-09-29) refreshed skill folders; `cd52dc9` also rewrote `.agents/skill-modes.json` and `.agents/skill-capabilities.json` (the latter no longer exists on main). Everything else below is older template text. Byte comparisons are git blob SHAs on main against `bbd0b5f`.

- **`CLAUDE.md`** is unconfigured: "What this project is" is empty and Verification and Environment hold only defaults. Among the site-only lines: "You are a Senior Software Engineer. LLMs are probabilistic; code is deterministic."; "Questions -> plain chat text, numbered if multiple."; the subagent model floor (Opus, latest Fable or higher, never Sonnet or Haiku); the `outputStyle` caveman pointer; "optimize performance"; "One open PR per unit of work"; "Prefer the built-in generate-memory feature off"; the closing "Stays in this file" line. Missing compared with the template: the no-jargon rule, the parallel-subagent rule, the `autoMemoryEnabled` note, the per-skill Codex baseline rule (the site still says run `--write`), "On Complete: commit, push, and open or update the PR", and "Omit `model` unless the user names one".
- **`AGENTS.md`** still says "AI Operating System starter", still describes generated adapters, and adds "When creating copy for a site, UI, or anything else: less is more."
- **`.claude/settings.json`** lacks `autoMemoryEnabled: false`.
- **Hook** is an older copy: it prints reminders to stderr (which neither Claude nor the user sees), ignores `removed-skills.json`, and points at `impartial-review` instead of `codex-review`.
- **Scripts.** `.claude/scripts/` matches template `9a2d62c` (2026-10-03), except `test-long-horizon-manifest.mjs`, left out because it tests `long-horizon/scripts/manifest.mjs`, which this repo's `long-horizon` skill lacks, and two local fixes in `write-ci-workflow.mjs` (and its test) not yet in the template: uv projects select the `dev`, `test` and `tests` extras on sync and run, and inline `#` comments in setup.cfg requirements are ignored. `scripts/lib/`, `.mcp.json` and the caveman output style are identical.
- **`.agents/`.** No `template-manifest.json`. `removed-skills.json` is empty; `skill-sources.json` records a baseline hash for each of the 31 native skills with a Claude source (taken 2026-10-03). `skill-modes.json` (38 entries) lacks the template's `merge`, `servers` and `wrapup`, which this repo doesn't have, and registers `long-horizon-swarm` as `disabled`. Codex skill copies: 86 shared files, 77 identical.
- **Skills.** `.claude/skills/` shares 77 files with the template, 67 identical. Differing: `PROVENANCE.md`, `adopt-repo`, `astra-fullreview`, `codex-fullreview`, `init-project` (and `references/profiles.md`), `long-horizon`, `long-horizon-workflows`, `sync-starter`, `wow-loop`. The template is newer for `wow-loop` and `init-project`. Site-only on main: `long-horizon-swarm`. Template-only: `merge-ready`, `init-project/references/ci.md`, `long-horizon/scripts/manifest.mjs`.
- **Other template copies.** Main still carries `GUIDE.md` (differs from the template's), `LICENSE` (identical) and `docs/` (8 shared files, 5 identical), although the template marks `GUIDE.md`, `LICENSE`, `docs/research`, `docs/specs` and `docs/superpowers` as `templateOnly`.
- **Reference files.** `pitfalls.md` on main has 14 dated entries plus an undated "Starter safety" section from the template era. About half are generic tooling gotchas (local preview servers, cross-cutting engineering, headed Chrome placement, Playwright MCP single instance, Bash cwd reset, Bash heredoc backslashes, `pkill -f` exit 144); the rest are about this site (Playwright motion captures, blur first-visit frames, README generation, `vercel curl`, reveal `clip-path`, CLS vs `scrollHeight`, `npm install` pruning `playwright-core`). The lab branch adds a 15th (scrollTo and `scroll-behavior: smooth`, 2026-10-01). The other five reference files are still template placeholders.
- **README.** The site keeps its own generated README, while the template lists `README.md`, `scripts/readme` and `assets/readme` as `templateOnly`.

## Working on this repo

1. `product.md`, `product-skills.md` and this file are the identity source. `CLAUDE.md` "What this project is" summarizes them and points here; keep the two in step and do not invent identity text elsewhere.
2. Template rules on template `main` describe the current firmware, and the local copies listed above (hook, `AGENTS.md`, scripts) may lag them. Read the template with `gh api "repos/ryanportfolio/Harness-Firmware/contents/<path>?ref=main"`, never from a local Harness-Firmware checkout. To run a template command, first bring the firmware here up to date (rule 3), then use the commands the local files actually accept: at `main` `2969a4a`, this repo's `sync-codex-skills.mjs` accepts only `--check` and `--write`, and the template's `--baseline <name>` returns a usage error here.
3. Refresh local firmware with `/sync-starter` Direction A: pick changes from its numbered list, merge `settings.json`, never bulk-pull `CLAUDE.md` or `.claude/reference/*`, and skip `templateOnly` paths. This repo's README, `scripts/readme/` and `assets/readme/` belong to the site; do not replace them with the template's.
4. Subagent model floor conflict (`product.md`, "Claims to avoid"): an explicit user instruction in the session decides; otherwise flag the conflict.
5. Check facts on `main`, not on a lab branch or a dirty local checkout. Base edits on a fresh worktree from `origin/main`.
6. This is not the template repo, so the normal pitfall rule applies: save confirmed quirks to `.claude/reference/pitfalls.md` without asking.
7. Visual checks follow `CLAUDE.md` Verification: headed Chrome through `launchPlacedChrome()`, isolated browsers for parallel work, and the pitfalls on preview servers, `scrollHeight` sampling and blur timing.

## Site update checklist

When the template releases, a skill changes, or a claim changes, check every place the fact is hard-coded. Start with `node scripts/refresh-upstream-skills.mjs --check`.

1. `site/new/skill-catalog.js`: hand-edit entries, groups, runtimes, descriptions (38 entries).
2. `node scripts/refresh-upstream-skills.mjs` to regenerate `site/new/upstream-skills.json` and `site/new/skill-rules.js`; never hand-edit them. Run `node --test site/github-creator.test.mjs`.
3. `site/skills.html`: 38 entries, "12 shown", categories, model pins (`gpt-6.1-sol` high, `gpt-6-astra` medium), "three reruns", "three fix pushes", runtime caveats (Claude Max, Codex only).
4. `site/new.html`: static "38 enabled" text and the matching `aria-label`.
5. `site/about.html` and `site/field-log.mjs`: "36 skills", the 87,000 / 3,400 / 4,100 / 2,160 / 9,700 token figures, every field-log number. `site/about-film.mjs`: captions and the 77 s chapter timings (the page title says "77-second film").
6. `site/index.html`: skill groups, FAQ answers (plugin vs template, auto-apply), install CTAs, the illustrative pitfall. `site/explainer.mjs`: beat captions and timings.
7. `site/memory.html`: the six topics, save tests, audit-coverage caveat.
8. `site/arena.html`, `site/long-horizon.html`, `site/skill-pages.mjs`: demo copy and invocations.
9. `site/hero-pillars.mjs`: pillars, lede, tagline. It feeds the README.
10. README: after editing any of the five inputs, run `node scripts/readme/build.mjs`; run `node scripts/readme/social.mjs` by hand when the social SVG changes.
11. These reference files: update counts, pins and the pinned commit in `product.md`, `product-skills.md` and this file.
