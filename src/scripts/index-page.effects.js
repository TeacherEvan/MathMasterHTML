// src/scripts/index-page.effects.js
(function () {
  "use strict";

  const CONFIG = Object.freeze({
    PULSE_INTERVAL_MS: 2600,
    CTA_ACTIVE_MS: 720,
    REDUCED_MOTION_QUERY: "(prefers-reduced-motion: reduce)",
    PHASES: Object.freeze([
      Object.freeze({
        accent: "rgba(122, 255, 187, 0.9)",
        titleFilter: "brightness(1)",
        titleShadow:
          "0 0 18px rgba(122, 255, 187, 0.32), 0 0 48px rgba(36, 198, 141, 0.18)",
        subtitleColor: "#d7f7d1",
        logoShadow:
          "0 0 0 1px rgba(123, 255, 188, 0.16), 0 18px 48px rgba(0, 0, 0, 0.42), 0 0 46px rgba(36, 198, 141, 0.24)",
        logoScale: "1",
      }),
      Object.freeze({
        accent: "rgba(255, 214, 122, 0.92)",
        titleFilter: "brightness(1.04)",
        titleShadow:
          "0 0 22px rgba(255, 214, 122, 0.34), 0 0 56px rgba(255, 176, 74, 0.18)",
        subtitleColor: "#ffe5a8",
        logoShadow:
          "0 0 0 1px rgba(255, 214, 122, 0.18), 0 20px 52px rgba(0, 0, 0, 0.44), 0 0 54px rgba(255, 176, 74, 0.24)",
        logoScale: "1.018",
      }),
      Object.freeze({
        accent: "rgba(137, 244, 255, 0.9)",
        titleFilter: "brightness(1.02)",
        titleShadow:
          "0 0 20px rgba(137, 244, 255, 0.28), 0 0 50px rgba(38, 173, 255, 0.18)",
        subtitleColor: "#c6f5ff",
        logoShadow:
          "0 0 0 1px rgba(137, 244, 255, 0.18), 0 18px 48px rgba(0, 0, 0, 0.42), 0 0 48px rgba(38, 173, 255, 0.22)",
        logoScale: "1.01",
      }),
    ]),
  });

  const page = document.body;
  const title = document.querySelector(".main-title");
  const subtitle = document.querySelector(".subtitle");
  const logoCircle = document.querySelector(".logo-circle");
  const primaryCta = document.getElementById("begin-training-button");
  const reducedMotionQuery = window.matchMedia?.(CONFIG.REDUCED_MOTION_QUERY);

  const state = {
    pulseIntervalId: null,
    ctaResetId: null,
    phaseIndex: 0,
    motionListenerAttached: false,
  };

  function prefersReducedMotion() {
    return Boolean(reducedMotionQuery?.matches);
  }

  function applyPhase(index) {
    const phase = CONFIG.PHASES[index] || CONFIG.PHASES[0];

    page?.style.setProperty("--welcome-accent", phase.accent);

    if (title) {
      title.style.filter = phase.titleFilter;
      title.style.textShadow = phase.titleShadow;
    }

    if (subtitle) {
      subtitle.style.color = phase.subtitleColor;
    }

    if (logoCircle) {
      logoCircle.style.boxShadow = phase.logoShadow;
      logoCircle.style.transform = `scale(${phase.logoScale})`;
    }
  }

  function advancePhase() {
    state.phaseIndex = (state.phaseIndex + 1) % CONFIG.PHASES.length;
    applyPhase(state.phaseIndex);
  }

  function activatePrimaryCta(origin = "pointer") {
    if (!primaryCta) {
      return false;
    }

    primaryCta.classList.add("is-activating");
    primaryCta.dataset.activationOrigin = origin;
    clearTimeout(state.ctaResetId);
    state.ctaResetId = setTimeout(() => {
      primaryCta.classList.remove("is-activating");
      delete primaryCta.dataset.activationOrigin;
    }, CONFIG.CTA_ACTIVE_MS);

    return true;
  }

  function handleMotionPreferenceChange() {
    if (document.hidden) {
      return;
    }

    startDynamicEffects();
  }

  function attachMotionListener() {
    if (state.motionListenerAttached || !reducedMotionQuery) {
      return;
    }

    if (typeof reducedMotionQuery.addEventListener === "function") {
      reducedMotionQuery.addEventListener(
        "change",
        handleMotionPreferenceChange,
      );
    } else if (typeof reducedMotionQuery.addListener === "function") {
      reducedMotionQuery.addListener(handleMotionPreferenceChange);
    }

    state.motionListenerAttached = true;
  }

  function startDynamicEffects() {
    stopDynamicEffects();
    attachMotionListener();
    if (!title || !subtitle || !logoCircle) return;

    state.phaseIndex = 0;
    applyPhase(state.phaseIndex);

    if (prefersReducedMotion()) {
      return;
    }

    state.pulseIntervalId = setInterval(advancePhase, CONFIG.PULSE_INTERVAL_MS);
  }

  function stopDynamicEffects() {
    if (state.pulseIntervalId) {
      clearInterval(state.pulseIntervalId);
      state.pulseIntervalId = null;
    }
  }

  window.IndexPageModules = window.IndexPageModules || {};
  window.IndexPageModules.effects = {
    startDynamicEffects,
    stopDynamicEffects,
    activatePrimaryCta,
  };
})();
