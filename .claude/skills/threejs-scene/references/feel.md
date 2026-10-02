# Feel

How a scene reaches a feeling and leaves a memory. Numbers are starting points; tune them by watching at full speed.

## Feeling target

State the feeling as a physical moment a person has lived: "the hush when a gallery light comes up on one object", "the click of a well-made latch", "breath on a cold window". An adjective ("premium", "clean", "magical") gives the judge nothing to compare and the builder nothing to aim at. The blind read must name a feeling that matches it.

## Peak and end

People judge an experience by its most intense moment and its end (the peak-end rule, Kahneman and Fredrickson). So:

- Name one signature moment: the thing a visitor would describe to a friend. Give it the slowest anticipation (0.4 to 0.8 s), the clearest action, and the longest hold (2 to 3 s).
- Every other beat sets it up or lets it settle. Cut a beat that does neither.
- The settled frame is the end: still, composed, a poster. The signature moment and the end can be the same frame; they rarely should be the same second.

## Tactile response

One material behavior under the pointer or a touch, so the scene answers the visitor.

- Responds within one frame of input; weight comes from a spring (stiffness about 120 to 220, damping ratio about 0.6 to 0.85), inertia, or damping, never a linear lerp.
- Has a touch equivalent on phones (a tap ripple, a drag), set with `touch-action: none` only while interacting so the page still scrolls.
- Is exempt from `?t=`; shoot it with a pose hook (`?px=&py=`) or a scripted pointer path.
- Examples: Clearwater ripples (https://aureliengmz.github.io/clearwater/), the wordmark refracting under ripples in Muzli's Lenn demo (https://muz.li/blog/claude-opus-5-5-for-designers/), Sylva moss bending under the pointer (https://mengto.github.io/sylva/).

## Breathing holds and the idle

- During a hold, keep motion just below notice: amplitude under about 2 percent of the frame (or of an object's size), periods of several seconds.
- Mix two or three sines with periods that do not divide evenly (for example 7.3 s, 11.9 s, 17.1 s), so the idle never visibly repeats.
- This is not a second focus: it is slower, smaller and evenly spread.
- After the settled frame, the idle continues at the same low level. Reduced motion freezes it.
- Exit: as the canvas leaves the viewport, let the scene ease toward a rest pose over the last 20 percent of visibility, then stop the loop.

## Naming techniques

Give each effect a method name and a source link in the brief. Examples: Tessendorf FFT ocean (https://jtessen.people.clemson.edu/reports/papers_files/coursenotes2004.pdf), Wallace caustics (https://madebyevan.com/webgl-water/), Hillaire atmosphere (https://sebh.github.io/publications/), shell texturing for fur and moss (https://hhoppe.com/proj/fur/), position-based fluids (https://mmacklin.com/pbf_sig_preprint.pdf). A named method gets the real technique; "make it look like water" gets a guess.

## Sound (optional)

Only when the brief asks. Starts only on a user click, never on load. Web Audio or Tone.js, quiet by default, with a visible mute. Example of sound used with care: https://github.com/iamtechartist/memory-fading-into-watercolor.

## Comparison set

For each quality gate, assemble: the scene's key frame (or strip, for pacing), the reference board, and two or three standouts from the latest `/inspiration` report (`D:\inspiration\` on the owner's machine, or the project's equivalent). Ask the judge which one a person would stop scrolling for, and why. A scene that loses to every comparison is not done.
