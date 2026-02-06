// src/scripts/symbol-rain.helpers.face-reveal.js - Face reveal helpers
console.log("🎯 SymbolRain helpers: face reveal loading...");

(function attachSymbolRainFaceReveal() {
  const helpers = (window.SymbolRainHelpers = window.SymbolRainHelpers || {});

  helpers.resetFaceRevealStyles = function resetFaceRevealStyles(
    symbolElement,
  ) {
    symbolElement.classList.remove("face-reveal");
    symbolElement.style.transform = "";
    symbolElement.style.textShadow = "";
    symbolElement.style.filter = "";
  };

  helpers.applyFaceRevealStyles = function applyFaceRevealStyles(
    symbolElement,
  ) {
    symbolElement.classList.add("face-reveal");
    symbolElement.style.transform = "scale(1.3)";
    symbolElement.style.textShadow =
      "0 0 20px #0ff, 0 0 40px #0ff, 0 0 60px #0ff";
    symbolElement.style.filter = "brightness(1.5)";
  };

  helpers.triggerFaceRevealIfNeeded = function triggerFaceRevealIfNeeded(
    { activeFallingSymbols, activeFaceReveals, config },
    state,
    containerHeight,
    currentTime,
  ) {
    if (currentTime - state.lastFaceRevealTime < config.faceRevealInterval) {
      return;
    }

    const visibleSymbols = activeFallingSymbols.filter(
      (s) => s.y > 0 && s.y < containerHeight,
    );
    if (visibleSymbols.length === 0) {
      state.lastFaceRevealTime = currentTime;
      return;
    }

    const revealCount = Math.min(
      3 + Math.floor(Math.random() * 3),
      visibleSymbols.length,
    );
    for (let i = 0; i < revealCount; i++) {
      const randomIndex = Math.floor(Math.random() * visibleSymbols.length);
      const symbolObj = visibleSymbols.splice(randomIndex, 1)[0];

      if (!symbolObj.isInFaceReveal) {
        symbolObj.isInFaceReveal = true;
        symbolObj.faceRevealStartTime = currentTime;
        activeFaceReveals.add(symbolObj);
        helpers.applyFaceRevealStyles(symbolObj.element);
      }
    }
    state.lastFaceRevealTime = currentTime;
  };

  helpers.cleanupFaceReveals = function cleanupFaceReveals(
    { activeFaceReveals, config },
    currentTime,
  ) {
    for (const symbolObj of activeFaceReveals) {
      if (
        currentTime - symbolObj.faceRevealStartTime >=
        config.faceRevealDuration
      ) {
        symbolObj.isInFaceReveal = false;
        helpers.resetFaceRevealStyles(symbolObj.element);
        activeFaceReveals.delete(symbolObj);
      }
    }
  };
})();
