/*
 * ESP32-CAM capture test (AI-Thinker pinout) — no WiFi, no backend
 *
 * The step after camera-id-probe. The probe proves the sensor's
 * control bus (SCCB) works; this proves the image path does too
 * (8 data lines + PCLK/VSYNC/HREF + PSRAM) by actually taking
 * pictures, with the same camera settings as bed1-camera:
 *
 *   1. inits the camera (SVGA JPEG, frame buffer in PSRAM)
 *   2. takes a burst of 10 frames and reports size / speed / failures
 *   3. on 'c' from the Serial Monitor, takes one photo and prints it
 *      as base64 between JPEG_BEGIN / JPEG_END, so a PC script can
 *      save it as a .jpg to look at ('b' repeats the burst, 'r' does
 *      a software restart)
 *
 * Reading the result:
 *   init FAILED 0x105        -> ribbon not seated: run camera-id-probe
 *   init FAILED 0x106        -> wrong pin map (not AI-Thinker) or bad contact
 *   "OK on attempt 2+"       -> the slow-wake problem happened and the
 *                               retry in bed1-camera would have caught it
 *   frames NULL / bad JPEG   -> data lines or PCLK: reseat the ribbon
 *   frames OK but tiny (<5 KB) -> lens covered / dark room / sensor damage
 *   "Brownout detector was triggered" -> supply can't deliver the spike
 *
 * Serial Monitor at 115200.
 */

#include "esp_camera.h"

// AI-Thinker pin map — identical to bed1-camera
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

const int PIN_FLASH = 4;

bool cameraReady = false;

// startXclk / stopXclk / wakeSensor are copied from bed1-camera, so this
// test exercises the same start-up path — see the comment there.
void startXclk()
{
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcAttach(XCLK_GPIO_NUM, 20000000, 1);
  ledcWrite(XCLK_GPIO_NUM, 1);
#else
  ledcSetup(LEDC_CHANNEL_0, 20000000, 1);
  ledcAttachPin(XCLK_GPIO_NUM, LEDC_CHANNEL_0);
  ledcWrite(LEDC_CHANNEL_0, 1);
#endif
}

void stopXclk()
{
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcDetach(XCLK_GPIO_NUM);
#else
  ledcDetachPin(XCLK_GPIO_NUM);
#endif
}

void wakeSensor()
{
  pinMode(PWDN_GPIO_NUM, OUTPUT);
  digitalWrite(PWDN_GPIO_NUM, HIGH);   // HIGH = sensor powered down
  delay(50);
  digitalWrite(PWDN_GPIO_NUM, LOW);
  startXclk();
  delay(100);
  stopXclk();                          // esp_camera_init takes the clock over
}

bool initCamera()
{
  camera_config_t config = {};
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk  = XCLK_GPIO_NUM;
  config.pin_pclk  = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href  = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn  = -1;               // wakeSensor() owns PWDN_GPIO_NUM
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size   = FRAMESIZE_SVGA;
  config.jpeg_quality = 12;
  config.fb_count     = 1;
  config.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;

  if (psramFound()) {
    config.fb_location = CAMERA_FB_IN_PSRAM;
  } else {
    Serial.println("WARNING: no PSRAM - dropping to VGA. Check Tools -> PSRAM.");
    config.fb_location  = CAMERA_FB_IN_DRAM;
    config.frame_size   = FRAMESIZE_VGA;
    config.jpeg_quality = 14;
  }

  // Same retry policy as bed1-camera. The attempt count shows up in the
  // log, so "OK on attempt 2+" means the slow-wake problem happened and
  // the retry caught it.
  esp_err_t err = ESP_FAIL;
  for (int attempt = 1; attempt <= 5; attempt++) {
    wakeSensor();
    err = esp_camera_init(&config);
    if (err == ESP_OK) {
      sensor_t* s = esp_camera_sensor_get();
      Serial.printf("camera init OK on attempt %d (at %lu ms), sensor PID 0x%02X\n",
                    attempt, millis(), s->id.PID);
      return true;
    }
    Serial.printf("init attempt %d FAILED 0x%x (at %lu ms)\n", attempt, err, millis());
    delay(500);
  }
  return false;
}

// A valid JPEG starts with FF D8 and ends with FF D9. Anything else
// means bytes were lost on the data lines mid-frame.
bool jpegLooksValid(const camera_fb_t* fb)
{
  return fb->len > 4
      && fb->buf[0] == 0xFF && fb->buf[1] == 0xD8
      && fb->buf[fb->len - 2] == 0xFF && fb->buf[fb->len - 1] == 0xD9;
}

void burst()
{
  Serial.println("\n---- burst: 10 frames ----");
  int ok = 0, bad = 0;
  size_t minLen = SIZE_MAX, maxLen = 0;
  unsigned long t0 = millis();

  for (int i = 0; i < 10; i++) {
    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) {
      Serial.printf("frame %d: NULL (capture failed)\n", i);
      continue;
    }
    bool valid = jpegLooksValid(fb);
    Serial.printf("frame %d: %u bytes, %ux%u%s\n",
                  i, fb->len, fb->width, fb->height, valid ? "" : "  BAD JPEG");
    if (valid) ok++; else bad++;
    if (fb->len < minLen) minLen = fb->len;
    if (fb->len > maxLen) maxLen = fb->len;
    esp_camera_fb_return(fb);
  }

  float secs = (millis() - t0) / 1000.0f;
  Serial.printf("BURST RESULT: %d/10 good, %d bad JPEG, %d NULL, %u-%u bytes, %.1f fps\n",
                ok, bad, 10 - ok - bad,
                ok + bad ? minLen : 0, maxLen, 10 / secs);
}

static const char B64[] =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Streams base64 in 76-char lines so nothing big has to sit in RAM.
void printBase64(const uint8_t* data, size_t len)
{
  char line[77];
  size_t n = 0;
  for (size_t i = 0; i < len; i += 3) {
    uint32_t v = (uint32_t)data[i] << 16;
    if (i + 1 < len) v |= (uint32_t)data[i + 1] << 8;
    if (i + 2 < len) v |= data[i + 2];
    line[n++] = B64[(v >> 18) & 63];
    line[n++] = B64[(v >> 12) & 63];
    line[n++] = i + 1 < len ? B64[(v >> 6) & 63] : '=';
    line[n++] = i + 2 < len ? B64[v & 63] : '=';
    if (n == 76) {
      line[n] = 0;
      Serial.println(line);
      n = 0;
    }
  }
  if (n) {
    line[n] = 0;
    Serial.println(line);
  }
}

void sendPhoto()
{
  // With one frame buffer the first get returns a frame captured
  // when the last one was returned — throw it away (see bed1-camera).
  camera_fb_t* fb = esp_camera_fb_get();
  if (fb) esp_camera_fb_return(fb);
  delay(150);
  fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("PHOTO FAILED: capture returned NULL");
    return;
  }
  Serial.printf("JPEG_BEGIN %u %ux%u\n", fb->len, fb->width, fb->height);
  printBase64(fb->buf, fb->len);
  Serial.println("JPEG_END");
  esp_camera_fb_return(fb);
}

void setup()
{
  pinMode(PIN_FLASH, OUTPUT);
  digitalWrite(PIN_FLASH, LOW);

  Serial.begin(115200);
  delay(300);
  Serial.println("\n=== ESP32-CAM capture test ===");
  Serial.printf("PSRAM: %s, %u bytes free\n",
                psramFound() ? "found" : "NOT FOUND", ESP.getFreePsram());

  cameraReady = initCamera();
  if (cameraReady) burst();
  Serial.println("READY - send 'c' for a photo, 'b' for another burst");
}

void loop()
{
  if (!Serial.available()) return;
  char cmd = Serial.read();
  if (cmd == 'r') {
    // The restart bed1-camera does after a failed init — the path that
    // once stayed stuck on 0x106 for 20 boots in a row.
    Serial.println("software restart (ESP.restart)");
    delay(100);
    ESP.restart();
  }
  if (!cameraReady) {
    Serial.println("camera not initialised - see error above");
    return;
  }
  if (cmd == 'c') sendPhoto();
  else if (cmd == 'b') burst();
}
