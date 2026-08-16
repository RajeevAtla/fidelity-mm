import { describe, expect, test } from "bun:test";
import {
  formatCheckedAt,
  formatSourceDate,
  formatSourceDateTime,
  getDataFreshness,
  getFreshnessWarning,
  STALE_AFTER_DAYS,
} from "./freshness-model";

describe("getDataFreshness", () => {
  test("ages the source and check independently against the current time", () => {
    const now = Date.parse("2026-08-09T01:31:13.076Z");
    expect(getDataFreshness("07/31/2026", "2026-08-03T01:31:13.076Z", now)).toEqual({
      sourceAgeDays: 10,
      checkAgeDays: 6,
      sourceStale: true,
      checkStale: false,
    });
  });

  test("does not report a negative age when clocks are ahead", () => {
    const now = Date.parse("2026-08-02T23:59:00.000Z");
    expect(getDataFreshness("08/03/2026", "2026-08-03T01:00:00.000Z", now)).toEqual({
      sourceAgeDays: 0,
      checkAgeDays: 0,
      sourceStale: false,
      checkStale: false,
    });
  });

  test("treats missing or invalid timestamps as stale", () => {
    const freshness = getDataFreshness("02/30/2026", "not-a-date", Date.parse("2026-08-03T00:00:00Z"));
    expect(freshness.sourceAgeDays).toBeNull();
    expect(freshness.checkAgeDays).toBeNull();
    expect(freshness.sourceStale).toBeTrue();
    expect(freshness.checkStale).toBeTrue();
  });

  test("allows exactly one week before warning", () => {
    expect(STALE_AFTER_DAYS).toBe(7);
    const boundary = Date.parse("2026-08-07T00:00:00.000Z");
    expect(getDataFreshness("07/31/2026", "2026-07-31T00:00:00.000Z", boundary).sourceStale).toBeFalse();
    expect(getDataFreshness("07/31/2026", "2026-07-31T00:00:00.000Z", boundary + 1).sourceStale).toBeTrue();
  });

  test("returns each warning state deterministically", () => {
    const now = Date.parse("2026-08-10T00:00:00.000Z");
    expect(getFreshnessWarning(getDataFreshness("08/09/2026", "2026-08-09T00:00:00.000Z", now))).toBeNull();
    expect(getFreshnessWarning(getDataFreshness("07/31/2026", "2026-08-09T00:00:00.000Z", now))).toBe(
      "Rates may be stale (10 days old)",
    );
    expect(getFreshnessWarning(getDataFreshness("08/09/2026", "2026-07-31T00:00:00.000Z", now))).toBe(
      "Data check is stale (10 days old)",
    );
    expect(getFreshnessWarning(getDataFreshness("07/31/2026", "2026-07-31T00:00:00.000Z", now))).toBe(
      "Rates and data check are stale",
    );
    expect(getFreshnessWarning(getDataFreshness(null, null, now))).toBe("Freshness unavailable");
  });

  test("formats valid timestamps in UTC and invalid values as unknown", () => {
    expect(formatSourceDateTime("07/31/2026")).toBe("2026-07-31");
    expect(formatSourceDate("07/31/2026")).toBe("Jul 31, 2026");
    expect(formatCheckedAt("2026-08-03T01:54:09.683Z")).toBe("Aug 3, 2026, 1:54 AM UTC");
    expect(formatSourceDateTime("02/30/2026")).toBeUndefined();
    expect(formatSourceDate("02/30/2026")).toBe("unknown");
    expect(formatCheckedAt("not-a-date")).toBe("unknown");
  });
});
