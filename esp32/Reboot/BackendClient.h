// ═══════════════════════════════════════════════
//  Backend Client - Sends heartbeat to Node.js backend
// ═══════════════════════════════════════════════

#ifndef BACKEND_CLIENT_H
#define BACKEND_CLIENT_H

#include <HTTPClient.h>
#include "config.h"

class BackendClient {
    private:
  HTTPClient http;
  
  void resetHTTPClient() {
    http.end();
    delay(100);
  }

public:
  bool sendHeartbeat(const String& payload) {
    resetHTTPClient();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi not connected");
      return false;
    }
    
    String url = BACKEND_URL;
    url += BACKEND_HEARTBEAT_ENDPOINT;
    
    int maxRetries = 3;
    int retryCount = 0;
    
    while (retryCount < maxRetries) {
      Serial.print("Attempt ");
      Serial.print(retryCount + 1);
      Serial.print("/");
      Serial.print(maxRetries);
      Serial.print(" - Posting to: ");
      Serial.println(url);
      
      http.begin(url);
      http.addHeader("Content-Type", "application/json");
      http.addHeader("X-Device-Token", BACKEND_API_TOKEN);
      
      int httpCode = http.POST(payload);
      
      Serial.print("HTTP Code: ");
      Serial.println(httpCode);
      
      if (httpCode == 200) {
        String response = http.getString();
        Serial.println("Heartbeat sent successfully");
        http.end();
        return true;
      } else {
        Serial.print("Attempt failed: ");
        Serial.println(http.errorToString(httpCode));
        http.end();
        retryCount++;
        
        if (retryCount < maxRetries) {
          delay(1000);
        }
      }
    }
    
    Serial.println("All retry attempts failed");
    return false;
  }
  
  bool getCommand(String& outCommand, int& outCommandId) {
    resetHTTPClient();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi not connected for command check");
      return false;
    }
    
    String url = BACKEND_URL;
    url += "/api/esp32/command";
    
    Serial.print("Command URL: ");
    Serial.println(url);
    
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Token", BACKEND_API_TOKEN);
    
    int httpCode = http.POST("");
    
    Serial.print("Command HTTP Code: ");
    Serial.println(httpCode);
    
    if (httpCode == 200) {
      String response = http.getString();
      
      Serial.print("Command Response: ");
      Serial.println(response);
      
      StaticJsonDocument<256> doc;
      DeserializationError error = deserializeJson(doc, response);
      
      if (error) {
        Serial.print("JSON Parse Error: ");
        Serial.println(error.c_str());
        http.end();
        return false;
      }
      
      if (doc["command"] != nullptr && doc["command"].as<String>() != "null") {
        outCommand = doc["command"].as<String>();
        outCommandId = doc["command_id"];
        
        Serial.print("Command found: ");
        Serial.println(outCommand);
        
        http.end();
        return true;
      }
    } else {
      Serial.print("Command fetch failed: ");
      Serial.println(http.errorToString(httpCode));
    }
    
    http.end();
    return false;
  }
  
  bool completeCommand(int commandId) {
    resetHTTPClient();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi not connected for command complete");
      return false;
    }
    
    String url = BACKEND_URL;
    url += "/api/esp32/command-complete";
    
    StaticJsonDocument<128> doc;
    doc["command_id"] = commandId;
    
    String payload;
    serializeJson(doc, payload);
    
    Serial.print("Completing command: ");
    Serial.println(url);
    
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Token", BACKEND_API_TOKEN);
    
    int httpCode = http.POST(payload);
    
    Serial.print("Complete HTTP Code: ");
    Serial.println(httpCode);
    
    http.end();
    
    return (httpCode == 200);
  }
  
  bool sendLog(const String& level, const String& tag, const String& message) {
    if (WiFi.status() != WL_CONNECTED) {
      return false;
    }
    
    StaticJsonDocument<256> doc;
    doc["level"] = level;
    doc["tag"] = tag;
    doc["message"] = message;
    
    String payload;
    serializeJson(doc, payload);
    
    String url = BACKEND_URL;
    url += BACKEND_LOG_ENDPOINT;
    
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Token", BACKEND_API_TOKEN);
    
    int httpCode = http.POST(payload);
    http.end();
    
    return (httpCode > 0);
  }

    // ────── Send Diagnostic Report ──────
  bool sendDiagnosticReport(DiagnosticReport& report) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi not connected, cannot send diagnostic");
      return false;
    }
    
    String url = BACKEND_URL;
    url += "/api/esp32/diagnostic";
    
    Serial.print("Sending diagnostic to: ");
    Serial.println(url);
    
    // Create JSON payload
    StaticJsonDocument<256> doc;
    doc["root_cause"] = report.root_cause;
    doc["layer_failed"] = report.layer_failed;
    doc["latency_ms"] = report.latency_ms;
    doc["timestamp"] = report.timestamp;
    
    // Add layer details
    for (int i = 0; i < 5; i++) {
      String layerKey = "layer" + String(i + 1);
      doc[layerKey] = report.layers[i].success ? "pass" : "fail";
    }
    
    String payload;
    serializeJson(doc, payload);
    
    Serial.print("Diagnostic payload: ");
    Serial.println(payload);
    
    // Send POST request
    resetHTTPClient();
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    int httpCode = http.POST(payload);
    
    Serial.print("Diagnostic HTTP Code: ");
    Serial.println(httpCode);
    
    if (httpCode == 200) {
      String response = http.getString();
      Serial.println("Diagnostic sent successfully");
      Serial.println(response);
      http.end();
      return true;
    } else {
      Serial.print("Diagnostic send failed: ");
      Serial.println(httpCode);
      http.end();
      return false;
    }
  }
};

#endif // BACKEND_CLIENT_H