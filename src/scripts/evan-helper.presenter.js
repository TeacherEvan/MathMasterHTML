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

  function setInputLock(locked) {
    window.GameRuntimeCoordinator?.setInputLock?.("evan-auto", locked);
    document.body.classList.toggle("evan-input-locked", locked);
    if (locked && skipBtn && !skipBtn.hidden) {
      skipBtn.focus({ preventScroll: true });
    }
  }

  function isSkipInteractionTarget(target) {
    return Boolean(
      skipBtn &&
        !skipBtn.hidden &&
        target instanceof Element &&
        target.closest("#evan-skip-button"),
    );
  }

  function isAllowedOverlayInteractionTarget(target) {
    return Boolean(
      target instanceof Element &&
        target.closest(".toast, .toast-container"),
    );
  }

  function isAllowedSkipKey(event) {
    if (!skipBtn || skipBtn.hidden) return false;
    const isSkipFocused =
      document.activeElement === skipBtn || event.target === skipBtn;
    if (!isSkipFocused) return false;
    return (
      event.key === "Enter" || event.key === " " || event.key === "Spacebar"
    );
  }

  function guardLockedUserInput(event) {
    const isLocked =
      window.GameRuntimeCoordinator?.getState?.().inputLocked ??
      document.body.classList.contains("evan-input-locked");
    if (!isLocked) return;
    if (event.type !== "keydown" && !event.isTrusted) return;
    if (isSkipInteractionTarget(event.target)) return;
    if (isAllowedOverlayInteractionTarget(event.target)) return;

    if (event.type === "keydown" && isAllowedSkipKey(event)) {
      return;
    }

    if (skipBtn && !skipBtn.hidden && document.activeElement !== skipBtn) {
      skipBtn.focus({ preventScroll: true });
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  window.addEventListener("pointerdown", guardLockedUserInput, true);
  window.addEventListener("click", guardLockedUserInput, true);
  window.addEventListener("keydown", guardLockedUserInput, true);
  document.addEventListener("pointerdown", guardLockedUserInput, true);
  document.addEventListener("click", guardLockedUserInput, true);
  document.addEventListener("keydown", guardLockedUserInput, true);

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
    setInputLock(false);
  }

  function showSkip() {
    if (skipBtn) {
      skipBtn.hidden = false;
      setInputLock(true);
    }
  }

  function hideSkip() {
    if (skipBtn) skipBtn.hidden = true;
    setInputLock(false);
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
