(function mobileDisplayManagerOverrides() {
  function getViewportContract() {
    return (
      window.displayManager?.getCurrentResolution?.() ||
      window.displayManager?.getViewportState?.() ||
      null
    );
  }

  function isCompactViewport() {
    const viewportContract = getViewportContract();
    return (
      viewportContract?.isCompactViewport === true ||
      document.body.classList.contains("viewport-compact")
    );
  }

  function applyCompactTypography() {
    const problemContainer = document.getElementById("problem-container");
    const solutionContainer = document.getElementById("solution-container");
    const compactViewport = isCompactViewport();

    if (problemContainer) {
      if (!compactViewport) {
        problemContainer.style.lineHeight = "";
        problemContainer.style.letterSpacing = "";
      } else {
        problemContainer.style.fontSize = "clamp(12px, 2.9vh, 16px)";
        problemContainer.style.lineHeight = "1.35";
        problemContainer.style.letterSpacing = "0.4px";
      }
    }

    if (solutionContainer) {
      if (!compactViewport) {
        solutionContainer.style.lineHeight = "";
        solutionContainer.style.letterSpacing = "";
      } else {
        solutionContainer.style.fontSize = "clamp(10px, 2.35vh, 13px)";
        solutionContainer.style.lineHeight = "1.3";
        solutionContainer.style.letterSpacing = "0.2px";
      }
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
