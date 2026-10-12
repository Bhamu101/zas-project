/*
 * ============================================================
 * SMART IRRIGATION — BED 1 PRODUCTION NODE
 * Automatic (soil-moisture) + manual (dashboard / app)
 *
 * Agri-Intelligence 2026 — Smart Energy-Driven Irrigation for Agricultural
 * Value Chains
 *
 * WHAT THIS IS
 * ------------------------------------------------------------
 * The sketch Bed 1 actually runs. It merges the two objectives
 * that were tested separately on the bench:
 *
 *   Objective 1 — automatic: the node reads its own soil probe
 *     and waters when Bed 1 drops below its crop's trigger,
 *     stopping when the bed is back in the optimal band. This
 *     decision is local: it keeps working with WiFi down.
 *
 *   Objective 2 — manual: /irrigate from the dashboard or the
 *     mobile app runs a fixed-duration cycle on demand. A
 *     manual request always wins over the automatic loop.
 *
 * Both modes drive the SAME sequence and the SAME hardware, so
 * there is one pump path, one valve path, one set of interlocks.
 *
 * SINGLE-BED / BUILD STAGE
 *   VALVE_ENABLED is false while Bed 1 is tested on its own. A lone bed has
 *   nothing to route between, so the pump alone decides whether it is watered,
 *   and the solenoid is dead weight: it would draw ~0.6 A of a 2 A supply and
 *   introduce the one failure mode worth fearing here — a positive-displacement
 *   pump running against a shut valve. Set the flag true when beds 2 and 3 are
 *   plumbed and routing actually matters. Nothing else needs to change.
 *
 * DIFFERENCES FROM THE BENCH SKETCHES
 *   - Pump is the R385 diaphragm pump on 12 V, switched by the
 *     relay module's K1 channel (ACTIVE-LOW) — not a 2N2222.
 *     The 2N2222 / 220 Ω / automotive relay are gone.
 *   - Valve wiring is kept but switched off (VALVE_ENABLED),
 *     since Bed 1 is being tested alone. See SINGLE-BED STAGE.
 *   - Timings are FIELD values (2 h manual cap, 10 min auto cap,
 *     15 min soak). The auto cap and soak are estimates until a
 *     real cycle has been timed — see the TIMING block.
 *
 * ------------------------------------------------------------
 * PUMP — R385 DC diaphragm pump
 *   12 V, ~0.5–1 A running, ~2 A inrush. Self-priming: it sits
 *   OUTSIDE the tank and draws water up its suction hose.
 *   Never run it dry. Dead-heading is only a risk once a valve
 *   is fitted, and the sequence opens it before the pump starts.
 *
 *   ESP32 GPIO18 -> relay module IN1
 *   K1 COM  -> fused +12 V
 *   K1 NO   -> R385 red (+)
 *   R385 black (-) -> common GND
 *
 *   Module is ACTIVE-LOW:
 *       GPIO18 LOW  = K1 closed = pump ON
 *       GPIO18 HIGH = K1 open   = pump OFF
 *
 * VALVE — 12 V solenoid  (multi-bed only; VALVE_ENABLED)
 *   ESP32 GPIO19 -> relay module IN2
 *   K2 COM  -> fused +12 V
 *   K2 NO   -> solenoid +
 *   solenoid - -> common GND
 *   1N4007 across the solenoid: band -> solenoid +
 *
 *       GPIO19 LOW  = K2 closed = valve OPEN
 *       GPIO19 HIGH = K2 open   = valve CLOSED
 *
 *   Relay module VCC -> 5 V, GND -> common GND.
 *
 * SOIL MOISTURE PROBE — resistive FC-28 / YL-69 (blue comparator board)
 *   VCC -> ESP32 3V3   (NOT 5 V — keeps AO inside the ADC range)
 *   GND -> common GND
 *   DO  -> not connected (comparator output; we want the number, not on/off)
 *   AO  -> ESP32 GPIO34 (ADC1_CH6, input-only)
 *
 *   Reads HIGH when dry, LOW when wet — same direction as a capacitive
 *   probe, so the calibration maths is unchanged. Air is ~4095.
 *
 *   NOTE: resistive prongs corrode, because DC flows through the soil
 *   whenever the probe is powered. Expect weeks-to-months of life in
 *   permanently damp ground. Powering it from a GPIO and only energising
 *   it for the moment of each reading extends that a great deal.
 *
 *   ADC2 pins do not work while WiFi is up. Stay on ADC1:
 *   GPIO 32/33/34/35/36/39.
 *
 * BOOT SAFETY
 *   An ESP32 output pin floats LOW for a few ms out of reset.
 *   On an ACTIVE-LOW relay module that is "relay closed" — the
 *   pump would twitch on at every boot and brownout. Every relay
 *   pin in use is therefore driven to its OFF level BEFORE
 *   pinMode() makes it an output. Do not reorder those lines.
 *
 * THRESHOLDS
 *   Bed 1 grows Covo. These mirror CROP_TARGETS["Covo"] in
 *   backend/main.py — change them in both places together:
 *       trigger      32 % VWC   (start watering below this)
 *       optimal min  48 % VWC   (stop watering once reached)
 *
 * CALIBRATION
 *   Raw ADC (0–4095) maps linearly to VWC % between two points
 *   you measure: dryRaw (probe in air) and wetRaw (probe in
 *   water). Read /raw in each condition, then either edit the
 *   constants or set them live with /calibrate.
 *
 * ENDPOINTS (all require &key=SECRET):
 *   /status              state, vwc, pump/valve, auto, soak
 *   /irrigate?sec=N      manual cycle (clamped to MAX_RUN_SEC)
 *   /stop                stop now, begin soak
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
// PINS
// ============================================================

const int PUMP_CONTROL_PIN  = 18;   // -> relay module IN1 (K1)
const int VALVE_CONTROL_PIN = 19;   // -> relay module IN2 (K2)
const int SOIL_SENSOR_PIN   = 34;   // ADC1_CH6, input-only


// ============================================================
// RELAY POLARITY
// ============================================================

// Both channels are on the same opto-isolated module, so both
// share its polarity. Set to false only if you swap in a module
// whose relays close on a HIGH input.
const bool RELAY_ACTIVE_LOW = true;

// Bed 1 is being tested on its own before beds 2 and 3 are plumbed, and one
// bed does not need a valve: the pump alone decides whether Bed 1 gets water.
// The valve's real job is routing between branches, which only matters once
// there is more than one branch.
//
// false -> pump only. GPIO19 is left alone, K2 stays unwired, the open/close
//          delays are skipped, and the 12 V rail carries ~0.6 A less.
// true  -> full valve sequence, for the multi-bed build.
const bool VALVE_ENABLED = false;


// ============================================================
// BUILD STAGE
// ============================================================

/*
 * The node is built in three stages, in the order the objectives
 * are being proved. Each stage is these two flags — the wiring
 * only changes once, between stage 1 and stage 2.
 *
 *   STAGE 1  manual irrigation from the app
 *            PROBE_FITTED false, AUTO_AT_BOOT false
 *            Hardware: ESP32 + K1 + pump. No probe.
 *            /irrigate and /stop work; /status reports no probe.
 *
 *   STAGE 2  moisture readings on the dashboard
 *            PROBE_FITTED true, AUTO_AT_BOOT false
 *            Hardware: + the capacitive probe on GPIO34.
 *            /status now carries vwc, and the backend shows it.
 *            The node still only waters when asked.
 *
 *   STAGE 3  automatic irrigation on threshold
 *            PROBE_FITTED true, AUTO_AT_BOOT true
 *            Hardware: unchanged. Nothing to wire.
 *            The loop that was already in loop() is allowed to fire.
 *
 * Auto can never run without a probe, whatever AUTO_AT_BOOT says —
 * the trigger checks PROBE_FITTED and a plausible reading, so a
 * half-finished stage 2 cannot start the pump on a floating pin.
 */

const bool PROBE_FITTED = true;    // stage 2 onwards

// STAGE 3 / DEMO. Was false (manual-only test, 2026-09-25).
//
// true means the automatic loop is armed the moment the node powers up.
// It was previously left false and re-armed by hand with /auto?on=1, but
// that quietly disarms automatic irrigation after any power cut or reset —
// which, during a demo, looks exactly like the feature not working.
//
// ⚠ Consequence of true: if the probe reads below VWC_TRIGGER at boot, the
// node starts watering within a couple of seconds of powering on, with
// nobody having asked. That is the intended behaviour on the bed, but do
// not power the node up with the probe sitting dry on a bench unless you
// want the pump to run. Set false while bench-testing wiring.
const bool AUTO_AT_BOOT = true;    // stage 3 onwards

// Level that means OFF for a relay input — what the pins are
// parked at before and after every cycle, and at boot.
const int RELAY_OFF_LEVEL = RELAY_ACTIVE_LOW ? HIGH : LOW;
const int RELAY_ON_LEVEL  = RELAY_ACTIVE_LOW ? LOW  : HIGH;


// ============================================================
// CROP THRESHOLDS — Bed 1 = Covo
// Mirror of CROP_TARGETS["Covo"] in backend/main.py
// ============================================================

const int VWC_TRIGGER     = 32;
const int VWC_OPTIMAL_MIN = 48;


// ============================================================
// SENSOR CALIBRATION (12-bit ADC, 0–4095)
// ============================================================

// Measured on this probe, 2026-09-23:
//   air           4095  (full scale — no conduction between the prongs)
//   in water      1150-1480, settling around 1200
int dryRaw = 4095;
int wetRaw = 1200;

// Bed 1 uses a RESISTIVE FC-28 / YL-69 probe, which measures conduction
// between two prongs. In air there is no conduction at all, so AO sits at
// nearly full supply and the ADC reads 4095 — a legitimate "bone dry"
// reading, not a fault. The ceiling is therefore full scale.
//
// The cost of that: on a resistive probe a DISCONNECTED lead looks the same
// as bone-dry soil, so this window can no longer catch an unplugged probe.
// What protects an automatic cycle is AUTO_MAX_RUN_SEC and the soak period,
// not this check. Keep that in mind before raising either.
const int RAW_PLAUSIBLE_MIN = 50;
const int RAW_PLAUSIBLE_MAX = 4095;

const int SENSOR_SAMPLES = 16;


// ============================================================
// TIMING / SAFETY
// ============================================================

const unsigned long SENSOR_READ_MS       = 2000;

// The R385 must never run against a closed valve, so the pump
// only starts after the solenoid has had time to open.
const unsigned long VALVE_OPEN_SETTLE_MS = 1500;
const unsigned long VALVE_CLOSE_DELAY_MS = 1500;

/*
 * FIELD VALUES — Bed 1 on the real bed.
 *
 * AUTO_MAX_RUN_SEC and SOAK_MS below are STARTING ESTIMATES, not
 * measurements. Both depend on how fast water actually reaches
 * this probe in this soil, which nobody knows until a cycle has
 * been timed. Before trusting the automatic loop unattended:
 *
 *   1. Run ONE manual cycle and time how long the probe takes to
 *      climb from its dry reading to 48 %.
 *   2. Set AUTO_MAX_RUN_SEC to roughly twice that — long enough
 *      that a normal cycle ends on moisture, short enough that a
 *      dead probe cannot water the bed indefinitely.
 *   3. Set SOAK_MS to at least as long as the bed takes to settle
 *      after a cycle, so the next reading is the real one.
 *
 * Pot/bench values, if the rig goes back on the bench:
 *     DEFAULT_RUN_SEC        15     MAX_RUN_SEC       120
 *     AUTO_MAX_RUN_SEC       20     SOAK_MS       120000
 */

const unsigned long DEFAULT_RUN_SEC = 1800;   // 30 min
// Ceiling on a manual cycle. Matches MAX_IRRIGATION_MINUTES (120)
// in backend/main.py, which sends sec = minutes * 60 — so the
// dashboard's full range is available again.
const unsigned long MAX_RUN_SEC     = 7200;   // 2 h

// An automatic cycle normally ends on moisture. This cap is the
// backstop for a probe that stops responding mid-cycle. On a
// resistive probe a disconnected lead reads as bone dry, so this
// is the ONLY thing standing between a broken wire and a bed
// watered until the tank runs dry. Measure before raising it.
// DEMO VALUE. Field value was 600 (10 min) — restore it before the rig is
// left running unattended on the real bed.
//
// 60 s is long enough to narrate a cycle and lift the probe into water, short
// enough that an audience never waits. It is also a safer backstop, not a
// looser one: a cycle that ends on this cap waters for one minute instead of
// ten, so a broken probe cannot empty the tank while nobody is watching.
const unsigned long AUTO_MAX_RUN_SEC = 60;    // 1 min — DEMO (field: 600)

// Water needs time to percolate to the probe. Without this the
// node would re-trigger on its own still-dry reading and
// short-cycle the pump.
// DEMO VALUE. Field value was 900000 (15 min) — restore it before the rig is
// left on the real bed, where water genuinely needs that long to percolate
// down to the probe and a shorter soak would short-cycle the pump.
//
// At 15 min the node refuses to auto-trigger again for a quarter of an hour
// after any cycle, so a demo gets exactly one attempt and a second group of
// judges sees nothing. 2 min allows a repeat on demand.
const unsigned long SOAK_MS = 120000UL;       // 2 min — DEMO (field: 900000)


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
  CLOSING
};

IrrigationState state = IDLE;

// Which kind of cycle is in progress (meaningful outside IDLE).
bool cycleIsAuto = false;

bool autoEnabled = AUTO_AT_BOOT;

unsigned long stateStartMs   = 0;
unsigned long runDurationMs  = 0;
unsigned long lastCycleEndMs = 0;
bool          hasCycled      = false;

int  soilRaw = 0;
int  soilVwc = 0;
bool soilOk  = false;
unsigned long lastSensorReadMs = 0;


const char* stateName(IrrigationState s)
{
  switch (s)
  {
    case IDLE:    return "idle";
    case OPENING: return "opening";
    case RUNNING: return "running";
    case CLOSING: return "closing";
  }

  return "unknown";
}


// ============================================================
// OUTPUTS
// ============================================================

/*
 * Pump path:
 *
 * GPIO18 -> IN1 -> K1 -> R385
 *
 * GPIO18 LOW  (active-low module): K1 contacts close,
 *   +12 V reaches the pump's red lead, pump runs.
 * GPIO18 HIGH: K1 opens, pump stops.
 */

void setPump(bool on)
{
  digitalWrite(PUMP_CONTROL_PIN, on ? RELAY_ON_LEVEL : RELAY_OFF_LEVEL);
}

/*
 * Valve path: GPIO19 -> IN2 -> K2 -> solenoid, same polarity.
 */

void setValve(bool open)
{
  if (!VALVE_ENABLED)
  {
    return;
  }

  digitalWrite(VALVE_CONTROL_PIN, open ? RELAY_ON_LEVEL : RELAY_OFF_LEVEL);
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
  // Capacitive probes read HIGHER when dry and LOWER when wet,
  // so the map is inverted. Guard a bad calibration.
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
  if (!PROBE_FITTED)
  {
    // GPIO34 is floating at this stage — sampling it would produce
    // convincing-looking nonsense. Report "no probe" instead.
    soilRaw = 0;
    soilVwc = 0;
    soilOk  = false;
    lastSensorReadMs = millis();
    return;
  }

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

  if (state != IDLE)
  {
    Serial.print(cycleIsAuto ? " (auto)" : " (manual)");
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

/*
 * Every cycle — automatic or manual — goes through here, so
 * there is exactly one place that opens the valve before the
 * pump and one sequence to reason about.
 */
void startCycle(bool isAuto, unsigned long durationMs)
{
  cycleIsAuto   = isAuto;
  runDurationMs = durationMs;

  // Valve first, pump later (in the OPENING -> RUNNING step).
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
    Serial.print("% below trigger ");
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

  Serial.println(VALVE_ENABLED ? "Valve: OPENING   Pump: OFF"
                               : "Valve: none fitted   Pump: OFF");
}

void endCycle(const char* reason)
{
  // Pump first, always: the valve must never close on a
  // running diaphragm pump.
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
  Serial.println(VALVE_ENABLED ? "Pump OFF. Valve CLOSED." : "Pump OFF.");
  Serial.print("Soak: ");
  Serial.print(SOAK_MS / 60000UL);
  Serial.println(" min before auto may re-trigger.");
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

  // A manual request takes priority over the automatic loop:
  // if the node started watering on its own, the farmer's
  // explicit duration replaces it rather than being refused.
  if (state != IDLE && cycleIsAuto)
  {
    Serial.println("Manual request overrides the running auto cycle.");
    setPump(false);
    setValve(false);
    state = IDLE;
  }
  else if (state != IDLE)
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

  if (state == RUNNING)
  {
    // For a manual cycle this is the real countdown; for an
    // automatic one it is the safety cap, since that cycle
    // ends on moisture rather than on time.
    unsigned long elapsed = millis() - stateStartMs;
    if (elapsed < runDurationMs) remainingMs = runDurationMs - elapsed;
  }

  bool pumpOn   = (digitalRead(PUMP_CONTROL_PIN)  == RELAY_ON_LEVEL);
  bool valveOpen = VALVE_ENABLED &&
                   (digitalRead(VALVE_CONTROL_PIN) == RELAY_ON_LEVEL);

  String json = "{";
  json += "\"state\":\""           + String(stateName(state)) + "\"";
  json += ",\"cycleType\":\""      + String(state == IDLE ? "none" : (cycleIsAuto ? "auto" : "manual")) + "\"";
  json += ",\"remainingSec\":"     + String(remainingMs / 1000UL);
  json += ",\"vwc\":"              + String(soilVwc);
  json += ",\"raw\":"              + String(soilRaw);
  json += ",\"sensorOk\":"         + String(soilOk ? "true" : "false");
  json += ",\"auto\":"             + String(autoEnabled ? "true" : "false");
  json += ",\"vwcTrigger\":"       + String(VWC_TRIGGER);
  json += ",\"vwcOptimalMin\":"    + String(VWC_OPTIMAL_MIN);
  json += ",\"soakRemainingSec\":" + String(soakRemainingMs() / 1000UL);
  json += ",\"pump\":\""           + String(pumpOn ? "ON" : "OFF") + "\"";
  json += ",\"valve\":\""          + String(valveOpen ? "OPEN" : "CLOSED") + "\"";
  json += ",\"valveFitted\":"     + String(VALVE_ENABLED ? "true" : "false");
  json += ",\"probeFitted\":"     + String(PROBE_FITTED ? "true" : "false");
  json += "}";

  server.send(200, "application/json", json);
}


// ============================================================
// /auto — enable / disable the automatic loop
// ============================================================

void handleAuto()
{
  if (!requireAuth()) return;

  if (server.hasArg("on") && server.arg("on").toInt() != 0 && !PROBE_FITTED)
  {
    server.send(
      409,
      "application/json",
      "{\"status\":\"error\",\"detail\":\"no probe fitted — auto needs stage 2\"}"
    );
    return;
  }

  if (server.hasArg("on"))
  {
    autoEnabled = server.arg("on").toInt() != 0;

    Serial.print("AUTO mode ");
    Serial.println(autoEnabled ? "ENABLED" : "DISABLED");

    // Switching auto off mid-auto-cycle stops that cycle; a
    // manual cycle keeps running, since a person asked for it.
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

  if (!PROBE_FITTED)
  {
    server.send(
      409,
      "application/json",
      "{\"status\":\"error\",\"detail\":\"no probe fitted (stage 1)\"}"
    );
    return;
  }

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

  if (!PROBE_FITTED)
  {
    server.send(
      409,
      "application/json",
      "{\"status\":\"error\",\"detail\":\"no probe fitted (stage 1)\"}"
    );
    return;
  }

  // Validate before storing. toInt() turns anything unparseable into 0, so a
  // URL still carrying placeholder text silently calibrated dry=0 wet=0 and
  // made every later reading meaningless. Refuse rather than accept nonsense.
  int newDry = server.hasArg("dry") ? server.arg("dry").toInt() : dryRaw;
  int newWet = server.hasArg("wet") ? server.arg("wet").toInt() : wetRaw;

  const char* problem = nullptr;

  if (newDry < 1 || newDry > 4095 || newWet < 1 || newWet > 4095)
  {
    problem = "dry and wet must both be 1-4095";
  }
  else if (newDry <= newWet)
  {
    // This probe reads HIGH when dry, so dry must be the larger number.
    problem = "dry must be greater than wet";
  }
  else if (newDry - newWet < 200)
  {
    // Too narrow a span means a few counts of noise swing the percentage
    // wildly — almost always a mis-measurement rather than a real probe.
    problem = "dry and wet are too close together (need a gap of 200+)";
  }

  if (problem)
  {
    Serial.print("Calibration REJECTED: ");
    Serial.println(problem);

    server.send(
      400,
      "application/json",
      String("{\"status\":\"error\",\"detail\":\"") + problem +
      "\",\"dryRaw\":" + String(dryRaw) +
      ",\"wetRaw\":" + String(wetRaw) + "}"
    );
    return;
  }

  dryRaw = newDry;
  wetRaw = newWet;

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
  // ----------------------------------------------------------
  // BOOT SAFETY — must be the very first thing.
  //
  // digitalWrite BEFORE pinMode. An ESP32 pin reads LOW while
  // it is still an input, and LOW closes an active-low relay.
  // Setting the level first means the pin is already parked at
  // "relay off" the instant it becomes an output, so neither
  // the pump nor the valve twitches on at reset.
  // ----------------------------------------------------------

  digitalWrite(PUMP_CONTROL_PIN,  RELAY_OFF_LEVEL);
  pinMode(PUMP_CONTROL_PIN,  OUTPUT);
  digitalWrite(PUMP_CONTROL_PIN,  RELAY_OFF_LEVEL);

  if (VALVE_ENABLED)
  {
    digitalWrite(VALVE_CONTROL_PIN, RELAY_OFF_LEVEL);
    pinMode(VALVE_CONTROL_PIN, OUTPUT);
    digitalWrite(VALVE_CONTROL_PIN, RELAY_OFF_LEVEL);
  }

  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("========================================");
  Serial.println("SMART IRRIGATION NODE — BED 1");
  Serial.println("Agri-Intelligence 2026 — R385 pump + soil probe");
  Serial.println("========================================");
  Serial.println(VALVE_ENABLED ? "Pump: OFF   Valve: CLOSED"
                               : "Pump: OFF   Valve: not fitted (single-bed test)");

  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_SENSOR_PIN, ADC_11db);

  // One reading before WiFi, so the log shows the probe even
  // if the access point is slow to appear.
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
  server.on("/auto",      HTTP_GET, handleAuto);
  server.on("/raw",       HTTP_GET, handleRaw);
  server.on("/calibrate", HTTP_GET, handleCalibrate);

  server.begin();

  Serial.println("HTTP server started.");
  Serial.println("Pump:  GPIO18 -> IN1 / K1 (active-LOW)");
  Serial.println(VALVE_ENABLED ? "Valve: GPIO19 -> IN2 / K2 (active-LOW)"
                               : "Valve: DISABLED — set VALVE_ENABLED for multi-bed");
  Serial.println(PROBE_FITTED ? "Probe: GPIO34 (ADC1)"
                              : "Probe: not fitted — GPIO34 unused");
  Serial.print("STAGE: ");
  if (!PROBE_FITTED)      Serial.println("1 — manual irrigation only (no probe)");
  else if (!AUTO_AT_BOOT) Serial.println("2 — probe readings, manual watering");
  else                    Serial.println("3 — automatic irrigation armed");

  Serial.print("Thresholds: start < ");
  Serial.print(VWC_TRIGGER);
  Serial.print("%   stop >= ");
  Serial.print(VWC_OPTIMAL_MIN);
  Serial.println("%");
  Serial.print("Calibration: dry=");
  Serial.print(dryRaw);
  Serial.print(" wet=");
  Serial.println(wetRaw);
  Serial.println(autoEnabled ? "AUTO mode: ENABLED" : "AUTO mode: OFF");
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
  //
  // Every condition here is a reason NOT to water, so an
  // unplugged probe, a disabled loop, a cycle already running
  // or a soaking bed all fail closed.
  // ----------------------------------------------------------

  if (
    PROBE_FITTED &&
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
  // STATE 1: OPENING — valve is swinging open
  // ----------------------------------------------------------

  if (state == OPENING && (!VALVE_ENABLED || elapsed >= VALVE_OPEN_SETTLE_MS))
  {
    setPump(true);

    state        = RUNNING;
    stateStartMs = millis();

    Serial.println(VALVE_ENABLED
      ? "Valve open. Pump ON. Irrigation RUNNING."
      : "Pump ON. Irrigation RUNNING.");
  }


  // ----------------------------------------------------------
  // STATE 2: RUNNING — auto ends on moisture, manual on time
  // ----------------------------------------------------------

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
        // The probe is the only thing that can end this cycle
        // normally, so losing it mid-run means stopping.
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
      Serial.println("Waiting before the valve closes.");
    }
  }


  // ----------------------------------------------------------
  // STATE 3: CLOSING — let the line depressurize, then close
  // ----------------------------------------------------------

  else if (state == CLOSING && (!VALVE_ENABLED || elapsed >= VALVE_CLOSE_DELAY_MS))
  {
    endCycle(cycleIsAuto ? "auto cycle complete" : "manual cycle complete");
  }
}
