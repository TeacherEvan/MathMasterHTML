// js/score-timer-manager.js - Countdown timer + step-based scoring
console.log("⏱️ ScoreTimerManager loading...");

(function() {
  const GameEvents = window.GameEvents || {
    PROBLEM_COMPLETED: "problemCompleted",
    PROBLEM_LINE_COMPLETED: "problemLineCompleted",
  };

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
    _queuedBonusPoints: [],
    _problemStarted: false,
    // Live step score counts down from 1000 -> 0 each step
    _currentStepScore: 10000,
    _manualPause: false,
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
      this._queuedBonusPoints = [];
      this._problemStarted = false;
      this._currentStepScore = this._cfg.initialScore;
      this._manualPause = false;
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

      document.addEventListener(GameEvents.PROBLEM_LINE_COMPLETED, (e) => {
        this.completeStep(e?.detail);
      });

      document.addEventListener(GameEvents.PROBLEM_COMPLETED, () => {
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
      if (modules.clearIntervalId) {
        modules.clearIntervalId(this);
      }

      this._bankedProblemScore = 0;
      this._currentStepScore = this._cfg.initialScore;
      this._scoreAtStepStart = this._cfg.initialScore;
      this._stepStartMs = 0;
      this._paused = false;
      if (this._manualPause) {
        this._paused = true;
      }
      this._zeroLocked = false;
      this._problemStarted = true;

      if (this._queuedBonusPoints.length > 0) {
        const queuedBonusPoints = this._queuedBonusPoints.splice(0);
        queuedBonusPoints.forEach(({ points, meta }) => {
          this._applyBonusPoints(points, meta);
        });
      }

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

      if (this._gameStarted && !this._paused) {
        this.startStep();
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
      this._problemStarted = false;
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
      this._manualPause = true;
      if (modules.pause) {
        modules.pause(this);
      }
    },

    resume() {
      this._manualPause = false;
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

    addBonusPoints(points, meta = {}) {
      if (this._zeroLocked) return 0;
      const amount = Math.max(0, Math.round(Number(points) || 0));
      if (!amount) return this.getDisplayedScore();

      if (!this._problemStarted) {
        this._queuedBonusPoints.push({ points: amount, meta });
        return this.getDisplayedScore();
      }

      return this._applyBonusPoints(amount, meta);
    },

    _applyBonusPoints(points, meta = {}) {
      const amount = Math.max(0, Math.round(Number(points) || 0));
      if (!amount || this._zeroLocked) return this.getDisplayedScore();

      this._bankedProblemScore += amount;
      const newScore = this.getDisplayedScore();

      if (modules.setDisplayedScore) {
        modules.setDisplayedScore(this, newScore);
      }

      const scoreDisplay = document.getElementById("score-display");
      if (scoreDisplay) {
        scoreDisplay.classList.remove("score-increase");
        void scoreDisplay.offsetWidth;
        scoreDisplay.classList.add("score-increase");
        setTimeout(() => scoreDisplay.classList.remove("score-increase"), 450);
      }

      document.dispatchEvent(
        new CustomEvent("scoreBonusAdded", {
          detail: {
            points: amount,
            newScore,
            meta,
          },
        }),
      );
      return newScore;
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
