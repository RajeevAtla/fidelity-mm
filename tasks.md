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

## TASK-007: Reduce production bundle transfer
**Status:** MERGED
**Priority:** P1
**Owner:** orchestrator
**Reviewer:** reviewer-task-007a, reviewer-task-007b, reviewer-task-007c, reviewer-task-007d
**Depends on:** TASK-006
**Blocks:** none
**Worktree:** multiple child worktrees
**Branch:** multiple child branches
**PR:** #7, #8, #9

### Objective
Reduce production transfer size and improve repeat-visit cache efficiency without removing fonts, changing application behavior, or weakening data validation.

### Context
The baseline production build is 190.48 KiB raw, 72.43 KiB gzip, and 62.57 KiB Brotli. JavaScript is 89.99/24.01/19.85 KiB, CSS is 28.37/6.81/5.49 KiB, and the two served TTF fonts are 70.48/40.89/36.66 KiB. Bundled JSON source documents total about 46.64 KiB raw and 3.39 KiB gzip, and daily data changes currently invalidate the main JS asset.

### Scope
Benchmark and implement safe asset-format, data-delivery, bundler-runtime, and CSS reductions in that order. Retain only changes with measured benefit and clear verification.

### Non-goals
Do not remove or subset fonts or glyphs, replace Preact/Farm, redesign UI, change tax/data contracts, rename commands, alter scraper flags, or add speculative optimization infrastructure.

### Requirements
- Preserve all four original TTF files unchanged in the repository.
- Generate lossless WOFF2 equivalents for the two currently served variable fonts, preserving glyphs and variation axes; serve those WOFF2 files instead of TTF while retaining the originals.
- Evaluate separating frequently refreshed JSON from stable JavaScript. Keep the change only if GitHub Pages/base-path behavior, loading/error behavior, runtime validation, E2E behavior, and cache benefit are proven.
- Evaluate Farm runtime/chunk configuration. Keep only a supported setting that measurably reduces transfer without harming caching or behavior.
- Use browser CSS coverage across themes, categories, states, and expanded results before removing any CSS. Do not remove dynamic classes based on static coverage alone.
- Add no dependency unless the repository must reproducibly regenerate a committed artifact and the benefit justifies it.
- Measure raw, gzip, and Brotli sizes for each emitted asset and totals before and after using the same method.
- Document measured savings and any rejected experiments in the PR.

### Acceptance criteria
- [x] All four original font files remain byte-for-byte present.
- [x] Both visible typefaces and full variable-font capabilities remain available.
- [x] Production raw and compressed transfer sizes improve measurably.
- [x] Stable application code is not invalidated solely by refreshed JSON if data separation is retained.
- [x] Unit, type, data validation, build, and E2E checks pass.
- [x] Independent Terra review validates measurements and returns APPROVE.
- [x] All commits are pushed and the PR is merged into `main`.

### Interfaces / contracts
Application URL/base path, visible typography, static-host deployment, data JSON schemas/paths, package command names, scraper flags, and UI behavior remain compatible.

### Verification
Fresh baseline and final `bun run build`; per-asset raw/gzip/Brotli report; font metadata/glyph/axis comparison; `bun test`; `bun run typecheck`; `bun run validate:data`; `bun run test:e2e`; focused loading/error/cache checks for external data if retained; browser checks for both fonts and responsive UI.

### Notes / risks
External JSON can improve repeat caching without reducing cold total transfer, while WOFF2 should provide the largest cold-transfer reduction. Favor measurable wins over adding complexity for sub-kilobyte savings.

### Progress log
- 2026-08-16: Sol measured the baseline and recorded optimization order, compatibility constraints, and font-preservation contract.
- 2026-08-16: User requested parallel Worker/Reviewer systems; Sol decomposed font delivery, data/cache separation, and runtime/CSS optimization into TASK-007A, TASK-007B, and TASK-007C with serialized integration for overlapping files.
- 2026-08-16: PRs #7, #8, and #9 merged after independent Terra approval. Final main output is 172,968 raw / 68,036 gzip / 62,862 Brotli bytes, improving the 195,052 / 74,167 / 64,069 baseline by 22,084 / 6,131 / 1,207 bytes. Post-merge validation passed 77 unit tests, typecheck, data validation, build, 5 Chromium E2E tests, and diff checks.

## TASK-007A: Optimize font delivery
**Status:** MERGED
**Priority:** P1
**Owner:** worker-task-007a
**Reviewer:** reviewer-task-007a
**Depends on:** TASK-006
**Blocks:** TASK-007
**Worktree:** C:\fidelity-mm-bundle
**Branch:** agent/TASK-007A-font-woff2
**PR:** https://github.com/RajeevAtla/fidelity-mm/pull/7

### Objective
Reduce cold font transfer while retaining every original font file, glyph, and variation axis.

### Scope
Generate WOFF2 equivalents for the two variable fonts currently served, switch CSS delivery to WOFF2, benchmark output, and verify browser typography.

### Non-goals
Do not subset/remove fonts, externalize JSON, alter Farm runtime settings, or remove CSS.

### Requirements
- Preserve byte hashes for all four original TTF files.
- Preserve glyph coverage and variable axes in generated WOFF2 files.
- Record conversion tool/version/command without adding a runtime dependency.
- Measure font and total raw/gzip/Brotli output before and after.

### Acceptance criteria
- [x] Both visible typefaces render from WOFF2.
- [x] All original TTFs remain unchanged.
- [x] Cold compressed transfer improves measurably.
- [x] Full checks pass and Terra approves.

### Interfaces / contracts
Font family names, weight ranges, glyphs, variation axes, fallback behavior, and UI appearance remain compatible.

### Verification
Font hashes and metadata comparison, fresh bundle report, `bun test`, typecheck, validation, build, E2E, and browser font-loading checks.

### Notes / risks
Committed WOFF2 binaries are generated artifacts; document provenance and size exception.

### Progress log
- 2026-08-16: Existing Worker reassigned to the isolated font-delivery slice before implementation began.
- 2026-08-16: Worker pushed 088b1e5 and opened PR #7; WOFF2 reduced total output from 190.48/72.43/62.57 KiB raw/gzip/Brotli to 154.88/66.45/60.76 KiB with font equivalence and full checks passing.
- 2026-08-16: Terra independently verified hashes, font tables/glyphs/axes, CSS delivery, measurements, focused browser loading, and full checks; PR #7 approved with no findings.
- 2026-08-16: PR #7 merged to main as e6d789e after CI success and Terra approval; Luna pane closed.

## TASK-007B: Separate refreshed application data
**Status:** MERGED
**Priority:** P1
**Owner:** worker-task-007b
**Reviewer:** reviewer-task-007b
**Depends on:** TASK-006
**Blocks:** TASK-007
**Worktree:** C:\fidelity-mm-bundle-data
**Branch:** agent/TASK-007B-external-data
**PR:** https://github.com/RajeevAtla/fidelity-mm/pull/8

### Objective
Prevent daily JSON refreshes from invalidating stable application JavaScript while preserving static-host behavior and runtime validation.

### Scope
Evaluate and implement external delivery of the three root data documents only when cold/repeat measurements and behavior checks justify it.

### Non-goals
Do not change font/CSS delivery, Farm runtime policy beyond required asset copying, data schemas, scraper output paths, or visible tax behavior.

### Requirements
- Keep root `data/*.json` as scraper and validator source of truth.
- Publish/fetch data under the configured `/fidelity-mm/` base path without external services.
- Preserve loading, malformed-data, network-failure, ErrorBoundary, and model-context behavior.
- Prove a data-only content change leaves stable JS hashes unchanged.
- Measure cold and repeat transfer separately; reject the change if complexity outweighs cache benefit.

### Acceptance criteria
- [x] Runtime validation still guards all fetched documents.
- [x] GitHub Pages and local preview paths work.
- [x] Data-only changes do not invalidate stable JS when retained.
- [x] Full checks pass and Terra approves.

### Interfaces / contracts
JSON schemas, root source paths, package commands, app base path, freshness display, and error text remain compatible.

### Verification
Unit tests for loader paths/errors/cache behavior, build output checks, JS hash comparison after fixture-only change, full checks, and E2E success/failure paths.

### Notes / risks
This slice may touch Farm/package configuration; integrate before TASK-007C if both retain overlapping settings.

### Progress log
- 2026-08-16: Parallel data/cache slice defined and ready for isolated Worker dispatch.
- 2026-08-16: Assigned to worker-task-007b in isolated worktree C:\fidelity-mm-bundle-data.
- 2026-08-16: Worker pushed 9f9ecaa and 66be206 and opened PR #8; cold gzip stayed flat while a typical data-only refresh fell from a 15,586-byte app chunk to a 2,419-byte JSON transfer with stable JS hashes.
- 2026-08-16: Terra requested changes: measure real cold/warm/one-document-refresh behavior under `no-cache`, and add regression coverage proving a failed batch can be retried successfully.
- 2026-08-16: Worker pushed 5688696, added failed-load retry coverage, measured Chromium cold/warm/one-document-refresh wire behavior, replied to both findings, and returned PR #8 for Terra re-review with CI passing.
- 2026-08-16: Terra confirmed the retry contract and GitHub Pages ETag/no-cache model, resolved both threads, and approved PR #8 pending integration with TASK-007A.
- 2026-08-16: TASK-007A merged first; TASK-007B returned to its Luna worker to merge updated main and validate the combined font-plus-data result before final Terra review.
- 2026-08-16: Worker pushed integration head a441319 after merging main without conflicts, synchronizing the font E2E with asynchronous data bootstrap, and passing 77 unit tests, typecheck, data validation, build, 5 Chromium E2E tests, and CI. Final combined output is 173,324 raw / 68,113 gzip / 62,904 Brotli bytes versus the 195,052 / 74,167 / 64,069 baseline.
- 2026-08-16: Terra found no integration regressions, reproduced the final combined output, verified the focused Chromium font test, and approved a441319 for merge.
- 2026-08-16: PR #8 merged to main as 6dbc04f after final Terra approval; Luna pane closed.

## TASK-007C: Optimize Farm runtime and CSS
**Status:** MERGED
**Priority:** P2
**Owner:** worker-task-007c
**Reviewer:** reviewer-task-007c
**Depends on:** TASK-006
**Blocks:** TASK-007
**Worktree:** C:\fidelity-mm-bundle-runtime-css
**Branch:** agent/TASK-007C-runtime-css
**PR:** TBD

### Objective
Reduce non-font transfer by testing supported Farm output settings and browser-proven CSS reductions.

### Scope
Benchmark Farm runtime/chunk alternatives and collect CSS coverage across all dynamic states; retain only safe, measurable reductions.

### Non-goals
Do not alter fonts, externalize JSON, replace Farm/Preact, or remove dynamic styles based only on static analysis.

### Requirements
- Compare supported Farm configurations with clean builds and identical compression measurement.
- Exercise light/dark/system themes, every category, representative states, responsive layouts, and expanded results before removing CSS.
- Keep only changes with measurable benefit and no caching/behavior regression; a no-code result is acceptable when experiments do not clear that bar.
- Document every accepted/rejected experiment and exact measurements.

### Acceptance criteria
- [x] Retained changes have measured raw/gzip/Brotli benefit, or no change is retained when none clears the safety bar.
- [x] Dynamic styling and runtime loading remain correct.
- [x] Full checks pass and Terra approves the evidence or code.

### Interfaces / contracts
Build command, output base path, browser support, themes, categories, and responsive UI remain compatible.

### Verification
Clean bundle comparisons, browser CSS coverage, full checks, E2E, runtime asset inspection, and cache/chunk behavior review.

### Notes / risks
This slice may overlap TASK-007A in `styles.css` or TASK-007B in Farm config; rebase/merge current main normally and rerun review before integration if another slice lands first.

### Progress log
- 2026-08-16: Parallel runtime/CSS experiment slice defined and ready for isolated Worker dispatch.
- 2026-08-16: Assigned to worker-task-007c in isolated worktree C:\fidelity-mm-bundle-runtime-css.
- 2026-08-16: Worker retained no code: Farm variants saved at most 596 gzip bytes while weakening runtime caching or produced no gain, and CSS removal was rejected because complete dynamic browser coverage could not be proven. Clean branch submitted for Terra evidence review.
- 2026-08-16: Terra independently measured the inline runtime tradeoff, completed Node Playwright coverage across dynamic states (86.87% observed), passed full checks, and approved retaining baseline with no PR.
- 2026-08-16: Approved no-code decision integrated into TASK-007; no unsafe runtime or CSS experiment was retained.

## TASK-007D: Stabilize Tailwind source discovery
**Status:** MERGED
**Priority:** P0
**Owner:** worker-task-007d
**Reviewer:** reviewer-task-007d
**Depends on:** TASK-007A, TASK-007B
**Blocks:** TASK-007
**Worktree:** C:\fidelity-mm-bundle-scan
**Branch:** agent/TASK-007D-tailwind-source
**PR:** https://github.com/RajeevAtla/fidelity-mm/pull/9

### Objective
Prevent repository documentation and ignored artifacts from changing emitted production CSS when explicit application source paths already define Tailwind usage.

### Context
Post-merge validation emitted the `.inline` utility solely because the local `tasks.md` coordination entry contained the word `inline`; the clean reviewer worktree omitted it and was 23 raw bytes smaller.

### Scope
- Disable Tailwind automatic source discovery while retaining the existing explicit `@source` paths.
- Add the smallest regression check that proves unrelated repository text cannot add utilities.

### Non-goals
Do not change application styling, utility usage, fonts, data loading, or dependencies.

### Requirements
- Production CSS must depend only on the existing explicit application source files.
- The current application CSS and browser behavior must remain intact.

### Acceptance criteria
- [x] An unrelated tracked file containing a Tailwind utility name cannot alter generated CSS.
- [x] Full checks pass.
- [x] Terra approves.

### Interfaces / contracts
`src/styles/styles.css` remains the Tailwind entry point and existing explicit `@source` paths remain authoritative.

### Verification
- Build with and without unrelated utility text and compare generated CSS.
- `bun test`
- `bun run typecheck`
- `bun run build`
- `bun run test:e2e`

### Notes / risks
This is an integration-discovered reproducibility fix; the expected implementation is Tailwind's native `source(none)` import option.

### Progress log
- 2026-08-16: Post-merge validation isolated a 23-byte CSS difference to Tailwind scanning the word `inline` from `tasks.md`; final integration paused for an isolated fix and review.
- 2026-08-16: Assigned to worker-task-007d in isolated worktree C:\fidelity-mm-bundle-scan.
- 2026-08-16: Pushed 9cac143 and opened PR #9. Automatic scanning is disabled, the missing live `fund-results.tsx` source is explicit, unrelated-token utilities are removed, full checks pass, and final combined output measures 172,968 raw / 68,036 gzip / 62,862 Brotli bytes.
- 2026-08-16: Terra audited every live utility-string source and dynamic candidate, reproduced the isolation probe and final measurements, passed full checks, and approved PR #9 with no findings.
- 2026-08-16: PR #9 merged to main as 7a85faf after CI success and Terra approval; Luna pane closed.
