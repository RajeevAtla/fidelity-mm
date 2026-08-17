import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

export const BUNDLE_LIMITS = {
  raw: 190_000,
  gzip: 74_000,
  brotli: 68_000,
} as const;

export type BundleSizes = {
  raw: number;
  gzip: number;
  brotli: number;
};

type BundleMetric = keyof BundleSizes;
type Reporter = (message: string) => void;

const METRIC_LABELS: Record<BundleMetric, string> = {
  raw: "Raw",
  gzip: "Gzip",
  brotli: "Brotli",
};

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

export function measureBundle(directory = "dist"): BundleSizes {
  const files = listFiles(directory);
  if (files.length === 0) {
    throw new Error(`No files found in ${directory}`);
  }

  return files.reduce<BundleSizes>(
    (sizes, path) => {
      const contents = readFileSync(path);
      sizes.raw += contents.length;
      sizes.gzip += gzipSync(contents, { level: 9 }).length;
      sizes.brotli += brotliCompressSync(contents, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
      }).length;
      return sizes;
    },
    { raw: 0, gzip: 0, brotli: 0 },
  );
}

export function findBudgetViolations(sizes: BundleSizes): BundleMetric[] {
  return (Object.keys(BUNDLE_LIMITS) as BundleMetric[]).filter(
    (metric) => sizes[metric] > BUNDLE_LIMITS[metric],
  );
}

function formatBytes(bytes: number): string {
  return bytes.toLocaleString("en-US");
}

export function runBundleBudget(
  directory = "dist",
  log: Reporter = console.log,
  reportError: Reporter = console.error,
): number {
  let sizes: BundleSizes;
  try {
    sizes = measureBundle(directory);
  } catch (error) {
    reportError(`Bundle budget failed: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  log(`Bundle budget for ${directory}:`);
  (Object.keys(BUNDLE_LIMITS) as BundleMetric[]).forEach((metric) => {
    log(`${METRIC_LABELS[metric]}: ${formatBytes(sizes[metric])} / ${formatBytes(BUNDLE_LIMITS[metric])} bytes`);
  });

  const violations = findBudgetViolations(sizes);
  if (violations.length > 0) {
    reportError(`Bundle budget exceeded: ${violations.map((metric) => METRIC_LABELS[metric]).join(", ")}`);
    return 1;
  }

  log("Bundle budget passed.");
  return 0;
}

if (import.meta.main) {
  process.exitCode = runBundleBudget(Bun.argv[2] ?? "dist");
}
