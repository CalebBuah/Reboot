// ═══════════════════════════════════════════════
//  Diagnostic Engine - 5-Layer Internet Diagnosis
// ═══════════════════════════════════════════════

#ifndef DIAGNOSTIC_ENGINE_H
#define DIAGNOSTIC_ENGINE_H

#include <WiFi.h>
#include <WiFiClient.h>
#include <HTTPClient.h>

// Diagnostic result for each layer
struct DiagnosticResult {
  int layer;                    // 1-5
  bool success;                 // Pass or fail
  int latency_ms;               // Time taken
  String message;               // Human readable result
  String recommendation;        // What to do if failed
};

// Complete diagnostic report
struct DiagnosticReport {
  String root_cause;            // WiFi, LocalNetwork, ISP, DNS, Content, Unknown
  int layer_failed;             // Which layer (0 if all pass)
  int latency_ms;               // Latency of last successful layer
  DiagnosticResult layers[5];   // Results for each layer
  String timestamp;             // When diagnostic ran
};

class DiagnosticEngine {
private:
  HTTPClient http;
  
public:
  DiagnosticEngine() {}
  
  // ────── LAYER 1: WiFi Connectivity ──────
  DiagnosticResult diagnoseWiFi() {
    DiagnosticResult result;
    result.layer = 1;
    result.latency_ms = 0;
    
    // Check WiFi connection status
    if (WiFi.status() != WL_CONNECTED) {
      result.success = false;
      result.message = "WiFi not connected";
      result.recommendation = "WiFi is disconnected. Reconnect to WiFi network.";
      Serial.println("Layer 1 FAILED: WiFi not connected");
      return result;
    }
    
    // Get signal strength
    int signal = WiFi.RSSI();  // dBm (Received Signal Strength Indicator)
    
    // WiFi signal quality scale: -30 excellent, -67 good, -70 poor, -100 unusable
    if (signal > -50) {
      result.success = true;
      result.message = "WiFi excellent";
      result.recommendation = "";
      Serial.println("Layer 1 PASS: WiFi signal excellent (-30 to -50 dBm)");
    } else if (signal > -70) {
      result.success = true;
      result.message = "WiFi good";
      result.recommendation = "";
      Serial.println("Layer 1 PASS: WiFi signal good (-50 to -70 dBm)");
    } else if (signal > -80) {
      result.success = true;
      result.message = "WiFi weak";
      result.recommendation = "WiFi signal weak. Move router closer or remove obstacles.";
      Serial.println("Layer 1 PASS but weak: WiFi signal weak (-70 to -80 dBm)");
    } else {
      result.success = false;
      result.message = "WiFi signal critically weak";
      result.recommendation = "WiFi signal extremely weak. Check connection or move closer to router.";
      Serial.println("Layer 1 FAILED: WiFi signal critical (< -80 dBm)");
    }
    
    return result;
  }
  
  // ────── LAYER 2: Local Network (Gateway) ──────
  DiagnosticResult diagnoseLocalNetwork() {
    DiagnosticResult result;
    result.layer = 2;
    
    // Get router gateway IP (usually 192.168.1.1)
    IPAddress gateway = WiFi.gatewayIP();
    
    Serial.print("Layer 2: Testing gateway ");
    Serial.println(gateway);
    
    unsigned long start = millis();
    WiFiClient client;
    
    // Try to reach router gateway on port 53 (DNS)
    if (client.connect(gateway, 53)) {
      result.latency_ms = millis() - start;
      result.success = true;
      result.message = "Local network OK";
      result.recommendation = "";
      
      Serial.print("Layer 2 PASS: Gateway reachable in ");
      Serial.print(result.latency_ms);
      Serial.println("ms");
      
      client.stop();
      return result;
    }
    
    result.latency_ms = millis() - start;
    result.success = false;
    result.message = "Cannot reach router gateway";
    result.recommendation = "Router offline or not responding. Try power cycling the router.";
    
    Serial.println("Layer 2 FAILED: Cannot reach gateway");
    client.stop();
    
    return result;
  }
  
  // ────── LAYER 3: ISP Gateway (Upstream) ──────
  DiagnosticResult diagnoseISPGateway() {
    DiagnosticResult result;
    result.layer = 3;
    
    // Try to reach ISP gateway (public DNS servers)
    const char* isp_targets[] = {"8.8.8.8", "208.67.222.222"};
    
    Serial.println("Layer 3: Testing ISP gateway");
    
    for (int i = 0; i < 2; i++) {
      unsigned long start = millis();
      WiFiClient client;
      
      if (client.connect(isp_targets[i], 53)) {
        result.latency_ms = millis() - start;
        result.success = true;
        result.message = "ISP gateway reachable";
        result.recommendation = "";
        
        if (result.latency_ms < 50) {
          result.message += " (excellent latency)";
        } else if (result.latency_ms < 150) {
          result.message += " (good latency)";
        } else {
          result.message += " (high latency - network congestion?)";
          result.recommendation = "Network latency high. ISP may be congested.";
        }
        
        Serial.print("Layer 3 PASS: ISP gateway reachable in ");
        Serial.print(result.latency_ms);
        Serial.println("ms");
        
        client.stop();
        return result;
      }
      
      client.stop();
    }
    
    result.latency_ms = millis();
    result.success = false;
    result.message = "Cannot reach ISP gateway";
    result.recommendation = "ISP connection down. Contact your ISP. Not a router problem.";
    
    Serial.println("Layer 3 FAILED: Cannot reach ISP gateway");
    
    return result;
  }
  
  // ────── LAYER 4: DNS Resolution ──────
  DiagnosticResult diagnoseDNS() {
  DiagnosticResult result;
  result.layer = 4;
  
  Serial.println("Layer 4: Testing DNS resolution");
  
  IPAddress ip;
  unsigned long start = millis();
  int dnsResult = WiFi.hostByName("google.com", ip);
  result.latency_ms = millis() - start;
  
  if (dnsResult == 1) {  // 1 = success
    result.success = true;
    result.message = "DNS resolution working";
    result.recommendation = "";
    
    if (result.latency_ms < 100) {
      result.message += " (fast)";
    } else if (result.latency_ms < 500) {
      result.message += " (slow)";
      result.recommendation = "DNS server slow. Try changing DNS provider.";
    } else {
      result.message += " (very slow)";
      result.recommendation = "DNS server very slow. Change to 1.1.1.1 or 8.8.8.8";
    }
    
    Serial.print("Layer 4 PASS: DNS resolved in ");
    Serial.print(result.latency_ms);
    Serial.println("ms");
  } else {
    result.success = false;
    result.message = "DNS resolution failing";
    result.recommendation = "DNS server not responding. Try changing DNS provider.";
    
    Serial.println("Layer 4 FAILED: DNS resolution failed");
  }
  
  return result;
}
  
  // ────── LAYER 5: Content Delivery (Actual Internet) ──────
  DiagnosticResult diagnoseContentDelivery() {
    DiagnosticResult result;
    result.layer = 5;
    
    Serial.println("Layer 5: Testing content delivery (HTTP)");
    
    unsigned long start = millis();
    http.setTimeout(5000);
    http.begin("http://www.google.com/");
    
    int httpCode = http.GET();
    result.latency_ms = millis() - start;
    
    if (httpCode > 0) {
      result.success = true;
      result.message = "Internet content accessible";
      result.recommendation = "";
      
      if (result.latency_ms < 200) {
        result.message += " (fast)";
      } else if (result.latency_ms < 1000) {
        result.message += " (slow - high latency)";
        result.recommendation = "Internet connection slow. Check ISP speed.";
      } else {
        result.message += " (very slow)";
        result.recommendation = "Internet severely congested. Try again later.";
      }
      
      Serial.print("Layer 5 PASS: HTTP request succeeded in ");
      Serial.print(result.latency_ms);
      Serial.println("ms");
    } else {
      result.success = false;
      result.message = "Cannot access internet content";
      result.recommendation = "Internet unreachable. Check all layers above.";
      
      Serial.println("Layer 5 FAILED: HTTP request failed");
    }
    
    http.end();
    return result;
  }
  
  // ────── MAIN DIAGNOSTIC FUNCTION ──────
  DiagnosticReport runFullDiagnostics() {
    DiagnosticReport report;
    report.timestamp = String(millis() / 1000);  // Uptime in seconds
    report.layer_failed = 0;
    report.latency_ms = 0;
    
    Serial.println("\n╔════════════════════════════════════╗");
    Serial.println("║   RUNNING FULL DIAGNOSTICS          ║");
    Serial.println("╚════════════════════════════════════╝\n");
    
    // Run Layer 1: WiFi
    report.layers[0] = diagnoseWiFi();
    if (!report.layers[0].success) {
      report.root_cause = "WiFi_Down";
      report.layer_failed = 1;
      Serial.println("\n✗ Stopped at Layer 1: WiFi connection issue\n");
      return report;
    }
    
    // Run Layer 2: Local Network
    report.layers[1] = diagnoseLocalNetwork();
    if (!report.layers[1].success) {
      report.root_cause = "LocalNetwork_Down";
      report.layer_failed = 2;
      Serial.println("\n✗ Stopped at Layer 2: Router offline\n");
      return report;
    }
    
    // Run Layer 3: ISP Gateway
    report.layers[2] = diagnoseISPGateway();
    if (!report.layers[2].success) {
      report.root_cause = "ISP_Down";
      report.layer_failed = 3;
      Serial.println("\n✗ Stopped at Layer 3: ISP connection down\n");
      return report;
    }
    
    // Run Layer 4: DNS
    report.layers[3] = diagnoseDNS();
    if (!report.layers[3].success) {
      report.root_cause = "DNS_Down";
      report.layer_failed = 4;
      Serial.println("\n✗ Stopped at Layer 4: DNS not working\n");
      return report;
    }
    
    // Run Layer 5: Content
    report.layers[4] = diagnoseContentDelivery();
    if (!report.layers[4].success) {
      report.root_cause = "Internet_Down";
      report.layer_failed = 5;
      Serial.println("\n✗ Stopped at Layer 5: Internet unreachable\n");
      return report;
    }
    
    // All layers passed
    report.root_cause = "All_Systems_OK";
    report.layer_failed = 0;
    
    Serial.println("✓ All diagnostic layers passed - Internet working!");
    Serial.println("✓ No issues detected\n");
    
    return report;
  }
  
  // Helper: Print report to Serial
  void printDiagnosticReport(DiagnosticReport& report) {
    Serial.println("\n╔════════════════════════════════════╗");
    Serial.println("║     DIAGNOSTIC REPORT SUMMARY       ║");
    Serial.println("╚════════════════════════════════════╝\n");
    
    Serial.print("Root Cause: ");
    Serial.println(report.root_cause);
    
    Serial.print("Layer Failed: ");
    Serial.println(report.layer_failed);
    
    if (report.layer_failed > 0) {
      Serial.print("Recommendation: ");
      Serial.println(report.layers[report.layer_failed - 1].recommendation);
    }
    
    Serial.println("\nDetailed Results:");
    for (int i = 0; i < 5; i++) {
      Serial.print("  Layer ");
      Serial.print(i + 1);
      Serial.print(": ");
      Serial.print(report.layers[i].success ? "PASS" : "FAIL");
      Serial.print(" - ");
      Serial.println(report.layers[i].message);
    }
    
    Serial.println();
  }
};

#endif // DIAGNOSTIC_ENGINE_H