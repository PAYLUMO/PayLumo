/**
 * Vérifie l'appel réel à l'API Anthropic pour la lecture d'un bulletin — hors
 * paiement Stripe. Utilise la clé de .env.
 *
 *   npm run verify:claude            # public/exemple-bulletin.pdf
 *   npm run verify:claude -- mon-bulletin.pdf
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env');
try {
  process.loadEnvFile(envPath);
  console.log(`.env lu : ${envPath}`);
} catch {
  console.warn(`⚠  pas de .env à ${envPath}`);
}

const key = process.env.ANTHROPIC_API_KEY ?? '';
const mask = key ? `${key.slice(0, 10)}…(${key.length} car.)` : '(vide)';
if (!key || key.startsWith('sk-ant-...') || key.length < 30) {
  console.error(`✗ ANTHROPIC_API_KEY non exploitable : ${mask}`);
  console.error('  → ouvre le .env ci-dessus et remplace la ligne ANTHROPIC_API_KEY par ta vraie clé.');
  process.exit(1);
}
console.log(`clé       : ${mask}`);

const file = process.argv[2] ?? 'public/exemple-bulletin.pdf';
console.log(`Modèle : ${process.env.PAYLUMO_MODEL ?? 'claude-opus-5 (défaut)'}`);
console.log(`Bulletin : ${file}\n`);

const { extractWithClaude } = await import('../server/claude.ts');

const t0 = Date.now();
try {
  const raw = await extractWithClaude(readFileSync(file).toString('base64'));
  console.log(`✓ Réponse structurée reçue en ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);
  console.log('isPayslip     :', raw.isPayslip);
  console.log('éditeur       :', raw.editorGuess ?? '—');
  console.log('période       :', raw.period ? `${raw.period.month}/${raw.period.year}` : '—');
  console.log('employeur     :', raw.employer.name ?? '—');
  console.log('brut          :', raw.gross ?? '—');
  console.log('net à payer   :', raw.netPaid ?? raw.netBeforeTax ?? '—');
  console.log('# cotisations :', raw.contributions.length);
  console.log('\n→ Le schéma JSON (champs nullable) est bien accepté par l’API. RAS.');
} catch (err) {
  console.error(`✗ Échec après ${((Date.now() - t0) / 1000).toFixed(1)} s :`);
  console.error('  ', err?.message ?? err);
  if (String(err?.message).match(/schema|format|output_config|json_schema/i)) {
    console.error(
      '\n  → Piste : l’API n’accepte pas le schéma généré. Bascule sur jsonSchemaOutputFormat',
    );
    console.error('    avec un schéma ajusté dans server/claude.ts.');
  }
  process.exit(1);
}
