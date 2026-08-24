# Smart Energy-Driven Irrigation for Agricultural Value Chains
## Project Objectives — ZAS 2026

Status: living reference document. Update this file as scope decisions are made so every session starts from the same source of truth.

---

## 1. Precision Bed-Level Irrigation

Reduce water waste versus blanket irrigation by only watering the bed(s) that actually need it — fully automatically, no gantry, no manual repositioning.

- Soil moisture sensing per bed (VWC %) via resistive probes wired to the ESP32 sensor node, driving state: critical / needs-water / optimal. Probe VCC is pulsed — powered only for the brief moment of each reading, via a spare GPIO — to slow corrosion on the resistive contacts.
- **Mechanism (current, locked in):** the pump and reservoir stay fixed in one place. The delivery line splits into three permanent branches, one to each bed, each gated by its own 12V solenoid valve. The ESP32 decides which valve to open based on which bed reads critical, and runs the pump only while a valve is open — automatic, with no moving mechanical parts (no rail, no motor, no stepper).
- **Watering order: one bed at a time.** If more than one bed is critical at once, the ESP32 finishes one bed's watering cycle and closes its valve before moving to the next, rather than opening multiple valves simultaneously — keeps flow/pressure consistent for the small submersible pump.
- Trigger threshold and optimal range are configurable (currently modeled as vwcTrigger / vwcOptimalMin / vwcOptimalMax in the dashboard's systemInfo) — the firmware reuses these same thresholds so hardware and dashboard stay in agreement.

**Design history (context only, not the current plan):**
1. Original hardware plan: a motorized linear rail gantry physically carries the drip head between beds (OpenSCAD mounts already drafted for this — now unused).
2. Interim idea: drop the gantry, a human manually carries a single hose to whichever bed needs water and flips a manual switch to run the pump.
3. **Current:** fixed multi-branch plumbing with a solenoid valve per bed, fully automated by the ESP32 — no human action needed once a bed is flagged critical.

**Parts the current design adds** (beyond the ESP32, resistive probes, pump, battery, charge controller, and inverter already on hand):
- 3x 12V solenoid valves, normally-closed, sized to the delivery hose/tubing diameter — one per bed.
- A 4-channel relay module (3 valves + 1 pump) so the ESP32's GPIOs can switch the 12V loads.
- Tubing tees/splitters to branch the single pump line into three bed lines.
- Still needed regardless of mechanism, per earlier discussion: a 12V→5V buck converter (or USB power) for the ESP32, an inline fuse, a fixed reservoir, and delivery hose/tubing.

**Firmware logic** (to build once sensor readings are verified working):
1. Continuously read all 3 sensors (pulsed power) and classify each bed's state.
2. If a bed is critical and nothing is currently being watered, close all valves, open that bed's valve, and turn the pump relay on.
3. Keep re-reading that bed's sensor; once it's back in the optimal range, close its valve and turn the pump off — or, if another bed is also critical, move straight to that one instead.
4. Repeat indefinitely.

Status: **design locked in, not yet built.** Sensor node bring-up (proving the ESP32 boots and talks over serial) is in progress; sensor wiring, relay/valve wiring, and the automation logic above are all still ahead.

---

## 2. Resilient, Energy-Aware Power

Keep the system running independent of unreliable grid power (ZESA), and get as much usable energy as possible from the solar array.

**2a. Power source resilience (existing objective)**
- 60W solar panel + LiFePO4 12V 20Ah battery as primary power.
- Automatic Transfer Switch (ATS) fails over to grid (simulated via a 12V adapter) when solar/battery is unavailable, and switches back automatically when solar/battery returns — demoed live by physically disconnecting the battery/solar wire.

**2b. Moving solar tracker (NEW — added to maximize energy output)**
- **Axis:** single-axis, east-west sweep. The panel tracks the sun's daily east-to-west arc; no seasonal tilt axis. Chosen over dual-axis to keep motor count, mounting complexity, and firmware effort compatible with the 14-day build window. Typical expected gain over a fixed panel: roughly 10-15%.
- **Sensing: hybrid.**
  - *Primary:* LDR (photoresistor) light sensors — likely a 2-sensor east/west pair with a central divider/shade — steer the servo toward the brighter side in real time. Reacts to actual sky conditions (haze, passing cloud, partial shade from nearby structures).
  - *Fallback:* time/astronomical sun-position calculation (based on date, time, and Norton, Zimbabwe's fixed lat/long) drives the panel when the LDR signal is ambiguous — e.g., uniformly dark readings under heavy overcast, at startup before the first confident light reading, or if a sensor fails. Requires an accurate clock source (RTC module, e.g. DS3231, or NTP sync if the ESP32 has connectivity) to compute sun position without GPS.
  - Rationale for hybrid over either alone: pure LDR trackers can hunt or stall in flat/overcast light; pure astronomical trackers don't correct for real obstructions or panel misalignment. Combining both gives real-time responsiveness with a sane fallback.

Status: **planned, not yet built.** No firmware, dashboard fields, hardware BOM, or mount design exist yet for the tracker — this section exists to lock in the design decision before implementation starts. Open items to resolve before building: which ESP32 node owns the tracker (currently 2 nodes: combined sensor+irrigation, and energy), servo vs. continuous-rotation motor choice, physical mount integration with the existing 60W panel bracket, and how tracker state (angle, active sensing mode, estimated gain) should surface on the Energy Management dashboard page.

---

## 3. Farmer-Facing Monitoring & Advisory Dashboard

Give the farmer (and judges) a clear, live view of system state without needing to interpret raw sensor data.

- 9-page React/FastAPI dashboard: Dashboard, AI Assistant, Irrigation Control, Energy Management, Bed Monitoring, Crop Health, Data & Reports, Alerts & Notifications, System Settings.
- Live bed status, water/energy KPIs, weather, and an AI-generated farmer advisory (and now a full AI Assistant chat) translate sensor data into plain-language recommendations.
- Designed for unattended kiosk display (Chromium kiosk mode) on a fixed screen at the exhibition.

Status: largely built and working against a hardcoded/in-memory backend; no persistence (SQLite) or live MQTT/ESP32 feed yet — those remain the next major software milestones once hardware is wired up.

---

## Not Yet Objectives (parked, revisit only if asked)

- Dual-axis tracking, SQLite persistence, MQTT/ESP32 live data feed, ESP32-CAM crop health detection — all deliberately out of scope for the current 14-day demo push unless explicitly reprioritized.
