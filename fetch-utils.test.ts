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

  test("honors caller aborts without retrying", async () => {
    const controller = new AbortController();
    let attempts = 0;
    const sleeps: number[] = [];

    await expect(
      fetchWithRetry(
        "https://example.test/data",
        { retries: 3, retryDelayMs: 10, signal: controller.signal },
        {
          sleep: async (milliseconds) => {
            sleeps.push(milliseconds);
          },
          fetch: async (_input, init) => {
            attempts += 1;
            expect(init?.signal).toBeDefined();
            expect(init?.signal).not.toBe(controller.signal);
            controller.abort();
            throw new DOMException("aborted", "AbortError");
          },
        },
      ),
    ).rejects.toThrow("aborted");

    expect(attempts).toBe(1);
    expect(sleeps).toEqual([]);
  });

  test("aborts an in-progress retry delay", async () => {
    const controller = new AbortController();
    let releaseSleep!: () => void;
    const sleepPromise = new Promise<void>((resolve) => {
      releaseSleep = resolve;
    });
    let attempts = 0;

    const request = fetchWithRetry(
      "https://example.test/data",
      { retries: 1, retryDelayMs: 10_000, signal: controller.signal },
      {
        sleep: async () => sleepPromise,
        fetch: async () => {
          attempts += 1;
          return new Response("busy", { status: 503 });
        },
      },
    ).then(
      () => "completed" as const,
      (error) => error,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();
    const outcome = await Promise.race([
      request,
      new Promise<symbol>((resolve) => setTimeout(() => resolve(Symbol.for("timeout")), 25)),
    ]);
    releaseSleep();

    expect(outcome).not.toBe(Symbol.for("timeout"));
    expect(outcome).toBeInstanceOf(DOMException);
    expect(attempts).toBe(1);
  });
});
