// src/scripts/symbol-rain.placement.js - Pure geometry for the symbol rain.
//
// Everything here is arithmetic over rects that the caller measured once per
// layout epoch. No DOM reads, no timers, no state outside the registry, which
// means the tiling invariants can be unit tested without a browser.
//
// Invariants:
//   1. A slot cell is never smaller than one symbol box, so two symbols placed
//      on different slots can never intersect.
//   2. A slot position (including its jitter) never leaves its own cell.
//   3. Chrome bands are reserved before the grid is computed, so nothing is
//      ever placed behind the HUD or the shortcut console.

(function attachSymbolRainPlacement() {
  const placement = (window.SymbolRainPlacement = window.SymbolRainPlacement || {});

  placement.DEFAULTS = Object.freeze({
    gapPx: 2,
    insetPx: 4,
    maxTopBandRatio: 0.4,
    maxBottomBandRatio: 0.5,
  });

  function isUsableRect(rect) {
    return Boolean(rect) && rect.width > 0 && rect.height > 0;
  }

  function overlapsHorizontally(a, b) {
    return a.right > b.left && a.left < b.right;
  }

  function overlapsVertically(a, b) {
    return a.bottom > b.top && a.top < b.bottom;
  }

  /**
   * Reserved chrome bands (top / bottom) measured against the rain container.
   * A rect counts only when it actually overlaps the container; it is treated
   * as a top band when its centre sits in the upper half, otherwise bottom.
   *
   * @returns {{top: number, bottom: number}} px reserved on each side
   */
  placement.computeChromeBands = function computeChromeBands(
    containerRect,
    chromeRects = [],
    options = {},
  ) {
    const config = { ...placement.DEFAULTS, ...options };
    const bands = { top: 0, bottom: 0 };

    if (!isUsableRect(containerRect)) {
      return bands;
    }

    const middle = containerRect.top + containerRect.height / 2;

    for (const rect of chromeRects) {
      if (!isUsableRect(rect)) {
        continue;
      }
      if (
        !overlapsHorizontally(rect, containerRect) ||
        !overlapsVertically(rect, containerRect)
      ) {
        continue;
      }

      const centre = rect.top + rect.height / 2;

      if (centre <= middle) {
        const reserved = Math.max(
          0,
          rect.bottom - containerRect.top + config.insetPx,
        );
        bands.top = Math.max(
          bands.top,
          Math.min(containerRect.height * config.maxTopBandRatio, reserved),
        );
      } else {
        const reserved = Math.max(
          0,
          containerRect.bottom - rect.top + config.insetPx,
        );
        bands.bottom = Math.max(
          bands.bottom,
          Math.min(containerRect.height * config.maxBottomBandRatio, reserved),
        );
      }
    }

    return bands;
  };

  /**
   * Builds the slot grid from the measured box and the reserved bands.
   * Returns null when the remaining playfield cannot fit a single box.
   */
  placement.computeGrid = function computeGrid({
    containerRect,
    box,
    bands = { top: 0, bottom: 0 },
    options = {},
  } = {}) {
    const config = { ...placement.DEFAULTS, ...options };

    if (!isUsableRect(containerRect) || !isUsableRect(box)) {
      return null;
    }

    const playableWidth = Math.max(0, containerRect.width - config.insetPx * 2);
    const playableHeight = Math.max(
      0,
      containerRect.height - bands.top - bands.bottom,
    );

    if (playableWidth <= 0 || playableHeight <= 0) {
      return null;
    }

    const cols = Math.max(
      1,
      Math.floor(playableWidth / (box.width + config.gapPx)),
    );
    const rows = Math.max(
      1,
      Math.floor(playableHeight / (box.height + config.gapPx)),
    );

    if (playableWidth < box.width || playableHeight < box.height) {
      return null;
    }

    return {
      containerRect,
      box,
      cols,
      rows,
      slotCount: cols * rows,
      cellWidth: playableWidth / cols,
      cellHeight: playableHeight / rows,
      originLeft: containerRect.left + config.insetPx,
      originTop: containerRect.top + bands.top,
      playableWidth,
      playableHeight,
    };
  };

  /**
   * Position of a slot, in translate coordinates relative to the container.
   * Jitter is confined to the cell's slack, so the invariant holds by
   * construction: `cell >= box`, therefore `slot + box <= cell edge`.
   */
  placement.slotPosition = function slotPosition(
    grid,
    slotIndex,
    random = Math.random,
  ) {
    if (!grid || !Number.isInteger(slotIndex) || slotIndex < 0) {
      return null;
    }

    const column = slotIndex % grid.cols;
    const row = Math.floor(slotIndex / grid.cols);
    if (row >= grid.rows) {
      return null;
    }

    const slackX = Math.max(0, grid.cellWidth - grid.box.width);
    const slackY = Math.max(0, grid.cellHeight - grid.box.height);

    return {
      left:
        grid.originLeft -
        grid.containerRect.left +
        column * grid.cellWidth +
        random() * slackX,
      top:
        grid.originTop -
        grid.containerRect.top +
        row * grid.cellHeight +
        random() * slackY,
    };
  };

  /** First/any free slot, or null when the field is saturated. */
  placement.findFreeSlot = function findFreeSlot(owners, random = Math.random) {
    if (!Array.isArray(owners) || owners.length === 0) {
      return null;
    }

    const free = [];
    for (let index = 0; index < owners.length; index += 1) {
      if (!owners[index]) {
        free.push(index);
      }
    }

    if (free.length === 0) {
      return null;
    }

    return free[Math.floor(random() * free.length)];
  };

  /**
   * Slot ownership bookkeeping. `owners[i]` holds either a claim token (while
   * a symbol is being created) or the symbol object (once bound).
   */
  placement.createRegistry = function createRegistry(size = 0) {
    const owners = new Array(Math.max(0, size)).fill(null);

    return {
      get owners() {
        return owners;
      },

      get size() {
        return owners.length;
      },

      reset(nextSize = 0) {
        const resolved = Math.max(0, nextSize);
        owners.length = resolved;
        for (let index = 0; index < resolved; index += 1) {
          owners[index] = null;
        }
      },

      claim(token, random = Math.random) {
        const slotIndex = placement.findFreeSlot(owners, random);
        if (slotIndex === null) {
          return null;
        }
        owners[slotIndex] = token;
        return slotIndex;
      },

      bind(slotIndex, token, owner) {
        if (owners[slotIndex] === token) {
          owners[slotIndex] = owner;
          return true;
        }
        return false;
      },

      release(slotIndex, owner) {
        if (owners[slotIndex] === owner) {
          owners[slotIndex] = null;
          return true;
        }
        return false;
      },

      count() {
        let total = 0;
        for (const owner of owners) {
          if (owner) {
            total += 1;
          }
        }
        return total;
      },
    };
  };
})();
