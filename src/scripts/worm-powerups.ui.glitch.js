// src/scripts/worm-powerups.ui.glitch.js
(function () {
  const GLITCH_DURATION = 250;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  function applyGlitchStyles(targetElement, progress) {
    let skew = 0;
    let opacity = 1;
    let scale = 1;
    let transX = 0;
    let transY = 0;
    let boxShadow = "";

    if (progress < 0.3) {
      // Frames 1-3: Skew & Opacity drop
      skew = (Math.random() - 0.5) * 40; // -20deg to 20deg
      opacity = Math.random() > 0.5 ? 0.4 : 1;
    } else if (progress < 0.6) {
      // Frames 4-6: Scale & Translate
      scale = 1.1;
      transX = (Math.random() - 0.5) * 10;
      transY = (Math.random() - 0.5) * 10;
    } else {
      // Frames 7-10: Settle with ease-out-expo behavior
      const normalizedProgress = Math.max(0, (progress - 0.6) / 0.4);
      const easeOutExpo =
        normalizedProgress === 1
          ? 1
          : 1 - Math.pow(2, -10 * normalizedProgress);
      scale = 1.1 - 0.1 * easeOutExpo; // Decelerates back to 1.0
      boxShadow = `0 0 15px rgba(0, 255, 255, ${1 - easeOutExpo})`;
    }

    targetElement.style.transform = `skewX(${skew}deg) scale(${scale}) translate(${transX}px, ${transY}px)`;
    targetElement.style.opacity = opacity.toString();
    targetElement.style.boxShadow = boxShadow;
  }

  function runGlitchAnimation(targetElement) {
    if (!targetElement) return;

    if (targetElement.__powerUpGlitchCleanupTimer) {
      clearTimeout(targetElement.__powerUpGlitchCleanupTimer);
      targetElement.__powerUpGlitchCleanupTimer = null;
    }

    if (prefersReducedMotion.matches) {
      // Accessible fallback: instant simple acknowledgment without motion
      const originalTransition = targetElement.style.transition;
      const originalBackground = targetElement.style.background;
      targetElement.style.transition = "none";
      targetElement.style.background = "var(--neon-magenta, #ff00ff)";
      setTimeout(() => {
        targetElement.style.transition = originalTransition;
        targetElement.style.background = originalBackground;
      }, 150);
      return;
    }

    const startTime = performance.now();

    const cleanup = () => {
      targetElement.style.transform = "";
      targetElement.style.opacity = "";
      targetElement.style.boxShadow = "";
      if (targetElement.__powerUpGlitchCleanupTimer) {
        clearTimeout(targetElement.__powerUpGlitchCleanupTimer);
        targetElement.__powerUpGlitchCleanupTimer = null;
      }
    };

    targetElement.__powerUpGlitchCleanupTimer = setTimeout(
      cleanup,
      GLITCH_DURATION + 80,
    );

    // Apply an immediate first frame so browser engines that delay the initial
    // animation frame still expose the glitch state synchronously.
    applyGlitchStyles(targetElement, 0);

    function frame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / GLITCH_DURATION, 1);

      if (progress < 1) {
        applyGlitchStyles(targetElement, progress);

        requestAnimationFrame(frame);
      } else {
        cleanup();
      }
    }

    requestAnimationFrame(frame);
  }

  document.addEventListener("powerUpActivated", (event) => {
    const type = event.detail?.type;
    if (!type) return;

    const displayContainer = document.getElementById("power-up-display");
    if (!displayContainer) return;

    const targetElement = displayContainer.querySelector(
      `.power-up-item[data-type="${type}"]`,
    );
    if (targetElement) {
      runGlitchAnimation(targetElement);
    }
  });
})();
