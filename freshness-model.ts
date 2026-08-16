const DAY_MS = 24 * 60 * 60 * 1000;
export const STALE_AFTER_DAYS = 7;

export type DataFreshness = {
  sourceAgeDays: number | null;
  checkAgeDays: number | null;
  sourceStale: boolean;
  checkStale: boolean;
};

function parseSourceDate(value: string | null): Date | null {
  if (!value) return null;

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;

  const [, month, day, year] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return parsed.getUTCFullYear() === Number(year) &&
    parsed.getUTCMonth() === Number(month) - 1 &&
    parsed.getUTCDate() === Number(day)
    ? parsed
    : null;
}

function parseCheckedAt(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function ageInDays(value: Date | null, now: number): number | null {
  if (!value) return null;
  return Math.max(0, Math.ceil((now - value.valueOf()) / DAY_MS));
}

export function getDataFreshness(sourceDate: string | null, checkedAt: string | null, now: number): DataFreshness {
  const sourceAgeDays = ageInDays(parseSourceDate(sourceDate), now);
  const checkAgeDays = ageInDays(parseCheckedAt(checkedAt), now);
  return {
    sourceAgeDays,
    checkAgeDays,
    sourceStale: sourceAgeDays === null || sourceAgeDays > STALE_AFTER_DAYS,
    checkStale: checkAgeDays === null || checkAgeDays > STALE_AFTER_DAYS,
  };
}

export function getFreshnessWarning(freshness: DataFreshness): string | null {
  if (freshness.sourceAgeDays === null || freshness.checkAgeDays === null) {
    return "Freshness unavailable";
  }
  if (freshness.sourceStale && freshness.checkStale) {
    return "Rates and data check are stale";
  }
  if (freshness.sourceStale) {
    return `Rates may be stale (${freshness.sourceAgeDays} days old)`;
  }
  if (freshness.checkStale) {
    return `Data check is stale (${freshness.checkAgeDays} days old)`;
  }
  return null;
}

export function formatSourceDateTime(value: string | null): string | undefined {
  return parseSourceDate(value)?.toISOString().slice(0, 10);
}

export function formatSourceDate(value: string | null): string {
  const parsed = parseSourceDate(value);
  return parsed
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(parsed)
    : "unknown";
}

export function formatCheckedAt(value: string | null): string {
  const parsed = parseCheckedAt(value);
  return parsed
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
        timeZoneName: "short",
      }).format(parsed)
    : "unknown";
}
