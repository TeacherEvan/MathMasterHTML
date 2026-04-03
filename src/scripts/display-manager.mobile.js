(function mobileDisplayManagerOverrides() {
  const COMPACT_WIDTH = 850;
  const COMPACT_HEIGHT = 500;

  function isCompactViewport() {
    const media = window.matchMedia?.("(hover: none) and (pointer: coarse)");
    return (
      window.innerWidth <= COMPACT_WIDTH ||
      window.innerHeight <= COMPACT_HEIGHT ||
      !!media?.matches
    );
  }

  function applyCompactTypography() {
    if (!isCompactViewport()) {
      return;
    }

    const problemContainer = document.getElementById("problem-container");
    if (problemContainer) {
      problemContainer.style.fontSize = "clamp(12px, 2.9vh, 16px)";
      problemContainer.style.lineHeight = "1.35";
      problemContainer.style.letterSpacing = "0.4px";
    }

    const solutionContainer = document.getElementById("solution-container");
    if (solutionContainer) {
      solutionContainer.style.fontSize = "clamp(10px, 2.35vh, 13px)";
      solutionContainer.style.lineHeight = "1.3";
      solutionContainer.style.letterSpacing = "0.2px";
    }
  }

  function queueApply() {
    window.requestAnimationFrame(applyCompactTypography);
  }

  document.addEventListener("displayResolutionChanged", queueApply);
  window.addEventListener("load", queueApply, { once: true });
  window.addEventListener("orientationchange", queueApply, { passive: true });

  if (window.SharedResizeObserver?.subscribe) {
    window.SharedResizeObserver.subscribe(queueApply, {
      source: "display-manager.mobile",
    });
  } else {
    window.addEventListener("resize", queueApply, { passive: true });
  }

  queueApply();
})();
