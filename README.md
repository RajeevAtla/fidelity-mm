# Fidelity Money Market Fund Comparison

A browser-based comparison tool for Fidelity money market funds. The application presents current yields, fund categories, minimum investment requirements, tax-equivalent yields, and estimated after-tax results in a responsive comparison view.

The project is built as a static web application. Fund data is stored in the repository and refreshed by GitHub Actions, so the deployed site does not need a server or database.

## What the application provides

- A comparison table and bar-chart view for Fidelity money market funds.
- Current yield data for available fund classes.
- Minimum investment requirements for each fund.
- Tax-equivalent yield calculations based on filing status and income.
- Federal tax bracket selection and estimated after-tax yield comparisons.
- Search, filtering, sorting, and fund-category controls.
- Light and dark display themes.
- Responsive layouts for desktop, tablet, and mobile screens.
- Links to the corresponding Fidelity fund research pages.

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
| `index.tsx` | Main application component and comparison interface. |
| `main.tsx` | Browser entry point that mounts the application. |
| `styles.css` | Source styles, theme variables, layout rules, and responsive behavior. |
| `bar-widths.ts` | Shared calculations used to size and scale comparison bars. |
| `tax-brackets.ts` | Federal tax bracket data and tax-year configuration. |
| `data/fidelity-mm-allclass.json` | Yield and fund-class data used by the application. |
| `data/fidelity-mm-minimums.json` | Minimum investment values, source links, and scrape timestamps. |
| `scripts/scrape-fidelity-mm.ts` | Refreshes yield and fund-class data from Fidelity's published fund listings. |
| `scripts/scrape-fidelity-mm-minimums.ts` | Resolves fund symbols to CUSIPs and refreshes minimum investment data. |
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

The development script serves the application locally. The exact port is defined by `scripts/dev.mjs`; use the URL printed by Bun in the terminal.

Create a production build:

```sh
bun run build
```

Preview the production build locally:

```sh
bun run preview
```

The build output is written to `dist/`. It is safe to remove and regenerate this directory.

## Available package scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Starts the local development server. |
| `bun run build` | Generates Tailwind CSS and creates a production Farm build. |
| `bun run preview` | Serves the production build for local inspection. |
| `bun run scrape:fidelity` | Refreshes the yield and fund-class data file. |
| `bun run scrape:fidelity-minimums` | Refreshes the minimum investment data file. |

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
  "scrapedAt": "2026-01-01T00:00:00.000Z",
  "count": 1,
  "funds": {
    "FUND_SYMBOL": {
      "minimumInvestment": 1000,
      "minimumLabel": "$1K",
      "sourceUrl": "https://fundresearch.fidelity.com/mutual-funds/summary/...",
      "scrapedAt": "2026-01-01T00:00:00.000Z"
    }
  }
}
```

Minimum refreshes use the following process:

1. Read the symbols present in `data/fidelity-mm-allclass.json`.
2. Find each symbol and its nine-character CUSIP in Fidelity's money-market fund catalog.
3. Request the fund summary data associated with that CUSIP.
4. Read the retail minimum investment value from Fidelity's summary response.
5. Store the numeric value, a compact display label, the Fidelity source URL, and the refresh timestamp.
6. Preserve an existing checked-in value when Fidelity does not expose an API response for a closed or institutional share class.

The fallback behavior is intentional. Some institutional or closed classes have valid fund research pages but do not return a retail summary response. A failed refresh still stops if a symbol has neither a current API response nor an existing checked-in value.

Run the minimum scraper manually with:

```sh
bun run scrape:fidelity-minimums -- --out data/fidelity-mm-minimums.json
```

Review the resulting diff before committing changes. The source URL and timestamp should be retained for every fund.

## Data refresh automation

The `.github/workflows/data.yml` workflow runs:

- On weekdays at midnight UTC.
- On every push to `main`.
- When started manually from the Actions tab.

The workflow installs Bun dependencies, runs both refresh scripts, and commits changes under `data/` when the generated files differ from the checked-in versions.

To perform a manual refresh:

1. Open the repository's **Actions** tab.
2. Select **Refresh Fidelity Data**.
3. Choose **Run workflow** on the `main` branch.
4. Review the resulting data commit and workflow logs.

A refresh commit may trigger the deployment workflow. The data workflow requires write access to repository contents because it commits refreshed JSON files.

## Tax calculations

Federal tax brackets are maintained in `tax-brackets.ts`. The file includes the active tax year and bracket thresholds for each supported filing status. Keep the tax year and all bracket values together so a future update can be made in one place.

When updating tax rules:

1. Change the configured tax year.
2. Replace the bracket thresholds and rates for every supported filing status.
3. Confirm that bracket boundaries are ordered from lowest to highest.
4. Verify the calculation at zero income, at each bracket boundary, and above the highest threshold.
5. Review the displayed tax-equivalent yield and after-tax values in both themes.
6. Build the application before committing.

Tax calculations are estimates based on the selected federal brackets. State and local taxes, deductions, credits, account type, and individual circumstances are outside the scope of the comparison.

## GitHub Pages deployment

The `.github/workflows/deploy.yml` workflow builds the application and publishes `dist/` to GitHub Pages whenever `main` changes. It can also be started manually.

The Farm configuration accounts for the repository's project-site path. If the repository name or hosting location changes, review `farm.config.ts` and `index.html` for base paths and asset URLs.

A deployment consists of:

1. Checking out `main`.
2. Installing dependencies with Bun.
3. Running `bun run build`.
4. Uploading `dist/` as a Pages artifact.
5. Publishing the artifact through the `github-pages` environment.

If the build succeeds but the site is unavailable, check the repository's Pages settings and confirm that the deployment environment is enabled.

## Updating fund mappings

Fund minimums are keyed by ticker symbol, while Fidelity's research endpoints use CUSIPs. The CUSIP relationship is resolved from Fidelity's catalog during each refresh; it is not maintained as a manually duplicated list in the application.

If a symbol cannot be resolved:

- Confirm that it exists in `data/fidelity-mm-allclass.json`.
- Check Fidelity's money-market catalog for a matching symbol and CUSIP.
- Confirm that the catalog's symbol/CUSIP labels have not changed.
- Run the scraper again and inspect the error message.
- Do not guess a CUSIP or copy a nearby fund's minimum.

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
- A view with no matching search results.

For data changes, verify that:

- Every displayed symbol has a matching minimum entry.
- Every minimum has a Fidelity source URL.
- Numeric values and labels agree.
- The refresh timestamp is present.
- No unexpected fund classes were added or removed.
- The generated JSON is valid and formatted consistently.

## Troubleshooting

### The development server does not start

Remove the installed dependency directory and reinstall:

```sh
bun install
bun run dev
```

If the port is already in use, stop the other local process or use the port option supported by `scripts/dev.mjs`.

### The build fails after a style change

Run the build directly to see the complete Tailwind or Farm error:

```sh
bun run build
```

Check for invalid CSS nesting, missing imports, malformed TypeScript, and references to files that are not included in the repository.

### A fund minimum cannot be refreshed

The most common causes are a missing catalog match, a changed Fidelity page structure, or a share class that is not available through Fidelity's retail summary API. Check the scraper output and the fund's source URL before changing data.

### The scheduled workflow fails

Open the failed **Refresh Fidelity Data** run and inspect the first failing step. Common causes include:

- A changed Fidelity catalog format.
- A temporary Fidelity response failure.
- A missing fund symbol or CUSIP.
- A malformed generated data file.
- A repository permission or branch-protection change.

Do not overwrite the minimum data file with empty or partial results.

## License and data notice

The source code is released under the [MIT License](LICENSE). Fidelity names, fund names, symbols, yields, and related fund information belong to their respective owners. The project links to Fidelity's public research pages for reference. Always confirm current fund details and eligibility requirements with Fidelity before making a decision.

Fidelity names, fund names, symbols, yields, and related fund information belong to their respective owners. The project links to Fidelity's public research pages for reference. Always confirm current fund details and eligibility requirements with Fidelity before making a decision.
