# Smart Irrigation for Agricultural Value Chains
## Project Objectives — Agri-Intelligence 2026

Living reference document. The project has **five objectives** — nothing
outside this list is in scope.

---

## 1. Automatic irrigation via soil-moisture sensors

Water only the bed that needs it, with no human involved. Each bed has a
soil-moisture probe reporting VWC % to the ESP32. When a bed drops below its
crop's trigger threshold, the ESP32 opens that bed's solenoid valve and runs
the pump until the bed is back in its optimal range, then closes the valve.
One bed at a time — if two are dry, the first finishes before the next
starts. Trigger/optimal thresholds are per-crop and shared between the
firmware and the dashboard so they always agree.

No moving parts: fixed pump and reservoir, one permanent pipe branch per bed,
one valve per branch.

**Status: designed, not built.** No probes are wired yet, and the firmware
currently only runs manual cycles (objective 2) — there is no sensor read
and no automatic loop.

---

## 2. Manual irrigation via web dashboard and mobile app

The farmer triggers an irrigation cycle for a bed from a button on either the
web dashboard or the mobile app. The backend sends the command to the ESP32,
which runs the timed open-valve → pump → close-valve sequence itself.

**Status: built.** Working end to end for Bed 1's real hardware (valve + pump
via an ESP32-driven relay); Beds 2 and 3 are simulated in the backend. If the
ESP32 is unreachable the backend reports a failure rather than showing a false
"irrigating" state.

---

## 3. Remote access via the mobile app

The farmer can use the app from anywhere, not just on the farm's WiFi —
check the aerial/satellite view of the farm and trigger irrigation with the
manual button.

**Status: built.** Backend deployed to the cloud (Render); the on-farm ESP32
is reached through a persistent tunnel with a shared-secret key; the app is
distributed as an installable Android build. The aerial view is a satellite
map of the farm boundary.

---

## 4. Crop health analysis from a photo

The farmer photographs a plant and gets back a diagnosis — health status,
likely condition, and suggested treatment — from an AI vision model.

**Status: built.** One backend endpoint, shared by the web dashboard and the
mobile app.

---

## 5. AI assistant

A chat assistant the farmer can ask anything — about their farm or
otherwise — powered by an LLM and grounded with a live summary of current
system state.

**Status: built.** Branded "Goho AI" in the apps.
