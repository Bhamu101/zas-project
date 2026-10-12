# Brag Plan: Goho Rakangwara — v3 "Nobody pressed anything"

## What is this app?
A solar-powered, sensor-driven drip irrigation system for a small farm in Norton, Zimbabwe (Agri-Intelligence 2026). Newest capability: Bed 1's ESP32 now waters itself against Covo's thresholds, and a bed camera photographs the crop and has an AI check it.

## The angle
v2 was "one tap from anywhere". v3 is the opposite joke: **no tap at all.** The bed went dry, the node watered it, the camera checked on the crop afterwards. The farmer learns about it last. Specific to this project: the on-node decision that survives a Wi-Fi outage, and the daily AI crop check.

## Hook (first 2-3 seconds)
Black-navy field. One mono line fades in: **Bed 1 just dropped to 18%.** Beat. Then, quieter: **Nobody pressed anything.**

## Key moments (the middle)
- **It waters itself** — Bed 1 control card in Automatic mode (no button pressed, no cursor). Pill Critical, pump flips to Running, the bar climbs 18 → 48 % across the 32 % trigger tick, pill flips to Optimal. Line under the bar, verbatim from the app: "Automatic cycle — runs until moisture reaches 48%". Caption: "The decision is made on the node. Wi-Fi optional."
- **Then it checks the crop** — the Bed Camera card: photo of the bed tagged "After irrigation", then the "AI crop check" panel resolves: Nutrient deficiency · moderate · "What to do:" + "Daily check · just now". A WhatsApp-style alert chip lands: "Bed 1 · crop health: moderate". Caption: "Then it photographs the bed and checks the crop."

## Outro / punchline
Small deadpan line: **The farmer found out afterwards.** Then the wordmark **Goho Rakangwara** (Fraunces italic), lime rule, project title, "Agri-Intelligence 2026 · Norton, Zimbabwe".

## User flow worth showing
1. **Entry** — Bed 1 drops below Covo's trigger (18 % < 32 %).
2. **Key action** — automatic cycle runs by itself until moisture reaches the optimal band.
3. **Result** — camera photo + AI crop check + alert to the farmer's phone.

## Tone
- Preset: deadpan
- Creative direction: a farm that quietly handles everything while you're away
- Interpretation: 4 scenes, long holds, one thought per scene, slow crossfades. The joke is that nothing dramatic happens: no cursor, no hype words.

## Format: landscape — 1920x1080
## Duration: 22.0 s

## Visual identity (from the project)
Dashboard dark theme, `irrigation-dashboard/src/index.css`:
- Background: `#0b1120` (surface `#131c2e`, surface-2 `#1a2438`)
- Accent: `#c7ff2e` (lime, carries `#0f0f0f` ink)
- Text: `#f1f5f9`, muted `#94a3b8`
- Status: ok `#34d399`, warn `#fbbf24`, danger `#ff6b6b`; bar fills optimal `#16a34a`, critical `#ef4444`
- Display/body font: IBM Plex Sans; numbers IBM Plex Mono; wordmark Fraunces italic 600
- Strongest visual element: the bed moisture bar with its band and trigger tick; the bed camera photo card.

Privacy note: no node IPs, keys or credentials shown. The bed photo is the project's own stock image `public/images/plant-bg.jpg`, standing in for a camera frame; the crop-check result is demo data.

## Share copy (draft)
Bed 1 dropped to 18%. Nobody pressed anything. Goho Rakangwara waters itself, photographs the crop afterwards and tells the farmer last. Built for Agri-Intelligence 2026 on an ESP32, FastAPI, React and Expo.

## Audio direction
- Role: warm bed, sparse accents (deadpan restraint)
- Music: `happy-beats-business-moves-vol-11-by-ende-dot-app.mp3` (114.8 BPM)
- Music treatment: fade in over 1 s to ~0.22 volume, fade out under the wordmark over the last 2 s.
- Music cue guidance: bundled preset. Strong cues: 1.60 s (second hook line), 8.96 s (camera scene in), 17.91 s (wordmark). Beat grid ≈ 0.53 s; scene cuts at 3.70, 8.96, 15.28 (beat-grid). Sequential text held ≥ 1 s (every other beat).
- Audio-reactive treatment: subtle — faint lime wash follows music RMS; wordmark glow follows bass. No waveforms.
- SFX posture: sparse, motion-matched, low HF-risk.
- Audio-coupled moments: pump-start tick, Optimal flip (glass accent), photo card drop, alert chip drop, wordmark soft impact.
- Restraint rule: no sound on plain text entrances; nothing after the wordmark lands.

## Storyboard

### Scene 1 — Nobody — 3.7 s (0.00–3.70)
Mono "Bed 1 just dropped to 18%." fades in at 0.4 s (holds ≥ 2 s). "Nobody pressed anything." lands at 1.60 s (strong cue) below it, larger, ink colour. Holds to 3.70.
Sequential/interaction: yes — two lines, second at 1.6 s, each held ≥ 1.8 s.
Audio intent: quiet. One soft tick on the second line.
Transition mood: slow crossfade → Scene 2

### Scene 2 — It waters itself — 5.26 s (3.70–8.96)
Bed 1 card fades in, no cursor. Pill Critical, Mode "Automatic", pump "Idle" → "Running" at 4.2 s; bar and number climb 18 → 48 % through 8.0 s; pill flips to Optimal at 8.44. Under the bar: "Automatic cycle — runs until moisture reaches 48%". Side lines: "No tap." / "Wi-Fi optional." 
Sequential/interaction: yes — status changes in sequence, simulated with no cursor.
Audio intent: a single click when the pump starts; glass accent on Optimal.
Transition mood: slow crossfade → Scene 3

### Scene 3 — Then it checks the crop — 6.32 s (8.96–15.28)
Camera card slides in on the 8.96 cue: bed photo, tag "After irrigation", "Camera online" pill. At 10.6 s the "AI crop check" panel resolves beside it: Nutrient deficiency · moderate, "What to do: …", "Daily check · just now". At 12.6 s a WhatsApp-style alert chip lands: "Bed 1 · crop health: moderate". Caption "Then it photographs the bed and checks the crop."
Sequential/interaction: yes — photo, result, alert, each held ≥ 1.8 s.
Audio intent: soft drop per arrival.
Transition mood: slow crossfade → Scene 4

### Scene 4 — Afterwards — 6.72 s (15.28–22.00)
"The farmer found out afterwards." fades in at 15.5 s, holds, softly dims; wordmark lands on the 17.91 cue; lime rule; project title; Agri-Intelligence line.
Audio intent: one soft impact on the wordmark; music fades.

Scene sum: 3.70 + 5.26 + 6.32 + 6.72 = **22.0 s**

**Music mood:** deadpan warm bed
**Audio summary:** quiet bed, a few clean interface sounds, one soft impact on the wordmark.
