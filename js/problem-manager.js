// js/problem-manager.js - Handles problem loading, parsing, and setup

/**
 * Problem Manager - Centralized problem handling
 */
const ProblemManager = {
  _problems: [],
  _currentProblemIndex: 0,
  _currentProblem: null,
  _currentSolutionStepIndex: 0,

  /**
   * Load problems based on level
   * @param {string} level - Difficulty level
   * @returns {Promise<void>}
   */
  async loadProblems(level) {
    let problemPath = "";
    switch (level) {
      case "beginner":
        problemPath = "Assets/Beginner_Lvl/beginner_problems.md";
        break;
      case "warrior":
        problemPath = "Assets/Warrior_Lvl/warrior_problems.md";
        break;
      case "master":
        problemPath = "Assets/Master_Lvl/master_problems.md";
        break;
      default:
        problemPath = "Assets/Beginner_Lvl/beginner_problems.md";
    }

    try {
      const response = await fetch(problemPath);
      if (!response.ok) {
        throw new Error(`Failed to load problems: ${response.statusText}`);
      }
      const data = await response.text();
      this._problems = this._parseProblemsFromMarkdown(data);
    } catch {
      // Fallback problem
      this._problems = [
        {
          problem: "4x = 24",
          steps: ["x = 6"],
          currentStep: 0,
          currentSymbol: 0,
        },
      ];
    }
  },

  /**
   * Parse problems from markdown content
   * @param {string} markdownContent - Markdown text
   * @returns {Array} Parsed problems
   */
  _parseProblemsFromMarkdown(markdownContent) {
    const parsedProblems = [];
    const problemRegex = /(\d+)\.\s+`([^`]+)`\s*\n((?:\s*-[^\n]+\n?)+)/g;
    let match;

    while ((match = problemRegex.exec(markdownContent)) !== null) {
      try {
        const problemText = match[2];
        const stepsText = match[3];
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
  },

  /**
   * Get current problem
   * @returns {Object|null} Current problem
   */
  getCurrentProblem() {
    return this._currentProblem;
  },

  /**
   * Set current problem by index
   * @param {number} index - Problem index
   */
  setCurrentProblem(index) {
    if (index >= 0 && index < this._problems.length) {
      this._currentProblemIndex = index;
      this._currentProblem = this._problems[index];
      this._currentSolutionStepIndex = 0;
    }
  },

  /**
   * Move to next problem
   */
  nextProblem() {
    this._currentProblemIndex++;
    if (this._currentProblemIndex >= this._problems.length) {
      this._currentProblemIndex = 0; // Loop back
    }
    this.setCurrentProblem(this._currentProblemIndex);
  },

  /**
   * Get current solution step index
   * @returns {number} Step index
   */
  getCurrentStepIndex() {
    return this._currentSolutionStepIndex;
  },

  /**
   * Advance to next step
   */
  nextStep() {
    if (
      this._currentProblem &&
      this._currentSolutionStepIndex < this._currentProblem.steps.length - 1
    ) {
      this._currentSolutionStepIndex++;
    }
  },

  /**
   * Check if problem is complete
   * @returns {boolean} Complete status
   */
  isProblemComplete() {
    return (
      this._currentSolutionStepIndex >= this._currentProblem.steps.length - 1
    );
  },
};

// Export for ES6 modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = ProblemManager;
} else {
  window.ProblemManager = ProblemManager;
}
