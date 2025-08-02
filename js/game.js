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

    // Load problems based on level
    function loadProblems() {
        let problemPath = '';
        
        // Determine which asset file to load based on level
        switch(level) {
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
                const problemNumber = match[1];
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
        
        setupProblem();
        
        // Trigger event for worm spawning
        document.dispatchEvent(new CustomEvent('problemLineCompleted'));
    }

    // Initial setup
    loadProblems(); // Load problems first

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

    /** Check if all solution steps have been revealed */
    function checkProblemCompletion() {
        // Check if all symbols in all steps have been revealed
        const hiddenSymbols = solutionContainer.querySelectorAll('.hidden-symbol');
        
        if (hiddenSymbols.length === 0) {
            console.log('🎉 Problem Complete - All steps revealed!');
            
            // Enhanced completion effect
            solutionContainer.style.animation = 'completionGlow 1s ease-in-out';
            
            // Show completion message and move to next problem
            setTimeout(() => {
                const completionMessage = `Problem ${currentProblemIndex + 1} completed!\n` +
                    `Steps completed: ${currentProblem.steps.length}\n` +
                    `Correct answers: ${correctAnswersCount}\n` +
                    `Moving to next problem...`;
                
                console.log(completionMessage);
                nextProblem();
                
                // Reset completion effect
                solutionContainer.style.animation = '';
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
            font-family: 'Orbitron', monospace;
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
