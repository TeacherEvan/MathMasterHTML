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

  window.EvanControllerRuntime = {
    hasLiveRect,
    clearTimers,
    wait,
    waitForEvent,
    waitForGameReady,
  };
})();
