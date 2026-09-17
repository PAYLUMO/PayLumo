/**
 * Génère des bulletins de paie PDF synthétiques (format « clarifié ») pour les
 * tests d'extraction et d'analyse.
 *
 *   npm run fixtures
 *
 * Produit tests/fixtures/pdf/*.pdf et tests/fixtures/manifest.json.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { calcBulletin } from './lib/calc.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'pdf');
mkdirSync(OUT, { recursive: true });

const eur = (n) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const pct = (n) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(n);

const COL = { label: 40, base: 320, rateSal: 380, montSal: 452, ratePat: 512, montPat: 578 };

async function render(bulletin, meta, opts = {}) {
  const pdf = await PDFDocument.create();
  pdf.setProducer(meta.producer ?? 'PayLumo Fixture Generator');
  pdf.setCreator(meta.creator ?? 'PayLumo');
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595, 842]);
  let y = 800;
  const line = (h = 14) => {
    y -= h;
    if (y < 60) {
      page = pdf.addPage([595, 842]);
      y = 800;
    }
  };
  // Les polices standard (WinAnsi) n'encodent pas les espaces fines/insécables
  // qu'Intl.NumberFormat('fr-FR') insère ; on les ramène à l'espace ordinaire.
  const clean = (s) => String(s).replace(/\p{White_Space}/gu, ' ');
  const put = (s, x, opts = {}) => {
    page.drawText(clean(s), {
      x,
      y,
      size: opts.size ?? 8.5,
      font: opts.bold ? bold : font,
      color: opts.color ?? rgb(0.08, 0.08, 0.08),
    });
  };
  const putR = (s, xRight, opts = {}) => {
    const size = opts.size ?? 8.5;
    const f = opts.bold ? bold : font;
    put(s, xRight - f.widthOfTextAtSize(clean(s), size), opts);
  };
  const rule = () => {
    line(6);
    page.drawLine({ start: { x: 40, y }, end: { x: 578, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    line(6);
  };

  const { totals } = bulletin;

  put('BULLETIN DE PAIE', COL.label, { size: 13, bold: true });
  putR(`Période : ${meta.periodLabel}`, 578, { size: 9 });
  line(16);
  put(meta.employer.name, COL.label, { bold: true, size: 9 });
  putR(`Paiement le ${meta.payDate}`, 578, { size: 9 });
  line();
  put(meta.employer.address, COL.label);
  line();
  put(`SIRET ${meta.employer.siret}      Code APE ${meta.employer.ape}`, COL.label);
  line();
  put(`Convention collective : ${meta.employer.convention}`, COL.label);
  line();
  put(`Effectif : ${meta.employer.effectif}`, COL.label);
  line(20);

  put(`${meta.employee.civilite} ${meta.employee.name}`, COL.label, { bold: true, size: 9 });
  putR(`Matricule : ${meta.employee.matricule}`, 578, { size: 9 });
  line();
  put(
    `Emploi : ${meta.employee.emploi}      Statut : ${meta.employee.statut}      Coefficient : ${meta.employee.coefficient}`,
    COL.label,
  );
  line();
  put(`Date d'entrée : ${meta.employee.entree}      Horaire mensuel : ${eur(bulletin.heuresContrat)} h`, COL.label);
  line(22);

  // En-tête de colonnes
  put('Élément de paie', COL.label, { bold: true });
  putR('Base', COL.base, { bold: true });
  putR('Taux sal.', COL.rateSal, { bold: true });
  putR('Part salariale', COL.montSal, { bold: true });
  putR('Taux pat.', COL.ratePat, { bold: true });
  putR('Part patronale', COL.montPat, { bold: true });
  rule();

  // Rémunération
  put('RÉMUNÉRATION', COL.label, { bold: true });
  line();
  put('Salaire de base', COL.label);
  putR(`${eur(bulletin.heuresContrat)} h`, COL.base);
  putR(eur(bulletin.salaireBase), COL.montSal);
  line();
  for (const p of bulletin.primes) {
    put(p.label, COL.label);
    putR(eur(p.montant), COL.montSal);
    line();
  }
  for (const a of bulletin.absences) {
    put(a.label, COL.label);
    putR(`${eur(a.heures)} h`, COL.base);
    putR(eur(a.montant), COL.montSal);
    line();
  }
  rule();
  put('SALAIRE BRUT', COL.label, { bold: true });
  putR(eur(totals.gross), COL.montSal, { bold: true });
  rule();

  // Cotisations par section
  let currentSection = '';
  for (const l of bulletin.lines) {
    if (l.section !== currentSection) {
      currentSection = l.section;
      line(4);
      put(currentSection, COL.label, { bold: true });
      line();
    }
    put(l.label, COL.label);
    if (l.base != null) putR(eur(l.base), COL.base);
    if (l.rateSal != null) putR(pct(l.rateSal), COL.rateSal);
    if (l.montSal != null) putR(eur(l.montSal), COL.montSal);
    if (l.ratePat != null) putR(pct(l.ratePat), COL.ratePat);
    if (l.montPat != null) putR(eur(l.montPat), COL.montPat);
    line();
  }
  rule();

  put('TOTAL DES COTISATIONS ET CONTRIBUTIONS', COL.label, { bold: true });
  putR(eur(totals.totalSal), COL.montSal, { bold: true });
  putR(eur(totals.totalPat), COL.montPat, { bold: true });
  line(16);

  const summary = [
    ['Net imposable', totals.netImposable],
    ['Montant net social', totals.netSocial],
    ['Net à payer avant impôt sur le revenu', totals.netAvantImpot],
    [`Impôt sur le revenu prélevé à la source (taux ${pct(totals.pasRate)} %)`, -totals.pas],
    ['NET PAYÉ', totals.netPaye],
  ];
  for (const [label, val] of summary) {
    const isTotal = label === 'NET PAYÉ';
    put(label, COL.label, { bold: isTotal });
    putR(eur(val), COL.montSal, { bold: isTotal });
    line(isTotal ? 16 : 13);
  }

  line(10);
  put(`Coût total employeur : ${eur(totals.coutEmployeur)} €`, COL.label, { size: 8, color: rgb(0.4, 0.4, 0.4) });

  if (opts.cumuls) {
    const { gross, netImposable, netSocial } = opts.cumuls;
    line(16);
    put('CUMULS DEPUIS LE 1er JANVIER', COL.label, { bold: true, size: 8 });
    line();
    put(
      `Brut : ${eur(gross)} €      Net imposable : ${eur(netImposable)} €      Net social : ${eur(netSocial)} €`,
      COL.label,
      { size: 8 },
    );
  }

  return pdf.save();
}

/** Nombre de mois écoulés depuis janvier d'après une periodLabel "JJ/MM/AAAA au JJ/MM/AAAA". */
function monthsElapsed(periodLabel) {
  const end = periodLabel.match(/au (\d{2})\/(\d{2})\/(\d{4})/);
  return end ? Number(end[2]) : 1;
}

// ── Scénarios ────────────────────────────────────────────────────────────────

const baseMeta = {
  periodLabel: '01/06/2026 au 30/06/2026',
  payDate: '30/06/2026',
  employer: {
    name: 'ACME TECH SARL',
    address: '12 rue des Lilas, 75011 Paris',
    siret: '123 456 789 00012',
    ape: '6201Z',
    convention: 'SYNTEC (IDCC 1486)',
    effectif: '24 salariés',
  },
  employee: {
    civilite: 'M.',
    name: 'Jean DUPONT',
    matricule: '00427',
    emploi: 'Développeur',
    statut: 'Cadre',
    coefficient: '100 - Position 2.1',
    entree: '01/03/2022',
  },
};

const baseInput = {
  salaireBase: 3500,
  primes: [{ label: "Prime d'ancienneté", montant: 150 }],
  absences: [{ label: 'Absence maladie (3 j)', heures: -21, montant: -161.54 }],
  statut: 'cadre',
};

const scenarios = [
  {
    id: 'clarified-sain',
    title: 'Bulletin correct (cadre, SYNTEC)',
    meta: baseMeta,
    input: { ...baseInput },
    expect: { severityMax: 'info', notes: 'Aucune anomalie attendue.' },
  },
  {
    id: 'clarified-taux-vieillesse',
    title: 'Taux vieillesse plafonnée salariale erroné (7,30 % au lieu de 6,90 %)',
    meta: baseMeta,
    input: {
      ...baseInput,
      tamper: (lines, _t, ctx) => {
        const l = lines.find((x) => x.label === 'Sécurité sociale plafonnée');
        l.rateSal = 7.3;
        l.montSal = Math.round(l.base * 7.3) / 100;
        ctx.recompute();
      },
    },
    expect: {
      findings: [{ code: 'VIEILLESSE_PLAFONNEE', type: 'TAUX_INCORRECT', side: 'employee' }],
    },
  },
  {
    id: 'clarified-chomage-405',
    title: 'Assurance chômage patronale à 4,05 % (ancien taux)',
    meta: baseMeta,
    input: {
      ...baseInput,
      tamper: (lines, _t, ctx) => {
        const l = lines.find((x) => x.label === 'Assurance chômage');
        l.ratePat = 4.05;
        l.montPat = Math.round(l.base * 4.05) / 100;
        ctx.recompute();
      },
    },
    expect: { findings: [{ code: 'ASSURANCE_CHOMAGE', type: 'TAUX_INCORRECT', side: 'employer' }] },
  },
  {
    id: 'clarified-brut-incoherent',
    title: 'Salaire brut affiché incohérent avec le détail',
    meta: baseMeta,
    input: {
      ...baseInput,
      tamper: (_lines, _totals, ctx) => {
        ctx.setDisplayedGross(_totals.gross + 120);
      },
    },
    expect: { findings: [{ type: 'BRUT_INCOHERENT' }] },
  },
  {
    id: 'clarified-calcul-ligne',
    title: 'Montant d’une ligne ≠ base × taux (CEG T1)',
    meta: baseMeta,
    input: {
      ...baseInput,
      tamper: (lines, _t, ctx) => {
        const l = lines.find((x) => x.label === 'CEG tranche 1');
        l.montSal = Math.round((l.montSal + 9) * 100) / 100;
        ctx.recompute();
      },
    },
    expect: { findings: [{ code: 'CEG_T1', type: 'CALCUL_INCOHERENT' }] },
  },
  {
    id: 'clarified-cotisation-manquante',
    title: 'Cotisation APEC absente pour un cadre',
    meta: baseMeta,
    input: {
      ...baseInput,
      tamper: (lines, _t, ctx) => {
        const i = lines.findIndex((x) => x.label === 'APEC');
        if (i >= 0) lines.splice(i, 1);
        ctx.recompute();
      },
    },
    expect: { findings: [{ code: 'APEC', type: 'COTISATION_MANQUANTE' }] },
  },
  {
    id: 'clarified-non-cadre',
    title: 'Bulletin correct (non-cadre, SMIC+)',
    meta: {
      ...baseMeta,
      employee: { ...baseMeta.employee, name: 'Sophie MARTIN', civilite: 'Mme', emploi: 'Assistante', statut: 'Non cadre', coefficient: '250' },
    },
    input: { salaireBase: 2100, primes: [], absences: [], statut: 'non-cadre' },
    expect: { severityMax: 'info' },
  },
];

const manifest = [];
for (const s of scenarios) {
  const bulletin = calcBulletin(s.input);
  const bytes = await render(bulletin, s.meta);
  const file = `${s.id}.pdf`;
  writeFileSync(join(OUT, file), bytes);
  manifest.push({
    id: s.id,
    file: `pdf/${file}`,
    title: s.title,
    expect: s.expect,
    computed: {
      gross: bulletin.totals.gross,
      totalSal: bulletin.totals.totalSal,
      netImposable: bulletin.totals.netImposable,
      netAvantImpot: bulletin.totals.netAvantImpot,
      pas: bulletin.totals.pas,
      netPaye: bulletin.totals.netPaye,
    },
  });
  console.log(`✓ ${file}  brut=${eur(bulletin.totals.gross)}  net=${eur(bulletin.totals.netPaye)}`);
}

writeFileSync(join(HERE, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\n${manifest.length} bulletins générés dans ${OUT}`);

// ── Exemple public (avec cumuls) ────────────────────────────────────────────
// public/exemple-bulletin.pdf n'est utilisé QUE par le chemin serveur (lecture
// IA) : ImportPage « Tester avec un exemple » et npm run verify:claude.
// Contrairement à exemple-bulletin-anomalie.pdf (repris par la démo locale de
// l'accueil), on peut donc y ajouter un bloc « Cumuls » sans risquer de
// perturber l'extracteur local heuristique (qui, lui, ne lit pas les cumuls).
{
  const sain = scenarios.find((s) => s.id === 'clarified-sain');
  const bulletin = calcBulletin(sain.input);
  const months = monthsElapsed(sain.meta.periodLabel);
  const bytes = await render(bulletin, sain.meta, {
    cumuls: {
      gross: Math.round(bulletin.totals.gross * months * 100) / 100,
      netImposable: Math.round(bulletin.totals.netImposable * months * 100) / 100,
      netSocial: Math.round(bulletin.totals.netSocial * months * 100) / 100,
    },
  });
  const outPath = join(HERE, '..', '..', 'public', 'exemple-bulletin.pdf');
  writeFileSync(outPath, bytes);
  console.log(`✓ public/exemple-bulletin.pdf régénéré (avec cumuls sur ${months} mois)`);
}
