// src/scripts/interaction-audio.cyberpunk.encounters.js - Encounter cyberpunk cues
(function attachCyberpunkInteractionAudioEncounterCues() {
  if (!window.CyberpunkInteractionAudioClass) {
    console.warn(
      "🔊 Cyberpunk Interaction Audio core missing for encounter cues",
    );
    return;
  }

  const proto = window.CyberpunkInteractionAudioClass.prototype;

  proto.playPowerUpActivated = function playPowerUpActivated(type) {
    const profiles = {
      chainLightning: { startHz: 260, endHz: 980, pan: -0.16 },
      devil: { startHz: 180, endHz: 620, pan: 0.14 },
      spider: { startHz: 220, endHz: 720, pan: 0 },
    };
    const profile = profiles[type] || {
      startHz: 220,
      endHz: 760,
      pan: 0,
    };

    this._playCue(
      "power-activated",
      [
        {
          type: "square",
          startHz: profile.startHz,
          endHz: profile.endHz,
          duration: 0.13,
          volume: 0.018,
          filterFrequency: 1100,
          q: 6,
          pan: profile.pan,
        },
        {
          type: "triangle",
          startHz: profile.endHz,
          endHz: profile.endHz * 1.2,
          delay: 0.03,
          duration: 0.09,
          volume: 0.012,
          filterFrequency: 1900,
          q: 8,
          pan: profile.pan * -1,
        },
      ],
      40,
    );
  };

  proto.playWormTap = function playWormTap(kind) {
    if (kind === "purple") {
      this._playCue(
        "worm-purple",
        [
          {
            type: "square",
            startHz: 160,
            endHz: 74,
            duration: 0.11,
            volume: 0.02,
            filterFrequency: 620,
            q: 5,
            pan: -0.1,
          },
          {
            type: "triangle",
            startHz: 820,
            endHz: 460,
            delay: 0.015,
            duration: 0.08,
            volume: 0.012,
            filterFrequency: 1400,
            q: 7,
            pan: 0.16,
          },
        ],
        28,
      );
      return;
    }

    this._playCue(
      "worm-green",
      [
        {
          type: "triangle",
          startHz: 240,
          endHz: 120,
          duration: 0.09,
          volume: 0.018,
          filterFrequency: 760,
          q: 5,
        },
        {
          type: "sine",
          startHz: 620,
          endHz: 320,
          delay: 0.01,
          duration: 0.05,
          volume: 0.01,
          filterFrequency: 980,
          q: 6,
        },
      ],
      22,
    );
  };
})();
