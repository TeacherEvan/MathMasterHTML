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
                problemPath = 'Assets/Master_Lvl/master_problems.md'; // Fixed typo
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

    function loadLockComponent() {
        // Fetch and display the lock component based on URL parameter
        const lockPath = `lock-components/${lockComponent}`;
        console.log(`🔒 Loading lock component: ${lockPath}`);
        
        fetch(lockPath)
            .then(response => {
                if (!response.ok) {
                    console.warn(`⚠️ Failed to load ${lockPath}, falling back to simplified lock`);
                    return fetch('lock-components/simplified-lock.html');
                }
                return response;
            })
            .then(response => response.text())
            .then(data => {
                lockDisplay.innerHTML = data;
                console.log('🔒 Lock component loaded successfully');
            })
            .catch(error => {
                console.error('❌ Error loading lock component:', error);
                lockDisplay.innerHTML = '<div class="lock-error">🔒 Lock Error</div>';
            });
    }

    function revealNextSymbol() {
        // Find all symbols in the current step that are still hidden
        const currentStepSymbols = solutionContainer.querySelectorAll(
            `[data-step-index="${currentStepIndex}"].hidden-symbol`
        );
        
        if (currentStepSymbols.length === 0) {
            // Current step is complete, check if we need to move to next step
            if (currentStepIndex < currentProblem.steps.length - 1) {
                // Move to next step
                currentStepIndex++;
                currentSymbolIndex = 0;
                console.log(`📋 Moving to step ${currentStepIndex + 1}: "${currentProblem.steps[currentStepIndex]}"`);
                
                // Trigger worm spawning for completed line
                console.log('🐛 COMPLETE LINE FINISHED - Triggering worm spawn');
                document.dispatchEvent(new CustomEvent('problemLineCompleted'));
                
                // Recursively reveal next symbol from new step
                revealNextSymbol();
            } else {
                console.log('🎉 All steps complete!');
                return null;
            }
        } else {
            // Reveal the next symbol in current step
            const nextSymbol = currentStepSymbols[0];
            nextSymbol.classList.remove('hidden-symbol');
            nextSymbol.classList.add('revealed-symbol');
            
            const symbolText = nextSymbol.textContent;
            console.log(`💡 Revealed symbol: "${symbolText}" (Step ${currentStepIndex + 1}, Position ${currentSymbolIndex})`);
            
            currentSymbolIndex++;
            return symbolText;
        }
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
    loadLockComponent();

    /** Get next hidden symbol from solution */
    function getNextSymbol() {
        // Find the next hidden symbol in the current step
        const currentStepSymbols = solutionContainer.querySelectorAll(
            `[data-step-index="${currentStepIndex}"].hidden-symbol`
        );
        
        if (currentStepSymbols.length > 0) {
            const nextSymbol = currentStepSymbols[0].textContent;
            console.log(`🎯 Next expected symbol: "${nextSymbol}" (Step ${currentStepIndex + 1})`);
            return nextSymbol;
        }
        
        console.log('🏁 No more hidden symbols in current step');
        return null;
    }

    /** Handle correct symbol selection */
    function handleCorrectAnswer() {
        console.log('✅ Correct symbol clicked!');
        correctAnswersCount++;
        
        // Add visual feedback
        document.body.style.background = 'radial-gradient(circle, rgba(0,255,0,0.1), rgba(0,0,0,1))';
        setTimeout(() => {
            document.body.style.background = '';
        }, 300);
        
        revealNextSymbol();
        checkProblemCompletion();
    }

    /** Handle incorrect symbol selection */
    function handleIncorrectAnswer() {
        console.log('❌ Incorrect symbol clicked!');
        document.body.classList.add('incorrect-flash');
        setTimeout(() => document.body.classList.remove('incorrect-flash'), 400);
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
        revealNextSymbol();
        
        // Add help button feedback
        helpButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            helpButton.style.transform = '';
        }, 150);
    });

    // Listen for symbol clicks from symbol rain (matrix.js)
    document.addEventListener('symbolClicked', (e) => {
        const clicked = e.detail.symbol;
        const expected = getNextSymbol();
        
        console.log(`🎯 Symbol Rain click - Expected: "${expected}", Clicked: "${clicked}"`);
        
        if (expected && clicked === expected) {
            handleCorrectAnswer();
        } else if (expected) {
            handleIncorrectAnswer();
        }
    });

    // Listen for worm symbol correct events
    document.addEventListener('wormSymbolCorrect', (e) => {
        const symbol = e.detail.symbol;
        const expected = getNextSymbol();
        
        console.log(`🐛✅ Worm symbol event - Symbol: ${symbol}, Expected: ${expected}`);
        
        if (symbol === expected) {
            handleCorrectAnswer();
        }
    });

    // Add completion glow animation and additional styles
    const gameStyles = document.createElement('style');
    gameStyles.textContent = `
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
            font-size: 1.1em;
            font-weight: 700;
            text-shadow: 0 0 15px rgba(0,255,0,0.8);
        }
        
        .steps-container {
            font-family: 'Orbitron', monospace;
            font-size: 1.1em;
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
            background: rgba(255,255,255,0.1);
            border-radius: 2px;
            text-shadow: none;
        }
        
        .revealed-symbol {
            color: #00ff00;
            text-shadow: 0 0 8px rgba(0,255,0,0.6);
            background: rgba(0,255,0,0.1);
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
    `;
    document.head.appendChild(gameStyles);
    
    console.log('✅ Game initialization complete!');
});
