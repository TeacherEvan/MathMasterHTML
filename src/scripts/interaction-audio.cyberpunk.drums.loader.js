// src/scripts/interaction-audio.cyberpunk.drums.loader.js - Progressive drum sample loader
console.log("🥁 Cyberpunk Drum System loading...");

(function attachCyberpunkDrumLoader() {
  if (!window.CyberpunkInteractionAudioClass) {
    console.warn("🥁 Cyberpunk Interaction Audio core missing for drum loader");
    return;
  }

  const proto = window.CyberpunkInteractionAudioClass.prototype;
  const DRUM_ASSETS = "/src/assets/audio/drums/";
  const SAMPLE_NAMES = ["kick", "snare", "hihat", "accent"];

  proto.loadDrumSamples = async function loadDrumSamples() {
    const context = this._ensureContext();
    if (!context) return;

    this._drumBuffers = this._drumBuffers || {};

    const loads = SAMPLE_NAMES.map(async (name) => {
      if (Object.prototype.hasOwnProperty.call(this._drumBuffers, name)) {
        return;
      }

      try {
        const canPlayOgg =
          typeof Audio !== "undefined" &&
          new Audio().canPlayType("audio/ogg; codecs=vorbis");
        const ext = canPlayOgg ? "ogg" : "mp3";
        const response = await fetch(`${DRUM_ASSETS}${name}.${ext}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        this._drumBuffers[name] = await context.decodeAudioData(arrayBuffer);
      } catch (error) {
        console.warn(
          `🥁 Failed to load drum sample '${name}':`,
          error?.message || error,
        );
        this._drumBuffers[name] = null;
      }
    });

    await Promise.all(loads);
  };
})();
