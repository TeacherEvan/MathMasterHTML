TASK 1 REVIEW PACKAGE
====================
Plan: docs/plans/SurgicalAudit Matmaster.txt
BASE: 88040f4575834af3c2667bf4a0cb450237036d3c
HEAD: 85310dc
Task: P0 — Normalize case-sensitive lock component paths (Prompt 1)

--- git log --oneline BASE..HEAD ---
85310dc P0: Normalize case-sensitive lock component paths

--- git diff --stat BASE..HEAD ---
 ...-1-transformer.html => line-1-transformer.html} |  2 +-
 ...-5-transformer.html => line-5-transformer.html} |  2 +-
 src/scripts/game-init.js                           |  6 +--
 src/scripts/lazy-component-loader.js               |  8 ++--
 src/scripts/lock-manager.loader.js                 |  8 ++--
 .../css/lock-components/Line-1-transformer.css     |  8 ----
 .../css/lock-components/Line-5-transformer.css     |  3 --
 ...ontrols.css => line-1-transformer.controls.css} |  0
 ...former.core.css => line-1-transformer.core.css} |  0
 .../css/lock-components/line-1-transformer.css     |  8 ++++
 ...frames.css => line-1-transformer.keyframes.css} |  0
 ...er.levels.css => line-1-transformer.levels.css} |  0
 ...ss => line-1-transformer.mechanics.details.css} |  0
 ...css => line-1-transformer.mechanics.motion.css} |  0
 ...tions.css => line-5-transformer.animations.css} |  0
 ...former.core.css => line-5-transformer.core.css} |  0
 .../css/lock-components/line-5-transformer.css     | 3 ++
 ...ucture.css => line-5-transformer.structure.css} |  0
 src/tools/scripts/verify.js                        |  3 ++
 src/tools/scripts/verify/checks/critical-files.js  | 56 +++++++++++++++++++++-
 src/tools/scripts/verify/verify.checks.js          |  1 +
21 files changed, 83 insertions(+), 25 deletions(-)

--- git diff -U10 BASE..HEAD ---
diff --git a/src/assets/components/lock-components/Line-1-transformer.html b/src/assets/components/lock-components/line-1-transformer.html
similarity index 99%
rename from src/assets/components/lock-components/Line-1-transformer.html
rename to src/assets/components/lock-components/line-1-transformer.html
index b097538..3252cb8 100644
--- a/src/assets/components/lock-components/Line-1-transformer.html
+++ b/src/assets/components/lock-components/line-1-transformer.html
@@ -1,18 +1,18 @@
 <!DOCTYPE html>
 <html lang="en">
 
 <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>Level 1 Lock Transformer - Basic Extension</title>
-    <link rel="stylesheet" href="/src/styles/css/lock-components/Line-1-transformer.css">
+    <link rel="stylesheet" href="/src/styles/css/lock-components/line-1-transformer.css">
 </head>
 
 <body>
     <div class="lock-container">
         <div class="shackle"></div>
 
         <div class="lock-body" id="lockBody">
             <!-- Energy Conduits -->
             <div class="energy-conduit top"></div>
             <div class="energy-conduit bottom"></div>
diff --git a/src/assets/components/lock-components/Line-5-transformer.html b/src/assets/components/lock-components/line-5-transformer.html
similarity index 99%
rename from src/assets/components/lock-components/Line-5-transformer.html
rename to src/assets/components/lock-components/line-5-transformer.html
index 3e88f59..ac01b9e 100644
--- a/src/assets/components/lock-components/Line-5-transformer.html
+++ b/src/assets/components/lock-components/line-5-transformer.html
@@ -1,18 +1,18 @@
 <!DOCTYPE html>
 <html lang="en">
 
 <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>Level 5 Lock Transformer - Ultimate Metamorphosis</title>
-    <link rel="stylesheet" href="/src/styles/css/lock-components/Line-5-transformer.css">
+    <link rel="stylesheet" href="/src/styles/css/lock-components/line-5-transformer.css">
 </head>
 
 <body>
     <div class="controls">
     </div>
 
     <div class="lock-container">
         <!-- Main Lock Body (Starting from Level 4's final state) -->
         <div class="lock-body" id="lockBody">
             <!-- Core Element -->
diff --git a/src/scripts/game-init.js b/src/scripts/game-init.js
index 23f6afe..b01026b 100644
--- a/src/scripts/game-init.js
+++ b/src/scripts/game-init.js
@@ -19,31 +19,31 @@ console.log("🎮 Game initialization module loading...");
         ? window.getLevelFromURL()
         : typeof window.normalizeGameLevel === "function"
           ? window.normalizeGameLevel(requestedLevel)
           : requestedLevel === "h2p" ||
               requestedLevel === "beginner" ||
               requestedLevel === "warrior" ||
               requestedLevel === "master"
             ? requestedLevel
             : "beginner";
     const allowedLockComponents = new Set([
-      "Line-1-transformer.html",
+      "line-1-transformer.html",
       "line-2-transformer.html",
       "line-3-transformer.html",
       "line-4-transformer.html",
-      "Line-5-transformer.html",
+      "line-5-transformer.html",
       "line-6-transformer.html",
     ]);
     const requestedLockComponent = urlParams.get("lockComponent");
     const defaultLockComponent =
       window.LazyComponentLoader?.getLockComponentFilename?.(1) ||
-      "Line-1-transformer.html";
+      "line-1-transformer.html";
     const _lockComponent =
       requestedLockComponent &&
       allowedLockComponents.has(requestedLockComponent)
         ? requestedLockComponent
         : defaultLockComponent;
     // Init persistence + timer/score HUD
     if (window.PlayerStorage) {
       window.PlayerStorage.init();
     }
     if (window.ScoreTimerManager) {
diff --git a/src/scripts/lazy-component-loader.js b/src/scripts/lazy-component-loader.js
index ca65ec1..c3f6061 100644
--- a/src/scripts/lazy-component-loader.js
+++ b/src/scripts/lazy-component-loader.js
@@ -113,25 +113,25 @@ class LazyComponentLoader {
   }
 
   /**
    * Get lock component filename for a given level
    * Handles inconsistent naming convention (line-1 vs Line-5)
    * @param {number} level - Lock level (1-6)
    * @returns {string} - Filename
    */
   getLockComponentFilename(level) {
     const filenameMap = {
-      1: "Line-1-transformer.html",
+      1: "line-1-transformer.html",
       2: "line-2-transformer.html",
       3: "line-3-transformer.html",
       4: "line-4-transformer.html",
-      5: "Line-5-transformer.html",
+      5: "line-5-transformer.html",
       6: "line-6-transformer.html",
     };
     return filenameMap[level] || `line-${level}-transformer.html`;
   }
 
   /**
    * Preload next N lock components based on current level
    * @param {number} currentLevel - Current lock level
    * @param {number} lookahead - Number of levels to preload ahead
    */
@@ -153,25 +153,25 @@ class LazyComponentLoader {
   /**
    * Get all lock component paths
    * @returns {Array<string>}
    */
   getAllLockComponentPaths() {
     return [
-      "/src/assets/components/lock-components/Line-1-transformer.html",
+      "/src/assets/components/lock-components/line-1-transformer.html",
       "/src/assets/components/lock-components/line-2-transformer.html",
       "/src/assets/components/lock-components/line-3-transformer.html",
       "/src/assets/components/lock-components/line-4-transformer.html",
-      "/src/assets/components/lock-components/Line-5-transformer.html",
+      "/src/assets/components/lock-components/line-5-transformer.html",
       "/src/assets/components/lock-components/line-6-transformer.html",
     ];
   }
 
   /**
    * Clear cache for a specific component or all components
    * @param {string} componentPath - Optional path to clear, clears all if not provided
    */
   clearCache(componentPath = null) {
diff --git a/src/scripts/lock-manager.loader.js b/src/scripts/lock-manager.loader.js
index 5f8cc78..5bae29a 100644
--- a/src/scripts/lock-manager.loader.js
+++ b/src/scripts/lock-manager.loader.js
@@ -1,25 +1,25 @@
 // js/lock-manager.loader.js - Lock component loading helpers
 console.log("🔒 LockManager loader helpers loading...");
 
 (function attachLockManagerLoader() {
   if (!window.LockManager) {
     console.error("❌ LockManager core not loaded");
     return;
   }
 
   const ALLOWED_LOCK_COMPONENTS = new Set([
-    "Line-1-transformer.html",
+    "line-1-transformer.html",
     "line-2-transformer.html",
     "line-3-transformer.html",
     "line-4-transformer.html",
-    "Line-5-transformer.html",
+    "line-5-transformer.html",
     "line-6-transformer.html",
   ]);
@@ -151,15 +151,15 @@ console.log("🔒 LockManager loader helpers loading...");
         })
         .catch((err) => {
           clearTimeout(timeout);
           reject(err);
         });
     });
   };
 
   // Normalize component naming to handle case-sensitivity
   proto.normalizeComponentName = function normalizeComponentName(level) {
-    if (level === 1) return "Line-1-transformer.html";
-    if (level === 5) return "Line-5-transformer.html";
+    if (level === 1) return "line-1-transformer.html";
+    if (level === 5) return "line-5-transformer.html";
     return `line-${level}-transformer.html`;
   };
 })();
diff --git a/src/styles/css/lock-components/Line-1-transformer.css b/src/styles/css/lock-components/Line-1-transformer.css
deleted file mode 100644
index b235ea4..0000000
--- a/src/styles/css/lock-components/Line-1-transformer.css
+++ /dev/null
@@ -1,8 +0,0 @@
-/* Line-1-transformer.css - Import hub (keeps existing references stable) */
-
-@import url("/src/styles/css/lock-components/Line-1-transformer.core.css");
-@import url("/src/styles/css/lock-components/Line-1-transformer.levels.css");
-@import url("/src/styles/css/lock-components/Line-1-transformer.mechanics.motion.css");
-@import url("/src/styles/css/lock-components/Line-1-transformer.mechanics.details.css");
-@import url("/src/styles/css/lock-components/Line-1-transformer.keyframes.css");
-@import url("/src/styles/css/lock-components/Line-1-transformer.controls.css");
diff --git a/src/styles/css/lock-components/Line-5-transformer.css b/src/styles/css/lock-components/Line-5-transformer.css
deleted file mode 100644
index 747bbfc..0000000
--- a/src/styles/css/lock-components/Line-5-transformer.css
+++ /dev/null
@@ -1,3 +0,0 @@
-@import url("/src/styles/css/lock-components/Line-5-transformer.core.css");
-@import url("/src/styles/css/lock-components/Line-5-transformer.structure.css");
-@import url("/src/styles/css/lock-components/Line-5-transformer.animations.css");
diff --git a/src/styles/css/lock-components/Line-1-transformer.controls.css b/src/styles/css/lock-components/line-1-transformer.controls.css
similarity index 100%
rename from src/styles/css/lock-components/Line-1-transformer.controls.css
rename to src/styles/css/lock-components/line-1-transformer.controls.css
diff --git a/src/styles/css/lock-components/Line-1-transformer.core.css b/src/styles/css/lock-components/line-1-transformer.core.css
similarity index 100%
rename from src/styles/css/lock-components/Line-1-transformer.core.css
rename to src/styles/css/lock-components/line-1-transformer.core.css
diff --git a/src/styles/css/lock-components/line-1-transformer.css b/src/styles/css/lock-components/line-1-transformer.css
new file mode 100644
index 0000000..41a06f1
--- /dev/null
+++ b/src/styles/css/lock-components/line-1-transformer.css
@@ -0,0 +1,8 @@
+/* line-1-transformer.css - Import hub (keeps existing references stable) */
+
+@import url("/src/styles/css/lock-components/line-1-transformer.core.css");
+@import url("/src/styles/css/lock-components/line-1-transformer.levels.css");
+@import url("/src/styles/css/lock-components/line-1-transformer.mechanics.motion.css");
+@import url("/src/styles/css/lock-components/line-1-transformer.mechanics.details.css");
+@import url("/src/styles/css/lock-components/line-1-transformer.keyframes.css");
+@import url("/src/styles/css/lock-components/line-1-transformer.controls.css");
diff --git a/src/styles/css/lock-components/Line-1-transformer.keyframes.css b/src/styles/css/lock-components/line-1-transformer.keyframes.css
similarity index 100%
rename from src/styles/css/lock-components/Line-1-transformer.keyframes.css
rename to src/styles/css/lock-components/line-1-transformer.keyframes.css
diff --git a/src/styles/css/lock-components/Line-1-transformer.levels.css b/src/styles/css/lock-components/line-1-transformer.levels.css
similarity index 100%
rename from src/src/styles/css/lock-components/Line-1-transformer.levels.css b/src/styles/css/lock-components/line-1-transformer.levels.css
similarity index 100%
rename from src/styles/css/lock-components/Line-1-transformer.levels.css
rename to src/styles/css/lock-components/line-1-transformer.levels.css
diff --git a/src/styles/css/lock-components/Line-1-transformer.mechanics.details.css b/src/styles/css/lock-components/line-1-transformer.mechanics.details.css
similarity index 100%
rename from src/styles/css/lock-components/Line-1-transformer.mechanics.details.css
rename to src/styles/css/lock-components/line-1-transformer.mechanics.details.css
diff --git a/src/styles/css/lock-components/Line-1-transformer.mechanics.motion.css b/src/styles/css/lock-components/line-1-transformer.mechanics.motion.css
similarity index 100%
rename from src/styles/css/lock-components/Line-1-transformer.mechanics.motion.css
rename to src/styles/css/lock-components/line-1-transformer.mechanics.motion.css
diff --git a/src/styles/css/lock-components/Line-5-transformer.animations.css b/src/styles/css/lock-components/line-5-transformer.animations.css
similarity index 100%
rename from src/styles/css/lock-components/Line-5-transformer.animations.css
rename to src/styles/css/lock-components/line-5-transformer.animations.css
diff --git a/src/styles/css/lock-components/Line-5-transformer.core.css b/src/styles/css/lock-components/line-5-transformer.core.css
similarity index 100%
rename from src/styles/css/lock-components/Line-5-transformer.core.css
rename to src/styles/css/lock-components/line-5-transformer.core.css
diff --git a/src/styles/css/lock-components/line-5-transformer.css b/src/styles/css/lock-components/line-5-transformer.css
new file mode 100644
index 0000000..18e9c9a
--- /dev/null
+++ b/src/styles/css/lock-components/line-5-transformer.css
@@ -0,0 +1,3 @@
+@import url("/src/styles/css/lock-components/line-5-transformer.core.css");
+@import url("/src/styles/css/lock-components/line-5-transformer.structure.css");
+@import url("/src/styles/css/lock-components/line-5-transformer.animations.css");
diff --git a/src/styles/css/lock-components/Line-5-transformer.structure.css b/src/styles/css/lock-components/line-5-transformer.structure.css
similarity index 100%
rename from src/styles/css/lock-components/Line-5-transformer.structure.css
rename to src/styles/css/lock-components/line-5-transformer.structure.css
diff --git a/src/tools/scripts/verify.js b/src/tools/scripts/verify.js
index ab18bb9..15ea66e 100644
--- a/src/tools/scripts/verify.js
+++ b/src/tools/scripts/verify.js
@@ -3,20 +3,21 @@
  * MathMaster Project Health Verification Script
  *
  * Usage: npm run verify
  */
 
 import { dirname, resolve } from "path";
 import { fileURLToPath } from "url";
 import {
   checkCriticalFiles,
   checkDocumentation,
+  checkLockComponentFilenamesLowercase,
   checkESLint,
   checkLineLimits,
   checkManifestScreenshots,
   checkPackageJson,
   checkToolingTests,
   generateStats,
 } from "./verify/verify.checks.js";
 import { log, logResult, logSection } from "./verify/verify.logging.js";
 
 const __filename = fileURLToPath(import.meta.url);
@@ -30,20 +31,22 @@ const ROOT = resolve(__dirname, "..", "..", "..");
 async function main() {
   console.log("\n");
   log("🔍 MathMaster Project Verification Script", "bold");
   log(`   Running from: ${ROOT}`, "cyan");
   log(`   Date: ${new Date().toISOString()}`, "cyan");
 
   const advisoryLineLimitPolicy = checkLineLimits(ROOT, "baseline");
 
   const results = {
     criticalFiles: checkCriticalFiles(ROOT),
+    lockComponentFilenamesLowercase:
+      checkLockComponentFilenamesLowercase(ROOT),
     eslint: checkESLint(ROOT),
     toolingTests: checkToolingTests(ROOT),
     packageJson: checkPackageJson(ROOT),
     manifestScreenshots: checkManifestScreenshots(ROOT),
     documentation: checkDocumentation(ROOT),
   };
 
   generateStats(ROOT);
 
   // Summary
diff --git a/src/tools/scripts/verify/checks/critical-files.js b/src/tools/scripts/verify/checks/critical-files.js
index 866a3fc..c4bf914 100644
--- a/src/tools/scripts/verify/checks/critical-files.js

diff --git a/src/tools/scripts/verify/checks/critical-files.js b/src/tools/scripts/verify/checks/critical-files.js
index 866a3fc..c4bf914 100644
--- a/src/tools/scripts/verify/checks/critical-files.js
+++ b/src/tools/scripts/verify/checks/critical-files.js
@@ -1,13 +1,13 @@
 // src/tools/scripts/verify/checks/critical-files.js
 
-import { existsSync } from "fs";
+import { existsSync, readdirSync } from "fs";
 import { join } from "path";
 import { CRITICAL_FILES } from "../verify.constants.js";
 import { log, logSection } from "../verify.logging.js";
 
 export function checkCriticalFiles(rootDir) {
   logSection("CRITICAL FILES CHECK");
   let allPassed = true;
   let found = 0;
   let missing = 0;
 
   for (const file of CRITICAL_FILES) {
     const fullPath = join(rootDir, file);
     const exists = existsSync(fullPath);
     if (exists) {
       found++;
     } else {
       missing++;
       allPassed = false;
       log(`❌ Missing: ${file}`, "red");
     }
   }
 
   log(
     `\n📁 Found: ${found}/${CRITICAL_FILES.length} critical files`,
     found === CRITICAL_FILES.length ? "green" : "yellow",
   );
   if (missing > 0) {
     log(`⚠️  Missing: ${missing} files`, "red");
   }
 
   return allPassed;
 }
+
+/**
+ * Asserts every file in src/assets/components/lock-components/ and
+ * src/styles/css/lock-components/ uses strictly lowercase filenames
+ * (no uppercase characters), preventing case-sensitive HTTP 404s on
+ * Linux/Vercel deployment filesystems.
+ */
+export function checkLockComponentFilenamesLowercase(rootDir) {
+  logSection("LOCK COMPONENT FILENAME CASE CHECK");
+  const dirs = [
+    join(rootDir, "src/assets/components/lock-components"),
+    join(rootDir, "src/styles/css/lock-components"),
+  ];
+  let allPassed = true;
+  let checked = 0;
+  const violations = [];
+
+  const walk = (dir) => {
+    let entries;
+    try {
+      entries = readdirSync(dir, { withFileTypes: true });
+    } catch {
+      return;
+    }
+    for (const entry of entries) {
+      const full = join(dir, entry.name);
+      if (entry.isDirectory()) {
+        walk(full);
+    } else {
+        checked++;
+        if (/[A-Z]/.test(entry.name)) {
+          allPassed = false;
+          violations.push(full);
+        }
+      }
+    }
+  };
+
+  dirs.forEach(walk);
+
+  log(
+    `📁 Checked: ${checked} files across ${dirs.length} directories`,
+    "cyan",
+  );
+  if (violations.length > 0) {
+    allPassed = false;
+    log(`❌ ${violations.length} file(s) contain uppercase characters:`, "red");
+    violations.forEach((v) => log(`   ${v}`, "red"));
+  } else {
+    log("✅ All lock component filenames are strictly lowercase", "green");
+  }
+
+  return allPassed;
+}
diff --git a/src/tools/scripts/verify/verify.checks.js b/src/tools/scripts/verify/verify.checks.js
index fa1dce5..a7ba7f1 100644
--- a/src/tools/scripts/verify/verify.checks.js
+++ b/src/tools/scripts/verify/verify.checks.js
@@ -1,10 +1,11 @@
 // src/tools/scripts/verify/verify.checks.js
 
 export { checkCriticalFiles } from "./checks/critical-files.js";
+export { checkLockComponentFilenamesLowercase } from "./checks/critical-files.js";
 export { checkDocumentation } from "./checks/documentation.js";
 export { checkESLint } from "./checks/eslint.js";
 export { checkLineLimits } from "./checks/line-limits.js";
 export { checkManifestScreenshots } from "./checks/manifest-screenshots.js";
 export { checkPackageJson } from "./checks/package-json.js";
 export { generateStats } from "./checks/stats.js";
 export { checkToolingTests } from "./checks/tooling-tests.js";