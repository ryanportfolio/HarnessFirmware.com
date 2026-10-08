# Recon: merge, codex-review, codex-fullreview (+ impartial-review as used by codex-fullreview)

Source: github.com/ryanportfolio/Harness-Firmware at commit `64e8f247dc7ca70cd6b03ac78f8786df06813c5c`, read through `gh api`. Citations are `path:line` at that commit. Abbreviations used below:

- `M` = `.claude/skills/merge/SKILL.md` (91 lines)
- `CR` = `.claude/skills/codex-review/SKILL.md` (175 lines)
- `CF` = `.claude/skills/codex-fullreview/SKILL.md` (152 lines)
- `IRa` = `.agents/skills/impartial-review/SKILL.md` (121 lines). This is the copy the Codex Manager reads during `/codex-fullreview` (CF:16, CF:43). It is a rewritten Codex version, not a copy of the `.claude` one.
- `IRc` = `.claude/skills/impartial-review/SKILL.md` (451 lines), Claude-side version; cited only for shared definitions (severity labels).
- `XR` = `.agents/skills/external-review/SKILL.md`, the leaf-review rubric `/codex-review` hands to Codex when present (CR:37).
- `README` = `README.md`

No `references/` files are linked from merge, codex-review or codex-fullreview. impartial-review links `references/shared-code-refactoring.md` and `strict-quality-rubric.md` only for shared-boundary diffs and opt-in strict mode (IRa:41-48); neither changes the codex-fullreview mechanism, so they were not read.

There is no `.agents/skills/merge/` at this commit (repo tree listing): `/merge` is a Claude Code skill only.

---

## 1. merge

### What it is
"Merge PRs through a Codex review loop: /codex-fullreview, fix, then /codex-review reruns (3 max) until clean, then CI and squash-merge." (M:3, same text README:131)

Body summary line: "Finished work → merged PR: commit, push, open/reuse PR, Codex loop, CI, squash-merge." (M:9)

### When to use (trigger)
- Only when the user types `/merge`: "Runs only when the user types /merge" (M:3). "User-only start: user types `/merge`. Never self-start, even if PR looks ready." (M:13)
- Frontmatter `disable-model-invocation: true` (M:4): the model cannot invoke it on its own.

### Why it is useful (outcome)
- Turns finished work into a merged PR without further prompts: "from then on, every PR in the session goes through the same loop and merges" (M:3); "every PR session opens/updates → same steps → merge, no further prompt" (M:18).
- Final report line per PR: `merged <PR URL> at <head SHA>`, or `blocked` + open items (M:85).

### Mechanism, step by step
0. Mode switch. User types `/merge` → "merge mode ON for rest of session"; Claude announces "Merge mode is on for this session: every PR goes through the Codex loop and merges when clean" (M:15).
   - Immediately: every still-open PR this session opened or pushed to goes through the steps, one PR at a time; finished work without a PR gets one opened; PRs the session never touched are left alone unless the user names them (M:17).
   - Afterwards: every PR the session opens or updates goes through the same steps and merges, no further prompt (M:18).
   - Each PR has its own loop and own rerun budget (M:19).
   - Mode OFF: user says so ("stop merging", "stop merge mode", "don't merge this one"), user switches to `/main`, or session ends (M:21).
1. Requirements check. Both `codex-review` and `codex-fullreview` skills must exist, else stop (M:36). Codex must be reachable (ChatGPT login or a gateway `model_provider`); neither → stop before merge; "Never substitute self-review + call gate passed." (M:37)
2. Step 1 Integrate (M:39-45). Inspect repo/branch/PR; run relevant local checks; stage explicit paths, commit, push, never bypass hooks; reuse the branch's open PR or create one (M:42). Fetch target, check mergeability, resolve unambiguous conflicts; ask only if a resolution needs a user decision (M:43). Record PR number, target, head SHA (M:45).
3. Step 2 Review loop (M:47-69).
   - Every round: fetch target; scope = full PR branch diff vs `origin/<target>` at current head (M:49).
   - Round 1: `/codex-fullreview`, one run, full PR diff. "Must spawn ≥1 sub-reviewer; 0 = Manager alone = single-context, not full review." Failure after retry → stop, ask (M:51).
   - Reruns: after any round that pushed a commit → `/codex-review` alone, on the full PR diff at the new head, "not just fix delta" (M:53).
   - No edits while a review runs (reviewers read the working tree) (M:55).
   - Triage (M:57-61): confirmed 🔴/🟡 → fix; kept-with-caveat → fix if residual risk is real; confirmed 🟢 → fix only if small, in scope, and in a round already needing a rerun; "🟢 never triggers rerun alone" (M:59); refuted → drop, list under "checked and fine"; fix needs a user decision → ask, user may waive (M:61).
   - Fixes: at cause, run local checks, the round's fixes = 1 commit naming the findings, push (M:63).
   - Pass: latest round, on current head, confirmed 0 🔴/🟡 (waived excluded). Round 1 passes → no rerun (M:65).
   - Cap: 3 `/codex-review` reruns after round 1. After the 3rd: no more commits or reviews; anything still needing a fix or a moved head → PR `blocked`, left unmerged (M:67).
   - Commits made by someone else get reviewed by the next round and count toward the cap (M:68). Head moves after a pass → verdict void (M:69).
4. Step 3 CI (M:73). Inspect all PR checks (`gh pr checks <number> --json name,bucket,state,workflow,link`). Pending → bounded wait. Failed → diagnose, fix in scope; a CI fix moves the head → back through a `/codex-review` round, same budget. Don't trust branch protection or `MERGEABLE` alone; verify expected workflows ran; absent/skipped required check ≠ pass. No-CI repo → local verification, report that limit. "Never admin-bypass checks."
5. Step 4 Merge (M:77-81). Re-read PR head; if it differs from where loop + CI passed → back to Step 2 (M:77). Squash: `gh pr merge <number> --squash --match-head-commit <verified-head>` (M:78). Confirm merged, fetch target, see merge commit; keep the branch unless asked (M:79). Never force-push or push direct to target (M:81).
6. Report (M:85-91). Per PR: each round with source attribution, surviving findings, fix SHAs, waivers, CI result; last line `merged ...` or `blocked`. Then an "ELI5 recap" of short plain bullets (M:87).

Who acts: the Claude session that received `/merge` commits, fixes, pushes, checks CI and merges (M:27-30). Codex only reviews; its runs are read-only (CF:43 "No file edits, no Git writes, no publication"; CF:36 read-only sandbox).

### On-screen strings (merge)
- `/merge` (M:3, M:13)
- "Merge via Codex review loop" (M:7, heading)
- "Merge mode is on for this session: every PR goes through the Codex loop and merges when clean" (M:15)
- "/codex-fullreview, fix, then /codex-review reruns (3 max) until clean, then CI and squash-merge" (M:3)
- "Never self-start, even if PR looks ready." (M:13)
- "Never admin-bypass checks." (M:73)
- `gh pr merge <number> --squash --match-head-commit <verified-head>` (M:78)
- `merged <PR URL> at <head SHA>` / `blocked` (M:85)
- "never merge unreviewed commits" (M:78)

---

## 2. codex-review

### What it is
"Cross-vendor second-opinion review. Drives OpenAI Codex CLI (codex exec review, gpt-6.1-sol, high reasoning) over a PR, branch, commit, or uncommitted diff, then verifies each finding." (CR:2)

"Run one fresh Codex CLI review and verify every finding locally." (CR:7)

### When to use (trigger)
"Trigger: /codex-review, \"have Codex/Sol review this\"." (CR:2). Inside `/merge`, it is the rerun reviewer after any round that pushed a commit (M:53).

### Why it is useful
"From Claude this supplies cross-vendor review; from Codex it supplies fresh context, not vendor independence." (CR:7)

### Mechanism, step by step
1. Preflight: check `codex --version`, `codex login status`, `codex exec review --help`, without spending usage (CR:13). Model pin `gpt-6.1-sol`; before launch check for a newer Sol and use its exact id if one exists (CR:15). Login route: ChatGPT login or a gateway provider; neither → stop (CR:17).
2. Scope: resolve exact base/head SHAs (branch diff: `git merge-base origin/<default-branch> HEAD` to `HEAD`) (CR:23-29).
3. Launch: one Codex process in a fresh run directory (CR:33). If the repo has `.agents/skills/external-review/SKILL.md`, Codex is told to read it and do a "Leaf review: no agents, no nested reviews, no edits." (CR:37, CR:48); otherwise Codex's built-in rubric with `--base` (CR:38, CR:50). Command shape: `codex exec review ... -m gpt-6.1-sol -c model_reasoning_effort=high -o "$RUN/report.md"` (CR:48). Runs in background, polled (CR:61). External-review rubric: "One reviewer, one fresh context, one exact scope." (XR:8)
4. Collect evidence: accept only a successful exit with a non-empty report in the new run dir and unchanged source (CR:84). Expect zero `spawn_agent` calls (CR:91). One automatic retry on failure (CR:140).
5. Verify every finding (Claude, locally): real check (grep, read cited lines) on every finding, all severities; each becomes Confirmed, Refuted, or Kept with caveat; "Treat BLOCKING findings adversarially" (CR:150-156). Source reason: "Cross-vendor does not mean correct" and "Codex hallucinates too" (CR:150).
6. Present: 🔴 BLOCKING / 🟡 SHOULD-FIX / 🟢 NITPICK with `path:line` and fix; attribution "N of M findings survived verification" (CR:160). "the review itself does not authorize merging" (CR:162).

Reviewer count: one Codex reviewer, single context, no sub-reviewers (CR:7, CR:91, XR:8).

### On-screen strings (codex-review)
- `/codex-review` (CR:2)
- "Cross-vendor second-opinion review" (CR:2)
- `gpt-6.1-sol`, "high reasoning" (CR:2, CR:15); flag form `model_reasoning_effort=high` (CR:48)
- `codex exec review` (CR:2)
- "Codex hallucinates too" (CR:150)
- "Confirmed" / "Refuted" / "Kept with caveat" (CR:152-154)
- "🔴 BLOCKING, 🟡 SHOULD-FIX, 🟢 NITPICK" (CR:160)
- "N of M findings survived verification" (CR:160)

---

## 3. codex-fullreview

### What it is
"Full multi-agent Codex review: codex exec runs $impartial-review as Manager with fresh-context sub-reviewers (gpt-6.1-sol, high), then each finding is verified." (CF:3)

"Run one Codex CLI process in which Codex runs the repository's `impartial-review` skill as Manager: it spawns fresh-context sub-reviewers over an exact scope, verifies their findings, and writes one report. Then verify every finding locally." (CF:8)

### When to use (trigger)
"Trigger: /codex-fullreview, \"full Codex review with sub-reviewers\"." (CF:3). Inside `/merge`, it is round 1 (M:51).

### Why it is useful
Cross-vendor review from Claude (CF:8), with several independent fresh contexts instead of one. `codex-review` is "the single-context alternative" (CF:8).

### Mechanism, step by step
1. Preflight: check CLI and flags (CF:14). Requires the Manager skill `.agents/skills/impartial-review/SKILL.md` (repo or global copy); neither → stop, point to `codex-review` (CF:16). Same Sol pin and login rules as codex-review (CF:18, CF:20).
2. Scope: exact base/head SHAs (CF:26-32).
3. Author brief (default): Claude writes `$RUN/brief.md` with facts only (goal, risky files, related work, checks run), no verdicts; first line `Author brief <run directory name>`; only the intent reviewer gets it (CF:52). Skipped for a fully blind review → no intent reviewer (CF:52).
4. Launch: plain `codex exec -s read-only -m gpt-6.1-sol -c model_reasoning_effort=high` (not `codex exec review`, which has no agent tools) (CF:36, CF:43). The prompt tells Codex to read the impartial-review skill and act as Manager, "Spawn fresh-context sub-reviewers with spawn_agent, fork_turns \"none\", model gpt-6.1-sol, reasoning_effort high", each a leaf reviewer; no nested `codex exec`; "No file edits, no Git writes, no publication."; report first lines `Scope:` and `Sub-reviewers: <number spawned>` (CF:43).
5. Inside Codex (Manager, per IRa):
   - Reviewer set for anything but a small change: five areas, "correctness/types; data flow/compatibility/failures; performance/security/observability; missing integration/cleanup; project-specific rules" (IRa:63-66).
   - Plus one intent reviewer when an author brief exists (diff plus brief) (IRa:66-70).
   - Plus one open-lens reviewer for every diff except a tiny one ("under 50 changed lines in one file, with no schema, auth, or cache code"); it picks one or two lenses no one else covers (IRa:70-75).
   - Small, low-risk change: "use one independent reviewer" (IRa:63), plus the intent reviewer if a brief exists ("at either size", IRa:66).
   - Reviewers run in bounded batches by available capacity (IRa:63-64, IRa:75-77). Each is a leaf: "no agents or review subprocesses of its own, no fixes or Git writes" (IRa:59). Brief goes only to the intent reviewer (IRa:58).
   - Each finding carries location, trigger, consequence, evidence, fix, severity, confidence, plus `Scope:`, `Evidence:`, `Files read:` lines (IRa:102-105).
   - Manager drops stale-scope findings, deduplicates, tries to refute each against the same snapshot copies, then confirms, dismisses with evidence, or keeps explicit uncertainty; tags blind / intent / both; ranks globally (IRa:110-116).
6. Evidence check (Claude): sub-reviewers that ran = spawned child session files under `"thread_spawn"`, not spawn calls (CF:73-74, CF:108). Zero children → "no sub-reviewers ran: the run was a single-context review by the Manager" (CF:110). Intent reviewer confirmed by the brief marker in exactly one child (CF:109). One automatic retry on failure (CF:118).
7. Verify every finding (Claude, locally): "The Manager's verification is same-vendor and ran without this session's context; it does not replace yours." Same Confirmed / Refuted / Kept with caveat rule; BLOCKING adversarially (CF:128-134).
8. Present: severity-ordered 🔴/🟡/🟢, attribution including sub-reviewer count, failed spawns, intent and open-lens status, "M of T findings survived verification" (CF:138-140). "the review itself does not authorize merging" (CF:142).

So findings pass three filters: sub-reviewers (coverage) → Codex Manager (same-vendor verification) → Claude (cross-vendor verification) (IRa:110-114, CF:128).

Reviewer count, precise:
- Non-tiny diff, default (brief supplied): 5 area reviewers + 1 open-lens + 1 intent = up to 7 (IRa:63-75, CF:52).
- Non-tiny diff, fully blind: 5 + 1 open-lens = 6 (IRa:63-75).
- Small/tiny change: 1 reviewer, plus 1 intent if a brief exists (IRa:63, IRa:66).
- Actual count is whatever spawned and is verified from session files; failed spawns are disclosed (CF:108).

### On-screen strings (codex-fullreview)
- `/codex-fullreview` (CF:3)
- "Full multi-agent Codex review" (CF:3)
- "Manager" / "fresh-context sub-reviewers" (CF:3)
- `gpt-6.1-sol`, `high` (CF:3, CF:43)
- `fork_turns "none"` (CF:43)
- `spawn_agent` (CF:43)
- `Sub-reviewers: <number spawned>` (CF:43)
- "No file edits, no Git writes, no publication." (CF:43)
- "intent reviewer", "open-lens reviewer" (CF:140; IRa:67, IRa:71)
- Area names: "correctness/types; data flow/compatibility/failures; performance/security/observability; missing integration/cleanup; project-specific rules" (IRa:65-66)
- "blind" / "intent" / "both" tags (IRa:115)
- "M of T findings survived verification" (CF:140)

### impartial-review (only as codex-fullreview uses it)
- What: "Manager fixes the review scope, dispatches independent reviewers, verifies their findings, and reports actionable results." (IRa:8)
- "Review requests do not authorize implementation or publication." (IRa:9)
- "Native Codex reviewers provide independent context, not vendor independence." (IRa:80-81)
- Severity scheme shared across the three skills: 🔴 BLOCKING "Should not merge"; 🟡 SHOULD-FIX "Should be fixed but not blocking"; 🟢 NITPICK "can be skipped" (IRc:391-395).

---

## 6. False or risky claims

1. "Nothing merges without a person approving it" / "a person approves every merge": risky. The person types `/merge` once (M:13); then every PR the session opens or updates merges "no further prompt" (M:18) for the rest of the session (M:15). Accurate: a person turns merge mode on; it never starts itself (M:4, M:13).
2. "Codex fixes the code": false. Codex runs read-only, no edits (CF:36, CF:43; CR:48 "no edits"). The Claude session fixes (M:29, M:63).
3. "Several fresh reviewers every round": false. Only round 1 (`/codex-fullreview`) is multi-reviewer (M:51). Reruns use `/codex-review`, a single Codex reviewer (M:53, CR:7, XR:8).
4. "Several reviewers" for every PR: risky. A small change gets one reviewer (plus an intent reviewer when a brief exists) (IRa:63, IRa:66). `/merge` only requires ≥1 sub-reviewer (M:51).
5. "Reviews until clean, no matter what": false. Max 3 `/codex-review` reruns after round 1; then the PR is `blocked` and left unmerged (M:67).
6. "Every finding gets fixed": false. Only confirmed 🔴/🟡 (and real-risk caveats) must be fixed; 🟢 are fixed only opportunistically; refuted findings are dropped; the user may waive (M:57-61, M:65).
7. "Fully unattended, never asks": false. It stops and asks when a review fails after its retry (M:51, M:53), when a fix needs a user decision (M:61), on semantic merge conflicts needing a decision (M:43), and holds on missing required CI (M:73). Codex unreachable → stop before merge (M:37).
8. "Runs forever / across sessions": false. Merge mode ends when the session ends, the user says stop, or `/main` (M:21).
9. "Merges any open PR": false. PRs the session never touched are left alone unless the user names them (M:17).
10. "Codex's verdict decides": risky. Claude verifies every finding itself (CR:150, CF:128); the Codex Manager also verifies inside Codex (IRa:110-114).
11. Model id: `gpt-6.1-sol` is the pin at this commit, but the skill says to check for and use a newer Sol if one exists (CR:15, CF:18). "Uses gpt-6.1-sol" is true as the default pin; "always gpt-6.1-sol" is not guaranteed.
12. "Cross-vendor" holds only when Claude runs the review; from Codex it is fresh context only (CR:7, CF:8). `/merge` itself exists only on the Claude side (no `.agents/skills/merge/` in the tree), so in the `/merge` pipeline it is cross-vendor.
13. Merge method "squash" is the default, not absolute: "Squash unless user/repo says otherwise" (M:78).
14. "Waits for CI to pass": mostly true, with nuance: no-CI repo → local verification contract, limit reported (M:73).
15. Billing: each review is "billed to user's Codex sub" (M:28). Avoid implying free.

Precise truth on the human trigger: `/merge` needs the user to type it (M:13; model invocation disabled M:4). After that, unattended for the session: every open PR this session touched plus every PR it later opens or updates runs integrate → fullreview → fix → up to 3 codex-review reruns → CI → squash-merge, with no further prompt (M:17-18), stopping only at the blockers in item 7 or the cap in item 5.

## 7. Owner framing check

Framing: "/merge is a set-and-forget, full-send pipeline: another vendor's model (Codex) reviews with several fresh reviewers, fixes are made, review runs again until clean, CI is checked, and the PR merges."

| Clause | Verdict | Source |
|---|---|---|
| "/merge is a set-and-forget, full-send pipeline" | Mostly true. One `/merge` covers every PR this session touched or later opens/updates, no further prompt (M:15-18). Limits: session-scoped (M:21); stops and asks on review failure, fix needing a decision, cap, missing CI (M:51, M:53, M:61, M:67, M:73). | M:15-21 |
| "another vendor's model (Codex) reviews" | True from Claude: "cross-vendor" (CR:7, CF:8), OpenAI Codex CLI (CR:2). | CR:2, CR:7, CF:8 |
| "with several fresh reviewers" | True for round 1 on a non-tiny diff: 5 areas + open lens + intent (up to 7) (IRa:63-75). A small change gets 1 (+ intent) (IRa:63, IRa:66). Reruns use one Codex reviewer (M:53, CR:7). Suggest "several fresh reviewers on the first pass". | M:51, IRa:63-75 |
| "fixes are made" | True. Claude fixes confirmed 🔴/🟡 in scope, one commit per round, pushed (M:57, M:63). Not Codex. | M:29, M:57-63 |
| "review runs again until clean" | Partly. Reruns use `/codex-review` on the full PR diff (M:53), 3 max; still not clean → `blocked`, unmerged (M:67). Suggest "until clean, up to three more passes" or keep "until clean" only if a blocked outcome is shown or implied elsewhere. Saying "until clean" alone is not false about what merges (nothing unclean merges, M:65, M:67), but implies unlimited reruns. | M:53, M:65-67 |
| "CI is checked" | True. All PR checks inspected; failures fixed and re-reviewed; never admin-bypassed (M:73). | M:73 |
| "and the PR merges" | True when loop and CI pass at the same head: squash-merge guarded by `--match-head-commit` (M:77-78). Otherwise `blocked` (M:67, M:85). | M:77-79, M:85 |

## Unverified

- Wall-clock duration of any of these runs: not stated in the sources ("runtime ... not predictable from file count", CR:78, CF:62).
- Whether reviewers actually run in parallel on a given machine: IRa says bounded batches by capacity (IRa:63-64, IRa:75-77); the real batch size depends on the Codex session and is not fixed in the source.
- Whether a newer Sol than `gpt-6.1-sol` exists today: the skill delegates that check to run time (CR:15); not checked here.
- Whether the `.claude` and global `~/.claude/skills/merge/SKILL.md` copies are identical, as M:9 claims: only the repo copy was read.
