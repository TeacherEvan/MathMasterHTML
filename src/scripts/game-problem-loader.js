// src/scripts/game-problem-loader.js - Problem loading helpers
console.log("🎯 GameProblemLoader helpers loading...");

(function attachGameProblemLoader() {
  const problemPaths = {
    beginner: "/src/assets/problems/Assets/Beginner_Lvl/beginner_problems.md",
    warrior: "/src/assets/problems/Assets/Warrior_Lvl/warrior_problems.md",
    master: "/src/assets/problems/Assets/Master_Lvl/master_problems.md",
  };

  function parseProblemsFromMarkdown(markdownContent) {
    const parsedProblems = [];

    // Split by problem (starting with a number followed by dot and backtick)
    const problemRegex = /(\d+)\.\s+`([^`]+)`\s*\n((?:\s*-[^\n]+\n?)+)/g;
    let match;

    while ((match = problemRegex.exec(markdownContent)) !== null) {
      try {
        const _problemNumber = match[1];
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
  }

  function getProblemPath(level) {
    return problemPaths[level] || problemPaths.beginner;
  }

  window.GameProblemLoader = {
    loadProblems({ level, onLoaded, onError, showSkeleton }) {
      showSkeleton?.();

      const problemPath = getProblemPath(level);

      fetch(problemPath)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load problems: ${response.statusText}`);
          }
          return response.text();
        })
        .then((data) => {
          const problems = parseProblemsFromMarkdown(data);
          onLoaded?.(problems);
        })
        .catch((error) => {
          onError?.(error);
        });
    },
  };
})();
