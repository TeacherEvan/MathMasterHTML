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
  const originalDestroy = proto.destroy;
  const originalPlayCue = proto._playCue;

  function isAudioUiAvailable(instance) {
    return instance?.disabled !== true || navigator.webdriver === true;
  }

  proto._readMutedPreference = function () {
    const userSettingsMuted = window.UserSettings?.getSettings?.()?.sound?.muted;
    if (typeof userSettingsMuted === "boolean") {
      return userSettingsMuted;
    }

    try {
      return window.localStorage?.getItem(STORAGE_KEY) === "muted";
    } catch {
      return false;
    }
  };

  proto._persistMutedPreference = function () {
    if (window.UserSettings?.updateSettings) {
      window.UserSettings.updateSettings(
        {
          sound: {
            muted: this.isMuted === true,
          },
        },
        "audio-state",
      );
      return;
    }

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
          available: isAudioUiAvailable(this),
          muted: !!this.isMuted,
          reason,
        },
      }),
    );
  };

  proto.setMuted = function (nextMuted, reason = "manual") {
    this.isMuted = !!nextMuted;
    this._applyMasterGainTarget?.(this._getTargetMasterGainValue?.() ?? 0);
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
      this._boundAudioToggleRequested = () => {
        this.toggleMuted("ui-toggle");
      };
      this._muteToggleListenerBound = true;
      document.addEventListener(
        AUDIO_EVENTS.toggleRequested,
        this._boundAudioToggleRequested,
      );
    }

    if (!this._userSettingsListenerBound) {
      this._boundUserSettingsChanged = (event) => {
        const changedKeys = Array.isArray(event.detail?.changedKeys)
          ? event.detail.changedKeys
          : [];

        if (!changedKeys.includes("sound.muted")) {
          return;
        }

        const nextMuted =
          window.UserSettings?.getSettings?.()?.sound?.muted === true;

        if (this.isMuted === nextMuted) {
          return;
        }

        this.isMuted = nextMuted;
        this._applyMasterGainTarget?.(this._getTargetMasterGainValue?.() ?? 0);
        this._emitAudioStateChanged("user-settings-sync");
      };
      this._userSettingsListenerBound = true;
      document.addEventListener(
        window.GameEvents?.USER_SETTINGS_CHANGED || "userSettingsChanged",
        this._boundUserSettingsChanged,
      );
    }

    this._emitAudioStateChanged("init");
  };

  proto.destroy = function destroyCyberpunkInteractionAudioState() {
    if (this._muteToggleListenerBound && this._boundAudioToggleRequested) {
      document.removeEventListener(
        AUDIO_EVENTS.toggleRequested,
        this._boundAudioToggleRequested,
      );
      this._muteToggleListenerBound = false;
      this._boundAudioToggleRequested = null;
    }

    if (this._userSettingsListenerBound && this._boundUserSettingsChanged) {
      document.removeEventListener(
        window.GameEvents?.USER_SETTINGS_CHANGED || "userSettingsChanged",
        this._boundUserSettingsChanged,
      );
      this._userSettingsListenerBound = false;
      this._boundUserSettingsChanged = null;
    }

    return originalDestroy?.call(this);
  };

  proto._playCue = function (name, layers, minIntervalMs = 20) {
    if (this.isMuted) {
      return;
    }

    return originalPlayCue.call(this, name, layers, minIntervalMs);
  };

  window.CyberpunkInteractionAudioEvents = AUDIO_EVENTS;
})();
