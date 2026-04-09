function dispatchPreload(progress, message) {
  if (window.GameEvents?.PRELOAD_PROGRESS) {
    document.dispatchEvent(
      new CustomEvent(window.GameEvents.PRELOAD_PROGRESS, {
        detail: { progress, message },
      }),
    );
  }
}

const swDebugMode = new URLSearchParams(window.location.search).get(
  "swDebug",
);

function isRefreshUpdateDiagnosticEnabled() {
  return swDebugMode === "refresh-update" || swDebugMode === "reset";
}

async function getDiagnosticState() {
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
    controlled: Boolean(navigator.serviceWorker?.controller),
    active: Boolean(registration?.active),
    waiting: Boolean(registration?.waiting),
    installing: Boolean(registration?.installing),
    cacheNames,
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
  button.type = "button";
  button.textContent = "Refresh Update";
  button.setAttribute(
    "aria-label",
    "Refresh to the latest application version",
  );
  Object.assign(button.style, {
    position: "fixed",
    left: "12px",
    bottom: "12px",
    zIndex: "11000",
    minHeight: "40px",
    padding: "0.55rem 0.8rem",
    borderRadius: "999px",
    border: "1px solid rgba(255, 215, 0, 0.38)",
    background: "rgba(5, 10, 7, 0.92)",
    color: "#f4efc9",
    fontFamily: 'var(--font-display, "Orbitron", monospace)',
    fontSize: "0.68rem",
    fontWeight: "700",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    boxShadow: "0 0 18px rgba(0, 0, 0, 0.28)",
  });

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

if ("serviceWorker" in navigator) {
  dispatchPreload(15, "Booting runtime\u2026");
  window.addEventListener("load", () => {
    registerServiceWorker();
  });
} else {
  dispatchPreload(60, "Service worker skipped.");
  if (window.GameEvents?.PRELOAD_READY) {
    document.dispatchEvent(new CustomEvent(window.GameEvents.PRELOAD_READY));
  }
}

async function registerServiceWorker() {
  try {
    dispatchPreload(35, "Registering service worker\u2026");
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
      activateWaitingWorker(registration);
      return;
    }

    dispatchPreload(60, "Assets cached.");

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      console.log("🔄 Service Worker update found");

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          console.log("📦 New version available");
          activateWaitingWorker(registration);
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

    dispatchPreload(100, "Ready.");
    if (window.GameEvents?.PRELOAD_READY) {
      document.dispatchEvent(new CustomEvent(window.GameEvents.PRELOAD_READY));
    }
  } catch (error) {
    console.error("❌ Service Worker registration failed:", error);
    dispatchPreload(60, "Service worker skipped.");
    if (window.GameEvents?.PRELOAD_FAILED) {
      document.dispatchEvent(new CustomEvent(window.GameEvents.PRELOAD_FAILED));
    }
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
