// js/haptic-feedback.js - Haptic feedback for mobile (Vibration API)
console.log("📳 HapticFeedback loading...");

(function() {
  // Check if Vibration API is supported
  const isSupported = "vibrate" in navigator;

  // Vibration patterns for different events
  const patterns = {
    // Light tap - worm tap, button press
    light: [10],
    // Medium tap - correct answer, symbol collected
    medium: [15],
    // Heavy tap - combo milestone, worm explosion
    heavy: [30],
    // Success pattern - problem completed, level up
    success: [10, 50, 10, 50, 10],
    // Warning/error - wrong answer, combo break
    warning: [50, 30, 50],
    // Celebration - streak milestone, daily challenge complete
    celebration: [10, 30, 10, 30, 10, 30, 10],
    // Power-up collected
    powerup: [20, 50, 20, 50, 100],
    // Lock progression
    lockProgress: [15, 30, 15, 30, 15],
  };

  // User preference storage key
  const PREF_KEY = "mathmaster_haptics_enabled";

  function getHapticsEnabled() {
    const stored = localStorage.getItem(PREF_KEY);
    if (stored !== null) {
      return stored === "true";
    }
    // Default to enabled
    return true;
  }

  function setHapticsEnabled(enabled) {
    localStorage.setItem(PREF_KEY, enabled.toString());
  }

  function vibrate(patternName) {
    if (!isSupported) return;
    if (!getHapticsEnabled()) return;

    const pattern = patterns[patternName];
    if (!pattern) {
      console.warn(`⚠️ Unknown haptic pattern: ${patternName}`);
      return;
    }

    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn("⚠️ Vibration failed:", e);
    }
  }

  // Pre-defined event triggers
  const HapticEvents = {
    wormTap: () => vibrate("light"),
    symbolCollected: () => vibrate("medium"),
    correctAnswer: () => vibrate("medium"),
    wrongAnswer: () => vibrate("warning"),
    comboMilestone: (level) => {
      if (level >= 4) vibrate("celebration");
      else if (level >= 2) vibrate("heavy");
      else vibrate("medium");
    },
    comboBreak: () => vibrate("warning"),
    wormExplosion: () => vibrate("heavy"),
    problemCompleted: () => vibrate("success"),
    levelUp: () => vibrate("celebration"),
    lockProgress: () => vibrate("lockProgress"),
    dailyChallengeComplete: () => vibrate("celebration"),
    streakMilestone: () => vibrate("celebration"),
    powerupCollected: () => vibrate("powerup"),
  };

  // Export
  window.HapticFeedback = {
    vibrate,
    isSupported,
    getHapticsEnabled,
    setHapticsEnabled,
    HapticEvents,
    patterns,
  };

  console.log(`✅ HapticFeedback loaded (supported: ${isSupported})`);
})();