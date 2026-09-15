/**
 * Lecture d'un bulletin de paie PDF par Claude → `RawExtraction`.
 *
 * L'IA ne fait que transcrire. Sortie contrainte par le schéma partagé
 * (`shared/extraction.ts`) via `messages.parse` + `zodOutputFormat`.
 */

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { RawExtraction } from '../shared/extraction.js';

const MODEL = process.env.PAYLUMO_MODEL || 'claude-sonnet-5';

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new ClaudeUnusableError('ANTHROPIC_API_KEY manquant');
  client ??= new Anthropic();
  return client;
}

export class ClaudeRefusalError extends Error {}
export class ClaudeUnusableError extends Error {}

const SYSTEM = `Tu es un lecteur de bulletins de paie français. Ta seule tâche : transcrire fidèlement les valeurs présentes sur le document. Tu ne calcules rien, tu ne déduis aucun montant manquant.

CONFIDENTIALITÉ — ne fais JAMAIS figurer dans ta réponse : le nom, le prénom ou l'adresse du salarié, son numéro de sécurité sociale (NIR), son matricule, ni le SIRET/SIREN ou le numéro APE/NAF de l'employeur. Ces informations ne sont pas demandées. Le champ employer.name est le seul élément d'identité autorisé (raison sociale de l'employeur).

Règles :
- Recopie les nombres exactement comme affichés. Rends-les en nombre (point décimal, sans séparateur de milliers) : « 1 823,03 » → 1823.03.
- Les absences et retenues sont des montants négatifs dans grossItems.
- Toute valeur absente du bulletin = null. N'invente jamais une valeur, ne reconstitue jamais un montant manquant par le calcul.
- contributions[] ne contient QUE des cotisations individuelles. N'y mets JAMAIS : les lignes de total ou sous-total (« Total des cotisations et contributions », « Total des retenues »…), les intitulés de rubrique employés seuls (« SANTÉ », « RETRAITE », « Autres contributions dues par l'employeur »…), les lignes de récapitulatif de pied de bulletin (net imposable, net social, net à payer, coût employeur), ni les lignes globales d'exonération / allègement / écrêtement de cotisations.
- contributions[].section : déduis-la du titre de regroupement sous lequel la ligne figure (SANTÉ→SANTE ; ACCIDENT DU TRAVAIL / AT-MP→ATMP ; RETRAITE→RETRAITE ; FAMILLE→FAMILLE ; ASSURANCE CHÔMAGE→CHOMAGE ; AUTRES CONTRIBUTIONS DUES PAR L'EMPLOYEUR→AUTRES ; CSG/CRDS→CSG_CRDS). null si indéterminable.
- Pour chaque ligne de cotisation : base, puis part salariale (employeeRate en %, employeeAmount en €) et part patronale (employerRate, employerAmount) si présentes ; null sinon.
- contributionsTotal : recopie la ligne « Total des cotisations et contributions » (employee = colonne/total salarial, employer = colonne/total patronal). null si le bulletin ne l'affiche pas.
- employerCost : recopie le montant de la ligne « Coût total employeur » / « Coût global employeur » si elle figure sur le bulletin. null sinon. Ne le calcule jamais toi-même.
- employee.status : "cadre" ou "non-cadre" selon le bulletin, sinon "inconnu".
- employee.regime : "alsace-moselle" si le bulletin mentionne le régime local (dépt 57/67/68) ou une cotisation maladie salariale d'environ 1,30 % ; sinon "general".
- grossItems.kind : classe chaque élément de rémunération (base = salaire de base ; prime ; heures_supp ; heures_comp ; avantage ; indemnite ; absence ; autre).
- cumuls : recopie le bloc « Cumuls » (souvent en bas ou à droite du bulletin, cumul depuis janvier) s'il est présent — en particulier cumuls.gross (cumul du brut), cumuls.netTaxable (cumul du net imposable) et cumuls.netSocial (cumul du net social), utiles pour les déclarations (impôts, CAF/MSA). null pour chaque champ non affiché ; l'objet cumuls entier à null si aucun cumul n'est présent.
- Si le document n'est pas un bulletin de paie : isPayslip=false, laisse les tableaux vides et les champs à null.`;

export async function extractWithClaude(pdfBase64: string): Promise<RawExtraction> {
  let msg;
  try {
    msg = await anthropic().messages.parse({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'low',
        format: zodOutputFormat(RawExtraction),
      },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
            },
            { type: 'text', text: 'Transcris ce bulletin de paie dans le format demandé.' },
          ],
        },
      ],
    });
  } catch (err) {
    throw new ClaudeUnusableError((err as Error).message);
  }

  if (msg.stop_reason === 'refusal') {
    throw new ClaudeRefusalError(msg.stop_details?.explanation ?? 'lecture refusée par le modèle');
  }
  if (!msg.parsed_output) {
    throw new ClaudeUnusableError('réponse du modèle non exploitable');
  }
  return msg.parsed_output;
}

export const modelName = MODEL;
