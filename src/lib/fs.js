import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function ensureDir(targetPath) {
  await mkdir(targetPath, { recursive: true });
}

export async function writeTextFile(targetPath, contents) {
  await ensureDir(path.dirname(targetPath));
  await writeFile(targetPath, contents, 'utf8');
}

export async function readTextFile(targetPath) {
  return readFile(targetPath, 'utf8');
}
