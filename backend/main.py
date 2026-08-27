import base64
import json
import os
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import errors as genai_errors
from twilio.rest import Client as TwilioClient
from twilio.base.exceptions import TwilioRestException

load_dotenv()

app = FastAPI(title="Smart Irrigation API")

# Wildcarded deliberately: this is a no-auth/no-cookie demo API (no credentials
# to leak), and it's now read from the web dashboard, the mobile app's web
# build, and native fetch — plus whatever LAN IP / ngrok tunnel URL the mobile
# app is pointed at that day, which can't be enumerated in advance.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def send_whatsapp_alert(message: str) -> None:
    """Best-effort WhatsApp notification via Twilio; never raises into the caller.

    Alerts are a nice-to-have on top of the dashboard, not the source of truth —
    a Twilio hiccup shouldn't fail the irrigation action that triggered it.
    """
    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    from_number = os.environ.get("TWILIO_WHATSAPP_FROM")
    to_number = os.environ.get("TWILIO_WHATSAPP_TO")

    if not all([sid, token, from_number, to_number]):
        return

    try:
        TwilioClient(sid, token).messages.create(
            from_=f"whatsapp:{from_number}",
            to=f"whatsapp:{to_number}",
            body=message,
        )
    except TwilioRestException as e:
        print(f"WhatsApp alert failed: {e}")

# In-memory state for the demo (no database yet — resets on server restart).
# Mutated by /api/irrigation/trigger so a manual trigger from the dashboard
# is actually reflected the next time the frontend polls /api/dashboard.
# Per-crop soil-moisture (VWC %) targets. These override the system-wide
# defaults per bed. Leafy brassicas (covo, tsunga) are shallow-rooted and need
# consistently moist soil, so they carry a higher trigger point and a higher
# optimal band; tomato is deeper-rooted and more drought-tolerant and is run
# slightly drier (a mild dry-down improves fruit set and reduces splitting).
CROP_TARGETS = {
    "Covo":   {"vwcTrigger": 32, "vwcOptimalMin": 48, "vwcOptimalMax": 68},
    "Tsunga": {"vwcTrigger": 30, "vwcOptimalMin": 45, "vwcOptimalMax": 65},
    "Tomato": {"vwcTrigger": 22, "vwcOptimalMin": 34, "vwcOptimalMax": 52},
}

BEDS = [
    {
        "id": 1, "name": "Bed 1", "crop": "Covo", "vwc": 18, "state": "critical",
        **CROP_TARGETS["Covo"],
        "lastIrrigation": "Today, 08:15 AM", "durationMin": 45, "waterUsedL": 2450,
        "soilTempC": 21.4, "trendVwc": [32, 30, 27, 25, 23, 21, 20, 19, 18],
        "airTempC": 27.0, "humidityPct": 58,
        "pumpStatus": "OFF", "valveStatus": "CLOSED", "irrigating": False,
    },
    {
        "id": 2, "name": "Bed 2", "crop": "Tsunga", "vwc": 38, "state": "needs-water",
        **CROP_TARGETS["Tsunga"],
        "lastIrrigation": "Yesterday, 06:40 PM", "durationMin": 35, "waterUsedL": 1980,
        "soilTempC": 21.8, "trendVwc": [48, 46, 44, 43, 42, 41, 40, 39, 38],
        "airTempC": 26.5, "humidityPct": 61,
        "pumpStatus": "OFF", "valveStatus": "CLOSED", "irrigating": False,
    },
    {
        "id": 3, "name": "Bed 3", "crop": "Tomato", "vwc": 44, "state": "optimal",
        **CROP_TARGETS["Tomato"],
        "lastIrrigation": "Today, 07:50 AM", "durationMin": 40, "waterUsedL": 2150,
        "soilTempC": 20.9, "trendVwc": [40, 42, 45, 43, 46, 45, 44, 45, 44],
        "airTempC": 27.4, "humidityPct": 64,
        "pumpStatus": "OFF", "valveStatus": "CLOSED", "irrigating": False,
    },
]


def bed_state(bed):
    """Re-derive a bed's status from its own per-crop VWC thresholds."""
    vwc = bed["vwc"]
    if vwc < bed.get("vwcTrigger", 25):
        return "critical"
    if vwc < bed.get("vwcOptimalMin", 40):
        return "needs-water"
    return "optimal"

BED_ACTIVITY = [
    {"id": 1, "time": "09:31 AM", "title": "Bed monitoring data updated", "subtitle": "All bed sensors synchronized", "color": "brand"},
    {"id": 2, "time": "08:45 AM", "title": "Irrigation cycle completed", "subtitle": "Bed 2 — 15 minutes", "color": "blue"},
    {"id": 3, "time": "07:30 AM", "title": "Bed 1 moisture dropped below threshold", "subtitle": "18% detected (threshold: 25%)", "color": "red"},
    {"id": 4, "time": "06:00 AM", "title": "Sensors synchronized", "subtitle": "All systems operational", "color": "blue"},
    {"id": 5, "time": "05:15 AM", "title": "Weather forecast updated", "subtitle": "Rain expected tomorrow", "color": "blue"},
]

_next_activity_id = max(a["id"] for a in BED_ACTIVITY) + 1


@app.get("/")
def root():
    return {"status": "Smart Irrigation API is running"}


@app.get("/api/dashboard")
def get_dashboard():
    return {
        "systemStatus": {
            "mode": "AUTOMATIC",
            "status": "OPTIMAL",
            "lastUpdated": "10:30:25 AM",
        },
        "beds": BEDS,
        "bedActivity": BED_ACTIVITY,
        "irrigationOverview": {
            "todayWaterUseL": 6580,
            "todayWaterUseDeltaPct": -12.4,
            "irrigationEventsCount": 9,
            "irrigationEventsDeltaPct": 10,
            "totalIrrigationTimeLabel": "6h 15m",
            "totalIrrigationTimeDeltaPct": -8.6,
            "efficiencyScorePct": 92,
            "efficiencyScoreDeltaPct": 5,
            "waterUseSeries": {
                "hours": ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"],
                "today": [200, 900, 2400, 1600, 2800, 1400, 300],
                "yesterday": [150, 700, 2100, 1800, 2200, 1200, 250],
            },
        },
        "kpis": {
            "soilMoistureAvg": 36,
            "irrigationStatus": "Running",
            "nextCycle": "02:15:30",
            "cycleProgressPct": 62,
            "energySource": "Solar",
            "batteryPct": 85,
            "waterUsedTodayL": 12450,
            "waterTargetPct": 85,
        },
        "extendedStats": {
            "cropHealthScorePct": 92,
            "cropHealthLabel": "Healthy",
            "totalWaterSavedL": 3240,
            "totalWaterSavedPeriod": "This Month",
            "energyGeneratedKwhToday": 18.7,
            "systemEfficiencyPct": 94,
            "systemEfficiencyLabel": "Excellent",
        },
        "farmerAdvisory": {
            "headline": "Skip manual watering for Beds 2 & 3 today",
            "message": "Rain is forecast for Saturday and crop health remains strong at 92%. Bed 1 is the only zone that needs attention right now — the system will irrigate it automatically once the gantry reaches it.",
            "confidencePct": 88,
        },
        "sparkline": {
            "moisture": [48, 50, 47, 52, 54, 51, 53, 36],
            "irrigation": [40, 44, 42, 48, 50, 47, 49, 52],
            "energy": [70, 75, 72, 80, 85, 82, 88, 85],
            "energyGeneratedKwh": [14.2, 15.8, 13.9, 16.9, 17.4, 15.6, 19.2, 18.7],
            "water": [9000, 9500, 10200, 11000, 10800, 11500, 12100, 12450],
        },
        "alerts": [
            {"id": 1, "level": "critical", "text": "Soil moisture critical in Bed 1", "time": "10:15 AM", "category": "Bed Monitoring"},
            {"id": 2, "level": "success", "text": "Irrigation cycle completed", "time": "08:45 AM", "category": "Irrigation Control"},
            {"id": 3, "level": "info", "text": "Weather update available", "time": "Yesterday 07:30 PM", "category": "Weather Forecast"},
        ],
        "energyHistory": {
            "today": [
                {"time": "06:00", "source": "solar"},
                {"time": "10:00", "source": "solar"},
                {"time": "14:00", "source": "battery"},
                {"time": "18:00", "source": "grid"},
                {"time": "22:00", "source": "battery"},
            ],
            "hourly": [
                {"hour": f"{h:02d}:00", "source": s}
                for h, s in enumerate(
                    ["battery"] * 6 + ["solar"] * 8 + ["battery"] * 4 + ["grid"] * 4 + ["battery"] * 2
                )
            ],
        },
        "energyOverview": {
            "activeSource": {"label": "Solar", "status": "Stable"},
            "battery": {"pct": 85, "voltage": 51.2, "currentA": 12.4, "tempC": 29},
            "solarPanel": {"ratedW": 60, "voltage": 72.3, "currentA": 0.83, "efficiencyPct": 92},
            "powerConsumption": {
                "totalKwhToday": 3.24,
                "totalDeltaPct": -8.6,
                "peakKw": 0.92,
                "avgKw": 0.27,
                "series": {
                    "hours": ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"],
                    "today": [0.30, 0.50, 0.90, 0.70, 1.10, 0.60, 0.30],
                    "yesterday": [0.25, 0.45, 0.80, 0.75, 1.00, 0.55, 0.28],
                },
            },
            "stats": [
                {"label": "Solar Energy Generated", "value": "4.12 kWh", "deltaPct": 12.3, "goodDirection": "up"},
                {"label": "Grid Energy Used", "value": "0.48 kWh", "deltaPct": 5.2, "goodDirection": "down"},
                {"label": "Battery Discharge", "value": "1.35 kWh", "deltaPct": -9.1, "goodDirection": "down"},
                {"label": "Battery Charge", "value": "2.63 kWh", "deltaPct": 10.7, "goodDirection": "up"},
                {"label": "Self Consumption", "value": "78%", "deltaPct": 4, "goodDirection": "up"},
                {"label": "CO2 Avoided", "value": "2.14 kg", "deltaPct": 11.2, "goodDirection": "up"},
            ],
        },
        "seasonSummary": {
            "waterUsedM3": 12450,
            "waterUsedDeltaPct": -8.4,
            "energyUsedKwh": 3245,
            "energyUsedDeltaPct": -12.1,
            "irrigationEvents": 48,
            "irrigationEventsDeltaPct": -5.9,
            "estYieldTha": 2.85,
            "estYieldDeltaPct": 6.3,
            "yieldTargetPct": 85,
            "yieldTargetDeltaPct": 5,
        },
        "dataReports": {
            "dateRangeLabel": "01 Apr – 01 May 2026",
            "waterUsageSeries": {
                "labels": ["1 Apr", "8 Apr", "15 Apr", "22 Apr", "29 Apr", "1 May"],
                "thisSeason": [280, 340, 300, 380, 340, 420],
                "lastSeason": [260, 300, 320, 350, 310, 380],
            },
            "energyUsageSeries": {
                "labels": ["1 Apr", "8 Apr", "15 Apr", "22 Apr", "29 Apr", "1 May"],
                "thisSeason": [180, 210, 190, 230, 205, 250],
                "lastSeason": [170, 195, 205, 215, 200, 235],
            },
            "irrigationEventsBreakdown": [
                {"label": "Completed", "count": 39, "pct": 81, "color": "brand"},
                {"label": "Partial", "count": 6, "pct": 13, "color": "amber"},
                {"label": "Cancelled", "count": 1, "pct": 2, "color": "red"},
                {"label": "Skipped", "count": 2, "pct": 4, "color": "gray"},
            ],
            "waterUseByZone": [
                {"zone": "Zone A", "m3": 3250},
                {"zone": "Zone B", "m3": 2980},
                {"zone": "Zone C", "m3": 2450},
            ],
            "topInsights": [
                {
                    "icon": "droplet",
                    "headline": "Water usage is 8.4% lower than last season",
                    "subtext": "Great job! You're conserving more water.",
                },
                {
                    "icon": "zap",
                    "headline": "Energy efficiency improved by 12.1%",
                    "subtext": "Solar usage covered 72% of total energy.",
                },
                {
                    "icon": "leaf",
                    "headline": "Estimated yield is on track",
                    "subtext": "You are 15% above the seasonal target.",
                },
            ],
            "reports": {
                "irrigation": {
                    "title": "Irrigation Report",
                    "subtitle": "Water usage and events",
                    "summary": "48 irrigation events this season across 3 beds, using 12,450 m³ of water — 8.4% less than last season.",
                    "rows": [
                        {"label": "Total Events", "value": "48"},
                        {"label": "Completed", "value": "39 (81%)"},
                        {"label": "Avg Duration", "value": "38 min"},
                        {"label": "Water per Event", "value": "260 L avg"},
                    ],
                },
                "energy": {
                    "title": "Energy Report",
                    "subtitle": "Energy consumption",
                    "summary": "3,245 kWh consumed this season, 72% from solar — a 12.1% efficiency improvement over last season.",
                    "rows": [
                        {"label": "Total Consumption", "value": "3,245 kWh"},
                        {"label": "Solar Share", "value": "72%"},
                        {"label": "Grid Share", "value": "9%"},
                        {"label": "Battery Share", "value": "19%"},
                    ],
                },
                "yield": {
                    "title": "Yield Report",
                    "subtitle": "Crop yield analysis",
                    "summary": "Estimated yield of 2.85 t/ha, 15% above the seasonal target of 2.48 t/ha.",
                    "rows": [
                        {"label": "Estimated Yield", "value": "2.85 t/ha"},
                        {"label": "Seasonal Target", "value": "2.48 t/ha"},
                        {"label": "vs Target", "value": "+15%"},
                        {"label": "Crop", "value": "Rape / Covo"},
                    ],
                },
                "environmental": {
                    "title": "Environmental Report",
                    "subtitle": "CO₂ savings & impact",
                    "summary": "1.24 t of CO₂ emissions avoided this season, equivalent to planting 56 trees.",
                    "rows": [
                        {"label": "CO2 Avoided", "value": "1.24 t"},
                        {"label": "Tree Equivalent", "value": "56 trees"},
                        {"label": "Grid Displacement", "value": "72%"},
                        {"label": "Source", "value": "Solar + Battery"},
                    ],
                },
            },
        },
        "systemInfo": {
            "mode": "AUTOMATIC",
            "vwcTrigger": 25,
            "vwcOptimalMin": 40,
            "vwcOptimalMax": 60,
            "espNodes": 2,
            "firmwareVersion": "v0.3.0-demo",
            "backendVersion": "v0.1.0",
        },
        # Fields consumed only by the Goho Rakangwara mobile app (Water/Energy
        # Management screens) — additive, the web dashboard doesn't read these.
        "mobileExtras": {
            "tankLevelPct": 71,
            "weeklyUsageL": 18600,
            "dailyUsageSeriesL": [2400, 2900, 2600, 3100, 2800, 2100, 1900],
            "dailyUsageLabels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            "gridAvailable": True,
            "estimatedWaterSavingPct": 27,
        },
    }


@app.post("/api/irrigation/trigger/{bed_id}")
def trigger_irrigation(bed_id: int):
    """Manually trigger irrigation for one bed (demo simulation, no real hardware yet).

    Raises soil moisture into the optimal band, marks the bed optimal, and logs
    the action to bedActivity so it shows up in Recent Activity / Bed Monitoring
    on the next dashboard poll.
    """
    global _next_activity_id

    bed = next((b for b in BEDS if b["id"] == bed_id), None)
    if bed is None:
        raise HTTPException(status_code=404, detail=f"No bed with id {bed_id}")

    previous_vwc = bed["vwc"]
    bed["vwc"] = min(100, bed["vwc"] + 22)
    bed["state"] = bed_state(bed)
    bed["lastIrrigation"] = "Just now"
    bed["durationMin"] = 0
    bed["trendVwc"] = (bed.get("trendVwc", []) + [bed["vwc"]])[-9:]

    BED_ACTIVITY.insert(0, {
        "id": _next_activity_id,
        "time": datetime.now().strftime("%I:%M %p").lstrip("0"),
        "title": f"Manual irrigation triggered — {bed['name']}",
        "subtitle": f"Soil moisture raised from {previous_vwc}% to {bed['vwc']}%",
        "color": "brand",
    })
    _next_activity_id += 1

    send_whatsapp_alert(
        f"💧 Irrigation triggered for {bed['name']}: soil moisture raised from "
        f"{previous_vwc}% to {bed['vwc']}% ({bed['state']})."
    )

    return {"bed": bed}


class StartIrrigationRequest(BaseModel):
    durationMin: int = 30


@app.post("/api/irrigation/start/{bed_id}")
def start_irrigation(bed_id: int, req: StartIrrigationRequest):
    """Open the mobile app's manual-control valve/pump for one bed (demo simulation).

    Pairs with /api/irrigation/stop/{bed_id}, which is what actually raises the
    bed's moisture — this endpoint just flips pump/valve state so the Irrigation
    Control screen has something live to show while a cycle is "running".
    """
    global _next_activity_id

    bed = next((b for b in BEDS if b["id"] == bed_id), None)
    if bed is None:
        raise HTTPException(status_code=404, detail=f"No bed with id {bed_id}")
    if bed["irrigating"]:
        raise HTTPException(status_code=409, detail=f"{bed['name']} is already irrigating")

    bed["pumpStatus"] = "ON"
    bed["valveStatus"] = "OPEN"
    bed["irrigating"] = True
    bed["durationMin"] = max(1, req.durationMin)

    BED_ACTIVITY.insert(0, {
        "id": _next_activity_id,
        "time": datetime.now().strftime("%I:%M %p").lstrip("0"),
        "title": f"Irrigation started — {bed['name']}",
        "subtitle": f"Manual cycle, {bed['durationMin']} min",
        "color": "blue",
    })
    _next_activity_id += 1

    return {"bed": bed}


@app.post("/api/irrigation/stop/{bed_id}")
def stop_irrigation(bed_id: int):
    """Close the valve/pump and, if a cycle was actually running, apply the same
    moisture bump used by the quick 'trigger' action so both control paths agree.
    """
    global _next_activity_id

    bed = next((b for b in BEDS if b["id"] == bed_id), None)
    if bed is None:
        raise HTTPException(status_code=404, detail=f"No bed with id {bed_id}")

    was_irrigating = bed["irrigating"]
    previous_vwc = bed["vwc"]

    if was_irrigating:
        bed["vwc"] = min(100, bed["vwc"] + 22)
        bed["state"] = bed_state(bed)
        bed["lastIrrigation"] = "Just now"
        bed["trendVwc"] = (bed.get("trendVwc", []) + [bed["vwc"]])[-9:]
        bed["waterUsedL"] += bed["durationMin"] * 35

    bed["pumpStatus"] = "OFF"
    bed["valveStatus"] = "CLOSED"
    bed["irrigating"] = False

    if was_irrigating:
        BED_ACTIVITY.insert(0, {
            "id": _next_activity_id,
            "time": datetime.now().strftime("%I:%M %p").lstrip("0"),
            "title": f"Irrigation complete — {bed['name']}",
            "subtitle": f"Soil moisture raised from {previous_vwc}% to {bed['vwc']}%",
            "color": "brand",
        })
        _next_activity_id += 1

        send_whatsapp_alert(
            f"💧 Irrigation complete for {bed['name']}: soil moisture raised from "
            f"{previous_vwc}% to {bed['vwc']}% ({bed['state']})."
        )

    return {"bed": bed}


@app.post("/api/alerts/test-whatsapp")
def test_whatsapp_alert():
    """Send a one-off WhatsApp message to confirm Twilio credentials are wired up."""
    if not all(
        os.environ.get(v)
        for v in ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM", "TWILIO_WHATSAPP_TO"]
    ):
        raise HTTPException(
            status_code=500,
            detail="Twilio WhatsApp isn't configured yet — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, "
            "TWILIO_WHATSAPP_FROM and TWILIO_WHATSAPP_TO in backend/.env.",
        )

    sid = os.environ["TWILIO_ACCOUNT_SID"]
    token = os.environ["TWILIO_AUTH_TOKEN"]
    from_number = os.environ["TWILIO_WHATSAPP_FROM"]
    to_number = os.environ["TWILIO_WHATSAPP_TO"]

    try:
        TwilioClient(sid, token).messages.create(
            from_=f"whatsapp:{from_number}",
            to=f"whatsapp:{to_number}",
            body="✅ Smart Irrigation Dashboard: WhatsApp alerts are set up correctly.",
        )
    except TwilioRestException as e:
        raise HTTPException(status_code=502, detail=f"Twilio request failed: {e}")

    return {"status": "sent"}


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


@app.post("/api/assistant/chat")
def assistant_chat(req: ChatRequest):
    if not os.environ.get("GEMINI_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not set on the server. Copy backend/.env.example to backend/.env and add your key.",
        )

    dashboard = get_dashboard()
    beds_summary = "; ".join(
        f"{b['name']}: {b['vwc']}% VWC ({b['state']})" for b in dashboard["beds"]
    )
    system_prompt = (
        "You are the AI assistant built into the Goho Rakangwara smart irrigation dashboard, "
        "a solar-powered, sensor-driven irrigation system for a small farm. The farmer using "
        "this app is named Bhamu. Answer questions about irrigation, crop health, energy, and "
        "the farm's current status. Keep answers short, clear, and farmer-friendly — a sentence "
        "or two unless more detail is genuinely needed. Use the live system snapshot below when "
        "relevant; don't invent numbers that aren't given.\n\n"
        f"Current system status: mode {dashboard['systemStatus']['mode']}, "
        f"overall status {dashboard['systemStatus']['status']}.\n"
        f"Beds: {beds_summary}.\n"
        f"Soil moisture average: {dashboard['kpis']['soilMoistureAvg']}%. "
        f"Irrigation status: {dashboard['kpis']['irrigationStatus']}. "
        f"Energy source: {dashboard['kpis']['energySource']} (battery {dashboard['kpis']['batteryPct']}%). "
        f"Water used today: {dashboard['kpis']['waterUsedTodayL']} L."
    )

    genai_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    contents = [
        {"role": "model" if m.role == "assistant" else "user", "parts": [{"text": m.content}]}
        for m in req.messages
    ]

    try:
        response = genai_client.models.generate_content(
            model="gemini-3.6-flash",
            contents=contents,
            config=genai.types.GenerateContentConfig(system_instruction=system_prompt),
        )
    except genai_errors.ClientError as e:
        if e.code in (401, 403):
            raise HTTPException(
                status_code=500,
                detail="GEMINI_API_KEY is missing or invalid on the server (set it in backend/.env).",
            )
        if e.code == 429:
            raise HTTPException(status_code=429, detail="Rate limited — please try again in a moment.")
        raise HTTPException(status_code=502, detail=f"Assistant request failed: {e.message}")
    except genai_errors.ServerError as e:
        raise HTTPException(status_code=502, detail=f"Assistant request failed: {e.message}")

    return {"reply": response.text or ""}


class CropHealthRequest(BaseModel):
    imageBase64: str
    mimeType: str = "image/jpeg"
    cropName: str | None = None


@app.post("/api/crop-health/diagnose")
def diagnose_crop_health(req: CropHealthRequest):
    """Real vision-model plant diagnosis: farmer photographs a plant, Gemini identifies
    disease/pest/deficiency signs and returns a structured, farmer-actionable diagnosis.

    Shared by both clients (mobile app and web dashboard's Crop Health page) so there is
    exactly one diagnosis pipeline/prompt to maintain.
    """
    if not os.environ.get("GEMINI_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not set on the server. Copy backend/.env.example to backend/.env and add your key.",
        )

    try:
        base64.b64decode(req.imageBase64, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="imageBase64 is not valid base64 image data.")

    crop_hint = f" The farmer says this is a {req.cropName} plant." if req.cropName else ""
    system_prompt = (
        "You are a plant pathologist assisting smallholder farmers in Zimbabwe. A farmer has "
        "photographed a plant (leaf, stem, or whole plant) with their phone and wants to know if "
        "it's healthy, and if not, what's wrong and what to do about it." + crop_hint + " "
        "Look carefully at the image and respond with ONLY a JSON object (no markdown, no code "
        "fences) matching exactly this shape:\n"
        '{"plantIdentified": string, "healthStatus": "healthy" | "diseased" | "pest" | '
        '"nutrient_deficiency" | "unclear", "condition": string, "confidencePct": number, '
        '"severity": "none" | "low" | "moderate" | "high", "description": string, '
        '"treatment": string, "preventionTips": string}\n\n'
        "plantIdentified: your best guess at the plant/crop shown. condition: the specific "
        'disease/pest/deficiency name, or "Healthy" if nothing is wrong. description: 1-2 plain '
        "sentences on what you actually observe in the image (spots, discoloration, wilting, "
        "insects, etc.) and why it points to that condition. treatment: concrete, actionable steps "
        "a smallholder farmer can take, favoring low-cost/organic options where reasonable. "
        "preventionTips: 1 sentence on avoiding this going forward. If the image doesn't clearly "
        'show a plant, set healthStatus to "unclear" and explain why in description.'
    )

    genai_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    contents = [
        {
            "role": "user",
            "parts": [
                {"inline_data": {"mime_type": req.mimeType, "data": req.imageBase64}},
                {"text": "Diagnose this plant."},
            ],
        }
    ]

    try:
        response = genai_client.models.generate_content(
            model="gemini-3.6-flash",
            contents=contents,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
            ),
        )
    except genai_errors.ClientError as e:
        if e.code in (401, 403):
            raise HTTPException(
                status_code=500,
                detail="GEMINI_API_KEY is missing or invalid on the server (set it in backend/.env).",
            )
        if e.code == 429:
            raise HTTPException(status_code=429, detail="Rate limited — please try again in a moment.")
        raise HTTPException(status_code=502, detail=f"Diagnosis request failed: {e.message}")
    except genai_errors.ServerError as e:
        raise HTTPException(status_code=502, detail=f"Diagnosis request failed: {e.message}")

    try:
        diagnosis = json.loads(response.text or "{}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="The AI response could not be parsed. Please try again.")

    return {"diagnosis": diagnosis}