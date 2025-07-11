// js/game.js
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
    
    console.log(`Loading level: ${level}, Lock component: ${lockComponent}`);

    // Problems array to store loaded problems
    let problems = [];
    let currentProblemIndex = 0;
    let currentProblem = null;
    let revealedIndex = 0;

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
                problemPath = 'Assets/Master _Lvl/master_problems.md';
                break;
            default:
                problemPath = 'Assets/Beginner_Lvl/beginner_problems.md';
        }
        
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
                console.log(`Loaded ${problems.length} problems for ${level} level`);
                
                // Start with the first problem
                if (problems.length > 0) {
                    currentProblem = problems[currentProblemIndex];
                    setupProblem();
                } else {
                    console.error('No problems found in the loaded file');
                    // Use fallback problem
                    currentProblem = {
                        problem: "4x = 24",
                        solution: "x = 6"
                    };
                    setupProblem();
                }
            })
            .catch(error => {
                console.error('Error loading problems:', error);
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
        
        // Split by problem (starting with a number followed by dot)
        const problemRegex = /\d+\.\s+`([^`]+)`\s+(?:-[^]+?(?=\d+\.\s+`|\n\n|$))/g;
        let match;
        
        while ((match = problemRegex.exec(markdownContent)) !== null) {
            try {
                const problemText = match[1];
                
                // Extract solution from the steps (last line of the steps)
                const steps = match[0].split('\n').filter(line => line.trim().startsWith('-'));
                const lastStep = steps[steps.length - 1].trim().replace('- ', '');
                
                parsedProblems.push({
                    problem: problemText,
                    solution: lastStep
                });
            } catch (e) {
                console.error('Error parsing problem:', e);
            }
        }
        
        return parsedProblems;
    }

    function setupProblem() {
        if (!currentProblem) return;
        
        // Reset revealed characters
        revealedIndex = 0;
        
        // Display the problem
        problemContainer.textContent = currentProblem.problem;

        // Display the solution with hidden characters
        solutionContainer.innerHTML = ''; // Clear previous solution
        currentProblem.solution.split('').forEach(char => {
            const charSpan = document.createElement('span');
            charSpan.textContent = char;
            // Hide all characters initially, except spaces
            if (char !== ' ') {
                charSpan.classList.add('hidden-char');
            }
            solutionContainer.appendChild(charSpan);
        });
    }

    function loadLockComponent() {
        // Fetch and display the lock component based on URL parameter
        fetch(`lock-components/simplified-lock.html`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load lock component: ${response.statusText}`);
                }
                return response.text();
            })
            .then(data => {
                lockDisplay.innerHTML = data;
                console.log('Simplified lock component loaded successfully');
            })
            .catch(error => {
                console.error('Error loading lock component:', error);
                lockDisplay.textContent = 'Error loading lock.';
            });
    }

    function revealNextCharacter() {
        const spans = solutionContainer.getElementsByTagName('span');
        if (revealedIndex < spans.length) {
            // Find the next non-space character to reveal
            while(revealedIndex < spans.length && spans[revealedIndex].textContent === ' '){
                revealedIndex++;
            }
            if(revealedIndex < spans.length){
                spans[revealedIndex].classList.remove('hidden-char');
                spans[revealedIndex].classList.add('revealed-char');
                revealedIndex++;
            }
        }
    }

    // Move to next problem
    function nextProblem() {
        currentProblemIndex++;
        if (currentProblemIndex >= problems.length) {
            // Loop back to first problem for now
            currentProblemIndex = 0;
        }
        currentProblem = problems[currentProblemIndex];
        setupProblem();
    }

    // Event Listeners
    helpButton.addEventListener('click', revealNextCharacter);

    // Initial setup
    loadProblems(); // Load problems first
    loadLockComponent();
    
    // Reference to matrix canvas to listen for symbol clicks
    const matrixCanvas = document.getElementById('matrix-canvas');

    /** Get next hidden character from solution */
    function getNextChar() {
        const spans = solutionContainer.getElementsByTagName('span');
        for (let i = 0; i < spans.length; i++) {
            if (spans[i].classList.contains('hidden-char')) {
                return spans[i].textContent;
            }
        }
        return null;
    }

    /** Handle correct symbol selection */
    function handleCorrectAnswer() {
        console.log('✔️ Correct!');
        revealNextCharacter();
        checkLevelCompletion();
    }

    /** Handle incorrect symbol selection */
    function handleIncorrectAnswer() {
        console.log('❌ Incorrect!');
        document.body.classList.add('incorrect-flash');
        setTimeout(() => document.body.classList.remove('incorrect-flash'), 300);
    }

    /** Check if all solution characters have been revealed */
    function checkLevelCompletion() {
        const spans = solutionContainer.getElementsByTagName('span');
        const complete = Array.from(spans).every(span => !span.classList.contains('hidden-char'));
        if (complete) {
            console.log('🎉 Problem Complete!');
            // Show completion message
            setTimeout(() => {
                alert(`Problem ${currentProblemIndex + 1} completed! Moving to next problem.`);
                nextProblem();
            }, 1000);
        }
    }

    // Listen for symbol clicks from matrix.js
    matrixCanvas.addEventListener('symbolClicked', (e) => {
        const clicked = e.detail.symbol;
        const expected = getNextChar();
        console.log(`Expected: ${expected}, Clicked: ${clicked}`);
        if (expected && clicked === expected) {
            handleCorrectAnswer();
        } else if (expected) {
            handleIncorrectAnswer();
        }
    });
});
