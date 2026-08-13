// ═══════════════════════════════════════════════
//  Relay Control - Manages relay and LED pins
// ═══════════════════════════════════════════════

#ifndef RELAY_CONTROL_H
#define RELAY_CONTROL_H

#include "config.h"

class RelayControl {
private:
  bool relayActive;
  unsigned long relayActivateTime;
  
public:
  RelayControl() : relayActive(false), relayActivateTime(0) {}
  
  void init() {
    pinMode(RELAY_PIN, OUTPUT);
    pinMode(LED_GREEN_PIN, OUTPUT);
    pinMode(LED_RED_PIN, OUTPUT);
    pinMode(LED_BLUE_PIN, OUTPUT);
    
    digitalWrite(RELAY_PIN, LOW);
    digitalWrite(LED_GREEN_PIN, LOW);
    digitalWrite(LED_RED_PIN, LOW);
    digitalWrite(LED_BLUE_PIN, LOW);
    
    Serial.println("Relay and LEDs initialized");
  }
  
  void activate() {
    relayActive = true;
    relayActivateTime = millis();
    digitalWrite(RELAY_PIN, HIGH);
    digitalWrite(LED_BLUE_PIN, HIGH);
    
    Serial.println("Relay activated - GPIO 5 HIGH");
  }
  
  void deactivate() {
    relayActive = false;
    digitalWrite(RELAY_PIN, LOW);
    digitalWrite(LED_BLUE_PIN, LOW);
    
    Serial.println("Relay deactivated - GPIO 5 LOW");
  }
  
  bool isActive() {
    return relayActive;
  }
  
  void update() {
    if (relayActive) {
      unsigned long elapsed = millis() - relayActivateTime;
      if (elapsed >= RELAY_DURATION_MS) {
        deactivate();
      }
    }
  }
  
  void setLedGreen(bool on) {
    digitalWrite(LED_GREEN_PIN, on ? HIGH : LOW);
  }
  
  void setLedRed(bool on) {
    digitalWrite(LED_RED_PIN, on ? HIGH : LOW);
  }
  
  void setLedBlue(bool on) {
    digitalWrite(LED_BLUE_PIN, on ? HIGH : LOW);
  }
  
  bool getLedGreen() {
    return digitalRead(LED_GREEN_PIN) == HIGH;
  }
  
  bool getLedRed() {
    return digitalRead(LED_RED_PIN) == HIGH;
  }
  
  bool getLedBlue() {
    return digitalRead(LED_BLUE_PIN) == HIGH;
  }
  
  void updateLeds(bool connected) {
    if (relayActive) {
      setLedGreen(false);
      setLedRed(false);
      setLedBlue(true);
    } else if (connected) {
      setLedGreen(true);
      setLedRed(false);
      setLedBlue(false);
    } else {
      setLedGreen(false);
      setLedRed(true);
      setLedBlue(false);
    }
  }
};

#endif // RELAY_CONTROL_H