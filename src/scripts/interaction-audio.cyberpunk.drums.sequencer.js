// src/scripts/interaction-audio.cyberpunk.drums.sequencer.js - Progressive drum scheduler
(function attachCyberpunkDrumSequencer() {
  if (!window.CyberpunkInteractionAudioClass) {
    console.warn(
      "🥁 Cyberpunk Interaction Audio core missing for drum sequencer",
    );
    return;
  }

  const proto = window.CyberpunkInteractionAudioClass.prototype;
  const drumConfig = window.CyberpunkDrumSystemConfig;

  if (!drumConfig) {
    console.warn("🥁 Drum pattern config missing for drum sequencer");
    return;
  }

  const { DRUM_PATTERNS, STEP_DURATION, LOOKAHEAD_MS, SCHEDULE_AHEAD_S } =
    drumConfig;
  const originalInit = proto.init;
  const originalDestroy = proto.destroy;

  proto.init = function initWithDrums() {
    this._drumComplexity = 0;
    this._drumMaxComplexity = DRUM_PATTERNS.length - 1;
    this._drumStep = 0;
    this._drumNextStepTime = 0;
    this._drumSchedulerId = null;
    this._drumRunning = false;
    this._drumGain = null;
    this._drumBuffers = this._drumBuffers || {};

    originalInit.call(this);

    if (!this._drumEventBound) {
      this._boundDrumAdvanceComplexity = () => {
        this._drumAdvanceComplexity();
      };
      this._boundDrumMuteStateChange = (event) => {
        if (this._drumGain && this.context) {
          const nextGain = event.detail?.muted ? 0 : 0.03;
          this._drumGain.gain.cancelScheduledValues(this.context.currentTime);
          this._drumGain.gain.setValueAtTime(
            nextGain,
            this.context.currentTime,
          );
        }
      };
      this._drumEventBound = true;
      document.addEventListener(
        "problemLineCompleted",
        this._boundDrumAdvanceComplexity,
      );
      document.addEventListener(
        window.CyberpunkInteractionAudioEvents?.stateChanged ||
          "cyberpunkAudioStateChanged",
        this._boundDrumMuteStateChange,
      );
    }
  };

  proto._drumEnsureGain = function _drumEnsureGain() {
    if (this._drumGain) return this._drumGain;
    const context = this._ensureContext();
    if (!context || !this.masterGain) return null;
    this._drumGain = context.createGain();
    this._drumGain.gain.value = this.isMuted ? 0 : 0.03;
    this._drumGain.connect(this.masterGain);
    return this._drumGain;
  };

  proto._drumAdvanceComplexity = function _drumAdvanceComplexity() {
    const previous = this._drumComplexity;
    this._drumComplexity = Math.min(
      this._drumComplexity + 1,
      this._drumMaxComplexity,
    );

    if (previous === 0 && this._drumComplexity > 0 && !this._drumRunning) {
      this.startDrumSequencer();
    }
  };

  proto.startDrumSequencer = async function startDrumSequencer() {
    if (this.disabled || this._drumRunning) return;
    const context = this._ensureContext();
    if (!context) return;
    if (!this._drumEnsureGain()) return;

    await this.loadDrumSamples();

    this._drumRunning = true;
    this._drumStep = 0;
    this._drumNextStepTime = context.currentTime + 0.05;
    this._drumSchedulerId = window.setInterval(() => {
      this._drumSchedule(DRUM_PATTERNS, STEP_DURATION, SCHEDULE_AHEAD_S);
    }, LOOKAHEAD_MS);
  };

  proto.stopDrumSequencer = function stopDrumSequencer() {
    if (this._drumSchedulerId !== null) {
      window.clearInterval(this._drumSchedulerId);
      this._drumSchedulerId = null;
    }
    this._drumRunning = false;
  };

  proto.destroyDrumSequencer = function destroyDrumSequencer() {
    this.stopDrumSequencer();

    if (this._drumEventBound) {
      document.removeEventListener(
        "problemLineCompleted",
        this._boundDrumAdvanceComplexity,
      );
      document.removeEventListener(
        window.CyberpunkInteractionAudioEvents?.stateChanged ||
          "cyberpunkAudioStateChanged",
        this._boundDrumMuteStateChange,
      );
      this._drumEventBound = false;
    }

    this._boundDrumAdvanceComplexity = null;
    this._boundDrumMuteStateChange = null;

    if (this._drumGain) {
      this._drumGain.disconnect();
      this._drumGain = null;
    }
  };

  proto.destroy = function destroyCyberpunkInteractionAudioDrums() {
    this.destroyDrumSequencer?.();
    return originalDestroy?.call(this);
  };

  proto._drumSchedule = function _drumSchedule(
    patterns,
    stepDuration,
    scheduleAhead,
  ) {
    if (!this.context || !this._drumRunning) return;

    while (this._drumNextStepTime < this.context.currentTime + scheduleAhead) {
      const pattern = patterns[this._drumComplexity] || [];
      if (pattern.length > 0) {
        const stepData = pattern[this._drumStep % pattern.length];
        if (stepData) {
          stepData.forEach((hit) => {
            this._playDrumHit(hit.s, this._drumNextStepTime, hit.v);
          });
        }
      }
      this._drumStep += 1;
      this._drumNextStepTime += stepDuration;
    }
  };
})();
