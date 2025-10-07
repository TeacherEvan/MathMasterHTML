// js/game.js - Enhanced Game Logic with Worm Integration

console.log("Game script loaded.");

document.addEventListener('DOMContentLoaded', () => {
    const problemContainer = document.getElementById('problem-container');
    const solutionContainer = document.getElementById('solution-container');
    const lockDisplay = document.getElementById('lock-display');
    const helpButton = document.getElementById('help-button');

    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const level = urlParams.get('level') || 'beginner';
    const lockComponent = urlParams.get('lockComponent') || 'level-1-transformer.html';

    console.log(`🎮 Loading level: ${level}, Lock component: ${lockComponent}`);

    // Apply level theme to body
    document.body.className = `level-${level}`;

    // Initialize Problem Manager
    const problemManager = new ProblemManager(level);

    // Game state variables
    let currentProblem;
    let currentStepIndex = 0;
    let currentSymbolIndex = 0;
    let revealedIndex = 0;
    let correctAnswersCount = 0;

    async function initializeGame() {
        await problemManager.loadProblems();
        currentProblem = problemManager.getCurrentProblem();
        setupProblem();
    }

    function setupProblem() {
        if (!currentProblem || !currentProblem.steps || currentProblem.steps.length === 0) {
            console.error('❌ Problem setup failed - invalid problem data');
            return;
        }

        console.log(`🎯 Setting up problem: ${currentProblem.problem}`);
        console.log(`📚 Solution steps:`, currentProblem.steps);

        // Reset indices
        currentStepIndex = 0;
        currentSymbolIndex = 0;
        revealedIndex = 0;
        correctAnswersCount = 0; // Reset for new problem

        // Show basic lock until activation
        if (lockDisplay && window.lockManager) {
            lockManager.showBasicLock();
        }

        // Display the problem with enhanced styling
        problemContainer.innerHTML = `<div class="problem-text">${currentProblem.problem}</div>`;

        // Setup the step-by-step solution display
        setupStepDisplay();

        console.log(`📝 Problem setup complete with ${currentProblem.steps.length} solution steps`);
    }

    function setupStepDisplay() {
        // Clear previous solution
        solutionContainer.innerHTML = '';

        // Create container for all solution steps
        const stepsContainer = document.createElement('div');
        stepsContainer.className = 'steps-container';

        currentProblem.steps.forEach((step, stepIndex) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'solution-step';
            stepDiv.dataset.stepIndex = stepIndex;

            // Create spans for each symbol in the step
            step.split('').forEach((symbol, symbolIndex) => {
                const symbolSpan = document.createElement('span');
                symbolSpan.textContent = symbol;
                symbolSpan.dataset.stepIndex = stepIndex;
                symbolSpan.dataset.symbolIndex = symbolIndex;
                symbolSpan.className = 'solution-symbol';

                // Initially hide all symbols except spaces
                if (symbol === ' ') {
                    symbolSpan.classList.add('space-symbol');
                } else {
                    symbolSpan.classList.add('hidden-symbol');
                }

                stepDiv.appendChild(symbolSpan);
            });

            stepsContainer.appendChild(stepDiv);
        });

        solutionContainer.appendChild(stepsContainer);
        console.log(`📋 Created ${currentProblem.steps.length} solution steps`);
    }

    // Move to next problem
    function nextProblem() {
        currentProblem = problemManager.nextProblem();

        // Reset step indices
        currentStepIndex = 0;
        currentSymbolIndex = 0;

        setupProblem();
    }

    // Initial setup
    initializeGame();

    /** Get next hidden symbol from solution - now accepts any symbol in current line */
    function getNextSymbol() {
        // Find all hidden symbols in the current step
        const currentStepSymbols = solutionContainer.querySelectorAll(
            `[data-step-index="${currentStepIndex}"].hidden-symbol`
        );

        if (currentStepSymbols.length > 0) {
            // Return array of all possible symbols in current line
            const possibleSymbols = Array.from(currentStepSymbols).map(span => span.textContent);
            console.log(`🎯 Current line has ${possibleSymbols.length} hidden symbols: [${possibleSymbols.join(', ')}]`);
            return possibleSymbols;
        }

        console.log('🏁 No more hidden symbols in current step');
        return null;
    }

    /** Check if clicked symbol exists in current line - FIXED X/x DETECTION */
    function isSymbolInCurrentLine(clickedSymbol) {
        const expectedSymbols = getNextSymbol();
        console.log(`🔍 Checking symbol "${clickedSymbol}" against expected symbols:`, expectedSymbols);

        if (expectedSymbols && Array.isArray(expectedSymbols)) {
            // FIXED: Normalize X/x comparison - treat them as the same
            const normalizedClicked = clickedSymbol.toLowerCase() === 'x' ? 'X' : clickedSymbol;
            const normalizedExpected = expectedSymbols.map(s => s.toLowerCase() === 'x' ? 'X' : s);

            const result = normalizedExpected.includes(normalizedClicked);
            console.log(`🎯 Symbol "${clickedSymbol}" normalized to "${normalizedClicked}" - match result: ${result}`);
            return result;
        }
        console.log(`❌ No expected symbols available`);
        return false;
    }

    /** Reveal specific symbol in current line - FIXED X/x DETECTION */
    function revealSpecificSymbol(targetSymbol) {
        console.log(`🔍 Attempting to reveal symbol: "${targetSymbol}" in step ${currentStepIndex}`);

        // FIXED: Normalize X/x for matching
        const normalizedTarget = targetSymbol.toLowerCase() === 'x' ? 'X' : targetSymbol;

        // Find the specific symbol in current step
        const currentStepSymbols = solutionContainer.querySelectorAll(
            `[data-step-index="${currentStepIndex}"].hidden-symbol`
        );

        console.log(`📋 Found ${currentStepSymbols.length} hidden symbols in current step`);

        for (let span of currentStepSymbols) {
            const spanSymbol = span.textContent;
            const normalizedSpan = spanSymbol.toLowerCase() === 'x' ? 'X' : spanSymbol;

            console.log(`🔎 Comparing "${normalizedTarget}" with hidden symbol "${normalizedSpan}"`);

            if (normalizedSpan === normalizedTarget) {
                span.classList.remove('hidden-symbol');
                span.classList.add('revealed-symbol');
                console.log(`✅ Successfully revealed symbol: "${targetSymbol}" in step ${currentStepIndex + 1}`);

                // Dispatch event to notify worms that a RED symbol appeared!
                document.dispatchEvent(new CustomEvent('symbolRevealed', {
                    detail: { symbol: targetSymbol, element: span }
                }));

                return true;
            }
        }

        console.log(`❌ Symbol "${targetSymbol}" not found in current step`);
        return false;
    }

    /** Handle correct symbol selection */
    function handleCorrectAnswer(clickedSymbol) {
        console.log(`✅ Correct symbol clicked: "${clickedSymbol}"`);
        correctAnswersCount++;

        // Dispatch first-line-solved event for LockManager
        if (correctAnswersCount === 1) {
            console.log('🔒 First correct answer - dispatching first-line-solved event');
            document.dispatchEvent(new Event('first-line-solved'));
        }

        // Add visual feedback
        document.body.style.background = 'radial-gradient(circle, rgba(0,255,0,0.1), rgba(0,0,0,1))';
        setTimeout(() => {
            document.body.style.background = '';
        }, 300);

        // Reveal the specific symbol clicked
        revealSpecificSymbol(clickedSymbol);
        checkLineCompletion();
    }

    /** Handle incorrect symbol selection */
    function handleIncorrectAnswer() {
        console.log('❌ Incorrect symbol clicked!');
        document.body.classList.add('incorrect-flash');
        setTimeout(() => document.body.classList.remove('incorrect-flash'), 400);
    }

    /** Check if current line is complete and move to next */
    function checkLineCompletion() {
        // Check if current step has any hidden symbols left
        const currentStepHiddenSymbols = solutionContainer.querySelectorAll(
            `[data-step-index="${currentStepIndex}"].hidden-symbol`
        );

        if (currentStepHiddenSymbols.length === 0) {
            console.log(`🎉 Line ${currentStepIndex + 1} completed!`);

            // SPECIAL EFFECT: Lightning flash for ALL row completions
            console.log(`⚡ ROW ${currentStepIndex + 1} COMPLETED - Triggering lightning flash!`);
            createLightningFlash();
            transformRowToPulsatingCyan(currentStepIndex);

            // Trigger worm spawning for completed line
            console.log('🐛 DISPATCHING problemLineCompleted EVENT - This should spawn a worm!');

            // Enhanced event dispatch with line details
            document.dispatchEvent(new CustomEvent('problemLineCompleted', {
                detail: {
                    lineNumber: currentStepIndex + 1,
                    lineText: currentProblem.steps[currentStepIndex]
                }
            }));

            // Log the completion for debugging
            console.log(`🔒 Line ${currentStepIndex + 1} completed - triggering lock progression`);

            // Move to next step if available
            if (currentStepIndex < currentProblem.steps.length - 1) {
                currentStepIndex++;
                currentSymbolIndex = 0;
                console.log(`📋 Moving to step ${currentStepIndex + 1}: "${currentProblem.steps[currentStepIndex]}"`);
            } else {
                console.log('🎉 All steps complete!');
                checkProblemCompletion();
            }
        }
    }

    /** Create lightning flash effect */
    function createLightningFlash() {
        console.log('⚡ Creating lightning flash effect...');

        // Create lightning overlay
        const lightning = document.createElement('div');
        lightning.className = 'lightning-flash';
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

    /** Transform completed row to pulsating cyan */
    function transformRowToPulsatingCyan(stepIndex) {
        console.log(`💙 Transforming row ${stepIndex + 1} to pulsating cyan...`);

        // Get ALL non-hidden, non-space symbols in the completed row
        const rowSymbols = solutionContainer.querySelectorAll(
            `[data-step-index="${stepIndex}"].solution-symbol:not(.hidden-symbol):not(.space-symbol):not(.completed-row-symbol)`
        );

        rowSymbols.forEach(symbol => {
            // Remove red styling and add cyan pulsating
            symbol.classList.remove('revealed-symbol');
            symbol.classList.add('completed-row-symbol');
        });

        console.log(`✅ Row ${stepIndex + 1} transformed - ${rowSymbols.length} symbols now pulsating cyan`);
    }

    /** Check if all solution steps have been revealed */
    function checkProblemCompletion() {
        // Check if all symbols in all steps have been revealed
        const hiddenSymbols = solutionContainer.querySelectorAll('.hidden-symbol');

        if (hiddenSymbols.length === 0) {
            console.log('🎉 Problem Complete - All steps revealed!');

            // Enhanced completion effect
            solutionContainer.style.animation = 'completionGlow 1s ease-in-out';

            // Show completion message and trigger console modal
            setTimeout(() => {
                const completionMessage = `Problem ${currentProblemIndex + 1} completed!\n` +
                    `Steps completed: ${currentProblem.steps.length}\n` +
                    `Correct answers: ${correctAnswersCount}`;

                console.log(completionMessage);

                // Reset completion effect
                solutionContainer.style.animation = '';

                // Dispatch problemCompleted event to trigger console modal
                console.log('📡 Dispatching problemCompleted event');
                document.dispatchEvent(new CustomEvent('problemCompleted'));

                // Wait for console symbol to be added before moving to next problem
                // The consoleSymbolAdded event will trigger nextProblem()
            }, 1500);
        }
    }

    // Event Listeners
    helpButton.addEventListener('click', () => {
        console.log('💡 Help button clicked');

        // Get available symbols in current line
        const availableSymbols = getNextSymbol();
        if (availableSymbols && availableSymbols.length > 0) {
            // Reveal a random symbol from current line
            const randomSymbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
            revealSpecificSymbol(randomSymbol);
            checkLineCompletion();
        }

        // Add help button feedback
        helpButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            helpButton.style.transform = '';
        }, 150);
    });

    // Listen for symbol clicks from symbol rain (matrix.js)
    document.addEventListener('symbolClicked', (e) => {
        const clicked = e.detail.symbol;

        console.log(`🎯 Symbol Rain click - Clicked: "${clicked}"`);

        // First, check if this symbol was stolen by a worm and needs to be restored
        const normalizedClicked = clicked.toLowerCase() === 'x' ? 'X' : clicked;
        const stolenSymbols = solutionContainer.querySelectorAll('[data-stolen="true"]');
        let symbolRestored = false;

        for (let stolenSymbol of stolenSymbols) {
            const stolenText = stolenSymbol.textContent;
            const normalizedStolen = stolenText.toLowerCase() === 'x' ? 'X' : stolenText;

            if (normalizedStolen === normalizedClicked) {
                console.log(`🔄 Restoring stolen symbol "${clicked}" in Panel B!`);

                // Restore the symbol
                stolenSymbol.classList.remove('stolen', 'hidden-symbol');
                stolenSymbol.classList.add('revealed-symbol');
                stolenSymbol.style.visibility = 'visible';
                delete stolenSymbol.dataset.stolen;

                symbolRestored = true;

                // Add visual feedback for restoration
                document.body.style.background = 'radial-gradient(circle, rgba(0,255,255,0.2), rgba(0,0,0,1))';
                setTimeout(() => {
                    document.body.style.background = '';
                }, 300);

                console.log(`✅ Symbol "${clicked}" successfully restored!`);

                // CRITICAL FIX: Check if line is complete after restoration
                console.log(`🔍 Checking line completion after restoration...`);
                checkLineCompletion();

                break;
            }
        }

        // If symbol was restored, we're done
        if (symbolRestored) {
            return;
        }

        // Otherwise, check if it's in the current line (normal gameplay)
        if (isSymbolInCurrentLine(clicked)) {
            handleCorrectAnswer(clicked);
        } else {
            handleIncorrectAnswer();
        }
    });

    // Listen for worm symbol correct events
    document.addEventListener('wormSymbolCorrect', (e) => {
        const symbol = e.detail.symbol;

        console.log(`🐛✅ Worm symbol event - Symbol: ${symbol}`);

        if (isSymbolInCurrentLine(symbol)) {
            handleCorrectAnswer(symbol);
        }
    });

    // Listen for worm symbol saved events (when player clicks worm to save symbol)
    document.addEventListener('wormSymbolSaved', (e) => {
        const { symbol, wormId } = e.detail;

        console.log(`🎯✅ Player saved symbol "${symbol}" from worm ${wormId}!`);

        // Add visual feedback for saving a symbol
        document.body.style.background = 'radial-gradient(circle, rgba(0,255,0,0.2), rgba(0,0,0,1))';
        setTimeout(() => {
            document.body.style.background = '';
        }, 500);

        // Could add scoring or other rewards here
        console.log(`💯 Good job! Symbol "${symbol}" has been saved!`);
    });

    // Listen for console symbol added events (from console manager)
    document.addEventListener('consoleSymbolAdded', (e) => {
        console.log('🎮 Console symbol added, moving to next problem');

        if (e.detail) {
            console.log(`📊 Console update: ${e.detail.symbol} added to position ${e.detail.position + 1}`);
        }

        // Continue to next problem after console interaction
        setTimeout(() => {
            nextProblem();
        }, 300);
    });

    const gameStyles = document.createElement('style');
    gameStyles.id = 'game-styles'; // Add an ID for easy replacement

    function updateGameStyles() {
        const isMobile = window.innerWidth <= 768;
        const solutionSymbolMinWidth = isMobile ? '6px' : '12px';
        const spaceSymbolMargin = isMobile ? '0 2px' : '0 4px';

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
            min-width: ${solutionSymbolMinWidth};
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
            margin: ${spaceSymbolMargin};
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
    }

    // Initial style setup
    updateGameStyles();
    document.head.appendChild(gameStyles);

    // Update styles on resolution change
    document.addEventListener('displayResolutionChanged', updateGameStyles);

    console.log('✅ Game initialization complete!');
});
