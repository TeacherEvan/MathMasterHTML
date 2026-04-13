import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const TESTS_DIR = "tests";
const TOP_LEVEL_SPEC_SUFFIX = ".spec.js";

const GROUPS = Object.freeze({
  boot: [
    "tests/startup-preload.spec.js",
    "tests/runtime-boot-orchestration.spec.js",
    "tests/onboarding-gates.spec.js",
    "tests/install-prompt.spec.js",
    "tests/service-worker-update.spec.js",
    "tests/settings-storage.spec.js",
    "tests/problem-loading.spec.js",
    "tests/tutorial-problem-loader.spec.js",
    "tests/tutorial-level-routing.spec.js",
    "tests/h2p-tutorial.spec.js",
    "tests/managers.spec.js",
    "tests/lock-components.spec.js",
  ],
  ui: [
    "tests/game-mobile-layout.spec.js",
    "tests/game-mobile-layout.ultranarrow.spec.js",
    "tests/game-portrait-device-contract.spec.js",
    "tests/ui-boundary.spec.js",
    "tests/ui-boundary-lifecycle.spec.js",
    "tests/level-select-interactions.spec.js",
    "tests/level-select-polish.spec.js",
    "tests/level-select-scoreboard.spec.js",
    "tests/level-select-settings.spec.js",
    "tests/game-settings-localization.spec.js",
    "tests/welcome-page-motion.spec.js",
    "tests/welcome-page-redesign.spec.js",
    "tests/welcome-scoreboard.spec.js",
  ],
  gameplay: [
    "tests/console-interactions.spec.js",
    "tests/gameplay-exit-guard.spec.js",
    "tests/gameplay-features.spec.js",
    "tests/powerups.spec.js",
    "tests/powerups-glitch.spec.js",
    "tests/symbol-rain.mobile.spec.js",
    "tests/worm-behavior.spec.js",
    "tests/worm-cursor-evasion.spec.js",
    "tests/worm-rewards-idempotency.spec.js",
    "tests/worm-rewards.spec.js",
    "tests/worm-stability.spec.js",
    "tests/lock-progression-moment.spec.js",
  ],
  evan: [
    "tests/evan-helper.controls.spec.js",
    "tests/evan-helper.flow.spec.js",
    "tests/evan-helper.symbols.spec.js",
    "tests/evan-helper.ui.spec.js",
    "tests/evan-helper.worms.spec.js",
    "tests/evan-helper.worms.purple.spec.js",
  ],
  drums: [
    "tests/drum-audio-loader.spec.js",
    "tests/drum-fallback.spec.js",
    "tests/drum-progressive.spec.js",
    "tests/drum-sequencer.spec.js",
  ],
  e2e: [
    "tests/e2e-full-game-critical.spec.js",
    "tests/e2e-full-game-stress.spec.js",
  ],
  perf: [
    "tests/lifecycle-audit.spec.js",
    "tests/lifecycle-hardening.spec.js",
    "tests/lifecycle-tracker.spec.js",
    "tests/performance-bench.spec.js",
    "tests/perf-scenarios.spec.js",
  ],
});

function validateGroups() {
  const seen = new Map();
  const duplicates = [];
  const missing = [];
  const outOfScope = [];
  const topLevelSpecs = getTopLevelSpecs();
  const topLevelSpecSet = new Set(topLevelSpecs);

  for (const [groupName, specs] of Object.entries(GROUPS)) {
    for (const spec of specs) {
      const absolutePath = resolve(process.cwd(), spec);
      if (!existsSync(absolutePath)) {
        missing.push(groupName + ": " + spec);
      } else if (!topLevelSpecSet.has(spec)) {
        outOfScope.push(groupName + ": " + spec);
      }

      if (seen.has(spec)) {
        duplicates.push(spec + " (" + seen.get(spec) + " and " + groupName + ")");
      } else {
        seen.set(spec, groupName);
      }
    }
  }

  const ungrouped = topLevelSpecs.filter((spec) => !seen.has(spec));

  if (
    missing.length > 0 ||
    duplicates.length > 0 ||
    outOfScope.length > 0 ||
    ungrouped.length > 0
  ) {
    if (missing.length > 0) {
      console.error("Missing spec files:\n" + missing.join("\n"));
    }
    if (duplicates.length > 0) {
      console.error("Duplicate spec assignments:\n" + duplicates.join("\n"));
    }
    if (outOfScope.length > 0) {
      console.error(
        "Out-of-scope split assignments (expected top-level tests/*.spec.js only):\n" +
          outOfScope.join("\n"),
      );
    }
    if (ungrouped.length > 0) {
      console.error(
        "Ungrouped top-level Playwright specs:\n" + ungrouped.join("\n"),
      );
    }
    return false;
  }

  return true;
}

function getTopLevelSpecs() {
  const testsDir = resolve(process.cwd(), TESTS_DIR);
  return readdirSync(testsDir, { withFileTypes: true })
    .filter(
      (entry) => entry.isFile() && entry.name.endsWith(TOP_LEVEL_SPEC_SUFFIX),
    )
    .map((entry) => TESTS_DIR + "/" + entry.name)
    .sort();
}

function printGroups() {
  console.log("Playwright split groups:\n");
  for (const [groupName, specs] of Object.entries(GROUPS)) {
    console.log(groupName + ": " + specs.length + " specs");
    for (const spec of specs) {
      console.log("  - " + spec);
    }
    console.log("");
  }
}

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "--help" || command === "-h") {
  console.log("Usage: node tests/run-playwright-group.js <group>|--list|--check [-- <playwright args>]");
  process.exit(0);
}

if (command === "--list") {
  printGroups();
  process.exit(0);
}

if (command === "--check") {
  const ok = validateGroups();
  process.exit(ok ? 0 : 1);
}

const specs = GROUPS[command];
if (!specs) {
  console.error("Unknown group: " + command);
  printGroups();
  process.exit(1);
}

if (!validateGroups()) {
  process.exit(1);
}

const forwardedArgs = args.slice(1).filter((arg) => arg !== "--");
const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["playwright", "test", ...specs, ...forwardedArgs],
  {
    stdio: "inherit",
    env: process.env,
    cwd: process.cwd(),
  },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
