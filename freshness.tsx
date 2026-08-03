const DAY_MS = 24 * 60 * 60 * 1000;
export const STALE_AFTER_DAYS = 7;

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

function ageInDays(value: Date | null, now: number) {
  if (!value) return null;
  return Math.max(0, Math.ceil((now - value.valueOf()) / DAY_MS));
}

export function getDataFreshness(
  sourceDate: string | null,
  checkedAt: string | null,
  now = Date.now(),
) {
  const sourceAgeDays = ageInDays(parseSourceDate(sourceDate), now);
  const checkAgeDays = ageInDays(parseCheckedAt(checkedAt), now);
  return {
    sourceAgeDays,
    checkAgeDays,
    sourceStale: sourceAgeDays === null || sourceAgeDays > STALE_AFTER_DAYS,
    checkStale: checkAgeDays === null || checkAgeDays > STALE_AFTER_DAYS,
  };
}

function sourceDateTime(value: string | null) {
  const parsed = parseSourceDate(value);
  return parsed?.toISOString().slice(0, 10);
}

function formatSourceDate(value: string | null) {
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

function formatCheckedAt(value: string | null) {
  const parsed = parseCheckedAt(value);
  return parsed
    ? `${new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
        timeZoneName: "short",
      }).format(parsed)}`
    : "unknown";
}

export function DataFreshness(props: { sourceDate: string | null; checkedAt: string | null }) {
  const freshness = getDataFreshness(props.sourceDate, props.checkedAt);
  const warning = freshness.sourceAgeDays === null || freshness.checkAgeDays === null
    ? "Freshness unavailable"
    : freshness.sourceStale && freshness.checkStale
      ? "Rates and data check are stale"
      : freshness.sourceStale
        ? `Rates may be stale (${freshness.sourceAgeDays} days old)`
        : freshness.checkStale
          ? `Data check is stale (${freshness.checkAgeDays} days old)`
          : null;

  return (
    <div
      aria-label="Data freshness"
      className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-snug text-subtle"
    >
      <span>
        Rates as of{" "}
        <time dateTime={sourceDateTime(props.sourceDate)}>{formatSourceDate(props.sourceDate)}</time>
      </span>
      <span aria-hidden="true">·</span>
      <span>
        Checked <time dateTime={props.checkedAt ?? undefined}>{formatCheckedAt(props.checkedAt)}</time>
      </span>
      {warning && (
        <span
          role="status"
          className="rounded border border-warning-border bg-warning-bg px-1.5 py-0.5 font-semibold text-warning-text"
        >
          {warning}
        </span>
      )}
    </div>
  );
}
