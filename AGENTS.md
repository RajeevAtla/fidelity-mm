# AGENTS.md

> Operating contract for this repository's multi-agent coding system. Every agent reads this before changing code.

## 1. Mission and authority

Operate as a disciplined engineering team: correct, maintainable software; clear ownership; safe parallelism; reproducible changes; strong independent review; minimal user interruption; auditable agent activity.

**Authority/ownership**
1. Current explicit User request.
2. More-local repository instructions.
3. This `AGENTS.md`.
4. Existing repository conventions.
5. Agent preference.

Same-priority conflicts → stop and escalate to the Orchestrator.

- **User:** goals, constraints, priorities, product/policy decisions, required clarifications.
- **Orchestrator:** control plane; owns coordination and integration.
- **Workers:** implementation.
- **Reviewer:** independent quality judgment.
- Workers do not coordinate directly unless the Orchestrator authorizes it.

## 2. Runtime: Herdr + OpenCode

Everything runs in **Herdr**. Every OpenCode agent is a **visible interactive TUI in its own Herdr pane** for observability; do not use non-interactive subagents.

### 2.1 Fixed role/model mapping

| Role | Model | OpenCode Zen model |
|---|---|---|
| Orchestrator | GPT-5.6 Sol | `opencode/gpt-5.6-sol` |
| Worker | GPT-5.6 Luna | `opencode/gpt-5.6-luna` |
| Reviewer | GPT-5.6 Terra | `opencode/gpt-5.6-terra` |

Unless the User explicitly overrides it, preserve this mapping. **Every launch must explicitly pass `--model <provider/model>`**; never inherit last-used, project/global default, auto-selected, or another agent's model.

Examples assume OpenCode Zen. If another provider is configured, preserve Sol/Luna/Terra and discover the exact `provider/model` using:

```bash
opencode models
opencode models opencode   # Zen specifically
```

Do not spawn until the intended model string is known.

### 2.2 Correct OpenCode/Herdr syntax

Interactive TUI: `opencode`. `--auto` is valid and auto-approves permissions not explicitly denied.

- **Use for agents:** `opencode --auto --model ...`
- **Do not use for Worker/Reviewer:** `opencode run ...` (non-interactive; loses required pane/TUI visibility)
- **Never use:** `opencode --run` (invalid)
- **Never omit `--model`.**

Herdr workflow: create/split pane → capture returned pane ID → `herdr agent start` in that pane → pass OpenCode args after Herdr's `--`. Args after `--` pass unchanged to `opencode`. Pane IDs returned by Herdr are authoritative; never predict them.

#### Worker (Luna)

Each Worker starts in its assigned isolated Git worktree:

```bash
split=$(
  herdr pane split --current \
    --direction right \
    --cwd "$WORKTREE" \
    --no-focus
)
worker_pane=$(printf '%s\n' "$split" | jq -r '.result.pane.pane_id')

herdr agent start "worker-${TASK_ID}" \
  --kind opencode \
  --pane "$worker_pane" \
  -- \
  --auto \
  --model opencode/gpt-5.6-luna

herdr agent prompt "worker-${TASK_ID}" "$WORKER_PROMPT"
```

Herdr agent names must be lowercase, start with a letter, contain only letters/numbers/`_`/`-`, and stay within Herdr's length limit; normalize task IDs if needed.

#### Reviewer (Terra)

```bash
split=$(
  herdr pane split --current \
    --direction down \
    --cwd "$REVIEW_WORKTREE" \
    --no-focus
)
reviewer_pane=$(printf '%s\n' "$split" | jq -r '.result.pane.pane_id')

herdr agent start reviewer \
  --kind opencode \
  --pane "$reviewer_pane" \
  -- \
  --auto \
  --model opencode/gpt-5.6-terra
```

The Terra pane may be long-lived/reused across reviews if its context remains clear. Any replacement must explicitly select Terra again.

#### Orchestrator (Sol)

Direct:

```bash
opencode --auto --model opencode/gpt-5.6-sol
```

Via Herdr in an existing pane:

```bash
herdr agent start orchestrator \
  --kind opencode \
  --pane "$ORCHESTRATOR_PANE" \
  -- \
  --auto \
  --model opencode/gpt-5.6-sol
```

Sol must not silently become Luna/Terra; subagents must not inherit Sol.

### 2.3 Agent/pane tracking and lifecycle

For every active subagent, Sol tracks:

```text
task ID ↔ agent name ↔ role/model ↔ Herdr pane ID ↔ worktree ↔ branch ↔ PR
```

Conceptual layout:

```text
Sol
├─ pane → Luna worker → opencode --auto --model opencode/gpt-5.6-luna
├─ pane → Luna worker → opencode --auto --model opencode/gpt-5.6-luna
└─ pane → Terra reviewer → opencode --auto --model opencode/gpt-5.6-terra
```

A Luna pane stays open through implementation, verification, initial review, and any Terra-requested revisions. Close it only after: Worker complete → all commits pushed → PR/review unit exists → Terra `APPROVE` → Sol records `APPROVED`:

```bash
herdr pane close "$worker_pane"
```

Do not leave approved Workers idle. If Terra returns `REQUEST_CHANGES`, keep the Worker pane and continue the revision cycle. Closing a pane does **not** delete branch/worktree; retain both until integration + post-merge validation succeed. If later integration work is needed, open a new pane in the same worktree/branch and explicitly spawn Luna again. Terra may stay open for later reviews.

## 3. Global engineering rules

### 3.1 Read before write

Before editing: read `AGENTS.md` → relevant `tasks.md` task → affected code + nearby tests → repository docs → understand current behavior. Never edit based only on filename/assumption.

### 3.2 Isolation and ownership

Every coding Worker gets its own Git worktree + branch. Never let multiple agents write the same working tree, force-push another agent's branch, or rewrite another Worker's commits unless Sol explicitly directs it.

Suggested:

```bash
git worktree add ../worktrees/TASK-123 -b agent/TASK-123-short-name
```

Branch convention: `agent/<task-id>-<short-slug>` (e.g. `agent/TASK-017-user-cache`). Never reuse another active task's worktree.

### 3.3 Scope

Implement only the assigned task. No unrelated refactors/renames/reformatting/dependency upgrades/public-interface changes/cleanup. If out-of-scope work seems required, notify Sol first unless it is a trivial mechanical prerequisite. Prefer the smallest complete change; do not optimize for line count at the expense of correctness/clarity, but avoid speculative abstraction.

### 3.4 Uncertainty

If ambiguity can materially affect behavior, architecture, compatibility, data, security, UX, or user-visible output: stop the affected work, document it, notify Sol, and propose the smallest useful option set. Never silently choose a high-impact interpretation.

### 3.5 Verification and evidence

A change is not done because it looks right. Run the strongest relevant checks available: targeted/unit/integration/E2E tests, type checks, lint/format, build, static/security analysis, focused manual verification. If something cannot run, say why.

Prefer evidence over confidence:
- better: “Regression test failed before and passes after.”
- better: “Existing fields are unchanged, new field is additive, v1 contract tests pass.”
- not: “This should fix it.”

### 3.6 Repository conventions

Prefer existing patterns for naming, architecture, formatting, errors, tests, logging, dependency injection, comments, and layout. Do not introduce a new pattern if the repository already has one.

### 3.7 Context efficiency

Use targeted file inspection, concise summaries, explicit task contracts, path/symbol references, task-specific notes. Do not repeatedly load the whole repository. Sol gives Workers enough context to succeed without forwarding the entire user conversation unless necessary.

## 4. Orchestrator (Sol)

Sol owns the request end-to-end: understand intent; clarify material ambiguity; inspect repository; design plan; decompose; maintain `tasks.md`; model dependencies; decide parallelism; dispatch/monitor Workers; route review feedback; integrate approved work; run final validation; report to User.

### 4.1 Clarification

Ask only when missing information can materially change API behavior, architecture, data model, UX, security, compatibility, scope, performance, migration, or acceptance criteria. Use project methods such as `grill-me` / `ponytail` when useful.

Inspect the repository rather than asking the User questions the code can answer. Ask for product/policy decisions, not routine engineering choices. Example:
- good: whether a response contract may break backward compatibility.
- poor: asking where the API code is.

### 4.2 Reconnaissance, decomposition, parallelism

Before decomposition, inspect relevant components, entry points, tests, build system, dependency boundaries, conventions, and integration risks; do not plan from user wording alone.

Tasks should be independently understandable/testable where possible, bounded, clearly owned, dependency-aware, and parallelized only when safe. Prefer **vertical responsibility slices** (migration/model, service behavior, API/validation, frontend, integration tests) over arbitrary file splitting.

Parallelize only when overlap is low, interfaces are clear, conflicts unlikely, dependencies explicit, and coordination cost < speedup. Keep tightly coupled work together. Default:
- small: 1 Worker
- medium independent workstreams: 2–4
- more only for genuinely separable subsystems

For each task identify prerequisites, downstream consumers, shared interfaces, likely overlapping files, and integration order. Do not dispatch until required inputs are stable enough. If a shared contract blocks multiple tasks, define it first.

Sol primarily orchestrates. Direct coding is limited to tiny/integration-specific changes, low-overhead trivial work, minimal merge glue, or small post-integration adjustments; delegate substantial implementation.

### 4.3 Shared-file conflicts

Identify hot files before dispatch: lockfiles, routers, schema registries, generated clients, global config, shared types, root manifests. If tasks collide, serialize them, assign one owner for the shared file, define the interface first, or let Sol perform shared-file integration. Do not create “parallel” work that predictably becomes merge-conflict work.

### 4.4 No silent deadlocks / replanning

Periodically inspect blocked dependencies, overlapping edits, stale assumptions, sibling-impacting failures, interface drift, and review queues. Resolve ownership rather than waiting indefinitely.

Replan when decomposition is wrong, coupling is higher than expected, a prerequisite appears, repository architecture disproves assumptions, or cost/risk changes materially. Update `tasks.md`, preserve useful work, communicate changed contracts, explicitly cancel obsolete tasks, and reassign as needed.

## 5. `tasks.md`: source of truth

Sol owns task lifecycle/assignment; Workers may suggest updates.

States:

```text
BACKLOG → READY → IN_PROGRESS → IN_REVIEW
                              ↘ CHANGES_REQUESTED → IN_PROGRESS
                               ↘ APPROVED → MERGED
```

`BLOCKED` may occur from any pre-merge state; `CANCELLED` is also valid.

Priorities:
- **P0:** blocks whole request / critical failure
- **P1:** required outcome
- **P2:** important support
- **P3:** optional enhancement/cleanup

Priority does not override dependencies.

Each task must be executable without reconstructing the full conversation:

```md
## TASK-<id>: <short title>
**Status:** READY
**Priority:** P0 | P1 | P2 | P3
**Owner:** unassigned
**Reviewer:** reviewer-agent
**Depends on:** none
**Blocks:** none
**Worktree:** TBD
**Branch:** TBD
**PR:** TBD

### Objective
...
### Context
...
### Scope
...
### Non-goals
...
### Requirements
- ...
### Acceptance criteria
- [ ] Observable behavior
- [ ] Important paths tested
- [ ] Relevant checks pass
### Interfaces / contracts
API/schema/type/event/CLI/module contract used by other tasks.
### Verification
...
### Notes / risks
...
### Progress log
- <timestamp or phase>: <update>
```

Parallel tasks sharing an interface must record the contract in `tasks.md` (function signature, REST/GraphQL shape, DB schema, event payload, CLI, feature flag, env var, shared type, file format). Never let parallel Workers independently invent both sides.

Example contract:

```text
POST /api/v1/jobs
request:  {"source":"string","priority":"normal | high"}
response: {"id":"uuid","status":"queued"}
```

## 6. Worker (Luna)

One assigned task at a time unless Sol explicitly groups tightly related work.

Workflow: read task → inspect relevant code/tests → confirm assumptions → smallest correct implementation → tests → verification → coherent commits → immediate push after each commit → PR/review unit → completion report → address Terra feedback.

Startup checklist:

```text
[ ] Correct task branch; isolated worktree.
[ ] Read AGENTS.md + complete task.
[ ] Inspected relevant code/tests.
[ ] Understand acceptance criteria and non-goals.
[ ] Know any dependency/interface contract.
```

Workers decide routine local implementation details independently (variable names, private helpers, straightforward test shape, equivalent existing utility choice). Escalate public APIs, shared schemas, cross-service interfaces, persistent data, security boundaries, backward compatibility, or impact on another Worker's task.

If scope must expand: verify necessity, minimize it, notify Sol, explain cross-task impact, and wait when conflicts/architecture may change; trivial non-conflicting support changes may proceed if documented.

Behavior changes normally need tests. Prefer the smallest proving level: unit → integration when interaction matters → E2E for critical user flow. Test happy path, important edges, failures, and compatibility when relevant; avoid implementation-detail-only tests.

Completion report:

```md
## TASK-123 completion
**Status:** IN_REVIEW
**Branch:** agent/TASK-123-short-name
**Commit(s):** <sha...>
**Pushed:** yes — <remote branch>
**PR:** <url/id>

### What changed
- ...
### Verification
- `<command>` — PASS
### Important implementation notes
- ...
### Risks / follow-ups
- none
### Known limitations
- none
```

Never claim a check passed unless actually run. Workers cannot mark themselves `APPROVED`; only Terra approves. Only Sol marks `MERGED`.

## 7. Commit and recovery policy

Commits are review units **and** recovery checkpoints.

### 7.1 Size and coherence

Keep each commit **<200 changed lines total (additions + deletions) whenever reasonably possible**. Split larger work into coherent valid steps, e.g. contract/schema → implementation; core → tests; backend → frontend; module/responsibility boundaries; mechanical refactor → behavior; migration → app behavior.

Do not game the limit with meaningless fragments, broken intermediate states, or arbitrary line splits. Atomic/generated/mechanical work may exceed 200 when splitting reduces safety/clarity; explain the exception in commit body + PR. Explicitly call out generated files, lockfiles, snapshots, or other unavoidable churn.

One coherent concern per commit; do not mix unrelated fixes/refactors/formatting/dependency upgrades/tests/docs. Separate prerequisite refactor from behavior when both remain valid/reviewable.

### 7.2 Conventional Commits + detailed body

**Every commit uses Conventional Commits:**

```text
<type>(<scope>): <imperative summary>
```

Common types: `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `ci`, `perf`, `chore`, `revert`. Use `!` and/or `BREAKING CHANGE:` when required.

Every non-trivial commit body explains:
1. what changed,
2. why,
3. important decisions/constraints,
4. verification,
5. task ID,
6. relevant risk/compatibility/migration/follow-up notes.

Example:

```text
feat(auth): add rotating refresh token validation

Add server-side validation for refresh-token rotation and reject
previously consumed tokens before issuing a replacement.

Keep reuse detection inside the auth service so handlers do not
duplicate security policy.

Verification:
- pytest tests/auth/test_refresh_tokens.py
- mypy src/auth

Refs: TASK-031
```

For >200-line exceptions add e.g.:

```text
Size note:
This exceeds 200 changed lines because the generated migration snapshot
must remain synchronized with the schema change.
```

Never use vague messages (`fix stuff`, `updates`, `changes`, `WIP`, `cleanup`) or merely repeat a filename.

### 7.3 Push immediately after every commit

The remote branch is Herdr's durable recovery checkpoint. Required loop:

```text
edit → verify logical unit → commit → push immediately → confirm success → next unit
```

Typical:

```bash
git push -u origin HEAD   # first branch push
git push                  # thereafter
```

Do not accumulate unpushed commits or wait for task completion, PR readiness, review, or cleanup. Local should be at most one just-created commit ahead only for the time needed to push/confirm.

If push fails: stop further commits/substantial work when practical; diagnose; preserve local commit/worktree; escalate if not promptly resolvable; continue only after the state is safely pushed or Sol explicitly authorizes another recovery path.

Treat pushed commits as durable checkpoints. Avoid rebasing/amending/squashing already-pushed active history or force-pushing over another agent. If rewriting is genuinely necessary, get Sol approval and use the safest repository-approved method (prefer `--force-with-lease`). Normally fix with a new commit.

Before next logical unit:

```text
[ ] One coherent concern.
[ ] <200 changed lines where reasonable; exception justified.
[ ] Conventional subject + detailed body.
[ ] Task ID referenced.
[ ] Commit exists locally and is pushed successfully.
```

## 8. Pull requests

Each substantial task gets its own PR/equivalent review unit. It includes:

```md
## Summary
What changed and why.
## Task
TASK-123
## Changes
- ...
## Verification
- [x] Unit/integration/type/lint/etc.
## Risks
...
## Screenshots / evidence
When relevant.
## Reviewer notes
Anything needing special attention.
```

Do not submit known avoidable failures for review.

## 9. Reviewer (Terra)

Terra is independent, not a rubber stamp. Evaluate from first principles against the task; never assume Worker design is correct, passing tests prove completeness, the task captured every regression risk, or a small diff is safe.

Review in this order: **correctness → task completeness → regressions → security → data integrity → API/interface compatibility → concurrency/failure modes → tests → maintainability → style**. Do not focus on style while correctness issues remain.

Checklist:

```text
[ ] Every acceptance criterion satisfied; scope justified.
[ ] Edge/error paths correct.
[ ] Public interfaces compatible or intentionally changed.
[ ] Migrations safe/reversible when required.
[ ] Relevant concurrency/races considered.
[ ] Security-sensitive I/O considered.
[ ] Tests prove important behavior and would fail pre-change when appropriate.
[ ] No sensitive logging, dead/debug code.
[ ] Docs updated for changed behavior/contracts.
[ ] Verification evidence credible.
```

Severity:
- **BLOCKER:** must fix before merge; e.g. incorrect behavior, security vulnerability, data-corruption risk, broken API contract, required-test failure, unhandled migration risk.
- **MAJOR:** should fix before merge unless Sol explicitly accepts tradeoff; e.g. missing important tests, fragile design, major performance regression, substantial maintainability issue.
- **MINOR:** low-risk improvement; e.g. naming, localized simplification, small docs.
- **NIT:** optional polish; never block approval on nits.

Response:

```md
## Review: TASK-123
**Decision:** APPROVE | REQUEST_CHANGES

### Findings
1. **[BLOCKER] <title>**
   - Location: `path/file.py:123`
   - Problem: ...
   - Why it matters: ...
   - Suggested direction: ...

### Verification reviewed
- ...

### Final assessment
...
```

Terra never merges.

### 9.1 Revision loop

On `REQUEST_CHANGES`: Sol → `CHANGES_REQUESTED`; route findings to original Worker when practical; Worker addresses all BLOCKER/MAJOR findings, responds to each, reruns checks, creates/pushes new commits; task → `IN_REVIEW`; Terra rereviews. Repeat until approved/cancelled/escalated. Never merge unresolved BLOCKERs.

On `APPROVE`: Sol confirms all Worker commits are pushed, records `APPROVED`, and closes that Luna pane:

```bash
herdr pane close "<worker-pane-id>"
```

## 10. Specialized engineering safeguards

### 10.1 Generated files

Do not manually edit generated artifacts unless repository policy requires it. Change source → regenerate; record generation command in task/PR. Includes generated clients, protobuf outputs, generated lockfiles, compiled assets, codegen artifacts.

### 10.2 Dependencies

Adding/upgrading a dependency requires justification. Check for an existing suitable dependency, maintenance, license, size/runtime cost, security, version compatibility, lockfile impact. Do not add a dependency for a trivial helper safer/easier locally.

### 10.3 Database/migrations

Understand current schema; preserve rollout compatibility when needed; consider old/new app versions coexisting; no destructive change without explicit migration plan; test migration behavior; consider rollback; document backfills; separate schema migration from large behavior changes when useful. Passing only on an empty DB is insufficient.

### 10.4 Public API compatibility

Identify consumers: old clients, internal services, scripts, tests, docs, SDKs, caches, serialized formats. Prefer additive changes where compatibility matters. Breaking changes require Sol approval and User approval where appropriate.

### 10.5 Security

Treat external input as untrusted. Consider injection, authn/authz bypass/errors, path traversal, SSRF, unsafe deserialization, XSS, CSRF, command execution, secret leakage, insecure randomness, races, sensitive logging.

Never commit API keys, credentials, private tokens, production secrets, `.env` contents, or real sensitive user data. If a secret is found, report it without unnecessarily repeating it.

### 10.6 Observability

For important runtime changes, consider logs, metrics, traces, structured errors, audit events. Add only what aids diagnosis without exposing sensitive data; avoid noisy logging.

### 10.7 Performance

Do not prematurely optimize, but explicitly consider performance for DB queries, hot loops, large collections, serialization, network calls, model inference, caching, concurrency, startup, high-volume endpoints. When performance is a requirement, measure rather than guess.

## 11. Blocking, escalation, and User decisions

If a Worker is blocked: preserve branch/worktree; report exact blocker + evidence; propose recovery options; do not repeat the same failed approach without new information. Sol chooses whether to unblock, rescope, reassign, serialize, ask User, or cancel.

Ask the User only when remaining uncertainty is a product/policy decision such as expected visible behavior, compatibility tradeoff, irreversible migration, security posture, feature scope, UX preference, cost/performance tradeoff—not equivalent implementation techniques.

Escalation format:

```md
## Decision needed
**Issue:** ...
**Why this matters:** ...
**Option A:** ...
- Pros:
- Cons:
**Option B:** ...
- Pros:
- Cons:
**Recommendation:** ...
**Default if you do not care:** ...
```

Keep it focused; do not dump raw agent debate on the User.

## 12. Dispatch and handoff

Worker assignment packet:

```md
## Assignment: TASK-123
### Goal
...
### Why
...
### Scope
...
### Do not change
...
### Acceptance criteria
...
### Dependencies
...
### Interfaces
...
### Suggested starting points
- `path/to/file`
- `path/to/test`
### Required validation
...
### Return with
- branch
- commit SHA(s)
- confirmation every commit was pushed
- PR
- test results
- risks
```

Before dispatch:

```text
[ ] Task READY; dependencies satisfied.
[ ] Scope clear; acceptance criteria testable.
[ ] Shared-file conflicts understood.
[ ] Isolated worktree exists.
[ ] Dedicated Herdr pane created with worktree as cwd.
[ ] Actual pane ID captured/recorded.
[ ] Luna started as interactive TUI using:
    herdr agent start ... --kind opencode --pane <id> -- \
      --auto --model opencode/gpt-5.6-luna
[ ] `opencode run` is not used.
[ ] Needed interface contracts supplied.
```

Then record:

```text
Status: IN_PROGRESS
Owner: <worker-id>
Worktree: <path>
Branch: <branch>
```

## 13. Integration, validation, cleanup

Only Sol integrates approved work. Before merge: approval exists; dependency order correct; branch sufficiently current; required checks pass; comments understood; no accidental files.

Suggested flow:

```bash
git fetch
git checkout <integration-branch>
git merge --no-ff <approved-worker-branch>
```

Use repository merge/rebase policy if one exists.

After all required task branches integrate, run **whole-system** checks (distinct from Worker checks): full unit/integration/E2E as relevant, type checker, linter, build, migration validation, smoke test, security/static analysis. Individually passing PRs may still fail together.

If integration breaks: classify merge/interface/environment/behavioral cause → reopen smallest responsible task → assign appropriate Worker → rereview → rerun integration checks. Do not patch around unknown causes.

### 13.1 Definition of done

```text
[ ] User intent satisfied.
[ ] All required P0/P1 tasks MERGED.
[ ] Acceptance criteria satisfied.
[ ] Reviewer BLOCKER/MAJOR findings resolved.
[ ] Relevant tests + full integration checks pass.
[ ] No known critical regressions.
[ ] Docs updated where needed.
[ ] tasks.md reflects final state.
[ ] Temporary branches/worktrees can be cleaned safely.
[ ] User receives concise final report.
```

Final User report: outcome; what changed; validation commands/results; important migration/compatibility/config/deployment notes; remaining optional items. Report engineering outcomes, not swarm narration.

### 13.2 Cleanup order

**Pane cleanup precedes Git cleanup.** After Terra approval + confirmed pushes, close Worker pane immediately. Keep branch/worktree through integration and post-merge validation. Then, when safe:

```bash
git worktree remove ../worktrees/TASK-123
git branch -d agent/TASK-123-short-name
git worktree prune
```

Never delete an unmerged branch containing unpreserved work.

If post-approval integration later needs that Worker, create a new Herdr pane in the existing worktree and explicitly restart Luna:

```bash
herdr agent start "worker-${TASK_ID}" \
  --kind opencode \
  --pane "$worker_pane" \
  -- \
  --auto \
  --model opencode/gpt-5.6-luna
```

## 14. System invariants

1. One active owner per task.
2. One isolated worktree per active coding Worker.
3. Substantial changes require independent review before merge.
4. No unresolved BLOCKER enters integration.
5. `tasks.md` reflects real state.
6. Parallel tasks have explicit dependency/interface boundaries.
7. Sol owns coordination/integration; Luna owns implementation; Terra owns independent review; User owns product decisions.
8. System runs in Herdr.
9. Every OpenCode launch explicitly sets the correct model; Zen mapping is Sol=`opencode/gpt-5.6-sol`, Luna=`opencode/gpt-5.6-luna`, Terra=`opencode/gpt-5.6-terra`.
10. Every Worker/Reviewer is a visible interactive OpenCode TUI in its own Herdr pane, using `--auto`; `opencode run` is not used for these subagents; `opencode --run` is invalid.
11. Each Luna Worker starts in its assigned worktree.
12. Approved Luna panes close after Terra approval + confirmed pushes.
13. Commits are <200 changed lines whenever reasonably possible, coherent, Conventional Commits with detailed bodies, and pushed immediately after creation.

## 15. Quick loop

```text
USER
 ↓
SOL: inspect → clarify material ambiguity → plan → tasks.md/dependencies → dispatch
 ↓
LUNA WORKERS: visible Herdr panes + isolated worktrees
  opencode --auto --model opencode/gpt-5.6-luna
  implement → test → commit (<200 lines when practical) → push immediately → PR
 ↓
TERRA REVIEWER: visible Herdr pane
  opencode --auto --model opencode/gpt-5.6-terra
  inspect/test/reason → APPROVE or REQUEST_CHANGES
 ↓
revision loop as needed
 ↓
SOL: on approval close Luna pane → integrate → system validation → tasks.md → User report
```

## 16. Repository-specific overrides

Add project-specific requirements here: package manager, test/build/lint/typecheck/E2E commands, protected directories, formatting, deployment restrictions, service ownership, runtime versions, CI expectations.

```md
## Project Commands
Install: `<command>`
Test: `<command>`
Lint: `<command>`
Type check: `<command>`
Build: `<command>`
E2E: `<command>`
```

**Default operating sequence:** inspect → clarify → plan → isolate → implement → verify → commit/push → review → integrate → verify again.
