(function () {
  const GE = window.GameEvents;
  const runtime = window.EvanControllerRuntime;
  if (!GE || !runtime) return;
  const { hasLiveRect, clearTimers, wait, waitForEvent, waitForGameReady } =
    runtime;

  const DELAY_TARGET = 150,
    DELAY_POST = 180,
    DELAY_MUFFIN = 100;
  const DELAY_POWERUP_TIMEOUT = 500,
    MAX_WORM_TAP_STREAK = 1;
  let active = false;
  const pending = [];
  let wormTapStreak = 0;

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  async function clickSymbol(el, symbol) {
    const T = window.EvanTargets;
    if (!hasLiveRect(el)) return;
    const pos = T.centerOf(el);
    window.EvanPresenter?.moveHandTo?.(pos.x, pos.y);
    emit(GE.EVAN_ACTION_REQUESTED, { action: "symbolClick", symbol });
    await wait(pending, DELAY_TARGET);
    const liveSymbol = String(el.textContent || "")
      .trim()
      .toLowerCase();
    const expectedSymbol = String(symbol || "")
      .trim()
      .toLowerCase();
    if (
      !active ||
      !hasLiveRect(el) ||
      !liveSymbol ||
      liveSymbol !== expectedSymbol
    )
      return;
    el.classList.add("clicked");
    emit(GE.SYMBOL_CLICKED, { symbol });
    emit(GE.EVAN_ACTION_COMPLETED, { action: "symbolClick", symbol });
    await wait(pending, DELAY_POST);
  }

  async function tapWormSegment(seg) {
    const T = window.EvanTargets;
    if (!hasLiveRect(seg)) return;
    const pos = T.centerOf(seg);
    window.EvanPresenter?.moveHandTo?.(pos.x, pos.y);
    emit(GE.EVAN_ACTION_REQUESTED, { action: "wormTap", ...pos });
    await wait(pending, DELAY_TARGET);
    if (!active || !hasLiveRect(seg)) return;
    emit(GE.WORM_CURSOR_TAP, pos);
    emit(GE.EVAN_ACTION_COMPLETED, { action: "wormTap", ...pos });
    wormTapStreak++;
    await wait(pending, DELAY_POST);
  }

  async function collectMuffin(muffin) {
    const T = window.EvanTargets;
    if (!hasLiveRect(muffin)) return;
    const pos = T.centerOf(muffin);
    window.EvanPresenter?.moveHandTo?.(pos.x, pos.y);
    emit(GE.EVAN_ACTION_REQUESTED, { action: "muffinCollect" });
    let attempts = 0;
    while (
      active &&
      muffin.isConnected &&
      !muffin.disabled &&
      hasLiveRect(muffin) &&
      attempts < 20
    ) {
      muffin.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, cancelable: true }),
      );
      attempts++;
      await wait(pending, DELAY_MUFFIN);
    }
    emit(GE.EVAN_ACTION_COMPLETED, { action: "muffinCollect" });
    wormTapStreak = 0;
  }

  async function usePowerUp(type) {
    const T = window.EvanTargets;
    const sys = window.wormSystem?.powerUpSystem;
    if (!sys) return;
    const target = T.findGreenWormSegment();
    if (!hasLiveRect(target)) return;
    const pos = T.centerOf(target);
    window.EvanPresenter?.moveHandTo?.(pos.x, pos.y);
    emit(GE.EVAN_ACTION_REQUESTED, { action: "powerUp", type });
    sys.selectPowerUp(type);
    await wait(pending, DELAY_TARGET);
    if (!active || !sys.isPlacementMode) {
      sys.deselectPowerUp?.();
      return;
    }
    const ok = await waitForEvent(
      pending,
      "powerUpActivated",
      DELAY_POWERUP_TIMEOUT,
      (event) => {
        const detail = event?.detail;
        if (!detail) return true;
        if (detail.system && detail.system !== sys) return false;
        if (detail.type && detail.type !== type) return false;
        return true;
      },
      () =>
        document.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            cancelable: true,
            clientX: pos.x,
            clientY: pos.y,
          }),
        ),
    );
    if (!ok) sys.deselectPowerUp?.();
    emit(GE.EVAN_ACTION_COMPLETED, { action: "powerUp", type });
    wormTapStreak = 0;
    await wait(pending, DELAY_POST);
  }

  async function runLoop() {
    const T = window.EvanTargets;
    while (active) {
      const seg = T.findGreenWormSegment();
      const puType = T.getBestPowerUp(seg);
      const neededSymbols = [];
      const neededSymbol = T.getNeededSymbol?.();
      if (neededSymbol) neededSymbols.push(neededSymbol);
      for (const symbol of T.getNeededSymbols?.() || []) {
        if (symbol && !neededSymbols.includes(symbol)) {
          neededSymbols.push(symbol);
        }
      }
      const symbolTarget =
        T.findBestFallingSymbol?.(neededSymbols) ||
        (neededSymbols[0] ? T.findFallingSymbol?.(neededSymbols[0]) : null);

      if (puType) {
        await usePowerUp(puType);
        continue;
      }
      if (!active) break;

      if (seg && (wormTapStreak < MAX_WORM_TAP_STREAK || !symbolTarget)) {
        await tapWormSegment(seg);
        continue;
      }
      if (!active) break;

      const muffin = T.findMuffinReward();
      if (muffin) {
        await collectMuffin(muffin);
        continue;
      }
      if (!active) break;

      if (symbolTarget) {
        wormTapStreak = 0;
        await clickSymbol(symbolTarget, symbolTarget.textContent.trim());
      } else {
        if (!neededSymbols.length) {
          wormTapStreak = 0;
        }
        window.EvanPresenter?.parkHand?.();
        await wait(pending, DELAY_POST);
      }
    }
  }

  async function start() {
    if (active) return;
    active = true;
    await waitForGameReady(pending);
    if (!active) return;
    runLoop();
  }

  function stop() {
    active = false;
    clearTimers(pending);
    wormTapStreak = 0;
    window.EvanPresenter?.parkHand?.();
  }

  document.addEventListener(GE.EVAN_HELP_STARTED, start);
  document.addEventListener(GE.EVAN_HELP_STOPPED, stop);
  document.addEventListener(GE.PROBLEM_COMPLETED, stop);
  window.EvanController = { start, stop };
})();
