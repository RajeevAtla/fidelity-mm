# Pull Request Review And Integration

## TASK-005: Review modular boundary refactor
**Status:** MERGED
**Priority:** P1
**Owner:** worker-task-005
**Reviewer:** reviewer
**Depends on:** none
**Blocks:** TASK-004
**Worktree:** C:\fidelity-mm-refactor
**Branch:** refactor/modular-pure-boundaries
**PR:** https://github.com/RajeevAtla/fidelity-mm/pull/5

### Objective
Verify, revise, independently review, and merge the pure domain and I/O boundary refactor.

### Context
The PR extracts fund, category, freshness, theme, retry, scraper, validator, and runtime data-boundary logic. It is currently cleanly mergeable and CI passes, but it has no independent review.

### Scope
Review the complete PR against `main`, make only changes required for correctness and merge readiness, run relevant checks, push every commit, and keep the existing PR updated.

### Non-goals
Do not add resident-state tax support from PR #4 or perform unrelated cleanup.

### Requirements
- Preserve current application behavior while isolating pure logic and side effects.
- Validate runtime data fields consumed by the application.
- Keep scripts import-safe and retry behavior correct.
- Address every BLOCKER or MAJOR reviewer finding.

### Acceptance criteria
- [x] Worker verification passes.
- [x] Independent Terra review returns APPROVE.
- [x] All commits are pushed and PR checks pass.
- [x] PR is merged into `main`.

### Interfaces / contracts
Existing application JSON and UI behavior remain compatible. Category codes remain `p`, `g`, `t`, `nm`, `nj`, `ny`, `ca`, and `ma`.

### Verification
`bun test`, `bun run typecheck`, `bun run validate:data`, `bun run build`, and `bun run test:e2e`.

### Notes / risks
The PR overlaps TASK-004 in core configuration, calculation, UI, tax scraper, and validator files.

### Progress log
- 2026-08-15: Existing PR and worktree inspected; queued for Worker verification and Terra review.
- 2026-08-15: Assigned to worker-task-005 in the existing isolated worktree.
- 2026-08-16: Worker merged current main and pushed fixes for abort propagation, cancellable backoff, empty winner inputs, and missing matchMedia support; advanced to Terra review.
- 2026-08-16: Terra requested changes because caller abort rejected the retry wrapper without clearing the default backoff timer; returned to the original Worker.
- 2026-08-16: Worker pushed f478c39 with cancellable default backoff timers and a regression test; full validation and CI pass; returned to Terra re-review.
- 2026-08-16: Terra verified the fix with focused, full, build, E2E, and real-timer checks; resolved the thread and approved TASK-005.
- 2026-08-16: PR #5 merged into main as 26985be7fa99497066251c12f402c255eed7a21e.
- 2026-08-16: Combined-main validation passed: 72 tests, typecheck, data validation, build, and 2 Chromium E2E tests.

## TASK-004: Review resident-state tax support
**Status:** MERGED
**Priority:** P1
**Owner:** worker-task-004
**Reviewer:** reviewer
**Depends on:** TASK-005
**Blocks:** none
**Worktree:** C:\fidelity-mm-all-states
**Branch:** feat/all-states-tax-support
**PR:** https://github.com/RajeevAtla/fidelity-mm/pull/4

### Objective
Reconcile, revise, independently review, and merge resident-state tax support after TASK-005 lands.

### Context
The PR adds state profiles, resident-state selection, state-specific municipal exemptions, data updates, and tests. It is currently conflicted and has four unresolved review findings.

### Scope
Integrate current `main` after TASK-005, preserve the modular boundaries, resolve conflicts, address known and new review findings, run relevant checks, push every commit, and keep the existing PR updated.

### Non-goals
Do not model full tax returns, deductions, credits, local taxes, or capital-gains scenarios.

### Requirements
- Include all 50 resident states, including zero ordinary-income-tax states.
- Represent required 0% lower brackets and accurately handle Arkansas's applicable schedule or explicitly constrain the UI contract.
- Ensure model-context tools report the selected resident state rather than the static default.
- Preserve state municipal and government-obligation exemption behavior.
- Address every BLOCKER or MAJOR reviewer finding.

### Acceptance criteria
- [x] TASK-005 is merged and its architecture is preserved.
- [x] Existing review threads are addressed.
- [x] Worker verification passes.
- [x] Independent Terra review returns APPROVE.
- [x] All commits are pushed and PR checks pass.
- [x] PR is merged into `main`.

### Interfaces / contracts
The selected resident-state code controls state brackets, labels, state-specific municipal exemptions, and model-context output. Money-market yield is modeled as ordinary income.

### Verification
`bun test`, `bun run typecheck`, `bun run validate:data`, `bun run build`, and `bun run test:e2e`.

### Notes / risks
Eight files overlap TASK-005. Conflict resolution must retain pure module and runtime-boundary changes.

### Progress log
- 2026-08-15: Existing PR, worktree, and four unresolved review threads inspected; blocked on TASK-005 integration.
- 2026-08-16: Independent Terra review submitted REQUEST_CHANGES; no new findings beyond the four existing merge blockers, and all current branch checks passed.
- 2026-08-16: TASK-005 merged; TASK-004 unblocked and assigned to worker-task-004 for reconciliation and revision.
- 2026-08-16: Worker merged current main, preserved modular boundaries and newer data, pushed 53e63bc resolving all four blockers, replied to each thread, and passed full validation plus CI.
- 2026-08-16: Terra independently verified all fixes, resolved all four threads, passed focused/full/build/E2E checks, and approved TASK-004.
- 2026-08-16: PR #4 merged into main as c7ae8c6e28ce07e9b0fa50d42c2add4878fd6e66.
- 2026-08-16: Combined-main validation passed: 72 tests, typecheck, data validation, build, and 2 Chromium E2E tests.

## TASK-006: Organize source and test trees
**Status:** MERGED
**Priority:** P1
**Owner:** worker-task-006
**Reviewer:** reviewer
**Depends on:** none
**Blocks:** none
**Worktree:** C:\fidelity-mm-structure
**Branch:** agent/TASK-006-organize-source-tests
**PR:** https://github.com/RajeevAtla/fidelity-mm/pull/6

### Objective
Move production code into a structured `src/` tree and every automated test into a structured `tests/` tree without changing behavior.

### Context
Runtime modules and unit tests are currently mixed at the repository root, scraper implementations and tests share `scripts/`, and E2E tests use a separate top-level directory.

### Scope
Move files, update imports and tool configuration, update documentation, and preserve all runtime, scraper, build, validation, and test behavior.

### Non-goals
Do not rename public behavior, redesign modules, change tax/data contracts, alter generated JSON, upgrade dependencies, or refactor implementation logic beyond path changes required by the move.

### Requirements
- Use this source layout:
  - `src/app/`: browser entry, application component, and model context.
  - `src/config/`: application configuration.
  - `src/data/`: data contracts, source metadata, and runtime boundary.
  - `src/domain/`: calculations, categories, fund model, tax brackets, and bar widths.
  - `src/ui/`: UI components, freshness model, and theme logic/adapters.
  - `src/scripts/`: development and shared script utilities.
  - `src/scripts/fidelity/`: Fidelity scrapers, parser helpers, and validator.
  - `src/styles/`: source and generated CSS locations.
- Use this test layout:
  - `tests/unit/app/`, `tests/unit/data/`, `tests/unit/domain/`, `tests/unit/ui/`, and `tests/unit/scripts/` mirroring source responsibilities.
  - `tests/e2e/` for Playwright tests.
- Keep repository configuration, `index.html`, static `data/`, `fonts/`, workflows, and documentation at the repository root.
- Update `package.json`, `tsconfig.json`, Farm, Playwright, HTML, CSS asset paths, workflows if needed, README, and `llms.txt` for the new paths.
- Leave no test files outside `tests/` and no application/scraper source outside `src/`, excluding root tool configuration files.
- Preserve import-safe scripts and all existing command names.

### Acceptance criteria
- [x] `src/` and `tests/` match the recorded layout.
- [x] No `*.test.*` or `*.e2e.*` files remain outside `tests/`.
- [x] Existing CLI commands and browser entry point work at their new paths.
- [x] Unit, type, data validation, build, and E2E checks pass.
- [x] Independent Terra review returns APPROVE.
- [x] All commits are pushed and the PR is merged into `main`.

### Interfaces / contracts
Package script names, data file paths, application URL/base path, tax/data schemas, scraper CLI flags, and observable UI behavior remain unchanged.

### Verification
`bun test`, `bun run typecheck`, `bun run validate:data`, `bun run build`, `bun run test:e2e`, and a file-layout check proving tests and source are in their required roots.

### Notes / risks
This is a tightly coupled mechanical move across shared imports and build entry points, so one Worker owns the complete migration. An atomic move commit may exceed 200 changed lines if splitting would leave broken intermediate states; document the size exception.

### Progress log
- 2026-08-16: Sol inventoried source, tests, scripts, build configuration, workflows, and documentation; layout contract recorded.
- 2026-08-16: Assigned to worker-task-006 in isolated worktree C:\fidelity-mm-structure.
- 2026-08-16: Worker pushed atomic layout commit 3011cd4, opened PR #6, and passed unit, focused scraper, type, data, build, E2E, diff, old-path, and file-layout checks.
- 2026-08-16: Terra independently reviewed PR #6 with no findings, passed the full verification suite, and approved TASK-006; CI passed.
- 2026-08-16: PR #6 merged into main as 2cdf292ccdc110712ac9ae3ca85ae03bc14794c5.
- 2026-08-16: Combined-main validation passed: 72 tests, typecheck, data validation, build, 2 Chromium E2E tests, and zero source/test files outside their required roots.
