// src/scripts/game-problem-loader.js - Problem loading helpers
console.log("🎯 GameProblemLoader helpers loading...");

(function attachGameProblemLoader() {
  const problemPaths = {
    h2p: "/src/assets/problems/Assets/Tutorial_Lvl/h2p_problems.json",
    beginner: "/src/assets/problems/Assets/Beginner_Lvl/beginner_problems.json",
    warrior: "/src/assets/problems/Assets/Warrior_Lvl/warrior_problems.json",
    master: "/src/assets/problems/Assets/Master_Lvl/master_problems.json",
  };

  function normalizeProblems(payload) {
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
  }

  function getProblemPath(level) {
    return problemPaths[level] || problemPaths.beginner;
  }

  window.GameProblemLoader = {
    loadProblems({ level, onLoaded, onError, showSkeleton }) {
      const problemPath = getProblemPath(level);
      showSkeleton?.({ level, problemPath });

      fetch(problemPath)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load problems: ${response.statusText}`);
          }
          return response.json();
        })
        .then((data) => {
          const problems = normalizeProblems(data);
          onLoaded?.(problems);
        })
        .catch((error) => {
          onError?.(error);
        });
    },
  };
})();
