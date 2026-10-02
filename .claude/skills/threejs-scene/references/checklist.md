# Delivery checklist

Each line is pass, fail or blocked, with evidence: a file name and time, a `report.json` field, or who gave the verdict. A line with no evidence fails.

**Kind:** `quality` lines are passed only by the user or a fresh judge, never by the builder; `defect` lines are machine checks. **When:** `A`, `B`, `C` are the gates in SKILL.md step 2 and 6; `round` runs every round; `final` runs when the builder claims a pass and in the final round.

## Quality

| Check | When | Who |
|---|---|---|
| The one idea fits one sentence, the feeling is a physical moment, and the settled frame described in one sentence carries both | A | user or fresh judge |
| Three directions, each a different metaphor with its own key frame; one picked with a reason | A | user, or fresh judge when unattended |
| A signature moment is named, with the slowest anticipation and the longest hold | A, B | user or fresh judge |
| A tactile response is specified with weight and a touch equivalent; every effect names its technique and source | A | user or fresh judge |
| The reference board has 3 to 5 real references, each with one named thing to take | A | user or fresh judge |
| The key frame is described exactly (camera, light, darkest and brightest areas, where the eye lands) | A | user or fresh judge |
| Pacing: one focus per beat, anticipation, holds of at least 1.2 s and one second per three words, varied timing, camera still during reads, holds breathe without looping | B | user at full speed, or fresh judge on the strip and the real-speed video |
| Hero length 6 to 12 s before the settled frame, at most four beats | B | user or fresh judge |
| Beside the reference board and 2 or 3 `/inspiration` standouts, a person would stop scrolling for this one, and the reason is written down | C, final | user or fresh judge |
| The key frame matches the reference board and the brief in light, material and composition | C | user or fresh judge |
| The settled frame works as a poster on its own | C, final | user or fresh judge |
| No banned default (paste and removal tests); every effect has a named job | C, final | user or fresh judge |
| Blind read: the judge names the idea, the feeling and the signature moment the brief names | final | fresh judge |
| The tactile response answers within one frame, feels weighted, and works by touch at 390 | final | user (a real device when possible) |
| The user, when present, says it is good | final | user |

## Defects

| Check | When |
|---|---|
| No console errors or warnings | round |
| Frame 0 matches the load poster under the canvas (no pop at load); the no-WebGL fallback shows the settled frame | round |
| `?t=` frames repeat: two shots of the same time match | round |
| No solid objects intersect at any check time (`intersections()` empty) | round |
| Labels and captions at least 8 px inside the canvas, below the fold, off overlay text and off each other | round |
| Text over the scene readable at every check time at both widths | round |
| Reduced motion shows the brief's frame and renders no further frames without input (no breathing idle; the tactile response still answers) | round |
| The fallback (`?gl=0`) carries the idea; no empty canvas | round |
| Frames stop while the canvas is off screen | round |
| No NaN or black-frame artifacts | round |
| Programs flat across check times (no live compiles) | round |
| A forced context loss shows the fallback | final |

## Numbers (reported against the previous round on the same machine, not budgets)

| Report | When |
|---|---|
| Time to `ready`; max draw calls and triangles across check times (warn above 100 calls) | round |
| Uncapped p50 and p95 frame time, GPU string, pixel ratio | final |
| 4x CPU throttle p95, labelled "JS cost only" | final |
| Gzipped scene code and vendored three.js | final |

None of these is a phone measurement. The handover says so.

## Handover

| Check | When |
|---|---|
| Brief with reference board and key frame, final sheets, timing strip, reduced-motion and fallback frames, blind read, numbers | final |
| Round log with every gate verdict and who gave it; levers rejected; what was not judged | final |
