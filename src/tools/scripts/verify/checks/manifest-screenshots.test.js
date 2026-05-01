import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { checkManifestScreenshots } from "./manifest-screenshots.js";

function withTempRepo(run) {
  const rootDir = mkdtempSync(join(tmpdir(), "mathmaster-manifest-"));
  try {
    run(rootDir);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
}

function writeRepoFile(rootDir, relativePath, content) {
  const filePath = join(rootDir, relativePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
}

function writeManifest(rootDir, screenshots) {
  writeRepoFile(rootDir, "manifest.json", JSON.stringify({ screenshots }, null, 2));
}

function createPngBuffer(width, height) {
  const buffer = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function createJpegBuffer(width, height) {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
    0xff, 0xd9,
  ]);
}

function runCheck(rootDir) {
  return checkManifestScreenshots(rootDir, {
    logFn: () => {},
    logSectionFn: () => {},
  });
}

test("fails when manifest.json is missing", () => {
  withTempRepo((rootDir) => {
    assert.equal(runCheck(rootDir), false);
  });
});

test("fails when manifest.json contains invalid JSON", () => {
  withTempRepo((rootDir) => {
    writeRepoFile(rootDir, "manifest.json", "{not valid json}");
    assert.equal(runCheck(rootDir), false);
  });
});

test("fails when screenshots are missing", () => {
  withTempRepo((rootDir) => {
    writeRepoFile(rootDir, "manifest.json", JSON.stringify({ name: "Math Master" }));
    assert.equal(runCheck(rootDir), false);
  });
});

test("fails when a screenshot file does not exist", () => {
  withTempRepo((rootDir) => {
    writeManifest(rootDir, [{ src: "/shots/missing.png", sizes: "2x1", type: "image/png" }]);
    assert.equal(runCheck(rootDir), false);
  });
});

test("fails when declared type does not match the file format", () => {
  withTempRepo((rootDir) => {
    writeRepoFile(rootDir, "shots/screen.png", createPngBuffer(2, 1));
    writeManifest(rootDir, [{ src: "/shots/screen.png", sizes: "2x1", type: "image/jpeg" }]);
    assert.equal(runCheck(rootDir), false);
  });
});

test("fails when declared sizes do not match image dimensions", () => {
  withTempRepo((rootDir) => {
    writeRepoFile(rootDir, "shots/screen.png", createPngBuffer(2, 1));
    writeManifest(rootDir, [{ src: "/shots/screen.png", sizes: "1x1", type: "image/png" }]);
    assert.equal(runCheck(rootDir), false);
  });
});

test("passes for PNG screenshots with encoded paths", () => {
  withTempRepo((rootDir) => {
    writeRepoFile(rootDir, "shots/My shot.png", createPngBuffer(2, 1));
    writeManifest(rootDir, [{ src: "/shots/My%20shot.png", sizes: "2x1", type: "image/png" }]);
    assert.equal(runCheck(rootDir), true);
  });
});

test("passes for JPG screenshots", () => {
  withTempRepo((rootDir) => {
    writeRepoFile(rootDir, "shots/photo.jpg", createJpegBuffer(3, 2));
    writeManifest(rootDir, [{ src: "/shots/photo.jpg", sizes: "3x2", type: "image/jpeg" }]);
    assert.equal(runCheck(rootDir), true);
  });
});