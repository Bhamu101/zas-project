/*
 * ============================================================
 * SMART IRRIGATION — BED 1 CAMERA NODE (ESP32-CAM)
 *
 * Agri-Intelligence 2026 — Smart Energy-Driven Irrigation for Agricultural
 * Value Chains
 *
 * WHAT THIS IS
 * ------------------------------------------------------------
 * An AI-Thinker ESP32-CAM (OV2640) on the stand, looking down
 * at Bed 1. It takes a photo on a schedule and uploads it to
 * the backend, which stores it in Supabase Storage. The
 * dashboard and mobile app show the latest photo plus a
 * scrollable history (a free time-lapse of the crop).
 *
 * It is a SEPARATE board from Bed 1's irrigation ESP32 on
 * purpose: the camera uses nearly every GPIO, and its current
 * spikes would brown out a board that also switches a pump.
 *
 * NO INBOUND CONNECTIONS
 *   This node never runs a web server. It only makes outbound
 *   HTTPS requests to the backend, so it works on any WiFi —
 *   no tunnel, no port forwarding, no LAN IP to track:
 *
 *     every PENDING_POLL_MS   GET  /api/camera/1/pending
 *                             ("did someone tap Take photo,
 *                              or did an irrigation cycle end?")
 *     every CAPTURE_INTERVAL  POST /api/camera/1/frames  (JPEG)
 *
 *   Both carry X-Camera-Key: SHARED_SECRET, which must equal
 *   CAMERA_SHARED_SECRET in the backend's .env / Render.
 *
 * ------------------------------------------------------------
 * BOARD — AI-Thinker ESP32-CAM, OV2640, 4 MB PSRAM
 *   Arduino IDE:  Tools -> Board -> "AI Thinker ESP32-CAM"
 *                 Tools -> PSRAM -> Enabled (if listed)
 *                 Tools -> Partition Scheme -> "Huge APP"
 *
 * FLASHING WITH A USB-TTL (FTDI) ADAPTER — the board has no USB
 *   FTDI GND -> ESP32-CAM GND
 *   FTDI 5V  -> ESP32-CAM 5V      (NOT 3V3 — see POWER)
 *   FTDI TX  -> ESP32-CAM U0R
 *   FTDI RX  -> ESP32-CAM U0T
 *   IO0      -> GND               (ONLY while flashing)
 *
 *   1. Wire as above including IO0->GND, press the RST button
 *      on the back (or power-cycle). The board is now in
 *      download mode.
 *   2. Upload. When it says "Hard resetting", remove the
 *      IO0->GND wire and press RST again. It now runs the
 *      sketch; Serial Monitor at 115200 shows progress.
 *   "Failed to connect ... Timed out waiting for packet
 *   header" = IO0 wasn't grounded at reset, or TX/RX swapped.
 *
 * POWER — the #1 cause of ESP32-CAM problems
 *   WiFi TX + camera capture pull ~300+ mA spikes. On a weak
 *   supply the board resets with "Brownout detector was
 *   triggered", often only when it starts WiFi. Fixes:
 *     - Feed the 5V pin, never 3V3.
 *     - A proper 5 V / 1 A+ supply once deployed. Some FTDI
 *       adapters can't deliver the spike; if it brownouts on
 *       the bench, power it from a USB charger's 5 V instead
 *       (keep GNDs common with the FTDI for Serial).
 *     - 470-1000 uF electrolytic across 5V/GND at the board.
 *     - NEVER share the rail with the pump or relay module.
 *   The brownout detector is deliberately left ON: turning it
 *   off (a common forum "fix") only hides a bad supply until
 *   the flash gets corrupted.
 *
 * FLASH LED (GPIO4) is forced OFF. It's bright, runs hot, and
 *   only lights the bed a few cm in front of it anyway.
 *
 * ANTENNA — PCB antenna by default. If the stand is far from
 *   the router, boards with an IPEX socket can take an external
 *   antenna, but a 0-ohm resistor next to the socket must be
 *   moved to select it.
 *
 * MOUNTING — keep rain and irrigation spray off the board, aim
 *   the lens away from the sun (glare and heat), and leave a
 *   small vent so the lens doesn't fog.
 * ============================================================
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>
#include "esp_camera.h"

// ============================================================
// WIFI / BACKEND
// ============================================================

// WiFi credentials and the backend shared secret live in secrets.h,
// which is gitignored. Copy secrets.h.example to secrets.h and fill it in.
#include "secrets.h"

// No trailing slash. Use the Render URL so it works anywhere;
// for a backend on this PC use e.g. "http://192.168.1.10:8021".
const char* BACKEND_URL = "https://zas-irrigation-api-nmzs.onrender.com";
const int   BED_ID      = 1;


// ============================================================
// TIMING
// ============================================================

const unsigned long CAPTURE_INTERVAL_MS = 30UL * 60UL * 1000UL;  // scheduled photo
const unsigned long PENDING_POLL_MS     = 20UL * 1000UL;         // "take one now?" check
const unsigned long RETRY_MS            = 60UL * 1000UL;         // after a failed upload

// Render's free tier sleeps after 15 min idle and takes 30-60 s
// to wake. The 20 s pending poll keeps it awake in practice,
// but the first request after a deploy can still be slow.
const uint16_t HTTP_TIMEOUT_MS = 45000;

// Skip SCHEDULED photos at night — they're just black frames.
// Requested / post-irrigation photos are always taken.
// Times are local (Zimbabwe, CAT = UTC+2). If NTP hasn't synced
// yet the node can't tell the time, so it just takes the photo.
const bool NIGHT_SKIP       = true;
const int  NIGHT_START_HOUR = 19;
const int  NIGHT_END_HOUR   = 6;
const long UTC_OFFSET_SEC   = 2 * 3600;

// Self-heal: an unattended node that keeps failing is usually
// stuck (camera bus or WiFi stack); a reboot fixes most of it.
const int MAX_CONSECUTIVE_FAILURES = 10;


// ============================================================
// CAMERA — AI-Thinker pin map (do not change for this board)
// ============================================================

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

#define FLASH_LED_PIN      4

// SVGA (800x600) at quality 12 is ~40-90 KB: plenty of detail
// to see leaves, small enough to upload on a weak signal. The
// backend rejects anything over 1 MB.
const framesize_t FRAME_SIZE   = FRAMESIZE_SVGA;
const int         JPEG_QUALITY = 12;   // 0-63, lower = better/bigger

// If the image comes out upside down / mirrored on the stand,
// flip these rather than remounting the board.
const bool FLIP_VERTICAL   = false;
const bool MIRROR_HORIZONTAL = false;


// ============================================================
// STATE
// ============================================================

unsigned long lastCaptureAt = 0;
unsigned long nextCaptureDelay = 0;   // 0 = capture on first loop ("boot" photo)
unsigned long lastPollAt = 0;
bool bootPhotoPending = true;
int consecutiveFailures = 0;


// ============================================================
// CAMERA
// ============================================================

// Tries per boot before falling back to a reboot (see wakeSensor).
const int CAMERA_INIT_ATTEMPTS = 5;

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

// The driver's own wake is PWDN high 10 ms, low 10 ms, then read the
// chip ID. On this board that is sometimes too short: the OV2640
// returns a wrong ID, init fails 0x106 "not supported", and since a
// reboot repeats the same 10 ms wake it can fail every boot until the
// board is unplugged (seen 2026-09-29: 20 reboots in a row). The
// slower wake in camera-id-probe — 50 ms down, then 100 ms with the
// clock running — read the ID correctly every time, so do exactly
// that here, and keep PWDN away from the driver (pin_pwdn = -1 in
// initCamera) so its quick toggle can't undo it.
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
  config.frame_size   = FRAME_SIZE;
  config.jpeg_quality = JPEG_QUALITY;
  config.fb_count     = 1;
  config.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;

  if (psramFound()) {
    config.fb_location = CAMERA_FB_IN_PSRAM;
  } else {
    // No PSRAM (or PSRAM disabled in Tools): SVGA won't fit.
    Serial.println("[cam] WARNING: no PSRAM - dropping to VGA. Check Tools -> PSRAM.");
    config.fb_location  = CAMERA_FB_IN_DRAM;
    config.frame_size   = FRAMESIZE_VGA;
    config.jpeg_quality = 14;
  }

  esp_err_t err = ESP_FAIL;
  int attempt = 0;
  while (err != ESP_OK && attempt < CAMERA_INIT_ATTEMPTS) {
    attempt++;
    wakeSensor();
    err = esp_camera_init(&config);
    if (err != ESP_OK) {
      Serial.printf("[cam] init attempt %d failed 0x%x\n", attempt, err);
      delay(500);
    }
  }
  if (err != ESP_OK) {
    // 0x105/0x20001 on every attempt is almost always the ribbon
    // cable: reseat it fully in the connector and close the latch.
    // Run camera-id-probe to see what the sensor answers.
    Serial.printf("[cam] init FAILED 0x%x - check the ribbon cable is fully seated\n", err);
    return false;
  }

  sensor_t* s = esp_camera_sensor_get();
  s->set_vflip(s, FLIP_VERTICAL ? 1 : 0);
  s->set_hmirror(s, MIRROR_HORIZONTAL ? 1 : 0);
  s->set_whitebal(s, 1);
  s->set_awb_gain(s, 1);
  s->set_exposure_ctrl(s, 1);
  s->set_gain_ctrl(s, 1);
  s->set_lenc(s, 1);        // lens shading correction: evens out the corners
  Serial.printf("[cam] ready (attempt %d)\n", attempt);
  return true;
}

// With one frame buffer the driver refills it as soon as it's
// returned, so the NEXT fb_get() hands back a frame captured
// back then — up to CAPTURE_INTERVAL old. Throw that one away
// and keep the second, which is taken now. Auto-exposure also
// settles better on the second frame.
camera_fb_t* captureFresh()
{
  camera_fb_t* stale = esp_camera_fb_get();
  if (stale) esp_camera_fb_return(stale);
  delay(150);
  return esp_camera_fb_get();
}


// ============================================================
// WIFI / HTTP
// ============================================================

void ensureWifi()
{
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[wifi] connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  // The default is a fast scan that joins the FIRST matching access
  // point, channel 1 upward. Where one network has several APs (a hub,
  // mesh, extenders) that can be a far one: seen 2026-09-29 joining a
  // TelOne AP at -89 dBm while the nearest one was -69 on channel 11.
  // Scan every channel and take the loudest instead.
  WiFi.setScanMethod(WIFI_ALL_CHANNEL_SCAN);
  WiFi.setSortMethod(WIFI_CONNECT_AP_BY_SIGNAL);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[wifi] connected, IP %s, RSSI %d dBm (AP %s, ch %d)\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI(),
                  WiFi.BSSIDstr().c_str(), WiFi.channel());
    configTime(UTC_OFFSET_SEC, 0, "pool.ntp.org", "time.google.com");
  } else {
    Serial.println("\n[wifi] FAILED - will retry");
  }
}

// HTTPS without pinning the server's certificate. Traffic is
// still encrypted; what's skipped is checking WHO answers. For
// a camera posting photos of a vegetable bed that's a fair
// trade against a root CA that would need re-flashing when
// Render rotates it. The shared secret still gates the backend.
bool beginRequest(HTTPClient& http, WiFiClientSecure& tls, WiFiClient& plain, const String& url)
{
  bool ok = url.startsWith("https://") ? http.begin(tls, url) : http.begin(plain, url);
  if (!ok) return false;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("X-Camera-Key", SHARED_SECRET);
  http.addHeader("X-Camera-RSSI", String(WiFi.RSSI()));
  return true;
}

// Returns the reason if a capture is pending, "" if not. `ok`
// reports whether the backend answered at all.
String checkPending(bool& ok)
{
  WiFiClientSecure tls; tls.setInsecure();
  WiFiClient plain;
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/camera/" + BED_ID + "/pending";
  ok = false;
  if (!beginRequest(http, tls, plain, url)) return "";

  int code = http.GET();
  String body = code > 0 ? http.getString() : "";
  http.end();
  if (code != 200) {
    Serial.printf("[poll] HTTP %d %s\n", code, code < 0 ? http.errorToString(code).c_str() : body.c_str());
    return "";
  }
  ok = true;
  if (body.indexOf("\"capture\":true") < 0) return "";
  // Pull "reason":"..." out without a JSON library.
  int r = body.indexOf("\"reason\":\"");
  if (r < 0) return "requested";
  r += 10;
  int end = body.indexOf('"', r);
  return end > r ? body.substring(r, end) : String("requested");
}

bool uploadPhoto(const char* reason)
{
  camera_fb_t* fb = captureFresh();
  if (!fb) {
    Serial.println("[cam] capture FAILED");
    return false;
  }
  Serial.printf("[cam] %u bytes (%s) -> uploading\n", fb->len, reason);

  WiFiClientSecure tls; tls.setInsecure();
  WiFiClient plain;
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/camera/" + BED_ID + "/frames?reason=" + reason;
  bool ok = false;
  if (beginRequest(http, tls, plain, url)) {
    http.addHeader("Content-Type", "image/jpeg");
    int code = http.POST(fb->buf, fb->len);
    String body = code > 0 ? http.getString() : "";
    if (code == 200) {
      ok = true;
      Serial.printf("[up] stored: %s\n", body.c_str());
    } else {
      Serial.printf("[up] HTTP %d %s\n", code, code < 0 ? http.errorToString(code).c_str() : body.c_str());
      if (code == 401) Serial.println("[up] -> SHARED_SECRET doesn't match CAMERA_SHARED_SECRET on the backend");
      if (code == 503) Serial.println("[up] -> backend is missing CAMERA_SHARED_SECRET or SUPABASE_SERVICE_ROLE_KEY");
    }
    http.end();
  }
  esp_camera_fb_return(fb);
  return ok;
}

bool isNight()
{
  if (!NIGHT_SKIP) return false;
  struct tm now;
  if (!getLocalTime(&now, 10)) return false;   // clock unknown -> assume day
  return now.tm_hour >= NIGHT_START_HOUR || now.tm_hour < NIGHT_END_HOUR;
}

void noteResult(bool ok)
{
  consecutiveFailures = ok ? 0 : consecutiveFailures + 1;
  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    Serial.println("[node] too many failures in a row - restarting");
    delay(500);
    ESP.restart();
  }
}


// ============================================================
// SETUP / LOOP
// ============================================================

void setup()
{
  // Flash LED off before anything else — it floats on at boot.
  pinMode(FLASH_LED_PIN, OUTPUT);
  digitalWrite(FLASH_LED_PIN, LOW);

  Serial.begin(115200);
  delay(200);
  Serial.println("\n=== Bed 1 camera node ===");

  if (!initCamera()) {
    delay(5000);
    ESP.restart();
  }
  ensureWifi();
}

void loop()
{
  ensureWifi();
  if (WiFi.status() != WL_CONNECTED) {
    delay(5000);
    return;
  }

  unsigned long now = millis();

  // 1. Someone asked for a photo (app button / end of irrigation)?
  if (now - lastPollAt >= PENDING_POLL_MS) {
    lastPollAt = now;
    bool ok;
    String reason = checkPending(ok);
    noteResult(ok);
    if (reason.length() > 0) {
      noteResult(uploadPhoto(reason.c_str()));
    }
  }

  // 2. Scheduled photo (plus one right after boot).
  if (now - lastCaptureAt >= nextCaptureDelay) {
    lastCaptureAt = now;
    if (!bootPhotoPending && isNight()) {
      nextCaptureDelay = CAPTURE_INTERVAL_MS;
    } else {
      bool ok = uploadPhoto(bootPhotoPending ? "boot" : "scheduled");
      noteResult(ok);
      if (ok) bootPhotoPending = false;
      nextCaptureDelay = ok ? CAPTURE_INTERVAL_MS : RETRY_MS;
    }
  }

  delay(200);
}
