// js/screen-shake.js - Screen shake effects for game events
console.log("🌊 ScreenShake loading...");

(function() {
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Check if user prefers reduced motion
  function prefersReducedMotion() {
    return reducedMotionQuery.matches;
  }

  // Screen shake state
  let shakeTimeout = null;
  let _shakeIntensity = 0;
  let _shakeDuration = 0;

  // Apply shake transform to the game container
  function applyShake(intensity) {
    const container = document.querySelector(".grid-container") || document.body;
    if (!container) return;

    const x = (Math.random() - 0.5) * intensity * 2;
    const y = (Math.random() - 0.5) * intensity * 2;
    const rotation = (Math.random() - 0.5) * intensity * 0.5;

    container.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
  }

  // Clear shake
  function clearShake() {
    const container = document.querySelector(".grid-container") || document.body;
    if (container) {
      container.style.transform = "";
    }
    if (shakeTimeout) {
      clearTimeout(shakeTimeout);
      shakeTimeout = null;
    }
  }

  // Main shake function
  function shake(options = {}) {
    if (prefersReducedMotion()) return;

    const {
      intensity = 8,
      duration = 300,
      frequency = 50,
    } = options;

    clearShake();
    _shakeIntensity = intensity;
    _shakeDuration = duration;

    const startTime = Date.now();
    const endTime = startTime + duration;

    function tick() {
      if (Date.now() >= endTime) {
        clearShake();
        return;
      }

      // Decay intensity over time
      const progress = (Date.now() - startTime) / duration;
      const currentIntensity = intensity * (1 - progress * 0.7);
      applyShake(currentIntensity);

      shakeTimeout = setTimeout(tick, frequency);
    }

    tick();
  }

  // Preset shake patterns
  const presets = {
    // Light shake - symbol collected, small interaction
    light: { intensity: 4, duration: 150, frequency: 30 },
    // Medium shake - correct answer, worm tap
    medium: { intensity: 8, duration: 300, frequency: 50 },
    // Heavy shake - worm explosion, combo milestone
    heavy: { intensity: 16, duration: 500, frequency: 50 },
    // Explosion shake - worm explosion with particles
    explosion: { intensity: 20, duration: 600, frequency: 40 },
    // Combo break - sudden stop
    comboBreak: { intensity: 12, duration: 400, frequency: 60 },
    // Celebration - level up, streak milestone
    celebration: { intensity: 10, duration: 800, frequency: 80 },
    // Lock progression
    lockProgress: { intensity: 6, duration: 400, frequency: 60 },
  };

  function shakePreset(name) {
    const preset = presets[name];
    if (preset) {
      shake(preset);
    }
  }

  // Export
  window.ScreenShake = {
    shake,
    shakePreset,
    presets,
    clearShake,
    prefersReducedMotion,
  };

  console.log("✅ ScreenShake loaded");
})();