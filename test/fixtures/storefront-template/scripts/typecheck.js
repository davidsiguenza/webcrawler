import { appendFile } from 'node:fs/promises';

await appendFile('./workflow.log', 'typecheck\n', 'utf8');
