import { describe, expect, mock, test } from "bun:test";
const { reportRefresh, summarizeFailure } = require("../../../src/scripts/report-refresh.cjs");

function harness(result = "failure", eventName = "schedule") {
  const issues: any[] = [];
  const comments: any[] = [];
  const runs: any[] = [{ id: 9, run_number: 9, status: "completed", conclusion: "failure", html_url: "previous" }];
  const api = {
    listForRepo: mock(), listComments: mock(),
    create: mock(async (issue: any) => { issues.push({ ...issue, number: 14, user: { login: "github-actions[bot]" } }); }),
    createComment: mock(async (comment: any) => { comments.push(comment); }),
    update: mock(async () => { issues.splice(0); }),
  };
  const context = { repo: { owner: "owner", repo: "repo" }, ref: "refs/heads/main",
    payload: { repository: { default_branch: "main" } }, serverUrl: "https://github.com",
    runId: 10, runAttempt: 1, eventName };
  const github = {
    rest: { issues: api, actions: {
      getWorkflowRun: mock(async () => ({ data: { run_number: 10 } })),
      listWorkflowRuns: mock(async () => ({ data: { workflow_runs: runs } })),
    } },
    paginate: mock(async (method: any) => method === api.listForRepo ? issues : comments),
  };
  return { issues, comments, runs, api, context, github,
    run: () => reportRefresh({ github, context, core: { info: mock() },
      workflowFile: "data.yml", workflowName: "Refresh Fidelity Data", result,
      summary: "Rate refresh: Fidelity source not ready after 3 attempts" }),
  };
}

function incident() {
  return { number: 14, title: "[automation] Repeated Refresh Fidelity Data failures",
    body: "older incident", user: { login: "github-actions[bot]" } };
}

describe("refresh failure and recovery reporting", () => {
  test("waits for two consecutive scheduled failures", async () => {
    const h = harness();
    h.runs[0]!.conclusion = "success";
    await h.run();
    expect(h.api.create).not.toHaveBeenCalled();
    expect(h.api.createComment).not.toHaveBeenCalled();
  });

  test("creates an incident with the failure reason and both run links", async () => {
    const h = harness();
    await h.run();
    expect(h.api.create).toHaveBeenCalledTimes(1);
    expect(h.issues[0].body).toContain("Rate refresh: Fidelity source not ready");
    expect(h.issues[0].body).toContain("previous");
    expect(h.issues[0].body).toContain("actions/runs/10");
    await h.run();
    expect(h.api.createComment).not.toHaveBeenCalled();
  });

  test("updates an existing incident once per attempt", async () => {
    const h = harness();
    h.issues.push(incident());
    await h.run();
    await h.run();
    expect(h.api.createComment).toHaveBeenCalledTimes(1);
    expect(h.api.create).not.toHaveBeenCalled();
  });

  test("does not mistake a newer scheduled run for the predecessor", async () => {
    const h = harness();
    h.runs[0].conclusion = "success";
    h.runs.unshift({ id: 11, run_number: 11, status: "completed", conclusion: "failure" });
    await h.run();
    expect(h.api.create).not.toHaveBeenCalled();
  });

  test.each(["schedule", "workflow_dispatch"])("reports %s recovery once and closes the automation incident", async event => {
    const h = harness("success", event);
    h.issues.push(incident());
    await h.run();
    await h.run();
    expect(h.api.createComment).toHaveBeenCalledTimes(1);
    expect(h.comments[0].body).toContain("recovered successfully");
    expect(h.api.update).toHaveBeenCalledWith(expect.objectContaining({ issue_number: 14, state: "closed" }));
    expect(h.github.rest.actions.listWorkflowRuns).not.toHaveBeenCalled();
  });

  test.each(["failure", "success"])("ignores %s on a non-default branch", async result => {
    const h = harness(result);
    h.context.ref = "refs/heads/task";
    h.issues.push(incident());
    await h.run();
    expect(h.github.paginate).not.toHaveBeenCalled();
  });

  test("does not report a manual failure", async () => {
    const h = harness("failure", "workflow_dispatch");
    await h.run();
    expect(h.github.paginate).not.toHaveBeenCalled();
  });

  test("does not close a similarly titled human-created issue or PR", async () => {
    const h = harness("success");
    h.issues.push({ ...incident(), user: { login: "human" } }, { ...incident(), pull_request: {} });
    await h.run();
    expect(h.api.update).not.toHaveBeenCalled();
    expect(h.api.createComment).not.toHaveBeenCalled();
  });

  test("successful runs without an incident do not create issues or comments", async () => {
    const h = harness("success");
    await h.run();
    expect(h.api.create).not.toHaveBeenCalled();
    expect(h.api.createComment).not.toHaveBeenCalled();
  });
});

describe("failure summary", () => {
  test("identifies the failing stage and extracts Bun's actual error, ignoring its source excerpt", () => {
    expect(summarizeFailure({ rates: { outcome: "failure" } }, {
      rates: '12 | throw new Error("source")\nerror: Fidelity source not ready after 3 attempts\n at main',
    })).toBe("Rate refresh: Fidelity source not ready after 3 attempts");
    expect(summarizeFailure({ validation: { outcome: "failure" } }, {
      validation: "error: Data validation failed:\nFNSXX: bad data",
    })).toBe("Data validation: Data validation failed:");
  });

  test("handles setup failures and missing diagnostic logs", () => {
    expect(summarizeFailure({}, {})).toContain("Setup");
    expect(summarizeFailure({ minimums: { outcome: "failure" } }, {})).toContain("Minimum refresh");
  });
});
