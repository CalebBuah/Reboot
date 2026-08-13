// ═══════════════════════════════════════════════
//  Ping Monitor - Handles connectivity checks
// ═══════════════════════════════════════════════

#ifndef PING_MONITOR_H
#define PING_MONITOR_H

#include <HTTPClient.h>
#include "config.h"

class PingMonitor {
private:
  int lastLatency;
  HTTPClient http;
  
public:
  PingMonitor() : lastLatency(0) {}
  
  void init() {
    // Nothing to initialize
  }
  
  bool ping(const char* target) {
    // Simple connectivity check using HTTP HEAD to Google DNS
    // We'll try to reach 8.8.8.8:53 by attempting an HTTP connection
    
    unsigned long startTime = millis();
    
    // Try to connect to 8.8.8.8 on port 53 (DNS)
    WiFiClient client;
    bool connected = client.connect("8.8.8.8", 53);
    
    lastLatency = (int)(millis() - startTime);
    
    if (connected) {
      client.stop();
      Serial.print("Ping successful: ");
      Serial.print(lastLatency);
      Serial.println("ms");
      return true;
    } else {
      Serial.println("Ping failed");
      lastLatency = 0;
      return false;
    }
  }
  
  int getLatency() {
    return lastLatency;
  }
  
  void recordSuccess(int latency) {
    lastLatency = latency;
  }
  
  void recordFailure() {
    lastLatency = 0;
  }
};

#endif // PING_MONITOR_H