import { appendFile } from 'node:fs/promises';

await appendFile('./workflow.log', 'build\n', 'utf8');
