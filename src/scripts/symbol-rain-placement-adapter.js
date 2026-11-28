// symbol-rain-placement-adapter.js - DOM ↔ placement bridge (measure, rebuild, slot registry wiring)

(function () {
  "use strict";

  const SymbolRainPlacementAdapter = (function () {
    // CHROME_SELECTORS - elements that block rain slots
    const CHROME_SELECTORS = [
      "#game-hud",
      "#panel-c .panel-c-console-zone",
      "#back-button",
      "#audio-toggle",
    ];

    /**
     * Create a placement adapter bound to the given state and modules.
     * @param {object} state - Shared mutable state from controller
     * @param {object} modules - { SymbolRainConfig, SymbolRainHelpers, SymbolRainPlacement, symbolRainContainer }
     * @returns {object} adapter with rebuild, claim, bind, release, reconcile, getSlotPosition
     */
    function createPlacementAdapter(state, modules) {
      const { SymbolRainConfig, SymbolRainHelpers, SymbolRainPlacement, symbolRainContainer } = modules;

      // Slot registry - created once, reset on layout change
      const slotRegistry = SymbolRainPlacement.createRegistry(0);
      state.slotOwners = slotRegistry.owners; // observability alias

      /**
       * Measure a live glyph for accurate box dimensions.
       * @returns {object} { width, height, padX, padY, measured }
       */
      function readSymbolBox() {
        const visibleProbe = state.activeFallingSymbols.find(
          (symbolObj) =>
            symbolObj?.element?.isConnected &&
            symbolObj.element.dataset?.symbolState === "visible",
        )?.element;
        const probe =
          visibleProbe || symbolRainContainer?.querySelector?.(".falling-symbol");
        const containerWidth = getContainerBounds()?.width || Infinity;
        const width = probe?.offsetWidth || 0;
        const height = probe?.offsetHeight || 0;

        if (width > 0 && height > 0 && width <= containerWidth * 0.5) {
          const computed = window.getComputedStyle(probe);
          return {
            width,
            height,
            padX: Math.round(parseFloat(computed.paddingLeft) || 0),
            padY: Math.round(parseFloat(computed.paddingTop) || 0),
            measured: true,
          };
        }

        return {
          width: Math.max(1, SymbolRainConfig.symbolWidth || 44),
          height: Math.max(1, SymbolRainConfig.symbolHeight || 50),
          padX: 0,
          padY: 0,
          measured: false,
        };
      }

      /**
       * Get bounding rects of chrome elements that obstruct the rain field.
       * @returns {DOMRect[]}
       */
      function readChromeRects() {
        const rects = [];
        for (const selector of CHROME_SELECTORS) {
          const element = document.querySelector(selector);
          if (!element?.getBoundingClientRect) continue;
          const rect = element.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) rects.push(rect);
        }
        return rects;
      }

      /**
       * Get container bounds.
       * @returns {DOMRect|null}
       */
      function getContainerBounds() {
        return symbolRainContainer?.getBoundingClientRect?.() || null;
      }

      /**
       * Rebuild the placement layout (chrome bands → grid → registry).
       * @returns {boolean} true if layout was created
       */
      function rebuildPlacementLayout() {
        const containerRect = getContainerBounds();
        const box = readSymbolBox();
        const bands = SymbolRainPlacement.computeChromeBands(
          containerRect,
          readChromeRects(),
        );
        const grid = SymbolRainPlacement.computeGrid({
          containerRect,
          box,
          bands,
        });

        if (!grid) {
          state.layout = null;
          return false;
        }

        state.layout = grid;

        if (slotRegistry.size !== grid.slotCount) {
          slotRegistry.reset(grid.slotCount);
        }

        // Keep legacy config readers honest
        SymbolRainConfig.symbolWidth = box.width;
        SymbolRainConfig.symbolHeight = box.height;

        return true;
      }

      /**
       * Get screen position for a slot index.
       * @param {number} slotIndex
       * @returns {{left:number, top:number}|null}
       */
      function getSlotPosition(slotIndex) {
        const position = SymbolRainPlacement.slotPosition(state.layout, slotIndex);
        if (!position || !state.layout) return null;
        return {
          left: position.left + (state.layout.box.padX || 0),
          top: position.top + (state.layout.box.padY || 0),
        };
      }

      /**
       * Release a symbol's slot back to the registry.
       * @param {object} symbolObj
       */
      function releaseSymbolSlot(symbolObj) {
        if (!symbolObj || !Number.isInteger(symbolObj.slotIndex)) return;
        slotRegistry.release(symbolObj.slotIndex, symbolObj);
        symbolObj.slotIndex = null;
      }

      /**
       * Claim a free slot for a new symbol.
       * @returns {{slotIndex, token, left, top}|null}
       */
      function claimSlot() {
        const needsRebuild =
          !state.layout ||
          state.layout.box?.measured !== true ||
          slotRegistry.size === 0;

        if (needsRebuild && !rebuildPlacementLayout()) {
          return null;
        }

        const token = { slotIndex: null };
        const slotIndex = slotRegistry.claim(token);
        if (slotIndex === null) return null;

        token.slotIndex = slotIndex;
        const position = getSlotPosition(slotIndex);
        if (!position) {
          slotRegistry.release(slotIndex, token);
          return null;
        }

        return { slotIndex, token, left: position.left, top: position.top };
      }

      /**
       * Bind a claimed slot to a symbol object.
       * @param {object} claim
       * @param {object} symbolObj
       */
      function bindSlotToSymbol(claim, symbolObj) {
        if (!claim || !symbolObj) return;
        if (slotRegistry.bind(claim.slotIndex, claim.token, symbolObj)) {
          symbolObj.slotIndex = claim.slotIndex;
        }
      }

      /**
       * Release a slot claim without binding.
       * @param {object} claim
       */
      function releaseSlotClaim(claim) {
        if (!claim) return;
        slotRegistry.release(claim.slotIndex, claim.token);
      }

      /**
       * Atomic layout swap: rebuild grid, reassign visible symbols to new slots.
       * Surplus symbols are hidden and scheduled for resurface.
       */
      function reconcileVisibleSlots() {
        const previousLayout = state.layout;
        if (!rebuildPlacementLayout()) {
          state.layout = previousLayout;
          return;
        }

        for (const symbolObj of state.activeFallingSymbols) {
          if (symbolObj?.element?.dataset?.symbolState !== "visible") continue;

          const claim = claimSlot();
          if (!claim) {
            releaseSymbolSlot(symbolObj);
            setSymbolLifecycleState(symbolObj, "hidden");
            state.spatialGrid?.remove?.(symbolObj);
            scheduleHiddenResurface(symbolObj);
            continue;
          }

          releaseSymbolSlot(symbolObj);
          bindSlotToSymbol(claim, symbolObj);
          SymbolRainHelpers.setSymbolPosition(symbolObj.element, claim.left, claim.top);
          symbolObj.x = claim.left;
          symbolObj.y = claim.top;
          symbolObj.column = Math.max(
            0,
            Math.floor(claim.left / (SymbolRainConfig.columnWidth || symbolObj.x || 1)),
          );
          state.spatialGrid?.update?.([symbolObj]);
        }
      }

      // These are forwarded from controller (setSymbolLifecycleState, scheduleHiddenResurface)
      // They'll be attached after controller creates the adapter.
      let setSymbolLifecycleState = () => {};
      let scheduleHiddenResurface = () => {};

      function setLifecycleCallbacks(callbacks) {
        setSymbolLifecycleState = callbacks.setSymbolLifecycleState;
        scheduleHiddenResurface = callbacks.scheduleHiddenResurface;
      }

      return {
        rebuildPlacementLayout,
        getSlotPosition,
        releaseSymbolSlot,
        claimSlot,
        bindSlotToSymbol,
        releaseSlotClaim,
        reconcileVisibleSlots,
        setLifecycleCallbacks,
        get slotRegistry() { return slotRegistry; },
      };
    }

    return { createPlacementAdapter };
  })();

  window.SymbolRainPlacementAdapter = SymbolRainPlacementAdapter;
})();