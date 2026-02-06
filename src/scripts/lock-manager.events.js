// src/scripts/lock-manager.events.js - Lock manager event bindings
console.log("🔒 LockManager events loading...");

(function attachLockManagerEvents() {
  const events = (window.LockManagerEvents = window.LockManagerEvents || {});

  events.bindCoreEvents = function bindCoreEvents(lockManager) {
    document.addEventListener("first-line-solved", () => {
      console.log("🔒 LockManager received first-line-solved event");
      lockManager.startLockAnimation();
    });

    document.addEventListener("stepCompleted", (e) => {
      console.log("🔒 LockManager received stepCompleted event:", e.detail);
      if (lockManager.lockAnimationActive) {
        const targetLevel = e.detail.stepIndex + 1;
        if (targetLevel > lockManager.currentLockLevel && targetLevel <= 6) {
          lockManager.activateLockLevel(targetLevel);
        }
      }
    });

    document.addEventListener("problemLineCompleted", (e) => {
      console.log(
        "🔒 LockManager received problemLineCompleted event",
        e.detail ? e.detail : "(no details)",
      );
      lockManager.completedLinesCount++;
      console.log(
        `🔒 Completed lines count is now: ${lockManager.completedLinesCount}`,
      );

      if (!lockManager.lockIsLive && lockManager.completedLinesCount === 1) {
        console.log("🔒 First line completed - starting lock animation");
        lockManager.startLockAnimation();
        return;
      }

      const isMasterLevel = document.body.classList.contains("master-level");
      console.log(
        `🔒 Current game mode: ${
          isMasterLevel ? "Master Level" : "Normal Level"
        }`,
      );

      if (lockManager.completedLinesCount === 2 && !isMasterLevel) {
        console.log(
          "🔒 Second line completed - forcing load of line-3-transformer.html",
        );
        lockManager.isLoadingComponent = true;
        lockManager
          .loadLockComponent("line-3-transformer.html")
          .then(() => {
            setTimeout(() => {
              lockManager.activateLockLevel(3);
              lockManager.currentLockLevel = 3;
              lockManager.isLoadingComponent = false;
            }, 300);
          })
          .catch((error) => {
            console.error("❌ Failed to load line-3-transformer.html:", error);
            lockManager.isLoadingComponent = false;
          });
      } else {
        lockManager.progressLockLevel();
      }
    });
  };

  events.bindDebugListeners = function bindDebugListeners() {
    console.log("🔒 Setting up additional debug listeners for lock events");

    window.addEventListener(
      "error",
      (e) => {
        if (
          e.target &&
          (e.target.tagName === "IFRAME" || e.target.tagName === "IMG")
        ) {
          console.error(`🔒 Resource load error: ${e.target.src}`);
        }
      },
      true,
    );
  };
})();
