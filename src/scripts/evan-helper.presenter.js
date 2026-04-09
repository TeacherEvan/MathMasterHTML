(function () {
  const shell = document.getElementById("evan-assist-shell");
  const hand = document.getElementById("evan-hand");
  const status = document.getElementById("evan-assist-status");
  const skipBtn = document.getElementById("evan-skip-button");
  const stopBtn = document.getElementById("evan-stop-button");
  const solveSlot = document.getElementById("evan-controls-slot");
  const panelC = document.getElementById("panel-c");

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const handTransition = reducedMotion
    ? "none"
    : "transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)";

  function getActiveExitButton() {
    if (stopBtn && !stopBtn.hidden) return stopBtn;
    if (skipBtn && !skipBtn.hidden) return skipBtn;
    return null;
  }

  function hasVisibleExitControl() {
    return Boolean(getActiveExitButton());
  }

  function updatePanelCLockedState(locked) {
    if (!panelC) return;

    const nextLocked = Boolean(locked);
    panelC.setAttribute("aria-disabled", String(nextLocked));

    if (nextLocked && status && !status.hidden) {
      panelC.setAttribute("aria-describedby", "evan-assist-status");
      return;
    }

    panelC.removeAttribute("aria-describedby");
  }

  function setAssistStatus(message) {
    if (!status) return;

    const nextMessage = typeof message === "string" ? message.trim() : "";
    status.hidden = nextMessage.length === 0;
    status.textContent = nextMessage;
    updatePanelCLockedState(
      window.GameRuntimeCoordinator?.getState?.().inputLocked ??
        document.body.classList.contains("evan-input-locked"),
    );
  }

  function setInputLock(locked) {
    window.GameRuntimeCoordinator?.setInputLock?.("evan-auto", locked);
    document.body.classList.toggle("evan-input-locked", locked);
    updatePanelCLockedState(locked);
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

    if (event.type === "keydown") {
      if (isAllowedExitKey(event)) {
        return;
      }
    } else if (isExitInteractionTarget(event.target)) {
      return;
    }

    if (isAllowedOverlayInteractionTarget(event.target)) return;

    const exitButton = getActiveExitButton();
    if (exitButton && document.activeElement !== exitButton) {
      exitButton.focus({ preventScroll: true });
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  if (hand) hand.style.transition = handTransition;
  updatePanelCLockedState(false);

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
    setAssistStatus("");
    setInputLock(false);
  }

  function showSkip() {
    if (skipBtn) {
      skipBtn.hidden = false;
    }
    setAssistStatus("Evan demo in progress. Skip to take over.");
    setInputLock(true);
  }

  function hideSkip() {
    if (skipBtn) skipBtn.hidden = true;
    if (!stopBtn || stopBtn.hidden) {
      setAssistStatus("");
    }
    if (!hasVisibleExitControl()) setInputLock(false);
  }

  function showStop() {
    if (stopBtn) {
      stopBtn.hidden = false;
      document.body.classList.add("evan-stop-visible");
    }
    setAssistStatus("Evan is solving. Press Stop to take over.");
    setInputLock(true);
  }

  function hideStop() {
    if (stopBtn) stopBtn.hidden = true;
    document.body.classList.remove("evan-stop-visible");
    if (!skipBtn || skipBtn.hidden) {
      setAssistStatus("");
    }
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
