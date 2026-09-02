/**
 * Calculateur de bulletin de paie synthétique — sert uniquement à produire des
 * PDF de test réalistes et internement cohérents (`generate.mjs`).
 *
 * Ce n'est PAS le moteur d'analyse de l'application : il calcule « en avant »
 * (brut → cotisations → net) pour fabriquer des cas connus. Les vrais bulletins
 * SAP fournis par l'utilisateur viendront compléter / corriger ces fixtures.
 */

export const PMSS = 4005;
const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Taux 2026 (copie locale, volontairement indépendante de src/data pour le test)
const R = {
  maladiePatLow: 7.0,
  vieillessePlafSal: 6.9,
  vieillessePlafPat: 8.55,
  vieillesseDeplafSal: 0.4,
  vieillesseDeplafPat: 2.11,
  rcT1Sal: 3.15,
  rcT1Pat: 4.72,
  rcT2Sal: 8.64,
  rcT2Pat: 12.95,
  cegT1Sal: 0.86,
  cegT1Pat: 1.29,
  cegT2Sal: 1.08,
  cegT2Pat: 1.62,
  cetSal: 0.14,
  cetPat: 0.21,
  apecSal: 0.024,
  apecPat: 0.036,
  familleLow: 3.45,
  chomagePat: 4.0,
  agsPat: 0.25,
  csaPat: 0.3,
  fnalLt50: 0.1,
  csgDed: 6.8,
  csgCrdsNonDed: 2.9,
  atPat: 1.2,
};

export function calcBulletin(input) {
  const {
    salaireBase,
    primes = [],
    absences = [],
    statut,
    heuresContrat = 151.67,
    mutuelleSal = 18.0,
    mutuellePat = 27.0,
    pasRate = 3.8,
    tamper,
  } = input;

  const isCadre = statut === 'cadre';

  let gross = round(
    salaireBase +
      primes.reduce((s, p) => s + p.montant, 0) +
      absences.reduce((s, a) => s + a.montant, 0),
  );
  const realGross = gross;

  const t1 = Math.max(0, Math.min(realGross, PMSS));
  const t2 = Math.max(0, Math.min(realGross, 8 * PMSS) - PMSS);
  const abovePmss = realGross > PMSS;

  const lines = [];
  const add = (section, label, base, rateSal, ratePat) => {
    lines.push({
      section,
      label,
      base,
      rateSal,
      montSal: rateSal == null ? null : round((base * rateSal) / 100),
      ratePat,
      montPat: ratePat == null ? null : round((base * ratePat) / 100),
    });
  };

  add('SANTÉ', 'Sécurité sociale - Maladie Maternité Invalidité Décès', realGross, null, R.maladiePatLow);
  lines.push({
    section: 'SANTÉ',
    label: 'Complémentaire santé',
    base: round(mutuelleSal + mutuellePat),
    rateSal: null,
    montSal: mutuelleSal,
    ratePat: null,
    montPat: mutuellePat,
  });
  if (isCadre) add('SANTÉ', 'Prévoyance cadres tranche A', t1, null, 1.5);

  add('ACCIDENTS DU TRAVAIL', 'Accident du travail', realGross, null, R.atPat);

  add('RETRAITE', 'Sécurité sociale plafonnée', t1, R.vieillessePlafSal, R.vieillessePlafPat);
  add('RETRAITE', 'Sécurité sociale déplafonnée', realGross, R.vieillesseDeplafSal, R.vieillesseDeplafPat);
  add('RETRAITE', 'Complémentaire tranche 1', t1, R.rcT1Sal, R.rcT1Pat);
  add('RETRAITE', 'CEG tranche 1', t1, R.cegT1Sal, R.cegT1Pat);
  if (abovePmss) {
    add('RETRAITE', 'Complémentaire tranche 2', t2, R.rcT2Sal, R.rcT2Pat);
    add('RETRAITE', 'CEG tranche 2', t2, R.cegT2Sal, R.cegT2Pat);
    add('RETRAITE', 'CET', t1 + t2, R.cetSal, R.cetPat);
  }

  add('FAMILLE', 'Allocations familiales', realGross, null, R.familleLow);

  const chomageBase = Math.min(realGross, 4 * PMSS);
  add('ASSURANCE CHÔMAGE', 'Assurance chômage', chomageBase, null, R.chomagePat);
  add('ASSURANCE CHÔMAGE', 'AGS', chomageBase, null, R.agsPat);
  if (isCadre) add('ASSURANCE CHÔMAGE', 'APEC', chomageBase, R.apecSal, R.apecPat);

  add("AUTRES CONTRIBUTIONS DUES PAR L'EMPLOYEUR", 'Contribution solidarité autonomie', realGross, null, R.csaPat);
  add("AUTRES CONTRIBUTIONS DUES PAR L'EMPLOYEUR", 'FNAL', t1, null, R.fnalLt50);

  const csgBase = round(realGross * 0.9825 + mutuellePat);
  add('CSG/CRDS', "CSG déductible de l'impôt sur le revenu", csgBase, R.csgDed, null);
  add('CSG/CRDS', "CSG/CRDS non déductible de l'impôt sur le revenu", csgBase, R.csgCrdsNonDed, null);

  function computeTotals() {
    const totalSal = round(lines.reduce((s, l) => s + (l.montSal ?? 0), 0));
    const totalPat = round(lines.reduce((s, l) => s + (l.montPat ?? 0), 0));
    const csgCrdsNonDed = lines.find((l) => /non déductible/i.test(l.label))?.montSal ?? 0;
    const netImposable = round(realGross - totalSal + csgCrdsNonDed + mutuellePat);
    const netAvantImpot = round(realGross - totalSal);
    const pas = round((netImposable * pasRate) / 100);
    return {
      gross,
      t1,
      t2,
      totalSal,
      totalPat,
      csgBase,
      netImposable,
      netAvantImpot,
      netSocial: netAvantImpot,
      pas,
      pasRate,
      netPaye: round(netAvantImpot - pas),
      coutEmployeur: round(realGross + totalPat),
    };
  }

  let totals = computeTotals();

  if (tamper) {
    const ctx = {
      setDisplayedGross: (g) => {
        gross = round(g);
        totals.gross = gross;
      },
      recompute: () => {
        totals = computeTotals();
      },
    };
    tamper(lines, totals, ctx);
  }

  return { input, gross, realGross, lines, totals, salaireBase, primes, absences, heuresContrat, mutuelleSal, mutuellePat };
}
