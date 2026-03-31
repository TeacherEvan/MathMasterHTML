// src/scripts/interaction-audio.cyberpunk.state.js - Mute state and events
(function attachCyberpunkInteractionAudioState() {
  if (!window.CyberpunkInteractionAudioClass) {
    console.warn(
      "🔊 Cyberpunk Interaction Audio core missing for state helpers",
    );
    return;
  }

  const proto = window.CyberpunkInteractionAudioClass.prototype;
  const AUDIO_EVENTS = {
    toggleRequested: "cyberpunkAudioToggleRequested",
    stateChanged: "cyberpunkAudioStateChanged",
  };
  const STORAGE_KEY = "mathmaster_audio_pref_v1";
  const originalInit = proto.init;
  const originalPlayCue = proto._playCue;

  proto._readMutedPreference = function () {
    try {
      return window.localStorage?.getItem(STORAGE_KEY) === "muted";
    } catch {
      return false;
    }
  };

  proto._persistMutedPreference = function () {
    try {
      window.localStorage?.setItem(STORAGE_KEY, this.isMuted ? "muted" : "on");
    } catch {
      // Ignore storage failures.
    }
  };

  proto._emitAudioStateChanged = function (reason = "sync") {
    document.dispatchEvent(
      new CustomEvent(AUDIO_EVENTS.stateChanged, {
        detail: {
          available: !this.disabled,
          muted: !!this.isMuted,
          reason,
        },
      }),
    );
  };

  proto.setMuted = function (nextMuted, reason = "manual") {
    this.isMuted = !!nextMuted;
    this._persistMutedPreference();
    this._emitAudioStateChanged(reason);
    return this.isMuted;
  };

  proto.toggleMuted = function (reason = "toggle") {
    return this.setMuted(!this.isMuted, reason);
  };

  proto.init = function () {
    this.isMuted = this._readMutedPreference();
    originalInit.call(this);

    if (!this._muteToggleListenerBound) {
      this._muteToggleListenerBound = true;
      document.addEventListener(AUDIO_EVENTS.toggleRequested, () => {
        this.toggleMuted("ui-toggle");
      });
    }

    this._emitAudioStateChanged("init");
  };

  proto._playCue = function (name, layers, minIntervalMs = 20) {
    if (this.isMuted) {
      return;
    }

    return originalPlayCue.call(this, name, layers, minIntervalMs);
  };

  window.CyberpunkInteractionAudioEvents = AUDIO_EVENTS;
})();
