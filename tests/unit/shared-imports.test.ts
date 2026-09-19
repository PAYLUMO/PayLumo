import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

// shared/ est exécuté tel quel par la fonction serverless Vercel (Node ESM natif,
// sans bundler) : un import relatif sans extension y plante avec
// ERR_MODULE_NOT_FOUND, alors que Vite / tsx / vitest le tolèrent en local.
function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? tsFiles(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('shared/ — imports relatifs compatibles Node ESM', () => {
  it('tous les imports relatifs ont une extension .js explicite', () => {
    const offenders: string[] = [];
    for (const file of tsFiles(resolve(process.cwd(), 'shared'))) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/from\s+['"](\.{1,2}\/[^'"]*)['"]/g)) {
        if (!m[1].endsWith('.js')) offenders.push(`${file} → ${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
