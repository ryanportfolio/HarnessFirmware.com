# Scene brief: <name>

Copy to `.tmp/scene/<name>/brief.md`. Every field gets a value or "none".

## Idea

- **The one idea:** one sentence a visitor takes away in about three seconds, with no caption.
- **The feeling:** what it should make people feel, as a physical moment ("the hush when a gallery light comes up on one object"), never an adjective.
- **The settled frame in one sentence:** what a stranger would say it shows. It must carry the idea and the feeling.
- **Where it sits:** page, section, size at 1440 and at 390, what text overlays it and where.
- **Audience:** who sees it and what they already know.
- **Why three.js:** what it needs that SVG, CSS or a 2D canvas cannot give.

## Three directions

Same idea and feeling, three different metaphors, each with its own key frame (and a concept image when a generator is available). Record which one Gate A picked and why.

| Direction | Metaphor | Key frame | Concept image |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

## Art direction (chosen direction)

- **Reference board** (3 to 5):

  | Reference | What to take from it |
  |---|---|
  | | |

- **Key frame:** camera height and lens, what fills the frame, light direction, darkest and brightest areas, where the eye lands first. Concept image path, if made.
- **Light plan:** key, fill and rim with direction and ratio; the motivated source; what casts the grounding shadows.
- **Materials:** each surface, its real-world reference, roughness, and how its edges catch light.
- **Palette (hex, from project tokens) and color pipeline:** `outputColorSpace`, tone mapping, exposure.
- **Type near the scene:** families and roles from the project stylesheet.
- **Effects, jobs and techniques:** one line each: the effect, its job, the method name and a source link (for example "caustics, light through what was kept, Wallace caustics, https://madebyevan.com/webgl-water/"). No job, no effect.
- **Tactile response:** what the material does under the pointer or a touch, its weight (spring stiffness and damping, inertia), and the touch equivalent on phones.
- **Sound (optional):** none, or what plays, started only by a user click.
- **Banned for this scene:** the skill's list plus project and round additions.

## Storyboard

At most four beats for a hero; 6 to 12 s before the settled frame.

- **Endless exception (only when the owner asks for a piece that never settles):** what the first 6 to 12 s say on their own, the one direction the endless part changes in, the pause control, and which frame stands in as the poster and the fallback. Delete this line otherwise.

- **Signature moment:** the one thing a visitor would describe to a friend. Mark its beat; it gets the slowest anticipation and the longest hold.

| Beat | Start s | Anticipation | Action (the one thing moving) | Hold s | Camera (1440) | Camera (390) |
|---|---|---|---|---|---|---|
| 1 | 0 | | | | | |

- **Tall-screen framing:** how 390 is composed, never a center crop.
- **Settled end:** what stays; it works as a poster.
- **Idle and exit:** the breathing motion during holds and after settling (amplitude, periods), and what happens as the visitor scrolls away.
- **First second:** frame 0 equals the load poster; the no-WebGL fallback is the settled frame.
- **Exempt from `?t=`:** state that is not a function of time, or "none".
- **Check times:** 4 to 8 `?t=` values (each beat's hold, plus the settled end); strip step (default 0.25 s).

## Interaction

- One at most, what it tells the visitor, and its DOM mirror if it carries meaning. "None" is fine.

## Quality floor

- **Reduced-motion frame:** which `t` (default the settled end) and what it shows.
- **Fallback:** what shows without WebGL or after a lost context.
- **Numbers to watch:** time to first frame, draw calls, gzipped bytes. Frame times are reported, not budgeted.

## Stop point

- Round cap (default 4), budget, and who decides past the cap.
