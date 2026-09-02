/**
 * Convertit l'extraction produite par le modèle (`RawExtraction`) en `Payslip`,
 * la structure que consomme le moteur d'analyse déterministe — inchangé.
 *
 * On réutilise `matchCanonical` pour rattacher les libellés aux codes du
 * référentiel. Les champs présents reçoivent une confiance forte.
 */

import { matchCanonical } from '../data/taxonomy';
import type { RawExtraction } from '../extraction';
import {
  valued,
  type ContribCategory,
  type ContributionLine,
  type EmployeeStatus,
  type GrossItem,
  type Payslip,
  type SocialRegime,
} from './model';

const C = 0.9;

export function payslipFromRaw(raw: RawExtraction): Payslip {
  const statut = raw.employee.status as EmployeeStatus;
  const regime = raw.employee.regime as SocialRegime;

  const grossItems: GrossItem[] = raw.grossItems.map((g) => ({
    label: g.label,
    kind: g.kind,
    base: g.base != null ? valued(g.base, C) : undefined,
    rate: g.rate != null ? valued(g.rate, C) : undefined,
    amount: valued(g.amount, C),
  }));

  const contributions: ContributionLine[] = raw.contributions.map((c) => {
    const section = (c.section ?? undefined) as ContribCategory | undefined;
    const entry = matchCanonical(c.label, { section, statut, regime });
    const line: ContributionLine = {
      label: c.label,
      canonical: entry?.code,
      category: entry?.category ?? section ?? 'AUTRES',
      base: c.base != null ? valued(c.base, C) : undefined,
    };
    if (c.employeeRate != null || c.employeeAmount != null) {
      line.employee = {
        rate: c.employeeRate != null ? valued(c.employeeRate, C) : undefined,
        amount: c.employeeAmount != null ? valued(Math.abs(c.employeeAmount), C) : undefined,
      };
    }
    if (c.employerRate != null || c.employerAmount != null) {
      line.employer = {
        rate: c.employerRate != null ? valued(c.employerRate, C) : undefined,
        amount: c.employerAmount != null ? valued(Math.abs(c.employerAmount), C) : undefined,
      };
    }
    return line;
  });

  const csgLines = contributions.filter((c) => c.category === 'CSG_CRDS');
  const csgCrds = csgLines.length
    ? {
        base: csgLines[0].base,
        csgDeductible: csgLines.find((c) => c.canonical === 'CSG_DEDUCTIBLE')?.employee?.amount,
        csgNonDeductible: csgLines.find((c) => c.canonical === 'CSG_NON_DEDUCTIBLE')?.employee?.amount,
        crds: csgLines.find((c) => c.canonical === 'CRDS')?.employee?.amount,
      }
    : undefined;

  const hasGross = raw.gross != null && raw.gross > 0;
  const netAPayer = raw.netPaid ?? raw.netBeforeTax ?? 0;
  const parseConfidence =
    hasGross && netAPayer > 0 && contributions.length >= 5
      ? 0.95
      : hasGross && netAPayer > 0
        ? 0.8
        : 0.4;

  const contractHours = raw.employee.contractHours;

  return {
    meta: {
      editor: 'ai',
      parseConfidence,
      notes: raw.editorGuess ? [`Éditeur de paie détecté : ${raw.editorGuess}.`] : [],
      pageCount: 0,
      scanned: false,
    },
    employer: {
      name: raw.employer.name ?? undefined,
      siret: raw.employer.siret ?? undefined,
      naf: raw.employer.naf ?? undefined,
      convention: raw.employer.convention ?? undefined,
      effectifTranche:
        raw.employer.headcount == null ? 'inconnu' : raw.employer.headcount < 50 ? 'lt50' : 'gte50',
    },
    employee: {
      matricule: raw.employee.matricule ?? undefined,
      emploi: raw.employee.jobTitle ?? undefined,
      statut,
      regime,
      coefficient: raw.employee.coefficient ?? undefined,
      dateEntree: raw.employee.entryDate ?? undefined,
      tempsPartiel:
        raw.employee.partTime ?? (contractHours != null ? contractHours < 151 : undefined),
    },
    period: raw.period
      ? valued({ month: raw.period.month, year: raw.period.year }, C)
      : valued({ month: 0, year: 0 }, 0),
    payDate: raw.payDate ? valued(raw.payDate, C) : undefined,
    time: {
      heuresContrat: contractHours != null ? valued(contractHours, C) : undefined,
    },
    grossItems,
    gross: hasGross ? valued(raw.gross as number, C) : valued(0, 0),
    contributions,
    csgCrds,
    adjustments: [],
    netImposable: raw.netTaxable != null ? valued(raw.netTaxable, C) : undefined,
    netSocial: raw.netSocial != null ? valued(raw.netSocial, C) : undefined,
    pas:
      raw.incomeTaxAmount != null || raw.incomeTaxRate != null
        ? {
            amount: raw.incomeTaxAmount != null ? valued(Math.abs(raw.incomeTaxAmount), C) : undefined,
            rate: raw.incomeTaxRate != null ? valued(raw.incomeTaxRate, C) : undefined,
            type: 'inconnu',
          }
        : undefined,
    netAvantImpot: raw.netBeforeTax != null ? valued(raw.netBeforeTax, C) : undefined,
    netAPayer: netAPayer > 0 ? valued(netAPayer, C) : valued(0, 0),
    cumuls: raw.cumuls
      ? {
          brut: raw.cumuls.gross ?? undefined,
          netImposable: raw.cumuls.netTaxable ?? undefined,
          pas: raw.cumuls.incomeTax ?? undefined,
          heures: raw.cumuls.hours ?? undefined,
        }
      : undefined,
  };
}
