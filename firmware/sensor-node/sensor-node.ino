/*
  Smart Irrigation — Sensor + Irrigation Node
  ZAS 2026 — Smart Energy-Driven Irrigation for Agricultural Value Chains

  STEP 2 of the build: first soil moisture sensor (Bed 1 only).

  Wiring (matches WIRING.md / the circuit diagram, Circuit 1):
    Sensor GND -> ESP32 GND
    Sensor VCC -> ESP32 GPIO25   (digital OUTPUT — pulsed HIGH only while reading)
    Sensor AO  -> ESP32 GPIO34   (ADC1 input)

  Purpose: prove the ESP32 can read ONE resistive sensor correctly, using
  the pulsed-power trick (VCC only powered for the few milliseconds of each
  reading, to slow corrosion), before wiring the other two.

  What to do:
    1. Wire ONLY the Bed 1 sensor as above — nothing else connected yet.
    2. Upload this sketch, open Serial Monitor at 115200 baud.
    3. You'll see one raw ADC reading (0-4095) printed every second.
    4. Hold the sensor's probe tips in dry air for a few seconds, note the
       reading. Then dip them in a cup of water (careful — probe tips only,
       not the board), note that reading too. Those two numbers are your
       calibration range for Step 3 (converting raw -> moisture %).

  Report back both numbers (dry and wet) before we move to Step 3, which
  adds the moisture % conversion and the critical/needs-water/optimal
  classification using the same thresholds as the dashboard.
*/

const int SENSOR1_VCC = 25;   // pulses power to the sensor
const int SENSOR1_AO  = 34;   // reads the sensor's analog output

int readSensorRaw(int vccPin, int aoPin) {
  digitalWrite(vccPin, HIGH);
  delay(10);                   // give the sensor a moment to settle
  int raw = analogRead(aoPin);
  digitalWrite(vccPin, LOW);
  return raw;
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("ESP32 sensor node online. Step 2 -- Bed 1 sensor test.");

  pinMode(SENSOR1_VCC, OUTPUT);
  digitalWrite(SENSOR1_VCC, LOW);   // start powered off
  pinMode(SENSOR1_AO, INPUT);
}

void loop() {
  int raw = readSensorRaw(SENSOR1_VCC, SENSOR1_AO);
  Serial.print("Bed 1 raw ADC: ");
  Serial.println(raw);
  delay(1000);
}
