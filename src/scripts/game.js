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

    // PURPLE WORM: Track consecutive wrong answers
    let consecutiveWrongAnswers = 0;
    const PURPLE_WORM_THRESHOLD = 3; // Trigger purple worm after 3 wrong clicks (excluding worm clicks)

    // PERFORMANCE: DOM query caching to reduce repeated querySelectorAll calls
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

    // PERFORMANCE: Invalidate cache when needed
    function invalidateStepCache() {
      cacheInvalidated = true;
      cachedStepSymbols = null;
    }

    // PERFORMANCE FIX: Defer heavy problem loading to prevent blocking animation
    // Uses shared deferExecution() utility from utils.js

    // Load problems based on level
    function loadProblems() {
      // Show loading skeleton
      window.showProblemLoadingSkeleton?.();

      let problemPath = "";

      // Determine which asset file to load based on level
      switch (level) {
        case "beginner":
          problemPath =
            "/src/assets/problems/Assets/Beginner_Lvl/beginner_problems.md";
          break;
        case "warrior":
          problemPath =
            "/src/assets/problems/Assets/Warrior_Lvl/warrior_problems.md";
          break;
        case "master":
          problemPath =
            "/src/assets/problems/Assets/Master_Lvl/master_problems.md";
          break;
        default:
          problemPath =
            "/src/assets/problems/Assets/Beginner_Lvl/beginner_problems.md";
      }

      // Fetch the problem set
      fetch(problemPath)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load problems: ${response.statusText}`);
          }
          return response.text();
        })
        .then((data) => {
          // Parse problems from markdown
          problems = parseProblemsFromMarkdown(data);

          // Start with the first problem
          if (problems.length > 0) {
            currentProblem = problems[currentProblemIndex];
            setupProblem();
          } else {
            // Use fallback problem
            currentProblem = {
              problem: "4x = 24",
              steps: ["4x = 24", "x = 24 ÷ 4", "x = 6"],
              currentStep: 0,
              currentSymbol: 0,
            };
            setupProblem();
          }
        })
        .catch(() => {
          // Fallback to a default problem
          currentProblem = {
            problem: "4x = 24",
            steps: ["4x = 24", "x = 24 ÷ 4", "x = 6"],
            currentStep: 0,
            currentSymbol: 0,
          };
          setupProblem();
        });
    }

    // Parse problems from markdown content
    function parseProblemsFromMarkdown(markdownContent) {
      const parsedProblems = [];

      // Split by problem (starting with a number followed by dot and backtick)
      const problemRegex = /(\d+)\.\s+`([^`]+)`\s*\n((?:\s*-[^\n]+\n?)+)/g;
      let match;

      while ((match = problemRegex.exec(markdownContent)) !== null) {
        try {
          const _problemNumber = match[1]; // Prefixed - for future problem numbering
          const problemText = match[2];
          const stepsText = match[3];

          // Extract all solution steps (lines starting with -)
          const steps = stepsText
            .split("\n")
            .filter((line) => line.trim().startsWith("-"))
            .map((line) => line.trim().replace(/^-\s*/, ""));

          if (steps.length > 0) {
            parsedProblems.push({
              problem: problemText,
              steps: steps,
              currentStep: 0,
              currentSymbol: 0,
            });
          }
        } catch {
          // Skip malformed problems silently
        }
      }

      return parsedProblems;
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

    // Investigative clarification prompt (minimal UI)
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

    // Move to next problem
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

    // PERFORMANCE FIX: Defer problem loading to prevent blocking symbol rain animation
    // Give the browser time to render first frame of animations before loading heavy data
    deferExecution(() => {
      loadProblems(); // Load problems after initial paint
    });

    /** Get next hidden symbol from solution - now accepts any symbol in current line */
    function getNextSymbol() {
      // PERFORMANCE: Use cached symbols
      const currentStepSymbols = getCachedStepSymbols(currentSolutionStepIndex);
      const hiddenSymbols = Array.from(currentStepSymbols).filter((el) =>
        el.classList.contains("hidden-symbol"),
      );

      if (hiddenSymbols.length > 0) {
        // Return array of all possible symbols in current line
        return hiddenSymbols.map((span) => span.textContent);
      }

      return null;
    }

    /** Check if clicked symbol exists in current line - FIXED X/x DETECTION */
    function isSymbolInCurrentLine(clickedSymbol) {
      const expectedSymbols = getNextSymbol();

      if (expectedSymbols && Array.isArray(expectedSymbols)) {
        // REFACTORED: Use shared normalizeSymbol utility from utils.js
        const normalizedClicked = normalizeSymbol(clickedSymbol);
        const normalizedExpected = expectedSymbols.map((s) =>
          normalizeSymbol(s),
        );

        return normalizedExpected.includes(normalizedClicked);
      }
      return false;
    }

    /** Reveal specific symbol in current line - FIXED X/x DETECTION */
    function revealSpecificSymbol(targetSymbol) {
      // REFACTORED: Use shared normalizeSymbol utility from utils.js
      const normalizedTarget = normalizeSymbol(targetSymbol);

      // PERFORMANCE: Use cached symbols
      const currentStepSymbols = getCachedStepSymbols(currentSolutionStepIndex);
      const hiddenSymbols = Array.from(currentStepSymbols).filter((el) =>
        el.classList.contains("hidden-symbol"),
      );

      for (const span of hiddenSymbols) {
        const spanSymbol = span.textContent;
        const normalizedSpan = normalizeSymbol(spanSymbol);

        if (normalizedSpan === normalizedTarget) {
          span.classList.remove("hidden-symbol");
          span.classList.add("revealed-symbol");
          invalidateStepCache(); // PERFORMANCE: Invalidate cache after DOM change

          // Dispatch event to notify worms that a RED symbol appeared!
          document.dispatchEvent(
            new CustomEvent("symbolRevealed", {
              detail: { symbol: targetSymbol, element: span },
            }),
          );

          return true;
        }
      }

      return false;
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
      revealSpecificSymbol(clickedSymbol);
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
        createDramaticLineCompletion(currentSolutionStepIndex);

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

    /** Create dramatic celebration for line completion */
    function createDramaticLineCompletion(stepIndex) {
      // 1. Lightning flash
      createLightningFlash();

      // 2. Screen shake effect
      createScreenShake();

      // 3. Celebration particles
      createCelebrationParticles(stepIndex);

      // 4. Victory banner briefly
      showVictoryBanner(stepIndex + 1);

      // 5. Transform row to pulsating cyan
      transformRowToPulsatingCyan(stepIndex);
    }

    /** Create lightning flash effect */
    function createLightningFlash() {
      // Create lightning overlay
      const lightning = document.createElement("div");
      lightning.className = "lightning-flash";
      lightning.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: radial-gradient(circle, rgba(255,255,255,0.9), rgba(135,206,250,0.7), transparent);
            z-index: 9999;
            pointer-events: none;
            animation: lightning-strike 1s ease-out forwards;
        `;

      document.body.appendChild(lightning);

      // Remove after animation
      setTimeout(() => {
        if (lightning.parentNode) {
          lightning.parentNode.removeChild(lightning);
        }
      }, 1000);
    }

    /** Create screen shake effect for impact */
    function createScreenShake() {
      document.body.classList.add("screen-shake");
      setTimeout(() => {
        document.body.classList.remove("screen-shake");
      }, 500);
    }

    /** Create celebration particles around the completed row */
    function createCelebrationParticles(stepIndex) {
      const row = solutionContainer.querySelector(
        `[data-step-index="${stepIndex}"]`,
      );
      if (!row) return;

      const rect = row.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Create particle container
      const particleContainer = document.createElement("div");
      particleContainer.className = "celebration-particles";
      particleContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 10000;
        `;
      document.body.appendChild(particleContainer);

      // Create multiple particles
      const colors = ["#00ffff", "#00ff00", "#ffff00", "#ff00ff", "#ff6600"];
      const symbols = ["★", "✦", "◆", "●", "⚡"];

      for (let i = 0; i < 20; i++) {
        const particle = document.createElement("div");
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const randomSymbol =
          symbols[Math.floor(Math.random() * symbols.length)];
        const angle = (i / 20) * Math.PI * 2;
        const velocity = 150 + Math.random() * 100;
        const endX = Math.cos(angle) * velocity;
        const endY = Math.sin(angle) * velocity;

        particle.textContent = randomSymbol;
        particle.style.cssText = `
                position: absolute;
                left: ${centerX}px;
                top: ${centerY}px;
                font-size: ${16 + Math.random() * 12}px;
                color: ${randomColor};
                text-shadow: 0 0 10px ${randomColor};
                --end-x: ${endX}px;
                --end-y: ${endY}px;
                animation: particle-explode 0.8s ease-out forwards;
            `;
        particleContainer.appendChild(particle);
      }

      // Clean up after animation using modern remove() method
      setTimeout(() => {
        particleContainer.remove();
      }, 1000);
    }

    /** Show victory banner for completed line */
    function showVictoryBanner(lineNumber) {
      const banner = document.createElement("div");
      banner.className = "victory-banner";
      banner.innerHTML = `<span class="victory-text">LINE ${lineNumber} COMPLETE!</span>`;
      banner.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0);
            font-family: 'Orbitron', monospace;
            font-size: 2em;
            font-weight: bold;
            color: #00ffff;
            text-shadow: 0 0 20px #00ffff, 0 0 40px #00ffff, 2px 2px 0 #000;
            z-index: 10001;
            pointer-events: none;
            animation: victory-popup 1.5s ease-out forwards;
            white-space: nowrap;
        `;

      document.body.appendChild(banner);

      // Clean up after animation using modern remove() method
      setTimeout(() => {
        banner.remove();
      }, 1500);
    }

    /** Transform completed row to pulsating cyan */
    function transformRowToPulsatingCyan(stepIndex) {
      // Get ALL non-hidden, non-space symbols in the completed row
      const rowSymbols = solutionContainer.querySelectorAll(
        `[data-step-index="${stepIndex}"].solution-symbol:not(.hidden-symbol):not(.space-symbol):not(.completed-row-symbol)`,
      );

      rowSymbols.forEach((symbol, index) => {
        // Staggered animation for wave effect using CSS animation-delay instead of nested setTimeout
        symbol.classList.remove("revealed-symbol");
        symbol.classList.add("completed-row-symbol");

        // Use CSS custom property for staggered animation
        symbol.style.setProperty("--stagger-delay", `${index * 30}ms`);
        symbol.style.animation = `symbol-pop 0.3s ease-out ${index *
          30}ms, pulsating-cyan 2s ease-in-out ${index * 30 + 300}ms infinite`;
      });
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

    // Event Listeners
    function revealHelpSymbol() {
      const availableSymbols = getNextSymbol();
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
        revealSpecificSymbol(symbolToReveal);
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

    // Listen for symbol clicks from symbol rain (matrix.js)
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
      if (isSymbolInCurrentLine(clicked)) {
        handleCorrectAnswer(clicked);
      } else {
        handleIncorrectAnswer();
      }
    });

    // Listen for worm symbol correct events
    document.addEventListener("wormSymbolCorrect", (e) => {
      const symbol = e.detail.symbol;

      if (isSymbolInCurrentLine(symbol)) {
        handleCorrectAnswer(symbol);
      }
    });

    // Listen for worm symbol saved events (when player clicks worm to save symbol)
    document.addEventListener("wormSymbolSaved", (e) => {
      const { symbol: _symbol, wormId: _wormId } = e.detail;

      // Add visual feedback for saving a symbol
      document.body.style.background =
        "radial-gradient(circle, rgba(0,255,0,0.2), rgba(0,0,0,1))";
      setTimeout(() => {
        document.body.style.background = "";
      }, 500);
    });

    // Listen for console symbol added events (from console manager)
    document.addEventListener("consoleSymbolAdded", () => {
      // Continue to next problem after console interaction
      setTimeout(() => {
        nextProblem();
      }, 300);
    });

    // Add completion glow animation and additional styles
    const gameStyles = document.createElement("style");
    gameStyles.textContent = `
        @keyframes pulsating-red {
            0% {
                color: #ff6666;
                text-shadow: 0 0 10px #ff0000, 0 0 20px #ff0000;
            }
            50% {
                color: #ff9999;
                text-shadow: 0 0 20px #ff0000, 0 0 30px #ff0000;
            }
            100% {
                color: #ff6666;
                text-shadow: 0 0 10px #ff0000, 0 0 20px #ff0000;
            }
        }

        @keyframes pulsating-cyan {
            0%, 100% {
                color: #00ffff;
                text-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff;
            }
            50% {
                color: #66ffff;
                text-shadow: 0 0 20px #00ffff, 0 0 30px #00ffff, 0 0 40px #00d4ff;
            }
        }

        @keyframes lightning-strike {
            0% {
                opacity: 0;
            }
            10% {
                opacity: 1;
            }
            20% {
                opacity: 0.3;
            }
            30% {
                opacity: 1;
            }
            40% {
                opacity: 0.5;
            }
            50% {
                opacity: 1;
            }
            100% {
                opacity: 0;
            }
        }

        @keyframes completionGlow {
            0% {
                box-shadow: inset 0 0 15px rgba(0,255,0,0.4);
                transform: scale(1);
            }
            50% {
                box-shadow: inset 0 0 30px rgba(0,255,0,0.8), 0 0 50px rgba(0,255,0,0.6);
                transform: scale(1.02);
            }
            100% {
                box-shadow: inset 0 0 15px rgba(0,255,0,0.4);
                transform: scale(1);
            }
        }
        
        .problem-text {
            font-size: 2.5em;
            font-weight: 700;
            text-align: center;
            animation: pulsating-red 2s ease-in-out infinite;
        }
        
        .steps-container {
            font-family: 'Orbitron', monospace; /* cSpell:ignore Orbitron */
            font-size: 1.65em; /* Increased by 50% */
            line-height: 1.8;
        }
        
        .solution-step {
            margin-bottom: 8px;
            padding: 4px 0;
        }
        
        .solution-symbol {
            display: inline-block;
            min-width: 12px;
            text-align: center;
            transition: all 0.3s ease;
        }
        
        .hidden-symbol {
            color: transparent;
            background: transparent; /* Hide text boxes */
            border-radius: 2px;
            text-shadow: none;
        }
        
        .revealed-symbol {
            color: #ff0000; /* Changed from green to red */
            text-shadow: 0 0 8px rgba(255,0,0,0.6); /* Changed from green to red */
            background: rgba(255,0,0,0.1); /* Changed from green to red */
            border-radius: 2px;
        }

        .completed-row-symbol {
            color: #00ffff;
            text-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00d4ff;
            background: rgba(0,255,255,0.15);
            border-radius: 2px;
            animation: pulsating-cyan 2s ease-in-out infinite;
            font-weight: bold;
        }
        
        .space-symbol {
            margin: 0 4px;
            background: transparent;
        }
        
        .lock-error {
            color: #ff4444;
            text-align: center;
            font-size: 1.2em;
            padding: 20px;
        }
        
        .lock-waiting {
            color: #ffd700;
            text-align: center;
            font-size: 1.1em;
            padding: 20px;
            opacity: 0.8;
            font-style: italic;
            animation: pulse 2s ease-in-out infinite;
        }
    `;
    document.head.appendChild(gameStyles);
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
