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

    // --- Sample Data ---
    const currentProblem = {
        problem: "4x = 24",
        solution: "x = 6"
    };
    let revealedIndex = 0;
    // -------------------

    function setupProblem() {
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
        fetch(`lock-components/${lockComponent}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load lock component: ${response.statusText}`);
                }
                return response.text();
            })
            .then(data => {
                lockDisplay.innerHTML = data;
            })
            .catch(error => {
                console.error('Error loading lock component:', error);
                lockDisplay.textContent = 'Error loading lock. Using default instead.';
                // Fallback to default lock
                fetch('lock-components/level-1-transformer.html')
                    .then(response => response.text())
                    .then(data => {
                        lockDisplay.innerHTML = data;
                    });
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

    // Event Listeners
    helpButton.addEventListener('click', revealNextCharacter);

    // Initial setup
    setupProblem();
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
            console.log('🎉 Level Complete!');
            // TODO: trigger level completion UI
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
