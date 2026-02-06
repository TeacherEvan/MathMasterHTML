// js/game-symbol-handler.events.js - Symbol handler event wiring
console.log("🔤 Game symbol handler events loading...");

(function() {
  if (!window.GameInit || !window.GameSymbolHandlerCore) {
    console.error("❌ GameInit or GameSymbolHandlerCore not loaded");
    return;
  }

  const { solutionContainer, helpButton } = window.GameInit;
  const {
    handleCorrectAnswer,
    handleIncorrectAnswer,
    checkLineCompletion,
    revealHelpSymbol,
    getCurrentStepIndex,
  } = window.GameSymbolHandlerCore;

  const getCachedStepSymbols = window.GameProblemManager?.getCachedStepSymbols;
  let pendingHelpReveal = false;

  if (helpButton) {
    helpButton.addEventListener("click", () => {
      if (!revealHelpSymbol()) {
        pendingHelpReveal = true;
        setTimeout(() => {
          if (pendingHelpReveal && revealHelpSymbol()) {
            pendingHelpReveal = false;
          }
        }, 250);
      }

      helpButton.style.transform = "scale(0.95)";
      setTimeout(() => {
        helpButton.style.transform = "";
      }, 150);
    });
  }

  document.addEventListener("symbolClicked", (e) => {
    const clicked = e.detail.symbol;
    const currentSolutionStepIndex = getCurrentStepIndex();

    const restored = window.GameSymbolHandlerStolen?.restoreStolenSymbol({
      solutionContainer,
      clickedSymbol: clicked,
      onLineCompletion: checkLineCompletion,
    });

    if (restored) {
      return;
    }

    if (
      window.GameSymbolHelpers?.isSymbolInCurrentLine({
        clickedSymbol: clicked,
        stepIndex: currentSolutionStepIndex,
        getCachedStepSymbols,
        normalizeSymbol,
      })
    ) {
      handleCorrectAnswer(clicked);
    } else {
      handleIncorrectAnswer();
    }
  });

  document.addEventListener("wormSymbolCorrect", (e) => {
    const symbol = e.detail.symbol;
    const currentSolutionStepIndex = getCurrentStepIndex();

    if (
      window.GameSymbolHelpers?.isSymbolInCurrentLine({
        clickedSymbol: symbol,
        stepIndex: currentSolutionStepIndex,
        getCachedStepSymbols,
        normalizeSymbol,
      })
    ) {
      handleCorrectAnswer(symbol);
    }
  });

  document.addEventListener("wormSymbolSaved", (e) => {
    const { symbol: _symbol, wormId: _wormId } = e.detail;

    document.body.style.background =
      "radial-gradient(circle, rgba(0,255,0,0.2), rgba(0,0,0,1))";
    setTimeout(() => {
      document.body.style.background = "";
    }, 500);
  });

  document.addEventListener("consoleSymbolAdded", () => {
    setTimeout(() => {
      window.GameProblemManager?.nextProblem?.();
    }, 300);
  });

  window.GameSymbolHandlerEvents = {
    initialized: true,
  };

  console.log("✅ Game symbol handler events loaded");
})();
