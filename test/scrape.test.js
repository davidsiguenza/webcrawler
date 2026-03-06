import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { runScrape } from '../src/commands/scrape.js';

test('scrape json output generates a companion preview html', async () => {
  const tempPath = await mkdtemp(path.join(os.tmpdir(), 'webcrawler-scrape-'));
  const outputPath = path.join(tempPath, 'sample.json');

  await runScrape([
    'file:///Users/dsiguenza/Documents/Aplicaciones/WebCrawler/test/fixtures/sample-brand.html',
    '--format',
    'json',
    '--only-main-content',
    '--output',
    outputPath,
  ]);

  const json = await readFile(outputPath, 'utf8');
  const preview = await readFile(path.join(tempPath, 'sample.preview.html'), 'utf8');

  assert.match(json, /"images": \[/);
  assert.match(preview, /Detected images/);
  assert.match(preview, /Copy URL/);
  assert.match(preview, /Runner Twentyfive/);
});
