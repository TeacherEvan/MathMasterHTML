// js/worm-cursor-tracker.js - Global cursor tracking for worm evasion
console.log("🧭 Worm Cursor Tracker Loading...");

class WormCursorTracker {
  constructor(config = {}) {
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

    console.log("🧭 WormCursorTracker started");
  }

  stop() {
    document.removeEventListener("pointermove", this._onPointerMove);
    document.removeEventListener("pointerleave", this._onPointerLeave);
    document.removeEventListener("pointerdown", this._onPointerDown);
  }

  _emitUpdate() {
    document.dispatchEvent(
      new CustomEvent("wormCursorUpdate", {
        detail: { ...this.cursorState },
      }),
    );
  }

  _emitTap() {
    if (!this.emitTapEvents) return;

    document.dispatchEvent(
      new CustomEvent("wormCursorTap", {
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
    this.cursorState.lastTap = performance.now();
    this.cursorState.pointerType =
      event.pointerType || this.cursorState.pointerType;
    this.cursorState.x = event.clientX;
    this.cursorState.y = event.clientY;
    this.cursorState.isActive = true;

    this._emitTap();
    this._emitUpdate();
  }
}

if (typeof window !== "undefined") {
  window.WormCursorTracker = WormCursorTracker;
}
