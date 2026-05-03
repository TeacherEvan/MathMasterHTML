// js/worm-cursor-tracker.js - Global cursor tracking for worm evasion
console.log("🧭 Worm Cursor Tracker Loading...");

class WormCursorTracker {
  constructor(config = {}) {
    this.gameEvents = window.GameEvents || {
      WORM_CURSOR_TAP: "wormCursorTap",
      WORM_CURSOR_UPDATE: "wormCursorUpdate",
    };
    this.throttleMs = config.throttleMs ?? 16;
    this.emitTapEvents = config.emitTapEvents ?? true;

    this.cursorState = {
      x: 0,
      y: 0,
      isActive: false,
      pointerType: "mouse",
      lastUpdate: 0,
      lastTap: 0,
    };

    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._lastTapEvent = null;
  }

  start() {
    document.addEventListener("pointermove", this._onPointerMove, {
      passive: true,
    });
    document.addEventListener("pointerleave", this._onPointerLeave, {
      passive: true,
    });
    document.addEventListener("pointerdown", this._onPointerDown, {
      passive: true,
    });
    document.addEventListener("touchmove", this._onTouchMove, {
      passive: true,
    });
    document.addEventListener("touchstart", this._onTouchStart, {
      passive: true,
    });
    document.addEventListener("touchend", this._onTouchEnd, {
      passive: true,
    });
    document.addEventListener("touchcancel", this._onTouchEnd, {
      passive: true,
    });

    console.log("🧭 WormCursorTracker started");
  }

  stop() {
    document.removeEventListener("pointermove", this._onPointerMove);
    document.removeEventListener("pointerleave", this._onPointerLeave);
    document.removeEventListener("pointerdown", this._onPointerDown);
    document.removeEventListener("touchmove", this._onTouchMove);
    document.removeEventListener("touchstart", this._onTouchStart);
    document.removeEventListener("touchend", this._onTouchEnd);
    document.removeEventListener("touchcancel", this._onTouchEnd);
  }

  _readTouchPoint(event) {
    const touch = event.touches?.[0] || event.changedTouches?.[0];
    if (!touch) {
      return null;
    }

    const x = Number(touch.clientX);
    const y = Number(touch.clientY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }

    return { x, y };
  }

  _isGameplayTouchTarget(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return false;
    }

    return Boolean(
      target.closest(
        "#panel-c, #symbol-rain-container, #worm-container, .worm-container, .worm-muffin-reward, .falling-symbol",
      ),
    );
  }

  _shouldSuppressDuplicateTap(source, x, y, now) {
    const lastTapEvent = this._lastTapEvent;
    if (!lastTapEvent || lastTapEvent.source === source) {
      return false;
    }

    return (
      now - lastTapEvent.time < 450 &&
      Math.abs(lastTapEvent.x - x) <= 2 &&
      Math.abs(lastTapEvent.y - y) <= 2
    );
  }

  _recordTap(source, x, y, now) {
    this._lastTapEvent = { source, x, y, time: now };
  }

  _emitUpdate() {
    document.dispatchEvent(
      new CustomEvent(this.gameEvents.WORM_CURSOR_UPDATE, {
        detail: { ...this.cursorState },
      }),
    );
  }

  _emitTap() {
    if (!this.emitTapEvents) return;

    document.dispatchEvent(
      new CustomEvent(this.gameEvents.WORM_CURSOR_TAP, {
        detail: { ...this.cursorState },
      }),
    );
  }

  _onPointerMove(event) {
    const now = performance.now();
    if (now - this.cursorState.lastUpdate < this.throttleMs) return;

    this.cursorState = {
      x: event.clientX,
      y: event.clientY,
      isActive: true,
      pointerType: event.pointerType || "mouse",
      lastUpdate: now,
      lastTap: this.cursorState.lastTap,
    };

    this._emitUpdate();
  }

  _onPointerLeave() {
    this.cursorState.isActive = false;
    this._emitUpdate();
  }

  _onPointerDown(event) {
    const now = performance.now();
    if (
      this._shouldSuppressDuplicateTap(
        "pointer",
        event.clientX,
        event.clientY,
        now,
      )
    ) {
      return;
    }

    this.cursorState.lastTap = now;
    this.cursorState.pointerType =
      event.pointerType || this.cursorState.pointerType;
    this.cursorState.x = event.clientX;
    this.cursorState.y = event.clientY;
    this.cursorState.isActive = true;
    this._recordTap("pointer", event.clientX, event.clientY, now);

    this._emitTap();
    this._emitUpdate();
  }

  _onTouchMove(event) {
    if (!this._isGameplayTouchTarget(event)) {
      return;
    }

    const touchPoint = this._readTouchPoint(event);
    if (!touchPoint) {
      return;
    }

    const now = performance.now();
    if (now - this.cursorState.lastUpdate < this.throttleMs) return;

    this.cursorState = {
      x: touchPoint.x,
      y: touchPoint.y,
      isActive: true,
      pointerType: "touch",
      lastUpdate: now,
      lastTap: this.cursorState.lastTap,
    };

    this._emitUpdate();
  }

  _onTouchStart(event) {
    if (!this._isGameplayTouchTarget(event)) {
      return;
    }

    const touchPoint = this._readTouchPoint(event);
    if (!touchPoint) {
      return;
    }

    const now = performance.now();
    if (
      this._shouldSuppressDuplicateTap(
        "touch",
        touchPoint.x,
        touchPoint.y,
        now,
      )
    ) {
      return;
    }

    this.cursorState.lastTap = now;
    this.cursorState.pointerType = "touch";
    this.cursorState.x = touchPoint.x;
    this.cursorState.y = touchPoint.y;
    this.cursorState.isActive = true;
    this._recordTap("touch", touchPoint.x, touchPoint.y, now);

    this._emitTap();
    this._emitUpdate();
  }

  _onTouchEnd() {
    this.cursorState.isActive = false;
    this._emitUpdate();
  }
}

if (typeof window !== "undefined") {
  window.WormCursorTracker = WormCursorTracker;
}
