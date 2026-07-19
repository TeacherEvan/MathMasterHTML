// @ts-check
import { defineConfig, devices } from "@playwright/test";

const smokeFiles = ["lock-components.spec.js", "managers.spec.js"];

// Chromium-only launch hardening. chrome-headless-shell segfaults intermittently
// (signal 11 SEGV_MAPERR) on some kernels; the full Chromium in new headless mode
// (channel: "chromium") is the documented stable workaround. Scoped to chromium
// projects only — webkit/firefox projects must NOT inherit channel: "chromium"
// (Playwright throws "chromium channel can only be launched when launching Chromium").
const chromiumLaunch = {
  launchOptions: {
    args: ["--disable-dev-shm-usage"],
  },
  channel: "chromium",
};

export default defineConfig({
  testDir: "./tests",
  testIgnore: ["**/unit/**", "**/integration/**", "**/performance/**"],
  outputDir: "test-results/competition",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  preserveOutput: "failures-only",
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ["html", { outputFolder: "playwright-report/competition", open: "never" }],
    ["json", { outputFile: "test-results.competition.json" }],
  ],
  metadata: {
    lane: "competition",
    seed: process.env.MM_TEST_SEED ?? "mathmaster-default-seed",
  },
  use: {
    baseURL: "http://localhost:8000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    testIdAttribute: "data-testid",
  },
  projects: [
    {
      name: "qa-smoke-chromium",
      testMatch: smokeFiles,
      use: { ...devices["Desktop Chrome"], ...chromiumLaunch },
    },
    {
      name: "qa-smoke-pixel-7",
      testMatch: smokeFiles,
      use: { ...devices["Pixel 7"], ...chromiumLaunch },
    },
    {
      name: "qa-perf-smoke",
      testMatch: [
        "performance-bench.spec.js",
        "lifecycle-tracker.spec.js",
        "lifecycle-audit.spec.js",
      ],
      use: {
        ...devices["Desktop Chrome"],
        ...chromiumLaunch,
        trace: "off",
        screenshot: "off",
        video: "off",
      },
    },
    {
      name: "qa-matrix-chromium",
      use: { ...devices["Desktop Chrome"], ...chromiumLaunch },
    },
    {
      name: "qa-soak-webkit",
      testMatch: ["symbol-rain.live-targets.spec.js"],
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "qa-soak-firefox",
      testMatch: ["symbol-rain.live-targets.spec.js"],
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "qa-matrix-iphone-13",
      use: {
        ...devices["iPhone 13"],
        ...chromiumLaunch,
        viewport: { width: 844, height: 390 },
        screen: { width: 844, height: 390 },
      },
    },
    {
      name: "qa-matrix-pixel-7",
      use: { ...devices["Pixel 7"], ...chromiumLaunch },
    },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:8000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  globalSetup: "./tests/global-setup.js",
  snapshotDir: "./tests/snapshots/competition",
  snapshotPathTemplate: "{snapshotDir}/{testFilePath}/{arg}{ext}",
});
