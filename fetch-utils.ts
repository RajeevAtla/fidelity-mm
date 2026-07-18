export type FetchRetryOptions = RequestInit & {
  retries?: number;
  timeoutMs?: number;
  retryDelayMs?: number;
};

export async function fetchWithRetry(
  input: RequestInfo | URL,
  options: FetchRetryOptions = {},
): Promise<Response> {
  const { retries = 3, timeoutMs = 20_000, retryDelayMs = 500, ...init } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      if (!shouldRetry(response.status) || attempt === retries) return response;
      await delay(retryDelayMs * 2 ** attempt);
    } catch (error) {
      lastError = error;
      if (attempt === retries) throw error;
      await delay(retryDelayMs * 2 ** attempt);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

function shouldRetry(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
