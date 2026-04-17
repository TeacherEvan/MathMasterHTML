(function () {
  const SymbolRainHelpers = window.SymbolRainHelpers;

  function bindInteractions(symbolRainContainer, state) {
    if (!SymbolRainHelpers || !symbolRainContainer) {
      return;
    }

    const panel = document.getElementById("panel-c");
    const keyboardStatus = document.getElementById("panel-c-keyboard-status");
    const recentSymbolActivations = new WeakMap();
    let activeKeyboardTarget = null;
    let keyboardSyncFrameId = null;
    const POINTER_REACTIVATION_WINDOW_MS = 400;

    const normalizeSymbol = (value) =>
      String(value || "")
        .trim()
        .toLowerCase();

    const updateKeyboardStatus = (message) => {
      if (keyboardStatus) {
        keyboardStatus.textContent = message;
      }
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
    };

    const getCurrentNeededSymbols = () => {
      const stepIndex = window.GameSymbolHandlerCore?.getCurrentStepIndex?.();
      const selector =
        Number.isInteger(stepIndex) && stepIndex >= 0
          ? `#solution-container [data-step-index="${stepIndex}"].hidden-symbol`
          : "#solution-container .hidden-symbol";

      return Array.from(document.querySelectorAll(selector))
        .map((element) => element.dataset.expected || element.textContent || "")
        .map((value) => String(value).trim())
        .filter(Boolean);
    };

    const getVisibleKeyboardCandidates = () => {
      const neededSymbols = new Set(
        getCurrentNeededSymbols().map((value) => normalizeSymbol(value)),
      );
      const containerRect =
        symbolRainContainer?.getBoundingClientRect?.() ||
        panel?.getBoundingClientRect?.() ||
        null;

      if (!containerRect) {
        return [];
      }

      return Array.from(
        symbolRainContainer.querySelectorAll(".falling-symbol:not(.clicked)"),
      )
        .filter((element) => element?.isConnected)
        .map((element) => ({
          element,
          rect: element.getBoundingClientRect(),
        }))
        .filter(({ rect, element }) => {
          if (rect.width <= 0 || rect.height <= 0) {
            return false;
          }

          const intersectsContainer =
            rect.bottom > containerRect.top &&
            rect.top < containerRect.bottom &&
            rect.right > containerRect.left &&
            rect.left < containerRect.right;

          if (!intersectsContainer) {
            return false;
          }

          return neededSymbols.has(normalizeSymbol(element.textContent));
        })
        .sort((left, right) => right.rect.bottom - left.rect.bottom);
    };

    const setKeyboardTarget = (target) => {
      clearKeyboardTarget();
      if (!target?.element) {
        return null;
      }

      activeKeyboardTarget = target.element;
      activeKeyboardTarget.classList.add("keyboard-target");
      updateKeyboardStatus(`Panel C target ${target.element.textContent}.`);
      return target;
    };

    const syncKeyboardTarget = () => {
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

    const scheduleKeyboardSync = () => {
      if (!panel || keyboardSyncFrameId !== null) {
        return;
      }

      const loop = () => {
        keyboardSyncFrameId = null;

        if (!panel.matches(":focus")) {
          return;
        }

        syncKeyboardTarget();
        keyboardSyncFrameId = requestAnimationFrame(loop);
      };

      keyboardSyncFrameId = requestAnimationFrame(loop);
    };

    const cycleKeyboardTarget = (direction = 1) => {
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

      window.setTimeout(() => {
        if (panel?.matches(":focus")) {
          cycleKeyboardTarget(1);
        } else {
          clearKeyboardTarget();
        }
      }, 520);
    };

    const handleSymbolCollection = (fallingSymbolElement) => {
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
        fallingSymbolElement.classList.contains("clicked")
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

    symbolRainContainer.addEventListener(
      "pointerdown",
      (event) => {
        if (event.isPrimary === false) {
          return;
        }

        const fallingSymbolElement = event.target.closest(".falling-symbol");
        if (
          fallingSymbolElement &&
          symbolRainContainer.contains(fallingSymbolElement)
        ) {
          event.preventDefault();
          handleSymbolCollection(fallingSymbolElement);
        }
      },
      { passive: false },
    );

    if (!window.PointerEvent) {
      symbolRainContainer.addEventListener("click", (event) => {
        const fallingSymbolElement = event.target.closest(".falling-symbol");
        if (
          fallingSymbolElement &&
          symbolRainContainer.contains(fallingSymbolElement)
        ) {
          handleSymbolCollection(fallingSymbolElement);
        }
      });
    }

    if (panel) {
      panel.addEventListener("focus", () => {
        if (!cycleKeyboardTarget(1)) {
          updateKeyboardStatus(
            "Panel C focused. Wait for a matching symbol, then press Enter or Space.",
          );
        }

        scheduleKeyboardSync();
      });

      panel.addEventListener("blur", () => {
        cancelKeyboardSync();
        clearKeyboardTarget();
      });

      panel.addEventListener("keydown", (event) => {
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
      });
    }
  }

  window.SymbolRainInteractions = { bindInteractions };
})();
