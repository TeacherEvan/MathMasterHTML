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
      case "h2p":
        problemPath =
          "/src/assets/problems/Assets/Tutorial_Lvl/h2p_problems.json";
        break;
      case "beginner":
        problemPath =
          "/src/assets/problems/Assets/Beginner_Lvl/beginner_problems.json";
        break;
      case "warrior":
        problemPath =
          "/src/assets/problems/Assets/Warrior_Lvl/warrior_problems.json";
        break;
      case "master":
        problemPath =
          "/src/assets/problems/Assets/Master_Lvl/master_problems.json";
        break;
      default:
        problemPath =
          "/src/assets/problems/Assets/Beginner_Lvl/beginner_problems.json";
    }

    try {
      const response = await fetch(problemPath);
      if (!response.ok) {
        throw new Error(`Failed to load problems: ${response.statusText}`);
      }
      const data = await response.json();
      this._problems = this._normalizeProblems(data);
    } catch {
      // Fallback problem
      this._problems = [
        {
          problem: "1x + 1 + 1 + 1 = 1",
          steps: [
            "1x + 1 + 1 + 1 = 1",
            "1x + 3 = 1",
            "1x = 1 - 3",
            "x = -2",
          ],
          currentStep: 0,
          currentSymbol: 0,
        },
      ];
    }
  },

  /**
   * Normalize problems from JSON content
   * @param {Array|Object} payload - JSON payload
   * @returns {Array} Parsed problems
   */
  _normalizeProblems(payload) {
    const source = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.problems)
        ? payload.problems
        : [];

    return source
      .filter((entry) => entry && typeof entry.problem === "string")
      .map((entry) => ({
        problem: entry.problem,
        steps: Array.isArray(entry.steps) ? entry.steps : [],
        currentStep: 0,
        currentSymbol: 0,
      }))
      .filter((entry) => entry.steps.length > 0);
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
