import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic

load_dotenv()

app = FastAPI(title="Smart Irrigation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

anthropic_client = anthropic.Anthropic()


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
        "beds": [
            {
                "id": 1, "name": "Bed 1", "vwc": 18, "state": "critical",
                "lastIrrigation": "Today, 08:15 AM", "durationMin": 45, "waterUsedL": 2450,
                "soilTempC": 21.4, "trendVwc": [32, 30, 27, 25, 23, 21, 20, 19, 18],
            },
            {
                "id": 2, "name": "Bed 2", "vwc": 32, "state": "needs-water",
                "lastIrrigation": "Yesterday, 06:40 PM", "durationMin": 35, "waterUsedL": 1980,
                "soilTempC": 21.8, "trendVwc": [42, 40, 38, 37, 35, 34, 33, 33, 32],
            },
            {
                "id": 3, "name": "Bed 3", "vwc": 58, "state": "optimal",
                "lastIrrigation": "Today, 07:50 AM", "durationMin": 40, "waterUsedL": 2150,
                "soilTempC": 20.9, "trendVwc": [50, 53, 55, 52, 56, 59, 57, 60, 58],
            },
        ],
        "bedActivity": [
            {"id": 1, "time": "09:31 AM", "title": "Bed monitoring data updated", "subtitle": "All bed sensors synchronized", "color": "brand"},
            {"id": 2, "time": "08:45 AM", "title": "Irrigation cycle completed", "subtitle": "Bed 2 — 15 minutes", "color": "blue"},
            {"id": 3, "time": "07:30 AM", "title": "Bed 1 moisture dropped below threshold", "subtitle": "18% detected (threshold: 25%)", "color": "red"},
            {"id": 4, "time": "06:00 AM", "title": "Sensors synchronized", "subtitle": "All systems operational", "color": "blue"},
            {"id": 5, "time": "05:15 AM", "title": "Weather forecast updated", "subtitle": "Rain expected tomorrow", "color": "blue"},
        ],
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
    }


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


@app.post("/api/assistant/chat")
def assistant_chat(req: ChatRequest):
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY is not set on the server. Copy backend/.env.example to backend/.env and add your key.",
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

    try:
        response = anthropic_client.messages.create(
            model="claude-opus-5",
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": m.role, "content": m.content} for m in req.messages],
        )
    except anthropic.AuthenticationError:
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY is missing or invalid on the server (set it in backend/.env).",
        )
    except anthropic.RateLimitError:
        raise HTTPException(status_code=429, detail="Rate limited — please try again in a moment.")
    except anthropic.APIConnectionError:
        raise HTTPException(status_code=502, detail="Could not reach the Claude API. Check your internet connection.")
    except anthropic.APIStatusError as e:
        raise HTTPException(status_code=502, detail=f"Assistant request failed: {e.message}")

    if response.stop_reason == "refusal":
        return {"reply": "I'm not able to help with that request."}

    text = "".join(block.text for block in response.content if block.type == "text")
    return {"reply": text}