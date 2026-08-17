import { beforeEach, describe, expect, test } from "bun:test";
import rateDataJson from "../../../data/fidelity-mm-allclass.json";
import minimumDataJson from "../../../data/fidelity-mm-minimums.json";
import taxDataJson from "../../../data/fidelity-mm-tax-rules.json";
import {
  clearAppDataCache,
  loadAppData,
  type DataFetcher,
} from "../../../src/data/data-loader";

describe("application data loader", () => {
  beforeEach(() => clearAppDataCache());

  test("fetches all documents under the deployment base and validates them", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetcher: DataFetcher = async (input, init) => {
      const url = new URL(String(input));
      calls.push({ url: url.toString(), init });
      const body = url.pathname.endsWith("allclass.json")
        ? rateDataJson
        : url.pathname.endsWith("minimums.json")
          ? minimumDataJson
          : taxDataJson;
      return new Response(JSON.stringify(body), { status: 200 });
    };

    const data = await loadAppData({
      baseUrl: "https://example.test/fidelity-mm/",
      fetch: fetcher,
    });

    expect(data.rateSheet.funds).toHaveLength(40);
    expect(calls.map(({ url }) => new URL(url).pathname)).toEqual([
      "/fidelity-mm/data/fidelity-mm-allclass.json",
      "/fidelity-mm/data/fidelity-mm-minimums.json",
      "/fidelity-mm/data/fidelity-mm-tax-rules.json",
    ]);
    expect(calls.every(({ init }) => init?.cache === "no-cache")).toBe(true);
  });

  test("deduplicates concurrent loads", async () => {
    const calls: string[] = [];
    const fetcher: DataFetcher = async (input) => {
      calls.push(String(input));
      const url = new URL(String(input));
      const body = url.pathname.endsWith("allclass.json")
        ? rateDataJson
        : url.pathname.endsWith("minimums.json")
          ? minimumDataJson
          : taxDataJson;
      return new Response(JSON.stringify(body), { status: 200 });
    };

    const first = loadAppData({ baseUrl: "https://example.test/cache/", fetch: fetcher });
    const second = loadAppData({ baseUrl: "https://example.test/cache/", fetch: fetcher });

    expect(first).toBe(second);
    await Promise.all([first, second]);
    expect(calls).toHaveLength(3);
  });

  test("surfaces network failures", async () => {
    const fetcher: DataFetcher = async () => {
      throw new Error("offline");
    };

    await expect(
      loadAppData({ baseUrl: "https://example.test/network/", fetch: fetcher }),
    ).rejects.toThrow("Could not load data/fidelity-mm-allclass.json: network request failed");
  });

  test("retries a failed batch with a fresh three-request batch", async () => {
    let failRateSheet = true;
    const calls: string[] = [];
    const fetcher: DataFetcher = async (input) => {
      const url = new URL(String(input));
      calls.push(url.pathname);
      if (failRateSheet && url.pathname.endsWith("allclass.json")) {
        throw new Error("offline");
      }
      const body = url.pathname.endsWith("allclass.json")
        ? rateDataJson
        : url.pathname.endsWith("minimums.json")
          ? minimumDataJson
          : taxDataJson;
      return new Response(JSON.stringify(body), { status: 200 });
    };

    await expect(
      loadAppData({ baseUrl: "https://example.test/retry/", fetch: fetcher }),
    ).rejects.toThrow("Could not load data/fidelity-mm-allclass.json: network request failed");

    failRateSheet = false;
    const data = await loadAppData({ baseUrl: "https://example.test/retry/", fetch: fetcher });

    expect(data.rateSheet.funds).toHaveLength(40);
    expect(calls).toEqual([
      "/retry/data/fidelity-mm-allclass.json",
      "/retry/data/fidelity-mm-minimums.json",
      "/retry/data/fidelity-mm-tax-rules.json",
      "/retry/data/fidelity-mm-allclass.json",
      "/retry/data/fidelity-mm-minimums.json",
      "/retry/data/fidelity-mm-tax-rules.json",
    ]);
  });

  test("aborts signal-aware siblings before exposing a retry", async () => {
    const calls: string[] = [];
    let firstBatch = true;
    const firstSignals: Array<AbortSignal | undefined> = [];
    const fetcher: DataFetcher = async (input, init) => {
      const url = new URL(String(input));
      const path = url.pathname;
      calls.push(path);
      if (firstBatch) firstSignals.push(init?.signal ?? undefined);
      if (firstBatch && path.endsWith("allclass.json")) {
        throw new Error("offline");
      }
      if (firstBatch && (path.endsWith("minimums.json") || path.endsWith("tax-rules.json"))) {
        await new Promise<never>((_, reject) => {
          const signal = init?.signal;
          const abort = () => reject(new Error("aborted"));
          if (signal?.aborted) abort();
          else signal?.addEventListener("abort", abort, { once: true });
        });
      }
      const body = path.endsWith("allclass.json")
        ? rateDataJson
        : path.endsWith("minimums.json")
          ? minimumDataJson
          : taxDataJson;
      return new Response(JSON.stringify(body), { status: 200 });
    };

    const first = loadAppData({ baseUrl: "https://example.test/drain/", fetch: fetcher });
    await expect(first).rejects.toThrow("Could not load data/fidelity-mm-allclass.json: network request failed");
    expect(firstSignals.every(Boolean)).toBe(true);
    expect(new Set(firstSignals).size).toBe(1);

    firstBatch = false;
    const retry = loadAppData({ baseUrl: "https://example.test/drain/", fetch: fetcher });
    await retry;
    expect(calls).toHaveLength(6);
  });

  test("does not let an old failed batch clear a replacement cache", async () => {
    const calls: string[] = [];
    let firstBatch = true;
    let releaseMinimum!: () => void;
    let releaseTax!: () => void;
    let releaseReplacement!: () => void;
    let signalRateFailure!: () => void;
    const minimumPending = new Promise<void>((resolve) => {
      releaseMinimum = resolve;
    });
    const taxPending = new Promise<void>((resolve) => {
      releaseTax = resolve;
    });
    const replacementPending = new Promise<void>((resolve) => {
      releaseReplacement = resolve;
    });
    const rateFailure = new Promise<void>((resolve) => {
      signalRateFailure = resolve;
    });
    const fetcher: DataFetcher = async (input) => {
      const url = new URL(String(input));
      const path = url.pathname;
      const batch = firstBatch;
      calls.push(path);
      if (batch && path.endsWith("allclass.json")) {
        signalRateFailure();
        throw new Error("offline");
      }
      if (batch && path.endsWith("minimums.json")) await minimumPending;
      if (batch && path.endsWith("tax-rules.json")) await taxPending;
      if (!batch) await replacementPending;
      const body = path.endsWith("allclass.json")
        ? rateDataJson
        : path.endsWith("minimums.json")
          ? minimumDataJson
          : taxDataJson;
      return new Response(JSON.stringify(body), { status: 200 });
    };

    const first = loadAppData({ baseUrl: "https://example.test/identity/", fetch: fetcher });
    let firstError: Error | undefined;
    const firstHandled = first.catch((error: Error) => {
      firstError = error;
    });
    await rateFailure;
    await new Promise((resolve) => setTimeout(resolve, 0));

    clearAppDataCache();
    firstBatch = false;
    const replacement = loadAppData({ baseUrl: "https://example.test/identity/", fetch: fetcher });
    expect(calls).toHaveLength(6);

    releaseMinimum();
    releaseTax();
    await firstHandled;
    expect(firstError?.message).toBe("Could not load data/fidelity-mm-allclass.json: network request failed");

    releaseReplacement();
    await replacement;
    const concurrent = loadAppData({ baseUrl: "https://example.test/identity/", fetch: fetcher });
    expect(concurrent).toBe(replacement);
    expect(calls).toHaveLength(6);
  });

  test("surfaces malformed fetched documents through the data boundary", async () => {
    const fetcher: DataFetcher = async (input) => {
      const url = new URL(String(input));
      const body = url.pathname.endsWith("minimums.json")
        ? {
            source: "https://example.test/source",
            checkedAt: "2026-08-16T00:00:00.000Z",
            count: 1,
            funds: {
              FNSXX: {
                minimumInvestment: 0,
                sourceUrl: "https://example.test/fund",
                status: "verified",
              },
            },
          }
        : url.pathname.endsWith("allclass.json")
          ? rateDataJson
          : taxDataJson;
      return new Response(JSON.stringify(body), { status: 200 });
    };

    await expect(
      loadAppData({ baseUrl: "https://example.test/malformed/", fetch: fetcher }),
    ).rejects.toThrow("Invalid minimum data: funds.FNSXX.minimumLabel must be a string");
  });
});
