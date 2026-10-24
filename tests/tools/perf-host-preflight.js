// @ts-check
/**
 * Perf lane host preflight.
 *
 * The perf lanes compare wall-clock frame rate against the stored
 * baselines, so they only mean something on a host that is not busy with
 * anything else. A shared or loaded machine starves the renderer and the
 * lane reports a catastrophic regression that is really just contention.
 *
 * This check refuses to start the lane when the host is oversubscribed and
 * says so plainly, instead of producing a misleading number.
 */
import { readFileSync } from "node:fs";
import { cpus } from "node:os";

const CORES = Math.max(1, cpus().length);
// The lane drives one browser, which needs a core or two of its own. On a
// workstation the baseline load is already a couple of cores, so the host
// counts as busy when it is close to saturated rather than at half.
const LOAD_LIMIT = Math.max(1, Math.floor(CORES * 0.75));

function readLoadAverage() {
  try {
    const [load1] = readFileSync("/proc/loadavg", "utf8").trim().split(/\s+/);
    return Number.parseFloat(load1);
  } catch {
    return null;
  }
}

const load1 = readLoadAverage();

if (load1 === null) {
  console.log(
    "[perf-preflight] load average unavailable - continuing without the host check.",
  );
  process.exit(0);
}

if (load1 >= LOAD_LIMIT) {
  console.error(
    [
      "",
      "[perf-preflight] Refusing to run the perf lane: the host is busy.",
      `  1-minute load average: ${load1.toFixed(2)} (limit ${LOAD_LIMIT} for ${CORES} core${CORES === 1 ? "" : "s"})`,
      "",
      "  Frame rate measurement is only meaningful on a host that is not",
      "  running anything else - a parallel browser, a build or another",
      "  agent is enough to halve the measured fps. The lane would report",
      "  a catastrophic regression that is really just contention.",
      "",
      "  Wait for the host to settle and run the lane again, or run it on a",
      "  dedicated machine.",
      "",
    ].join("\n"),
  );
  process.exit(2);
}

console.log(
  `[perf-preflight] host is quiet (load ${load1.toFixed(2)} / ${CORES} cores) - running the perf lane.`,
);
