(function() {
  const COLORS = {
    blue: [0, 191, 255],
    green: [0, 255, 0],
    yellow: [255, 215, 0],
    red: [255, 68, 68],
  };

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpColor(from, to, t) {
    const tt = clamp01(t);
    const r = Math.round(lerp(from[0], to[0], tt));
    const g = Math.round(lerp(from[1], to[1], tt));
    const b = Math.round(lerp(from[2], to[2], tt));
    return `rgb(${r}, ${g}, ${b})`;
  }

  function applyPhaseStyles(timerDisplayEl, remainingSeconds, cfg) {
    if (!timerDisplayEl) return;

    timerDisplayEl.classList.remove(
      "timer-pulse-slow",
      "timer-pulse-medium",
      "timer-pulse-fast",
      "timer-pulse-critical",
    );

    let pulseClass = "timer-pulse-slow";
    if (remainingSeconds <= cfg.thresholds.yellowToRed) {
      pulseClass = "timer-pulse-critical";
    } else if (remainingSeconds <= cfg.thresholds.greenToYellow) {
      pulseClass = "timer-pulse-fast";
    } else if (remainingSeconds <= cfg.thresholds.blueToGreen) {
      pulseClass = "timer-pulse-medium";
    }
    timerDisplayEl.classList.add(pulseClass);

    const duration = cfg.stepDurationSeconds;
    let color = "rgb(0, 191, 255)";

    if (remainingSeconds > cfg.thresholds.blueToGreen) {
      const t =
        (duration - remainingSeconds) / (duration - cfg.thresholds.blueToGreen);
      color = lerpColor(COLORS.blue, COLORS.green, t);
    } else if (remainingSeconds > cfg.thresholds.greenToYellow) {
      const t =
        (cfg.thresholds.blueToGreen - remainingSeconds) /
        (cfg.thresholds.blueToGreen - cfg.thresholds.greenToYellow);
      color = lerpColor(COLORS.green, COLORS.yellow, t);
    } else if (remainingSeconds > cfg.thresholds.yellowToRed) {
      const t =
        (cfg.thresholds.greenToYellow - remainingSeconds) /
        (cfg.thresholds.greenToYellow - cfg.thresholds.yellowToRed);
      color = lerpColor(COLORS.yellow, COLORS.red, t);
    } else {
      color = "rgb(255, 68, 68)";
    }

    timerDisplayEl.style.color = color;
    timerDisplayEl.style.borderColor = color;
  }

  window.ScoreTimerModules = window.ScoreTimerModules || {};
  window.ScoreTimerModules.applyPhaseStyles = applyPhaseStyles;
})();
