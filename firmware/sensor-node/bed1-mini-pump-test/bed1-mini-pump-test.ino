/*
 * ============================================================
 * SMART IRRIGATION — BED 1 MINI PUMP BENCH TEST
 *
 * Agri-Intelligence 2026 — Smart Energy-Driven Irrigation for Agricultural
 * Value Chains
 *
 * PURPOSE
 * ------------------------------------------------------------
 * Bench-test the manual irrigation sequence using a 3–6 V
 * mini submersible pump instead of the 12 V / 15 A ZQB-12V.
 *
 * Same endpoints, same shared secret, same state machine as
 * bed1-manual-irrigation.ino, so the backend and dashboard
 * work unchanged. The differences are only in the hardware
 * path and the safety limits:
 *
 *   - Pump is driven DIRECTLY by the 2N2222 (no automotive
 *     relay). The mini pump draws ~100–200 mA, well inside
 *     the 2N2222's rating.
 *   - Valve is OPTIONAL (VALVE_ENABLED). Default OFF so you
 *     can test pump-only with nothing on GPIO19.
 *   - MAX_RUN_SEC lowered to 120 s — the pump sits in a cup
 *     of water on the bench, not a tank.
 *   - Extra /pump endpoint for a direct on/off toggle when
 *     you just want to confirm the transistor drive.
 *
 * PUMP:
 *   Mini submersible DC pump (white, 3–6 V, ~1–2 L/min)
 *   Red   = Pump +
 *   Black = Pump -
 *
 *   MUST be submerged before it is switched on.
 *   Running dry damages it quickly.
 *
 * PUMP CONTROL (low-side switch, no relay):
 *   ESP32 GPIO18
 *       |
 *      220 Ω
 *       |
 *   2N2222 Base
 *
 *   2N2222 Emitter   -> Common GND
 *   2N2222 Collector -> Pump black (-)
 *   Pump red (+)     -> +5 V
 *
 *   1N4007 across the PUMP (flyback):
 *       Cathode / band -> +5 V  (pump red)
 *       Anode          -> Pump black / transistor collector
 *
 *   +5 V source: ESP32 5V/VIN pin (USB) is OK for a quick
 *   test. If the ESP32 resets when the pump kicks in, add a
 *   100–470 µF cap across +5 V / GND or move the pump to its
 *   own 5 V supply and tie the grounds together.
 *
 *   DO NOT connect this pump to the 12 V bus.
 *
 *   GPIO18 HIGH = pump ON
 *   GPIO18 LOW  = pump OFF
 *
 * VALVE CONTROL (only if VALVE_ENABLED = true):
 *   2-channel relay module, CHANNEL 2 / K2
 *
 *   ESP32 GPIO19 -> Relay module IN2
 *   Relay module VCC -> ESP32 5V
 *   Relay module GND -> Common GND
 *
 *   K2 COM -> fused +12 V
 *   K2 NO  -> Solenoid +
 *   Solenoid - -> Battery -
 *
 *   K2 is assumed ACTIVE-LOW:
 *       GPIO19 LOW  = valve ON
 *       GPIO19 HIGH = valve OFF
 *
 * IRRIGATION SEQUENCE:
 *   1. Open valve            (skipped if VALVE_ENABLED = false)
 *   2. Wait for valve to open
 *   3. Start pump
 *   4. Run for requested duration
 *   5. Stop pump
 *   6. Wait for line to depressurize
 *   7. Close valve           (skipped if VALVE_ENABLED = false)
 *
 * ENDPOINTS:
 *
 *   /irrigate?sec=10&key=SECRET
 *       Start irrigation cycle (default 10 s, max 120 s).
 *
 *   /stop?key=SECRET
 *       Immediately stop pump and close valve.
 *
 *   /status?key=SECRET
 *       Return current state and remaining time.
 *
 *   /pump?on=1&key=SECRET
 *   /pump?on=0&key=SECRET
 *       Bench-only direct pump toggle. Bypasses the state
 *       machine and the valve. Auto-off after PUMP_TOGGLE_MAX_MS
 *       so a forgotten browser tab cannot leave it running.
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
// ESP32 CONTROL PINS
// ============================================================

// GPIO18 controls the 2N2222 transistor.
// HIGH = transistor ON = pump ON.
const int PUMP_CONTROL_PIN = 18;

// GPIO19 controls K2 / IN2 of the 2-channel relay module.
// Only driven when VALVE_ENABLED = true.
const int VALVE_CONTROL_PIN = 19;


// ============================================================
// VALVE OPTIONS
// ============================================================

// false = pump-only bench test, GPIO19 left idle.
// true  = drive the relay module / solenoid as in production.
const bool VALVE_ENABLED = false;

const bool VALVE_ACTIVE_LOW = true;


// ============================================================
// TIMING / SAFETY
// ============================================================

// Time allowed for solenoid valve to open before pump starts.
// Ignored when VALVE_ENABLED = false.
const unsigned long VALVE_OPEN_SETTLE_MS = 1000;

// Time allowed after pump stops before closing valve.
// Ignored when VALVE_ENABLED = false.
const unsigned long VALVE_CLOSE_DELAY_MS = 1000;

// Default cycle length if /irrigate has no sec= argument.
const unsigned long DEFAULT_RUN_SEC = 10;

// Maximum pump running time for a bench cycle.
// 120 seconds — a cup of water, not a tank.
const unsigned long MAX_RUN_SEC = 120;

// Hard cap for the /pump?on=1 direct toggle.
const unsigned long PUMP_TOGGLE_MAX_MS = 30000;


// ============================================================
// WEB SERVER
// ============================================================

WebServer server(80);


// ============================================================
// IRRIGATION STATES
// ============================================================

enum IrrigationState
{
  IDLE,
  OPENING,
  RUNNING,
  CLOSING,
  MANUAL_PUMP   // /pump?on=1 — bench toggle, outside the cycle
};

IrrigationState state = IDLE;


// ============================================================
// TIMING VARIABLES
// ============================================================

unsigned long stateStartMs = 0;
unsigned long runDurationMs = 0;


// ============================================================
// PUMP CONTROL
// ============================================================

/*
 * Pump path:
 *
 * GPIO18
 *   |
 * 220 Ω
 *   |
 * 2N2222 Base
 *
 * 2N2222 Collector -> Pump black (-)
 * Pump red (+)     -> +5 V
 *
 * GPIO18 HIGH:
 *   transistor ON
 *   pump black pulled to GND
 *   pump runs
 *
 * GPIO18 LOW:
 *   transistor OFF
 *   pump OFF
 */

void setPump(bool on)
{
  digitalWrite(
    PUMP_CONTROL_PIN,
    on ? HIGH : LOW
  );
}


// ============================================================
// VALVE CONTROL
// ============================================================

/*
 * K2 / IN2 controls the solenoid valve.
 *
 * Active-LOW relay module:
 *
 * GPIO19 LOW  -> K2 ON  -> Solenoid powered -> VALVE OPEN
 * GPIO19 HIGH -> K2 OFF -> Solenoid unpowered -> VALVE CLOSED
 *
 * When VALVE_ENABLED = false this is a no-op so GPIO19 can be
 * left unconnected.
 */

void setValve(bool open)
{
  if (!VALVE_ENABLED)
  {
    return;
  }

  if (VALVE_ACTIVE_LOW)
  {
    digitalWrite(
      VALVE_CONTROL_PIN,
      open ? LOW : HIGH
    );
  }
  else
  {
    digitalWrite(
      VALVE_CONTROL_PIN,
      open ? HIGH : LOW
    );
  }
}


// ============================================================
// STATE NAME
// ============================================================

const char* stateName(IrrigationState s)
{
  switch (s)
  {
    case IDLE:
      return "idle";

    case OPENING:
      return "opening";

    case RUNNING:
      return "running";

    case CLOSING:
      return "closing";

    case MANUAL_PUMP:
      return "manual_pump";
  }

  return "unknown";
}


// ============================================================
// AUTHENTICATION
// ============================================================

bool requireAuth()
{
  if (server.hasArg("key"))
  {
    if (server.arg("key") == SHARED_SECRET)
    {
      return true;
    }
  }

  server.send(
    403,
    "application/json",
    "{\"status\":\"error\",\"detail\":\"bad or missing key\"}"
  );

  return false;
}


// ============================================================
// IRRIGATE COMMAND
// ============================================================

void handleIrrigate()
{
  if (!requireAuth())
  {
    return;
  }

  // Do not allow another cycle while one is already running
  // (or while the bench toggle has the pump on).
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


  // Read requested duration.
  if (server.hasArg("sec"))
  {
    long requested = server.arg("sec").toInt();

    if (requested > 0)
    {
      seconds = requested;
    }
  }


  // Apply safety limit.
  if (seconds > MAX_RUN_SEC)
  {
    seconds = MAX_RUN_SEC;
  }


  // Convert seconds to milliseconds.
  runDurationMs = seconds * 1000UL;


  // ----------------------------------------------------------
  // IMPORTANT:
  // Start with pump OFF.
  // Open valve first (no-op when VALVE_ENABLED = false).
  // ----------------------------------------------------------

  setPump(false);

  setValve(true);


  state = OPENING;
  stateStartMs = millis();


  Serial.println();
  Serial.println("========================================");
  Serial.println("BED 1 IRRIGATION STARTED (MINI PUMP)");
  Serial.println("========================================");

  Serial.print("Requested duration: ");
  Serial.print(seconds);
  Serial.println(" seconds");

  if (VALVE_ENABLED)
  {
    Serial.println("Valve: OPENING");
  }
  else
  {
    Serial.println("Valve: DISABLED (pump-only test)");
  }

  Serial.println("Pump: OFF");


  String json =
    "{\"status\":\"ok\","
    "\"state\":\"opening\","
    "\"durationSec\":" +
    String(seconds) +
    "}";

  server.send(
    200,
    "application/json",
    json
  );
}


// ============================================================
// STOP COMMAND
// ============================================================

void handleStop()
{
  if (!requireAuth())
  {
    return;
  }


  // SAFETY:
  // Pump OFF first.
  setPump(false);

  // Valve CLOSED immediately.
  setValve(false);


  state = IDLE;
  stateStartMs = millis();
  runDurationMs = 0;


  Serial.println();
  Serial.println("========================================");
  Serial.println("IRRIGATION STOPPED");
  Serial.println("Pump: OFF");
  Serial.println("Valve: CLOSED");
  Serial.println("========================================");


  server.send(
    200,
    "application/json",
    "{\"status\":\"ok\",\"state\":\"idle\"}"
  );
}


// ============================================================
// STATUS COMMAND
// ============================================================

void handleStatus()
{
  if (!requireAuth())
  {
    return;
  }


  unsigned long remainingMs = 0;


  if (state == RUNNING || state == MANUAL_PUMP)
  {
    unsigned long elapsed =
      millis() - stateStartMs;

    if (elapsed < runDurationMs)
    {
      remainingMs =
        runDurationMs - elapsed;
    }
  }


  unsigned long remainingSec =
    remainingMs / 1000UL;


  String json =
    "{\"state\":\"" +
    String(stateName(state)) +
    "\",\"remainingSec\":" +
    String(remainingSec) +
    ",\"valveEnabled\":" +
    String(VALVE_ENABLED ? "true" : "false") +
    ",\"pumpPin\":" +
    String(digitalRead(PUMP_CONTROL_PIN)) +
    "}";


  server.send(
    200,
    "application/json",
    json
  );
}


// ============================================================
// PUMP TOGGLE COMMAND (bench only)
// ============================================================

/*
 * /pump?on=1  -> pump ON, auto-off after PUMP_TOGGLE_MAX_MS
 * /pump?on=0  -> pump OFF
 *
 * Bypasses the valve and the OPENING/CLOSING phases. Use it to
 * confirm the transistor drive works before testing the full
 * /irrigate sequence.
 */

void handlePump()
{
  if (!requireAuth())
  {
    return;
  }

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
    // Refuse to interrupt a real irrigation cycle.
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

    state = MANUAL_PUMP;
    stateStartMs = millis();
    runDurationMs = PUMP_TOGGLE_MAX_MS;

    Serial.println();
    Serial.print("MANUAL PUMP ON (auto-off in ");
    Serial.print(PUMP_TOGGLE_MAX_MS / 1000UL);
    Serial.println(" s)");

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
      state = IDLE;
      stateStartMs = millis();
      runDurationMs = 0;
    }

    Serial.println();
    Serial.println("MANUAL PUMP OFF");

    server.send(
      200,
      "application/json",
      "{\"status\":\"ok\",\"state\":\"idle\",\"pump\":\"off\"}"
    );
  }
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
  Serial.println("SMART IRRIGATION NODE — MINI PUMP TEST");
  Serial.println("Agri-Intelligence 2026");
  Serial.println("========================================");


  // ----------------------------------------------------------
  // Configure outputs
  // ----------------------------------------------------------

  pinMode(
    PUMP_CONTROL_PIN,
    OUTPUT
  );

  if (VALVE_ENABLED)
  {
    pinMode(
      VALVE_CONTROL_PIN,
      OUTPUT
    );
  }


  // ----------------------------------------------------------
  // SAFETY INITIALIZATION
  // ----------------------------------------------------------

  // Pump MUST be OFF at startup.
  setPump(false);

  // Valve MUST be CLOSED at startup.
  setValve(false);


  Serial.println("Pump: OFF");

  if (VALVE_ENABLED)
  {
    Serial.println("Valve: CLOSED");
  }
  else
  {
    Serial.println("Valve: DISABLED (pump-only test)");
  }


  // ----------------------------------------------------------
  // Connect to WiFi
  // ----------------------------------------------------------

  WiFi.begin(
    WIFI_SSID,
    WIFI_PASSWORD
  );

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


  // ----------------------------------------------------------
  // mDNS
  // ----------------------------------------------------------

  if (MDNS.begin("irrigation"))
  {
    Serial.println(
      "mDNS started: http://irrigation.local/"
    );
  }


  // ----------------------------------------------------------
  // HTTP ENDPOINTS
  // ----------------------------------------------------------

  server.on(
    "/irrigate",
    HTTP_GET,
    handleIrrigate
  );

  server.on(
    "/stop",
    HTTP_GET,
    handleStop
  );

  server.on(
    "/status",
    HTTP_GET,
    handleStatus
  );

  server.on(
    "/pump",
    HTTP_GET,
    handlePump
  );


  server.begin();

  Serial.println("HTTP server started.");
  Serial.println("Bed 1 mini-pump bench test ready.");
  Serial.println("Pump control: GPIO18 -> 2N2222 -> pump (no relay)");
  Serial.print("Max cycle: ");
  Serial.print(MAX_RUN_SEC);
  Serial.println(" s");
}


// ============================================================
// MAIN LOOP
// ============================================================

void loop()
{
  // Handle incoming WiFi/HTTP requests.
  server.handleClient();


  unsigned long elapsed =
    millis() - stateStartMs;


  // ==========================================================
  // STATE 1: OPENING
  // ==========================================================

  if (
    state == OPENING &&
    (
      !VALVE_ENABLED ||
      elapsed >= VALVE_OPEN_SETTLE_MS
    )
  )
  {
    /*
     * Valve has had enough time to open
     * (or there is no valve in this test).
     *
     * Now start pump.
     */

    setPump(true);

    state = RUNNING;

    stateStartMs = millis();


    Serial.println();
    Serial.println("Pump ON.");
    Serial.println("Irrigation RUNNING.");
  }


  // ==========================================================
  // STATE 2: RUNNING
  // ==========================================================

  else if (
    state == RUNNING &&
    elapsed >= runDurationMs
  )
  {
    /*
     * Requested irrigation duration has finished.
     *
     * Stop pump first.
     */

    setPump(false);

    state = CLOSING;

    stateStartMs = millis();


    Serial.println();
    Serial.println("Irrigation duration complete.");
    Serial.println("Pump OFF.");
  }


  // ==========================================================
  // STATE 3: CLOSING
  // ==========================================================

  else if (
    state == CLOSING &&
    (
      !VALVE_ENABLED ||
      elapsed >= VALVE_CLOSE_DELAY_MS
    )
  )
  {
    /*
     * Pump has been off long enough for pressure
     * in the line to decrease.
     *
     * Now close the valve (no-op if no valve).
     */

    setValve(false);

    state = IDLE;

    stateStartMs = millis();


    Serial.println();
    Serial.println("Bed 1 irrigation cycle COMPLETE.");
    Serial.println("System IDLE.");
    Serial.println();
  }


  // ==========================================================
  // STATE 4: MANUAL PUMP (bench toggle) — auto-off
  // ==========================================================

  else if (
    state == MANUAL_PUMP &&
    elapsed >= runDurationMs
  )
  {
    setPump(false);

    state = IDLE;

    stateStartMs = millis();
    runDurationMs = 0;


    Serial.println();
    Serial.println("MANUAL PUMP auto-off (safety limit).");
  }
}
