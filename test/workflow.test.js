import { cp, mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { runWorkflow } from '../src/commands/workflow.js';

test('workflow runs apply, typecheck, build and push in order', async () => {
  const templatePath = path.join(process.cwd(), 'test/fixtures/storefront-template');
  const tempPath = await mkdtemp(path.join(os.tmpdir(), 'webcrawler-workflow-'));
  await cp(templatePath, tempPath, { recursive: true });

  await runWorkflow([
    'file:///Users/dsiguenza/Documents/Aplicaciones/WebCrawler/test/fixtures/sample-brand.html',
    '--brand-id',
    'camper',
    '--apply-to',
    tempPath,
    '--out-dir',
    path.join(tempPath, '.firecrawl/camper'),
    '--package-manager',
    'npm',
    '--typecheck',
    '--build',
    '--push',
  ]);

  const workflowLog = await readFile(path.join(tempPath, 'workflow.log'), 'utf8');
  const env = await readFile(path.join(tempPath, '.env'), 'utf8');
  const preview = await readFile(path.join(tempPath, '.firecrawl/camper/preview.html'), 'utf8');

  assert.equal(workflowLog, 'typecheck\nbuild\npush\n');
  assert.match(env, /^PUBLIC__app__global__branding__name=camper$/m);
  assert.match(preview, /Selected assets/);
  assert.match(preview, /Copy URL/);
  assert.match(preview, /Open full size/);
});
