# Hyperframes Composition Brief: Goho Rakangwara (v3)

## Objective
Short deadpan brag video: the farm watered itself and checked the crop; nobody pressed anything.

## Output
- Composition directory: `brag-output-2026-10-10-130437/composition/`
- Rendered video: `brag-output-2026-10-10-130437/brag.mp4`
- Format: landscape — 1920x1080, 30 fps
- Duration: 22.0 s

## Source Material
- Files read: docs/PROJECT-OBJECTIVES.md, PROJECT_CONTEXT.md, irrigation-dashboard/src/index.css, routes.js, pages/IrrigationControl.jsx, components/dashboard/BedCamera.jsx, backend/camera.py, backend/diagnosis.py, firmware bed1-irrigation.ino header
- Product name: Goho Rakangwara — Smart Energy-Driven Irrigation for Agricultural Value Chains
- Copy verbatim: "Automatic cycle — runs until moisture reaches 48%"; "AI crop check"; "What to do:"; "Daily check"; "After irrigation"; "Camera online"
- Moments to recreate: Bed 1 control card in automatic mode; Bed Camera card + AI crop check panel.

## Creative Direction
- Tone: deadpan — a farm that quietly handles everything while you're away
- Hook: "Bed 1 just dropped to 18%." → "Nobody pressed anything."
- Outro: "The farmer found out afterwards." → wordmark
- Avoid: generic SaaS language, abstract filler, any real keys/IPs/credentials

## Visual Identity
Bg #0b1120, surface #131c2e, ink #f1f5f9, muted #94a3b8, lime #c7ff2e, danger #ff6b6b, ok #34d399. IBM Plex Sans / Mono, Fraunces italic wordmark (all shipped in assets/fonts).

## Storyboard
See brag-plan.md. 4 scenes: Nobody 3.70 / Waters itself 5.26 / Checks the crop 6.32 / Afterwards 6.72.

## Audio
- Role: warm bed, sparse accents. Music vol ~0.22, fade in 1 s, out last 2 s.
- Music: happy-beats-business-moves-vol-11 (preset cues in assets/music). Strong cues 1.60, 8.96, 17.91.
- Audio-reactive: subtle lime wash + wordmark glow from audio-data.js.
- SFX: from assets/sfx (already copied), matched to motion; sparse.

## Hyperframes Instructions
Use hyperframes-core/animation/creative/keyframes/cli conventions; run `npx hyperframes check` before render. Keep all text readable (≥ 0.8 s settled per short label, ~0.3 s/word per sentence).
