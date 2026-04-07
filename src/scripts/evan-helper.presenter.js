(function () {
  const shell = document.getElementById("evan-assist-shell");
  const hand = document.getElementById("evan-hand");
  const skipBtn = document.getElementById("evan-skip-button");
  const solveSlot = document.getElementById("evan-controls-slot");

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const handTransition = reducedMotion ? "none" : "transform 0.2s ease";

  if (hand) hand.style.transition = handTransition;

  function show() {
    if (!shell) return;
    shell.hidden = false;
    shell.setAttribute("aria-hidden", "false");
    document.body.classList.add("evan-help-active");
  }

  function hide() {
    if (!shell) return;
    shell.hidden = true;
    shell.setAttribute("aria-hidden", "true");
    document.body.classList.remove("evan-help-active");
  }

  function showSkip() {
    if (skipBtn) skipBtn.hidden = false;
  }

  function hideSkip() {
    if (skipBtn) skipBtn.hidden = true;
  }

  function showSolve() {
    if (solveSlot) solveSlot.hidden = false;
  }

  function hideSolve() {
    if (solveSlot) solveSlot.hidden = true;
  }

  function moveHandTo(x, y) {
    if (!hand) return;
    if (hand.style.transition !== handTransition) {
      hand.style.transition = handTransition;
    }
    hand.style.transform = "translate(" + x + "px, " + y + "px)";
  }

  function parkHand() {
    if (!hand) return;
    hand.style.transition = "none";
    hand.style.transform = "translate(-200px, -200px)";
  }

  document.addEventListener(window.GameEvents?.EVAN_HELP_STARTED, (e) => {
    const mode = e.detail?.mode;
    show();
    hideSolve();
    if (mode === "auto") {
      showSkip();
    } else {
      hideSkip();
    }
    parkHand();
  });

  document.addEventListener(window.GameEvents?.EVAN_HELP_STOPPED, () => {
    hide();
    hideSkip();
    parkHand();
  });

  window.EvanPresenter = {
    show,
    hide,
    showSkip,
    hideSkip,
    showSolve,
    hideSolve,
    moveHandTo,
    parkHand,
  };
})();
