// js/worm-spawn-manager.queue.js - Worm spawn queue management
console.log("📋 Worm Spawn Queue Manager loading...");

(function() {
  class WormSpawnManager {
    constructor(config = {}) {
      this.SPAWN_QUEUE_DELAY = config.queueDelay || 50;
      this.maxWorms = config.maxWorms || 999;

      this.spawnQueue = [];
      this.isProcessingQueue = false;

      console.log(
        `📋 WormSpawnManager initialized (max: ${this.maxWorms}, delay: ${this.SPAWN_QUEUE_DELAY}ms)`,
      );
    }

    queueSpawn(type, data = {}) {
      this.spawnQueue.push({
        type,
        data,
        timestamp: Date.now(),
      });

      console.log(
        `📋 Queued ${type} worm spawn. Queue length: ${this.spawnQueue.length}`,
      );
    }

    async processQueue(spawnCallback) {
      if (this.isProcessingQueue || this.spawnQueue.length === 0) {
        return;
      }

      this.isProcessingQueue = true;

      requestAnimationFrame(() => {
        const spawn = this.spawnQueue.shift();

        if (spawn && typeof spawnCallback === "function") {
          try {
            spawnCallback(spawn.type, spawn.data);
          } catch (error) {
            console.error(`❌ Error spawning ${spawn.type} worm:`, error);
          }
        }

        this.isProcessingQueue = false;

        if (this.spawnQueue.length > 0) {
          setTimeout(() => {
            this.processQueue(spawnCallback);
          }, this.SPAWN_QUEUE_DELAY);

          console.log(
            `⏱️ Processing next spawn in queue (${this.spawnQueue.length} remaining)...`,
          );
        }
      });
    }

    getStatus() {
      return {
        length: this.spawnQueue.length,
        isProcessing: this.isProcessingQueue,
      };
    }

    clearQueue() {
      const cleared = this.spawnQueue.length;
      this.spawnQueue = [];
      this.isProcessingQueue = false;

      if (cleared > 0) {
        console.log(`🧹 Cleared ${cleared} queued spawn(s)`);
      }
    }

    canSpawn(currentWormCount) {
      if (currentWormCount >= this.maxWorms) {
        console.log(`⚠️ Max worms (${this.maxWorms}) reached. Cannot spawn.`);
        return false;
      }
      return true;
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { WormSpawnManager };
  } else {
    window.WormSpawnManager = WormSpawnManager;
  }

  console.log("✅ Worm Spawn Queue Manager loaded");
})();
