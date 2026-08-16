import { describe, expect, test } from "bun:test";
import { describeModelContext } from "../../../src/app/model-context";

describe("model context", () => {
  test("reports the active resident state instead of the default state", () => {
    const context = describeModelContext("tx");

    expect(context).toContain("Active resident state: Texas (TX)");
    expect(context).not.toContain("New Jersey");
    expect(context).toContain("Supported resident states: 50");
  });
});
