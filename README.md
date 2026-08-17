# Fidelity Money Market Fund Comparison

A browser-based comparison tool for Fidelity money market funds. The application presents current yields, fund categories, minimum investment requirements, tax-equivalent yields, and estimated after-tax results in a responsive comparison view.

The project is built as a static web application. Fund data is stored in the repository and refreshed by GitHub Actions, so the deployed site does not need a server or database.

## What the application provides

- A comparison table and bar-chart view for Fidelity money market funds.
- Current yield data for available fund classes.
- Minimum investment requirements for each fund.
- Tax-equivalent yield calculations based on selected federal and resident-state marginal brackets.
- Federal and resident-state tax bracket selection with estimated after-tax yield comparisons.
- Fund-category filters with results automatically ordered by estimated after-tax yield.
- Source links for each fund and calculation details for the current winner.
- An editable non-negative balance for the annual value estimate, defaulting to $10M.
- Shareable scenario URLs for resident state, tax brackets, category, balance, and expanded results.
- An in-page retry action when the current data cannot be loaded.
- Light and dark display themes.
- Responsive layouts for desktop, tablet, and mobile screens.

The figures shown in the application are informational comparisons. They are not investment recommendations, tax advice, or a guarantee of future performance. Rates, fund policies, tax rules, and eligibility requirements can change.

## Technology

- [Preact](https://preactjs.com/) for the user interface.
- [TypeScript](https://www.typescriptlang.org/) for application and data-refresh scripts.
- [Farm](https://farmfe.org/) for development and production builds.
- [Bun](https://bun.sh/) for package management and script execution.
- [Tailwind CSS](https://tailwindcss.com/) for utility styling.
- GitHub Pages for hosting the production build.
- GitHub Actions for scheduled data refreshes and deployment.

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/app/index.tsx` | Main application component and comparison interface. |
| `src/app/main.tsx` | Browser entry point that mounts the application. |
| `src/styles/styles.css` | Source styles, theme variables, layout rules, and responsive behavior. |
| `src/domain/bar-widths.ts` | Shared calculations used to size and scale comparison bars. |
| `src/domain/tax-brackets.ts` | Federal and state tax bracket data and tax-year configuration. |
| `data/fidelity-mm-allclass.json` | Yield and fund-class data used by the application. |
| `data/fidelity-mm-minimums.json` | Minimum investment values, source links, and a top-level check timestamp. |
| `data/fidelity-mm-tax-rules.json` | Tax-year-specific fund categories and government-obligation exemption percentages. |
| `src/scripts/fidelity/scrape-fidelity-mm.ts` | Refreshes yield and fund-class data from Fidelity's published fund listings. |
| `src/scripts/fidelity/scrape-fidelity-mm-minimums.ts` | Uses Fidelity fund numbers to refresh minimum investment data. |
| `src/scripts/fidelity/scrape-fidelity-mm-tax.ts` | Downloads Fidelity's annual tax letter and refreshes tax rules for every fund. |
| `src/scripts/check-bundle-budget.ts` | Checks the existing production output against raw, gzip, and Brotli size limits. |
| `tests/unit/` and `tests/e2e/` | Unit and Playwright tests for the application and refresh scripts. |
| `farm.config.ts` | Farm build configuration, including the deployment base path. |
| `.github/workflows/data.yml` | Scheduled and manual data-refresh workflow. |
| `.github/workflows/deploy.yml` | GitHub Pages build and deployment workflow. |

## Requirements

Install the following before working on the project:

- Bun, preferably the current stable release.
- Git.
- A modern browser for local review.

Node.js is not required for the normal project commands because the repository uses Bun to install dependencies, run TypeScript scripts, and launch the development server.

## Local development

Clone the repository and enter the project directory:

```sh
git clone https://github.com/RajeevAtla/fidelity-mm.git
cd fidelity-mm
```

Install dependencies:

```sh
bun install
```

Start the development server:

```sh
bun run dev
```

The development script serves the application locally. The exact port is defined by `src/scripts/dev.mjs`; use the URL printed by Bun in the terminal.

Create a production build:

```sh
bun run build
```

Preview the production build locally:

```sh
bun run preview
```

The build output is written to `dist/`. It is safe to remove and regenerate this directory.

Check a completed build without rebuilding it:

```sh
bun run check:bundle
```

The guard reports actual and maximum total sizes for raw, gzip, and Brotli, summing each emitted file in `dist/`. It fails if raw output exceeds 180,000 bytes, gzip exceeds 72,000 bytes, or Brotli exceeds 66,000 bytes.

## Available package scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Starts the local development server. |
| `bun run build` | Generates Tailwind CSS and creates a production Farm build. |
| `bun run check:bundle` | Checks the existing `dist/` output against the raw, gzip, and Brotli bundle budgets without rebuilding. |
| `bun run typecheck` | Type-checks the app, tests, and data scripts. |
| `bun run preview` | Serves the production build for local inspection. |
| `bun run scrape:fidelity` | Refreshes the yield and fund-class data file. |
| `bun run scrape:fidelity-minimums` | Refreshes the minimum investment data file. |
| `bun run scrape:fidelity-tax` | Refreshes fund categories and government-obligation percentages from Fidelity's annual tax letter. |

## Data files

### Yield and fund-class data

The application reads `data/fidelity-mm-allclass.json`. This file contains the fund classes used by the comparison view, including their symbols, names, categories, yields, and related fund metadata.

The yield scraper accepts an output path and a tab selection. The command used by the scheduled workflow is:

```sh
bun run scrape:fidelity -- --tab allClass --out data/fidelity-mm-allclass.json
```

### Minimum investment data

The minimum investment file has this general structure:

```json
{
  "source": "https://institutional.fidelity.com/...",
  "checkedAt": "2026-01-01T00:00:00.000Z",
  "count": 1,
  "funds": {
    "FUND_SYMBOL": {
      "minimumInvestment": 1000,
      "minimumLabel": "$1K",
      "sourceUrl": "https://institutional.fidelity.com/app/fund/sasid/details/...",
      "status": "verified"
    }
  }
}
```

Minimum refreshes use the following process:

1. Read the symbols and Fidelity fund numbers present in `data/fidelity-mm-allclass.json`.
2. Request each fund's institutional overview data using its fund number.
3. Read the `Minimum Initial Investment` feature from Fidelity's response.
4. Store the numeric value, a compact display label, and the Fidelity details URL.
5. Store one top-level `checkedAt` timestamp after every fund has been verified.

The refresh is all-or-nothing: if Fidelity does not return a parseable minimum for every fund, the scraper exits without replacing the checked-in file.

Run the minimum scraper manually with:

```sh
bun run scrape:fidelity-minimums -- --out data/fidelity-mm-minimums.json
```

Review the resulting diff before committing changes. Each fund retains its source URL, while `checkedAt` is stored once at the document root.

## Data refresh automation

The `.github/workflows/data.yml` workflow refreshes rates and minimums:

- On weekdays at 00:17 UTC.
- When started manually from the Actions tab.

The separate `.github/workflows/tax-data.yml` workflow checks Fidelity's annual tax letter monthly, on the third day at 01:43 UTC, and can also be started manually. Keeping it separate means a missing or delayed annual PDF cannot block weekday rate updates. Both workflows validate the complete checked-in dataset before committing their own files.

Failed refreshes retain logs and generated files as workflow artifacts for 14 days. When two scheduled runs of the same refresh workflow fail consecutively, automation opens an issue or adds the latest run links to the existing issue.

To perform a manual refresh:

1. Open the repository's **Actions** tab.
2. Select **Refresh Fidelity Data**.
3. Choose **Run workflow** on the `main` branch.
4. Review the resulting data commit and workflow logs.

A successful refresh triggers the deployment workflow through its `workflow_run` path because the default `GITHUB_TOKEN` commit does not start a `push` workflow. Normal commits to `main` use the `push` trigger, and the data workflow requires write access to repository contents because it commits refreshed JSON files.

## Tax calculations

Federal and state tax brackets are maintained in `src/domain/tax-brackets.ts`. The application uses single-filer marginal-rate selections rather than calculating a complete tax return. All 50 states are selectable, including Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, and Wyoming as zero ordinary-income-tax states. Washington's separate capital-gains tax is not applied to money-market yield income. Arkansas uses the separate lower-income tax-table schedule cited by the 2026 source; the app does not determine eligibility for Arkansas's alternate high-income schedule or model its deductions, credits, or exemptions. Keep the tax year and all bracket values together so a future update can be made in one place.

When updating tax rules:

1. Change the configured tax year.
2. Replace the bracket thresholds and rates for every supported filing status.
3. Confirm that bracket boundaries are ordered from lowest to highest.
4. Verify the calculation at zero income, at each bracket boundary, and above the highest threshold.
5. Review the displayed tax-equivalent yield and after-tax values in both themes.
6. Build the application before committing.

Tax calculations are estimates based on the selected federal and resident-state marginal brackets. Local taxes, deductions, credits, account type, capital-gains scenarios, and individual circumstances are outside the scope of the comparison.

## Comparison controls and sharing

Funds are automatically ordered by estimated after-tax yield for the selected brackets and category. The interface does not provide free-text search or user-selectable sorting. Category buttons filter the comparison without changing the calculation model.

Each fund ticker links to its Fidelity fund research source. The current winner's calculation details show its gross yield, federal and state rates, exemption percentage, tax-year inputs, and resulting after-tax yield. The balance input is a non-negative annual-value scenario control; it defaults to $10M and updates the displayed annual estimate without changing yield ordering.

Scenario state is stored in the URL with these exact query keys: `state`, `fi`, `ni`, `category`, `balance`, and `expanded`. Invalid values fall back to the current defaults. Theme preference remains in the existing local storage setting rather than the scenario URL.

If the three runtime data documents cannot be loaded, the application shows a `Retry loading Fidelity data` button. Retrying runs the existing data-load path again in the page; a full browser refresh is not required.

## Tax-exemption data

The application reads `data/fidelity-mm-tax-rules.json` rather than maintaining fund rules in the user interface. The refresh script downloads Fidelity's annual percentage-of-income letter, extracts the percentage of eligible income from U.S. government securities, and maps each current rate-sheet symbol to a fund category and government-obligation exemption percentage. The selected resident state determines the treatment of the available state-specific municipal fund categories.

State-specific municipal income is treated as exempt only when the fund's state matches the selected resident state. National and other-state municipal income remains state-taxable in this estimate. Confirm current state rules before relying on the comparison.

Fidelity publishes these percentages by tax year. The file records the tax year, source PDF, a top-level check timestamp, category, and government-obligation percentage for every fund symbol. Institutional share classes that belong to the same underlying portfolio receive the portfolio percentage from the annual letter.

The tax letter is a PDF. The automated workflow installs `poppler-utils` and uses `pdftotext` to extract its table. To run this locally, install Poppler or another distribution that provides the `pdftotext` command before running:

```sh
bun run scrape:fidelity-tax -- --out data/fidelity-mm-tax-rules.json
```

Do not replace a missing annual letter with an estimate. If Fidelity changes the document URL or table labels, update the scraper's source matching and verify the generated values against the published PDF.

## GitHub Pages deployment

The `.github/workflows/deploy.yml` workflow builds the application and publishes `dist/` to GitHub Pages for normal commits pushed to `main`, successful refresh workflow completions, and manual dispatch. Refresh completions use `workflow_run` because their default `GITHUB_TOKEN` commits do not trigger `push` workflows.

The Farm configuration accounts for the repository's project-site path. If the repository name or hosting location changes, review `farm.config.ts` and `index.html` for base paths and asset URLs.

A deployment consists of:

1. Checking out `main`.
2. Installing dependencies with Bun.
3. Running `bun run build`.
4. Uploading `dist/` as a Pages artifact.
5. Publishing the artifact through the `github-pages` environment.

If the build succeeds but the site is unavailable, check the repository's Pages settings and confirm that the deployment environment is enabled.

## Updating fund mappings

Fund minimums are keyed by ticker symbol, while Fidelity's institutional endpoint uses the fund numbers already supplied by the daily rate sheet. No separate symbol-to-CUSIP mapping is required.

If a symbol cannot be resolved:

- Confirm that it exists in `data/fidelity-mm-allclass.json`.
- Confirm that the rate sheet includes both a symbol and fund number.
- Open the fund's institutional details URL and confirm its number has not changed.
- Run the scraper again and inspect the error message.
- Do not guess a fund number or copy a nearby fund's minimum.

When a fund is renamed, closed, or replaced, update the source data and verify that the old symbol is no longer displayed.

## Quality checks

Before opening a pull request or pushing to `main`:

```sh
bun install
bun run build
bun run scrape:fidelity -- --tab allClass --out data/fidelity-mm-allclass.json
bun run scrape:fidelity-minimums -- --out data/fidelity-mm-minimums.json
```

Also inspect the application manually at:

- A wide desktop viewport.
- A narrow mobile viewport.
- Light mode.
- Dark mode.
- A view with long fund names and large minimum values.
- A view with the smallest and largest yields.
- A view filtered to each fund category.
- A view with all results expanded.

For data changes, verify that:

- Every displayed symbol has a matching minimum entry.
- Every minimum has a Fidelity source URL.
- Numeric values and labels agree.
- Each generated document has a valid top-level `checkedAt` timestamp.
- No unexpected fund classes were added or removed.
- The generated JSON is valid and formatted consistently.

## Troubleshooting

### The development server does not start

Remove the installed dependency directory and reinstall:

```sh
bun install
bun run dev
```

If the port is already in use, stop the other local process or use the port option supported by `src/scripts/dev.mjs`.

### The build fails after a style change

Run the build directly to see the complete Tailwind or Farm error:

```sh
bun run build
```

Check for invalid CSS nesting, missing imports, malformed TypeScript, and references to files that are not included in the repository.

### A fund minimum cannot be refreshed

The most common causes are a missing fund number, a changed Fidelity response structure, or a temporary request failure. Check the scraper output and the fund's source URL before changing data.

### The scheduled workflow fails

Open the failed **Refresh Fidelity Data** run and inspect the first failing step. Common causes include:

- A changed Fidelity response format.
- A temporary Fidelity response failure.
- A missing fund symbol or fund number.
- A malformed generated data file.
- A repository permission or branch-protection change.

Do not overwrite the minimum data file with empty or partial results.

## License and data notice

The source code is released under the [MIT License](LICENSE). Fidelity names, fund names, symbols, yields, and related fund information belong to their respective owners. The project links to Fidelity's public research pages for reference. Always confirm current fund details and eligibility requirements with Fidelity before making a decision.
