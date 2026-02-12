// js/score-timer-manager.js - Countdown timer + step-based scoring
console.log("⏱️ ScoreTimerManager loading...");

(function() {
  const DEFAULTS = {
    stepDurationSeconds: 600,
    initialScore: 10000,
    stepBonus: 10000,
    thresholds: {
      blueToGreen: 500,
      greenToYellow: 300,
      yellowToRed: 100,
    },
  };

  const modules = window.ScoreTimerModules || {};

  const ScoreTimerManager = {
    _cfg: { ...DEFAULTS },

    _timerValueEl: null,
    _timerDisplayEl: null,
    _scoreValueEl: null,

    _intervalId: null,
    _stepStartMs: 0,
    _stepDurationMs: 600000,
    _scoreAtStepStart: 10000,

    // Banked total for the current problem ("level" == entire problem)
    _bankedProblemScore: 0,
    // Live step score counts down from 1000 -> 0 each step
    _currentStepScore: 10000,
    _paused: false,
    _gameStarted: false,
    _zeroLocked: false,

    init({ level } = {}) {
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

      // Keep phase thresholds proportional when STEP_DURATION is customized.
      if (window.GameConstants?.TIMER) {
        const t = window.GameConstants.TIMER;
        if (typeof t.PHASE_BLUE_END === "number") {
          this._cfg.thresholds.blueToGreen = t.PHASE_BLUE_END;
        }
        if (typeof t.PHASE_GREEN_END === "number") {
          this._cfg.thresholds.greenToYellow = t.PHASE_GREEN_END;
        }
        if (typeof t.PHASE_YELLOW_END === "number") {
          this._cfg.thresholds.yellowToRed = t.PHASE_YELLOW_END;
        }
      }

      this._stepDurationMs = this._cfg.stepDurationSeconds * 1000;
      this._bankedProblemScore = 0;
      this._currentStepScore = this._cfg.initialScore;
      this._scoreAtStepStart = this._cfg.initialScore;

      this._timerValueEl = document.getElementById("timer-value");
      this._timerDisplayEl = document.getElementById("timer-display");
      this._scoreValueEl = document.getElementById("score-value");

      if (modules.setDisplayedScore) {
        modules.setDisplayedScore(this, this.getDisplayedScore());
      }
      if (modules.setDisplayedTime) {
        modules.setDisplayedTime(this, this._cfg.stepDurationSeconds);
      }
      if (modules.applyPhaseStyles) {
        modules.applyPhaseStyles(
          this._timerDisplayEl,
          this._cfg.stepDurationSeconds,
          this._cfg,
        );
      }

      document.addEventListener("problemLineCompleted", (e) => {
        this.completeStep(e?.detail);
      });

      document.addEventListener("problemCompleted", () => {
        this.onProblemCompleted(level);
      });

      if (modules.registerHudElements) {
        modules.registerHudElements(
          document.getElementById("score-display"),
          document.getElementById("timer-display"),
        );
      }

      console.log("✅ ScoreTimerManager initialized");
    },

    onProblemStarted() {
      this._bankedProblemScore = 0;
      this._currentStepScore = this._cfg.initialScore;
      this._zeroLocked = false;
      this._paused = false;
      if (modules.setDisplayedScore) {
        modules.setDisplayedScore(this, this.getDisplayedScore());
      }

      if (this._gameStarted) {
        this.startStep();
      } else {
        if (modules.setDisplayedTime) {
          modules.setDisplayedTime(this, this._cfg.stepDurationSeconds);
        }
        if (modules.applyPhaseStyles) {
          modules.applyPhaseStyles(
            this._timerDisplayEl,
            this._cfg.stepDurationSeconds,
            this._cfg,
          );
        }
      }
    },

    setGameStarted() {
      if (this._gameStarted) return;
      this._gameStarted = true;
      if (!this._paused) {
        this.startStep();
      }
    },

    onProblemCompleted(levelKey) {
      this._paused = true;
      if (modules.clearIntervalId) {
        modules.clearIntervalId(this);
      }

      if (window.PlayerStorage) {
        try {
          const name = window.PlayerStorage.ensurePlayerName();
          const level = window.PlayerStorage.recordProblemResult(
            levelKey ||
              (typeof getLevelFromURL === "function"
                ? getLevelFromURL()
                : "beginner"),
            this.getDisplayedScore(),
          );
          console.log("💾 Saved score:", { name, levelKey, level });
        } catch (e) {
          console.warn("⚠️ Failed to save player score:", e);
        }
      }
    },

    startStep() {
      if (modules.startStep) {
        modules.startStep(this);
      }
    },

    pause() {
      if (modules.pause) {
        modules.pause(this);
      }
    },

    resume() {
      if (modules.resume) {
        modules.resume(this);
      }
    },

    completeStep(detail) {
      if (this._zeroLocked) {
        if (modules.setDisplayedScore) {
          modules.setDisplayedScore(this, 0);
        }
        return;
      }

      const lockedStep = Math.max(0, Math.round(this._currentStepScore));
      this._bankedProblemScore += lockedStep + this._cfg.stepBonus;
      this._currentStepScore = this._cfg.initialScore;

      if (modules.setDisplayedScore) {
        modules.setDisplayedScore(this, this.getDisplayedScore());
      }

      const isLastStep = Boolean(detail?.isLastStep);
      if (isLastStep) {
        this._paused = true;
        if (modules.clearIntervalId) {
          modules.clearIntervalId(this);
        }
        if (modules.setDisplayedTime) {
          modules.setDisplayedTime(this, 0);
        }
      } else {
        this.startStep();
      }

      const scoreDisplay = document.getElementById("score-display");
      if (scoreDisplay) {
        scoreDisplay.classList.remove("score-increase");
        void scoreDisplay.offsetWidth;
        scoreDisplay.classList.add("score-increase");
        setTimeout(() => scoreDisplay.classList.remove("score-increase"), 450);
      }

      document.dispatchEvent(
        new CustomEvent("scoreLocked", {
          detail: {
            lockedScore: lockedStep,
            bonusAdded: this._cfg.stepBonus,
            newScore: this.getDisplayedScore(),
            isLastStep,
          },
        }),
      );
    },

    getDisplayedScore() {
      if (this._zeroLocked) return 0;
      return Math.max(
        0,
        Math.round(this._bankedProblemScore + this._currentStepScore),
      );
    },
  };

  window.ScoreTimerManager = ScoreTimerManager;
  console.log("✅ ScoreTimerManager loaded");
})();
