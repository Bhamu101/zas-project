/*
 * ============================================================
 * SMART IRRIGATION — BED 1 AUTOMATIC IRRIGATION BENCH TEST
 *
 * Agri-Intelligence 2026 — Smart Energy-Driven Irrigation for Agricultural
 * Value Chains
 *
 * PURPOSE
 * ------------------------------------------------------------
 * Objective 1 (automatic irrigation via soil-moisture sensors)
 * on the bench: a capacitive soil probe reports VWC % to the
 * ESP32, and when Bed 1 drops below its crop's trigger point
 * the node runs the pump until the bed is back in its optimal
 * band, then stops and lets the water soak in before it will
 * consider triggering again.
 *
 * Built on bed1-mini-pump-test.ino — same pump drive (2N2222
 * direct, no relay), same /irrigate /stop /status /pump
 * endpoints and shared secret, so manual control from the
 * dashboard keeps working alongside the automatic loop.
 *
 * THRESHOLDS
 *   Bed 1 grows Covo. These match CROP_TARGETS["Covo"] in
 *   backend/main.py — keep them in sync:
 *       trigger      32 % VWC   (start watering below this)
 *       optimal min  48 % VWC   (stop watering once reached)
 *
 * SOIL MOISTURE SENSOR:
 *   Capacitive soil moisture sensor v1.2 (3-pin analog)
 *   VCC  -> ESP32 3V3
 *   GND  -> Common GND
 *   AOUT -> ESP32 GPIO34 (ADC1_CH6, input-only)
 *
 *   GPIO34 is on ADC1. ADC2 pins do NOT work while WiFi is
 *   active on the ESP32, so keep the probe on 32/33/34/35/36/39.
 *
 *   A resistive FC-28 / YL-69 module also works on the same
 *   wiring (use its AO pin, power it from 3V3) — just
 *   re-calibrate DRY_RAW / WET_RAW.
 *
 * CALIBRATION:
 *   Raw ADC (12-bit, 0–4095) is mapped linearly to VWC % using
 *   two points you measure yourself:
 *       DRY_RAW = reading with probe in dry air / bone-dry soil
 *       WET_RAW = reading with probe in a cup of water
 *   Read /raw?key=SECRET in each condition and put the numbers
 *   below, or set them at runtime with
 *       /calibrate?dry=3200&wet=1400&key=SECRET
 *   (runtime values are lost on reboot — copy them into the
 *   constants once you are happy).
 *
 * PUMP (unchanged from mini-pump test):
 *   Mini submersible DC pump, 3–6 V
 *   ESP32 GPIO18 -> 220 Ω -> 2N2222 Base
 *   2N2222 Emitter   -> Common GND
 *   2N2222 Collector -> Pump black (-)
 *   Pump red (+)     -> +5 V (NOT the 12 V bus)
 *   1N4007 across pump: band -> +5 V, anode -> pump black
 *   GPIO18 HIGH = pump ON
 *
 * VALVE (only if VALVE_ENABLED = true):
 *   ESP32 GPIO19 -> relay module IN2 (K2, active-LOW)
 *   K2 COM -> fused +12 V, K2 NO -> solenoid +, solenoid - -> GND
 *
 * AUTOMATIC LOOP:
 *   every SENSOR_READ_MS:
 *     read probe (averaged), convert to VWC %
 *     if AUTO enabled
 *        and node is IDLE
 *        and sensor reading is plausible
 *        and soak period since last cycle has elapsed
 *        and vwc < VWC_TRIGGER
 *     then start an AUTO cycle
 *
 *   AUTO cycle runs until vwc >= VWC_OPTIMAL_MIN
 *   or AUTO_MAX_RUN_SEC (safety cap), whichever first.
 *   MANUAL cycle (/irrigate) runs for its requested seconds
 *   exactly as before.
 *
 *   After any cycle ends, SOAK_MS must pass before AUTO may
 *   trigger again — water takes time to reach the probe, and
 *   without this the loop would short-cycle the pump.
 *
 * ENDPOINTS (all need &key=SECRET):
 *   /status              state, remainingSec, vwc, raw, auto…
 *   /irrigate?sec=N      manual cycle (as before)
 *   /stop                stop everything, start soak period
 *   /pump?on=0|1         bench-only direct pump toggle
 *   /auto?on=0|1         enable / disable the automatic loop
 *   /raw                 raw ADC + vwc, for calibration
 *   /calibrate?dry=&wet= set calibration points at runtime
 *
 * ============================================================
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>

// ============================================================
// WIFI
// ============================================================

// WiFi credentials and the backend shared secret live in secrets.h,
// which is gitignored. Copy secrets.h.example to secrets.h and fill it in.
#include "secrets.h"


// ============================================================
// ESP32 PINS
// ============================================================

const int PUMP_CONTROL_PIN  = 18;   // -> 220 Ω -> 2N2222 base
const int VALVE_CONTROL_PIN = 19;   // -> relay module IN2 (K2)
const int SOIL_SENSOR_PIN   = 34;   // ADC1_CH6, input-only


// ============================================================
// VALVE OPTIONS
// ============================================================

const bool VALVE_ENABLED    = false;
const bool VALVE_ACTIVE_LOW = true;


// ============================================================
// CROP THRESHOLDS — Bed 1 = Covo
// Must match CROP_TARGETS["Covo"] in backend/main.py
// ============================================================

const int VWC_TRIGGER     = 32;   // start below this
const int VWC_OPTIMAL_MIN = 48;   // stop once reached


// ============================================================
// SENSOR CALIBRATION (12-bit ADC, 0–4095)
// Typical capacitive v1.2 on 3V3: air ≈ 3200, water ≈ 1400.
// Measure your own with /raw and replace these.
// ============================================================

int dryRaw = 3200;
int wetRaw = 1400;

// Readings outside this window mean the probe is unplugged,
// shorted, or mis-wired — never auto-irrigate on them.
const int RAW_PLAUSIBLE_MIN = 200;
const int RAW_PLAUSIBLE_MAX = 4000;

const int SENSOR_SAMPLES = 16;


// ============================================================
// TIMING / SAFETY
// ============================================================

const unsigned long SENSOR_READ_MS       = 2000;    // probe poll interval

const unsigned long VALVE_OPEN_SETTLE_MS = 1000;
const unsigned long VALVE_CLOSE_DELAY_MS = 1000;

const unsigned long DEFAULT_RUN_SEC      = 10;      // manual /irrigate default
const unsigned long MAX_RUN_SEC          = 120;     // manual /irrigate cap

const unsigned long AUTO_MAX_RUN_SEC     = 60;      // auto cycle safety cap
const unsigned long SOAK_MS              = 90000;   // wait after any cycle

const unsigned long PUMP_TOGGLE_MAX_MS   = 30000;   // /pump?on=1 auto-off


// ============================================================
// WEB SERVER
// ============================================================

WebServer server(80);


// ============================================================
// STATE
// ============================================================

enum IrrigationState
{
  IDLE,
  OPENING,
  RUNNING,
  CLOSING,
  MANUAL_PUMP
};

IrrigationState state = IDLE;

// Which kind of cycle is in progress (only meaningful outside IDLE).
bool cycleIsAuto = false;

bool autoEnabled = true;

unsigned long stateStartMs   = 0;
unsigned long runDurationMs  = 0;   // manual cycles / pump toggle
unsigned long lastCycleEndMs = 0;   // for the soak timer
bool          hasCycled      = false;

// Latest sensor reading
int  soilRaw       = 0;
int  soilVwc       = 0;
bool soilOk        = false;
unsigned long lastSensorReadMs = 0;

const char* stateName(IrrigationState s)
{
  switch (s)
  {
    case IDLE:        return "idle";
    case OPENING:     return "opening";
    case RUNNING:     return "running";
    case CLOSING:     return "closing";
    case MANUAL_PUMP: return "manual_pump";
  }

  return "unknown";
}


// ============================================================
// OUTPUTS
// ============================================================

void setPump(bool on)
{
  digitalWrite(PUMP_CONTROL_PIN, on ? HIGH : LOW);
}

void setValve(bool open)
{
  if (!VALVE_ENABLED)
  {
    return;
  }

  if (VALVE_ACTIVE_LOW)
  {
    digitalWrite(VALVE_CONTROL_PIN, open ? LOW : HIGH);
  }
  else
  {
    digitalWrite(VALVE_CONTROL_PIN, open ? HIGH : LOW);
  }
}


// ============================================================
// SOIL SENSOR
// ============================================================

int readSoilRaw()
{
  long sum = 0;

  for (int i = 0; i < SENSOR_SAMPLES; i++)
  {
    sum += analogRead(SOIL_SENSOR_PIN);
    delay(2);
  }

  return (int)(sum / SENSOR_SAMPLES);
}

int rawToVwc(int raw)
{
  // Capacitive probes read HIGHER when dry, LOWER when wet,
  // so the map is inverted. Guard against a bad calibration
  // where dry == wet.
  if (dryRaw == wetRaw)
  {
    return 0;
  }

  long vwc = (long)(dryRaw - raw) * 100L / (long)(dryRaw - wetRaw);

  if (vwc < 0)   vwc = 0;
  if (vwc > 100) vwc = 100;

  return (int)vwc;
}

void readSoilSensor()
{
  soilRaw = readSoilRaw();
  soilOk  = (soilRaw >= RAW_PLAUSIBLE_MIN && soilRaw <= RAW_PLAUSIBLE_MAX);
  soilVwc = soilOk ? rawToVwc(soilRaw) : 0;

  lastSensorReadMs = millis();

  Serial.print("[soil] raw=");
  Serial.print(soilRaw);
  Serial.print(" vwc=");
  Serial.print(soilVwc);
  Serial.print("%");

  if (!soilOk)
  {
    Serial.print("  SENSOR FAULT");
  }

  Serial.print("  state=");
  Serial.print(stateName(state));

  if (state != IDLE && cycleIsAuto)
  {
    Serial.print(" (auto)");
  }

  Serial.println();
}


// ============================================================
// CYCLE HELPERS
// ============================================================

unsigned long soakRemainingMs()
{
  if (!hasCycled)
  {
    return 0;
  }

  unsigned long since = millis() - lastCycleEndMs;

  return (since >= SOAK_MS) ? 0 : (SOAK_MS - since);
}

void startCycle(bool isAuto, unsigned long durationMs)
{
  cycleIsAuto   = isAuto;
  runDurationMs = durationMs;

  setPump(false);
  setValve(true);

  state        = OPENING;
  stateStartMs = millis();

  Serial.println();
  Serial.println("========================================");
  Serial.print("BED 1 IRRIGATION STARTED — ");
  Serial.println(isAuto ? "AUTO" : "MANUAL");
  Serial.println("========================================");

  if (isAuto)
  {
    Serial.print("vwc ");
    Serial.print(soilVwc);
    Serial.print("% < trigger ");
    Serial.print(VWC_TRIGGER);
    Serial.print("% — run until ");
    Serial.print(VWC_OPTIMAL_MIN);
    Serial.print("% or ");
    Serial.print(AUTO_MAX_RUN_SEC);
    Serial.println(" s");
  }
  else
  {
    Serial.print("Requested duration: ");
    Serial.print(durationMs / 1000UL);
    Serial.println(" s");
  }
}

void endCycle(const char* reason)
{
  setPump(false);
  setValve(false);

  state          = IDLE;
  stateStartMs   = millis();
  runDurationMs  = 0;
  lastCycleEndMs = millis();
  hasCycled      = true;

  Serial.println();
  Serial.print("Cycle ended: ");
  Serial.println(reason);
  Serial.print("Soak period: ");
  Serial.print(SOAK_MS / 1000UL);
  Serial.println(" s before auto may re-trigger.");
  Serial.println();
}


// ============================================================
// AUTHENTICATION
// ============================================================

bool requireAuth()
{
  if (server.hasArg("key") && server.arg("key") == SHARED_SECRET)
  {
    return true;
  }

  server.send(
    403,
    "application/json",
    "{\"status\":\"error\",\"detail\":\"bad or missing key\"}"
  );

  return false;
}


// ============================================================
// /irrigate — manual cycle
// ============================================================

void handleIrrigate()
{
  if (!requireAuth()) return;

  if (state != IDLE)
  {
    server.send(
      409,
      "application/json",
      "{\"status\":\"error\",\"detail\":\"already irrigating\"}"
    );
    return;
  }

  unsigned long seconds = DEFAULT_RUN_SEC;

  if (server.hasArg("sec"))
  {
    long requested = server.arg("sec").toInt();
    if (requested > 0) seconds = requested;
  }

  if (seconds > MAX_RUN_SEC) seconds = MAX_RUN_SEC;

  startCycle(false, seconds * 1000UL);

  server.send(
    200,
    "application/json",
    "{\"status\":\"ok\",\"state\":\"opening\",\"durationSec\":" +
    String(seconds) + "}"
  );
}


// ============================================================
// /stop
// ============================================================

void handleStop()
{
  if (!requireAuth()) return;

  endCycle("stopped by /stop");

  server.send(
    200,
    "application/json",
    "{\"status\":\"ok\",\"state\":\"idle\"}"
  );
}


// ============================================================
// /status
// ============================================================

void handleStatus()
{
  if (!requireAuth()) return;

  unsigned long remainingMs = 0;

  if (state == RUNNING && !cycleIsAuto)
  {
    unsigned long elapsed = millis() - stateStartMs;
    if (elapsed < runDurationMs) remainingMs = runDurationMs - elapsed;
  }
  else if (state == RUNNING && cycleIsAuto)
  {
    // Auto cycles end on moisture, so "remaining" is the
    // safety cap countdown.
    unsigned long elapsed = millis() - stateStartMs;
    unsigned long capMs   = AUTO_MAX_RUN_SEC * 1000UL;
    if (elapsed < capMs) remainingMs = capMs - elapsed;
  }
  else if (state == MANUAL_PUMP)
  {
    unsigned long elapsed = millis() - stateStartMs;
    if (elapsed < runDurationMs) remainingMs = runDurationMs - elapsed;
  }

  String json = "{";
  json += "\"state\":\""        + String(stateName(state)) + "\"";
  json += ",\"cycleType\":\""   + String(state == IDLE ? "none" : (cycleIsAuto ? "auto" : "manual")) + "\"";
  json += ",\"remainingSec\":"  + String(remainingMs / 1000UL);
  json += ",\"vwc\":"           + String(soilVwc);
  json += ",\"raw\":"           + String(soilRaw);
  json += ",\"sensorOk\":"      + String(soilOk ? "true" : "false");
  json += ",\"auto\":"          + String(autoEnabled ? "true" : "false");
  json += ",\"vwcTrigger\":"    + String(VWC_TRIGGER);
  json += ",\"vwcOptimalMin\":" + String(VWC_OPTIMAL_MIN);
  json += ",\"soakRemainingSec\":" + String(soakRemainingMs() / 1000UL);
  json += ",\"valveEnabled\":"  + String(VALVE_ENABLED ? "true" : "false");
  json += ",\"pumpPin\":"       + String(digitalRead(PUMP_CONTROL_PIN));
  json += "}";

  server.send(200, "application/json", json);
}


// ============================================================
// /pump — bench toggle
// ============================================================

void handlePump()
{
  if (!requireAuth()) return;

  if (!server.hasArg("on"))
  {
    server.send(
      400,
      "application/json",
      "{\"status\":\"error\",\"detail\":\"missing on=0|1\"}"
    );
    return;
  }

  bool wantOn = server.arg("on").toInt() != 0;

  if (wantOn)
  {
    if (state != IDLE && state != MANUAL_PUMP)
    {
      server.send(
        409,
        "application/json",
        "{\"status\":\"error\",\"detail\":\"cycle in progress\"}"
      );
      return;
    }

    setPump(true);

    state         = MANUAL_PUMP;
    cycleIsAuto   = false;
    stateStartMs  = millis();
    runDurationMs = PUMP_TOGGLE_MAX_MS;

    Serial.println("MANUAL PUMP ON");

    server.send(
      200,
      "application/json",
      "{\"status\":\"ok\",\"state\":\"manual_pump\",\"pump\":\"on\"}"
    );
  }
  else
  {
    setPump(false);

    if (state == MANUAL_PUMP)
    {
      state         = IDLE;
      stateStartMs  = millis();
      runDurationMs = 0;
    }

    Serial.println("MANUAL PUMP OFF");

    server.send(
      200,
      "application/json",
      "{\"status\":\"ok\",\"state\":\"idle\",\"pump\":\"off\"}"
    );
  }
}


// ============================================================
// /auto — enable / disable the automatic loop
// ============================================================

void handleAuto()
{
  if (!requireAuth()) return;

  if (server.hasArg("on"))
  {
    autoEnabled = server.arg("on").toInt() != 0;

    Serial.print("AUTO mode ");
    Serial.println(autoEnabled ? "ENABLED" : "DISABLED");

    // Turning auto off mid-auto-cycle stops that cycle.
    if (!autoEnabled && state != IDLE && cycleIsAuto)
    {
      endCycle("auto disabled");
    }
  }

  server.send(
    200,
    "application/json",
    "{\"status\":\"ok\",\"auto\":" + String(autoEnabled ? "true" : "false") + "}"
  );
}


// ============================================================
// /raw — calibration helper
// ============================================================

void handleRaw()
{
  if (!requireAuth()) return;

  readSoilSensor();

  String json = "{";
  json += "\"raw\":"       + String(soilRaw);
  json += ",\"vwc\":"      + String(soilVwc);
  json += ",\"sensorOk\":" + String(soilOk ? "true" : "false");
  json += ",\"dryRaw\":"   + String(dryRaw);
  json += ",\"wetRaw\":"   + String(wetRaw);
  json += "}";

  server.send(200, "application/json", json);
}


// ============================================================
// /calibrate?dry=&wet= — runtime calibration (not persisted)
// ============================================================

void handleCalibrate()
{
  if (!requireAuth()) return;

  if (server.hasArg("dry")) dryRaw = server.arg("dry").toInt();
  if (server.hasArg("wet")) wetRaw = server.arg("wet").toInt();

  Serial.print("Calibration set: dry=");
  Serial.print(dryRaw);
  Serial.print(" wet=");
  Serial.println(wetRaw);

  String json = "{";
  json += "\"status\":\"ok\"";
  json += ",\"dryRaw\":" + String(dryRaw);
  json += ",\"wetRaw\":" + String(wetRaw);
  json += ",\"note\":\"lost on reboot — copy into the sketch constants\"";
  json += "}";

  server.send(200, "application/json", json);
}


// ============================================================
// SETUP
// ============================================================

void setup()
{
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("========================================");
  Serial.println("SMART IRRIGATION NODE — AUTO TEST");
  Serial.println("Agri-Intelligence 2026 — Bed 1 (Covo)");
  Serial.println("========================================");

  pinMode(PUMP_CONTROL_PIN, OUTPUT);

  if (VALVE_ENABLED)
  {
    pinMode(VALVE_CONTROL_PIN, OUTPUT);
  }

  // GPIO34 is input-only; no pinMode needed. Full 0–3.3 V range.
  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_SENSOR_PIN, ADC_11db);

  // SAFETY: everything off at boot.
  setPump(false);
  setValve(false);

  Serial.println("Pump: OFF");
  Serial.println(VALVE_ENABLED ? "Valve: CLOSED" : "Valve: DISABLED (pump-only test)");

  // First reading before WiFi so we log something even if WiFi is slow.
  readSoilSensor();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(300);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected.");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  if (MDNS.begin("irrigation"))
  {
    Serial.println("mDNS started: http://irrigation.local/");
  }

  server.on("/irrigate",  HTTP_GET, handleIrrigate);
  server.on("/stop",      HTTP_GET, handleStop);
  server.on("/status",    HTTP_GET, handleStatus);
  server.on("/pump",      HTTP_GET, handlePump);
  server.on("/auto",      HTTP_GET, handleAuto);
  server.on("/raw",       HTTP_GET, handleRaw);
  server.on("/calibrate", HTTP_GET, handleCalibrate);

  server.begin();

  Serial.println("HTTP server started.");
  Serial.print("Thresholds: trigger < ");
  Serial.print(VWC_TRIGGER);
  Serial.print("%  stop >= ");
  Serial.print(VWC_OPTIMAL_MIN);
  Serial.println("%");
  Serial.print("Calibration: dry=");
  Serial.print(dryRaw);
  Serial.print(" wet=");
  Serial.println(wetRaw);
  Serial.println("AUTO mode: ENABLED");
}


// ============================================================
// MAIN LOOP
// ============================================================

void loop()
{
  server.handleClient();

  unsigned long now     = millis();
  unsigned long elapsed = now - stateStartMs;


  // ----------------------------------------------------------
  // Poll the probe
  // ----------------------------------------------------------

  if (now - lastSensorReadMs >= SENSOR_READ_MS)
  {
    readSoilSensor();
  }


  // ----------------------------------------------------------
  // Automatic trigger
  // ----------------------------------------------------------

  if (
    autoEnabled &&
    state == IDLE &&
    soilOk &&
    soakRemainingMs() == 0 &&
    soilVwc < VWC_TRIGGER
  )
  {
    startCycle(true, AUTO_MAX_RUN_SEC * 1000UL);
  }


  // ----------------------------------------------------------
  // State machine
  // ----------------------------------------------------------

  if (state == OPENING && (!VALVE_ENABLED || elapsed >= VALVE_OPEN_SETTLE_MS))
  {
    setPump(true);

    state        = RUNNING;
    stateStartMs = millis();

    Serial.println("Pump ON. Irrigation RUNNING.");
  }

  else if (state == RUNNING)
  {
    bool done = false;
    const char* why = "";

    if (cycleIsAuto)
    {
      if (soilOk && soilVwc >= VWC_OPTIMAL_MIN)
      {
        done = true;
        why  = "moisture reached optimal band";
      }
      else if (elapsed >= runDurationMs)
      {
        done = true;
        why  = "auto safety cap reached";
      }
      else if (!soilOk)
      {
        done = true;
        why  = "sensor fault during auto cycle";
      }
    }
    else if (elapsed >= runDurationMs)
    {
      done = true;
      why  = "manual duration complete";
    }

    if (done)
    {
      setPump(false);

      state        = CLOSING;
      stateStartMs = millis();

      Serial.print("Pump OFF — ");
      Serial.println(why);
    }
  }

  else if (state == CLOSING && (!VALVE_ENABLED || elapsed >= VALVE_CLOSE_DELAY_MS))
  {
    endCycle(cycleIsAuto ? "auto cycle complete" : "manual cycle complete");
  }

  else if (state == MANUAL_PUMP && elapsed >= runDurationMs)
  {
    setPump(false);

    state         = IDLE;
    stateStartMs  = millis();
    runDurationMs = 0;

    Serial.println("MANUAL PUMP auto-off (safety limit).");
  }
}
