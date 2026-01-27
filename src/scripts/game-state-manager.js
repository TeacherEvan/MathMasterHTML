// js/game-state-manager.js - Game state, scoring, and timers
console.log("📊 Game state manager module loading...");

(function() {
  if (!window.GameInit) {
    console.error("❌ GameInit not loaded");
    return;
  }

  const { clarifyButton, level } = window.GameInit;

  if (clarifyButton) {
    clarifyButton.addEventListener("click", () => {
      const question = window.prompt(
        "What is unclear or ambiguous? Ask a clarification question:",
        "",
      );

      if (!question || question.trim().length === 0) return;

      const problemText =
        window.GameProblemManager?.currentProblem?.problem ||
        "(no problem loaded)";
      const stepText =
        window.GameProblemManager?.currentProblem?.steps?.[
          window.GameProblemManager.currentSolutionStepIndex
        ] || "(no step loaded)";

      const responseLines = [
        "Clarification checklist (investigation):",
        "1) Define the goal: what must be solved for?",
        "2) Define variables/meaning (e.g., what does x represent?).",
        "3) State constraints: integers/reals? domain restrictions?",
        "4) Confirm operations: × vs x, ÷ vs /, and order of operations.",
        "5) Identify ambiguity: missing parentheses? implied multiplication?",
        "",
        `Your question: ${question.trim()}`,
        "",
        `Current problem: ${problemText}`,
        `Current step (window B): ${stepText}`,
      ];

      window.alert(responseLines.join("\n"));
    });
  }

  // Export state manager functions
  window.GameStateManager = {
    level,
  };

  console.log("✅ Game state manager loaded");
})();
