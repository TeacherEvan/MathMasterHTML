// src/scripts/interaction-audio.cyberpunk.bootstrap.js - Bootstrap cyberpunk audio
(function bootstrapCyberpunkInteractionAudio() {
  if (!window.CyberpunkInteractionAudioClass) {
    console.warn("🔊 Cyberpunk Interaction Audio core missing for bootstrap");
    return;
  }

  const interactionAudio = new window.CyberpunkInteractionAudioClass();
  interactionAudio.init();
  window.CyberpunkInteractionAudio = interactionAudio;

  // Close the AudioContext on a real unload so successive navigations do not
  // accumulate contexts. A BFCache pagehide is NOT an unload: the same runtime
  // is restored, and destroy() cannot be fully reversed (closed context, torn
  // down drum sequencer), so leave audio intact in that case.
  const cleanupAudio = (event) => {
    if (event?.type === "pagehide" && event.persisted === true) return;
    const audio = window.CyberpunkInteractionAudio;
    if (audio && typeof audio.destroy === "function") {
      audio.destroy();
    }
  };

  window.addEventListener("pagehide", cleanupAudio);
  window.addEventListener("beforeunload", cleanupAudio);

  // Safety net: if some other path tore audio down, restore it on BFCache
  // return. init() is a no-op when listeners are still bound.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      window.CyberpunkInteractionAudio?.init?.();
    }
  });
})();
