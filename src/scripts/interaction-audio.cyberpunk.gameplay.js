// src/scripts/interaction-audio.cyberpunk.gameplay.js - Gameplay cyberpunk cues
(function attachCyberpunkInteractionAudioGameplayCues() {
  if (!window.CyberpunkInteractionAudioClass) {
    console.warn(
      "🔊 Cyberpunk Interaction Audio core missing for gameplay cues",
    );
    return;
  }

  const proto = window.CyberpunkInteractionAudioClass.prototype;

  proto.playSymbolClick = function playSymbolClick() {
    this._playCue(
      "symbol-click",
      [
        {
          type: "square",
          startHz: 320,
          endHz: 520,
          duration: 0.05,
          volume: 0.014,
          filterFrequency: 1180,
          q: 7,
        },
      ],
      14,
    );
  };

  proto.playSymbolReveal = function playSymbolReveal() {
    this._playCue(
      "symbol-reveal",
      [
        {
          type: "triangle",
          startHz: 540,
          endHz: 960,
          duration: 0.11,
          volume: 0.02,
          filterFrequency: 1500,
          q: 6,
          pan: -0.08,
        },
        {
          type: "sine",
          startHz: 960,
          endHz: 1320,
          delay: 0.02,
          duration: 0.08,
          volume: 0.012,
          filterFrequency: 2100,
          q: 8,
          pan: 0.1,
        },
      ],
      18,
    );
  };

  proto.playLineCompleted = function playLineCompleted(lineNumber) {
    const base = 420 + Math.min(lineNumber, 6) * 30;

    this._playCue(
      "line-complete",
      [
        {
          type: "triangle",
          startHz: base,
          endHz: base * 1.35,
          duration: 0.15,
          volume: 0.024,
          filterFrequency: 1300,
          q: 5,
          pan: -0.18,
        },
        {
          type: "triangle",
          startHz: base * 1.35,
          endHz: base * 1.8,
          delay: 0.035,
          duration: 0.15,
          volume: 0.02,
          filterFrequency: 1700,
          q: 5,
          pan: 0.18,
        },
        {
          type: "sine",
          startHz: 180,
          endHz: 120,
          duration: 0.18,
          volume: 0.012,
          filterFrequency: 520,
          q: 2,
        },
      ],
      120,
    );
  };

  proto.playRowCompleteCue = function playRowCompleteCue(lineNumber) {
    const base = 560 + Math.min(lineNumber, 6) * 28;

    this._playCue(
      "row-complete",
      [
        {
          type: "sawtooth",
          startHz: base * 0.92,
          endHz: base * 1.45,
          duration: 0.16,
          volume: 0.03,
          filterFrequency: 1800,
          q: 7,
          pan: -0.22,
        },
        {
          type: "square",
          startHz: base * 1.5,
          endHz: base * 2.1,
          delay: 0.028,
          duration: 0.12,
          volume: 0.024,
          filterFrequency: 2400,
          q: 9,
          pan: 0.2,
        },
        {
          type: "triangle",
          startHz: 220,
          endHz: 320,
          delay: 0.018,
          duration: 0.18,
          volume: 0.016,
          filterFrequency: 900,
          q: 4,
        },
      ],
      140,
    );
  };

  proto.playLockAdvance = function playLockAdvance(level) {
    const base = 120 + Math.min(level, 6) * 24;

    this._playCue(
      "lock-advance",
      [
        {
          type: "sawtooth",
          startHz: base,
          endHz: base * 1.6,
          duration: 0.14,
          volume: 0.016,
          filterFrequency: 680,
          q: 4,
          pan: -0.14,
        },
        {
          type: "triangle",
          startHz: base * 2.2,
          endHz: base * 2.9,
          delay: 0.025,
          duration: 0.09,
          volume: 0.014,
          filterFrequency: 1500,
          q: 7,
          pan: 0.14,
        },
      ],
      90,
    );
  };
})();
