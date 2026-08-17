import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "bun:test";
import {
  BUNDLE_LIMITS,
  findBudgetViolations,
  measureBundle,
  runBundleBudget,
} from "../../../src/scripts/check-bundle-budget";

function withFixture(run: (directory: string) => void) {
  const directory = mkdtempSync(join(tmpdir(), "fidelity-mm-bundle-budget-"));
  try {
    run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("bundle budget", () => {
  test("measures raw and per-file compressed output", () => {
    withFixture((directory) => {
      writeFileSync(join(directory, "index.html"), "hello");
      writeFileSync(join(directory, "nested.js"), "world");

      const sizes = measureBundle(directory);

      expect(sizes.raw).toBe(10);
      expect(sizes.gzip).toBeGreaterThan(sizes.raw);
      expect(sizes.brotli).toBeGreaterThan(sizes.raw);
    });
  });

  test.each(["raw", "gzip", "brotli"] as const)("rejects %s over its limit", (metric) => {
    const sizes = { raw: 0, gzip: 0, brotli: 0 };
    sizes[metric] = BUNDLE_LIMITS[metric] + 1;

    expect(findBudgetViolations(sizes)).toEqual([metric]);
  });

  test("returns a failure code for an oversized fixture", () => {
    const messages: string[] = [];

    withFixture((directory) => {
      writeFileSync(join(directory, "oversized.bin"), Buffer.alloc(BUNDLE_LIMITS.raw + 1));
      expect(runBundleBudget(directory, (message) => messages.push(message), (message) => messages.push(message))).toBe(1);
    });

    expect(messages.join("\n")).toContain("Raw");
    expect(messages.join("\n")).toContain("Bundle budget exceeded");
  });
});
