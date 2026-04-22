// src/scripts/interaction-audio.cyberpunk.js - Core cyberpunk audio runtime
console.log("🔊 Cyberpunk Interaction Audio core loading...");

(function attachCyberpunkInteractionAudioCore() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const automationAudioOverride =
    window.__MM_ENABLE_AUDIO_IN_TESTS === true;
  const MASTER_GAIN_BASELINE = 0.22;
  const MASTER_GAIN_RAMP_SECONDS = 0.045;
  const GameEvents = window.GameEvents || {
    PROBLEM_LINE_COMPLETED: "problemLineCompleted",
    SYMBOL_CLICKED: "symbolClicked",
    SYMBOL_REVEALED: "symbolRevealed",
  };

  class CyberpunkInteractionAudio {
    constructor() {
      this.context = null;
      this.masterGain = null;
      this.disabled =
        !AudioContextCtor ||
        (typeof navigator !== "undefined" &&
          navigator.webdriver === true &&
          !automationAudioOverride);
      this.activeVoices = 0;
      this.maxVoices = 8;
      this.lastCueTimes = new Map();
      this._pendingCueNames = new Set();
      this._unlockPromise = null;
      this._listenersBound = false;
      this._boundHandlePointerDown = this._handlePointerDown.bind(this);
      this._boundUnlockAudio = this._unlockAudio.bind(this);
      this._boundPlaySymbolClick = () => this.playSymbolClick?.();
      this._boundPlaySymbolReveal = () => this.playSymbolReveal?.();
      this._boundPlayLineCompleted = (event) => {
        const detail = event.detail || {};
        const lineNumber = detail.lineNumber ?? 1;
        this.playLineCompleted?.(lineNumber, detail);
        if (detail.source === "greenWormCompletion") {
          this.playRowCompleteCue?.(lineNumber, detail);
        }
      };
      this._boundPlayLockAdvance = (event) => {
        this.playLockAdvance?.(event.detail?.level ?? 1);
      };
      this._boundPlayPowerUpActivated = (event) => {
        this.playPowerUpActivated?.(event.detail?.type || "default");
      };
    }

    init() {
      if (this.disabled) {
        console.log(
          "🔇 Cyberpunk Interaction Audio disabled (unsupported or automation)",
        );
        return;
      }

      if (this._listenersBound) {
        return;
      }

      document.addEventListener("pointerdown", this._boundHandlePointerDown, {
        capture: true,
        passive: true,
      });
      document.addEventListener("keydown", this._boundUnlockAudio, {
        passive: true,
      });
      document.addEventListener(
        GameEvents.SYMBOL_CLICKED,
        this._boundPlaySymbolClick,
      );
      document.addEventListener(
        GameEvents.SYMBOL_REVEALED,
        this._boundPlaySymbolReveal,
      );
      document.addEventListener(
        GameEvents.PROBLEM_LINE_COMPLETED,
        this._boundPlayLineCompleted,
      );
      document.addEventListener("lockLevelUpdated", this._boundPlayLockAdvance);
      document.addEventListener(
        "powerUpActivated",
        this._boundPlayPowerUpActivated,
      );

      this._listenersBound = true;

      console.log("🔊 Cyberpunk Interaction Audio ready");
    }

    destroy() {
      if (this._listenersBound) {
        document.removeEventListener(
          "pointerdown",
          this._boundHandlePointerDown,
          { capture: true },
        );
        document.removeEventListener("keydown", this._boundUnlockAudio);
        document.removeEventListener(
          GameEvents.SYMBOL_CLICKED,
          this._boundPlaySymbolClick,
        );
        document.removeEventListener(
          GameEvents.SYMBOL_REVEALED,
          this._boundPlaySymbolReveal,
        );
        document.removeEventListener(
          GameEvents.PROBLEM_LINE_COMPLETED,
          this._boundPlayLineCompleted,
        );
        document.removeEventListener(
          "lockLevelUpdated",
          this._boundPlayLockAdvance,
        );
        document.removeEventListener(
          "powerUpActivated",
          this._boundPlayPowerUpActivated,
        );
        this._listenersBound = false;
      }

      this.stopDrumSequencer?.();

      if (this.masterGain) {
        this.masterGain.disconnect();
        this.masterGain = null;
      }

      if (
        this.context &&
        typeof this.context.close === "function" &&
        this.context.state !== "closed"
      ) {
        this.context.close().catch((error) => {
          console.log("🔇 Audio context close deferred:", error?.message || error);
        });
      }

      this.context = null;
      this.lastCueTimes.clear();
      this._pendingCueNames.clear();
      this._unlockPromise = null;
      this.activeVoices = 0;
    }

    _ensureContext() {
      if (this.disabled) return null;
      if (this.context) return this.context;

      this.context = new AudioContextCtor();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this._getTargetMasterGainValue();

      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 24;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.22;

      this.masterGain.connect(compressor);
      compressor.connect(this.context.destination);
      this._applyMasterGainTarget(this._getTargetMasterGainValue(), 0);

      return this.context;
    }

    _getTargetMasterGainValue() {
      return this.isMuted ? 0 : MASTER_GAIN_BASELINE;
    }

    _applyMasterGainTarget(
      targetGain,
      rampSeconds = MASTER_GAIN_RAMP_SECONDS,
    ) {
      if (!this.context || !this.masterGain?.gain) {
        return;
      }

      const now = this.context.currentTime;
      const gainNode = this.masterGain.gain;
      const currentValue = Number.isFinite(gainNode.value)
        ? gainNode.value
        : targetGain;

      gainNode.cancelScheduledValues(now);
      gainNode.setValueAtTime(currentValue, now);

      if (rampSeconds <= 0) {
        gainNode.setValueAtTime(targetGain, now);
        return;
      }

      gainNode.linearRampToValueAtTime(targetGain, now + rampSeconds);
    }

    _unlockAudio() {
      const context = this._ensureContext();
      if (!context) {
        return Promise.resolve(null);
      }

      if (context.state === "running") {
        return Promise.resolve(context);
      }

      if (typeof context.resume !== "function") {
        return Promise.resolve(context);
      }

      if (!this._unlockPromise) {
        this._unlockPromise = context
          .resume()
          .then(() => context)
          .catch((error) => {
            console.log("🔇 Audio resume deferred:", error?.message || error);
            return null;
          })
          .finally(() => {
            this._unlockPromise = null;
          });
      }

      return this._unlockPromise;
    }

    _handlePointerDown(event) {
      this._unlockAudio();

      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest("#start-game-btn")) {
        this.playStartButton?.();
        return;
      }
      if (target.closest("#worm-container, .worm-container")) {
        this.playWormTap?.(target.closest(".purple-worm") ? "purple" : "green");
        return;
      }
      if (target.closest(".power-up-item")) {
        this.playPowerUpSelect?.();
        return;
      }
      if (target.closest(".symbol-choice, .position-choice")) {
        this.playModalSelect?.();
        return;
      }

      if (
        target.closest(
          "#help-button, #clarify-button, #back-button, #skip-button, #modal-close-btn",
        )
      ) {
        this.playUiButton?.();
      }
    }

    _playCue(name, layers, minIntervalMs = 20) {
      const context = this._ensureContext();
      if (!context || !this.masterGain) return;

      if (context.state !== "running") {
        if (this._pendingCueNames.has(name)) {
          return;
        }

        this._pendingCueNames.add(name);
        this._unlockAudio().then((unlockedContext) => {
          this._pendingCueNames.delete(name);
          if (!unlockedContext || unlockedContext.state !== "running") {
            return;
          }

          this._playCue(name, layers, minIntervalMs);
        });
        return;
      }

      const nowMs = performance.now();
      const lastCueAt = this.lastCueTimes.get(name) ?? -Infinity;
      if (nowMs - lastCueAt < minIntervalMs) return;
      this.lastCueTimes.set(name, nowMs);

      const baseTime = context.currentTime + 0.002;
      layers.forEach((layer) => this._scheduleLayer(baseTime, layer));
    }

    _scheduleLayer(baseTime, layer) {
      const context = this._ensureContext();
      if (!context || !this.masterGain || this.activeVoices >= this.maxVoices) {
        return;
      }

      this.activeVoices++;

      const oscillator = context.createOscillator();
      const filter = context.createBiquadFilter();
      const gainNode = context.createGain();
      const startTime = baseTime + (layer.delay ?? 0);
      const duration = layer.duration ?? 0.12;
      const attack = layer.attack ?? 0.004;
      const release = layer.release ?? 0.08;
      const startHz = Math.max(30, layer.startHz ?? 440);
      const endHz = Math.max(30, layer.endHz ?? startHz);

      oscillator.type = layer.type ?? "triangle";
      oscillator.frequency.setValueAtTime(startHz, startTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        endHz,
        startTime + duration,
      );
      oscillator.detune.setValueAtTime(layer.detune ?? 0, startTime);

      filter.type = layer.filterType ?? "bandpass";
      filter.frequency.setValueAtTime(
        layer.filterFrequency ?? Math.max(startHz, endHz),
        startTime,
      );
      filter.Q.value = layer.q ?? 3;

      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(
        layer.volume ?? 0.025,
        startTime + attack,
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        startTime + duration + release,
      );

      oscillator.connect(filter);
      if (typeof context.createStereoPanner === "function") {
        const panner = context.createStereoPanner();
        panner.pan.value = layer.pan ?? 0;
        filter.connect(panner);
        panner.connect(gainNode);
      } else {
        filter.connect(gainNode);
      }

      gainNode.connect(this.masterGain);
      oscillator.onended = () => {
        this.activeVoices = Math.max(0, this.activeVoices - 1);
        oscillator.disconnect();
        filter.disconnect();
        gainNode.disconnect();
      };

      oscillator.start(startTime);
      oscillator.stop(startTime + duration + release + 0.04);
    }
  }

  window.CyberpunkInteractionAudioClass = CyberpunkInteractionAudio;
})();
