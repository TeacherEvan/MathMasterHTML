// js/game.js - Enhanced Game Logic with Worm Integration

document.addEventListener("DOMContentLoaded", () => {
  // Simple error boundary for game initialization
  try {
    const problemContainer = document.getElementById("problem-container");
    const solutionContainer = document.getElementById("solution-container");
    const lockDisplay = document.getElementById("lock-display");
    const helpButton = document.getElementById("help-button");
    const clarifyButton = document.getElementById("clarify-button");
    const startGameButton = document.getElementById("start-game-btn");

    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const level = urlParams.get("level") || "beginner";
    const _lockComponent =
      urlParams.get("lockComponent") || "level-1-transformer.html";
    // Init persistence + timer/score HUD
    if (window.PlayerStorage) {
      window.PlayerStorage.init();
    }
    if (window.ScoreTimerManager) {
      window.ScoreTimerManager.init({ level });
    }

    // Don't start the per-step countdown behind the How-To-Play modal
    if (startGameButton && window.ScoreTimerManager) {
      startGameButton.addEventListener("click", () => {
        // game.html uses a ~300ms fade-out; increase buffer to ensure modal is gone
        setTimeout(() => {
          window.ScoreTimerManager.setGameStarted();
        }, 500);
      });
    }
    // Mark automation runs (Playwright) to avoid portrait lock overlay
    if (navigator.webdriver) {
      document.body.classList.add("automation");
      if (window.screen?.orientation?.lock) {
        window.screen.orientation.lock("landscape").catch(() => {});
      }
    }

    // Apply level theme to body without wiping other classes
    document.body.classList.remove(
      "level-beginner",
      "level-warrior",
      "level-master",
    );
    document.body.classList.add(`level-${level}`);
    // Problems array to store loaded problems
    let problems = [];
    let currentProblemIndex = 0;
    let currentProblem = null;
    let currentSolutionStepIndex = 0;
    let totalCorrectAnswers = 0;
    let pendingHelpReveal = false;

    let consecutiveWrongAnswers = 0;
    const PURPLE_WORM_THRESHOLD = 3; // Trigger purple worm after 3 wrong clicks (excluding worm clicks)

    let cachedStepSymbols = null;
    let cachedStepIndex = -1; // Track which step is cached
    let cacheInvalidated = true;

    // PERFORMANCE: Get cached step symbols (refreshes when step changes)
    function getCachedStepSymbols(stepIndex) {
      if (
        cacheInvalidated ||
        cachedStepIndex !== stepIndex ||
        !cachedStepSymbols
      ) {
        cachedStepSymbols = solutionContainer.querySelectorAll(
          `.solution-symbol[data-step-index="${stepIndex}"]`,
        );
        cachedStepIndex = stepIndex;
        cacheInvalidated = false;
      }
      return cachedStepSymbols;
    }

    function invalidateStepCache() {
      cacheInvalidated = true;
      cachedStepSymbols = null;
    }

    // PERFORMANCE FIX: Defer heavy problem loading to prevent blocking animation
    // Uses shared deferExecution() utility from utils.js

    // Load problems based on level
    function loadProblems() {
      const fallbackProblem = {
        problem: "4x = 24",
        steps: ["4x = 24", "x = 24 ÷ 4", "x = 6"],
        currentStep: 0,
        currentSymbol: 0,
      };

      window.GameProblemLoader?.loadProblems({
        level,
        showSkeleton: window.showProblemLoadingSkeleton,
        onLoaded: (loadedProblems) => {
          problems = loadedProblems;
          if (problems.length > 0) {
            currentProblem = problems[currentProblemIndex];
          } else {
            currentProblem = fallbackProblem;
          }
          setupProblem();
        },
        onError: () => {
          currentProblem = fallbackProblem;
          setupProblem();
        },
      });
    }

    function setupProblem() {
      if (
        !currentProblem ||
        !currentProblem.steps ||
        currentProblem.steps.length === 0
      ) {
        return;
      }

      // Reset indices
      currentSolutionStepIndex = 0;
      invalidateStepCache(); // PERFORMANCE: Invalidate cache on new problem

      // Show basic lock until activation
      if (lockDisplay && window.lockManager) {
        lockManager.showBasicLock();
      }

      // Display the problem with enhanced styling
      problemContainer.innerHTML = `<div class="problem-text">${currentProblem.problem}</div>`;

      // Setup the step-by-step solution display
      setupStepDisplay();

      // If help was requested before symbols were ready, try now
      if (pendingHelpReveal) {
        if (revealHelpSymbol()) {
          pendingHelpReveal = false;
        }
      }

      // Start (or restart) the 60s step timer + score for this new problem
      if (window.ScoreTimerManager) {
        window.ScoreTimerManager.onProblemStarted();
      }
    }

    if (clarifyButton) {
      clarifyButton.addEventListener("click", () => {
        const question = window.prompt(
          "What is unclear or ambiguous? Ask a clarification question:",
          "",
        );

        if (!question || question.trim().length === 0) return;

        const problemText = currentProblem?.problem || "(no problem loaded)";
        const stepText =
          currentProblem?.steps?.[currentSolutionStepIndex] ||
          "(no step loaded)";

        const responseLines = [
          "Clarification checklist (investigation):",
          "1) Define the goal: what must be solved for?",
          "2) Define variables/meaning (e.g., what does x represent?).",
          "3) State constraints: integers/reals? domain restrictions?",
          "4) Confirm operations: × vs x, ÷ vs /, and order of operations.",
          "5) Identify ambiguity: missing parentheses? implied multiplication?",
          "",
          `Your question: ${question.trim()}`,
          "",
          `Current problem: ${problemText}`,
          `Current step (window B): ${stepText}`,
        ];

        window.alert(responseLines.join("\n"));
      });
    }

    function setupStepDisplay() {
      // Clear previous solution
      solutionContainer.innerHTML = "";

      // Create container for all solution steps
      const stepsContainer = document.createElement("div");
      stepsContainer.className = "steps-container";

      currentProblem.steps.forEach((step, stepIndex) => {
        const stepDiv = document.createElement("div");
        stepDiv.className = "solution-step";
        stepDiv.dataset.stepIndex = stepIndex;

        // Create spans for each symbol in the step
        step.split("").forEach((symbol, symbolIndex) => {
          const symbolSpan = document.createElement("span");
          symbolSpan.textContent = symbol;
          symbolSpan.dataset.stepIndex = stepIndex;
          symbolSpan.dataset.symbolIndex = symbolIndex;
          symbolSpan.className = "solution-symbol";

          // Initially hide all symbols except spaces
          if (symbol === " ") {
            symbolSpan.classList.add("space-symbol");
          } else {
            symbolSpan.classList.add("hidden-symbol");
          }

          stepDiv.appendChild(symbolSpan);
        });

        stepsContainer.appendChild(stepDiv);
      });

      solutionContainer.appendChild(stepsContainer);
    }

    function nextProblem() {
      currentProblemIndex++;
      if (currentProblemIndex >= problems.length) {
        // Loop back to first problem
        currentProblemIndex = 0;
      }
      currentProblem = problems[currentProblemIndex];

      // Reset step indices
      currentSolutionStepIndex = 0;
      invalidateStepCache(); // PERFORMANCE: Invalidate cache when changing problems

      setupProblem();
    }

    deferExecution(() => {
      loadProblems(); // Load problems after initial paint
    });

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

    /** Check if all solution steps have been revealed */
    function checkProblemCompletion() {
      // Check if all symbols in all steps have been revealed (excluding stolen ones)
      const hiddenSymbols = solutionContainer.querySelectorAll(
        ".hidden-symbol",
      );

      // Filter out stolen symbols - they don't block completion
      const nonStolenHiddenSymbols = Array.from(hiddenSymbols).filter(
        (el) => !el.dataset.stolen,
      );

      if (nonStolenHiddenSymbols.length === 0) {
        // Enhanced completion effect
        solutionContainer.style.animation = "completionGlow 1s ease-in-out";

        // Show completion message and trigger console modal
        setTimeout(() => {
          // Reset completion effect
          solutionContainer.style.animation = "";

          // Dispatch problemCompleted event to trigger console modal
          document.dispatchEvent(new CustomEvent("problemCompleted"));

          // Wait for console symbol to be added before moving to next problem
          // The consoleSymbolAdded event will trigger nextProblem()
        }, 1500);
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
        const fallbackSymbol = solutionContainer?.querySelector(
          ".hidden-symbol",
        );
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
        nextProblem();
      }, 300);
    });
  } catch (error) {
    console.error("❌ Game initialization failed:", error);
    // Show user-friendly error message
    const errorMsg = document.createElement("div");
    errorMsg.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 10px;
      font-family: 'Orbitron', monospace;
      text-align: center;
      z-index: 10000;
    `;
    // Use static HTML for structure only; inject dynamic text safely
    errorMsg.innerHTML = `
      <h2>Game Loading Error</h2>
      <p>Please refresh the page to try again.</p>
    `;
    const errorContainer = document.body || document.documentElement;
    if (errorContainer) {
      errorContainer.appendChild(errorMsg);
    }

    const errorDetail = document.createElement("div");
    errorDetail.style.cssText = "font-size: 0.8em; opacity: 0.7;";
    errorDetail.textContent = error?.message || "An unknown error occurred.";
    errorMsg.appendChild(errorDetail);
  }
});
