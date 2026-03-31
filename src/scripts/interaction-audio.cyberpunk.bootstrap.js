// src/scripts/interaction-audio.cyberpunk.bootstrap.js - Bootstrap cyberpunk audio
(function bootstrapCyberpunkInteractionAudio() {
  if (!window.CyberpunkInteractionAudioClass) {
    console.warn("🔊 Cyberpunk Interaction Audio core missing for bootstrap");
    return;
  }

  const interactionAudio = new window.CyberpunkInteractionAudioClass();
  interactionAudio.init();
  window.CyberpunkInteractionAudio = interactionAudio;
})();
