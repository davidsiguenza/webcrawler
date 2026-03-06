---
name: webcrawler
description: Use this skill when the user wants to crawl one or more public web pages, extract structured content or image candidates, generate machine-readable JSON artifacts, create human-friendly HTML previews, run batch crawls from a urls.txt file, or analyze a storefront homepage for branding assets.
---

# WebCrawler

## Overview

This skill bundles a local Node CLI for website crawling with dual outputs:

- JSON artifacts for agents, pipelines, and post-processing
- HTML previews for humans to review images and extracted context

Use it for:

- single-page extraction
- multi-page batch crawling
- storefront homepage branding analysis
- storefront branding workflows that patch a target project

## Output Rules

- Always write artifacts into the user's workspace, not into the skill directory.
- Prefer a dedicated output folder such as `./outputs/webcrawler/` unless the user gives a path.
- After each run, report the most important artifact paths back to the user.

## Command Selection

### Single page, generic extraction

Use:

```bash
scripts/run-webcrawler.sh scrape "<url>" --format json -o "<workspace-output>.json"
```

This writes:

- `<workspace-output>.json`
- `<workspace-output>.preview.html`

### Multiple pages

Use:

```bash
scripts/run-webcrawler.sh batch "<urls.txt|url...>" --out-dir "<workspace-output-dir>"
```

This writes:

- `<workspace-output-dir>/manifest.json`
- `<workspace-output-dir>/index.html`
- one `page.json` and one `page.preview.html` per crawled URL

Prefer `batch` whenever the user wants more than one page.

### Storefront homepage analysis

Use:

```bash
scripts/run-webcrawler.sh brand "<url>" --brand-id "<brand-id>" --out-dir "<workspace-output-dir>"
```

This writes:

- `analysis.json`
- `preview.html`
- supporting HTML, Markdown, CSS, and report artifacts

### Storefront workflow with patching

Use:

```bash
scripts/run-webcrawler.sh workflow "<url>" --brand-id "<brand-id>" --out-dir "<workspace-output-dir>" --apply-to "<storefront-path>"
```

Add `--typecheck`, `--build`, or `--push` only when the user explicitly wants those steps.

## Batch Input Format

For `batch`, accept either:

- one or more direct URLs
- a text file containing one URL per line

Ignore blank lines and lines starting with `#`.

## Execution Notes

- `scripts/run-webcrawler.sh` bootstraps dependencies with `npm install` if needed.
- If the user only wants machine-readable output, `scrape --format json` is the default recommendation.
- If the user wants both review and machine consumption, prefer JSON outputs because they automatically generate companion HTML previews.
- `brand` and `workflow` are specialized for storefront homepages, not for arbitrary deep-site crawling.
- Authenticated pages, login-only flows, and highly interactive apps may not extract correctly without additional browser automation.

## What to Return

When you finish a run, tell the user:

- which command was used
- where the JSON output lives
- where the HTML preview lives
- whether there were any failures in the batch manifest
