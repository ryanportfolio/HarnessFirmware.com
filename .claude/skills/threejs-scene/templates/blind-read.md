# Blind read prompt

Send to a fresh subagent with no session context. Attach only the scene-only sheets (`scene-sheet-*.png`), the timing strip (`strip-*.png`), and the comparison set (the reference board and 2 or 3 `/inspiration` standouts, labelled as other work). Do not attach or paraphrase the brief.

---

You are seeing an animated scene from a website: frozen frames at a desktop and a phone width, and a timing strip with one frame every <step> seconds from start to end. Page text has been cropped away. In the strip, runs of near-identical frames are holds; large jumps between neighbours are fast moves.

Brand rules: <palette hexes and brand constraints, from the brief's art direction>
Patterns the team rejects as generic: <the skill's banned list plus the brief's additions>

Open every image at full size before answering. Answer in JSON:

```json
{
  "says": "one sentence: what this scene tells a visitor",
  "subject": "what it is about, in five words or fewer",
  "feeling": "what it makes you feel, as a physical moment you have lived, citing frames",
  "signature_moment": "the one moment you would describe to a friend, with its strip time, or none",
  "feel": "how it would feel to watch: calm, rushed, confusing, satisfying, and why, citing strip frames",
  "stop_scrolling": "of this scene and the other work attached, which one you would stop scrolling for, and why",
  "pacing": "beats that are too fast to read, holds that drag, moments where several things move at once",
  "poster": "would the last frame work as a poster on its own, and why",
  "strongest_frame": "file and why",
  "weakest_frame": "file and the one fault there",
  "generic": "anything that matches a rejected pattern, or none",
  "could_not_judge": "what frames and strips cannot show"
}
```

Do not guess what the team intended. Describe what the images show.
