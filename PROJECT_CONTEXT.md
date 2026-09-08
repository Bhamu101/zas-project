# ZAS Project — Context Document

Status: living reference, generated 2026-09-03 from the codebase + `CHANGED_FILES.txt` history.
Companion to [`PROJECT-OBJECTIVES.md`](PROJECT-OBJECTIVES.md) (the "why"/scope doc) — this file is
the "what exists and how it fits together" doc. Update both as things change.

---

## 1. What this is

**Smart Energy-Driven Irrigation for Agricultural Value Chains** — a solar-powered, sensor-driven,
per-bed drip irrigation system for a small farm in Norton, Zimbabwe, built for the ZAS 2026
exhibition. Three deliverables share one backend and one live data model:

1. **`irrigation-dashboard/`** — React/Vite web dashboard, "Goho Rakangwara" brand, kiosk display.
2. **`mobile-app/`** — Expo/React Native/TypeScript companion app, "Agri-Intelligence" brand.
3. **`backend/`** — single FastAPI service both clients talk to (`/api/dashboard` etc.).

Plus hardware/firmware work that hasn't reached the software yet (see §5).

## 2. Repo layout

```
ZAS PROJECT/
├── backend/                FastAPI service (Python, venv committed)
├── irrigation-dashboard/   React 19 + Vite web dashboard
├── mobile-app/             Expo Router + React Native app
├── firmware/sensor-node/   ESP32 .ino sketch + wiring docs (bring-up stage)
├── iriigation/             PLC project files (.plcprj/.imgx/.wkpx) — exploratory, unclear if active
├── claude-android-skill/   installed Claude Code skill package, not project source
├── render.yaml             Render Blueprint to deploy backend/ as a free web service
├── PROJECT-OBJECTIVES.md   scope/design decisions, source of truth for "why"
└── CHANGED_FILES.txt       running log of every feature/task, newest first
```

## 3. Backend (`backend/main.py`)

- **Stack:** FastAPI + uvicorn, `google-genai` (Gemini) for AI features, `twilio` for WhatsApp
  alerts, `python-dotenv` for config. No database — all state is in-memory Python (`BEDS`,
  `BED_ACTIVITY` module-level lists) and **resets on server restart**.
- **Run:** `uvicorn main:app --host 0.0.0.0 --port 8021` from `backend/` (a `venv/` is already
  committed with dependencies installed). Deployed via `render.yaml` to Render as
  `zas-irrigation-api` (free tier); secrets (`GEMINI_API_KEY`, `TWILIO_*`) are set in the Render
  dashboard, not committed.
- **CORS is wildcard-open** (`allow_origins=["*"]`) — deliberate, since it's a no-auth demo API hit
  from the web dashboard, mobile app (native + web build), and whatever LAN/ngrok URL the mobile
  app happens to be pointed at.
- **Endpoints:**
  - `GET /api/dashboard` — the one big payload both clients poll (system status, 3 beds, KPIs,
    energy overview, alerts, reports, `systemInfo` thresholds, `mobileExtras` for the app).
  - `POST /api/irrigation/trigger/{bed_id}` — demo-simulates a manual watering (+22% VWC instantly).
  - `POST /api/irrigation/start/{bed_id}` / `stop/{bed_id}` — mobile app's manual valve/pump control
    pair; `stop` is what actually applies the moisture bump.
  - `POST /api/alerts/test-whatsapp` — sends a one-off Twilio WhatsApp test message.
  - `POST /api/assistant/chat` — Gemini-backed chat ("Goho AI" / farmer assistant), grounded with a
    live system-status summary injected into the system prompt.
  - `POST /api/crop-health/diagnose` — Gemini vision call: photo in, structured JSON plant diagnosis
    out (`healthStatus`, `condition`, `treatment`, etc.). Shared by both clients — one pipeline.
- **Per-crop moisture model:** `CROP_TARGETS` (Covo, Tsunga, Tomato) gives each bed its own
  `vwcTrigger` / `vwcOptimalMin` / `vwcOptimalMax`; `bed_state()` re-derives a bed's status from its
  own thresholds instead of a hardcoded cutoff. The dashboard mirrors this table client-side in
  `irrigation-dashboard/src/lib/cropTargets.js` so both layers agree.
- **Known gap:** no persistence (SQLite planned, not started), no live MQTT/ESP32 feed — everything
  is realistic mock data plus client-side simulations layered on top.

## 4. Web dashboard (`irrigation-dashboard/`)

- **Stack:** React 19, Vite 8, Tailwind v4 (via `@tailwindcss/vite`), Recharts, Leaflet/react-leaflet
  (satellite map), lucide-react icons, socket.io-client (installed, not confirmed wired to a live
  socket yet — worth checking if you touch real-time features).
- **Run:** `npm run dev` (port 5173, `--host` for LAN access) from `irrigation-dashboard/`; needs
  the backend reachable at `http://localhost:8021` (hardcoded in
  `src/hooks/useDashboardData.js`, polled on an interval rather than fetched once).
- **Also has an Electron shell** (`electron/main.cjs`, `npm run electron`) — present in
  `package.json` but not otherwise documented in the change log; treat as secondary to the browser
  target used for the kiosk display.
- **Pages (sidebar nav):** Dashboard (cinematic scroll hero), Goho AI (assistant chat), Irrigation
  Control, Energy Management, Bed Monitoring, Crop Health (AI diagnosis), Aerial View (satellite
  map), Data & Reports, Alerts & Notifications, System Settings.
- **Notable design decisions from the change log:**
  - Energy Management went through several iterations — badges like "Simulated"/"Concept"/
    "Estimated" were deliberately removed once the simulations became internally consistent
    (`src/lib/energySimulation.js` is the single shared source of truth for the ATS/recommendation
    logic so cards never disagree with each other).
  - A full "Solar Tracker Digital Twin" (3D-ish SVG scene, timeline scrubber, exhibition mode) was
    built, then **entirely removed** per user request in favor of a simpler `SolarTrackerCard`
    preview — if you see references to `TrackerScene`/`digital-twin/` in history, that's dead code
    already deleted, not something to resurrect.
  - A "Live Simulation" page was built and then fully reverted same-session (net zero diff) —
    documented in `CHANGED_FILES.txt` in case it resurfaces as a request.
  - Irrigation Control's "Trigger Irrigation Now" is a **client-side** gradual sim (no backend
    POST) so the UI shows a believable ramp instead of an instant +22% jump.
  - Aerial View uses free Esri World Imagery tiles; a Google Earth Engine upgrade path (NDVI,
    change-over-time) is scoped but needs a GCP project + service account + a new backend endpoint
    to serve authenticated EE tiles — not started.
- **Status:** largely built and working against the mock/in-memory backend described above.

## 5. Mobile app (`mobile-app/`)

- **Stack:** Expo SDK 57 (Expo Router, file-based routing), React Native 0.86, TypeScript, Zustand
  for state (persisted to AsyncStorage for offline fallback), Plus Jakarta Sans via
  `@expo-google-fonts`. Plain `StyleSheet` design tokens (`src/constants/theme.ts`) — no NativeWind.
- **Brand:** "Agri-Intelligence" (superseded an earlier "TelOne/Goho Rakangwara" mobile direction —
  the web dashboard keeps the Goho Rakangwara name, the app doesn't).
- **Run:** `npm install && npm start` from `mobile-app/`; needs `EXPO_PUBLIC_API_URL` set (`.env`,
  copy from `.env.example`) to wherever the backend is reachable. `localhost` only works for a
  web/simulator build on the same machine as the backend.
- **Remote (non-LAN) operation** is explicitly supported: `expo start --tunnel` for the Metro
  bundler, and either an ngrok/Cloudflare tunnel or the deployed Render backend for the API — with
  a **runtime override** in-app (Settings → Backend Server URL) so a standalone build doesn't need
  a rebuild to point at a new backend URL.
- **Offline behavior:** if the backend is unreachable, the app shows cached last-synced data from
  AsyncStorage with an "Offline — showing data from…" banner rather than a blank screen.
- **Navigation:** 5 bottom tabs (Home, Crops, Water, Weather, Insights); Settings/Energy/Alerts live
  under `(tabs)/more/*`, reached via the profile icon/notification bell, not the tab bar.
- **`src/services/recommendationEngine.ts`** — a rules engine (not an LLM) that reuses the backend's
  live VWC thresholds, so its advice always matches actual sensor state.
- **Standalone build prep:** `app.json` has an Android package id and `eas.json` has a "preview"
  profile for an installable `.apk` (internal distribution), aimed at distributing the app for
  testing without Play Store review. Actually running `eas build` and deploying the Render backend
  are **not done** — need the user's own Render/Expo accounts.
- **Known placeholder:** the logo (`src/components/ui/LogoMark.tsx`) is a stand-in SVG pending the
  real plant/circuit logo asset.
- **Status:** Splash, Login, Farm Setup, tab shell, Home, Crops (list+detail), Water Management,
  Weather, Insights, Alerts, Settings are built and wired to the real backend. Reports, User
  Management, Data Export, and full language switching are "coming soon" placeholders.

## 6. Hardware / firmware (in progress, mostly ahead of the software)

Full design rationale lives in `PROJECT-OBJECTIVES.md` — summary of current state:

- **Irrigation mechanism (locked in):** fixed pump/reservoir, 3 permanent delivery branches (one
  per bed) each gated by its own 12V solenoid valve, ESP32-controlled, one bed watered at a time.
  Superseded two earlier ideas (motorized gantry, then manual hose-carry) — don't resurrect those.
  **Status: designed, not built.** `firmware/sensor-node/sensor-node.ino` + `WIRING.md`/`WIRING.pdf`
  cover ESP32 bring-up and sensor wiring; the valve/relay/pump automation logic described in the
  objectives doc has not been written yet.
- **Solar tracker (new, planned):** single-axis E-W sweep, hybrid LDR (primary) + astronomical
  fallback (needs an RTC or NTP for sun-position calc). **Status: design locked, nothing built** —
  no firmware, no hardware BOM finalized, no dashboard fields exist for real tracker telemetry
  (the dashboard's `SolarTrackerCard` is an illustrative preview, not live data).
- **Power resilience:** 60W solar + LiFePO4 12V 20Ah battery, ATS fails over to grid (simulated via
  a 12V adapter for the demo).
- **`iriigation/` folder** (note the filename typo) holds `.plcprj`/`.imgx`/`.wkpx` files — looks
  like an earlier PLC/ladder-logic exploration, unclear if still relevant to the current
  ESP32-based design. Worth confirming with the user before treating it as active work.

## 7. Cross-cutting notes worth knowing before making changes

- **Single source of truth for VWC thresholds:** backend `CROP_TARGETS`/`bed_state()` ↔ dashboard
  `src/lib/cropTargets.js` ↔ mobile `src/data/crops.ts` + `recommendationEngine.ts`. Changing
  irrigation thresholds means touching all three or they'll disagree.
- **No auth, no database, anywhere.** This is an exhibition demo, not a production system — CORS is
  wildcard, state is in-memory, and hardcoded farmer identity ("Bhamu") is baked into the AI
  assistant's system prompt.
- **AI features (Gemini) require `GEMINI_API_KEY`** in `backend/.env`; WhatsApp alerts require the
  four `TWILIO_*` vars. Both degrade gracefully (chat/diagnosis return a clear 500 with setup
  instructions; WhatsApp alerts silently no-op) when unset.
- **Verification pattern used throughout the change log:** `npx eslint` clean + `npx vite build`
  succeeds + a real headless-Chromium (Playwright) pass confirming no console errors — not just a
  compile check. Follow the same bar for new dashboard work.
- **Git:** single GitHub repo (`github.com/Bhamu101/zas-project`, private), pushed 2026-08-24;
  `.gitignore` excludes installed tool/skill packages (`.agents/`, `.claude/skills/`,
  `claude-android-skill/`) as non-project-source content.
- **`CHANGED_FILES.txt`** is the authoritative day-by-day history with rationale for *why* things
  were built, reverted, or renamed (e.g. the Dreamstime-watermarked GIF that was rejected in favor
  of an original solar-tracker illustration) — check it before assuming something is missing or
  before redoing work that was deliberately undone.

## 8. Open threads / likely next work

From `PROJECT-OBJECTIVES.md`'s "Not Yet Objectives" plus gaps noted above:

- Wire the ESP32 sensor node's valve/relay/pump automation logic (design is locked, code isn't written).
- Build and wire the solar tracker (hardware + firmware + real dashboard telemetry fields).
- Backend persistence (SQLite) and a live MQTT/ESP32 data feed to replace the in-memory mock state.
- Deploy the Render backend for real and run `eas build` for a distributable mobile `.apk`.
- Confirm whether `iriigation/` (PLC project) is still relevant or safe to remove.
- Swap the mobile app's placeholder logo for the real asset once supplied.
