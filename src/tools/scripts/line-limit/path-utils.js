// src/tools/scripts/line-limit/path-utils.js

export function normalizeRelPath(p) {
  return String(p).replace(/\\/g, "/");
}

export function toWindowsRelPath(p) {
  return String(p).replace(/\//g, "\\");
}
