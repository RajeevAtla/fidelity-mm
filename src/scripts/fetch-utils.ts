export type FetchRetryOptions = RequestInit & {
  retries?: number;
  timeoutMs?: number;
  retryDelayMs?: number;
};

export type FetchRetryClock = {
  setTimeout(callback: () => void, milliseconds: number): unknown;
  clearTimeout(timeout: unknown): void;
};

export type FetchRetryDependencies = {
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  sleep?: (milliseconds: number) => Promise<void>;
  clock?: FetchRetryClock;
};

export async function fetchWithRetry(
  input: RequestInfo | URL,
  options: FetchRetryOptions = {},
  dependencies: FetchRetryDependencies = {},
): Promise<Response> {
  const { retries = 3, timeoutMs = 20_000, retryDelayMs = 500, ...init } = options;
  const request = dependencies.fetch ?? globalThis.fetch;
  const sleep = dependencies.sleep;
  const clock = dependencies.clock ?? defaultClock;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (init.signal?.aborted) throw abortReason(init.signal);

    const controller = new AbortController();
    const onAbort = () => controller.abort(init.signal?.reason);
    if (init.signal) init.signal.addEventListener("abort", onAbort, { once: true });
    const timeout = clock.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await request(input, { ...init, signal: controller.signal });
      if (init.signal?.aborted) throw abortReason(init.signal);
      if (!shouldRetry(response.status) || attempt === retries) return response;
      await waitForRetry(sleep, retryDelayMs * 2 ** attempt, init.signal, clock);
    } catch (error) {
      if (init.signal?.aborted) throw abortReason(init.signal);
      lastError = error;
      if (attempt === retries) throw error;
      await waitForRetry(sleep, retryDelayMs * 2 ** attempt, init.signal, clock);
    } finally {
      clock.clearTimeout(timeout);
      init.signal?.removeEventListener("abort", onAbort);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

export function shouldRetry(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

const defaultClock: FetchRetryClock = {
  setTimeout: (callback, milliseconds) => setTimeout(callback, milliseconds),
  clearTimeout: (timeout) => clearTimeout(timeout as ReturnType<typeof setTimeout>),
};

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("The operation was aborted.", "AbortError");
}

function waitForRetry(
  sleep: ((milliseconds: number) => Promise<void>) | undefined,
  milliseconds: number,
  signal?: AbortSignal | null,
  clock: FetchRetryClock = defaultClock,
): Promise<void> {
  if (!sleep) return delay(milliseconds, clock, signal);
  if (!signal) return sleep(milliseconds);
  if (signal.aborted) return Promise.reject(abortReason(signal));

  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(abortReason(signal));
    };

    signal.addEventListener("abort", onAbort, { once: true });
    void (async () => {
      try {
        await sleep(milliseconds);
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      } catch (error) {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      }
    })();
  });
}

function delay(milliseconds: number, clock: FetchRetryClock, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer: unknown;
    let timerSet = false;
    const cleanup = () => {
      if (timerSet) clock.clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(abortReason(signal!));
    };

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
      if (signal.aborted) {
        onAbort();
        return;
      }
    }

    timer = clock.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    }, milliseconds);
    timerSet = true;
  });
}
