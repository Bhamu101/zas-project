# Running the system — step by step

How to start Agri-Intelligence on a laptop and get live readings onto the dashboard.

Companion to [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) (what exists and how it fits together) and
[`PROJECT-OBJECTIVES.md`](PROJECT-OBJECTIVES.md) (scope). This file is the "how do I actually run
it" doc.

Verified on Windows 11 with Python 3.14 and Node 24 on 2026-10-05.

---

## The one thing that decides whether readings appear

**Every `/api/*` route requires a signed-in Supabase user.** There is no anonymous mode. If you are
not signed in, the dashboard gets `401 Missing bearer token` on every poll and shows no readings at
all — not stale ones, not zeros, nothing.

So "readings show on the dashboard" needs all three of these true at once:

| # | Condition | How you know it is true |
|---|-----------|-------------------------|
| 1 | Backend is running | `http://localhost:8021/` returns `{"status":"Smart Irrigation API is running"}` |
| 2 | Dashboard points at that backend | `VITE_API_URL` in `irrigation-dashboard/.env` matches where the backend is |
| 3 | **You are signed in** | You got past the login screen instead of sitting on it |

Step 5 is the one people skip. If the pages are empty, check it first.

You do **not** need the ESP32 hardware for readings to appear — see
[Where the readings come from](#where-the-readings-come-from).

---

## Before you start

| Need | Version | Check with |
|------|---------|-----------|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| A Supabase account | — | you need one user to sign in as |

Two terminals, both opened at the project root (`AGRI-INTELLIGENCE`). The backend and the dashboard
each hold a terminal while they run — neither returns to a prompt.

---

## Step 1 — Configure the backend

The backend reads its secrets from `backend/.env`, which is git-ignored and never committed.

```powershell
copy backend\.env.example backend\.env
```

Open `backend/.env` and set, at minimum:

```ini
# Required. Without this every authenticated request fails.
SUPABASE_URL=https://your-project-ref.supabase.co

# Required for the AI assistant and crop-health diagnosis.
GEMINI_API_KEY=AIza...
```

Everything else is optional and the system degrades cleanly without it:

- no `TWILIO_*` → WhatsApp alerts are silently skipped, nothing else changes
- no `ESP32_BASE_URL` → Bed 1 stays simulated like Beds 2 and 3
- no `CAMERA_SHARED_SECRET` / `SUPABASE_SERVICE_ROLE_KEY` → the bed camera returns 503, rest is fine

> If `backend/.env` already exists on this machine, it is already filled in — skip to step 2.

---

## Step 2 — Start the backend

```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8021
```

A `venv/` with the dependencies is already present. If it is missing or broken:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

**Verify it before moving on.** In a third terminal:

```powershell
curl http://localhost:8021/
```

Expected:

```json
{"status":"Smart Irrigation API is running"}
```

Now confirm auth is switched on — this should **fail**, and that is correct:

```powershell
curl http://localhost:8021/api/dashboard
```

Expected:

```json
{"detail":"Missing bearer token"}
```

A `401` here means the backend is healthy and protecting its routes. Leave this terminal running.

---

## Step 3 — Configure the dashboard

```powershell
copy irrigation-dashboard\.env.example irrigation-dashboard\.env
```

Set all three values in `irrigation-dashboard/.env`:

```ini
VITE_API_URL=http://localhost:8021
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Two rules that cause most of the confusion here:

- `VITE_SUPABASE_URL` **must be the same project** as the backend's `SUPABASE_URL`. The dashboard
  mints the token and the backend verifies it against that project's public keys. Point them at
  different projects and every request is a 401 with a correct-looking login.
- Use the **publishable** key, never the `service_role` key. Vite inlines `VITE_*` variables into
  the built JavaScript, so anything here ships to every visitor.

Vite only reads `.env` at startup. If you edit it, restart the dev server.

---

## Step 4 — Start the dashboard

```powershell
cd irrigation-dashboard
npm install        # first run only
npm run dev
```

Vite prints a Local and a Network URL. Open the Local one, normally:

```
http://localhost:5173
```

The config sets `host: true`, so the Network URL also works from a phone on the same WiFi — useful
for testing the mobile app against the same backend.

---

## Step 5 — Sign in (this is what makes readings appear)

You land on the login screen. Nothing behind it loads until you have a session.

**If you already have an account**, enter the email and password and sign in.

**If you do not**, switch the form to sign-up and create one. If the Supabase project has email
confirmation enabled you will see:

> Account created. Check your email for a confirmation link, then sign in.

Follow the link in the email, come back, and sign in. Until you do, the account exists but has no
session and the dashboard will keep showing the login screen.

To skip email confirmation for demo accounts, turn it off in the Supabase dashboard under
**Authentication → Sign In / Providers → Email → Confirm email**, or create the user directly under
**Authentication → Users** with "Auto Confirm User" ticked.

---

## Step 6 — Confirm readings are live

Once signed in, the Dashboard home page should show:

- three bed cards with soil-moisture percentages and a status of critical / needs-water / optimal
- KPI tiles: soil moisture average, irrigation status, energy source, water used today
- a Recent Activity list

The numbers refresh on their own. The dashboard polls every **15 seconds**, speeding up to every
**3 seconds** while any bed is irrigating.

Quick proof the whole chain is live, end to end: go to **Irrigation Control** and start a cycle on
any bed. Within a few seconds the bed's moisture rises, its status changes, and a new Recent
Activity entry appears. That round trip only completes if the browser, your session, the backend
and its in-memory state are all talking.

---

## Where the readings come from

This is the part worth understanding before a demo.

**Beds 2 and 3 are always simulated.** Their values live in memory in `backend/main.py` and move
only when something acts on them.

**Bed 1 depends on whether the ESP32 is wired in:**

| `ESP32_BASE_URL` | What Bed 1 shows |
|---|---|
| unset (default) | simulated, exactly like Beds 2 and 3 |
| set, node unreachable | last known values, probe flagged offline |
| set, node running the **manual** sketch | real pump/valve state; moisture still simulated |
| set, node running the **auto** sketch | real soil-moisture readings from the probe |

So the dashboard shows believable readings with no hardware at all. That is the normal demo mode,
and nothing on screen is marked "simulated" — which is deliberate, but worth knowing when someone
asks whether the numbers are real.

**All backend state is in memory and resets when you restart the server.** Any irrigation you
triggered, any moisture change, any activity entry — gone on restart, back to the starting values.
System Settings are the exception: they persist to `backend/system_settings.json`.

---

## Optional — real readings from Bed 1's ESP32

Only if the hardware is built and flashed.

1. Flash `firmware/sensor-node/bed1-irrigation/` (the production sketch — reads the probe and waters
   automatically). It needs a `secrets.h` next to the `.ino`; copy `secrets.h.example` and fill in
   your WiFi and shared secret.
2. Read the node's IP from the Arduino Serial Monitor at boot.
3. In `backend/.env`:

   ```ini
   ESP32_BASE_URL=http://192.168.1.42
   ESP32_SHARED_SECRET=<the same SHARED_SECRET as secrets.h>
   ```

   The secret must match exactly, or the node rejects every request.
4. Restart the backend.

`http://irrigation.local` works instead of the IP only where mDNS resolves, which is unreliable on
Windows and across WiFi subnets. Prefer the IP address.

> **If the node is not actually on the network, unset `ESP32_BASE_URL`.** The backend probes it on
> dashboard polls with a 2.5-second timeout, so leaving it pointed at an absent node makes the
> dashboard noticeably slower for no benefit.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Stuck on the login screen after correct details | Email not confirmed | Follow the confirmation link, or auto-confirm the user in Supabase |
| Signed in, but every page is empty | Backend not running, or `VITE_API_URL` wrong | `curl http://localhost:8021/` and compare with `.env` |
| "Your session has expired. Please sign in again." | Backend and dashboard point at **different** Supabase projects | Make `SUPABASE_URL` and `VITE_SUPABASE_URL` the same project |
| "Could not reach the backend at …" | Backend down, or firewall on port 8021 | Restart the backend; check the port |
| CORS error in the browser console | Serving the dashboard from a host not in the allow-list | Add it to `CORS_EXTRA_ORIGINS` in `backend/.env` |
| Dashboard feels slow, several seconds a poll | `ESP32_BASE_URL` set but node unreachable | Unset it, or put the node on the network |
| `Address already in use` on 8021 | A previous backend is still running | Close it, or use `--port 8022` and update `VITE_API_URL` |
| Assistant or Crop Health returns a 500 | `GEMINI_API_KEY` missing or invalid | Set it in `backend/.env` and restart |
| Bed camera returns 503 | Camera storage not configured | Set `SUPABASE_SERVICE_ROLE_KEY` and `CAMERA_SHARED_SECRET`, or ignore if there is no camera |

---

## Quick reference

| | Command | URL |
|---|---|---|
| Backend | `cd backend` then `.\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8021` | http://localhost:8021 |
| Dashboard | `cd irrigation-dashboard` then `npm run dev` | http://localhost:5173 |
| Mobile app | `cd mobile-app` then `npm start` | Expo Go / `--tunnel` |

Stop either server with `Ctrl+C` in its terminal.
