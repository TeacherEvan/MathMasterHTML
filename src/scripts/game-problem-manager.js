// js/game-problem-manager.js - Problem loading, setup, and completion
console.log("📚 Game problem manager module loading...");

(function() {
  if (!window.GameInit) {
    console.error("❌ GameInit not loaded");
    return;
  }

  const {
    problemContainer,
    solutionContainer,
    lockDisplay,
    level,
  } = window.GameInit;

  // Problems array to store loaded problems
  let problems = [];
  let currentProblemIndex = 0;
  let currentProblem = null;
  let currentSolutionStepIndex = 0;

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

  let cachedStepSymbols = null;
  let cachedStepIndex = -1; // Track which step is cached
  let cacheInvalidated = true;

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

    // Help functionality handled in game-symbol-handler.js

    // Start (or restart) the 60s step timer + score for this new problem
    if (window.ScoreTimerManager) {
      window.ScoreTimerManager.onProblemStarted();
    }
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

  // Check if all solution steps have been revealed
  function checkProblemCompletion() {
    // Check if all symbols in all steps have been revealed (excluding stolen ones)
    const hiddenSymbols = solutionContainer.querySelectorAll(".hidden-symbol");

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

  // Export problem manager functions
  window.GameProblemManager = {
    problems,
    get currentProblemIndex() {
      return currentProblemIndex;
    },
    get currentProblem() {
      return currentProblem;
    },
    get currentSolutionStepIndex() {
      return currentSolutionStepIndex;
    },
    set currentSolutionStepIndex(value) {
      currentSolutionStepIndex = value;
    },
    getCachedStepSymbols,
    invalidateStepCache,
    loadProblems,
    setupProblem,
    setupStepDisplay,
    nextProblem,
    checkProblemCompletion,
  };

  console.log("✅ Game problem manager loaded");
})();
