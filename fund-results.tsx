import type { CategoryCode } from "./categories";

export type FundResultItem = {
  t: string;
  a: number;
  c: CategoryCode;
  mn: string;
};

type FundResultsProps = {
  funds: FundResultItem[];
  expanded: boolean;
  initialLimit: number;
  categoryLabels: Record<CategoryCode, string>;
  barClass: (fund: FundResultItem, index: number) => string;
  toggleButtonClass: string;
  onExpandedChange: (expanded: boolean) => void;
};

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

export function FundResults({
  funds,
  expanded,
  initialLimit,
  categoryLabels,
  barClass,
  toggleButtonClass,
  onExpandedChange,
}: FundResultsProps) {
  const visibleFunds = expanded ? funds : funds.slice(0, initialLimit);
  const canToggle = funds.length > initialLimit;

  return (
    <>
      <div id="fund-list" className="space-y-[3px]" aria-live="polite" aria-label={`${funds.length} funds shown`}>
        {visibleFunds.map((fund, index) => (
          <div
            key={fund.t}
            className="grid grid-cols-[52px_minmax(0,1fr)_52px_42px] items-center gap-x-1"
          >
            <div className="w-[52px] flex-shrink-0 text-[11px] font-semibold text-text">
              {fund.t}
            </div>
            <div
              className="relative h-6 min-w-0 overflow-hidden rounded-md border border-track-border bg-track"
              role="img"
              aria-label={`${fund.t} ${fund.a.toFixed(3)}% after-tax yield`}
            >
              <div
                className={cx(
                  "absolute inset-y-0 left-0 rounded-r-full rounded-l-none",
                  barClass(fund, index),
                )}
              />
              <span
                className={cx(
                  "bar-value-label absolute right-[4px] top-[3px] rounded bg-page/85 px-[3px] text-[11px] font-semibold leading-none",
                  index === 0 ? "font-bold" : "font-medium",
                )}
              >
                {fund.a.toFixed(3)}%
              </span>
            </div>
            <div className="w-[52px] flex-shrink-0 pl-1 text-right text-[9px] text-muted">
              {categoryLabels[fund.c]}
            </div>
            <div className="w-[42px] flex-shrink-0 pl-1 text-right text-[9px] text-subtle">
              {fund.mn}
            </div>
          </div>
        ))}
      </div>

      {canToggle && (
        <button
          type="button"
          aria-label={expanded ? "Show only the top initial funds" : `Show all ${funds.length} funds`}
          aria-expanded={expanded}
          aria-controls="fund-list"
          onClick={() => onExpandedChange(!expanded)}
          className={toggleButtonClass}
        >
          {expanded ? `Show top ${initialLimit} ▴` : `Show all ${funds.length} funds ▾`}
        </button>
      )}
    </>
  );
}
