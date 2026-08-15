import { describe, expect, test } from "bun:test";
import { fetchWithRetry, shouldRetry, type FetchRetryClock } from "./fetch-utils";

describe("fetchWithRetry", () => {
  test.each([
    [408, true],
    [425, true],
    [429, true],
    [500, true],
    [599, true],
    [400, false],
    [404, false],
  ])("decides whether status %s is retryable", (status, expected) => {
    expect(shouldRetry(status)).toBe(expected);
  });

  test("retries retryable responses with exponential delays", async () => {
    let attempts = 0;
    const sleeps: number[] = [];
    const timers: number[] = [];
    const cleared: unknown[] = [];
    const clock: FetchRetryClock = {
      setTimeout: (_callback, milliseconds) => {
        timers.push(milliseconds);
        return timers.length;
      },
      clearTimeout: (timeout) => cleared.push(timeout),
    };

    const response = await fetchWithRetry(
      "https://example.test/data",
      { retries: 3, retryDelayMs: 25, timeoutMs: 1000 },
      {
        clock,
        sleep: async (milliseconds) => {
          sleeps.push(milliseconds);
        },
        fetch: async () => {
          attempts += 1;
          return new Response(attempts === 3 ? "ok" : "busy", { status: attempts === 3 ? 200 : 503 });
        },
      },
    );

    expect(response.status).toBe(200);
    expect(attempts).toBe(3);
    expect(sleeps).toEqual([25, 50]);
    expect(timers).toEqual([1000, 1000, 1000]);
    expect(cleared).toEqual([1, 2, 3]);
  });

  test("retries thrown fetch errors and rethrows the final error", async () => {
    let attempts = 0;
    const sleeps: number[] = [];

    await expect(
      fetchWithRetry(
        "https://example.test/data",
        { retries: 2, retryDelayMs: 10 },
        {
          sleep: async (milliseconds) => {
            sleeps.push(milliseconds);
          },
          fetch: async () => {
            attempts += 1;
            throw new Error("offline");
          },
        },
      ),
    ).rejects.toThrow("offline");

    expect(attempts).toBe(3);
    expect(sleeps).toEqual([10, 20]);
  });
});
