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

    // Problems array to store loaded problems
    let problems = [];
    let currentProblemIndex = 0;
    let currentProblem = null;
    let currentStepIndex = 0;
    let currentSymbolIndex = 0;
    let revealedIndex = 0;
    let correctAnswersCount = 0;

    // PURPLE WORM: Track consecutive wrong answers
    let consecutiveWrongAnswers = 0;
    const PURPLE_WORM_THRESHOLD = 3; // Trigger purple worm after 3 wrong clicks (excluding worm clicks)

    // PERFORMANCE: DOM query caching to reduce repeated querySelectorAll calls
    let cachedStepSymbols = null;
    let cachedStepIndex = -1; // Track which step is cached
    let cacheInvalidated = true;

    // PERFORMANCE: Get cached step symbols (refreshes when step changes)
    function getCachedStepSymbols(stepIndex) {
        if (cacheInvalidated || cachedStepIndex !== stepIndex || !cachedStepSymbols) {
            cachedStepSymbols = solutionContainer.querySelectorAll(
                `.solution-symbol[data-step-index="${stepIndex}"]`
            );
            cachedStepIndex = stepIndex;
            cacheInvalidated = false;
            console.log(`💾 Cached ${cachedStepSymbols.length} symbols for step ${stepIndex}`);
        }
        return cachedStepSymbols;
    }

    // PERFORMANCE: Invalidate cache when needed
    function invalidateStepCache() {
        cacheInvalidated = true;
        cachedStepSymbols = null;
    }

    // PERFORMANCE FIX: Defer heavy problem loading to prevent blocking animation
    // Uses shared utility from utils.js

    // Load problems based on level
    function loadProblems() {
        let problemPath = '';

        // Determine which asset file to load based on level
        switch (level) {
            case 'beginner':
                problemPath = 'Assets/Beginner_Lvl/beginner_problems.md';
                break;
            case 'warrior':
                problemPath = 'Assets/Warrior_Lvl/warrior_problems.md';
                break;
            case 'master':
                problemPath = 'Assets/Master_Lvl/master_problems.md';
                break;
            default:
                problemPath = 'Assets/Beginner_Lvl/beginner_problems.md';
        }

        console.log(`📚 Loading problems from: ${problemPath}`);

        // Fetch the problem set
        fetch(problemPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load problems: ${response.statusText}`);
                }
                return response.text();
            })
            .then(data => {
                // Parse problems from markdown
                problems = parseProblemsFromMarkdown(data);
                console.log(`📖 Loaded ${problems.length} problems for ${level} level`);

                // Start with the first problem
                if (problems.length > 0) {
                    currentProblem = problems[currentProblemIndex];
                    setupProblem();
                } else {
                    console.error('❌ No problems found in the loaded file');
                    // Use fallback problem
                    currentProblem = {
                        problem: "4x = 24",
                        solution: "x = 6"
                    };
                    setupProblem();
                }
            })
            .catch(error => {
                console.error('❌ Error loading problems:', error);
                // Fallback to a default problem
                currentProblem = {
                    problem: "4x = 24",
                    solution: "x = 6"
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
                const steps = stepsText.split('\n')
                    .filter(line => line.trim().startsWith('-'))
                    .map(line => line.trim().replace(/^-\s*/, ''));

                if (steps.length > 0) {
                    parsedProblems.push({
                        problem: problemText,
                        steps: steps,
                        currentStep: 0,
                        currentSymbol: 0
                    });
                }
            } catch (e) {
                console.error('Error parsing problem:', e);
            }
        }

        console.log(`📚 Parsed ${parsedProblems.length} problems with multi-step solutions`);
        return parsedProblems;
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
        invalidateStepCache(); // PERFORMANCE: Invalidate cache on new problem

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
        currentProblemIndex++;
        if (currentProblemIndex >= problems.length) {
            // Loop back to first problem for now
            currentProblemIndex = 0;
            console.log('🔄 Looping back to first problem');
        }
        currentProblem = problems[currentProblemIndex];

        // Reset step indices
        currentStepIndex = 0;
        currentSymbolIndex = 0;
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
        const currentStepSymbols = getCachedStepSymbols(currentStepIndex);
        const hiddenSymbols = Array.from(currentStepSymbols).filter(el =>
            el.classList.contains('hidden-symbol')
        );

        if (hiddenSymbols.length > 0) {
            // Return array of all possible symbols in current line
            const possibleSymbols = hiddenSymbols.map(span => span.textContent);
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
            // REFACTORED: Use shared normalizeSymbol utility from utils.js
            const normalizedClicked = normalizeSymbol(clickedSymbol);
            const normalizedExpected = expectedSymbols.map(s => normalizeSymbol(s));

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

        // REFACTORED: Use shared normalizeSymbol utility from utils.js
        const normalizedTarget = normalizeSymbol(targetSymbol);

        // PERFORMANCE: Use cached symbols
        const currentStepSymbols = getCachedStepSymbols(currentStepIndex);
        const hiddenSymbols = Array.from(currentStepSymbols).filter(el =>
            el.classList.contains('hidden-symbol')
        );

        console.log(`📋 Found ${hiddenSymbols.length} hidden symbols in current step`);

        for (const span of hiddenSymbols) {
            const spanSymbol = span.textContent;
            const normalizedSpan = normalizeSymbol(spanSymbol);

            console.log(`🔎 Comparing "${normalizedTarget}" with hidden symbol "${normalizedSpan}"`);

            if (normalizedSpan === normalizedTarget) {
                span.classList.remove('hidden-symbol');
                span.classList.add('revealed-symbol');
                invalidateStepCache(); // PERFORMANCE: Invalidate cache after DOM change
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

        // PURPLE WORM: Reset wrong answer counter on correct answer
        consecutiveWrongAnswers = 0;

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

        // PURPLE WORM: Increment wrong answer counter
        consecutiveWrongAnswers++;
        console.log(`🟣 Consecutive wrong answers: ${consecutiveWrongAnswers}/${PURPLE_WORM_THRESHOLD}`);

        // Trigger purple worm on threshold
        if (consecutiveWrongAnswers >= PURPLE_WORM_THRESHOLD) {
            console.log('🟣 PURPLE WORM TRIGGERED! 2+ wrong answers!');
            document.dispatchEvent(new CustomEvent('purpleWormTriggered', {
                detail: { wrongAnswerCount: consecutiveWrongAnswers }
            }));
            // Reset counter after triggering (can trigger again with 2 more wrong answers)
            consecutiveWrongAnswers = 0;
        }

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

            // ENHANCED DRAMATIC EFFECTS for row completion
            console.log(`⚡ ROW ${currentStepIndex + 1} COMPLETED - Triggering enhanced celebration!`);
            createDramaticLineCompletion(currentStepIndex);

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
                invalidateStepCache(); // PERFORMANCE: Invalidate cache when moving to next step
                console.log(`📋 Moving to step ${currentStepIndex + 1}: "${currentProblem.steps[currentStepIndex]}"`);
            } else {
                console.log('🎉 All steps complete!');
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

    /** Create screen shake effect for impact */
    function createScreenShake() {
        console.log('📳 Creating screen shake effect...');
        document.body.classList.add('screen-shake');
        setTimeout(() => {
            document.body.classList.remove('screen-shake');
        }, 500);
    }

    /** Create celebration particles around the completed row */
    function createCelebrationParticles(stepIndex) {
        console.log('✨ Creating celebration particles...');
        
        const row = solutionContainer.querySelector(`[data-step-index="${stepIndex}"]`);
        if (!row) return;
        
        const rect = row.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Create particle container
        const particleContainer = document.createElement('div');
        particleContainer.className = 'celebration-particles';
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
        const colors = ['#00ffff', '#00ff00', '#ffff00', '#ff00ff', '#ff6600'];
        const symbols = ['★', '✦', '◆', '●', '⚡'];
        
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
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
        console.log(`🏆 Showing victory banner for line ${lineNumber}...`);
        
        const banner = document.createElement('div');
        banner.className = 'victory-banner';
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
        console.log(`💙 Transforming row ${stepIndex + 1} to pulsating cyan...`);

        // Get ALL non-hidden, non-space symbols in the completed row
        const rowSymbols = solutionContainer.querySelectorAll(
            `[data-step-index="${stepIndex}"].solution-symbol:not(.hidden-symbol):not(.space-symbol):not(.completed-row-symbol)`
        );

        rowSymbols.forEach((symbol, index) => {
            // Staggered animation for wave effect using CSS animation-delay instead of nested setTimeout
            symbol.classList.remove('revealed-symbol');
            symbol.classList.add('completed-row-symbol');
            
            // Use CSS custom property for staggered animation
            symbol.style.setProperty('--stagger-delay', `${index * 30}ms`);
            symbol.style.animation = `symbol-pop 0.3s ease-out ${index * 30}ms, pulsating-cyan 2s ease-in-out ${index * 30 + 300}ms infinite`;
        });

        console.log(`✅ Row ${stepIndex + 1} transformed - ${rowSymbols.length} symbols now pulsating cyan`);
    }

    /** Check if all solution steps have been revealed */
    function checkProblemCompletion() {
        // Check if all symbols in all steps have been revealed (excluding stolen ones)
        const hiddenSymbols = solutionContainer.querySelectorAll('.hidden-symbol');

        // Filter out stolen symbols - they don't block completion
        const nonStolenHiddenSymbols = Array.from(hiddenSymbols).filter(el => !el.dataset.stolen);

        console.log(`🔍 Total hidden symbols: ${hiddenSymbols.length}, Non-stolen: ${nonStolenHiddenSymbols.length}`);

        if (nonStolenHiddenSymbols.length === 0) {
            console.log('🎉 Problem Complete - All steps revealed (stolen symbols don\'t block progression)!');

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

        // PRIORITY 1: Check if this symbol was stolen by a worm (includes blue symbols!)
        // REFACTORED: Use shared normalizeSymbol utility from utils.js
        const normalizedClicked = normalizeSymbol(clicked);
        const stolenSymbols = solutionContainer.querySelectorAll('[data-stolen="true"]');
        let symbolRestored = false;
        let wasBlueSymbol = false;

        for (const stolenSymbol of stolenSymbols) {
            const stolenText = stolenSymbol.textContent;
            const normalizedStolen = normalizeSymbol(stolenText);

            if (normalizedStolen === normalizedClicked) {
                // Check if this was a blue (revealed) symbol before being stolen
                wasBlueSymbol = stolenSymbol.dataset.wasRevealed === 'true';

                console.log(`🔄 Restoring stolen ${wasBlueSymbol ? 'BLUE' : 'RED'} symbol "${clicked}" in Panel B!`);

                // Restore the symbol
                stolenSymbol.classList.remove('stolen', 'hidden-symbol');
                stolenSymbol.classList.add('revealed-symbol');
                stolenSymbol.style.visibility = 'visible';
                delete stolenSymbol.dataset.stolen;

                // Clear the wasRevealed flag
                if (wasBlueSymbol) {
                    delete stolenSymbol.dataset.wasRevealed;
                }

                symbolRestored = true;

                // Visual feedback - different color for blue symbol restoration
                if (wasBlueSymbol) {
                    document.body.style.background = 'radial-gradient(circle, rgba(0,255,255,0.3), rgba(0,0,0,1))';
                    console.log(`💎 BLUE symbol restored - game can continue progressing!`);
                } else {
                    document.body.style.background = 'radial-gradient(circle, rgba(0,255,255,0.2), rgba(0,0,0,1))';
                }

                setTimeout(() => {
                    document.body.style.background = '';
                }, 300);

                console.log(`✅ Symbol "${clicked}" successfully restored!`);

                // CRITICAL: Check line completion after restoration
                // This ensures game progression isn't blocked by stolen symbols
                console.log(`🔍 Checking line completion after restoration...`);
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

    // Add completion glow animation and additional styles
    const gameStyles = document.createElement('style');
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

    console.log('✅ Game initialization complete!');
});
