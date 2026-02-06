// js/worm-spawn-manager.coordinator.spawners.js - Spawn coordinator methods
console.log("🎯 Worm Spawn Coordinator spawners loading...");

(function() {
  if (!window.WormSpawnCoordinator) {
    console.error("❌ WormSpawnCoordinator core not loaded");
    return;
  }

  const proto = window.WormSpawnCoordinator.prototype;

  proto.spawnFromConsole = function(slotElement, slotIndex, config) {
    if (!slotElement) {
      console.error("❌ Cannot spawn from console: slotElement is null");
      return null;
    }

    this.lockedConsoleSlots.add(slotIndex);
    slotElement.classList.add("worm-spawning", "locked");

    console.log(`🕳️ Worm spawning from console slot ${slotIndex + 1}`);

    const slotRect = slotElement.getBoundingClientRect();
    const startX = slotRect.left + slotRect.width / 2;
    const startY = slotRect.top + slotRect.height / 2;

    const wormId = this.generateUniqueId("worm");

    const wormElement = this.factory.createWormElement({
      id: wormId,
      classNames: ["console-worm"],
      segmentCount: config.segmentCount,
      x: startX,
      y: startY,
    });

    this.container.appendChild(wormElement);

    const wormData = this.factory.createWormData({
      id: wormId,
      element: wormElement,
      x: startX,
      y: startY,
      baseSpeed: config.baseSpeed,
      roamDuration: config.roamDuration,
      fromConsole: true,
      consoleSlotIndex: slotIndex,
      consoleSlotElement: slotElement,
    });

    console.log(
      `✅ Worm ${wormId} spawned from console at (${startX.toFixed(
        0,
      )}, ${startY.toFixed(0)})`,
    );

    return wormData;
  };

  proto.spawnFromBorder = function(index, total, config) {
    const position = this.factory.calculateBorderSpawnPosition(
      index,
      total,
      config.borderMargin,
    );

    const wormId = this.generateUniqueId("border-worm");

    const wormElement = this.factory.createWormElement({
      id: wormId,
      classNames: [],
      segmentCount: config.segmentCount,
      x: position.x,
      y: position.y,
    });

    this.container.appendChild(wormElement);

    const wormData = this.factory.createWormData({
      id: wormId,
      element: wormElement,
      x: position.x,
      y: position.y,
      baseSpeed: config.baseSpeed,
      roamDuration: config.roamDuration,
      fromConsole: false,
    });

    console.log(
      `✅ Border worm ${wormId} spawned at (${position.x.toFixed(
        0,
      )}, ${position.y.toFixed(0)})`,
    );

    return wormData;
  };

  proto.spawnPurpleWorm = function(helpButton, config) {
    let startX, startY;

    if (helpButton) {
      const helpRect = helpButton.getBoundingClientRect();
      startX = helpRect.left + helpRect.width / 2;
      startY = helpRect.top + helpRect.height / 2;
      console.log(
        `🟣 Purple worm spawning from help button at (${startX.toFixed(
          0,
        )}, ${startY.toFixed(0)})`,
      );
    } else {
      const position = this.factory.calculateFallbackSpawnPosition();
      startX = position.x;
      startY = position.y - 50;
      console.log("⚠️ Help button not found, using fallback position");
    }

    const wormId = this.generateUniqueId("purple-worm");

    const wormElement = this.factory.createWormElement({
      id: wormId,
      classNames: ["purple-worm"],
      segmentCount: config.segmentCount,
      x: startX,
      y: startY,
    });

    this.container.appendChild(wormElement);

    const wormData = this.factory.createWormData({
      id: wormId,
      element: wormElement,
      x: startX,
      y: startY,
      baseSpeed: config.baseSpeed,
      roamDuration: 0,
      isPurple: true,
      fromConsole: false,
    });

    console.log(
      `🟣 Purple worm ${wormId} spawned at (${startX.toFixed(
        0,
      )}, ${startY.toFixed(0)})`,
    );
    console.log(
      "🟣 Purple worm moves slower, prioritizes RED symbols, and CLONES on click!",
    );

    return wormData;
  };

  proto.spawnFallback = function(config) {
    const position = this.factory.calculateFallbackSpawnPosition();

    const wormId = this.generateUniqueId("worm");

    const wormElement = this.factory.createWormElement({
      id: wormId,
      classNames: [],
      segmentCount: config.segmentCount,
      x: position.x,
      y: position.y,
    });

    this.container.appendChild(wormElement);

    const wormData = this.factory.createWormData({
      id: wormId,
      element: wormElement,
      x: position.x,
      y: position.y,
      baseSpeed: config.baseSpeed,
      roamDuration: config.roamDuration,
      fromConsole: false,
    });

    console.log(`✅ Worm ${wormId} spawned (fallback mode)`);

    return wormData;
  };

  console.log("✅ Worm Spawn Coordinator spawners loaded");
})();
