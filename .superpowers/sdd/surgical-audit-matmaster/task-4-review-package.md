TASK 4 REVIEW PACKAGE
====================
Plan: docs/plans/SurgicalAudit Matmaster.txt
BASE: 8c99e35
HEAD: f4c176d
Task: P1 — Fix Disguised PNG Binaries in .jpg Assets + Magic-Byte Header Check (Prompt 4)

--- git log --oneline BASE..HEAD ---
f4c176d P1: Remove disguised PNG .jpg assets + add magic-byte extension/content check

--- git diff --stat BASE..HEAD ---
 src/assets/images/Images/Gameplay3.jpg             | Bin 48053 -> 0 bytes
 src/assets/images/Images/Level select.jpg          | Bin 276537 -> 0 bytes
 .../scripts/verify/checks/manifest-screenshots.js  |  34 +++++++++++++++++++++
 .../verify/checks/manifest-screenshots.test.js     |  19 ++++++++++++
 src/tools/scripts/verify/verify.checks.js          |   2 +-
5 files changed, 54 insertions(+), 1 deletion(-)

--- git diff --name-status BASE..HEAD ---
D	src/assets/images/Images/Gameplay3.jpg
D	src/assets/images/Images/Level select.jpg
M	src/tools/scripts/verify/checks/manifest-screenshots.js
M	src/tools/scripts/verify/checks/manifest-screenshots.test.js
M	src/tools/scripts/verify/verify.checks.js

--- git diff -U10 BASE..HEAD ---
diff --git a/src/tools/scripts/verify/checks/manifest-screenshots.js b/src/tools/scripts/verify/checks/manifest-screenshots.js
+const PNG_MAGIC_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
+const JPEG_MAGIC_BYTES = Buffer.from([0xff, 0xd8, 0xff]);
+export function checkImageExtensionMatchesContent(filePath) { ... }
+(integrated into checkManifestScreenshots() before declaredType check)
diff --git a/src/tools/scripts/verify/checks/manifest-screenshots.test.js
+test("fails when .jpg file has PNG magic bytes (extension/content mismatch)") { ... }
+test("fails when .png file has JPEG magic bytes (extension/content mismatch)") { ... }
diff --git a/src/tools/scripts/verify/verify.checks.js
+export { checkManifestScreenshots, checkImageExtensionMatchesContent } from "./checks/manifest-screenshots.js";

Verified by implementer:
- `npm run verify` — ALL CHECKS PASSED (8/8), manifest screenshots valid (3)
- `node --check` on all 3 modified JS files — OK
- All 10 manifest-screenshots tests pass
- grep for Gameplay3.jpg / Level select.jpg in src/, tests/, service-worker.js, manifest.json — zero references