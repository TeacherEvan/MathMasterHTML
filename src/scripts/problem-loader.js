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
    this.assetBasePath = config.assetBasePath || "/src/assets/problems/Assets";
    this.problems = [];
    this.currentProblemIndex = 0;
    this.readyPromise = null;

    console.log("📚 ProblemLoader initialized");
  }

  /**
   * Get problem file path based on difficulty level
   * @param {string} level - Difficulty level (h2p, beginner, warrior, master)
   * @returns {string} Path to problem file
   */
  getProblemPath(level) {
    const levelMap = {
      h2p: `${this.assetBasePath}/Tutorial_Lvl/h2p_problems.json`,
      beginner: `${this.assetBasePath}/Beginner_Lvl/beginner_problems.json`,
      warrior: `${this.assetBasePath}/Warrior_Lvl/warrior_problems.json`,
      master: `${this.assetBasePath}/Master_Lvl/master_problems.json`,
    };

    return levelMap[level] || levelMap["beginner"];
  }

  /**
   * Load problems from file
   * @param {string} level - Difficulty level
   * @returns {Promise<Array>} Array of parsed problems
   */
  async loadProblems(level) {
    const problemPath = this.getProblemPath(level);
    console.log(`📚 Loading problems from: ${problemPath}`);

    // Create a ready promise that resolves when loading completes
    // (success or fallback — resilient to load failures).
    let readyResolve;
    this.readyPromise = new Promise((resolve) => {
      readyResolve = resolve;
    });

    try {
      const response = await fetch(problemPath);

      if (!response.ok) {
        throw new Error(`Failed to load problems: ${response.statusText}`);
      }

      const data = await response.json();
      this.problems = this.normalizeProblems(data);

      console.log(
        `📖 Loaded ${this.problems.length} problems for ${level} level`,
      );

      return this.problems;
    } catch (error) {
      console.error("❌ Error loading problems:", error);

      // Return fallback problem
      this.problems = [this.getFallbackProblem()];
      return this.problems;
    } finally {
      readyResolve();
    }
  }

  /**
   * Normalize problems from JSON payload
   * @param {Array|Object} payload - Raw JSON payload
   * @returns {Array} Array of parsed problems
   */
  normalizeProblems(payload) {
    const source = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.problems)
        ? payload.problems
        : [];

    const parsedProblems = source
      .filter((entry) => entry && typeof entry.problem === "string")
      .map((entry, index) => ({
        number: Number.isFinite(entry.number) ? entry.number : index + 1,
        problem: entry.problem,
        steps: Array.isArray(entry.steps) ? entry.steps : [],
        currentStep: 0,
        currentSymbol: 0,
      }))
      .filter((entry) => entry.steps.length > 0);

    console.log(
      `📚 Parsed ${parsedProblems.length} problems from JSON data`,
    );
    return parsedProblems;
  }

  /**
   * Get fallback problem when loading fails
   * @returns {Object} Fallback problem object
   */
  getFallbackProblem() {
    return {
      number: 1,
      problem: "1x + 1 + 1 + 1 = 1",
      steps: [
        "1x + 1 + 1 + 1 = 1",
        "1x + 3 = 1",
        "1x = 1 - 3",
        "x = -2",
      ],
      currentStep: 0,
      currentSymbol: 0,
    };
  }

  /**
   * Get problem by index
   * @param {number} index - Problem index
   * @returns {Object|null} Problem object or null
   */
  getProblem(index) {
    if (index < 0 || index >= this.problems.length) {
      console.warn(
        `⚠️ Problem index ${index} out of bounds (0-${this.problems.length -
          1})`,
      );
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
      console.log(
        `➡️ Moving to problem ${this.currentProblemIndex + 1}/${
          this.problems.length
        }`,
      );
      return this.getCurrentProblem();
    }

    console.log("🏁 No more problems available");
    return null;
  }

  /**
   * Move to previous problem
   * @returns {Object|null} Previous problem object or null
   */
  previousProblem() {
    if (this.currentProblemIndex > 0) {
      this.currentProblemIndex--;
      console.log(
        `⬅️ Moving to problem ${this.currentProblemIndex + 1}/${
          this.problems.length
        }`,
      );
      return this.getCurrentProblem();
    }

    console.log("🏁 Already at first problem");
    return null;
  }

  /**
   * Reset to first problem
   */
  reset() {
    this.currentProblemIndex = 0;
    console.log("🔄 Problem loader reset to first problem");
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
      console.error("❌ Problem is null or undefined");
      return false;
    }

    if (!problem.problem || typeof problem.problem !== "string") {
      console.error("❌ Problem text is missing or invalid");
      return false;
    }

    if (!Array.isArray(problem.steps) || problem.steps.length === 0) {
      console.error("❌ Problem steps are missing or invalid");
      return false;
    }

    return true;
  }
}

// ---------------------------------------------------------------------------
// Backwards-compatible GameProblemLoader API
//
// game.html loads problem-loader.js (which exposes window.ProblemLoader) and
// historically loaded game-problem-loader.js (which exposed
// window.GameProblemLoader). The callback-based GameProblemLoader API lives
// here now, delegating to the ProblemLoader class internals so that
// loading/caching logic exists in a single module. Both
// window.ProblemLoader and window.GameProblemLoader remain available.
//
// A module-level shared loader instance is exposed as window.problemLoader so
// that game-runtime-coordinator.bootstrap() can await its readyPromise.
// ---------------------------------------------------------------------------
const sharedProblemLoader = new ProblemLoader();

function attachGameProblemLoader() {
  window.GameProblemLoader = {
    /**
     * Load problems for a level using the callback-based GameProblemLoader API.
     * Delegates to ProblemLoader internals (getProblemPath + loadProblems).
     * @param {Object} options
     * @param {string} options.level - Difficulty level
     * @param {Function} [options.onLoaded] - Called with parsed problems
     * @param {Function} [options.onError] - Called on load failure
     * @param {Function} [options.showSkeleton] - Called with {level, problemPath}
     */
    loadProblems({ level, onLoaded, onError, showSkeleton } = {}) {
      const problemPath = sharedProblemLoader.getProblemPath(level);

      showSkeleton?.({ level, problemPath });

      sharedProblemLoader
        .loadProblems(level)
        .then((problems) => {
          onLoaded?.(problems);
        })
        .catch((error) => {
          onError?.(error);
        });
    },
  };
}

// Expose shared loader globally for boot orchestration (bootstrap awaits its readyPromise)
window.problemLoader = sharedProblemLoader;

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = ProblemLoader;
} else {
  window.ProblemLoader = ProblemLoader;
  attachGameProblemLoader();
}

console.log("✅ Problem Loader Module Loaded");
