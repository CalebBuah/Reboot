// ═══════════════════════════════════════════════
//  Reboot - ESP32 Router Watchdog
//  Main sketch file
// ═══════════════════════════════════════════════

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "StateManager.h"
#include "PingMonitor.h"
#include "RelayControl.h"
#include "BackendClient.h"

StateManager stateManager;
PingMonitor pingMonitor;
RelayControl relayControl;
BackendClient backendClient;

unsigned long lastHeartbeat = 0;
unsigned long lastPing = 0;
unsigned long lastCommandCheck = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\nReboot ESP32 Starting...");
  
  // Initialize hardware
  relayControl.init();
  stateManager.init();
  
  // Connect to WiFi
  connectToWiFi();
  
  // Initialize ping monitor
  pingMonitor.init();
  
  Serial.println("Setup complete. Entering monitoring state.");
  stateManager.setState(STATE_MONITORING);

  // Test: Try to connect to PC IP directly
  WiFiClient testClient;
  if (testClient.connect("192.168.100.2", 5000)) {
    Serial.println("SUCCESS: Can connect to PC:5000");
    testClient.stop();
  } else {
    Serial.println("FAILED: Cannot connect to PC:5000");
  }
}

void loop() {
  unsigned long now = millis();
  
  // Perform ping check every 30 seconds
  if (now - lastPing >= PING_INTERVAL_MS) {
    lastPing = now;
    handlePingCheck();
  }
  
  // Send heartbeat to backend every 30 seconds
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeat = now;
    sendHeartbeat();
  }
  
  // Check for pending commands every 10 seconds
  if (now - lastCommandCheck >= 35000) {
    lastCommandCheck = now;
    checkForCommands();
  }
  
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
  bool pingSuccess = pingMonitor.ping(PING_TARGET);
  int latency = pingMonitor.getLatency();
  
  if (pingSuccess) {
    Serial.print("Ping success: ");
    Serial.print(latency);
    Serial.println("ms");
    pingMonitor.recordSuccess(latency);
    stateManager.recordSuccessfulPing();
  } else {
    Serial.println("Ping failed");
    pingMonitor.recordFailure();
    stateManager.recordFailedPing();
  }
  
  // Check if we've exceeded failure threshold
  if (stateManager.getFailureCount() >= FAILURE_THRESHOLD) {
    if (stateManager.getState() == STATE_MONITORING) {
      Serial.println("Failure threshold reached! Triggering relay...");
      stateManager.setState(STATE_RECOVERING);
      relayControl.activate();
    }
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
  doc["ping_latency_ms"] = pingMonitor.getLatency();
  doc["ping_success"] = stateManager.getState() == STATE_MONITORING;
  
  String payload;
  serializeJson(doc, payload);
  
  if (backendClient.sendHeartbeat(payload)) {
    Serial.println("Heartbeat sent successfully");
    
    // Handle state transitions
    if (stateManager.getState() == STATE_RECOVERING) {
      stateManager.setState(STATE_RECOVERY_WAIT);
    } else if (stateManager.getState() == STATE_RECOVERY_WAIT) {
      // Check if ping is successful after relay cycle
      if (pingMonitor.getLatency() > 0 && stateManager.getState() == STATE_RECOVERY_WAIT) {
        stateManager.setState(STATE_MONITORING);
        stateManager.recordRestartCount();
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
    }
  } else {
    Serial.println("No commands available");
  }
}