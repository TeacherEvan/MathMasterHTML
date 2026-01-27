// js/game-symbol-handler.js - Symbol clicking, revealing, and help functionality
console.log("🔤 Game symbol handler module loading...");

(function() {
  if (!window.GameInit || !window.GameProblemManager) {
    console.error("❌ GameInit or GameProblemManager not loaded");
    return;
  }

  const { solutionContainer, helpButton } = window.GameInit;
  const {
    currentProblem,
    getCachedStepSymbols,
    invalidateStepCache,
    checkProblemCompletion,
  } = window.GameProblemManager;
  let currentSolutionStepIndex =
    window.GameProblemManager.currentSolutionStepIndex;

  let pendingHelpReveal = false;

  function notifySymbolRevealed(targetSymbol, span) {
    document.dispatchEvent(
      new CustomEvent("symbolRevealed", {
        detail: { symbol: targetSymbol, element: span },
      }),
    );
  }

  /** Handle correct symbol selection */
  function handleCorrectAnswer(clickedSymbol) {
    totalCorrectAnswers++;

    // PURPLE WORM: Reset wrong answer counter on correct answer
    consecutiveWrongAnswers = 0;

    // COMBO SYSTEM: Register hit and get feedback
    let comboFeedback = {
      multiplier: 1.0,
      level: "normal",
      screenEffect: null,
    };
    if (window.ComboSystem) {
      comboFeedback = window.ComboSystem.hit();
    }

    // Dispatch first-line-solved event for LockManager
    if (totalCorrectAnswers === 1) {
      document.dispatchEvent(new Event("first-line-solved"));
    }

    // Add visual feedback - ENHANCED with combo multiplier
    const intensity = Math.min(0.3 * comboFeedback.multiplier, 0.5);
    document.body.style.background = `radial-gradient(circle, rgba(0,255,0,${intensity}), rgba(0,0,0,1))`;

    // Apply screen effect based on combo level
    if (comboFeedback.screenEffect) {
      document.body.classList.add(comboFeedback.screenEffect);
      setTimeout(() => {
        document.body.classList.remove(comboFeedback.screenEffect);
      }, 500);
    }

    setTimeout(() => {
      document.body.style.background = "";
    }, 300);

    // Reveal the specific symbol clicked
    window.GameSymbolHelpers?.revealSpecificSymbol({
      targetSymbol: clickedSymbol,
      stepIndex: currentSolutionStepIndex,
      getCachedStepSymbols,
      invalidateStepCache,
      normalizeSymbol,
      onSymbolRevealed: notifySymbolRevealed,
    });
    checkLineCompletion();
  }

  /** Handle incorrect symbol selection */
  function handleIncorrectAnswer() {
    // COMBO SYSTEM: Break combo on wrong answer
    if (window.ComboSystem) {
      window.ComboSystem.break();
    }

    // PURPLE WORM: Increment wrong answer counter
    consecutiveWrongAnswers++;

    // Trigger purple worm on threshold
    if (consecutiveWrongAnswers >= PURPLE_WORM_THRESHOLD) {
      document.dispatchEvent(
        new CustomEvent("purpleWormTriggered", {
          detail: { wrongAnswerCount: consecutiveWrongAnswers },
        }),
      );
      // Reset counter after triggering (can trigger again with 2 more wrong answers)
      consecutiveWrongAnswers = 0;
    }

    document.body.classList.add("incorrect-flash");
    setTimeout(() => document.body.classList.remove("incorrect-flash"), 400);
  }

  /** Check if current line is complete and move to next */
  function checkLineCompletion() {
    // Check if current step has any hidden symbols left
    const currentStepHiddenSymbols = solutionContainer.querySelectorAll(
      `[data-step-index="${currentSolutionStepIndex}"].hidden-symbol`,
    );

    if (currentStepHiddenSymbols.length === 0) {
      // ENHANCED DRAMATIC EFFECTS for row completion
      window.GameEffects?.createDramaticLineCompletion(
        currentSolutionStepIndex,
        solutionContainer,
      );

      // Trigger worm spawning for completed line

      // Enhanced event dispatch with line details
      document.dispatchEvent(
        new CustomEvent("problemLineCompleted", {
          detail: {
            lineNumber: currentSolutionStepIndex + 1,
            lineText: currentProblem.steps[currentSolutionStepIndex],
            totalLines: currentProblem.steps.length,
            isLastStep:
              currentSolutionStepIndex >= currentProblem.steps.length - 1,
          },
        }),
      );

      // Move to next step if available
      if (currentSolutionStepIndex < currentProblem.steps.length - 1) {
        currentSolutionStepIndex++;
        invalidateStepCache(); // PERFORMANCE: Invalidate cache when moving to next step
      } else {
        checkProblemCompletion();
      }
    }
  }

  function revealHelpSymbol() {
    const availableSymbols = window.GameSymbolHelpers?.getNextSymbol({
      stepIndex: currentSolutionStepIndex,
      getCachedStepSymbols,
    });
    let symbolToReveal = null;

    if (availableSymbols && availableSymbols.length > 0) {
      symbolToReveal =
        availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
    } else {
      const fallbackSymbol = solutionContainer?.querySelector(".hidden-symbol");
      if (fallbackSymbol) {
        symbolToReveal = fallbackSymbol.textContent;
      }
    }

    if (symbolToReveal) {
      window.GameSymbolHelpers?.revealSpecificSymbol({
        targetSymbol: symbolToReveal,
        stepIndex: currentSolutionStepIndex,
        getCachedStepSymbols,
        invalidateStepCache,
        normalizeSymbol,
        onSymbolRevealed: notifySymbolRevealed,
      });
      checkLineCompletion();
      return true;
    }

    return false;
  }

  helpButton.addEventListener("click", () => {
    if (!revealHelpSymbol()) {
      pendingHelpReveal = true;
      setTimeout(() => {
        if (pendingHelpReveal && revealHelpSymbol()) {
          pendingHelpReveal = false;
        }
      }, 250);
    }

    // Add help button feedback
    helpButton.style.transform = "scale(0.95)";
    setTimeout(() => {
      helpButton.style.transform = "";
    }, 150);
  });

  document.addEventListener("symbolClicked", (e) => {
    const clicked = e.detail.symbol;

    // PRIORITY 1: Check if this symbol was stolen by a worm (includes blue symbols!)
    // REFACTORED: Use shared normalizeSymbol utility from utils.js
    const normalizedClicked = normalizeSymbol(clicked);
    const stolenSymbols = solutionContainer.querySelectorAll(
      '[data-stolen="true"]',
    );
    let symbolRestored = false;
    let wasBlueSymbol = false;

    for (const stolenSymbol of stolenSymbols) {
      const stolenText = stolenSymbol.textContent;
      const normalizedStolen = normalizeSymbol(stolenText);

      if (normalizedStolen === normalizedClicked) {
        // Check if this was a blue (revealed) symbol before being stolen
        wasBlueSymbol = stolenSymbol.dataset.wasRevealed === "true";

        // Restore the symbol
        stolenSymbol.classList.remove("stolen", "hidden-symbol");
        stolenSymbol.classList.add("revealed-symbol");
        stolenSymbol.style.visibility = "visible";
        delete stolenSymbol.dataset.stolen;

        // Clear the wasRevealed flag
        if (wasBlueSymbol) {
          delete stolenSymbol.dataset.wasRevealed;
        }

        symbolRestored = true;

        // Visual feedback - different color for blue symbol restoration
        if (wasBlueSymbol) {
          document.body.style.background =
            "radial-gradient(circle, rgba(0,255,255,0.3), rgba(0,0,0,1))";
        } else {
          document.body.style.background =
            "radial-gradient(circle, rgba(0,255,255,0.2), rgba(0,0,0,1))";
        }

        setTimeout(() => {
          document.body.style.background = "";
        }, 300);

        // CRITICAL: Check line completion after restoration
        // This ensures game progression isn't blocked by stolen symbols
        checkLineCompletion();

        break;
      }
    }

    // If symbol was restored, we're done (priority replacement complete!)
    if (symbolRestored) {
      return;
    }

    // PRIORITY 2: Otherwise, check if it's in the current line (normal gameplay)
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

    // Add visual feedback for saving a symbol
    document.body.style.background =
      "radial-gradient(circle, rgba(0,255,0,0.2), rgba(0,0,0,1))";
    setTimeout(() => {
      document.body.style.background = "";
    }, 500);
  });

  document.addEventListener("consoleSymbolAdded", () => {
    // Continue to next problem after console interaction
    setTimeout(() => {
      window.GameProblemManager.nextProblem();
    }, 300);
  });

  // Variables that need to be shared
  let totalCorrectAnswers = 0;
  let consecutiveWrongAnswers = 0;
  const PURPLE_WORM_THRESHOLD = 3; // Trigger purple worm after 3 wrong clicks (excluding worm clicks)

  // Export symbol handler functions
  window.GameSymbolHandler = {
    handleCorrectAnswer,
    handleIncorrectAnswer,
    checkLineCompletion,
    revealHelpSymbol,
    totalCorrectAnswers,
    consecutiveWrongAnswers,
    PURPLE_WORM_THRESHOLD,
  };

  console.log("✅ Game symbol handler loaded");
})();
