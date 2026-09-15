/**
 * Écrit ANTHROPIC_API_KEY dans .env sans ambiguïté de fichier.
 *   npm run set-key
 * La clé est saisie au clavier (dans ton terminal, jamais dans un historique
 * de commande ni transmise ailleurs).
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';

const envPath = resolve(process.cwd(), '.env');
const examplePath = resolve(process.cwd(), '.env.example');

let content = existsSync(envPath)
  ? readFileSync(envPath, 'utf8')
  : existsSync(examplePath)
    ? readFileSync(examplePath, 'utf8')
    : 'ANTHROPIC_API_KEY=\n';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const key = (await rl.question('Colle ta clé Anthropic (sk-ant-…) puis Entrée : ')).trim();
rl.close();

if (!key.startsWith('sk-ant-') || key.length < 40) {
  console.error(`✗ Clé inattendue (${key.length} caractères). Attendu : sk-ant-… (souvent > 90 car.).`);
  process.exit(1);
}

content = /^ANTHROPIC_API_KEY=.*$/m.test(content)
  ? content.replace(/^ANTHROPIC_API_KEY=.*$/m, `ANTHROPIC_API_KEY=${key}`)
  : `ANTHROPIC_API_KEY=${key}\n${content}`;

writeFileSync(envPath, content, 'utf8');
console.log(`\n✓ Écrit dans ${envPath}`);
console.log(`  ANTHROPIC_API_KEY = ${key.slice(0, 12)}… (${key.length} car.)`);
console.log('\nLance maintenant : npm run verify:claude');
