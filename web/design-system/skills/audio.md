# Skill: audio

Sound is manifest-driven. The AI never picks which file plays — it maps game events to manifest entries by description.

## Manifest convention

`public/audio/manifest.json` per game:

```json
{
  "card-deal": {
    "file": "/audio/card-deal.mp3",
    "description": "Soft paper slide; a single card dealt to a hand"
  },
  "card-flip": {
    "file": "/audio/card-flip.mp3",
    "description": "Crisp snap; a face-down card revealed"
  },
  "win-sting": {
    "file": "/audio/win-sting.mp3",
    "description": "Short bright chime; a player wins the round"
  }
}
```

## Rules

- Map events to entries by **description**, not filename. No fit = no sound; never repurpose loosely.
- One sound per event. Simultaneous events (multi-card deal): stagger ~80ms, don't stack.
- Never autoplay before user interaction (browser policy). Replay scrubbing is silent; single-step may sound.
- Sounds accompany animation; sync start to the animation start.
- Missing files at runtime fail silently — audio is enhancement, never load-bearing.
- Files are supplied by humans. Never generate, never hotlink external audio.
