/*
 * ============================================================
 * SMART IRRIGATION — SENSOR + IRRIGATION NODE
 *
 * Agri-Intelligence 2026 — Smart Energy-Driven Irrigation for Agricultural
 * Value Chains
 *
 * ARCHITECTURE
 * ------------------------------------------------------------
 * One solenoid valve + movable gantry.
 * Only one irrigation bed is watered at a time.
 *
 * PUMP:
 *   STURDY DC Submersible Pump
 *   Model: ZQB-12V
 *   180 W @ 12 V ≈ 15 A
 *   Red  = Pump +
 *   Blue = Pump -
 *
 * PUMP CONTROL:
 *   ESP32 GPIO18
 *       |
 *      220 Ω
 *       |
 *   2N2222 Base
 *
 *   2N2222 Emitter   -> Common GND
 *   2N2222 Collector -> Automotive Relay pin 85
 *   Automotive Relay pin 86 -> FUSED +12 V
 *
 *   1N4007 across relay coil:
 *       Cathode / band -> pin 86 (+12 V)
 *       Anode          -> pin 85 / transistor collector
 *
 *   Automotive Relay pin 30 -> FUSED +12 V
 *   Automotive Relay pin 87 -> Pump red (+)
 *   Pump blue (-)            -> Battery -
 *
 *   GPIO18 HIGH = pump ON
 *   GPIO18 LOW  = pump OFF
 *
 * VALVE CONTROL:
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
 * K1 / CHANNEL 1:
 *   NOT USED.
 *
 * IRRIGATION SEQUENCE:
 *   1. Open valve
 *   2. Wait for valve to open
 *   3. Start pump
 *   4. Run for requested duration
 *   5. Stop pump
 *   6. Wait for line to depressurize
 *   7. Close valve
 *
 * ENDPOINTS:
 *
 *   /irrigate?sec=30&key=SECRET
 *       Start irrigation cycle.
 *
 *   /stop?key=SECRET
 *       Immediately stop pump and close valve.
 *
 *   /status?key=SECRET
 *       Return current state and remaining time.
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
// HIGH = transistor ON = automotive relay ON = pump ON.
const int PUMP_CONTROL_PIN = 18;

// GPIO19 controls K2 / IN2 of the 2-channel relay module.
// Relay module is assumed ACTIVE-LOW.
const int VALVE_CONTROL_PIN = 19;


// ============================================================
// VALVE RELAY POLARITY
// ============================================================

const bool VALVE_ACTIVE_LOW = true;


// ============================================================
// TIMING / SAFETY
// ============================================================

// Time allowed for solenoid valve to open before pump starts.
const unsigned long VALVE_OPEN_SETTLE_MS = 1000;

// Time allowed after pump stops before closing valve.
const unsigned long VALVE_CLOSE_DELAY_MS = 1000;

// Maximum pump running time.
// 7200 seconds = 120 minutes.
const unsigned long MAX_RUN_SEC = 7200;


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
  CLOSING
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
 * 2N2222 Collector -> Relay 85
 * Relay 86 -> +12 V
 *
 * GPIO18 HIGH:
 *   transistor ON
 *   relay coil energized
 *   relay 30 connects to 87
 *   pump receives +12 V
 *
 * GPIO18 LOW:
 *   transistor OFF
 *   relay releases
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
 */

void setValve(bool open)
{
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

  // Do not allow another cycle while one is already running.
  if (state != IDLE)
  {
    server.send(
      409,
      "application/json",
      "{\"status\":\"error\",\"detail\":\"already irrigating\"}"
    );

    return;
  }


  // Default irrigation duration = 30 seconds.
  unsigned long seconds = 30;


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
  // Open valve first.
  // ----------------------------------------------------------

  setPump(false);

  setValve(true);


  state = OPENING;
  stateStartMs = millis();


  Serial.println();
  Serial.println("========================================");
  Serial.println("BED 1 IRRIGATION STARTED");
  Serial.println("========================================");

  Serial.print("Requested duration: ");
  Serial.print(seconds);
  Serial.println(" seconds");

  Serial.println("Valve: OPENING");
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


  if (state == RUNNING)
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
    "}";


  server.send(
    200,
    "application/json",
    json
  );
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
  Serial.println("SMART IRRIGATION NODE");
  Serial.println("Agri-Intelligence 2026");
  Serial.println("========================================");


  // ----------------------------------------------------------
  // Configure outputs
  // ----------------------------------------------------------

  pinMode(
    PUMP_CONTROL_PIN,
    OUTPUT
  );

  pinMode(
    VALVE_CONTROL_PIN,
    OUTPUT
  );


  // ----------------------------------------------------------
  // SAFETY INITIALIZATION
  // ----------------------------------------------------------

  // Pump MUST be OFF at startup.
  setPump(false);

  // Valve MUST be CLOSED at startup.
  setValve(false);


  Serial.println("Pump: OFF");
  Serial.println("Valve: CLOSED");


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


  server.begin();

  Serial.println("HTTP server started.");
  Serial.println("Bed 1 manual irrigation ready.");
  Serial.println("Pump control: GPIO18");
  Serial.println("Valve control: GPIO19 / K2");
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
    elapsed >= VALVE_OPEN_SETTLE_MS
  )
  {
    /*
     * Valve has had enough time to open.
     *
     * Now start pump.
     */

    setPump(true);

    state = RUNNING;

    stateStartMs = millis();


    Serial.println();
    Serial.println("Valve open.");
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
    Serial.println("Waiting before valve closes.");
  }


  // ==========================================================
  // STATE 3: CLOSING
  // ==========================================================

  else if (
    state == CLOSING &&
    elapsed >= VALVE_CLOSE_DELAY_MS
  )
  {
    /*
     * Pump has been off long enough for pressure
     * in the line to decrease.
     *
     * Now close the valve.
     */

    setValve(false);

    state = IDLE;

    stateStartMs = millis();


    Serial.println();
    Serial.println("Valve CLOSED.");
    Serial.println("Bed 1 irrigation cycle COMPLETE.");
    Serial.println("System IDLE.");
    Serial.println();
  }
}
