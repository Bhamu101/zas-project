/*
 * ESP32-CAM sensor ID probe (AI-Thinker pinout)
 *
 * Diagnoses "Camera probe failed with error 0x106 (not supported)" /
 * 0x105 (not found) by talking to the sensor directly over its SCCB
 * (I2C-like) bus, without the camera driver:
 *
 *   1. powers the sensor up (PWDN low) and feeds it the 20 MHz XCLK
 *      it needs before it will answer at all
 *   2. scans the bus and reports which address answers
 *   3. reads the chip ID registers for the sensors that live there
 *
 * Repeats every 5 s, so you can reseat the ribbon (power OFF first!)
 * and compare runs. Serial Monitor at 115200.
 *
 * Reading the result:
 *   OV2640 answers at 0x30 with PID 0x26 0x41/0x42, MID 0x7F 0xA2.
 *   Same wrong ID every run      -> genuinely a different sensor.
 *   ID changes / 0x00 / 0xFF     -> bad contact (ribbon/connector) or power.
 *   Nothing answers              -> ribbon not seated, or sensor dead.
 */

#include <Wire.h>

const int PIN_PWDN  = 32;
const int PIN_XCLK  = 0;
const int PIN_SDA   = 26;
const int PIN_SCL   = 27;
const int PIN_FLASH = 4;

void startXclk()
{
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcAttach(PIN_XCLK, 20000000, 1);
  ledcWrite(PIN_XCLK, 1);
#else
  ledcSetup(0, 20000000, 1);
  ledcAttachPin(PIN_XCLK, 0);
  ledcWrite(0, 1);
#endif
}

// SCCB wants a STOP between the address write and the read (no repeated start).
int read8(uint8_t addr, uint8_t reg)
{
  Wire.beginTransmission(addr);
  Wire.write(reg);
  if (Wire.endTransmission(true) != 0) return -1;
  if (Wire.requestFrom((int)addr, 1) != 1) return -1;
  return Wire.read();
}

int read16reg(uint8_t addr, uint16_t reg)
{
  Wire.beginTransmission(addr);
  Wire.write(reg >> 8);
  Wire.write(reg & 0xFF);
  if (Wire.endTransmission(true) != 0) return -1;
  if (Wire.requestFrom((int)addr, 1) != 1) return -1;
  return Wire.read();
}

bool write8(uint8_t addr, uint8_t reg, uint8_t val)
{
  Wire.beginTransmission(addr);
  Wire.write(reg);
  Wire.write(val);
  return Wire.endTransmission(true) == 0;
}

void probe()
{
  Serial.println("\n---- scanning camera bus ----");
  int found = 0;
  for (uint8_t a = 0x08; a < 0x78; a++) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission(true) == 0) {
      Serial.printf("device answers at 0x%02X\n", a);
      found++;
    }
  }
  if (!found) {
    Serial.println("NOTHING answered. Ribbon not seated / wrong way round, or sensor dead.");
    return;
  }

  // OV2640 / OV7725 / OV7670-family at 0x30 (8-bit registers)
  {
    write8(0x30, 0xFF, 0x01);  // OV2640: select sensor register bank
    int pidh = read8(0x30, 0x0A), pidl = read8(0x30, 0x0B);
    int midh = read8(0x30, 0x1C), midl = read8(0x30, 0x1D);
    if (pidh >= 0) {
      Serial.printf("@0x30  PID=0x%02X 0x%02X  MID=0x%02X 0x%02X", pidh, pidl, midh, midl);
      if (pidh == 0x26 && (pidl == 0x41 || pidl == 0x42)) Serial.print("  -> genuine OV2640, sensor OK");
      else if (pidh == 0x77) Serial.print("  -> OV7725");
      Serial.println();
    }
  }

  // OV3660 / OV5640 at 0x3C (16-bit registers)
  int h = read16reg(0x3C, 0x300A), l = read16reg(0x3C, 0x300B);
  if (h >= 0) Serial.printf("@0x3C  ID=0x%02X 0x%02X  (0x36 0x60=OV3660, 0x56 0x40=OV5640)\n", h, l);

  // GC2145 at 0x3C (8-bit), GC0308 / GC032A at 0x21
  int g1 = read8(0x3C, 0xF0), g2 = read8(0x3C, 0xF1);
  if (g1 >= 0) Serial.printf("@0x3C  GC ID=0x%02X 0x%02X  (0x21 0x45=GC2145)\n", g1, g2);
  int g3 = read8(0x21, 0x00);
  if (g3 >= 0) Serial.printf("@0x21  ID=0x%02X  (0x9B=GC0308, 0x23=GC032A)\n", g3);
}

void setup()
{
  pinMode(PIN_FLASH, OUTPUT);
  digitalWrite(PIN_FLASH, LOW);

  Serial.begin(115200);
  delay(300);
  Serial.println("\n=== ESP32-CAM sensor ID probe ===");

  pinMode(PIN_PWDN, OUTPUT);
  digitalWrite(PIN_PWDN, HIGH);   // power-cycle the sensor
  delay(50);
  digitalWrite(PIN_PWDN, LOW);    // LOW = sensor ON
  startXclk();
  delay(100);

  Wire.begin(PIN_SDA, PIN_SCL, 100000);
}

void loop()
{
  probe();
  delay(5000);
}
