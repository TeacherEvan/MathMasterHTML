// src/scripts/interaction-audio.cyberpunk.controls.js - Audio toggle UI wiring
(function attachCyberpunkInteractionAudioControls() {
  const AUDIO_EVENTS = window.CyberpunkInteractionAudioEvents || {
    toggleRequested: "cyberpunkAudioToggleRequested",
    stateChanged: "cyberpunkAudioStateChanged",
  };

  function readCurrentAudioState() {
    const audio = window.CyberpunkInteractionAudio;
    if (!audio) {
      return {
        available: false,
        muted: false,
      };
    }

    return {
      available: audio.disabled !== true || navigator.webdriver === true,
      muted: audio.isMuted === true,
    };
  }

  function updateToggle(button, detail = {}) {
    const available = detail.available !== false;
    const muted = detail.muted === true;
    const nextState = !available ? "unavailable" : muted ? "muted" : "active";
    const label = !available
      ? "Audio unavailable"
      : muted
        ? "Sound off"
        : "Sound on";

    button.dataset.audioState = nextState;
    button.ariaPressed = String(!muted);
    button.ariaDisabled = String(!available);
    button.toggleAttribute("disabled", !available);

    const labelNode = button.querySelector(".audio-toggle__label");
    if (labelNode) {
      labelNode.textContent = label;
    } else {
      button.textContent = label;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("audio-toggle");
    if (!button) {
      return;
    }

    button.addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent(AUDIO_EVENTS.toggleRequested));
    });

    document.addEventListener(AUDIO_EVENTS.stateChanged, (event) => {
      updateToggle(button, event.detail || {});
    });

    updateToggle(button, readCurrentAudioState());
  });
})();
