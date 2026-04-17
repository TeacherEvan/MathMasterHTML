function dispatchPreload(progress, message) {
  if (window.GameEvents?.PRELOAD_PROGRESS) {
    document.dispatchEvent(
      new CustomEvent(window.GameEvents.PRELOAD_PROGRESS, {
        detail: { progress, message },
      }),
    );
  }
}

function getAppUpdateEventName() {
  return window.GameEvents?.APP_UPDATE_AVAILABLE || "appUpdateAvailable";
}

function dispatchAppUpdateAvailable(registration, source = "updatefound") {
  const detail = {
    source,
    scope: registration?.scope || null,
    buildVersion: window.MathMasterBuildVersion || null,
    hasController: Boolean(navigator.serviceWorker?.controller),
  };

  window.MathMasterAppUpdate = {
    available: true,
    ...detail,
  };

  document.dispatchEvent(
    new CustomEvent(getAppUpdateEventName(), {
      detail,
    }),
  );
}

const swDebugMode = new URLSearchParams(window.location.search).get(
  "swDebug",
);
let serviceWorkerRegistrationStarted = false;
let serviceWorkerRetryScheduled = false;
let lastServiceWorkerFailure = null;

function getServiceWorkerSupportState() {
  const protocol = window.location?.protocol || "";
  const isHttpLikeProtocol = protocol === "https:" || protocol === "http:";
  const isSupported = "serviceWorker" in navigator;
  const isSecure = window.isSecureContext !== false;
  const isPrerendering = document.prerendering === true;
  const isVisible = document.visibilityState !== "hidden";

  return {
    protocol,
    isSupported,
    isSecure,
    isHttpLikeProtocol,
    isPrerendering,
    isVisible,
    canRegisterNow:
      isSupported && isSecure && isHttpLikeProtocol && !isPrerendering && isVisible,
  };
}

function updateLastServiceWorkerFailure(reason, error = null) {
  lastServiceWorkerFailure = {
    reason,
    name: error?.name || null,
    message: error?.message || null,
    protocol: window.location?.protocol || null,
    readyState: document.readyState,
    visibilityState: document.visibilityState,
  };
}

function finalizeWithoutServiceWorker(reason, error = null) {
  updateLastServiceWorkerFailure(reason, error);
  dispatchPreload(60, "Service worker skipped.");
  if (window.GameEvents?.PRELOAD_FAILED) {
    document.dispatchEvent(new CustomEvent(window.GameEvents.PRELOAD_FAILED));
  }
}

function queueServiceWorkerRetry(reason = "deferred") {
  if (serviceWorkerRetryScheduled || serviceWorkerRegistrationStarted) {
    return;
  }

  serviceWorkerRetryScheduled = true;
  updateLastServiceWorkerFailure(reason);

  const retry = () => {
    if (serviceWorkerRegistrationStarted) {
      return;
    }

    const supportState = getServiceWorkerSupportState();
    if (!supportState.canRegisterNow) {
      return;
    }

    serviceWorkerRetryScheduled = false;
    window.removeEventListener("pageshow", retry);
    document.removeEventListener("visibilitychange", retry);
    document.removeEventListener("prerenderingchange", retry);
    startServiceWorkerRegistration();
  };

  window.addEventListener("pageshow", retry, { once: true });
  document.addEventListener("visibilitychange", retry);
  document.addEventListener("prerenderingchange", retry, { once: true });
}

function isRefreshUpdateDiagnosticEnabled() {
  return swDebugMode === "refresh-update" || swDebugMode === "reset";
}

async function getDiagnosticState() {
  const supportState = getServiceWorkerSupportState();
  const registration =
    "serviceWorker" in navigator
      ? await navigator.serviceWorker.getRegistration().catch(() => null)
      : null;
  const cacheNames =
    typeof window.caches?.keys === "function"
      ? await window.caches.keys().catch(() => [])
      : [];

  return {
    enabled: isRefreshUpdateDiagnosticEnabled(),
    mode: swDebugMode,
    supportState,
    controlled: Boolean(navigator.serviceWorker?.controller),
    active: Boolean(registration?.active),
    waiting: Boolean(registration?.waiting),
    installing: Boolean(registration?.installing),
    cacheNames,
    lastFailure: lastServiceWorkerFailure,
  };
}

function ensureRefreshUpdateDiagnosticButton() {
  if (!isRefreshUpdateDiagnosticEnabled() || !document.body) {
    return;
  }

  if (document.getElementById("sw-refresh-update-debug")) {
    return;
  }

  const button = document.createElement("button");
  button.id = "sw-refresh-update-debug";
  button.className = "sw-refresh-update-debug";
  button.type = "button";
  button.textContent = "Refresh Update";
  button.setAttribute(
    "aria-label",
    "Refresh to the latest application version",
  );

  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Refreshing...";

    try {
      await window.refreshToUpdate?.();
    } catch (error) {
      console.error("❌ Refresh-to-update diagnostic failed:", error);
      button.disabled = false;
      button.textContent = "Retry Update";
    }
  });

  document.body.appendChild(button);
}

window._SWDiagnostic = {
  enabled: isRefreshUpdateDiagnosticEnabled(),
  getState: getDiagnosticState,
};

window.refreshToUpdate = async function () {
  if (typeof window.clearServiceWorkerCache === "function") {
    await window.clearServiceWorkerCache({ silent: true });
  }

  const registration =
    "serviceWorker" in navigator
      ? await navigator.serviceWorker.getRegistration().catch(() => null)
      : null;

  if (registration) {
    await registration.update().catch(() => {});

    if (registration.waiting && navigator.serviceWorker.controller) {
      activateWaitingWorker(registration);
      return;
    }
  }

  window.location.reload();
};

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      ensureRefreshUpdateDiagnosticButton();
    },
    { once: true },
  );
} else {
  ensureRefreshUpdateDiagnosticButton();
}

function startServiceWorkerRegistration() {
  if (serviceWorkerRegistrationStarted) {
    return;
  }

  const supportState = getServiceWorkerSupportState();
  if (!supportState.canRegisterNow) {
    if (!supportState.isSupported || !supportState.isSecure || !supportState.isHttpLikeProtocol) {
      finalizeWithoutServiceWorker("unsupported-context");
      return;
    }

    queueServiceWorkerRetry("document-not-active");
    return;
  }

  serviceWorkerRegistrationStarted = true;
  registerServiceWorker();
}

if ("serviceWorker" in navigator) {
  dispatchPreload(15, "Booting runtime shell...");

  if (document.readyState === "complete") {
    startServiceWorkerRegistration();
  } else {
    window.addEventListener("load", startServiceWorkerRegistration, {
      once: true,
    });
  }
} else {
  dispatchPreload(60, "Service worker skipped.");
  if (window.GameEvents?.PRELOAD_READY) {
    document.dispatchEvent(new CustomEvent(window.GameEvents.PRELOAD_READY));
  }
}

async function registerServiceWorker() {
  try {
    dispatchPreload(35, "Registering service worker...");
    const registration = await navigator.serviceWorker.register(
      "/service-worker.js",
      {
        scope: "/",
      },
    );

    console.log(
      "✅ Service Worker registered successfully:",
      registration.scope,
    );

    if (registration.waiting && navigator.serviceWorker.controller) {
      console.log("📦 Waiting service worker available");
      dispatchAppUpdateAvailable(registration, "waiting");
    }

    dispatchPreload(60, "Game assets cached.");

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      console.log("🔄 Service Worker update found");

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          console.log("📦 New version available");
          dispatchAppUpdateAvailable(registration, "installed");
        }
      });
    });

    // Periodic update check — runs for page lifetime; store handle for introspection.
    window._swUpdateInterval = setInterval(
      () => {
        registration.update();
      },
      60 * 60 * 1000,
    );

    dispatchPreload(100, "Ready to play.");
    if (window.GameEvents?.PRELOAD_READY) {
      document.dispatchEvent(new CustomEvent(window.GameEvents.PRELOAD_READY));
    }
  } catch (error) {
    if (error?.name === "InvalidStateError") {
      console.warn("⚠️ Service worker registration skipped in invalid document state", error);
      serviceWorkerRegistrationStarted = false;

      const supportState = getServiceWorkerSupportState();
      if (supportState.isSupported && supportState.isSecure && supportState.isHttpLikeProtocol) {
        queueServiceWorkerRetry("invalid-document-state");
        finalizeWithoutServiceWorker("invalid-document-state", error);
        return;
      }
    }

    console.error("❌ Service Worker registration failed:", error);
    finalizeWithoutServiceWorker("registration-failed", error);
  }
}

function activateWaitingWorker(registration) {
  const waitingWorker = registration.waiting || registration.installing;
  if (!waitingWorker) {
    window.location.reload();
    return;
  }

  let hasReloaded = false;
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => {
      if (hasReloaded) {
        return;
      }

      hasReloaded = true;
      window.location.reload();
    },
    { once: true },
  );

  waitingWorker.postMessage({ type: "SKIP_WAITING" });
}

window.clearServiceWorkerCache = async function ({ silent = false } = {}) {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.active) {
      const messageChannel = new MessageChannel();

      const result = new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          messageChannel.port1.close();
          resolve(Boolean(event.data.success));
        };
      });

      registration.active.postMessage(
        {
          type: "CLEAR_CACHE",
        },
        [messageChannel.port2],
      );

      const success = await result;
      if (success) {
        console.log("✅ Service Worker cache cleared");
        if (!silent && window.UXEnhancements && window.UXEnhancements.toast) {
          window.UXEnhancements.toast.success("Cache cleared successfully!");
        }
      }

      return success;
    }
  }

  return false;
};

console.log("📱 Service Worker registration script loaded");
