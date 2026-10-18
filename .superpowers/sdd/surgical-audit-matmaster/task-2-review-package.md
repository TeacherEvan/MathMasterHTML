TASK 2 REVIEW PACKAGE
====================
Plan: docs/plans/SurgicalAudit Matmaster.txt
BASE: 85310dc
HEAD: 4f13b3e
Task: P0 — Service Worker Precache Verification + Atomic Install Guard (Prompt 2)

--- git log --oneline BASE..HEAD ---
4f13b3e P0: Service Worker precache verification + atomic install guard

--- git diff --stat BASE..HEAD ---
 service-worker.js                                 | 102 ++++++++++++++++++++--
 src/tools/scripts/verify.js                       |   2 +
 src/tools/scripts/verify/checks/critical-files.js |  89 ++++++++++++++++++-
 src/tools/scripts/verify/verify.checks.js         |   1 +
4 files changed, 188 insertions(+), 6 deletions(-)

--- git diff -U10 BASE..HEAD ---
diff --git a/service-worker.js b/service-worker.js
index c725a5c..ad0ecd8 100644
--- a/service-worker.js
+++ b/service-worker.js
@@ -30,20 +30,37 @@ const ACTIVE_RUNTIME_PAGES = [
 const DYNAMIC_GAME_MODULES = [
   "/src/scripts/game.js",
  "/src/scripts/game-problem-manager.js",
   "/src/scripts/game-symbol-handler.stolen.js",
   "/src/scripts/game-symbol-handler.core.js",
   "/src/scripts/game-symbol-handler.events.js",
   "/src/scripts/game-symbol-handler.js",
   "/src/scripts/game-state-manager.js",
 ];

 // Install retry tuning
 const INSTALL_RETRY_DELAY_MS = 300;
 const CRITICAL_INSTALL_RETRIES = 2;
 const NON_CRITICAL_INSTALL_RETRIES = 1;

 // Core gameplay scripts and runtime pages must be cached reliably for offline
 // gameplay. Non-critical assets (screenshots, secondary stylesheets) are
 // retried but never allowed to abort Service Worker activation.
 const CRITICAL_INSTALL_ASSETS = new Set([
   ...ACTIVE_RUNTIME_PAGES,
   ...DYNAMIC_GAME_MODULES,
   "/src/scripts/game.js",
   "/src/scripts/worm.js",
   "/src/scripts/constants.js",
   "/src/scripts/utils.js",
 ]);

 // Assets to cache immediately on install
 const STATIC_ASSETS = [
   "/",
   "/index.html",
   "/level-select.html",
   "/game.html",
   "/manifest.json",
   "/src/pages/index.html",
   "/src/pages/level-select.html",
   "/src/pages/game.html",
   "/src/styles/css/index.css",
   "/src/styles/css/level-select.css",
   "/src/styles/css/game.css",
   "/src/styles/css/game-animations.css",
   "/src/styles/css/game-responsive.css",
   "/src/styles/css/game-modals.css",
   `/src/styles/css/game.css?v=${BUILD_VERSION}`,
   `/src/styles/css/game-responsive.css?v=${BUILD_VERSION}`,
   `/src/styles/css/game-modals.preload.css?v=${BUILD_VERSION}`,
   `/src/styles/css/lock-responsive.css?v=${BUILD_VERSION}`,
   "/src/styles/css/console.css",
   "/src/styles/css/worm-base.css",
   "/src/styles/css/worm-effects.css",
   "/src/styles/css/lock-responsive.css",
   "/src/styles/css/modern-ux-enhancements.css",
   "/src/styles/css/cosmic-console.css",
   "/src/scripts/service-worker-register.js",
   "/src/scripts/index-page.matrix.js",
   "/src/scripts/index-page.effects.js",
   "/src/scripts/index-page.ripple.js",
   "/src/scripts/index-page.core.js",
   "/src/scripts/index-page.js",
   "/src/scripts/level-select-page.effects.js",
   "/src/scripts/level-select-page.interactions.js",
   "/src/scripts/level-select-page.progress.js",
   "/src/scripts/level-select-page.js",
   "/src/scripts/game-page.js",
   "/src/scripts/utils.js",
   "/src/scripts/constants.js",
   "/src/scripts/ux-enhancements.js",
   "/src/scripts/lazy-component-loader.js",
   "/src/scripts/display-manager.js",
   `/src/scripts/display-manager.js?v=${BUILD_VERSION}`,
   `/src/scripts/display-manager.mobile.js?v=${BUILD_VERSION}`,
   "/src/scripts/performance-monitor.js",
   "/src/scripts/3rdDISPLAY.js",
   `/src/scripts/symbol-rain.helpers.js?v=${BUILD_VERSION}`,
   `/src/scripts/symbol-rain.helpers.utils.js?v=${BUILD_VERSION}`,
   `/src/scripts/symbol-rain.helpers.spatial.js?v=${BUILD_VERSION}`,
   `/src/scripts/symbol-rain.helpers.face-reveal.js?v=${BUILD_VERSION}`,
   `/src/scripts/symbol-rain.helpers.pool.js?v=${BUILD_VERSION}`,
   `/src/scripts/symbol-rain.helpers.spawn.js?v=${BUILD_VERSION}`,
   `/src/scripts/symbol-rain.helpers.interactions.js?v=${BUILD_VERSION}`,
   `/src/scripts/symbol-rain.config.js?v=${BUILD_VERSION}`,
   `/src/scripts/symbol-rain.spawn.js?v=${BUILD_VERSION}`,
   `/src/scripts/symbol-rain.animation.js?v=${BUILD_VERSION}`,
   `/src/scripts/symbol-rain.interactions.js?v=${BUILD_VERSION}`,
   `/src/scripts/3rdDISPLAY.js?v=${BUILD_VERSION}`,
   "/src/scripts/problem-loader.js",
   "/src/scripts/symbol-validator.js",
   "/src/scripts/worm-factory.js",
   "/src/scripts/worm-movement.js",
   "/src/scripts/worm-spawn-manager.js",
   "/src/scripts/worm-powerups.js",
   "/src/scripts/worm.js",
   "/src/scripts/lock-responsive.js",
   "/src/scripts/lock-manager.js",
   "/src/scripts/console-manager.js",
   "/src/scripts/game.js",
   "/src/scripts/game-onboarding.storage.js",
   "/src/scripts/game-onboarding.bootstrap.js",
   "/src/scripts/evan-helper.presenter.js",
   "/src/scripts/evan-helper.pulse.js",
   "/src/scripts/game-tutorial-level.js",
   "/src/scripts/game-onboarding.controller.js",
   "/src/scripts/evan-helper.controller.targets.js",
   "/src/scripts/evan-helper.controller.runtime.js",
   "/src/scripts/evan-helper.controller.js",
   "/src/scripts/game-background-warmup.js",
   "/src/scripts/build-version.js",
   "/src/scripts/install-prompt.js",
   `/src/scripts/startup-preload.js?v=${BUILD_VERSION}`,
   `/src/scripts/game-page.js?v=${BUILD_VERSION}`,
   `/src/scripts/service-worker-register.js?v=${BUILD_VERSION}`,
 ];

+function sleep(ms) {
+  return new Promise((resolve) => setTimeout(resolve, ms));
+}
+
+async function cacheAssetWithRetry(cache, assetPath, maxRetries) {
+  let lastError;
+  for (let attempt = 0; attempt <= maxRetries; attempt++) {
+    try {
+      await cache.add(assetPath);
+      return { assetPath, success: true, attempts: attempt + 1 };
+    } catch (error) {
+      lastError = error;
+      if (attempt < maxRetries) {
+        await sleep(INSTALL_RETRY_DELAY_MS * (attempt + 1));
+      }
+    }
+  }
+  return { assetPath, success: false, attempts: maxRetries + 1, error: lastError };
+}
+
+function isCriticalInstallAsset(assetPath) {
+  return CRITICAL_INSTALL_ASSETS.has(assetPath);
+}
+
 function extractAssetReferences(html) {
   const assets = [];
   const assetPattern = /\b(?:src|href)=["']([^"']+)["']/g;
@@ -207,28 +258,69 @@ self.addEventListener("install", (event) => {
   console.log("[ServiceWorker] Installing...");

   const installEvent = /** @type {ExtendableWorkerEvent} */ (/** @type {unknown} */ (event));

   installEvent.waitUntil(
     caches
       .open(CACHE_NAME)
       .then(async (cache) => {
         console.log("[ServiceWorker] Caching static assets");
         const installAssets = await getInstallAssets();
-        const results = await Promise.allSettled(
-          installAssets.map((assetPath) => cache.add(assetPath)),
+
+        const installTasks = installAssets.map((assetPath) =>
+          cacheAssetWithRetry(
+            cache,
+            assetPath,
+            isCriticalInstallAsset(assetPath) ? CRITICAL_INSTALL_RETRIES : NON_CRITICAL_INSTALL_RETRIES,
+          ),
         );
-        const failed = results.filter((result) => result.status === "rejected");
-        if (failed.length > 0) {
+
+        const results = await Promise.allSettled(installTasks);
+
+        const failed = results
+          .filter(
+            (result) =>
+              result.status === "fulfilled" && result.value && !result.value.success,
+          )
+          .map((result) => result.value);
+
+        const criticalFailed = failed.filter((f) => isCriticalInstallAsset(f.assetPath));
+        const nonCriticalFailed = failed.filter(
+          (f) => !isCriticalInstallAsset(f.assetPath),
+        );
+
+        if (criticalFailed.length > 0) {
+          console.error(
+            `[ServiceWorker] ${criticalFailed.length} CRITICAL asset(s) failed to cache after retries:`,
+          );
+          criticalFailed.forEach((f) => {
+            console.error(
+              `   ${f.assetPath} (${f.attempts} attempts): ${f.error?.message ?? String(f.error)}`,
+            );
+          });
+        }
+        if (nonCriticalFailed.length > 0) {
           console.warn(
-            `[ServiceWorker] ${failed.length} static assets failed to cache during install`,
+            `[ServiceWorker] ${nonCriticalFailed.length} non-critical asset(s) failed to cache after retries (install continues):`,
           );
+          nonCriticalFailed.forEach((f) => {
+            console.warn(`   ${f.assetPath} (${f.attempts} attempts)`);
+          });
+        }
+
+        if (failed.length === 0) {
+          console.log("[ServiceWorker] All static assets cached");
         }
       })
       .then(() => {
         console.log("[ServiceWorker] Install complete - waiting for activation");
       })
       .catch((error) => {
         console.error("[ServiceWorker] Install failed:", error);
       }),
   );
 });
diff --git a/src/tools/scripts/verify.js b/src/tools/scripts/verify.js
index 15ea66e..908be2a 100644
--- a/src/tools/scripts/verify.js
+  checkServiceWorkerPrecacheAssets,
diff --git a/src/tools/scripts/verify/checks/critical-files.js b/src/tools/scripts/verify/checks/critical-files.js
+export function checkServiceWorkerPrecacheAssets(rootDir) {
+  ...
+}
diff --git a/src/tools/scripts/verify/verify.checks.js b/src/tools/scripts/verify/verify.checks.js
+export { checkServiceWorkerPrecacheAssets } from "./checks/critical-files.js";