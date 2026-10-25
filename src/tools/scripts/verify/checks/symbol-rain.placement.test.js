import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const placementScriptPath = resolve(
  __dirname,
  "../../../../scripts/symbol-rain.placement.js",
);
const placementSource = readFileSync(placementScriptPath, "utf8");

function loadPlacement() {
  const context = vm.createContext({ console, window: {} });
  vm.runInContext(placementSource, context, { filename: placementScriptPath });
  return context.window.SymbolRainPlacement;
}

function rect(left, top, width, height) {
  return { left, top, right: left + width, bottom: top + height, width, height };
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

test("chrome bands ignore rects that do not overlap the rain container", () => {
  const placement = loadPlacement();
  const container = rect(500, 100, 300, 300);

  const bands = placement.computeChromeBands(container, [
    rect(0, 0, 100, 50), // left of the container
    rect(900, 0, 100, 50), // right of the container
    rect(0, 700, 100, 50), // below the container
  ]);

  assert.deepEqual({ ...bands }, { top: 0, bottom: 0 });
});

test("chrome bands reserve the HUD at the top and the console at the bottom", () => {
  const placement = loadPlacement();
  const container = rect(0, 0, 400, 400);

  const bands = placement.computeChromeBands(container, [
    rect(0, 0, 400, 40), // HUD band
    rect(0, 340, 400, 60), // console band
  ]);

  // 40px HUD + 4px inset, 60px console + 4px inset.
  assert.equal(bands.top, 44);
  assert.equal(bands.bottom, 64);
});

test("chrome bands clamp so chrome can never eat the whole playfield", () => {
  const placement = loadPlacement();
  const container = rect(0, 0, 400, 400);

  const bands = placement.computeChromeBands(container, [
    rect(0, 0, 400, 390), // absurd full-height top overlay
    rect(0, 10, 400, 390), // absurd full-height bottom overlay
  ]);

  assert.ok(bands.top <= 400 * placement.DEFAULTS.maxTopBandRatio);
  assert.ok(bands.bottom <= 400 * placement.DEFAULTS.maxBottomBandRatio);
});

test("grid cells are never smaller than the symbol box", () => {
  const placement = loadPlacement();
  const container = rect(531, 97, 310, 232);
  const box = { width: 44, height: 44 };

  const grid = placement.computeGrid({
    containerRect: container,
    box,
    bands: { top: 0, bottom: 18 },
  });

  assert.ok(grid, "expected a usable grid");
  assert.ok(grid.cellWidth >= box.width);
  assert.ok(grid.cellHeight >= box.height);
  assert.equal(grid.cols * grid.rows, grid.slotCount);
});

test("slot positions, including jitter, stay inside their own cell", () => {
  const placement = loadPlacement();
  const container = rect(0, 0, 302, 214);
  const box = { width: 44, height: 44 };
  const grid = placement.computeGrid({ containerRect: container, box });

  assert.ok(grid);
  const random = seededRandom(42);

  for (let slotIndex = 0; slotIndex < grid.slotCount; slotIndex += 1) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const position = placement.slotPosition(grid, slotIndex, random);
      const column = slotIndex % grid.cols;
      const row = Math.floor(slotIndex / grid.cols);
      const cellLeft = grid.originLeft - grid.containerRect.left + column * grid.cellWidth;
      const cellTop = grid.originTop - grid.containerRect.top + row * grid.cellHeight;

      assert.ok(position.left >= cellLeft - 0.001, "jitter escaped the cell left edge");
      assert.ok(
        position.left + box.width <= cellLeft + grid.cellWidth + 0.001,
        "jitter escaped the cell right edge",
      );
      assert.ok(position.top >= cellTop - 0.001, "jitter escaped the cell top edge");
      assert.ok(
        position.top + box.height <= cellTop + grid.cellHeight + 0.001,
        "jitter escaped the cell bottom edge",
      );
    }
  }
});

test("two different slots can never produce intersecting boxes", () => {
  const placement = loadPlacement();
  const container = rect(0, 0, 435, 858);
  const box = { width: 44, height: 44 };
  const grid = placement.computeGrid({ containerRect: container, box });
  const random = seededRandom(7);

  const placed = [];
  for (let slotIndex = 0; slotIndex < grid.slotCount; slotIndex += 1) {
    const position = placement.slotPosition(grid, slotIndex, random);
    placed.push({
      left: position.left,
      top: position.top,
      right: position.left + box.width,
      bottom: position.top + box.height,
    });
  }

  for (let first = 0; first < placed.length; first += 1) {
    for (let second = first + 1; second < placed.length; second += 1) {
      const a = placed[first];
      const b = placed[second];
      const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      assert.ok(
        overlapX <= 0 || overlapY <= 0,
        `slots ${first} and ${second} intersect by ${overlapX}x${overlapY}`,
      );
    }
  }
});

test("slot positions are rejected for out-of-range indices", () => {
  const placement = loadPlacement();
  const grid = placement.computeGrid({
    containerRect: rect(0, 0, 200, 200),
    box: { width: 44, height: 44 },
  });

  assert.equal(placement.slotPosition(grid, -1), null);
  assert.equal(placement.slotPosition(grid, grid.slotCount), null);
  assert.equal(placement.slotPosition(null, 0), null);
});

test("findFreeSlot reports saturation instead of reusing an occupied slot", () => {
  const placement = loadPlacement();

  assert.equal(placement.findFreeSlot([null, null], () => 0), 0);
  assert.equal(placement.findFreeSlot([{}], () => 0), null);
  assert.equal(placement.findFreeSlot([], () => 0), null);
});

test("registry claim/bind/release keeps one owner per slot", () => {
  const placement = loadPlacement();
  const registry = placement.createRegistry(2);
  const random = seededRandom(3);

  const firstToken = { id: "first" };
  const firstSlot = registry.claim(firstToken, random);
  assert.equal(typeof firstSlot, "number");

  const firstSymbol = { name: "symbol-a" };
  assert.equal(registry.bind(firstSlot, firstToken, firstSymbol), true);
  assert.equal(registry.owners[firstSlot], firstSymbol);

  const secondToken = { id: "second" };
  const secondSlot = registry.claim(secondToken, random);
  assert.notEqual(secondSlot, firstSlot);
  assert.equal(registry.claim({ id: "third" }, random), null);

  assert.equal(registry.release(secondSlot, secondToken), true);
  assert.equal(registry.count(), 1);

  // A release from a non-owner must not evict the real owner.
  assert.equal(registry.release(firstSlot, secondToken), false);
  assert.equal(registry.owners[firstSlot], firstSymbol);
});

test("registry reset preserves the owner array identity for observers", () => {
  const placement = loadPlacement();
  const registry = placement.createRegistry(3);
  const ownersRef = registry.owners;
  registry.claim({ id: "a" }, () => 0);

  registry.reset(5);

  assert.equal(registry.owners, ownersRef, "reset must mutate in place");
  assert.equal(registry.size, 5);
  assert.equal(registry.count(), 0);
});
