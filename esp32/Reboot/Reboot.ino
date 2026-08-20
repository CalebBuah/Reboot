// ═══════════════════════════════════════════════
//  Reboot - ESP32 Router Watchdog
//  Main sketch file
// ═══════════════════════════════════════════════

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "StateManager.h"
#include "DiagnosticEngine.h"
#include "RelayControl.h"
#include "BackendClient.h"

StateManager stateManager;
DiagnosticEngine diagnosticEngine;  // ← CHANGED from pingMonitor
DiagnosticReport lastDiagnosticReport;
RelayControl relayControl;
BackendClient backendClient;
HTTPClient http;

bool lastPingSuccess = false;  // ← NEW: Track if last ping succeeded
int lastPingLatency = 0; 

unsigned long lastHeartbeat = 0;
unsigned long lastPing = 0;
unsigned long lastCommandCheck = 0;
unsigned long lastSyncCheck = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\nReboot ESP32 Starting...");
  
  // Initialize hardware
  relayControl.init();
  stateManager.init();
  
  // Connect to WiFi
  connectToWiFi();
  

  
  Serial.println("Setup complete. Entering monitoring state.");
  stateManager.setState(STATE_MONITORING);

  // Test: Try to connect to PC IP directly
  WiFiClient testClient;
  if (testClient.connect(BACKEND_HOST, BACKEND_PORT)) {
    Serial.print("SUCCESS: Can connect to backend:");
    Serial.println(BACKEND_PORT);
    testClient.stop();
  } else {
    Serial.print("FAILED: Cannot connect to backend:");
    Serial.println(BACKEND_PORT);
  }
}

void loop() {
  unsigned long now = millis();
  
  // Perform ping check every 5 seconds
  if (now - lastPing >= PING_INTERVAL_MS) {
    lastPing = now;
    handlePingCheck();
  }
  
  // Send heartbeat to backend every 5 seconds
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeat = now;
    sendHeartbeat();
  }
  
  // Check for pending commands every 10 seconds
<<<<<<< HEAD
  if (now - lastCommandCheck >= HEARTBEAT_INTERVAL_MS) {
=======
  if (now - lastCommandCheck >= 10000) {
>>>>>>> 46052d36ae8f62eaeb55ed8120faed401bc1393b
    lastCommandCheck = now;
    checkForCommands();
  }
  
  // // Sync state with backend every 30 seconds
  // if (now - lastSyncCheck >= 30000) {
  //   lastSyncCheck = now;
  //   syncWithBackend();
  // }
  
  // Handle relay timing
  relayControl.update();
  
  // Update LEDs based on current state
  bool isConnected = (stateManager.getState() == STATE_MONITORING);
  relayControl.updateLeds(isConnected);
  
  delay(100); // Small delay to prevent watchdog timeout
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFailed to connect to WiFi");
  }
}

void handlePingCheck() {
  // Don't ping if relay is active - router is powered off anyway
  if (relayControl.isActive()) {
    Serial.println("Relay active, skipping ping check");
    return;
  }
  
  // Simple connectivity check using DNS server ping
  WiFiClient client;
  unsigned long startTime = millis();
  
  if (client.connect("8.8.8.8", 53)) {
    int latency = millis() - startTime;
    
    Serial.print("Ping successful: ");
    Serial.print(latency);
    Serial.println("ms");
    
    lastPingSuccess = true;      // ← NEW
    lastPingLatency = latency;
    stateManager.recordSuccessfulPing();
  } else {
    Serial.println("Ping failed");
    lastPingSuccess = false;     // ← NEW
    lastPingLatency = 0;  
    stateManager.recordFailedPing();
  }
  
  client.stop();
  
  // Check if we've exceeded failure threshold AND we're still monitoring
  if (stateManager.getFailureCount() >= FAILURE_THRESHOLD && 
      stateManager.getState() == STATE_MONITORING) {
    
    Serial.println("Failure threshold reached! Running diagnostics...");
    
    // ← Run diagnostics when failure detected
    lastDiagnosticReport = diagnosticEngine.runFullDiagnostics();
    diagnosticEngine.printDiagnosticReport(lastDiagnosticReport);
    
    // ← NEW: Send diagnostic to backend
    Serial.println("\nSending diagnostic to backend...");
    if (backendClient.sendDiagnosticReport(lastDiagnosticReport)) {
      Serial.println("Diagnostic sent to backend successfully");
    } else {
      Serial.println("Failed to send diagnostic to backend");
    }
    
    // Now activate relay
    Serial.println("\nActivating relay...");
    stateManager.setState(STATE_RECOVERING);
    relayControl.activate();
    Serial.println("Relay activated!");
  }
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, skipping heartbeat");
    return;
  }
  
  StaticJsonDocument<512> doc;
  
  doc["state"] = stateManager.getStateString();
  doc["relay_on"] = relayControl.isActive();
  doc["uptime"] = millis() / 1000;
  doc["restart_count"] = stateManager.getRestartCount();
  doc["failure_count"] = stateManager.getFailureCount();
  doc["gpio13"] = relayControl.getLedGreen();
  doc["gpio14"] = relayControl.getLedRed();
  doc["gpio15"] = relayControl.getLedBlue();
  doc["ping_latency_ms"] = (lastDiagnosticReport.latency_ms > 0) ? lastDiagnosticReport.latency_ms : 0;
  doc["ping_success"] = stateManager.getState() == STATE_MONITORING;
  
  // Add diagnostic data if available
  if (lastDiagnosticReport.layer_failed > 0) {
    JsonObject diag = doc.createNestedObject("diagnostic");
    diag["root_cause"] = lastDiagnosticReport.root_cause;
    diag["layer_failed"] = lastDiagnosticReport.layer_failed;
    diag["latency_ms"] = lastDiagnosticReport.latency_ms;
    diag["timestamp"] = lastDiagnosticReport.timestamp;
  }
  
  String payload;
  serializeJson(doc, payload);
  
  if (backendClient.sendHeartbeat(payload)) {
    Serial.println("Heartbeat sent successfully");
    
    // Handle state transitions
       // Handle state transitions
    if (stateManager.getState() == STATE_RECOVERING) {
      stateManager.setState(STATE_RECOVERY_WAIT);
      Serial.println("State: RECOVERING → RECOVERY_WAIT (waiting for router to boot)");
    } 
    else if (stateManager.getState() == STATE_RECOVERY_WAIT) {
      // Check if ping is successful after relay cycle
      if (lastPingSuccess) {  // ← FIXED: Check actual ping, not old diagnostic
        Serial.println("Recovery successful! Ping succeeded after relay cycle");
        stateManager.setState(STATE_MONITORING);
        stateManager.recordRestartCount();
        Serial.println("State: RECOVERY_WAIT → MONITORING (system recovered)");
      }
    }
  } else {
    Serial.println("Failed to send heartbeat");
  }
}

void checkForCommands() {
  String command;
  int commandId;
  
  Serial.println("Polling for commands...");
  
  if (backendClient.getCommand(command, commandId)) {
    Serial.print("Received command: ");
    Serial.println(command);
    Serial.print("Command ID: ");
    Serial.println(commandId);
    
    if (command == "RESTART_RELAY") {
      Serial.println("Executing RESTART_RELAY command...");
      stateManager.setState(STATE_RECOVERING);
      relayControl.activate();
      Serial.println("Relay activated!");
      
      // Confirm execution
      if (backendClient.completeCommand(commandId)) {
        Serial.println("Command execution confirmed to backend");
      } else {
        Serial.println("Failed to confirm command to backend");
      }
    } else if (command == "RESET_STATE") {
      stateManager.resetCounters();
      relayControl.deactivate();
      relayControl.updateLeds(false);
      if (backendClient.completeCommand(commandId)) {
        Serial.println("State reset confirmed to backend");
      } else {
        Serial.println("Failed to confirm state reset to backend");
      }
    }
  } else {
    Serial.println("No commands available");
  }
}
// void syncWithBackend() {
//   if (WiFi.status() != WL_CONNECTED) {
//     Serial.println("WiFi disconnected, skipping sync");
//     return;
//   }
  
//   String url = BACKEND_URL;
//   url += "/api/device/status";
  
//   http.begin(url);
//   http.addHeader("Content-Type", "application/json");
  
//   int httpCode = http.GET();
  
//   if (httpCode == 200) {
//     String response = http.getString();
    
//     StaticJsonDocument<512> doc;
//     DeserializationError error = deserializeJson(doc, response);
    
//     if (!error) {
//       int backendFailureCount = doc["failure_count"];
      
//       // Only reset if backend is at 0 AND relay is NOT active
//       // If relay is active, don't interfere with the recovery process
//       if (backendFailureCount == 0 && stateManager.getFailureCount() > 0 && !relayControl.isActive()) {
//         Serial.println("Backend reset detected, resetting ESP32 state...");
//         stateManager.init();
//         Serial.println("State reset to STATE_MONITORING");
//       }
//     }
//   }
  
//   http.end();
// }