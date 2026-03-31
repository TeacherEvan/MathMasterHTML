// src/scripts/interaction-audio.cyberpunk.ui.js - UI-facing cyberpunk cues
(function attachCyberpunkInteractionAudioUiCues() {
  if (!window.CyberpunkInteractionAudioClass) {
    console.warn("🔊 Cyberpunk Interaction Audio core missing for UI cues");
    return;
  }

  const proto = window.CyberpunkInteractionAudioClass.prototype;

  proto.playStartButton = function playStartButton() {
    this._playCue(
      "start-button",
      [
        {
          type: "triangle",
          startHz: 180,
          endHz: 420,
          duration: 0.16,
          volume: 0.03,
          filterFrequency: 760,
          q: 4,
          pan: -0.15,
        },
        {
          type: "sawtooth",
          startHz: 640,
          endHz: 1180,
          delay: 0.03,
          duration: 0.12,
          volume: 0.018,
          filterFrequency: 1800,
          q: 6,
          pan: 0.18,
        },
      ],
      60,
    );
  };

  proto.playUiButton = function playUiButton() {
    this._playCue(
      "ui-button",
      [
        {
          type: "triangle",
          startHz: 960,
          endHz: 720,
          duration: 0.08,
          volume: 0.02,
          filterFrequency: 1400,
          q: 5,
        },
      ],
      30,
    );
  };

  proto.playModalSelect = function playModalSelect() {
    this._playCue(
      "modal-select",
      [
        {
          type: "triangle",
          startHz: 620,
          endHz: 980,
          duration: 0.1,
          volume: 0.022,
          filterFrequency: 1350,
          q: 5,
        },
        {
          type: "sine",
          startHz: 980,
          endHz: 1120,
          delay: 0.015,
          duration: 0.06,
          volume: 0.012,
          filterFrequency: 1800,
          q: 6,
        },
      ],
      30,
    );
  };

  proto.playPowerUpSelect = function playPowerUpSelect() {
    this._playCue(
      "power-select",
      [
        {
          type: "square",
          startHz: 260,
          endHz: 360,
          duration: 0.09,
          volume: 0.02,
          filterFrequency: 920,
          q: 7,
          pan: -0.12,
        },
        {
          type: "triangle",
          startHz: 780,
          endHz: 1260,
          delay: 0.02,
          duration: 0.08,
          volume: 0.014,
          filterFrequency: 1850,
          q: 6,
          pan: 0.12,
        },
      ],
      35,
    );
  };
})();
