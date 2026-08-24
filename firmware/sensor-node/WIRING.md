# Sensor + Irrigation Node — Wiring Reference

Board: generic ESP32 DevKit V1 (30-pin). Ground is shared across every circuit below —
battery negative, buck converter GND, relay module GND, ESP32 GND, and every sensor's
GND all tie to one common ground.

Pins deliberately avoided: GPIO0/2/5/12/15 (boot-mode straps), GPIO1/3 (USB serial,
don't repurpose), GPIO6-11 (wired internally to flash, not broken out). GPIO21/22 are
reserved free for the I2C RTC module the solar tracker objective will need later.

## Circuit 1 — Single soil moisture sensor (test first, before wiring all three)

Resistive sensor module pins: VCC, GND, AO (analog output).

| Sensor pin | ESP32 pin |
|---|---|
| GND | GND |
| VCC | GPIO25 (digital OUTPUT — pulse HIGH only while reading, to slow corrosion) |
| AO | GPIO34 (ADC1 input, input-only pin — safe to read) |

Test: pulse GPIO25 HIGH, read GPIO34 with analogRead(), set GPIO25 LOW again. Print to
serial once a second. Dry air vs. dipped in water should give clearly different raw
values — that's your calibration range.

## Circuit 2 — All three sensors

| Bed | Sensor VCC → | Sensor AO → |
|---|---|---|
| Bed 1 | GPIO25 | GPIO34 |
| Bed 2 | GPIO26 | GPIO35 |
| Bed 3 | GPIO27 | GPIO36 (labeled "VP" on most boards) |

## Circuit 3 — Power chain

```
Solar panel -> Charge controller (PV/Solar terminals)
                    |
              Charge controller (Battery terminals)
                    |
                 12V Battery
                    |
             [ INLINE FUSE ]  <- right after battery +, before any branch
                    |
            Fused positive bus
             |                        |
     Buck converter IN+       Relay module power (COM side, Circuit 4)
     Buck converter IN- -> GND
             |
     Buck converter OUT+ -> ESP32 5V/VIN
     Buck converter OUT- -> ESP32 GND
```

Adjust the buck converter's trimmer pot to a steady 5.0V (check with a multimeter)
BEFORE connecting it to the ESP32. Pump and valves run on raw 12V from the fused bus,
switched through the relay — never route them through the buck converter or the
ESP32's 5V rail.

## Circuit 4 — Relay module (4-channel: pump + 3 valves)

| Relay channel | ESP32 pin | Switches |
|---|---|---|
| IN1 | GPIO18 | Pump |
| IN2 | GPIO19 | Valve 1 (Bed 1) |
| IN3 | GPIO4 | Valve 2 (Bed 2) |
| IN4 | GPIO23 | Valve 3 (Bed 3) |

Relay VCC -> same 5V as ESP32 (buck converter output). Relay GND -> common ground.

Switched side, per channel: fused 12V positive bus -> relay COM; relay NO -> pump's or
valve's positive lead; pump's/valve's negative lead -> common ground. The relay only
ever switches the positive wire.

Gotcha: most cheap relay boards are active-LOW (relay energizes on LOW, not HIGH).
Test empirically if there's no datasheet/silkscreen confirming polarity.

Test: cycle each relay channel on/off one at a time with no sensor logic involved yet
— confirm each one clicks/buzzes/runs on cue before combining with sensing.

## Full pin map

| Function | GPIO |
|---|---|
| Bed 1 sensor VCC pulse | 25 |
| Bed 1 sensor AO (ADC) | 34 |
| Bed 2 sensor VCC pulse | 26 |
| Bed 2 sensor AO (ADC) | 35 |
| Bed 3 sensor VCC pulse | 27 |
| Bed 3 sensor AO (ADC) | 36 (VP) |
| Pump relay | 18 |
| Valve 1 relay | 19 |
| Valve 2 relay | 4 |
| Valve 3 relay | 23 |
| Reserved (I2C RTC, later) | 21 (SDA), 22 (SCL) |
