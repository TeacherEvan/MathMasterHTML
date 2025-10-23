// js/problem-loader.js - Problem Loading and Parsing Module
console.log("📚 Problem Loader Module Loading...");

/**
 * ProblemLoader - Handles loading and parsing of problem files
 * Extracted from game.js to improve maintainability
 */
class ProblemLoader {
    /**
     * @param {Object} config - Loader configuration
     * @param {string} config.assetBasePath - Base path for problem assets
     */
    constructor(config = {}) {
        this.assetBasePath = config.assetBasePath || 'Assets';
        this.problems = [];
        this.currentProblemIndex = 0;
        
        // Problem regex pattern for markdown parsing
        this.PROBLEM_REGEX = /(\d+)\.\s+`([^`]+)`\s*\n((?:\s*-[^\n]+\n?)+)/g;
        
        console.log('📚 ProblemLoader initialized');
    }

    /**
     * Get problem file path based on difficulty level
     * @param {string} level - Difficulty level (beginner, warrior, master)
     * @returns {string} Path to problem file
     */
    getProblemPath(level) {
        const levelMap = {
            'beginner': `${this.assetBasePath}/Beginner_Lvl/beginner_problems.md`,
            'warrior': `${this.assetBasePath}/Warrior_Lvl/warrior_problems.md`,
            'master': `${this.assetBasePath}/Master_Lvl/master_problems.md`
        };
        
        return levelMap[level] || levelMap['beginner'];
    }

    /**
     * Load problems from file
     * @param {string} level - Difficulty level
     * @returns {Promise<Array>} Array of parsed problems
     */
    async loadProblems(level) {
        const problemPath = this.getProblemPath(level);
        console.log(`📚 Loading problems from: ${problemPath}`);

        try {
            const response = await fetch(problemPath);
            
            if (!response.ok) {
                throw new Error(`Failed to load problems: ${response.statusText}`);
            }

            const data = await response.text();
            this.problems = this.parseProblemsFromMarkdown(data);
            
            console.log(`📖 Loaded ${this.problems.length} problems for ${level} level`);
            
            return this.problems;
        } catch (error) {
            console.error('❌ Error loading problems:', error);
            
            // Return fallback problem
            this.problems = [this.getFallbackProblem()];
            return this.problems;
        }
    }

    /**
     * Parse problems from markdown content
     * @param {string} markdownContent - Raw markdown content
     * @returns {Array} Array of parsed problems
     */
    parseProblemsFromMarkdown(markdownContent) {
        const parsedProblems = [];
        let match;

        // Reset regex state
        this.PROBLEM_REGEX.lastIndex = 0;

        while ((match = this.PROBLEM_REGEX.exec(markdownContent)) !== null) {
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
                        number: parseInt(problemNumber, 10),
                        problem: problemText,
                        steps: steps,
                        currentStep: 0,
                        currentSymbol: 0
                    });
                }
            } catch (e) {
                console.error('❌ Error parsing problem:', e);
            }
        }

        console.log(`📚 Parsed ${parsedProblems.length} problems with multi-step solutions`);
        return parsedProblems;
    }

    /**
     * Get fallback problem when loading fails
     * @returns {Object} Fallback problem object
     */
    getFallbackProblem() {
        return {
            number: 1,
            problem: "4x = 24",
            steps: ["4x = 24", "x = 24 ÷ 4", "x = 6"],
            currentStep: 0,
            currentSymbol: 0
        };
    }

    /**
     * Get problem by index
     * @param {number} index - Problem index
     * @returns {Object|null} Problem object or null
     */
    getProblem(index) {
        if (index < 0 || index >= this.problems.length) {
            console.warn(`⚠️ Problem index ${index} out of bounds (0-${this.problems.length - 1})`);
            return null;
        }
        return this.problems[index];
    }

    /**
     * Get current problem
     * @returns {Object|null} Current problem object or null
     */
    getCurrentProblem() {
        return this.getProblem(this.currentProblemIndex);
    }

    /**
     * Move to next problem
     * @returns {Object|null} Next problem object or null
     */
    nextProblem() {
        if (this.currentProblemIndex < this.problems.length - 1) {
            this.currentProblemIndex++;
            console.log(`➡️ Moving to problem ${this.currentProblemIndex + 1}/${this.problems.length}`);
            return this.getCurrentProblem();
        }
        
        console.log('🏁 No more problems available');
        return null;
    }

    /**
     * Move to previous problem
     * @returns {Object|null} Previous problem object or null
     */
    previousProblem() {
        if (this.currentProblemIndex > 0) {
            this.currentProblemIndex--;
            console.log(`⬅️ Moving to problem ${this.currentProblemIndex + 1}/${this.problems.length}`);
            return this.getCurrentProblem();
        }
        
        console.log('🏁 Already at first problem');
        return null;
    }

    /**
     * Reset to first problem
     */
    reset() {
        this.currentProblemIndex = 0;
        console.log('🔄 Problem loader reset to first problem');
    }

    /**
     * Get total problem count
     * @returns {number} Number of problems
     */
    getTotalProblems() {
        return this.problems.length;
    }

    /**
     * Get current problem number (1-indexed)
     * @returns {number} Current problem number
     */
    getCurrentProblemNumber() {
        return this.currentProblemIndex + 1;
    }

    /**
     * Validate problem structure
     * @param {Object} problem - Problem object to validate
     * @returns {boolean} True if valid
     */
    validateProblem(problem) {
        if (!problem) {
            console.error('❌ Problem is null or undefined');
            return false;
        }

        if (!problem.problem || typeof problem.problem !== 'string') {
            console.error('❌ Problem text is missing or invalid');
            return false;
        }

        if (!Array.isArray(problem.steps) || problem.steps.length === 0) {
            console.error('❌ Problem steps are missing or invalid');
            return false;
        }

        return true;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProblemLoader;
} else {
    window.ProblemLoader = ProblemLoader;
}

console.log('✅ Problem Loader Module Loaded');
