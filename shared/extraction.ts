/**
 * Schéma de l'extraction « brute » d'un bulletin de paie par un modèle.
 * Partagé entre le serveur (`server/`) et le client (`src/features/import`).
 *
 * L'IA ne fait que LIRE : elle transcrit ce qu'elle voit, sans calcul ni
 * déduction. Les champs absents valent `null`. Aucune enveloppe de confiance :
 * le mapping `fromRaw()` attribue une confiance forte aux champs présents, et
 * l'analyse déterministe reprend la main ensuite.
 *
 * Zod v4 (`zod/v4`) — requis par le helper `zodOutputFormat` du SDK Anthropic.
 */

import * as z from 'zod/v4';

const num = z.number().nullable();

export const ContribSection = z.enum([
  'SANTE',
  'ATMP',
  'RETRAITE',
  'FAMILLE',
  'CHOMAGE',
  'AUTRES',
  'CSG_CRDS',
]);

export const GrossKind = z.enum([
  'base',
  'prime',
  'heures_supp',
  'heures_comp',
  'avantage',
  'indemnite',
  'absence',
  'autre',
]);

export const RawGrossItem = z.object({
  label: z.string(),
  kind: GrossKind,
  base: num,
  rate: num,
  amount: z.number(),
});

export const RawContribution = z.object({
  label: z.string(),
  section: ContribSection.nullable(),
  base: num,
  employeeRate: num,
  employeeAmount: num,
  employerRate: num,
  employerAmount: num,
});

export const RawExtraction = z.object({
  /** false ⇒ le document n'est pas un bulletin de paie ; on arrête l'analyse. */
  isPayslip: z.boolean(),
  editorGuess: z.string().nullable(),

  period: z
    .object({
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(2000).max(2100),
    })
    .nullable(),
  payDate: z.string().nullable(),

  employer: z.object({
    name: z.string().nullable(),
    siret: z.string().nullable(),
    naf: z.string().nullable(),
    convention: z.string().nullable(),
    headcount: z.number().int().nullable(),
  }),

  employee: z.object({
    matricule: z.string().nullable(),
    jobTitle: z.string().nullable(),
    status: z.enum(['cadre', 'non-cadre', 'inconnu']),
    coefficient: z.string().nullable(),
    entryDate: z.string().nullable(),
    regime: z.enum(['general', 'alsace-moselle']),
    partTime: z.boolean().nullable(),
    contractHours: num,
  }),

  grossItems: z.array(RawGrossItem),
  gross: num,

  contributions: z.array(RawContribution),

  netTaxable: num,
  netSocial: num,
  incomeTaxRate: num,
  incomeTaxAmount: num,
  netBeforeTax: num,
  netPaid: num,

  cumuls: z
    .object({
      gross: num,
      netTaxable: num,
      incomeTax: num,
      hours: num,
    })
    .nullable(),
});

export type RawExtraction = z.infer<typeof RawExtraction>;
export type RawContribution = z.infer<typeof RawContribution>;
export type RawGrossItem = z.infer<typeof RawGrossItem>;
export type ContribSection = z.infer<typeof ContribSection>;
