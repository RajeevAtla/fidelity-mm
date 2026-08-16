import {
  formatCheckedAt,
  formatSourceDate,
  formatSourceDateTime,
  getDataFreshness,
  getFreshnessWarning,
} from "./freshness-model";
import type { DataFreshness as FreshnessData } from "./freshness-model";

export {
  formatCheckedAt,
  formatSourceDate,
  formatSourceDateTime,
  getDataFreshness,
  getFreshnessWarning,
  STALE_AFTER_DAYS,
} from "./freshness-model";
export function DataFreshness(props: { sourceDate: string | null; checkedAt: string | null; now: number }) {
  const freshness: FreshnessData = getDataFreshness(props.sourceDate, props.checkedAt, props.now);
  const warning = getFreshnessWarning(freshness);

  return (
    <div
      aria-label="Data freshness"
      className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-snug text-subtle"
    >
      <span>
        Rates as of{" "}
        <time dateTime={formatSourceDateTime(props.sourceDate)}>{formatSourceDate(props.sourceDate)}</time>
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
