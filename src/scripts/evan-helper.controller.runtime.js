(function () {
  function trackPending(pending, cancel) {
    pending.push(cancel);
    return () => {
      const index = pending.indexOf(cancel);
      if (index >= 0) pending.splice(index, 1);
    };
  }

  function hasLiveRect(el) {
    return Boolean(window.EvanTargets?.isVisible?.(el));
  }

  function clearTimers(pending) {
    pending.splice(0).forEach((entry) => {
      if (typeof entry === "function") entry();
      else clearTimeout(entry);
    });
  }

  function wait(pending, ms) {
    return new Promise((resolve) => {
      let done = false;
      const id = setTimeout(() => {
        if (done) return;
        done = true;
        release();
        resolve(true);
      }, ms);
      const cancel = () => {
        if (done) return;
        done = true;
        clearTimeout(id);
        resolve(false);
      };
      const release = trackPending(pending, cancel);
    });
  }

  function waitForEvent(pending, name, timeout, matcher, action) {
    return new Promise((resolve) => {
      let done = false;
      let timeoutId = null;
      let release = () => {};
      let handler = () => {};
      const cancel = () => {
        if (done) return;
        done = true;
        clearTimeout(timeoutId);
        document.removeEventListener(name, handler);
        release();
        resolve(false);
      };
      release = trackPending(pending, cancel);
      handler = (event) => {
        if (done || (matcher && !matcher(event))) return;
        done = true;
        clearTimeout(timeoutId);
        document.removeEventListener(name, handler);
        release();
        resolve(true);
      };
      document.addEventListener(name, handler);
      if (action) action();
      timeoutId = setTimeout(() => {
        if (done) return;
        done = true;
        document.removeEventListener(name, handler);
        release();
        resolve(false);
      }, timeout);
    });
  }

  function waitForGameReady(pending) {
    return new Promise((resolve) => {
      const check = () => {
        if (window.GameSymbolHandlerCore && window.EvanTargets) {
          resolve();
          return;
        }
        pending.push(setTimeout(check, 200));
      };
      check();
    });
  }

  function rectsIntersect(a, b) {
    return (
      a.left <= b.right &&
      a.right >= b.left &&
      a.top <= b.bottom &&
      a.bottom >= b.top
    );
  }

  function getGameplayPanelBounds(point, target = null) {
    const panels = [
      document.getElementById("panel-a"),
      document.getElementById("panel-b"),
      document.getElementById("panel-c"),
    ].filter(Boolean);

    const targetRect = target?.getBoundingClientRect?.() || null;

    if (targetRect) {
      const containingPanel = target.closest?.("#panel-a, #panel-b, #panel-c");
      const containingRect = containingPanel?.getBoundingClientRect?.();
      if (containingRect) {
        return containingRect;
      }

      for (const panel of panels) {
        const rect = panel.getBoundingClientRect?.();
        if (rect && rectsIntersect(targetRect, rect)) {
          return rect;
        }
      }
    }

    for (const panel of panels) {
      const rect = panel.getBoundingClientRect?.();
      if (
        rect &&
        point.x >= rect.left &&
        point.x <= rect.right &&
        point.y >= rect.top &&
        point.y <= rect.bottom
      ) {
        return rect;
      }
    }

    return null;
  }

  function clampPointToBounds(point, bounds) {
    if (!bounds) {
      return point;
    }

    const inset = 8;
    const minX = bounds.left + inset;
    const maxX = bounds.right - inset;
    const minY = bounds.top + inset;
    const maxY = bounds.bottom - inset;

    return {
      x: Math.min(Math.max(point.x, minX), maxX),
      y: Math.min(Math.max(point.y, minY), maxY),
    };
  }

  function moveHandToTarget(target) {
    const pos = window.EvanTargets?.centerOf?.(target) || { x: 0, y: 0 };
    const bounds = getGameplayPanelBounds(pos, target);
    const safePos = clampPointToBounds(pos, bounds);
    window.EvanPresenter?.moveHandTo?.(safePos.x, safePos.y, bounds);
    return safePos;
  }

  function collectNeededSymbols(targets) {
    const neededSymbols = [];
    const neededSymbol = targets.getNeededSymbol?.();
    if (neededSymbol) neededSymbols.push(neededSymbol);
    for (const symbol of targets.getNeededSymbols?.() || []) {
      if (symbol && !neededSymbols.includes(symbol)) neededSymbols.push(symbol);
    }
    return { neededSymbol, neededSymbols };
  }

  function findSymbolTarget(targets, neededSymbols, getLiveTarget) {
    return getLiveTarget(
      targets.findBestFallingSymbol?.(neededSymbols) ||
        (neededSymbols[0] ? targets.findFallingSymbol?.(neededSymbols[0]) : null),
    );
  }

  function matchesPowerUpActivation(event, system, type) {
    const detail = event?.detail;
    if (!detail) return true;
    if (detail.system && detail.system !== system) return false;
    if (detail.type && detail.type !== type) return false;
    return true;
  }

  window.EvanControllerRuntime = {
    hasLiveRect,
    clearTimers,
    wait,
    waitForEvent,
    waitForGameReady,
    moveHandToTarget,
    collectNeededSymbols,
    findSymbolTarget,
    matchesPowerUpActivation,
  };
})();
