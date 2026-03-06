import { appendFile } from 'node:fs/promises';

await appendFile('./workflow.log', 'push\n', 'utf8');
