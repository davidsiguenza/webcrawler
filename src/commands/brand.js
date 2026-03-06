import { formatJson } from '../lib/artifacts.js';
import { parseArgs } from '../lib/args.js';
import { applyBranding } from '../lib/apply-branding.js';
import { generateBrandArtifacts } from '../lib/brand-pipeline.js';

export async function runBrand(argv) {
  const { positional, options } = parseArgs(argv);
  const [url] = positional;

  if (!url) {
    throw new Error('Missing URL. Usage: webcrawler brand <url> [options]');
  }

  const { analysis, outputDir, previewHtmlPath } = await generateBrandArtifacts({
    url,
    waitFor: options.waitFor,
    onlyMainContent: options.onlyMainContent,
    brandId: options.brandId,
    displayName: options.displayName,
    outDir: options.outDir,
  });

  if (options.applyTo) {
    await applyBranding(analysis, options.applyTo, {
      replace: Boolean(options.replace),
    });
  }

  process.stdout.write(formatJson({
    brandId: analysis.brandId,
    displayName: analysis.displayName,
    outputDir,
    previewHtml: previewHtmlPath,
    appliedTo: options.applyTo || null,
  }));
}
