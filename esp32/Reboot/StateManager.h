// ═══════════════════════════════════════════════
//  State Manager - Manages device state machine
// ═══════════════════════════════════════════════

#ifndef STATE_MANAGER_H
#define STATE_MANAGER_H

#include "config.h"

class StateManager {
private:
  int currentState;
  int failureCount;
  int restartCount;
  unsigned long lastRestartTime;
  
public:
  StateManager() : currentState(STATE_INIT), failureCount(0), restartCount(0), lastRestartTime(0) {}
  
  void init() {
    currentState = STATE_INIT;
    failureCount = 0;
    restartCount = 0;
  }
  
  void setState(int newState) {
    if (currentState != newState) {
      Serial.print("State transition: ");
      Serial.print(getStateString(currentState));
      Serial.print(" -> ");
      Serial.println(getStateString(newState));
      currentState = newState;
    }
  }
  
  int getState() {
    return currentState;
  }
  
  const char* getStateString() {
    return getStateString(currentState);
  }
  
  const char* getStateString(int state) {
    switch(state) {
      case STATE_INIT: return "STATE_INIT";
      case STATE_MONITORING: return "STATE_MONITORING";
      case STATE_FAILURE_DETECTED: return "STATE_FAILURE_DETECTED";
      case STATE_RECOVERING: return "STATE_RECOVERING";
      case STATE_RECOVERY_WAIT: return "STATE_RECOVERY_WAIT";
      case STATE_LIMIT_REACHED: return "STATE_LIMIT_REACHED";
      default: return "UNKNOWN";
    }
  }
  
  void recordSuccessfulPing() {
    failureCount = 0;
    if (currentState == STATE_FAILURE_DETECTED) {
      setState(STATE_MONITORING);
    }
  }
  
  void recordFailedPing() {
    failureCount++;

  }
  
  int getFailureCount() {
    return failureCount;
  }
  
  void recordRestartCount() {
    restartCount++;
    lastRestartTime = millis();
    failureCount = 0;
  }

  void resetCounters() {
    currentState = STATE_INIT;
    failureCount = 0;
    restartCount = 0;
    lastRestartTime = 0;
  }
  
  int getRestartCount() {
    return restartCount;
  }
};

#endif // STATE_MANAGER_H