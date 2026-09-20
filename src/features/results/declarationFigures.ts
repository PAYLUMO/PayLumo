import type { Payslip } from '@shared/parsing/model';

export type FigureKey = 'gross' | 'netTaxable' | 'netSocial' | 'pas' | 'netPaid';

export interface AnnualFigure {
  /** `cumul` : lu sur le bulletin ; `estimate` : ce mois × 12, faute de cumul. */
  kind: 'cumul' | 'estimate';
  value: number;
  /** cumul seulement : projection sur 12 mois à rythme constant (null en décembre ou si le mois est inconnu). */
  projection: number | null;
  /** le cumul est celui de décembre, donc le total de l'année. */
  yearTotal: boolean;
}

export interface Figure {
  key: FigureKey;
  /** montant de ce bulletin. */
  monthly: number;
  annual: AnnualFigure;
}

/**
 * Les montants du bulletin utiles pour les démarches, chacun avec son équivalent
 * annuel : le cumul lu sur le bulletin quand il est plausible, sinon une estimation
 * (ce mois × 12) clairement distinguée.
 */
export function declarationFigures(p: Payslip): Figure[] {
  const { month: m, year } = p.period.value;
  const month = p.period.confidence >= 0.6 && year > 2000 && m >= 1 && m <= 12 ? m : null;

  const ok = (v: { value: number; confidence: number } | undefined) =>
    v && v.confidence >= 0.5 ? v.value : undefined;

  const rows: { key: FigureKey; monthly: number | undefined; cumul: number | undefined }[] = [
    { key: 'gross', monthly: ok(p.gross), cumul: p.cumuls?.brut },
    { key: 'netTaxable', monthly: ok(p.netImposable), cumul: p.cumuls?.netImposable },
    { key: 'netSocial', monthly: ok(p.netSocial), cumul: p.cumuls?.netSocial },
    {
      key: 'pas',
      monthly: p.pas?.amount ? Math.abs(p.pas.amount.value) : undefined,
      cumul: p.cumuls?.pas != null ? Math.abs(p.cumuls.pas) : undefined,
    },
    { key: 'netPaid', monthly: ok(p.netAPayer), cumul: undefined },
  ];

  const out: Figure[] = [];
  for (const { key, monthly, cumul } of rows) {
    if (monthly == null || (key !== 'pas' && !(monthly > 0)) || monthly < 0) continue;

    // un cumul inférieur au mois lui-même est une erreur de lecture : on l'ignore
    const usable = cumul != null && Number.isFinite(cumul) && cumul >= monthly * 0.9;
    const annual: AnnualFigure = usable
      ? {
          kind: 'cumul',
          value: cumul,
          projection: month != null && month < 12 ? Math.round((cumul / month) * 12) : null,
          yearTotal: month === 12,
        }
      : { kind: 'estimate', value: Math.round(monthly * 12), projection: null, yearTotal: false };

    out.push({ key, monthly, annual });
  }
  return out;
}
