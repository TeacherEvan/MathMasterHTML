// js/game-symbol-handler.core.js - Core symbol handling logic
console.log("🔤 Game symbol handler core loading...");

(function() {
  if (!window.GameInit || !window.GameProblemManager) {
    console.error("❌ GameInit or GameProblemManager not loaded");
    return;
  }

  const { solutionContainer } = window.GameInit;
  const {
    getCachedStepSymbols,
    invalidateStepCache,
    checkProblemCompletion,
  } = window.GameProblemManager;
  const GameEvents = window.GameEvents || {
    FIRST_LINE_SOLVED: "first-line-solved",
    PROBLEM_LINE_COMPLETED: "problemLineCompleted",
    PURPLE_WORM_TRIGGERED: "purpleWormTriggered",
    SYMBOL_REVEALED: "symbolRevealed",
  };

  let totalCorrectAnswers = 0;
  let consecutiveWrongAnswers = 0;
  const PURPLE_WORM_THRESHOLD = 3;

  function notifySymbolRevealed(targetSymbol, span) {
    document.dispatchEvent(
      new CustomEvent(GameEvents.SYMBOL_REVEALED, {
        detail: { symbol: targetSymbol, element: span },
      }),
    );
  }

  function getCurrentProblem() {
    return window.GameProblemManager?.currentProblem || null;
  }

  function getCurrentStepIndex() {
    return window.GameProblemManager?.currentSolutionStepIndex ?? 0;
  }

  function setCurrentStepIndex(value) {
    if (window.GameProblemManager) {
      window.GameProblemManager.currentSolutionStepIndex = value;
    }
  }

  function handleCorrectAnswer(clickedSymbol) {
    const currentSolutionStepIndex = getCurrentStepIndex();
    totalCorrectAnswers++;

    consecutiveWrongAnswers = 0;

    let comboFeedback = {
      multiplier: 1.0,
      level: "normal",
      screenEffect: null,
    };
    if (window.ComboSystem) {
      comboFeedback = window.ComboSystem.hit();
    }

    if (totalCorrectAnswers === 1) {
      document.dispatchEvent(new Event(GameEvents.FIRST_LINE_SOLVED));
    }

    const intensity = Math.min(0.3 * comboFeedback.multiplier, 0.5);
    document.body.style.background = `radial-gradient(circle, rgba(0,255,0,${intensity}), rgba(0,0,0,1))`;

    if (comboFeedback.screenEffect) {
      document.body.classList.add(comboFeedback.screenEffect);
      setTimeout(() => {
        document.body.classList.remove(comboFeedback.screenEffect);
      }, 500);
    }

    setTimeout(() => {
      document.body.style.background = "";
    }, 300);

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

  function handleIncorrectAnswer() {
    if (window.ComboSystem) {
      window.ComboSystem.break();
    }

    consecutiveWrongAnswers++;

    if (consecutiveWrongAnswers >= PURPLE_WORM_THRESHOLD) {
      document.dispatchEvent(
        new CustomEvent(GameEvents.PURPLE_WORM_TRIGGERED, {
          detail: { wrongAnswerCount: consecutiveWrongAnswers },
        }),
      );
      consecutiveWrongAnswers = 0;
    }

    document.body.classList.add("incorrect-flash");
    setTimeout(() => document.body.classList.remove("incorrect-flash"), 400);
  }

  function checkLineCompletion() {
    const currentProblem = getCurrentProblem();
    const currentSolutionStepIndex = getCurrentStepIndex();

    if (!currentProblem || !Array.isArray(currentProblem.steps)) {
      return;
    }

    const currentStepHiddenSymbols = solutionContainer.querySelectorAll(
      `[data-step-index="${currentSolutionStepIndex}"].hidden-symbol`,
    );

    if (currentStepHiddenSymbols.length === 0) {
      window.GameEffects?.createDramaticLineCompletion(
        currentSolutionStepIndex,
        solutionContainer,
      );

      document.dispatchEvent(
        new CustomEvent(GameEvents.PROBLEM_LINE_COMPLETED, {
          detail: {
            lineNumber: currentSolutionStepIndex + 1,
            lineText: currentProblem.steps[currentSolutionStepIndex],
            totalLines: currentProblem.steps.length,
            isLastStep:
              currentSolutionStepIndex >= currentProblem.steps.length - 1,
          },
        }),
      );

      if (currentSolutionStepIndex < currentProblem.steps.length - 1) {
        setCurrentStepIndex(currentSolutionStepIndex + 1);
        invalidateStepCache();
      } else {
        checkProblemCompletion();
      }
    }
  }

  function revealHelpSymbol() {
    const currentSolutionStepIndex = getCurrentStepIndex();
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

  window.GameSymbolHandlerCore = {
    handleCorrectAnswer,
    handleIncorrectAnswer,
    checkLineCompletion,
    revealHelpSymbol,
    getCurrentStepIndex,
    totalCorrectAnswers,
    consecutiveWrongAnswers,
    PURPLE_WORM_THRESHOLD,
  };

  console.log("✅ Game symbol handler core loaded");
})();
