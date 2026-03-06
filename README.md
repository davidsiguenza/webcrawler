# WebCrawler

WebCrawler is a local CLI for crawling public web pages and producing two complementary outputs:

- structured `json` for agents, automation, and downstream processing
- navigable `html` previews for humans to review extracted images and text

The core model is simple:

1. provide a URL or a list of URLs
2. WebCrawler fetches and analyzes the page
3. it writes machine-readable JSON artifacts
4. it writes HTML previews for visual review

## What It Does

This project supports four main workflows:

- `scrape`: crawl a single page and output HTML, Markdown, or structured JSON
- `batch`: crawl multiple pages and generate one artifact pair per URL plus an aggregate index
- `brand`: analyze a storefront homepage and detect brand assets, content slots, and colors
- `workflow`: run the brand analysis and patch a target storefront project automatically

## Installation

```bash
npm install
```

Run locally:

```bash
node ./bin/webcrawler.js --help
```

If you install it as a local dependency in another project:

```bash
pnpm exec webcrawler --help
```

## Input and Output Model

### Input

All commands accept at least:

- a `url`

Exception:

- `batch` can accept one or more URLs directly or a `urls.txt` file

Depending on the command, you can also provide:

- an output file with `-o` or `--output`
- an output directory with `--out-dir`
- a target storefront directory with `--apply-to`

### Output

There are two output types:

- agent-facing output: `json`
- human-facing output: `html`

In practice:

- `scrape --format json -o file.json` generates `file.json` and `file.preview.html`
- `batch --out-dir dir/` generates `manifest.json`, `index.html`, and one folder per crawled URL
- `brand --out-dir dir/` generates `analysis.json` and `preview.html` inside that directory
- `workflow --out-dir dir/ --apply-to storefront/` generates the artifacts and also patches the storefront

## Commands

### 1. `scrape`

Use this when you want to crawl a single page and extract its content without patching another project.

Usage:

```bash
webcrawler scrape "<URL>" [options]
```

Important parameters:

- `<URL>`: required. The page to crawl.
- `--format`: optional. `html`, `markdown`, or `json`. Default: `markdown`.
- `-o, --output <file>`: optional but recommended when you want to save the result to disk.
- `--only-main-content`: optional. Restrict extraction to the main content area when possible.
- `--wait-for <ms>`: optional. Extra wait time before capture.

Examples:

```bash
webcrawler scrape "https://www.example.com" --format html -o ./outputs/example.html
webcrawler scrape "https://www.example.com" --format markdown --only-main-content -o ./outputs/example.md
webcrawler scrape "https://www.example.com" --format json -o ./outputs/example.json
```

If you use `--format json` and write to disk, you get:

```text
./outputs/example.json
./outputs/example.preview.html
```

The JSON includes:

- `requestedUrl`
- `finalUrl`
- `html`
- `markdown`
- `images`

The HTML preview lets you:

- review medium-sized images
- inspect nearby text/context
- copy any asset URL
- open an image in a modal
- select multiple cards and copy their URLs together

Notes:

- if you omit `-o`, the result is written to `stdout`
- the preview HTML is only generated automatically when JSON is written to disk

### 2. `batch`

Use this when you want to process multiple URLs in one command.

Usage:

```bash
webcrawler batch <urls.txt|url...> --out-dir <directory> [options]
```

Supported inputs:

- a `urls.txt` file
- multiple URLs passed directly as arguments
- a mix of a file and direct URLs

Important parameters:

- `<urls.txt|url...>`: required. A file containing URLs or one or more direct URLs.
- `--out-dir <directory>`: required. Target directory for the batch run.
- `--only-main-content`: optional.
- `--wait-for <ms>`: optional.

Example with a file:

```bash
webcrawler batch ./urls.txt --out-dir ./outputs/batch
```

Example with direct URLs:

```bash
webcrawler batch \
  "https://www.example.com/" \
  "https://www.example.com/women" \
  "https://www.example.com/men" \
  --out-dir ./outputs/batch
```

Generated output:

```text
./outputs/batch/manifest.json
./outputs/batch/index.html
./outputs/batch/pages/<slug-1>/page.json
./outputs/batch/pages/<slug-1>/page.preview.html
./outputs/batch/pages/<slug-2>/page.json
./outputs/batch/pages/<slug-2>/page.preview.html
```

What each file does:

- `manifest.json`: aggregate machine-readable summary with per-URL status and artifact paths
- `index.html`: human-readable batch index with links to every preview and JSON output
- `pages/<slug>/page.json`: structured output for that URL
- `pages/<slug>/page.preview.html`: human review page for that URL

Failure behavior:

- if one URL fails, the batch continues
- the error is recorded in `manifest.json`
- the failing item also appears in `index.html`

### 3. `brand`

Use this when the input URL is a storefront or brand homepage and you want asset extraction for branding work.

Usage:

```bash
webcrawler brand "<URL>" --brand-id <id> [options]
```

Important parameters:

- `<URL>`: required.
- `--brand-id <id>`: recommended. Stable brand identifier.
- `--display-name <text>`: optional. Human-facing brand name.
- `--out-dir <directory>`: optional. Directory where artifacts are written.
- `--apply-to <storefront-path>`: optional. Patch the target storefront project.
- `--replace`: optional. Replace existing brand blocks if they already exist.
- `--only-main-content`: optional.
- `--wait-for <ms>`: optional.

If you omit `--out-dir`, the default is:

```text
.webcrawler/<brandId>
```

Minimal example:

```bash
webcrawler brand "https://www.example.com" --brand-id mybrand --out-dir ./outputs/mybrand
```

Generated output:

```text
./outputs/mybrand/page.html
./outputs/mybrand/page.md
./outputs/mybrand/analysis.json
./outputs/mybrand/preview.html
./outputs/mybrand/branding-preset.snippet.ts
./outputs/mybrand/brand-tokens.css
./outputs/mybrand/env.txt
./outputs/mybrand/report.md
```

What each file does:

- `analysis.json`: structured output for agents
- `preview.html`: visual output for humans
- `page.html` and `page.md`: source captures of the page
- `branding-preset.snippet.ts`: ready-to-paste preset snippet
- `brand-tokens.css`: extracted CSS token block
- `env.txt`: suggested environment variable
- `report.md`: readable analysis summary

If you also want to apply the result directly to a storefront:

```bash
webcrawler brand "https://www.example.com" \
  --brand-id mybrand \
  --out-dir ./outputs/mybrand \
  --apply-to /path/to/storefront
```

### 4. `workflow`

Use this when you want the full storefront-branding workflow, including patching a target project.

Usage:

```bash
webcrawler workflow "<URL>" --apply-to <storefront-path> [options]
```

Important parameters:

- `<URL>`: required.
- `--apply-to <storefront-path>`: required.
- `--brand-id <id>`: recommended.
- `--out-dir <directory>`: optional.
- `--replace`: optional.
- `--typecheck`: optional. Run `typecheck` afterward.
- `--build`: optional. Run `build` afterward.
- `--push`: optional. Run `push` after a successful build.
- `--package-manager <pm>`: optional. `pnpm`, `npm`, or `yarn`. Default: `pnpm`.

Example:

```bash
webcrawler workflow "https://www.example.com" \
  --brand-id mybrand \
  --out-dir ./outputs/mybrand \
  --apply-to /path/to/storefront \
  --typecheck \
  --build
```

Workflow order:

1. crawl and analyze the URL
2. generate artifacts in `--out-dir`
3. patch the target storefront
4. run `typecheck` if requested
5. run `build` if requested
6. run `push` if requested

## When to Use Each Command

Use `scrape` if:

- you want a single page
- you want precise control over one URL per run
- you want generic JSON output
- you do not need storefront-specific branding inference

Use `batch` if:

- you want multiple pages in one run
- you want a single `manifest.json` summary
- you want a central `index.html` for human review
- you want the run to continue even if one URL fails

Use `brand` if:

- you are analyzing a storefront homepage
- you want logo, hero, featured content, and color detection
- you want `analysis.json` plus `preview.html`

Use `workflow` if:

- you want to patch a storefront automatically after analysis
- you want optional typecheck, build, or push steps

## Multiple Pages

There is a native multi-page mode: `batch`.

Recommended approach:

- put URLs in `urls.txt` or pass them directly
- use one `--out-dir`
- let WebCrawler create one subdirectory per URL and one aggregate manifest

### Case A: several arbitrary pages

If you want to crawl several pages from one site or many sites, use `batch`.

Example:

```bash
webcrawler batch \
  "https://www.example.com/" \
  "https://www.example.com/women" \
  "https://www.example.com/men" \
  --out-dir ./outputs/site-batch
```

Result:

```text
./outputs/site-batch/manifest.json
./outputs/site-batch/index.html
./outputs/site-batch/pages/example-com/page.json
./outputs/site-batch/pages/example-com/page.preview.html
./outputs/site-batch/pages/example-com-women/page.json
./outputs/site-batch/pages/example-com-women/page.preview.html
./outputs/site-batch/pages/example-com-men/page.json
./outputs/site-batch/pages/example-com-men/page.preview.html
```

### Case B: multiple URLs from a file

Create `urls.txt`:

```text
https://www.example.com/
https://www.example.com/women
https://www.example.com/men
```

Run:

```bash
webcrawler batch ./urls.txt --out-dir ./outputs/site-batch
```

### Case C: multiple storefront homepages

If you want branding analysis for several brands, run `brand` once per homepage:

```bash
webcrawler brand "https://brand-a.example.com" --brand-id brand-a --out-dir ./outputs/brand-a
webcrawler brand "https://brand-b.example.com" --brand-id brand-b --out-dir ./outputs/brand-b
```

Each directory gets its own:

- `analysis.json`
- `preview.html`
- supporting brand artifacts

### What Multi-Page Does Not Yet Do

Right now there is no:

- single aggregated brand-level `analysis.json` combining multiple pages
- automatic merge of many page payloads into one enriched canonical schema

## Using It from Another Project

### Run by absolute path

```bash
cd /path/to/target-project
node /Users/dsiguenza/Documents/Aplicaciones/WebCrawler/bin/webcrawler.js brand "https://www.example.com" --brand-id mybrand --out-dir ./.webcrawler/mybrand --apply-to .
```

### Install it as a local dependency

```bash
cd /path/to/target-project
pnpm add -D file:/Users/dsiguenza/Documents/Aplicaciones/WebCrawler
pnpm exec webcrawler brand "https://www.example.com" --brand-id mybrand --out-dir ./.webcrawler/mybrand --apply-to .
```

## Real Browser Rendering

By default, WebCrawler uses `fetch()` plus local HTML parsing.

If the page requires real browser rendering and the project has `playwright` installed:

```bash
WEBCRAWLER_USE_PLAYWRIGHT=1 webcrawler brand "https://www.example.com" --brand-id mybrand --out-dir ./outputs/mybrand
```

## Current Limitations

- authenticated flows and login-only pages are not supported
- color detection is heuristic and should be reviewed before deployment
- `brand` is optimized for storefront homepages, not deep full-site crawling
- patching `branding-presets.ts` assumes `export const BRANDING_PRESETS = { ... }` exists
