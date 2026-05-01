import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { log, logSection } from "../verify.logging.js";

const JPEG_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

function normalizeMimeType(type) {
  if (typeof type !== "string") {
    return null;
  }

  const normalized = type.trim().toLowerCase();
  if (normalized === "image/png") {
    return normalized;
  }

  if (normalized === "image/jpeg" || normalized === "image/jpg") {
    return "image/jpeg";
  }

  return null;
}

function parseDeclaredSize(sizes) {
  const match = /^\s*(\d+)x(\d+)\s*$/i.exec(sizes || "");
  if (!match) {
    return null;
  }

  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

function resolveManifestAssetPath(rootDir, assetSrc) {
  if (typeof assetSrc !== "string" || assetSrc.trim().length === 0) {
    return null;
  }

  try {
    const baseUrl = new URL("https://mathmaster.local");
    const assetUrl = new URL(assetSrc, baseUrl);
    if (assetUrl.origin !== baseUrl.origin) {
      return null;
    }

    const relativePath = decodeURIComponent(assetUrl.pathname).replace(/^[/\\]+/, "");
    return relativePath ? join(rootDir, relativePath) : null;
  } catch {
    return null;
  }
}

function readPngMetadata(buffer) {
  if (buffer.length < 24 || buffer.readUInt32BE(12) !== 0x49484452) {
    throw new Error("Invalid PNG header");
  }

  return {
    mimeType: "image/png",
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function readJpegMetadata(buffer) {
  let offset = 2;

  while (offset < buffer.length) {
    while (offset < buffer.length && buffer[offset] !== 0xff) {
      offset += 1;
    }
    while (offset < buffer.length && buffer[offset] === 0xff) {
      offset += 1;
    }

    if (offset >= buffer.length) {
      break;
    }

    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    if (offset + 1 >= buffer.length) {
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      break;
    }

    if (JPEG_MARKERS.has(marker)) {
      return {
        mimeType: "image/jpeg",
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3),
      };
    }

    offset += segmentLength;
  }

  throw new Error("Unsupported JPEG header");
}

function readImageMetadata(filePath) {
  const buffer = readFileSync(filePath);
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return readPngMetadata(buffer);
  }

  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return readJpegMetadata(buffer);
  }

  throw new Error("Unsupported image format");
}

export function checkManifestScreenshots(rootDir, options = {}) {
  const { logFn = log, logSectionFn = logSection } = options;

  logSectionFn("MANIFEST SCREENSHOTS");

  const manifestPath = join(rootDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    logFn("❌ manifest.json not found!", "red");
    return false;
  }

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const screenshots = manifest?.screenshots;
    if (!Array.isArray(screenshots) || screenshots.length === 0) {
      logFn("❌ manifest.json is missing screenshots", "red");
      return false;
    }

    let passed = true;
    for (const [index, screenshot] of screenshots.entries()) {
      const prefix = `screenshots[${index}]`;
      const filePath = resolveManifestAssetPath(rootDir, screenshot?.src);
      const declaredType = normalizeMimeType(screenshot?.type);
      const declaredSize = parseDeclaredSize(screenshot?.sizes);

      if (!filePath) {
        logFn(`❌ ${prefix} has invalid src: ${screenshot?.src || "(missing)"}`, "red");
        passed = false;
        continue;
      }

      if (!existsSync(filePath)) {
        logFn(`❌ ${prefix} file not found: ${screenshot.src}`, "red");
        passed = false;
        continue;
      }

      if (!declaredType) {
        logFn(`❌ ${prefix} has unsupported type: ${screenshot?.type || "(missing)"}`, "red");
        passed = false;
        continue;
      }

      if (!declaredSize) {
        logFn(`❌ ${prefix} has invalid sizes: ${screenshot?.sizes || "(missing)"}`, "red");
        passed = false;
        continue;
      }

      try {
        const actualImage = readImageMetadata(filePath);
        if (actualImage.mimeType !== declaredType) {
          logFn(`❌ ${prefix} type mismatch: declared ${declaredType}, found ${actualImage.mimeType}`, "red");
          passed = false;
        }

        if (actualImage.width !== declaredSize.width || actualImage.height !== declaredSize.height) {
          logFn(
            `❌ ${prefix} size mismatch: declared ${declaredSize.width}x${declaredSize.height}, found ${actualImage.width}x${actualImage.height}`,
            "red",
          );
          passed = false;
        }
      } catch (error) {
        logFn(`❌ ${prefix} could not be read: ${error.message}`, "red");
        passed = false;
      }
    }

    if (passed) {
      logFn(`✅ manifest screenshots valid (${screenshots.length})`, "green");
    }

    return passed;
  } catch (error) {
    logFn(`❌ Invalid JSON: ${error.message}`, "red");
    return false;
  }
}