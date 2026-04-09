(function () {
  const GE = window.GameEvents;
  const runtime = window.EvanControllerRuntime;
  if (!GE || !runtime) return;

  const {
    hasLiveRect,
    clearTimers,
    wait,
    waitForEvent,
    waitForGameReady,
    moveHandToTarget,
    collectNeededSymbols,
    findSymbolTarget,
    matchesPowerUpActivation,
  } = runtime;
  const DELAY_TARGET = 220;
  const DELAY_POST = 240;
  const DELAY_MUFFIN = 140;
  const DELAY_POWERUP_TIMEOUT = 500;
  const MAX_WORM_TAP_STREAK = 1;
  const pending = [];
  let active = false;
  let wormTapStreak = 0;

  const getLiveTarget = (target) => (hasLiveRect(target) ? target : null);
  const emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));

  async function clickSymbol(element, symbol) {
    const target = getLiveTarget(element);
    if (!target) return;

    moveHandToTarget(target);
    emit(GE.EVAN_ACTION_REQUESTED, { action: "symbolClick", symbol });
    await wait(pending, DELAY_TARGET);

    const liveSymbol = String(target.textContent || "").trim().toLowerCase();
    const expectedSymbol = String(symbol || "").trim().toLowerCase();
    if (!active || !getLiveTarget(target) || !liveSymbol) return;
    if (expectedSymbol && liveSymbol !== expectedSymbol) return;

    target.classList.add("clicked");
    emit(GE.SYMBOL_CLICKED, { symbol });
    emit(GE.EVAN_ACTION_COMPLETED, { action: "symbolClick", symbol });
    await wait(pending, DELAY_POST);
  }

  async function tapWormSegment(segment) {
    const target = getLiveTarget(segment);
    if (!target) return;

    const pos = moveHandToTarget(target);
    emit(GE.EVAN_ACTION_REQUESTED, { action: "wormTap", ...pos });
    await wait(pending, DELAY_TARGET);
    if (!active || !getLiveTarget(target)) return;

    emit(GE.WORM_CURSOR_TAP, pos);
    emit(GE.EVAN_ACTION_COMPLETED, { action: "wormTap", ...pos });
    wormTapStreak++;
    await wait(pending, DELAY_POST);
  }

  async function collectMuffin(muffin) {
    const target = getLiveTarget(muffin);
    if (!target) return;

    moveHandToTarget(target);
    emit(GE.EVAN_ACTION_REQUESTED, { action: "muffinCollect" });
    for (let attempts = 0; active && target.isConnected && !target.disabled && getLiveTarget(target) && attempts < 20; attempts++) {
      target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      await wait(pending, DELAY_MUFFIN);
    }

    emit(GE.EVAN_ACTION_COMPLETED, { action: "muffinCollect" });
    wormTapStreak = 0;
  }

  async function usePowerUp(type) {
    const targets = window.EvanTargets;
    const sys = window.wormSystem?.powerUpSystem;
    if (!sys?.selectPowerUp) return wait(pending, DELAY_POST).then(() => false);

    const target = getLiveTarget(targets.findGreenWormSegment?.());
    if (!target) {
      window.EvanPresenter?.parkHand?.();
      await wait(pending, DELAY_POST);
      return false;
    }

    const pos = moveHandToTarget(target);
    emit(GE.EVAN_ACTION_REQUESTED, { action: "powerUp", type });
    sys.selectPowerUp(type);
    await wait(pending, DELAY_TARGET);
    if (!active || !sys.isPlacementMode) {
      sys.deselectPowerUp?.();
      await wait(pending, DELAY_POST);
      return false;
    }

    const ok = await waitForEvent(
      pending,
      "powerUpActivated",
      DELAY_POWERUP_TIMEOUT,
      (event) => matchesPowerUpActivation(event, sys, type),
      () => document.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        clientX: pos.x,
        clientY: pos.y,
      })),
    );

    if (!ok) sys.deselectPowerUp?.();
    emit(GE.EVAN_ACTION_COMPLETED, { action: "powerUp", type });
    wormTapStreak = 0;
    await wait(pending, DELAY_POST);
    return ok;
  }

  async function runLoop() {
    const targets = window.EvanTargets;
    while (active) {
      const seg = getLiveTarget(targets.findGreenWormSegment?.());
      const puType = targets.getBestPowerUp(seg);
      const { neededSymbol, neededSymbols } = collectNeededSymbols(targets);
      const symbolTarget = findSymbolTarget(targets, neededSymbols, getLiveTarget);

      if (puType) {
        await usePowerUp(puType);
      } else if (seg && (wormTapStreak < MAX_WORM_TAP_STREAK || !symbolTarget)) {
        await tapWormSegment(seg);
      } else {
        const muffin = getLiveTarget(targets.findMuffinReward?.());
        if (muffin) {
          await collectMuffin(muffin);
        } else if (symbolTarget) {
          wormTapStreak = 0;
          await clickSymbol(symbolTarget, neededSymbol || neededSymbols[0] || symbolTarget.textContent.trim());
        } else {
          if (!neededSymbols.length) wormTapStreak = 0;
          window.EvanPresenter?.parkHand?.();
          await wait(pending, DELAY_POST);
        }
      }

      if (!active) break;
    }
  }

  async function start() {
    if (active) return;
    active = true;
    await waitForGameReady(pending);
    if (active) queueMicrotask(() => { if (active) void runLoop(); });
  }

  function stop() {
    active = false;
    wormTapStreak = 0;
    clearTimers(pending);
    window.EvanPresenter?.parkHand?.();
  }

  [[GE.EVAN_HELP_STARTED, start], [GE.EVAN_HELP_STOPPED, stop], [GE.PROBLEM_COMPLETED, stop]].forEach(([name, handler]) => {
    document.addEventListener(name, handler);
  });
  window.EvanController = { start, stop };
})();
