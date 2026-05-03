import { expect, test } from "@playwright/test";
import {
  gotoGameRuntime,
  waitForRuntimeCoordinator,
} from "./utils/onboarding-runtime.js";

async function gotoBlockingPreloadRuntime(page, search = "?level=beginner") {
  await page.addInitScript(() => {
    if (
      navigator.serviceWorker &&
      typeof navigator.serviceWorker.register === "function"
    ) {
      navigator.serviceWorker.register = () => new Promise(() => {});
    }
  });

  await gotoGameRuntime(page, search);
  await waitForRuntimeCoordinator(page);
}

async function activateStartGame(page) {
  const startButton = page.locator("#start-game-btn");
  await expect(startButton).toBeVisible();
  await startButton.click({ force: true });
}

test.describe("Runtime boot orchestration", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.project.use?.isMobile) {
      await page.setViewportSize({ width: 915, height: 412 });
    }
  });

  test("coordinator stays blocked until preload and briefing are both complete", async ({
    page,
  }) => {
    await gotoBlockingPreloadRuntime(page, "?level=beginner");

    const initialState = await page.evaluate(() =>
      window.GameRuntimeCoordinator?.getState?.(),
    );

    expect(initialState).toEqual(
      expect.objectContaining({
        preloadComplete: false,
        briefingDismissed: false,
        gameplayReady: false,
        inputLocked: false,
      }),
    );

    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent(window.GameEvents.STARTUP_PRELOAD_FORCE_COMPLETE, {
          detail: { reason: "test" },
        }),
      );
    });

    const afterPreloadOnly = await page.evaluate(() =>
      window.GameRuntimeCoordinator.getState(),
    );
    expect(afterPreloadOnly.gameplayReady).toBe(false);

    await activateStartGame(page);
    await page.waitForFunction(
      () => window.GameRuntimeCoordinator.getState().gameplayReady === true,
    );

    const finalState = await page.evaluate(() =>
      window.GameRuntimeCoordinator.getState(),
    );
    expect(finalState).toEqual(
      expect.objectContaining({
        preloadComplete: true,
        briefingDismissed: true,
        gameplayReady: true,
      }),
    );
  });

  test("gameplayReadyChanged fires exactly once for the startup handoff", async ({
    page,
  }) => {
    await gotoBlockingPreloadRuntime(page, "?level=beginner");

    await page.evaluate(() => {
      window.__readyEvents = [];
      window.__eventOrder = [];
      document.addEventListener(window.GameEvents.STARTUP_PRELOAD_COMPLETE, () => {
        window.__eventOrder.push(window.GameEvents.STARTUP_PRELOAD_COMPLETE);
      });
      document.addEventListener(window.GameEvents.BRIEFING_DISMISSED, () => {
        window.__eventOrder.push(window.GameEvents.BRIEFING_DISMISSED);
      });
      document.addEventListener(window.GameEvents.GAMEPLAY_READY_CHANGED, (event) => {
        window.__eventOrder.push(window.GameEvents.GAMEPLAY_READY_CHANGED);
        window.__readyEvents.push(event.detail);
      });
    });

    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent(window.GameEvents.STARTUP_PRELOAD_FORCE_COMPLETE, {
          detail: { reason: "test" },
        }),
      );
    });

    await activateStartGame(page);
    await page.waitForFunction(() => window.GameRuntimeCoordinator.isGameplayReady());

    const readyEvents = await page.evaluate(() => window.__readyEvents);
    const eventOrder = await page.evaluate(() => window.__eventOrder);
    expect(readyEvents).toHaveLength(1);
    expect(readyEvents[0]).toEqual(
      expect.objectContaining({
        gameplayReady: true,
        preloadComplete: true,
        briefingDismissed: true,
      }),
    );
    expect(eventOrder).toEqual([
      "startupPreloadComplete",
      "briefingDismissed",
      "gameplayReadyChanged",
    ]);
  });

  test("symbol rain stays idle until gameplay is ready", async ({ page }) => {
    await gotoGameRuntime(page, "?level=beginner&preload=off");
    await waitForRuntimeCoordinator(page);

    await expect(page.locator("#start-game-btn")).toBeVisible();

    const beforeStart = await page.evaluate(() => ({
      gameplayReady: window.GameRuntimeCoordinator?.isGameplayReady?.() === true,
      snapshot: window.SymbolRainController?.getSnapshot?.(),
    }));

    expect(beforeStart.gameplayReady).toBe(false);
    expect(beforeStart.snapshot).toEqual(
      expect.objectContaining({
        phase: "waiting-gameplay",
        isAnimationRunning: false,
        activeFallingSymbols: 0,
      }),
    );

    await activateStartGame(page);

    await page.waitForFunction(
      () => window.GameRuntimeCoordinator?.isGameplayReady?.() === true,
      null,
      { timeout: 10000 },
    );

    await page.waitForFunction(
      () =>
        window.SymbolRainController?.getSnapshot?.()?.isAnimationRunning === true,
      null,
      { timeout: 10000 },
    );

    await page.waitForFunction(
      () =>
        (window.SymbolRainController?.getSnapshot?.()?.activeFallingSymbols ||
          0) > 0,
      null,
      { timeout: 10000 },
    );

    const afterStart = await page.evaluate(() =>
      window.SymbolRainController?.getSnapshot?.(),
    );

    expect(afterStart).toEqual(
      expect.objectContaining({
        phase: "running",
        controllersStarted: true,
        initialPopulationStarted: true,
      }),
    );
  });

  test("symbol rain controller exposes stable lifecycle controls", async ({
    page,
  }) => {
    await gotoGameRuntime(page, "?level=beginner&preload=off");
    await waitForRuntimeCoordinator(page);

    await activateStartGame(page);
    await page.waitForFunction(
      () => window.GameRuntimeCoordinator?.isGameplayReady?.() === true,
      null,
      { timeout: 10000 },
    );
    await page.waitForFunction(
      () => window.SymbolRainController?.getSnapshot?.()?.phase === "running",
      null,
      { timeout: 10000 },
    );

    const controllerResult = await page.evaluate(() => {
      const controller = window.SymbolRainController;
      const methodNames = [
        "getSnapshot",
        "start",
        "stop",
        "destroy",
        "refreshLayout",
        "spawnVisibleSymbol",
        "removeMatchingSymbols",
        "syncKeyboardTarget",
      ];

      const before = controller.getSnapshot();
      const stopSnapshot = controller.stop("test-controller-stop");
      const afterStop = controller.getSnapshot();
      const refreshSnapshot = controller.refreshLayout(
        "test-controller-refresh",
      );
      const spawned = controller.spawnVisibleSymbol("X", {
        column: 0,
        horizontalOffset: 0,
      });
      const afterSpawn = controller.getSnapshot();
      const removalCount = controller.removeMatchingSymbols(["x"]);
      const afterRemoval = controller.getSnapshot();
      const startSnapshot = controller.start("test-controller-start");

      return {
        methods: Object.fromEntries(
          methodNames.map((name) => [name, typeof controller?.[name]]),
        ),
        before,
        stopSnapshot,
        afterStop,
        refreshSnapshot,
        spawned,
        afterSpawn,
        removalCount,
        afterRemoval,
        startSnapshot,
        stateStillExposed: Boolean(window.__symbolRainState),
        activeSymbolsIsArray: Array.isArray(before?.activeFallingSymbols),
      };
    });

    expect(controllerResult.methods).toEqual({
      getSnapshot: "function",
      start: "function",
      stop: "function",
      destroy: "function",
      refreshLayout: "function",
      spawnVisibleSymbol: "function",
      removeMatchingSymbols: "function",
      syncKeyboardTarget: "function",
    });
    expect(controllerResult.before).toEqual(
      expect.objectContaining({
        phase: "running",
        isAnimationRunning: true,
        activeFallingSymbols: expect.any(Number),
        columnCount: expect.any(Number),
        cachedContainerHeight: expect.any(Number),
        isInitialPopulation: expect.any(Boolean),
        isMobileMode: expect.any(Boolean),
        layoutRetryCount: expect.any(Number),
        config: expect.objectContaining({
          profile: expect.any(String),
          maxActiveSymbols: expect.any(Number),
          spawnRate: expect.any(Number),
          symbolsPerWave: expect.any(Number),
        }),
      }),
    );
    expect(controllerResult.activeSymbolsIsArray).toBe(false);
    expect(controllerResult.stateStillExposed).toBe(true);
    expect(controllerResult.stopSnapshot.phase).toBe("stopped");
    expect(controllerResult.afterStop).toEqual(
      expect.objectContaining({
        phase: "stopped",
        isAnimationRunning: false,
        activeFallingSymbols: 0,
      }),
    );
    expect(controllerResult.refreshSnapshot.phase).toBe("stopped");
    expect(controllerResult.spawned).toBe(true);
    expect(controllerResult.afterSpawn.activeFallingSymbols).toBe(1);
    expect(controllerResult.removalCount).toBe(1);
    expect(controllerResult.afterRemoval.activeFallingSymbols).toBe(0);
    expect(controllerResult.startSnapshot.startRequested).toBe(true);

    await page.waitForFunction(
      () => window.SymbolRainController?.getSnapshot?.()?.phase === "running",
      null,
      { timeout: 10000 },
    );

    const restarted = await page.evaluate(() =>
      window.SymbolRainController.getSnapshot(),
    );
    expect(restarted).toEqual(
      expect.objectContaining({
        phase: "running",
        isAnimationRunning: true,
      }),
    );
  });

  test("symbol rain controller destroy tears down layout callbacks", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const listenerRecords = [];
      const sharedResizeSubscriptions = new Map();
      const resizeObservers = new Set();
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
      const NativeResizeObserver = window.ResizeObserver;
      let nextListenerId = 1;
      let nextSharedResizeId = 1;
      let nextResizeObserverId = 1;
      let sharedResizeObserverValue;

      function getTrackedTargetName(target) {
        if (target === window) {
          return "window";
        }

        if (target === document) {
          return "document";
        }

        if (
          target instanceof Element &&
          (target.id === "symbol-rain-container" || target.id === "panel-c")
        ) {
          return target.id;
        }

        return null;
      }

      function getListenerCounts() {
        return listenerRecords.reduce((counts, record) => {
          const targetCounts = counts[record.targetName] || {};
          targetCounts[record.type] = (targetCounts[record.type] || 0) + 1;
          counts[record.targetName] = targetCounts;
          return counts;
        }, {});
      }

      function wrapSharedResizeObserver(observer) {
        if (!observer?.subscribe || observer.__symbolRainAuditWrapped) {
          return observer;
        }

        const originalSubscribe = observer.subscribe.bind(observer);
        observer.subscribe = (callback, options = {}) => {
          const subscriptionId = nextSharedResizeId;
          nextSharedResizeId += 1;
          sharedResizeSubscriptions.set(subscriptionId, {
            source: options.source || "anonymous",
          });
          const unsubscribe = originalSubscribe(callback, options);

          return () => {
            sharedResizeSubscriptions.delete(subscriptionId);
            if (typeof unsubscribe === "function") {
              unsubscribe();
            }
          };
        };
        observer.__symbolRainAuditWrapped = true;
        return observer;
      }

      EventTarget.prototype.addEventListener = function auditedAdd(
        type,
        listener,
        options,
      ) {
        const targetName = getTrackedTargetName(this);
        if (targetName && typeof listener === "function") {
          listenerRecords.push({
            id: nextListenerId,
            targetName,
            type,
            listener,
          });
          nextListenerId += 1;
        }

        return originalAddEventListener.call(this, type, listener, options);
      };

      EventTarget.prototype.removeEventListener = function auditedRemove(
        type,
        listener,
        options,
      ) {
        const targetName = getTrackedTargetName(this);
        if (targetName && typeof listener === "function") {
          const recordIndex = listenerRecords.findIndex(
            (record) =>
              record.targetName === targetName &&
              record.type === type &&
              record.listener === listener,
          );
          if (recordIndex !== -1) {
            listenerRecords.splice(recordIndex, 1);
          }
        }

        return originalRemoveEventListener.call(this, type, listener, options);
      };

      if (typeof NativeResizeObserver === "function") {
        window.ResizeObserver = class AuditedResizeObserver extends NativeResizeObserver {
          constructor(callback) {
            super(callback);
            this.__symbolRainAuditId = nextResizeObserverId;
            nextResizeObserverId += 1;
            resizeObservers.add(this.__symbolRainAuditId);
          }

          disconnect() {
            resizeObservers.delete(this.__symbolRainAuditId);
            return super.disconnect();
          }
        };
      }

      Object.defineProperty(window, "SharedResizeObserver", {
        configurable: true,
        get() {
          return sharedResizeObserverValue;
        },
        set(observer) {
          sharedResizeObserverValue = wrapSharedResizeObserver(observer);
        },
      });

      window.__symbolRainTeardownAudit = {
        snapshot() {
          const sharedResizeSources = {};
          for (const subscription of sharedResizeSubscriptions.values()) {
            sharedResizeSources[subscription.source] =
              (sharedResizeSources[subscription.source] || 0) + 1;
          }

          return {
            listenerCounts: getListenerCounts(),
            resizeObserverCount: resizeObservers.size,
            sharedResizeSources,
          };
        },
      };
    });

    await gotoGameRuntime(page, "?level=beginner&preload=off");
    await waitForRuntimeCoordinator(page);
    await activateStartGame(page);
    await page.waitForFunction(
      () => window.SymbolRainController?.getSnapshot?.()?.phase === "running",
      null,
      { timeout: 10000 },
    );

    const result = await page.evaluate(() => {
      const beforeAudit = window.__symbolRainTeardownAudit.snapshot();
      const destroySnapshot = window.SymbolRainController.destroy(
        "test-controller-destroy",
      );

      window.dispatchEvent(new Event("resize"));
      window.SharedResizeObserver?.notify?.("test-after-destroy");
      document.dispatchEvent(
        new CustomEvent(window.GameEvents.DISPLAY_RESOLUTION_CHANGED, {
          detail: { isCompactViewport: true },
        }),
      );

      const refreshSnapshot = window.SymbolRainController.refreshLayout(
        "test-refresh-after-destroy",
      );
      const startSnapshot = window.SymbolRainController.start(
        "test-start-after-destroy",
      );

      return {
        beforeAudit,
        destroySnapshot,
        refreshSnapshot,
        startSnapshot,
        afterAudit: window.__symbolRainTeardownAudit.snapshot(),
      };
    });

    await page.waitForTimeout(300);

    const finalState = await page.evaluate(() => ({
      snapshot: window.SymbolRainController.getSnapshot(),
      audit: window.__symbolRainTeardownAudit.snapshot(),
    }));

    expect(result.destroySnapshot).toEqual(
      expect.objectContaining({
        phase: "stopped",
        isAnimationRunning: false,
        activeFallingSymbols: 0,
      }),
    );
    expect(result.refreshSnapshot.phase).toBe("stopped");
    expect(result.startSnapshot.phase).toBe("stopped");
    expect(finalState.snapshot).toEqual(
      expect.objectContaining({
        phase: "stopped",
        isAnimationRunning: false,
        activeFallingSymbols: 0,
      }),
    );

    expect(result.beforeAudit.sharedResizeSources["symbol-rain"]).toBe(1);
    expect(result.afterAudit.sharedResizeSources["symbol-rain"] || 0).toBe(0);
    expect(finalState.audit.sharedResizeSources["symbol-rain"] || 0).toBe(0);
    expect(result.afterAudit.resizeObserverCount).toBeLessThan(
      result.beforeAudit.resizeObserverCount,
    );
    expect(result.afterAudit.listenerCounts.window.resize || 0).toBe(
      (result.beforeAudit.listenerCounts.window.resize || 0) - 1,
    );
    expect(
      result.afterAudit.listenerCounts.document.visibilitychange || 0,
    ).toBe(
      (result.beforeAudit.listenerCounts.document.visibilitychange || 0) - 1,
    );
    expect(result.afterAudit.listenerCounts.document.problemCompleted || 0).toBe(
      (result.beforeAudit.listenerCounts.document.problemCompleted || 0) - 1,
    );
    expect(
      result.afterAudit.listenerCounts.document.displayResolutionChanged || 0,
    ).toBe(
      (result.beforeAudit.listenerCounts.document.displayResolutionChanged || 0) - 1,
    );
    expect(
      result.afterAudit.listenerCounts["symbol-rain-container"]?.pointerdown || 0,
    ).toBe(
      (result.beforeAudit.listenerCounts["symbol-rain-container"]?.pointerdown ||
        0) - 1,
    );
    expect(result.afterAudit.listenerCounts["panel-c"]?.focus || 0).toBe(
      (result.beforeAudit.listenerCounts["panel-c"]?.focus || 0) - 1,
    );
    expect(result.afterAudit.listenerCounts["panel-c"]?.blur || 0).toBe(
      (result.beforeAudit.listenerCounts["panel-c"]?.blur || 0) - 1,
    );
    expect(result.afterAudit.listenerCounts["panel-c"]?.keydown || 0).toBe(
      (result.beforeAudit.listenerCounts["panel-c"]?.keydown || 0) - 1,
    );
  });

  test("spawnVisibleSymbol clamps hostile coordinates into view", async ({
    page,
  }) => {
    await gotoGameRuntime(page, "?level=beginner&preload=off");
    await waitForRuntimeCoordinator(page);
    await activateStartGame(page);
    await page.waitForFunction(
      () => window.SymbolRainController?.getSnapshot?.()?.phase === "running",
      null,
      { timeout: 10000 },
    );

    const result = await page.evaluate(() => {
      const controller = window.SymbolRainController;
      controller.stop("test-spawn-visibility-stop");
      const spawned = controller.spawnVisibleSymbol("X", {
        column: 999,
        horizontalOffset: 100000,
        initialY: -100000,
      });
      const symbolElement = document.querySelector(
        "#symbol-rain-container .falling-symbol",
      );
      const symbolRect = symbolElement?.getBoundingClientRect?.();
      const rainRect = document
        .getElementById("symbol-rain-container")
        ?.getBoundingClientRect?.();
      const intersects =
        Boolean(symbolRect && rainRect) &&
        symbolRect.bottom > rainRect.top &&
        symbolRect.top < rainRect.bottom &&
        symbolRect.right > rainRect.left &&
        symbolRect.left < rainRect.right;
      const symbolText = symbolElement?.textContent || "";
      const afterVisibleSpawn = controller.getSnapshot();
      controller.removeMatchingSymbols(["X"]);

      const rainContainer = document.getElementById("symbol-rain-container");
      const previousDisplay = rainContainer.style.display;
      rainContainer.style.display = "none";
      const rejected = controller.spawnVisibleSymbol("Y", {
        column: -999,
        horizontalOffset: -100000,
        initialY: 100000,
      });
      const afterRejectedSpawn = controller.getSnapshot();
      rainContainer.style.display = previousDisplay;

      return {
        spawned,
        intersects,
        symbolText,
        afterVisibleSpawn,
        rejected,
        afterRejectedSpawn,
      };
    });

    expect(result.spawned).toBe(true);
    expect(result.intersects).toBe(true);
    expect(result.symbolText).toBe("X");
    expect(result.afterVisibleSpawn.activeFallingSymbols).toBe(1);
    expect(result.rejected).toBe(false);
    expect(result.afterRejectedSpawn.activeFallingSymbols).toBe(0);
  });

  test("spawnVisibleSymbol follows the resurfacing lifecycle", async ({
    page,
  }) => {
    await gotoGameRuntime(page, "?level=beginner&preload=off");
    await waitForRuntimeCoordinator(page);
    await activateStartGame(page);
    await page.waitForFunction(
      () => window.SymbolRainController?.getSnapshot?.()?.phase === "running",
      null,
      { timeout: 10000 },
    );

    const spawned = await page.evaluate(() => {
      window.SymbolRainController?.stop?.("test-spawn-lifecycle-stop");
      const result = window.SymbolRainController?.spawnVisibleSymbol?.("X", {
        column: 0,
        horizontalOffset: 0,
      });
      const target = Array.from(
        document.querySelectorAll('#panel-c .falling-symbol[data-symbol-state="visible"]'),
      ).find((element) => String(element.textContent || "").trim() === "X");
      if (target) {
        target.dataset.testSpawnProbe = "true";
      }
      return result;
    });

    expect(spawned).toBe(true);

    const initialSample = await page.evaluate(() => {
      const target = document.querySelector('#panel-c [data-test-spawn-probe="true"]');
      if (!target) {
        return null;
      }

      const rect = target.getBoundingClientRect();
      return {
        top: rect.top,
        left: rect.left,
        state: target.dataset.symbolState || "",
      };
    });

    expect(initialSample).not.toBeNull();
    expect(initialSample.state).toBe("visible");

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const target = document.querySelector('#panel-c [data-test-spawn-probe="true"]');
            return target?.dataset.symbolState || null;
          }),
        { timeout: 5000 },
      )
      .toBe("hidden");

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const target = document.querySelector('#panel-c [data-test-spawn-probe="true"]');
            if (!target) {
              return null;
            }

            const rect = target.getBoundingClientRect();
            return {
              top: rect.top,
              left: rect.left,
              state: target.dataset.symbolState || "",
            };
          }),
        { timeout: 10000 },
      )
      .toMatchObject({
        state: "visible",
      });

    const resurfacedSample = await page.evaluate(() => {
      const target = document.querySelector('#panel-c [data-test-spawn-probe="true"]');
      if (!target) {
        return null;
      }

      const rect = target.getBoundingClientRect();
      return {
        top: rect.top,
        left: rect.left,
        state: target.dataset.symbolState || "",
      };
    });

    expect(resurfacedSample).not.toBeNull();
    expect(resurfacedSample.state).toBe("visible");
    expect(
      Math.abs(resurfacedSample.top - initialSample.top) +
        Math.abs(resurfacedSample.left - initialSample.left),
    ).toBeGreaterThan(2);
  });

  test("live controller does not consult current-step target circulation lookups", async ({
    page,
  }) => {
    await gotoGameRuntime(page, "?level=beginner&preload=off");
    await waitForRuntimeCoordinator(page);
    await activateStartGame(page);
    await page.waitForFunction(
      () => window.SymbolRainController?.getSnapshot?.()?.phase === "running",
      null,
      { timeout: 10000 },
    );

    const lookupCount = await page.evaluate(async () => {
      const targets = window.SymbolRainTargets;
      if (!targets) {
        return null;
      }

      const originalLookup = targets.getNextRequiredSymbol;
      let count = 0;

      try {
        targets.getNextRequiredSymbol = () => {
          count += 1;
          return "X";
        };

        window.SymbolRainController?.refreshLayout?.("test-no-target-circulation");
        window.SymbolRainController?.spawnVisibleSymbol?.("X", {
          column: 0,
          horizontalOffset: 0,
        });

        await new Promise((resolve) => window.setTimeout(resolve, 1200));
        return count;
      } finally {
        if (originalLookup) {
          targets.getNextRequiredSymbol = originalLookup;
        } else {
          delete targets.getNextRequiredSymbol;
        }
      }
    });

    expect(lookupCount).toBe(0);
  });

  test("symbol rain lifecycle requestStart is idempotent", async ({ page }) => {
    await page.addScriptTag({ path: "./src/scripts/symbol-rain.lifecycle.js" });
    await page.addScriptTag({
      path: "./src/scripts/symbol-rain.helpers.spawn.js",
    });

    const result = await page.evaluate(async () => {
      function flushFrames(frameCallbacks) {
        while (frameCallbacks.length > 0) {
          frameCallbacks.shift()();
        }
      }

      const frameCallbacks = [];
      let gameplayReady = true;
      const state = {
        lifecyclePhase: "created",
        isInitialPopulation: true,
        isAnimationRunning: false,
        speedControllerId: null,
        activeFallingSymbols: [],
        layoutRetryCount: 0,
      };
      const calls = {
        startControllers: 0,
        populateInitialSymbols: 0,
        refreshLayoutMetrics: 0,
      };
      const machine = window.SymbolRainLifecycle.createMachine(state, {
        isGameplayReady: () => gameplayReady,
        refreshLayoutMetrics: () => {
          calls.refreshLayoutMetrics += 1;
          return true;
        },
        hasUsableLayout: () => true,
        syncResponsiveConfig() {},
        startControllers() {
          calls.startControllers += 1;
          state.isAnimationRunning = true;
          state.speedControllerId = calls.startControllers;
        },
        populateInitialSymbols() {
          calls.populateInitialSymbols += 1;
          state.activeFallingSymbols.push({ symbol: "X" });
          state.isInitialPopulation = false;
        },
        requestAnimationFrame(callback) {
          frameCallbacks.push(callback);
          return frameCallbacks.length;
        },
        cancelAnimationFrame() {},
        document: {
          addEventListener() {},
          removeEventListener() {},
        },
        window,
      });

      machine.requestStart("first");
      machine.requestStart("second");

      flushFrames(frameCallbacks);

      machine.requestStart("third");
      machine.onGameplayReadyChanged({ gameplayReady: true });
      machine.onLayoutChanged("test");

      state.isAnimationRunning = false;
      state.speedControllerId = null;
      state.activeFallingSymbols.length = 0;
      machine.requestStart("external-stop-restart");
      flushFrames(frameCallbacks);

      gameplayReady = false;
      machine.onGameplayReadyChanged({ gameplayReady: false });

      const idempotent = {
        calls,
        snapshot: machine.getSnapshot(),
        phase: state.lifecyclePhase,
        activeFallingSymbols: state.activeFallingSymbols.length,
      };

      const recoveryFrameCallbacks = [];
      let layoutUsable = false;
      const recoveryState = {
        lifecyclePhase: "created",
        isInitialPopulation: false,
        isAnimationRunning: false,
        speedControllerId: null,
        activeFallingSymbols: [],
        layoutRetryCount: 24,
      };
      const recoveryCalls = {
        failures: 0,
        startControllers: 0,
      };
      const recoveryMachine = window.SymbolRainLifecycle.createMachine(
        recoveryState,
        {
          isGameplayReady: () => true,
          refreshLayoutMetrics: () => true,
          hasUsableLayout: () => layoutUsable,
          syncResponsiveConfig() {},
          startControllers() {
            recoveryCalls.startControllers += 1;
            recoveryState.isAnimationRunning = true;
            recoveryState.speedControllerId = recoveryCalls.startControllers;
          },
          populateInitialSymbols() {},
          onFailure() {
            recoveryCalls.failures += 1;
          },
          requestAnimationFrame(callback) {
            recoveryFrameCallbacks.push(callback);
            return recoveryFrameCallbacks.length;
          },
          cancelAnimationFrame() {},
          document: {
            addEventListener() {},
            removeEventListener() {},
          },
          window,
        },
      );

      recoveryMachine.requestStart("initial-unusable-layout");
      flushFrames(recoveryFrameCallbacks);
      const failedSnapshot = recoveryMachine.getSnapshot();

      layoutUsable = true;
      recoveryMachine.onLayoutChanged("layout-ready");
      flushFrames(recoveryFrameCallbacks);

      const recovered = {
        failedSnapshot,
        snapshot: recoveryMachine.getSnapshot(),
        phase: recoveryState.lifecyclePhase,
        calls: recoveryCalls,
      };

      const populationFrameCallbacks = [];
      const symbolRainContainer = document.createElement("div");
      Object.defineProperty(symbolRainContainer, "offsetHeight", {
        value: 120,
      });
      document.body.appendChild(symbolRainContainer);

      const populationState = {
        lifecyclePhase: "created",
        isInitialPopulation: true,
        isAnimationRunning: false,
        speedControllerId: null,
        activeFallingSymbols: [],
        layoutRetryCount: 0,
      };
      const populationCalls = {
        completed: 0,
        populateInitialSymbols: 0,
      };
      const populationConfig = {
        maxActiveSymbols: 100,
        symbolsPerWave: 2,
        waveInterval: 15,
        columnWidth: 20,
      };
      const populationMachine = window.SymbolRainLifecycle.createMachine(
        populationState,
        {
          isGameplayReady: () => true,
          refreshLayoutMetrics: () => true,
          hasUsableLayout: () => true,
          syncResponsiveConfig() {},
          startControllers() {
            populationState.isAnimationRunning = true;
            populationState.speedControllerId = 1;
          },
          stopControllers() {
            populationState.isAnimationRunning = false;
            populationState.speedControllerId = null;
            populationState.activeFallingSymbols.forEach((symbolObj) => {
              symbolObj.element.remove();
            });
            populationState.activeFallingSymbols.length = 0;
          },
          populateInitialSymbols(initialPopulationToken) {
            populationCalls.populateInitialSymbols += 1;
            window.SymbolRainHelpers.populateInitialSymbols(
              {
                config: populationConfig,
                columnCount: 2,
                isMobileMode: true,
                activeFallingSymbols: populationState.activeFallingSymbols,
                symbols: ["X", "Y"],
                symbolRainContainer,
                symbolPool: {
                  get: () => document.createElement("span"),
                },
                lastSymbolSpawnTimestamp: {},
                initialPopulationToken,
              },
              () => {
                if (initialPopulationToken?.cancelled === true) {
                  return;
                }

                populationCalls.completed += 1;
                populationState.isInitialPopulation = false;
              },
            );
          },
          requestAnimationFrame(callback) {
            populationFrameCallbacks.push(callback);
            return populationFrameCallbacks.length;
          },
          cancelAnimationFrame() {},
          setTimeout: window.setTimeout.bind(window),
          clearTimeout: window.clearTimeout.bind(window),
          document: {
            addEventListener() {},
            removeEventListener() {},
          },
          window,
        },
      );

      populationMachine.requestStart("start-population");
      flushFrames(populationFrameCallbacks);
      const activeAfterFirstWave = populationState.activeFallingSymbols.length;

      populationMachine.stop("test-stop");
      const activeAfterStop = populationState.activeFallingSymbols.length;
      await new Promise((resolve) => window.setTimeout(resolve, 45));
      const activeAfterCancelledTimeouts =
        populationState.activeFallingSymbols.length;

      populationMachine.requestStart("restart-population");
      flushFrames(populationFrameCallbacks);
      const activeAfterRestart = populationState.activeFallingSymbols.length;
      populationMachine.stop("cleanup");
      symbolRainContainer.remove();

      return {
        idempotent,
        recovered,
        cancellablePopulation: {
          activeAfterFirstWave,
          activeAfterStop,
          activeAfterCancelledTimeouts,
          activeAfterRestart,
          calls: populationCalls,
        },
      };
    });

    expect(result.idempotent.calls.startControllers).toBe(2);
    expect(result.idempotent.calls.populateInitialSymbols).toBe(1);
    expect(result.idempotent.phase).toBe("running");
    expect(result.idempotent.snapshot).toEqual(
      expect.objectContaining({
        phase: "running",
        controllersStarted: true,
        initialPopulationStarted: true,
        gameplayReady: false,
      }),
    );
    expect(result.recovered.failedSnapshot.phase).toBe("failed");
    expect(result.recovered.calls.failures).toBe(1);
    expect(result.recovered.phase).toBe("running");
    expect(result.recovered.snapshot).toEqual(
      expect.objectContaining({
        phase: "running",
        controllersStarted: true,
        layoutRetryCount: 0,
      }),
    );
    expect(result.cancellablePopulation.activeAfterFirstWave).toBeGreaterThan(0);
    expect(result.cancellablePopulation.activeAfterStop).toBe(0);
    expect(result.cancellablePopulation.activeAfterCancelledTimeouts).toBe(0);
    expect(result.cancellablePopulation.activeAfterRestart).toBeGreaterThan(0);
    expect(result.cancellablePopulation.calls.populateInitialSymbols).toBe(2);
    expect(result.cancellablePopulation.calls.completed).toBe(0);
  });

  test("invalid level params normalize to beginner during boot", async ({ page }) => {
    await gotoGameRuntime(page, "?level=bad%20level&preload=off");
    await waitForRuntimeCoordinator(page);

    const state = await page.evaluate(() => ({
      onboardingLevel: window.GameOnboarding?.level,
      initLevel: window.GameInit?.level,
      currentLevel: window.getLevelFromURL?.(),
      bodyClassName: document.body.className,
    }));

    expect(state.onboardingLevel).toBe("beginner");
    expect(state.initLevel).toBe("beginner");
    expect(state.currentLevel).toBe("beginner");
    expect(state.bodyClassName).toContain("level-beginner");
    expect(state.bodyClassName).not.toContain("level-bad level");
  });

  test("auto Evan input lock is separate from gameplay readiness", async ({
    page,
  }) => {
    await gotoGameRuntime(page, "?level=beginner&evan=force&preload=off");
    await waitForRuntimeCoordinator(page);

    await activateStartGame(page);
    await page.waitForFunction(() => window.GameRuntimeCoordinator.isGameplayReady());

    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent(window.GameEvents.EVAN_HELP_STARTED, {
          detail: { mode: "auto", level: "beginner" },
        }),
      );
    });

    await page.waitForFunction(
      () => window.GameRuntimeCoordinator.getState().inputLocked === true,
    );

    const lockedState = await page.evaluate(() =>
      window.GameRuntimeCoordinator.getState(),
    );
    expect(lockedState).toEqual(
      expect.objectContaining({
        gameplayReady: true,
        inputLocked: true,
        inputLocks: expect.objectContaining({
          "evan-auto": true,
        }),
      }),
    );
  });
});
