import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function workflow(file: string): any {
  return Bun.YAML.parse(readFileSync(resolve(import.meta.dir, "../../../.github/workflows", file), "utf8"));
}

describe("refresh workflow safety", () => {
  test("schedules rates after overnight publication on source-market follow-up days", () => {
    expect(workflow("data.yml").on.schedule).toEqual([{ cron: "17 12 * * 2-6" }]);
  });

  test.each(["data.yml", "tax-data.yml"])("%s preserves validation and reporting contracts", file => {
    const { jobs } = workflow(file);
    const steps: any[] = jobs.refresh.steps;
    const validation = steps.find(step => step.id === "validation");
    const commit = steps.find(step => step.id === "commit");
    expect(validation.run).toContain("set -o pipefail");
    expect(validation.run).toContain('tee "$RUNNER_TEMP/validation.log"');
    expect(commit.if).toBeUndefined(); // Default success() blocks commits after failures.
    expect(steps.indexOf(validation)).toBeLessThan(steps.indexOf(commit));
    expect(steps.find(step => step.id === "failure").if).toBe("failure()");
    expect(steps.find(step => step.name === "Upload failure diagnostics").with.path).toContain("log");
    const report = jobs["report-repeated-failure"];
    expect(report.if).toContain("needs.refresh.result == 'success'");
    expect(report.if).toContain("github.event_name == 'schedule'");
    expect(report.with.result).toBe("${{ needs.refresh.result }}");
    expect(report.with.failure_summary).toBe("${{ needs.refresh.outputs.failure_summary }}");
    expect(jobs.refresh["timeout-minutes"]).toBe(20);
  });

  test("the reusable reporter receives expressions through environment variables", () => {
    const report = workflow("repeated-failure.yml");
    expect(report.jobs.report["continue-on-error"]).toBe(true);
    expect(report.on.workflow_call.inputs.result.required).toBe(true);
    const step = report.jobs.report.steps.find((step: any) => step.with?.script);
    expect(step.with.script).not.toContain("${{");
    expect(step.env.REFRESH_RESULT).toBe("${{ inputs.result }}");
  });

  test("refresh deployment still requires successful workflow completion", () => {
    const deploy = workflow("deploy.yml");
    expect(deploy.jobs.build.if).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(deploy.on.workflow_run.workflows).toContain("Refresh Fidelity Data");
  });
});
