# Bed 1 Pump-Drive Circuit — Disconnect / Verify / Reconnect / Test Procedure

Written after a bench test where the relay audibly clicked but the pump never
ran, and multimeter checks found current leaking through the coil even at
idle (86→GND = 12.9V correct; 85→GND = 6V; 85-to-86 = 5.6V drop) — meaning
either the 2N2222 or the 1N4007 is very likely wired to the wrong physical
leg. This procedure verifies both components directly before anything gets
reconnected, rather than guessing from more live voltage readings.

---

## Step 0 — Disconnect, safely

1. Disconnect the **12V battery/bus** from the fused feed entirely — pull it
   at the source, not just at the relay. Confirm with a multimeter: 0V
   between the fused bus and ground.
2. Leave the ESP32 on USB power if you want (it's on a separate 5V supply,
   not part of what you're rebuilding) — or unplug it too, your choice, it
   doesn't affect the checks below.
3. Physically disconnect the 2N2222 and the 1N4007 from the circuit — pull
   them out, or at minimum unclip the wires going to pins 85/86 and to the
   transistor, so you can test each component in isolation.

---

## Step 1 — Verify the 1N4007 diode (in isolation, multimeter in diode-test mode)

1. Set your multimeter to **diode-test mode** (usually the diode symbol, ⏵|).
2. Probe the two leads of the diode, one direction, then the other.
3. **One direction** will show a reading (~0.5–0.7V) — that's **forward
   bias**: red probe (+) is touching the **anode**, black probe (−) is
   touching the **cathode** (the banded end).
4. **The other direction** will show "OL" / no reading (open) — that's
   reverse bias, confirms the same lead identification.
5. **Write down which physical end is the cathode** (banded end) — this is
   the end that must land on **pin 86**.

If you get a reading in *both* directions (near-zero both ways), the diode
is shorted/damaged — replace it. If you get no reading in *either*
direction, it's open/damaged — replace it.

---

## Step 2 — Verify the 2N2222 transistor (in isolation, multimeter in diode-test mode)

Don't trust the datasheet's generic pin diagram — verify the actual part in
your hand, since this varies by manufacturer/batch.

1. TO-92 package has 3 legs. Label them **A**, **B**, **C** arbitrarily (not
   yet Emitter/Base/Collector) so you don't bias yourself toward the
   datasheet's assumed order.
2. Test all 6 probe combinations (each pair, both directions) in diode-test
   mode. For a good NPN transistor, you'll find exactly **one leg** that
   gives a forward-bias reading (~0.6–0.7V) to **both** of the other two legs
   when your **red (+) probe is on it** — that leg is the **Base**.
3. Of the remaining two legs, the **Collector** and **Emitter**: with red
   probe still on Base, you already confirmed both directions. To tell C
   from E apart, most multimeters' diode-test mode also shows a (very rough,
   not precise) "hFE" difference, but the reliable way on a basic meter is:
   **the Base-to-Collector junction typically reads a very slightly lower
   voltage drop than Base-to-Emitter** — if your meter shows a clear
   difference (e.g. 0.680V vs 0.720V), the lower one is usually
   Base-Collector. If your meter can't resolve that difference, use a
   transistor-tester mode if your multimeter has one (many do, marked "hFE"
   with a socket) — plug it into the NPN socket in all 6 orientations; only
   the correct one reads a plausible hFE (tens to a few hundred); the rest
   read ~0 or nonsense.
4. **Write down which physical leg is Base, Collector, and Emitter.**

---

## Step 3 — Reconnect, in this exact order, testing after each addition

### 3a. Base drive only (nothing else connected yet)

1. ESP32 GPIO18 → 220Ω resistor → **the leg you identified as Base**.
2. Power the ESP32 (USB is fine). Do **not** reconnect the 12V bus yet.
3. With the multimeter still in continuity/voltage mode, confirm GPIO18
   toggling (trigger `/irrigate` briefly, or just observe) actually changes
   the base leg's voltage relative to ground — should go from ~0V (idle) to
   a small positive voltage (triggered).

### 3b. Add the transistor's Emitter and Collector

1. **Emitter** leg → common ground.
2. **Collector** leg → relay pin 85 (not yet connected to the relay/coil —
   just the wire run for now).
3. Still no 12V bus connected. Nothing to test electrically yet, but confirm
   physically secure connections.

### 3c. Add the relay coil circuit + diode

1. Relay pin 86 → **fused +12V bus** (still disconnected at the source).
2. Relay pin 85 → the Collector wire from step 3b (if not already landed).
3. **1N4007**: cathode (the end you identified in Step 1) → pin 86. Anode →
   pin 85 / Collector junction.
4. **Now reconnect the 12V bus at the source.**
5. **Test — idle check**: multimeter, pin 86 → ground, should read ~12V
   (bus voltage). Pin 85 → ground, should read **close to 12V too** (not
   6V) — this is the check that failed last time; if it's still showing a
   large drop here, stop and recheck the diode/transistor orientation
   before continuing.
6. **Test — triggered check**: run `/irrigate?sec=5&key=...` (or trigger
   from the dashboard). During the RUNNING phase, pin 85 → ground should
   drop close to 0V (transistor saturating, pulling the coil's return to
   ground) — and you should hear a clean, solid relay click, not a soft one.

### 3d. Add pins 30/87 (still no pump/valve connected yet)

1. Relay pin 30 → fused +12V bus (separate wire from pin 86, same bus).
2. **Test**: pin 30 → ground should read ~12V, matching what you found
   before.
3. **Test — triggered**: while running, measure pin 87 → ground. This is
   the check that read 0V last time — it should now read close to 12V
   during the RUNNING phase, confirming the relay is actually switching
   through cleanly.

### 3e. Add the pump (in a bucket of water — not the real bed)

1. Pump red (+) → relay pin 87.
2. Pump blue (−) → common ground.
3. **Test**: trigger a short cycle (`sec=5`) and confirm the pump actually
   runs and moves water during the RUNNING phase, and stops cleanly after.

### 3f. Add the valve (relay module, unchanged from before)

Only after 3e is solid — reconnect the relay-module channel to Bed 1's
valve exactly as before (GPIO19 → module IN2, CH2 COM → +12V bus, CH2 NO →
valve lead 1, valve lead 2 → ground). Test a full cycle end-to-end.

---

## Why this order

Each step only adds one new thing to the previous, working state, and each
step has its own pass/fail check *before* moving on — so if something's
still wrong, you know exactly which addition caused it, instead of
rebuilding the whole circuit and hoping.
