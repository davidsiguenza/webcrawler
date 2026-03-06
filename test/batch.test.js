import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { runBatch } from '../src/commands/batch.js';

test('batch processes multiple urls, keeps going on errors and writes an index', async () => {
  const tempPath = await mkdtemp(path.join(os.tmpdir(), 'webcrawler-batch-'));
  const fixturePath = path.join(process.cwd(), 'test/fixtures/sample-brand.html');
  const firstPagePath = path.join(tempPath, 'sample-a.html');
  const secondPagePath = path.join(tempPath, 'sample-b.html');
  const missingPagePath = path.join(tempPath, 'missing.html');
  const urlsPath = path.join(tempPath, 'urls.txt');
  const outDir = path.join(tempPath, 'batch-output');

  await cp(fixturePath, firstPagePath);
  await cp(fixturePath, secondPagePath);
  await writeFile(
    urlsPath,
    [
      pathToFileURL(firstPagePath).toString(),
      pathToFileURL(secondPagePath).toString(),
      pathToFileURL(missingPagePath).toString(),
    ].join('\n'),
    'utf8',
  );

  await runBatch([urlsPath, '--out-dir', outDir, '--only-main-content']);

  const manifest = JSON.parse(await readFile(path.join(outDir, 'manifest.json'), 'utf8'));
  const index = await readFile(path.join(outDir, 'index.html'), 'utf8');

  assert.equal(manifest.inputCount, 3);
  assert.equal(manifest.processedCount, 2);
  assert.equal(manifest.failedCount, 1);
  assert.equal(manifest.items.length, 3);
  assert.match(index, /Open preview/);
  assert.match(index, /error/);

  const successfulItems = manifest.items.filter((item) => item.status === 'ok');
  assert.equal(successfulItems.length, 2);

  for (const item of successfulItems) {
    const json = await readFile(path.join(outDir, item.relativeJsonPath), 'utf8');
    const preview = await readFile(path.join(outDir, item.relativePreviewHtmlPath), 'utf8');

    assert.match(json, /"images": \[/);
    assert.match(preview, /Copy URL/);
  }

  const failedItem = manifest.items.find((item) => item.status === 'error');
  assert.ok(failedItem);
  assert.match(failedItem.error, /ENOENT|no such file/i);
});
