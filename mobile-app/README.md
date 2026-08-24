# Agri-Intelligence — Mobile App

Expo/React Native/TypeScript companion app for the same smart irrigation system as
[`../irrigation-dashboard`](../irrigation-dashboard) — same backend, same beds (shown
here as crops), same numbers, different (mobile) shell and visual identity.

## Run it

```bash
npm install
cp .env.example .env   # set EXPO_PUBLIC_API_URL to your LAN IP if testing on a phone
npm start
```

The backend (`../backend`, `uvicorn main:app --port 8021`) must be running and reachable
from wherever you run the app. `localhost` only works for a web/simulator build on the
same machine as the backend — a physical device needs something else (see below).

## Running remotely (not on the same network as the backend)

Two independent things need to reach you: the **Expo dev server** (delivers the JS
bundle to the phone) and the **backend API** (serves live farm data). Same-LAN "just
works" for both; anything else needs one of these:

- **Metro/Expo dev server** — run `npx expo start --tunnel` instead of `npm start`.
  This routes the dev server through an ngrok tunnel so Expo Go can load the app from
  anywhere, not just the same Wi-Fi. (First run installs the `@expo/ngrok` helper.)
- **Backend API** — the backend has no built-in tunnel. Either:
  - Run `ngrok http 8021` (or a Cloudflare Tunnel) next to the backend to get a public
    HTTPS URL, or deploy `backend/` somewhere reachable.
  - Then open the app → profile icon (top-left of Home) → **Settings → Backend Server**,
    paste that URL into "Backend Server URL", and tap **Save & Test Connection**. This is
    a runtime override (persisted on-device, no rebuild needed) — see
    `src/store/settingsStore.ts` and `src/services/api.ts`.
- Backend CORS is wildcarded (`allow_origins=["*"]`) since it's a no-auth demo API, so
  it'll accept requests from whatever tunnel/LAN origin the app is running on.
- If the backend is unreachable, the app falls back to the last-synced cached data
  (`src/store/dashboardStore.ts` persists it to AsyncStorage) and shows an
  "Offline — showing data from…" banner rather than an empty screen.

## Branding

Visual identity is **Agri-Intelligence** (not TelOne/Goho Rakangwara — that was an
earlier direction, since replaced). The logo at `src/components/ui/LogoMark.tsx` is a
**placeholder** SVG standing in for the supplied plant/circuit logo — swap it for the
real asset per the instructions at the top of that file once it's saved into
`assets/images/`.

## Navigation

Bottom tabs: **Home · Crops · Water · Weather · Insights** (5 items, per the design
brief). Settings, Energy Management, Alerts, and other secondary screens live under
`(tabs)/more/*`, hidden from the tab bar (`href: null`) and reached via the profile
icon / notification bell on Home.

## Status

Built in phases (see project chat history). Done: Splash, Login, Farm Setup, tab shell,
Home dashboard, Crops (list + detail, circular health rings), Water Management (merged
with manual irrigation start/stop), Weather Forecast, Insights (rules engine + priority
badges + crop guide), Alerts, and Settings (incl. the remote backend-URL override) — all
wired to the real backend. Reports, User Management, Data Export, and full language
switching remain "coming soon" placeholders.

## Architecture

- `src/services/api.ts` — the only place that talks to the backend.
- `src/store/*` — Zustand stores (auth, farm profile, live dashboard data), persisted to
  AsyncStorage so the app can show last-known data offline.
- `src/services/recommendationEngine.ts` — rules-based irrigation advice, not an LLM;
  reuses the backend's live VWC thresholds (`systemInfo`) so advice matches sensor state.
- `src/data/crops.ts` — per-crop moisture/temperature thresholds.
- `src/constants/theme.ts` — design tokens (plain `StyleSheet`, no NativeWind — see
  chat history for why). Font is Plus Jakarta Sans via `@expo-google-fonts`.
- `src/components/dashboard/CropCard.tsx` — beds are presented as crop cards; the
  "health %" ring is a derived value (VWC vs. the crop's optimal range via
  `systemInfo`), not fabricated per-crop metadata.
