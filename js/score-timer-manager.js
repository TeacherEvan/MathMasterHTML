// js/score-timer-manager.js - Countdown timer + step-based scoring
console.log("⏱️ ScoreTimerManager loading...");

(function () {
  const DEFAULTS = {
    stepDurationSeconds: 60,
    initialScore: 1000,
    stepBonus: 1000,
    thresholds: {
      blueToGreen: 50,
      greenToYellow: 30,
      yellowToRed: 10,
    },
  };

  const COLORS = {
    blue: [0, 191, 255],
    green: [0, 255, 0],
    yellow: [255, 215, 0],
    red: [255, 68, 68],
  };

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
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

  const ScoreTimerManager = {
    _cfg: { ...DEFAULTS },

    _timerValueEl: null,
    _timerDisplayEl: null,
    _scoreValueEl: null,

    _intervalId: null,
    _stepStartMs: 0,
    _stepDurationMs: 60000,
    _scoreAtStepStart: 1000,

    _currentProblemScore: 1000,
    _paused: false,

    init({ level } = {}) {
      // Pull config from GameConstants if present
      if (window.GameConstants?.TIMER?.STEP_DURATION) {
        this._cfg.stepDurationSeconds =
          window.GameConstants.TIMER.STEP_DURATION;
      }
      if (window.GameConstants?.SCORING?.INITIAL_SCORE) {
        this._cfg.initialScore = window.GameConstants.SCORING.INITIAL_SCORE;
      }
      if (window.GameConstants?.SCORING?.STEP_BONUS) {
        this._cfg.stepBonus = window.GameConstants.SCORING.STEP_BONUS;
      }

      this._stepDurationMs = this._cfg.stepDurationSeconds * 1000;
      this._currentProblemScore = this._cfg.initialScore;
      this._scoreAtStepStart = this._currentProblemScore;

      this._timerValueEl = document.getElementById("timer-value");
      this._timerDisplayEl = document.getElementById("timer-display");
      this._scoreValueEl = document.getElementById("score-value");

      this._setDisplayedScore(this._currentProblemScore);
      this._setDisplayedTime(this._cfg.stepDurationSeconds);
      this._applyPhaseStyles(this._cfg.stepDurationSeconds);

      // Step completion maps to problem line completion in current architecture
      document.addEventListener("problemLineCompleted", (e) => {
        this.completeStep(e?.detail);
      });

      document.addEventListener("problemCompleted", () => {
        this.onProblemCompleted(level);
      });

      console.log("✅ ScoreTimerManager initialized");
    },

    onProblemStarted() {
      this._currentProblemScore = this._cfg.initialScore;
      this._paused = false;
      this.startStep();
      this._setDisplayedScore(this._currentProblemScore);
    },

    onProblemCompleted(levelKey) {
      // Lock in current problem score and persist
      this._paused = true;
      this._clearInterval();

      if (window.PlayerStorage) {
        try {
          const name = window.PlayerStorage.ensurePlayerName();
          const level = window.PlayerStorage.recordProblemResult(
            levelKey ||
              (typeof getLevelFromURL === "function"
                ? getLevelFromURL()
                : "beginner"),
            this._currentProblemScore
          );
          console.log("💾 Saved score:", { name, levelKey, level });
        } catch (e) {
          console.warn("⚠️ Failed to save player score:", e);
        }
      }
    },

    startStep() {
      this._stepStartMs = Date.now();
      this._scoreAtStepStart = this._currentProblemScore;

      this._clearInterval();

      const tick = () => {
        this._update();
      };

      if (window.ResourceManager) {
        this._intervalId = ResourceManager.setInterval(tick, 100);
      } else {
        this._intervalId = setInterval(tick, 100);
      }

      this._update();
    },

    pause() {
      this._paused = true;
      this._clearInterval();
    },

    resume() {
      if (!this._paused) return;
      this._paused = false;
      // Resume by re-basing start timestamp from remaining time
      const remainingMs = this._getRemainingMs();
      this._stepStartMs = Date.now() - (this._stepDurationMs - remainingMs);
      this.startStep();
    },

    completeStep(detail) {
      // Lock current score (already clamped) and add bonus to form new total
      const locked = Math.max(0, Math.round(this._currentProblemScore));
      this._currentProblemScore = locked + this._cfg.stepBonus;

      // Always reflect the locked+bonus score immediately
      this._setDisplayedScore(this._currentProblemScore);

      const isLastStep = Boolean(detail?.isLastStep);
      if (isLastStep) {
        // Final step of a problem == end of the "level" (entire problem)
        // Do NOT start a new countdown; keep score locked until next problem.
        this._paused = true;
        this._clearInterval();
      } else {
        // Immediately begin decrementing again for the next step
        this.startStep();
      }

      // Brief score pop feedback (CSS class on parent)
      const scoreDisplay = document.getElementById("score-display");
      if (scoreDisplay) {
        scoreDisplay.classList.remove("score-increase");
        // force reflow
        void scoreDisplay.offsetWidth;
        scoreDisplay.classList.add("score-increase");
        setTimeout(() => scoreDisplay.classList.remove("score-increase"), 450);
      }

      document.dispatchEvent(
        new CustomEvent("scoreLocked", {
          detail: {
            lockedScore: locked,
            bonusAdded: this._cfg.stepBonus,
            newScore: this._currentProblemScore,
            isLastStep,
          },
        })
      );
    },

    _getRemainingMs() {
      const elapsed = Date.now() - this._stepStartMs;
      return Math.max(0, this._stepDurationMs - elapsed);
    },

    _update() {
      const remainingMs = this._getRemainingMs();
      const remainingSeconds = Math.ceil(remainingMs / 1000);

      // Update current score linearly with remaining time
      const ratio =
        this._stepDurationMs > 0 ? remainingMs / this._stepDurationMs : 0;
      const computed = Math.round(this._scoreAtStepStart * ratio);
      this._currentProblemScore = Math.max(0, computed);

      this._setDisplayedTime(remainingSeconds);
      this._setDisplayedScore(this._currentProblemScore);
      this._applyPhaseStyles(remainingSeconds);

      if (remainingMs <= 0) {
        this._clearInterval();
        this._currentProblemScore = 0;
        this._setDisplayedScore(0);
        document.dispatchEvent(new CustomEvent("timerExpired"));
      }
    },

    _applyPhaseStyles(remainingSeconds) {
      if (!this._timerDisplayEl) return;

      // Pulse speed class
      this._timerDisplayEl.classList.remove(
        "timer-pulse-slow",
        "timer-pulse-medium",
        "timer-pulse-fast",
        "timer-pulse-critical"
      );

      let pulseClass = "timer-pulse-slow";
      if (remainingSeconds <= this._cfg.thresholds.yellowToRed) {
        pulseClass = "timer-pulse-critical";
      } else if (remainingSeconds <= this._cfg.thresholds.greenToYellow) {
        pulseClass = "timer-pulse-fast";
      } else if (remainingSeconds <= this._cfg.thresholds.blueToGreen) {
        pulseClass = "timer-pulse-medium";
      }
      this._timerDisplayEl.classList.add(pulseClass);

      // Smooth color phasing
      const duration = this._cfg.stepDurationSeconds;
      let color = "rgb(0, 191, 255)";

      if (remainingSeconds > this._cfg.thresholds.blueToGreen) {
        // 60 -> 50: blue -> green
        const t =
          (duration - remainingSeconds) /
          (duration - this._cfg.thresholds.blueToGreen);
        color = lerpColor(COLORS.blue, COLORS.green, t);
      } else if (remainingSeconds > this._cfg.thresholds.greenToYellow) {
        // 50 -> 30: green -> yellow
        const t =
          (this._cfg.thresholds.blueToGreen - remainingSeconds) /
          (this._cfg.thresholds.blueToGreen -
            this._cfg.thresholds.greenToYellow);
        color = lerpColor(COLORS.green, COLORS.yellow, t);
      } else if (remainingSeconds > this._cfg.thresholds.yellowToRed) {
        // 30 -> 10: yellow -> red
        const t =
          (this._cfg.thresholds.greenToYellow - remainingSeconds) /
          (this._cfg.thresholds.greenToYellow -
            this._cfg.thresholds.yellowToRed);
        color = lerpColor(COLORS.yellow, COLORS.red, t);
      } else {
        // final 10 seconds: red intensified via pulse class
        color = "rgb(255, 68, 68)";
      }

      this._timerDisplayEl.style.color = color;
      this._timerDisplayEl.style.borderColor = color;
    },

    _setDisplayedTime(seconds) {
      if (this._timerValueEl)
        this._timerValueEl.textContent = String(Math.max(0, seconds));
    },

    _setDisplayedScore(score) {
      if (this._scoreValueEl)
        this._scoreValueEl.textContent = String(Math.max(0, Math.round(score)));
    },

    _clearInterval() {
      if (!this._intervalId) return;
      if (window.ResourceManager) {
        ResourceManager.clearInterval(this._intervalId);
      } else {
        clearInterval(this._intervalId);
      }
      this._intervalId = null;
    },
  };

  window.ScoreTimerManager = ScoreTimerManager;
  console.log("✅ ScoreTimerManager loaded");
})();
