// src/tools/scripts/verify/checks/package-json.js

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { log, logSection } from "../verify.logging.js";

export function checkPackageJson(rootDir) {
  logSection("PACKAGE.JSON VALIDATION");

  const pkgPath = join(rootDir, "package.json");
  if (!existsSync(pkgPath)) {
    log("❌ package.json not found!", "red");
    return false;
  }

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    let passed = true;

    const requiredFields = ["name", "version", "description", "scripts"];
    for (const field of requiredFields) {
      if (!pkg[field]) {
        log(`❌ Missing field: ${field}`, "red");
        passed = false;
      }
    }

    const requiredScripts = ["start", "lint", "verify"];
    for (const script of requiredScripts) {
      if (!pkg.scripts?.[script]) {
        log(`❌ Missing script: ${script}`, "red");
        passed = false;
      }
    }

    if (passed) {
      log("✅ package.json valid", "green");
      log(`   Name: ${pkg.name}`, "cyan");
      log(`   Version: ${pkg.version}`, "cyan");
    }

    return passed;
  } catch (e) {
    log(`❌ Invalid JSON: ${e.message}`, "red");
    return false;
  }
}
