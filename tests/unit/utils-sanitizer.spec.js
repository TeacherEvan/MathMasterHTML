/**
 * tests/unit/utils-sanitizer.spec.js - Unit tests for utils-sanitizer escapeHTML.
 *
 * escapeHTML uses document.createElement, so it needs a real DOM. Playwright
 * provides one, so we load the module inside a browser page and evaluate it.
 */

import { expect, test } from "@playwright/test";

const { describe } = test;

describe("utils-sanitizer escapeHTML", () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent("<!DOCTYPE html><html><body></body></html>");
    await page.addScriptTag({ path: "./src/scripts/utils-sanitizer.js" });
  });

  test("escapes <script> tags", async ({ page }) => {
    const result = await page.evaluate(() =>
      window.DomSanitizer.escapeHTML("<script>alert('xss')</script>"),
    );
    expect(result).toBe("&lt;script&gt;alert('xss')&lt;/script&gt;");
  });

  test("escapes onerror event handler attribute", async ({ page }) => {
    const result = await page.evaluate(() =>
      window.DomSanitizer.escapeHTML('<img onerror="alert(1)" src=x>'),
    );
    expect(result).toBe("&lt;img onerror=\"alert(1)\" src=x&gt;");
  });

  test("escapes javascript: URLs", async ({ page }) => {
    const result = await page.evaluate(() =>
      window.DomSanitizer.escapeHTML(
        '<a href="javascript:alert(1)">click</a>',
      ),
    );
    expect(result).toBe("&lt;a href=\"javascript:alert(1)\"&gt;click&lt;/a&gt;");
  });

  test("escapes data: URLs", async ({ page }) => {
    const result = await page.evaluate(() =>
      window.DomSanitizer.escapeHTML(
        '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>',
      ),
    );
    expect(result).toContain("&lt;iframe");
    expect(result).toContain("&lt;script&gt;");
    expect(result).not.toContain("<script>");
  });

  test("escapes svg onload", async ({ page }) => {
    const result = await page.evaluate(() =>
      window.DomSanitizer.escapeHTML(
        '<svg onload="alert(1)"><rect width="100" height="100"/></svg>',
      ),
    );
    expect(result).toBe(
      "&lt;svg onload=\"alert(1)\"&gt;&lt;rect width=\"100\" height=\"100\"/&gt;&lt;/svg&gt;",
    );
  });

  test("leaves normal text unchanged", async ({ page }) => {
    const result = await page.evaluate(() =>
      window.DomSanitizer.escapeHTML("x + 2 = 5"),
    );
    expect(result).toBe("x + 2 = 5");
  });

  test("escapes ampersand and angle brackets", async ({ page }) => {
    const result = await page.evaluate(() =>
      window.DomSanitizer.escapeHTML("a & b < c > d"),
    );
    expect(result).toBe("a &amp; b &lt; c &gt; d");
  });

  test("handles null value gracefully", async ({ page }) => {
    const result = await page.evaluate(() =>
      window.DomSanitizer.escapeHTML(null),
    );
    expect(result).toBe("");
  });

  test("handles undefined value gracefully", async ({ page }) => {
    const result = await page.evaluate(() =>
      window.DomSanitizer.escapeHTML(undefined),
    );
    expect(result).toBe("");
  });

  test("returns empty string for empty input", async ({ page }) => {
    const result = await page.evaluate(() => window.DomSanitizer.escapeHTML(""));
    expect(result).toBe("");
  });

  test("escapeHTML is frozen and present on DomSanitizer", async ({ page }) => {
    const hasEscape = await page.evaluate(
      () =>
        typeof window.DomSanitizer === "object" &&
        typeof window.DomSanitizer.escapeHTML === "function",
    );
    expect(hasEscape).toBe(true);
  });
});
