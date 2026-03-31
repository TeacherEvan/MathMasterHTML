// src/scripts/interaction-audio.cyberpunk.js - Core cyberpunk audio runtime
console.log("🔊 Cyberpunk Interaction Audio core loading...");

(function attachCyberpunkInteractionAudioCore() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
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
        (typeof navigator !== "undefined" && navigator.webdriver === true);
      this.activeVoices = 0;
      this.maxVoices = 8;
      this.lastCueTimes = new Map();
      this._boundHandlePointerDown = this._handlePointerDown.bind(this);
      this._boundUnlockAudio = this._unlockAudio.bind(this);
    }

    init() {
      if (this.disabled) {
        console.log("🔇 Cyberpunk Interaction Audio disabled (unsupported or automation)");
        return;
      }

      document.addEventListener("pointerdown", this._boundHandlePointerDown, {
        capture: true,
        passive: true,
      });
      document.addEventListener("keydown", this._boundUnlockAudio, { passive: true });
      document.addEventListener(GameEvents.SYMBOL_CLICKED, () =>
        this.playSymbolClick?.(),
      );
      document.addEventListener(GameEvents.SYMBOL_REVEALED, () =>
        this.playSymbolReveal?.(),
      );
      document.addEventListener(GameEvents.PROBLEM_LINE_COMPLETED, (event) => {
        this.playLineCompleted?.(event.detail?.lineNumber ?? 1);
      });
      document.addEventListener("lockLevelUpdated", (event) => {
        this.playLockAdvance?.(event.detail?.level ?? 1);
      });
      document.addEventListener("powerUpActivated", (event) => {
        this.playPowerUpActivated?.(event.detail?.type || "default");
      });

      console.log("🔊 Cyberpunk Interaction Audio ready");
    }

    _ensureContext() {
      if (this.disabled) return null;
      if (this.context) return this.context;

      this.context = new AudioContextCtor();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.055;

      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 24;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.22;

      this.masterGain.connect(compressor);
      compressor.connect(this.context.destination);

      return this.context;
    }

    _unlockAudio() {
      const context = this._ensureContext();
      if (!context || context.state !== "suspended") return;

      context.resume().catch((error) => {
        console.log("🔇 Audio resume deferred:", error?.message || error);
      });
    }

    _handlePointerDown(event) {
      this._unlockAudio();

      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest("#start-game-btn")) {
        this.playStartButton?.();
        return;
      }
      if (target.closest(".worm-container")) {
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
      if (!context || context.state !== "running" || !this.masterGain) return;
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
