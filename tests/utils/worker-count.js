// @ts-check
/**
 * Worker count for the Playwright lane.
 *
 * The default lane runs the game page, which rasterises a canvas rain
 * animation and holds a WebGL context. A worker on a mobile profile
 * (devicePixelRatio 3) needs roughly a gigabyte, and the browser is killed
 * outright when the host runs out - which surfaces as a cascade of
 * "Target page, context or browser has been closed" failures that look
 * like product bugs.
 *
 * So the worker count is derived from what the machine actually has left,
 * not from the core count alone.
 */
import { cpus, freemem } from "node:os";

/** Rough per-worker footprint of a Playwright worker driving the game page. */
const PER_WORKER_BYTES = 1500 * 1024 * 1024;

/** Keep this much of the machine free for the browser and the desktop. */
const RESERVED_BYTES = 4 * 1024 * 1024 * 1024;

/** Never open more than this many browsers, whatever the machine looks like. */
const MAX_WORKERS = 4;

/**
 * @param {object} [options]
 * @param {number} [options.override] Force a worker count.
 * @returns {number}
 */
export function resolveWorkerCount(options = {}) {
  if (typeof options.override === "number" && options.override > 0) {
    return options.override;
  }

  const cores = Math.max(1, cpus().length);
  const byCpu = Math.max(1, Math.floor(cores / 2));

  const available = freemem();
  const byMemory = Math.max(
    1,
    Math.floor((available - RESERVED_BYTES) / PER_WORKER_BYTES),
  );

  return Math.max(1, Math.min(byCpu, byMemory, MAX_WORKERS));
}
