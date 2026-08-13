// ═══════════════════════════════════════════════
//  Configuration - WiFi, Backend, GPIO Pins
// ═══════════════════════════════════════════════

#ifndef CONFIG_H
#define CONFIG_H

// WiFi Configuration
#define WIFI_SSID "HUAWEI-2.4G-NdC2"
#define WIFI_PASSWORD "nhzncH8X"

// Backend Configuration
#define BACKEND_URL "http://192.168.100.2:5000"
#define BACKEND_HEARTBEAT_ENDPOINT "/api/esp32/heartbeat"
#define BACKEND_LOG_ENDPOINT "/api/esp32/log"

// Ping Configuration
#define PING_TARGET "8.8.8.8"
#define PING_INTERVAL_MS 30000      // 30 seconds
#define FAILURE_THRESHOLD 3         // 3 consecutive failures
#define PING_TIMEOUT_MS 5000        // 5 second timeout per ping

// Relay Configuration
#define RELAY_DURATION_MS 10000     // 10 seconds on
#define RELAY_OFF_WAIT_MS 60000     // 60 second boot time

// Heartbeat Configuration
#define HEARTBEAT_INTERVAL_MS 30000 // 30 seconds

// GPIO Pin Assignments
#define RELAY_PIN 5
#define LED_GREEN_PIN 13
#define LED_RED_PIN 14
#define LED_BLUE_PIN 15

// State Definitions
#define STATE_INIT 0
#define STATE_MONITORING 1
#define STATE_FAILURE_DETECTED 2
#define STATE_RECOVERING 3
#define STATE_RECOVERY_WAIT 4
#define STATE_LIMIT_REACHED 5

#endif // CONFIG_H