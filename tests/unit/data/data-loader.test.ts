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

  test("surfaces malformed fetched documents through the data boundary", async () => {
    const fetcher: DataFetcher = async (input) => {
      const url = new URL(String(input));
      const body = url.pathname.endsWith("minimums.json")
        ? { checkedAt: "2026-08-16T00:00:00.000Z", count: 0, funds: { FNSXX: {} } }
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
