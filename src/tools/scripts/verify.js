#!/usr/bin/env node
/**
 * MathMaster Project Health Verification Script
 *
 * Usage: npm run verify
 */

import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import {
  checkCriticalFiles,
  checkDocumentation,
  checkESLint,
  checkLineLimits,
  checkPackageJson,
  generateStats,
} from "./verify/verify.checks.js";
import { log, logResult, logSection } from "./verify/verify.logging.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..", "..", "..");

// ============================================
// MAIN
// ============================================

async function main() {
  console.log("\n");
  log("🔍 MathMaster Project Verification", "bold");
  log(`   Running from: ${ROOT}`, "cyan");
  log(`   Date: ${new Date().toISOString()}`, "cyan");

  const results = {
    criticalFiles: checkCriticalFiles(ROOT),
    eslint: checkESLint(ROOT),
    packageJson: checkPackageJson(ROOT),
    documentation: checkDocumentation(ROOT),
    lineLimit200: checkLineLimits(ROOT, "baseline"),
  };

  generateStats(ROOT);

  // Summary
  logSection("VERIFICATION SUMMARY");

  const checks = Object.entries(results);
  const passed = checks.filter(([_, v]) => v).length;
  const failed = checks.filter(([_, v]) => !v).length;

  for (const [name, result] of checks) {
    logResult(name.replace(/([A-Z])/g, " $1").trim(), result);
  }

  console.log("\n" + "-".repeat(50));

  if (failed === 0) {
    log(`\n🎉 ALL CHECKS PASSED! (${passed}/${checks.length})`, "green");
    process.exit(0);
  } else {
    log(
      `\n⚠️  ${failed} CHECK(S) FAILED (${passed}/${checks.length} passed)`,
      "red",
    );
    process.exit(1);
  }
}

main().catch((e) => {
  log(`\n💥 Verification crashed: ${e.message}`, "red");
  process.exit(1);
});
