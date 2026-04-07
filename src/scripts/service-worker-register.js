function dispatchPreload(progress, message) {
  if (window.GameEvents?.PRELOAD_PROGRESS) {
    document.dispatchEvent(
      new CustomEvent(window.GameEvents.PRELOAD_PROGRESS, {
        detail: { progress, message },
      }),
    );
  }
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
          showUpdateNotification();
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

function showUpdateNotification() {
  if (window.UXEnhancements && window.UXEnhancements.toast) {
    const toast = window.UXEnhancements.toast.info(
      "New version available! Click to update.",
      0,
    );

    toast.style.cursor = "pointer";
    toast.addEventListener(
      "click",
      () => {
        window.location.reload();
      },
      { once: true },
    );
  } else {
    if (confirm("A new version of Math Master is available. Reload now?")) {
      window.location.reload();
    }
  }
}

window.clearServiceWorkerCache = async function () {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.active) {
      const messageChannel = new MessageChannel();

      registration.active.postMessage(
        {
          type: "CLEAR_CACHE",
        },
        [messageChannel.port2],
      );

      messageChannel.port1.onmessage = (event) => {
        messageChannel.port1.close();
        if (event.data.success) {
          console.log("✅ Service Worker cache cleared");
          if (window.UXEnhancements && window.UXEnhancements.toast) {
            window.UXEnhancements.toast.success("Cache cleared successfully!");
          }
        }
      };
    }
  }
};

console.log("📱 Service Worker registration script loaded");
