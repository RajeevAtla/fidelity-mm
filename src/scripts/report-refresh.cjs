const FAILURE_TITLE = name => `[automation] Repeated ${name} failures`;

function summarizeFailure(steps, logs) {
  const names = {
    rates: "Rate refresh", minimums: "Minimum refresh", tax: "Tax refresh",
    validation: "Data validation", commit: "Commit updates",
  };
  const failed = Object.keys(names).find(id => steps[id]?.outcome === "failure");
  if (!failed) return "Setup or workflow step failed; see workflow logs.";
  const detail = (logs[failed] ?? "").match(/^(?:error|Error):\s*(.+)$/m)?.[1];
  return `${names[failed]}: ${detail ?? "failed; see workflow logs"}`.replace(/[\r\n]/g, " ").slice(0, 600);
}

async function reportRefresh({ github, context, core, workflowFile, workflowName, result, summary }) {
  const { owner, repo } = context.repo;
  const branch = context.payload.repository.default_branch;
  if (context.ref !== `refs/heads/${branch}`) return;
  if (result !== "success" && !(result === "failure" && context.eventName === "schedule")) return;
  const title = FAILURE_TITLE(workflowName);
  const issues = await github.paginate(github.rest.issues.listForRepo, {
    owner, repo, state: "open", creator: "github-actions[bot]", per_page: 100,
  });
  const existing = issues.find(issue => issue.title === title && !issue.pull_request &&
    issue.user?.login === "github-actions[bot]");
  const runUrl = `${context.serverUrl}/${owner}/${repo}/actions/runs/${context.runId}`;
  const marker = `<!-- fidelity-refresh:${workflowFile}:${context.runId}:${context.runAttempt ?? 1}:${result} -->`;
  if (existing) {
    const comments = await github.paginate(github.rest.issues.listComments, {
      owner, repo, issue_number: existing.number, per_page: 100,
    });
    if (existing.body?.includes(marker) || comments.some(comment => comment.body?.includes(marker))) return;
  }
  if (result === "success") {
    if (!existing) return;
    await github.rest.issues.createComment({ owner, repo, issue_number: existing.number,
      body: `Refresh recovered successfully. Validated data was committed (or was already current).\n\n- ${runUrl}\n\n${marker}` });
    await github.rest.issues.update({ owner, repo, issue_number: existing.number, state: "closed", state_reason: "completed" });
    return;
  }
  const { data: current } = await github.rest.actions.getWorkflowRun({ owner, repo, run_id: context.runId });
  const { data } = await github.rest.actions.listWorkflowRuns({
    owner, repo, workflow_id: workflowFile, event: "schedule", branch, per_page: 100,
  });
  // Late reports and reruns cannot treat newer scheduled runs as predecessors.
  const previous = data.workflow_runs.find(run => run.id !== context.runId &&
    run.run_number < current.run_number && run.status === "completed");
  if (previous?.conclusion !== "failure") {
    core.info("The previous scheduled run did not fail; no issue is needed.");
    return;
  }
  const reason = (summary || "Refresh failed; see workflow logs and failure artifacts.").replace(/[\r\n]/g, " ").slice(0, 600);
  const body = `Two consecutive scheduled runs failed.\n\nFailure: ${reason}\n\n- ${previous.html_url}\n- ${runUrl}\n\n${marker}`;
  if (existing) await github.rest.issues.createComment({ owner, repo, issue_number: existing.number, body });
  else await github.rest.issues.create({ owner, repo, title, body });
}

module.exports = { reportRefresh, summarizeFailure };
