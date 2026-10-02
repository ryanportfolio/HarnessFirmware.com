# Techniques

Recipes to reach for when the brief needs them. None is required. Constants are starting points from one source scene: tune them by shooting, and do not carry them over as a look.

Many of these are adapted from Meng To's skills, https://github.com/MengTo/Skills (MIT, Copyright (c) 2026 Meng To), as noted per section.

## Overlay framing

*From `3d/3d-orbit-inspect-demo`.*

Measure the overlay text boxes on resize and after `document.fonts.ready`, compute the free band, and shift the projection with `camera.setViewOffset` rather than moving the subject. The source shifted by about -0.17 of the width on desktop and -0.13 of the height on phones. In portrait, set camera distance to `max(d0, k / aspect)` so the subject spans at most about 0.88 of the width. Re-measure whenever the text reflows.

## Solid objects that touch

*From building the desk hero with this skill.*

- A flat object (card, plate, tile) built as `BoxGeometry(w, thin, d)` lies in the XZ plane. Turn it on the table with `rotation.y`; `rotation.z` or `rotation.x` tilts it like a seesaw, and its edge sinks into the surface or the object under it. Every stacked card in the desk prototype clipped this way.
- Stack thin objects with a gap of at least the thickness plus 0.5 mm in scene units, so shadow acne and depth fighting cannot show.
- `intersections()` hook: give each solid a name, build an `OBB` per object from its geometry's bounding box (`three/addons/math/OBB.js`: `obb.fromBox3(box).applyMatrix4(mesh.matrixWorld)`), shrink each half-size by 2 percent so resting contact does not count, and return the names of every pair where `a.intersectsOBB(b)`. Skip pairs that are meant to nest (a card inside its box) by listing them in the brief.

## DOM labels on 3D points

*From building the spiral hero with this skill.*

- Project label anchors after `camera.updateMatrixWorld()`. `renderer.render()` updates the camera's matrices, so labels projected before it use last frame's camera: a one-frame lag in motion, and wrong positions on the first frame (which is the `?t=` frame).
- Hide a label whose anchor leaves the canvas instead of clamping it; a clamped label points at nothing. Clamp only the label box, at least 8 px inside the canvas.
- Measure label widths after `document.fonts.ready`, cache them, and clear the cache on resize.
- Set label text, position and opacity from scene time each frame, with no CSS transitions.

## Motion and pacing

*Classic animation principles, applied to scene time.*

- Write each beat as `[anticipation, action, hold]` in the timeline constant, so the hold is data and the strip can be checked against it.
- Ease by the size of the move: large moves `easeInOutCubic` over 0.8 to 1.4 s, small moves `easeOutCubic` over 0.25 to 0.5 s, settles with a small overshoot (`easeOutBack` with a low tension) only on objects that have weight.
- Overlap: start the next move when the current one is 70 to 90 percent done. Follow-through: parts attached to a moving object arrive 50 to 120 ms after it.
- Camera: move it between beats, ease in and out, and hold it still while anything reads. A slow drift during a long hold is allowed only if it is under about 2 percent of the frame per second.
- Read time: at least one second per three words of caption or label, never under 1.2 s.

## Pointer response

*From `web-design/add-mouse-driven-orbit` and `3d/3d-orbit-inspect-demo`.*

- Keep one normalized target (-1..1) and damp toward it with `1 - (1 - 0.055) ** (dt * 60)`.
- Split the response unequally across depth: camera translation, a look-at that carries about 42% of it, near objects yawing about 0.055 rad and pitching 0.026 rad, far layers yawing about 0.030 rad. Equal motion on every layer reads flat.
- Return to center on `pointerleave`. Stop writing once the rounded value settles, so idle costs nothing.
- Read hover from the last `pointermove`'s `pointerType`, not `(hover: hover)`, which is wrong on hybrid laptops. Ignore touch for hover effects. Set `touch-action: none` only while the user is interacting, so the page still scrolls.
- Cache rects with a `ResizeObserver`; never read layout inside `pointermove`.
- If the canvas has `pointer-events: none`, attach the listeners to its parent.
- Add `?px=&py=` to freeze a pointer pose, and shoot center and the four corners. Damped pointer state is exempt from `?t=` repeatability.

## Atmosphere

*From `3d/3d-sky-background`, `3d/3d-sky-rays` and `3d/3d-ultra-realistic-water`.*

- Fog uses the same function the sky or background draws, so its color depends on view direction. One flat fog color matches the sky on one side only.
- One sun direction feeds the visible disk, the directional light, the specular and any rays.
- Keep three jobs separate: the visible background, environment reflections (PMREM), and the direct light.
- God rays: divide the accumulated samples by the sum of their weights, so the sample count does not change exposure, and fade the effect as the sun leaves the frame.

## Discrete states (time of day, theme, season)

*From `3d/3d-four-seasons` and `web-design/threejs-weather`.*

Encode the state as weights that sum to 1 and resolve every frame from the authored base values, never by tinting the previous frame. A new choice mid-transition freezes the current blend as the new start. Add a `?state=` hook and shoot every state from the same camera; each must be recognisable without its label. Reduced motion snaps to the target.

## Assets

*From `3d/3d-sky-background` and `3d/3d-high-resolution-textures`.*

- A failed or slow asset never leaves a blank: a procedural first layer carries the one thing, and the asset blends in when it lands. `ready` still means "everything the shot needs is loaded", so frames stay repeatable.
- Texture GPU memory is about `w * h * 4 * 1.33` bytes with mipmaps; a 4096² RGBA8 texture is about 85 MiB. Compressed formats (KTX2) and textures without mipmaps differ.
- Draco, KTX2 and Meshopt decoders run WebAssembly; check the CSP allows it (`'wasm-unsafe-eval'`) before adopting them.
- Report unique triangles separately from triangles drawn across instances and shadow passes.

## Aliasing and banding

*From `3d/3d-wood-material` and `3d/3d-wood-lighting-scorecard`.*

- Fade every high-frequency term by its own screen footprint (`fwidth`), or it shimmers at distance. Detail finer than about 12 px per period at 1440 aliases.
- Dark gradients band. Add a tiny hash dither (about ±0.0015) after the sRGB encode, which needs a custom output pass.
- Frame statistics can flag problems, but they are proxies tuned on one lit scene: clipped share (any channel ≥ 254), crushed share (luma < 2), banding (long runs of identical values in a gradient). Report them; never fix a picture to move a number. If the number improved and the picture got worse, revert.

## Shader compiles

*From `3d/3d-cloth-material`, `3d/3d-high-poly-models` and `3d/3d-orbit-inspect-demo`.*

- Changing light count, shadow settings or a material define after `ready` recompiles a program and stalls a frame (200 ms or more in the source). Toggle effects with uniforms and intensities; never cross a define at zero (use 0.0001, not 0).
- Every `onBeforeCompile` variant needs its own `customProgramCacheKey`, or variants share one program.
- `renderer.compile` and `compileAsync` skip objects with `visible = false`; make every beat's objects visible for the warm-up, then restore.
- `renderer.info.programs` should stay flat across check times. A rise means a live compile.
- `renderer.info.render` resets on every `render()` call; with post-processing or several passes, set `autoReset = false` and sum per frame.

## Performance diagnosis

*From `web-design/build-threejs-scroll-worlds` (`references/quality-and-qa.md`) and `game-development/optimize-threejs-games`.*

When the uncapped numbers rise between rounds, switch one thing off at a time, in this order, and report which one wins: pixel ratio halved, post-processing off, shadows off, particles off, basic materials. A pixel-ratio win means the scene is fill-bound; a basic-material win means shader cost. For more than that, run `/perf-loop`.

Phone reference points from the same source (not measured by this skill): pixel ratio 1.25 to 1.5, 50 to 90 draw calls, at most one shadowed light, at most two blended full-screen layers, 16.7 ms per frame ideal and 25 ms acceptable.

## Lifecycle in frameworks

*From `web-design/threejs` and `web-design/build-threejs-scroll-worlds` (`references/realtime-architecture.md`).*

When the host can unmount the scene (SPA routes, React StrictMode double mounts), `__scene.dispose()` frees geometries, materials, textures, render targets, the renderer, listeners and the animation frame. After mount, unmount and mount, exactly one loop runs and `info.memory` returns to its first values. On touch devices, rebuild only when the width or orientation changes, not when the URL bar changes the height.
