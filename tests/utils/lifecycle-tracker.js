// @ts-check
/**
 * Lifecycle tracker — injects monkeypatches for rAF, setTimeout, setInterval
 * to track active loops and detect orphaned timers.
 * Mirrors the pattern from ResourceManager (utils-resource-manager.js).
 *
 * @param {import('@playwright/test').Page} page
 */
export async function injectLifecycleTracker(page) {
  await page.addInitScript(() => {
    const tracker = {
      _rafIds: new Set(),
      _timerIds: new Set(),
      _intervalIds: new Set(),
      _rafLoopCount: 0,

      getReport() {
        return {
          activeRAFLoops: this._rafLoopCount,
          activeTimers: this._timerIds.size,
          activeIntervals: this._intervalIds.size,
          pendingRAFs: this._rafIds.size,
          totalOrphaned:
            this._timerIds.size + this._intervalIds.size + this._rafIds.size,
        };
      },
    };

    const origRAF = window.requestAnimationFrame.bind(window);
    const origCAF = window.cancelAnimationFrame.bind(window);
    const origSetTimeout = window.setTimeout.bind(window);
    const origClearTimeout = window.clearTimeout.bind(window);
    const origSetInterval = window.setInterval.bind(window);
    const origClearInterval = window.clearInterval.bind(window);

    window.requestAnimationFrame = function (cb) {
      const id = origRAF((...args) => {
        tracker._rafIds.delete(id);
        cb(...args);
      });
      tracker._rafIds.add(id);
      tracker._rafLoopCount++;
      return id;
    };

    window.cancelAnimationFrame = function (id) {
      tracker._rafIds.delete(id);
      origCAF(id);
    };

    window.setTimeout = function (cb, delay, ...args) {
      const id = origSetTimeout(
        (...a) => {
          tracker._timerIds.delete(id);
          if (typeof cb === "function") cb(...a);
        },
        delay,
        ...args,
      );
      tracker._timerIds.add(id);
      return id;
    };

    window.clearTimeout = function (id) {
      tracker._timerIds.delete(id);
      origClearTimeout(id);
    };

    window.setInterval = function (cb, delay, ...args) {
      const id = origSetInterval(cb, delay, ...args);
      tracker._intervalIds.add(id);
      return id;
    };

    window.clearInterval = function (id) {
      tracker._intervalIds.delete(id);
      origClearInterval(id);
    };

    window.__lifecycleTracker = tracker;
  });
}
