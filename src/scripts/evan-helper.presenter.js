(function () {
  const shell = document.getElementById("evan-assist-shell");
  const hand = document.getElementById("evan-hand");
  const skipBtn = document.getElementById("evan-skip-button");
  const stopBtn = document.getElementById("evan-stop-button");
  const solveSlot = document.getElementById("evan-controls-slot");

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const handTransition = reducedMotion ? "none" : "transform 0.2s ease";

  if (hand) hand.style.transition = handTransition;

  function getActiveExitButton() {
    if (stopBtn && !stopBtn.hidden) return stopBtn;
    if (skipBtn && !skipBtn.hidden) return skipBtn;
    return null;
  }

  function hasVisibleExitControl() {
    return Boolean(getActiveExitButton());
  }

  function setInputLock(locked) {
    window.GameRuntimeCoordinator?.setInputLock?.("evan-auto", locked);
    document.body.classList.toggle("evan-input-locked", locked);
    if (locked) {
      getActiveExitButton()?.focus({ preventScroll: true });
    }
  }

  function isExitInteractionTarget(target) {
    return Boolean(
      target instanceof Element &&
        target.closest("#evan-skip-button, #evan-stop-button"),
    );
  }

  function isAllowedOverlayInteractionTarget(target) {
    return Boolean(
      target instanceof Element &&
        target.closest(".toast, .toast-container"),
    );
  }

  function isAllowedExitKey(event) {
    const exitButton = getActiveExitButton();
    if (!exitButton) return false;
    const isExitFocused =
      document.activeElement === exitButton || event.target === exitButton;
    if (!isExitFocused) return false;
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
    if (isExitInteractionTarget(event.target)) return;
    if (isAllowedOverlayInteractionTarget(event.target)) return;

    if (event.type === "keydown" && isAllowedExitKey(event)) {
      return;
    }

    const exitButton = getActiveExitButton();
    if (exitButton && document.activeElement !== exitButton) {
      exitButton.focus({ preventScroll: true });
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
    document.body.classList.remove("evan-stop-visible");
    setInputLock(false);
  }

  function showSkip() {
    if (skipBtn) {
      skipBtn.hidden = false;
    }
    setInputLock(true);
  }

  function hideSkip() {
    if (skipBtn) skipBtn.hidden = true;
    if (!hasVisibleExitControl()) setInputLock(false);
  }

  function showStop() {
    if (stopBtn) {
      stopBtn.hidden = false;
      document.body.classList.add("evan-stop-visible");
    }
    setInputLock(true);
  }

  function hideStop() {
    if (stopBtn) stopBtn.hidden = true;
    document.body.classList.remove("evan-stop-visible");
    if (!hasVisibleExitControl()) setInputLock(false);
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
      hideStop();
      showSkip();
    } else {
      hideSkip();
      showStop();
    }
    parkHand();
  });

  document.addEventListener(window.GameEvents?.EVAN_HELP_STOPPED, () => {
    hide();
    hideSkip();
    hideStop();
    parkHand();
  });

  window.EvanPresenter = {
    show,
    hide,
    showSkip,
    hideSkip,
    showStop,
    hideStop,
    showSolve,
    hideSolve,
    moveHandTo,
    parkHand,
  };
})();
