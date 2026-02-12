// src/tools/scripts/verify/verify.logging.js

export const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

export function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

export function logSection(title) {
  console.log("\n" + "=".repeat(50));
  log(`  ${title}`, "cyan");
  console.log("=".repeat(50));
}

export function logResult(check, passed, detail = "") {
  const icon = passed ? "✅" : "❌";
  const color = passed ? "green" : "red";
  log(`${icon} ${check}${detail ? ` - ${detail}` : ""}`, color);
  return passed;
}
