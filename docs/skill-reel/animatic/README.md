# Skills reel animatic

Final timing, rough visuals. Not deployed. Beat sheet: `../pitches/A-bench.md` sections 2 to 5, with the changes in `../BRIEF.md`.

## Run

```
node docs/skill-reel/animatic/serve.mjs
```

Serves the repo root on 127.0.0.1 (`PORT` env, default 4361), so the site fonts load from `/site/assets/fonts/`. Open http://127.0.0.1:4361/docs/skill-reel/animatic/

## Modes

| URL | Shows |
|---|---|
| `?mode=reel` (default) | the full reel: intro, merge opener, nine loops with 1.0 s trucks, pull back, end slate |
| `?mode=card&scene=<id>` | one scene looping at card size (480x270); `F` or the button toggles a full-size view; `&view=full` starts there |
| `?mode=grid` | all nine looping at card size in a 3x3 grid |
| `?mode=sheet` | contact sheet: all nine at p = 0, .25, .5, .75, no animation |

Scene ids: `merge`, `deep-plan`, `long-horizon`, `smart-compact`, `why`, `wow-loop`, `perf-loop`, `arena`, `showpiece`.

`&t=<seconds>` seeks and pauses on load (in card and grid modes it wraps by the loop length).

## Transport

Space plays or pauses, `,` and `.` step one frame (1/60 s), `[` and `]` jump between chapters, and the scrubber carries chapter ticks.

For capture, `window.renderAt(t)` renders that time synchronously and returns a Promise that resolves after paint. `window.__anim` exposes `seek`, `pause`, `play`, `t` and `TOTAL` for the motion-design `stills.mjs` script. `window.animaticReady` turns true, and an `animatic-ready` event fires, once scenes and fonts are loaded.

## Reel length

Built from the periods the scene modules declare, so it follows any period change:

```
total = intro 4 + merge opener duration + sum(periods) - 8 x 0.5 + pull back 2 + slate 3.5
```

The total is logged to the console on load. With the pitch periods (82 s in all, opener 3 s) it is 90.5 s.

## Scenes

Each file in `scenes/` default-exports `{ id, name, caption, period, draw(ctx, t), opener? }`. `draw` must be a pure function of `t` in `[0, period)`. A scene that is missing, malformed or throws renders as a labelled placeholder; the page keeps running.
