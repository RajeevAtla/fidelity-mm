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
  const sleep = dependencies.sleep ?? delay;
  const clock = dependencies.clock ?? defaultClock;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = clock.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await request(input, { ...init, signal: controller.signal });
      if (!shouldRetry(response.status) || attempt === retries) return response;
      await sleep(retryDelayMs * 2 ** attempt);
    } catch (error) {
      lastError = error;
      if (attempt === retries) throw error;
      await sleep(retryDelayMs * 2 ** attempt);
    } finally {
      clock.clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

export function shouldRetry(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

const defaultClock: FetchRetryClock = {
  setTimeout: (callback, milliseconds) => setTimeout(callback, milliseconds),
  clearTimeout: (timeout) => clearTimeout(timeout as ReturnType<typeof setTimeout>),
};
