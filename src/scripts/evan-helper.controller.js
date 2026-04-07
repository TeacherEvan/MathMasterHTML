(function () {
  const GE = window.GameEvents;
  if (!GE) return;

  const DELAY_TARGET = 150,
    DELAY_POST = 180,
    DELAY_MUFFIN = 100;
  const DELAY_POWERUP_TIMEOUT = 500,
    MAX_WORM_TAP_STREAK = 3,
    SYMBOL_STALL_SPAWN_MS = 4000;

  function hasLiveRect(el) {
    return Boolean(window.EvanTargets?.isVisible?.(el));
  }

  let active = false,
    pending = [],
    wormTapStreak = 0,
    missingSymbolSince = 0;

  function clearPending() {
    pending.forEach((id) => clearTimeout(id));
    pending = [];
  }

  function wait(ms) {
    return new Promise((r) => {
      const id = setTimeout(r, ms);
      pending.push(id);
    });
  }

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function spawnNeededSymbol(symbols) {
    const state = window.__symbolRainState;
    const createFallingSymbol = window.SymbolRainHelpers?.createFallingSymbol;
    if (!state || !createFallingSymbol || !Array.isArray(symbols)) return false;

    const now = Date.now();
    if (!missingSymbolSince) {
      missingSymbolSince = now;
      return false;
    }
    if (now - missingSymbolSince < SYMBOL_STALL_SPAWN_MS) return false;

    createFallingSymbol(
      {
        symbols: state.symbols,
        symbolRainContainer: state.symbolRainContainer,
        config: state.config,
        activeFallingSymbols: state.activeFallingSymbols,
        symbolPool: state.symbolPool,
        lastSymbolSpawnTimestamp: state.lastSymbolSpawnTimestamp,
      },
      {
        column: Math.floor(Math.random() * Math.max(state.columnCount, 1)),
        forcedSymbol: symbols[0],
      },
    );
    missingSymbolSince = now;
    return true;
  }

  async function clickSymbol(el, symbol) {
    const T = window.EvanTargets;
    if (!hasLiveRect(el)) return;
    const pos = T.centerOf(el);
    window.EvanPresenter?.moveHandTo?.(pos.x, pos.y);
    emit(GE.EVAN_ACTION_REQUESTED, { action: "symbolClick", symbol });
    await wait(DELAY_TARGET);
    if (!active || !hasLiveRect(el)) return;
    if (T.findFallingSymbol(symbol) !== el) return;
    el.classList.add("clicked");
    emit(GE.SYMBOL_CLICKED, { symbol });
    emit(GE.EVAN_ACTION_COMPLETED, { action: "symbolClick", symbol });
    await wait(DELAY_POST);
  }

  async function tapWormSegment(seg) {
    const T = window.EvanTargets;
    if (!hasLiveRect(seg)) return;
    const pos = T.centerOf(seg);
    window.EvanPresenter?.moveHandTo?.(pos.x, pos.y);
    emit(GE.EVAN_ACTION_REQUESTED, { action: "wormTap", ...pos });
    await wait(DELAY_TARGET);
    if (!active || !hasLiveRect(seg)) return;
    emit(GE.WORM_CURSOR_TAP, pos);
    emit(GE.EVAN_ACTION_COMPLETED, { action: "wormTap", ...pos });
    wormTapStreak++;
    await wait(DELAY_POST);
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
      await wait(DELAY_MUFFIN);
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
    await wait(DELAY_TARGET);
    if (!active || !sys.isPlacementMode) {
      sys.deselectPowerUp?.();
      return;
    }
    const ok = await awaitEvent("powerUpActivated", DELAY_POWERUP_TIMEOUT, () =>
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
    await wait(DELAY_POST);
  }

  function awaitEvent(name, timeout, action) {
    return new Promise((resolve) => {
      let done = false;
      const handler = () => {
        if (done) return;
        done = true;
        resolve(true);
      };
      document.addEventListener(name, handler, { once: true });
      if (action) action();
      const id = setTimeout(() => {
        if (done) return;
        done = true;
        document.removeEventListener(name, handler);
        resolve(false);
      }, timeout);
      pending.push(id);
    });
  }

  async function runLoop() {
    const T = window.EvanTargets;
    while (active) {
      const seg = T.findGreenWormSegment();
      const puType = T.getBestPowerUp(seg);
      const neededSymbols = (T.getNeededSymbols?.() || []).filter(Boolean);
      if (neededSymbols.length === 0) {
        const neededSymbol = T.getNeededSymbol?.();
        if (neededSymbol) {
          neededSymbols.push(neededSymbol);
        }
      }
      const symbolTarget =
        T.findBestFallingSymbol?.(neededSymbols) ||
        (neededSymbols[0] ? T.findFallingSymbol?.(neededSymbols[0]) : null);

      if (neededSymbols.length > 0 && !symbolTarget) {
        spawnNeededSymbol(neededSymbols);
      }

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

      if (neededSymbols.length > 0) {
        if (symbolTarget) {
          missingSymbolSince = 0;
          wormTapStreak = 0;
          await clickSymbol(symbolTarget, symbolTarget.textContent.trim());
        } else {
          spawnNeededSymbol(neededSymbols);
          window.EvanPresenter?.parkHand?.();
          await wait(DELAY_POST);
        }
      } else {
        missingSymbolSince = 0;
        wormTapStreak = 0;
        window.EvanPresenter?.parkHand?.();
        await wait(DELAY_POST);
      }
    }
  }

  function waitForGameReady() {
    return new Promise((resolve) => {
      const check = () => {
        if (window.GameSymbolHandlerCore) resolve();
        else pending.push(setTimeout(check, 200));
      };
      check();
    });
  }

  async function start() {
    if (active) return;
    active = true;
    await waitForGameReady();
    if (!active) return;
    runLoop();
  }

  function stop() {
    active = false;
    clearPending();
    missingSymbolSince = 0;
    wormTapStreak = 0;
    window.EvanPresenter?.parkHand?.();
  }

  document.addEventListener(GE.EVAN_HELP_STARTED, start);
  document.addEventListener(GE.EVAN_HELP_STOPPED, stop);
  document.addEventListener(GE.PROBLEM_COMPLETED, stop);

  window.EvanController = { start, stop };
})();
