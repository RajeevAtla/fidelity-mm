import { parseAppData, type AppData } from "./data-boundary";
import { DATA_PATHS } from "./data-sources";

export type DataFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type DataLoaderOptions = {
  fetch?: DataFetcher;
  baseUrl?: string;
};

let cachedAppData: Promise<AppData> | undefined;

export function loadAppData(options: DataLoaderOptions = {}): Promise<AppData> {
  if (cachedAppData) return cachedAppData;

  const fetcher = options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  const baseUrl = options.baseUrl ?? (typeof document === "undefined" ? undefined : document.baseURI);
  if (!baseUrl) throw new Error("Cannot resolve the application data base URL");

  const controller = new AbortController();
  const requests = [
    loadJson(DATA_PATHS.rateSheet, fetcher, baseUrl, controller.signal),
    loadJson(DATA_PATHS.minimums, fetcher, baseUrl, controller.signal),
    loadJson(DATA_PATHS.taxRules, fetcher, baseUrl, controller.signal),
  ];
  const pending = Promise.all(requests).then(([rateSheet, minimumData, taxData]) =>
    parseAppData(rateSheet, minimumData, taxData),
  );

  let batchPromise: Promise<AppData>;
  batchPromise = pending.catch((error) => {
    controller.abort();
    if (cachedAppData === batchPromise) cachedAppData = undefined;
    throw error;
  });
  cachedAppData = batchPromise;
  return batchPromise;
}

export function clearAppDataCache(): void {
  cachedAppData = undefined;
}

async function loadJson(path: string, fetcher: DataFetcher, baseUrl: string, signal: AbortSignal): Promise<unknown> {
  const url = new URL(path, baseUrl).toString();
  let response: Response;

  try {
    response = await fetcher(url, { cache: "no-cache", signal });
  } catch {
    throw new Error(`Could not load ${path}: network request failed`);
  }

  if (!response.ok) {
    throw new Error(`Could not load ${path}: HTTP ${response.status}`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`Could not parse ${path} as JSON`);
  }
}
