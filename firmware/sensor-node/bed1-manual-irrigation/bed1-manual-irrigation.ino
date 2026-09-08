/*
  Smart Irrigation — Sensor + Irrigation Node
  ZAS 2026 — Smart Energy-Driven Irrigation for Agricultural Value Chains

  Bed 1 manual irrigation over WiFi — pump + valve, one bed.

  Pump: STURDY DC Submersible Pump, model ZQB-12V, 180W @ 12V (~15A),
  wiring red = (+), blue = (-).

  Pump drive circuit (2N2222 transistor pilots the automotive relay, replaces
  the earlier "10A relay module pilots the automotive relay" approach):
    ESP32 GPIO18 -> 220 ohm resistor -> 2N2222 base
    2N2222 emitter -> common ground
    2N2222 collector -> automotive relay pin 85 (coil -)
    Automotive relay pin 86 (coil +) -> fused 12V battery positive
    1N4007 flyback diode across the coil: cathode (banded end) -> pin 86,
      anode -> pin 85 / collector -- protects the transistor from the coil's
      turn-off voltage spike
    Automotive relay pin 30 -> fused 12V battery positive (high current in)
    Automotive relay pin 87 -> pump red (+) lead
    Pump blue (-) lead -> common ground
  This circuit is active-HIGH: GPIO18 HIGH turns the pump relay on. That's
  the OPPOSITE polarity from the cheap 2-channel relay module still used for
  the valve below (which is active-LOW on most boards) -- setPump()/setValve()
  each carry their own polarity so this is handled correctly in software.
  See BED1-MANUAL-IRRIGATION-WIRING.md for the full diagram and parts list.

  Valve (unchanged): still the cheap 2-channel relay module, channel 2.
    Relay module IN2 -> ESP32 GPIO19
    Relay module VCC -> ESP32 5V
    Relay module GND -> common ground
    Relay module CH2 COM -> fused 12V battery positive
    Relay module CH2 NO -> valve lead 1; valve lead 2 -> common ground
  (Module channel 1 is no longer used now that the pump is transistor-driven
  -- keep it as a spare, or repurpose it for a future bed's valve.)

  Sequencing: opens the valve, waits briefly for it to fully seat before
  starting the pump (avoids the pump pushing against a still-closing
  valve), runs for the requested duration, stops the pump, then waits
  before closing the valve so the line can depressurize. Mirrors the
  order described in PROJECT-OBJECTIVES.md's automation logic, just
  triggered manually instead of by a soil-moisture reading.

  Endpoints:
    GET http://irrigation.local/irrigate?sec=30
      -> runs the full open-valve -> pump -> stop -> close-valve cycle.
         Returns 409 if a cycle is already running.
    GET http://irrigation.local/stop
      -> aborts immediately: pump off, valve closed, no settle delay.
    GET http://irrigation.local/status
      -> {"state":"idle|opening|running|closing","remainingSec":N}

  Safety:
  - MAX_RUN_SEC hard-caps how long the pump can run per request, so a
    dropped WiFi connection mid-request can't leave the pump running
    unattended. Currently 7200s (120 min), matching the mobile app's manual
    duration stepper max -- lower it back down (e.g. 60s) if bench-testing
    this new pump circuit for the first time.
  - Test with the pump submerged in a bucket of water, not plumbed into
    a real bed, until the sequencing above has been verified.
  - Double-check the 1N4007's orientation (cathode/banded end toward the
    +12V side, pin 86) before powering on -- backwards, it short-circuits
    the coil supply instead of protecting the transistor.
*/

#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>

const char* WIFI_SSID     = "Hotspot";
const char* WIFI_PASSWORD = "anesu123";

const int PUMP_RELAY  = 18;   // 2N2222 -> automotive relay coil (active-HIGH)
const int VALVE_RELAY = 19;   // cheap relay module, channel 2 (active-LOW)
const bool VALVE_ACTIVE_LOW = true;

const unsigned long VALVE_SETTLE_MS = 500;   // time to let the valve fully open/close
const int MAX_RUN_SEC = 7200;                // hard safety cap (120 min), regardless of requested duration

WebServer server(80);

enum IrrigationState { IDLE, OPENING, RUNNING, CLOSING };
IrrigationState state = IDLE;
unsigned long stateStartMs = 0;
unsigned long runDurationMs = 0;

// Direct NPN low-side drive: GPIO HIGH -> base current flows -> transistor
// saturates -> collector pulls the relay coil's return to ~GND -> relay
// energizes. No inversion.
void setPump(bool on) {
  digitalWrite(PUMP_RELAY, on ? HIGH : LOW);
}

// Cheap relay module channel: most boards energize on LOW.
void setValve(bool on) {
  bool level = VALVE_ACTIVE_LOW ? !on : on;
  digitalWrite(VALVE_RELAY, level ? HIGH : LOW);
}

const char* stateName(IrrigationState s) {
  switch (s) {
    case IDLE:    return "idle";
    case OPENING: return "opening";
    case RUNNING: return "running";
    case CLOSING: return "closing";
  }
  return "unknown";
}

void handleIrrigate() {
  if (state != IDLE) {
    server.send(409, "application/json", "{\"status\":\"error\",\"detail\":\"already irrigating\"}");
    return;
  }

  int sec = 30;
  if (server.hasArg("sec")) {
    sec = server.arg("sec").toInt();
  }
  sec = constrain(sec, 1, MAX_RUN_SEC);
  runDurationMs = (unsigned long)sec * 1000UL;

  setValve(true);
  state = OPENING;
  stateStartMs = millis();

  Serial.printf("Bed 1 irrigation started: valve opening, will run pump for %d s\n", sec);

  String json = "{\"status\":\"ok\",\"state\":\"opening\",\"durationSec\":" + String(sec) + "}";
  server.send(200, "application/json", json);
}

void handleStop() {
  setPump(false);
  setValve(false);
  state = IDLE;
  Serial.println("Bed 1 irrigation stopped manually");
  server.send(200, "application/json", "{\"status\":\"ok\",\"state\":\"idle\"}");
}

void handleStatus() {
  unsigned long remainingMs = 0;
  if (state == RUNNING) {
    unsigned long elapsed = millis() - stateStartMs;
    remainingMs = (elapsed < runDurationMs) ? (runDurationMs - elapsed) : 0;
  }
  String json = "{\"state\":\"" + String(stateName(state)) + "\",\"remainingSec\":" +
                String(remainingMs / 1000) + "}";
  server.send(200, "application/json", json);
}

void setup() {
  Serial.begin(115200);
  pinMode(PUMP_RELAY, OUTPUT);
  pinMode(VALVE_RELAY, OUTPUT);
  setPump(false);
  setValve(false);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected. IP address: ");
  Serial.println(WiFi.localIP());

  if (MDNS.begin("irrigation")) {
    Serial.println("mDNS responder started: http://irrigation.local/");
  }

  server.on("/irrigate", handleIrrigate);
  server.on("/stop", handleStop);
  server.on("/status", handleStatus);
  server.begin();
  Serial.println("HTTP server started. Bed 1 manual irrigation ready.");
}

void loop() {
  server.handleClient();

  unsigned long elapsed = millis() - stateStartMs;

  if (state == OPENING && elapsed >= VALVE_SETTLE_MS) {
    setPump(true);
    state = RUNNING;
    stateStartMs = millis();
    Serial.println("Valve open, pump ON");
  } else if (state == RUNNING && elapsed >= runDurationMs) {
    setPump(false);
    state = CLOSING;
    stateStartMs = millis();
    Serial.println("Pump OFF, valve closing");
  } else if (state == CLOSING && elapsed >= VALVE_SETTLE_MS) {
    setValve(false);
    state = IDLE;
    Serial.println("Valve closed. Cycle complete.");
  }
}
