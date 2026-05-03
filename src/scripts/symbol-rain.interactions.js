(function () {
  const SymbolRainHelpers = window.SymbolRainHelpers;
  const SymbolRainTargets = window.SymbolRainTargets;

  function createNoopInteractionController() {
    return {
      dispose() {},
      syncKeyboardTarget() {
        return false;
      },
      clearKeyboardTarget() {},
      cancelKeyboardSync() {},
    };
  }

  function bindInteractions(symbolRainContainer, state) {
    if (!SymbolRainHelpers || !SymbolRainTargets || !symbolRainContainer) {
      return createNoopInteractionController();
    }

    const panel = document.getElementById("panel-c");
    const keyboardStatus = document.getElementById("panel-c-keyboard-status");
    const recentSymbolActivations = new WeakMap();
    let activeKeyboardTarget = null;
    let keyboardSyncFrameId = null;
    let keyboardRetargetTimeoutId = null;
    let disposed = false;
    const POINTER_REACTIVATION_WINDOW_MS = 400;
    const pointerListenerOptions = { passive: false };

    const updateKeyboardStatus = (message) => {
      if (keyboardStatus) {
        keyboardStatus.textContent = message;
      }
    };

    const clearKeyboardStatus = () => {
      updateKeyboardStatus("");
    };

    const clearKeyboardTarget = () => {
      if (activeKeyboardTarget?.isConnected) {
        activeKeyboardTarget.classList.remove("keyboard-target");
      }
      activeKeyboardTarget = null;
    };

    const cancelKeyboardSync = () => {
      if (keyboardSyncFrameId !== null) {
        cancelAnimationFrame(keyboardSyncFrameId);
        keyboardSyncFrameId = null;
      }

      if (keyboardRetargetTimeoutId !== null) {
        clearTimeout(keyboardRetargetTimeoutId);
        keyboardRetargetTimeoutId = null;
      }
    };

    const getVisibleKeyboardCandidates = () => {
      return SymbolRainTargets.rankKeyboardCandidates(
        SymbolRainTargets.getVisibleMatchingCandidates({
          symbolRainContainer,
          state,
        }),
      );
    };

    const setKeyboardTarget = (target) => {
      if (disposed) {
        return null;
      }

      clearKeyboardTarget();
      if (!target?.element) {
        return null;
      }

      activeKeyboardTarget = target.element;
      activeKeyboardTarget.classList.add("keyboard-target");
      updateKeyboardStatus(`Panel C target ${target.element.textContent}.`);
      return target;
    };

    const syncKeyboardTargetCandidate = () => {
      if (disposed) {
        return null;
      }

      const candidates = getVisibleKeyboardCandidates();

      if (!candidates.length) {
        if (activeKeyboardTarget) {
          clearKeyboardTarget();
          updateKeyboardStatus(
            "Panel C focused. Wait for a matching symbol, then press Enter or Space.",
          );
        }
        return null;
      }

      const activeCandidate = candidates.find(
        ({ element }) => element === activeKeyboardTarget,
      );

      if (activeCandidate) {
        return activeCandidate;
      }

      return setKeyboardTarget(candidates[0]);
    };

    const syncKeyboardTarget = () => Boolean(syncKeyboardTargetCandidate());

    const scheduleKeyboardSync = () => {
      if (disposed || !panel || keyboardSyncFrameId !== null) {
        return;
      }

      const loop = () => {
        keyboardSyncFrameId = null;

        if (disposed || !panel.matches(":focus")) {
          return;
        }

        syncKeyboardTargetCandidate();
        keyboardSyncFrameId = requestAnimationFrame(loop);
      };

      keyboardSyncFrameId = requestAnimationFrame(loop);
    };

    const cycleKeyboardTarget = (direction = 1) => {
      if (disposed) {
        return null;
      }

      const candidates = getVisibleKeyboardCandidates();
      if (!candidates.length) {
        clearKeyboardTarget();
        updateKeyboardStatus("No matching Panel C symbol is available yet.");
        return null;
      }

      const currentIndex = candidates.findIndex(
        ({ element }) => element === activeKeyboardTarget,
      );
      const nextIndex =
        currentIndex === -1
          ? 0
          : (currentIndex + direction + candidates.length) % candidates.length;

      return setKeyboardTarget(candidates[nextIndex]);
    };

    const triggerKeyboardTarget = () => {
      if (disposed) {
        return;
      }

      const target =
        getVisibleKeyboardCandidates().find(
          ({ element }) => element === activeKeyboardTarget,
        ) || cycleKeyboardTarget(1);

      if (!target?.element) {
        updateKeyboardStatus("No matching Panel C symbol is available yet.");
        return;
      }

      SymbolRainHelpers.handleSymbolClick(
        {
          activeFallingSymbols: state.activeFallingSymbols,
          symbolPool: state.symbolPool,
          activeFaceReveals: state.activeFaceReveals,
          spatialGrid: state.spatialGrid,
        },
        target.element,
        { target: target.element },
      );
      updateKeyboardStatus(`Collected ${target.element.textContent}.`);

      if (keyboardRetargetTimeoutId !== null) {
        clearTimeout(keyboardRetargetTimeoutId);
      }

      keyboardRetargetTimeoutId = window.setTimeout(() => {
        keyboardRetargetTimeoutId = null;

        if (disposed) {
          return;
        }

        if (panel?.matches(":focus")) {
          cycleKeyboardTarget(1);
        } else {
          clearKeyboardTarget();
        }
      }, 520);
    };

    const handleSymbolCollection = (fallingSymbolElement) => {
      if (disposed) {
        return;
      }

      const lastActivation = recentSymbolActivations.get(fallingSymbolElement);
      if (
        typeof lastActivation === "number" &&
        performance.now() - lastActivation < POINTER_REACTIVATION_WINDOW_MS
      ) {
        return;
      }

      recentSymbolActivations.set(fallingSymbolElement, performance.now());
      if (
        !fallingSymbolElement.isConnected ||
        fallingSymbolElement.classList.contains("clicked") ||
        fallingSymbolElement.dataset?.symbolState !== "visible"
      ) {
        return;
      }

      SymbolRainHelpers.handleSymbolClick(
        {
          activeFallingSymbols: state.activeFallingSymbols,
          symbolPool: state.symbolPool,
          activeFaceReveals: state.activeFaceReveals,
          spatialGrid: state.spatialGrid,
        },
        fallingSymbolElement,
        { target: fallingSymbolElement },
      );
    };

    const resolvePointerSymbolElement = (event) => {
      const directTarget = event.target.closest(
        ".falling-symbol[data-symbol-state='visible']",
      );

      const isTouchLikeInteraction =
        event.pointerType === "touch" ||
        window.matchMedia?.("(pointer: coarse)")?.matches === true;

      if (!isTouchLikeInteraction) {
        return directTarget;
      }

      const hasPointerCoordinates =
        typeof event.clientX === "number" && typeof event.clientY === "number";

      if (!hasPointerCoordinates) {
        return directTarget;
      }

      const candidates = SymbolRainTargets.getVisibleCandidates({
        symbolRainContainer,
        state,
      });

      let bestCandidate = null;
      let bestDistanceSquared = Number.POSITIVE_INFINITY;

      for (const candidate of candidates) {
        const { rect } = candidate;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distanceX = centerX - event.clientX;
        const distanceY = centerY - event.clientY;
        const distanceSquared = distanceX * distanceX + distanceY * distanceY;
        const touchRadius = Math.max(
          26,
          Math.min(rect.width, rect.height) * 0.52,
        );

        if (distanceSquared > touchRadius * touchRadius) {
          continue;
        }

        if (distanceSquared < bestDistanceSquared) {
          bestDistanceSquared = distanceSquared;
          bestCandidate = candidate;
        }
      }

      return bestCandidate?.element || directTarget;
    };

    const handlePointerDown = (event) => {
      if (event.isPrimary === false) {
        return;
      }

      const fallingSymbolElement = resolvePointerSymbolElement(event);
      if (
        fallingSymbolElement &&
        symbolRainContainer.contains(fallingSymbolElement)
      ) {
        event.preventDefault();
        handleSymbolCollection(fallingSymbolElement);
      }
    };

    symbolRainContainer.addEventListener(
      "pointerdown",
      handlePointerDown,
      pointerListenerOptions,
    );

    let handleFallbackClick = null;

    if (!window.PointerEvent) {
      handleFallbackClick = (event) => {
        const fallingSymbolElement = event.target.closest(
          ".falling-symbol[data-symbol-state='visible']",
        );
        if (
          fallingSymbolElement &&
          symbolRainContainer.contains(fallingSymbolElement)
        ) {
          handleSymbolCollection(fallingSymbolElement);
        }
      };

      symbolRainContainer.addEventListener("click", handleFallbackClick);
    }

    const handlePanelFocus = () => {
      if (!cycleKeyboardTarget(1)) {
        updateKeyboardStatus(
          "Panel C focused. Wait for a matching symbol, then press Enter or Space.",
        );
      }

      scheduleKeyboardSync();
    };

    const handlePanelBlur = () => {
      cancelKeyboardSync();
      clearKeyboardTarget();
    };

    const handlePanelKeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        triggerKeyboardTarget();
        return;
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        cycleKeyboardTarget(1);
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        cycleKeyboardTarget(-1);
      }
    };

    if (panel) {
      panel.addEventListener("focus", handlePanelFocus);
      panel.addEventListener("blur", handlePanelBlur);
      panel.addEventListener("keydown", handlePanelKeydown);
    }

    return {
      dispose() {
        if (disposed) {
          return;
        }

        disposed = true;
        cancelKeyboardSync();
        clearKeyboardTarget();
        clearKeyboardStatus();
        symbolRainContainer.removeEventListener(
          "pointerdown",
          handlePointerDown,
          pointerListenerOptions,
        );

        if (handleFallbackClick) {
          symbolRainContainer.removeEventListener("click", handleFallbackClick);
        }

        if (panel) {
          panel.removeEventListener("focus", handlePanelFocus);
          panel.removeEventListener("blur", handlePanelBlur);
          panel.removeEventListener("keydown", handlePanelKeydown);
        }
      },
      syncKeyboardTarget,
      clearKeyboardTarget,
      cancelKeyboardSync,
    };
  }

  window.SymbolRainInteractions = { bindInteractions };
})();
