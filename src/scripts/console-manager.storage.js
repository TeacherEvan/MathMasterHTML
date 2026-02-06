// js/console-manager.storage.js - Console persistence helpers
console.log("🎮 Console Manager storage loading");

(function() {
  if (!window.ConsoleManager) {
    console.error("❌ ConsoleManager core not loaded");
    return;
  }

  const proto = window.ConsoleManager.prototype;

  proto.loadProgress = function() {
    const saveKey = `mathmaster_console_${this.currentLevel}`;
    const saved = localStorage.getItem(saveKey);

    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.slots = data.slots || this.slots;
        console.log(
          `📥 Loaded console progress for ${this.currentLevel}:`,
          this.slots,
        );
        this.updateConsoleDisplay();
        return true;
      } catch (error) {
        console.error("❌ Error loading progress:", error);
        return false;
      }
    }
    return false;
  };

  proto.saveProgress = function() {
    const saveKey = `mathmaster_console_${this.currentLevel}`;
    const data = {
      slots: this.slots,
      timestamp: Date.now(),
    };
    localStorage.setItem(saveKey, JSON.stringify(data));
    console.log(`💾 Saved console progress for ${this.currentLevel}`);
  };

  proto.incrementProblemsCompleted = function() {
    const countKey = `mathmaster_problems_${this.currentLevel}`;
    let count = parseInt(localStorage.getItem(countKey) || "0");
    count++;
    localStorage.setItem(countKey, count.toString());
    console.log(`✅ Problems completed for ${this.currentLevel}: ${count}`);
    return count;
  };

  console.log("✅ Console Manager storage loaded");
})();
