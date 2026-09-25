# Pitfalls

> Accumulated project-specific gotchas. Dated entries, newest at the bottom. If this file exceeds ~200 lines, split by area (`pitfalls-<area>.md`) and update the CLAUDE.md index.

## Starter safety

This starter must not ship maintainer-only checkout paths, private workflow
rules, secrets, or local-machine assumptions. Put those in untracked personal
instructions or in a private fork-specific memory file instead.

Worktree changes are isolated. Before claiming a template change is available
somewhere else, verify the exact branch or checkout the user asked about. Do not
merge, pull into another checkout, or touch paths outside the current workspace
unless the user explicitly asks in the current session.

## Local preview servers: stale or wrong site (2026-07-18)

Symptom: opening a local dev/preview server shows an outdated version of the
site, or a completely different project.

Root causes:

1. **Server reuse on a busy port.** Preview tooling (and manual servers) reuse
   whatever is already bound to the port. A server left over from a prior
   session serves old code; a different project on a shared default port
   (3000/5173/8080) serves the wrong site entirely.
2. **Worktree mismatch.** Server launched from the main checkout while edits
   live in a git worktree (or the reverse) — edits never appear no matter how
   often the page reloads.
3. **Stale build output.** Serving `dist/`/`build/` without rebuilding after
   source edits.
4. **Browser cache / service worker.** Old assets persist even after the
   server itself is current.

Prevention protocol (run every time before trusting a preview):

1. Before starting: check the port (`netstat -ano | findstr :<port>` on
   Windows, `lsof -i :<port>` on Unix). Port busy → inspect the owning PID's
   command line and cwd; if they don't match the current checkout, kill it or
   start on a fresh unique port. Never assume a reused server is the right one.
2. After loading: **sentinel check** — verify the page contains a string unique
   to the change just made (via page-text extraction, not a screenshot glance).
   No sentinel visible → server is stale or wrong; stop and diagnose before
   claiming anything works.
3. Static builds: rebuild before serving; confirm output mtime is newer than
   the edited sources.
4. Staleness persists after 1–2 → hard reload, unregister service workers, or
   use a fresh browser profile.

## Cross-cutting engineering gotchas (2026-08-18, from cursor-team-kit review)

1. **History rewrites: tree-hash check.** Before any agreed rebase/squash of a
   pushed branch, capture `ORIGINAL_TREE=$(git rev-parse origin/<branch>^{tree})`;
   after rewriting, compare with `git rev-parse HEAD^{tree}`. Do not push if the
   tree changed unintentionally — the rewrite was supposed to reshape history,
   not content.
2. **JSON embedded in `<script>` tags.** `JSON.stringify`/`json.dumps` output is
   not HTML-safe: a `</script>` inside a string terminates the tag early. Escape
   `<`, `>`, `&` as `\u003c`, `\u003e`, `\u0026` before embedding.
3. **Backgrounded dev servers: fixed port.** Background shells have no TTY, so
   server startup messages can sit buffered and unread — with port 0
   (auto-assign) you can never learn which port was chosen. Always pass an
   explicit port to servers started in the background.

## Headed Chrome steals the screen unless you place it (2026-08-23)

Visual verification runs headed on the real GPU, and a plain
`chromium.launch({ headless: false, channel: "chrome" })` drops that window on
top of whatever the operator is doing and takes the keyboard with it.

Minimizing does not solve it. Measured on Windows 10 with two displays: a window
minimized through CDP (`Browser.setWindowBounds`, `windowState: "minimized"`)
loses its compositor surface and requestAnimationFrame throttles to **1 Hz**,
with or without `--disable-features=CalculateNativeWinOcclusion`. Screenshots
still return fresh pixels at 1 Hz, so a static DOM check passes while every
frame timing, scroll narrative and animation reading is garbage.

Fix: `scripts/lib/launch-chrome.mjs` -> `launchPlacedChrome()`. It places the
window on a display that is not holding the foreground window, then hands the
foreground back to the window that had it. `CHROME_PLACE` picks the mode:
`other-monitor` (default), `offscreen` (parked at -2400,-2400, rendered but
never visible, and the fallback when only one display is attached), or `here`.
Both placed modes held 100.5 fps on a 100 Hz panel, same as an unplaced window.

Notes: `--window-position` applies to the first window of a launch, so one
launch per run. Placement is Windows-only and degrades to a plain headed launch
elsewhere. The DIP-to-pixel mapping assumes both displays share a scale factor.

## Playwright MCP plugin browser is a single shared instance (2026-08-29)

The official playwright plugin launches `npx @playwright/mcp@latest` with a
persistent profile. Two MCP server processes (a main session plus a subagent
with its own connection) cannot share that profile: the second gets
"Browser is already in use ... use --isolated" and blocks. Observed as a
~10-minute deadlock between a verifier subagent and its main session.

Fixes: the template ships `.mcp.json` defining `playwright-iso`
(`@playwright/mcp@latest --isolated`, in-memory profile, N concurrent agents);
or drive an independent Chrome via a repo-local `playwright-core` +
`scripts/lib/launch-chrome.mjs`. Never point a verifier subagent and the main
session at the shared plugin browser at the same time.

Same shape, different tool (2026-09-09): the desktop app's Browser pane
(`mcp__Claude_Browser__*`, `preview_start`) is one Chrome per app. A second
session or subagent asking for it gets "Another task's Chrome owns browser
slot". `--isolated` does not apply there; that string comes from the app, not
from this repo. Use `playwright-iso` or `launchPlacedChrome()` instead.

## Playwright motion captures: three traps (2026-09-22)

Each cost a retry while verifying a WAAPI headline animation:

1. **`document.hidden` never turns true.** A second tab brought to front, a tab opened
   in the same window over CDP (`Target.createTarget`, `newWindow: false`) and a
   CDP-minimized window all left it `false` with no `visibilitychange`. Test a
   visibility pause by redefining `document.hidden` and dispatching the event.
2. **`recordVideo` webm has no cue index.** Seeking it in a `<video>` returns the
   first frame for every `currentTime`. Pull frames by playing it and reading
   `requestVideoFrameCallback` `mediaTime` instead.
3. **Freezing WAAPI for frame-by-frame seeks.** `pause()` loses to a component that
   resumes its own animations (IntersectionObserver), and `play()` on an animation
   seeked past its end rewinds it and plays it again. Freeze with `playbackRate = 0`,
   seek via `currentTime`, then restore the rate and call `finish()`. Setting
   `currentTime` on an already-cancelled animation revives it, so seek only animations
   that are still live.

## Animated CSS blur: first-visit long frames (2026-09-23)

In Chrome, the first draw of each `filter: blur()` radius compiles a GPU program, and a
new intro's first raster of its glyph layers lands as one 50-100 ms frame. On the hero
headline this hit 8 of 10 first loads inside visible motion (confirmed with a
performance trace: GPU raster plus Skia shader compiles, no main-thread long task).
Pre-warming the blur radii offscreen made it worse and was backed out. What worked:
build the animations paused and start them about three frames later, so the long frame
lands before any ink shows. Second visits in the same profile have no compiles, so test
first-visit behavior in a fresh browser profile.

## Bash tool cwd resets between calls (2026-08-29)

The shell tool's working directory does not reliably persist across calls; it
intermittently resets to the parent workspace directory. Symptoms observed:
`npx tsc` resolving the dummy "not the tsc command you are looking for"
package from the wrong directory, and `git add` failing with "fatal: not a git
repository". Start compound commands with `cd <repo> &&` or use `git -C`.

## README is generated from the site source (2026-09-24)

`README.md` and `assets/readme/*.svg` are built by `node scripts/readme/build.mjs` from
`site/hero-pillars.mjs` (pillar words, lines, skills, timing), `site/server.mjs` (port) and
`scripts/readme/items.json` (one line per pillar skill or memory file, matched one to one).
Editing a pillar, its skills or the hero timing makes them stale
and `scripts/readme/verify.mjs` fails CI; run the build and commit the output. A pillar that
names a skill or memory file missing from `.claude/` stops the build. Letters in the art are
outlines from `scripts/readme/glyphs.json`; a character outside it fails the build until
`glyphs.py` is rerun with the character added (command in its header). The social preview PNG
is rasterized by hand with `node scripts/readme/social.mjs` and uploaded in repo Settings.

## Bash tool collapses doubled backslashes in heredocs (2026-09-19)

Text sent through the Bash tool loses one level of backslash escaping before the shell
sees it, even inside a quoted `<<'EOF'` heredoc: a Python literal `'a\\nb'` arrives as
`'a\nb'` (length 3, real newline). Writing JavaScript that must contain `"\n"` through a
Python heredoc therefore produced a string literal split across two lines and a
SyntaxError; a second heredoc "fix" did the same thing. Write files that need literal
backslash sequences with the Edit or Write tool, or keep the sequence out of the command
text (read it from a file). A JavaScript backslash-u escape (a Unicode code point written
as backslash, `u`, four hex digits) can arrive as the literal character through Bash and
Write alike: a dash-check regex turned into raw dashes. Check the bytes with `od -c` and
build the backslash with `String.fromCharCode(92)` when it must survive.

## `pkill -f` from the Bash tool kills the tool's own shell (2026-09-25)

The Bash tool runs each command as `bash -c "<whole command text>"`, so a `pkill -f <pattern>`
(or a `ps | grep <pattern> | kill` loop) whose pattern appears anywhere in that same command
matches the tool's own shell and ends it: exit code 144, no output. It cost three retries while
stopping preview servers. Kill by PID from a separate call (`ps -eo pid,args | grep ...` first,
then `kill <pid>`), or keep the pattern out of the command text.

## `vercel curl` from Git Bash: three traps (2026-09-25)

- Git Bash rewrites a leading-slash path argument into a Windows path: `vercel curl /robots.txt`
  requested `/C:/Program Files/Git/robots.txt`. Prefix the command with `MSYS_NO_PATHCONV=1`.
- It forwards every flag it does not own to curl, global CLI flags included, so `--scope` or
  `--debug` makes curl exit with "option ... is unknown" wherever they sit. Link the checkout
  instead (`vercel link --project harnessfirmware-com --scope sardonicasts-projects --yes`) and pass
  only `--deployment`; curl flags go after `--` (long forms work: `-- --silent --include`).
- In an unlinked worktree, `--yes` auto-links by creating a new empty project named after the
  folder. Link first. `vercel link` also writes `.env.local` and edits `.gitignore`; delete the
  file and revert the edit.

## Reveal animations must not keep a clip-path (2026-09-25)

An entrance animation that ends on `clip-path: inset(0)` with `animation-fill-mode: both` keeps
that clip forever, and a clip at the border box cuts italic overhang and descenders (Fraunces
lost the tail of "f", "d" and "y"). Fill `backwards` only, and give the clip negative insets
while it runs (`site/dither-effects.css`, `.mask-reveal`).
