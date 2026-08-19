#ifndef PING_MONITOR_H
#define PING_MONITOR_H

#include <WiFi.h>

class PingMonitor {
private:
  int lastLatency = 0;
  
public:
  void init() {
    Serial.println("PingMonitor initialized");
  }
  
  bool ping(const String& target) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi not connected");
      return false;
    }
    
    // Simple TCP connection check to common ports
    // 8.8.8.8:53 = DNS, 1.1.1.1:53 = DNS, google.com:80 = HTTP
    
    WiFiClient client;
    unsigned long startTime = millis();
    
    int port = 53;  // DNS port
    if (target == "google.com") {
      port = 80;  // HTTP port for google.com
    }
    
    bool success = client.connect(target.c_str(), port);
    unsigned long endTime = millis();
    
    lastLatency = endTime - startTime;
    
    client.stop();
    
    if (success) {
      Serial.print("Ping to ");
      Serial.print(target);
      Serial.print(" successful: ");
      Serial.print(lastLatency);
      Serial.println("ms");
    } else {
      Serial.print("Ping to ");
      Serial.print(target);
      Serial.println(" failed");
    }
    
    return success;
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