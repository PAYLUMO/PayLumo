# PayLumo

Analyse de bulletin de paie français : décompose le salaire, explique chaque
cotisation et repère les erreurs potentielles en comparant les taux au **barème
légal 2026**.

- **Analyse à l'unité — 0,99 €**, paiement Stripe, sans compte ni abonnement.
- **Import PDF uniquement.** Lecture (IA, repli local) + analyse **sur le serveur** ;
  le PDF n'est pas conservé. Le résultat est mis en cache dans le navigateur.
- Web responsive (PWA installable) ; app Android via Capacitor à venir, puis iOS.

## Démarrer

```bash
npm install
cp .env.example .env        # renseigner ANTHROPIC_API_KEY et STRIPE_SECRET_KEY (sk_test_…)
npm run dev:all             # front (5173) + API (8787), Vite proxifie /api
```

`npm run dev` seul lance le front ; les appels `/api/*` échouent alors
proprement (paiement « momentanément indisponible »).

| Script | Rôle |
|---|---|
| `npm run dev` | front Vite |
| `npm run server` | API locale (Hono, port 8787) |
| `npm run dev:all` | front + API en parallèle |
| `npm run build` | build de production (`dist/`) |
| `npm run preview` | sert le build |
| `npm test` | tests Vitest |
| `npm run fixtures` | régénère les bulletins PDF synthétiques de test |
| `npm run typecheck` | vérification TypeScript (client + serveur) |

## Architecture

```
shared/                 code exécuté côté client ET serveur (imports relatifs)
  extraction.ts         schéma Zod de la lecture IA
  lib/                  money (parse/format FR), dates
  data/                 params · rates2026 · taxonomy · explanations.fr
  parsing/              pdf-core · extract (→ Payslip) · fromRaw · model
  analysis/             context · findings · engine · checks/
server/
  claude.ts             PDF → RawExtraction via l'API Anthropic (sortie structurée)
  localPdf.ts           pdf.js « legacy » pour le repli local
  analyze.ts            runAnalysis : Claude → repli local → analyzePayslip → StoredAnalysis
  stripe.ts             Checkout · vérification du paiement · remboursement
  app.ts                app Hono : POST /api/checkout · POST /api/analyze
  dev.ts                serveur de dev local
api/[[...route]].ts     entrée serverless Vercel (délègue à server/app)
src/
  app/                  routes, layout, thème, store (Zustand)
  features/
    import/             ImportPage (choix → précontrôle → paiement → analyse) · precheck
    payment/            checkout (hash + Stripe) · analyze (récupération après paiement)
    parsing/pdf.ts      câblage worker pdf.js (client) → délègue à shared/parsing/pdf-core
    results/ explain/ history/ settings/
  lib/storage.ts        historique local (IndexedDB)
```

### Flux

```
PDF ─ précontrôle local (gratuit : couche texte + mots-clés bulletin)
    └─ « Payer 0,99 € » ─ POST /api/checkout ─ Stripe Checkout ─ retour ?session_id=…
        └─ POST /api/analyze { session_id, pdf }
             1. verifyPaid : payé ? montant ? SHA-256 du PDF == metadata.pdfHash ? déjà remboursé ?
             2. extractWithClaude → (repli extract local)
             3. analyzePayslip  (déterministe)
             4. → StoredAnalysis   |   échec définitif → remboursement auto (422)
```

- **L'analyse est déterministe** — l'IA ne fait que *lire*.
- **Défensif** : champ peu fiable non contrôlé ; extraction trop pauvre →
  `LECTURE_INCOMPLETE` ; panne transitoire → réessai gratuit (session conservée) ;
  bulletin illisible → remboursement automatique.
- Re-consulter une analyse déjà payée (Historique) est gratuit.

## Contrôles (`shared/analysis/checks/`)

Taux salarial/patronal vs barème 2026, cohérence `base × taux = montant`,
assiette attendue (tranches / plafond), cotisation obligatoire manquante, ligne
inconnue, cohérence du brut, passage brut → net, net après PAS, prélèvement à la
source, SMIC, dépassement de plafond.

## Paiement (Stripe)

- Checkout hébergé, mode `payment`, prix inline `PAYLUMO_PRICE_CENTS` (défaut 99).
- Le paiement est lié au bulletin par le **SHA-256 du PDF** (`session.metadata.pdfHash`)
  : une session ne débloque que ce fichier ; le réessai sur le même fichier est
  idempotent, un autre fichier exige un nouveau paiement.
- **Pas de webhook** : vérification de la session au retour. (Webhook = durcissement
  optionnel pour la réconciliation des paiements abandonnés.)
- Remboursement automatique (`stripe.refunds.create`) si la lecture échoue
  définitivement.
- Rate-limit en mémoire — pour la prod, brancher Vercel KV / Upstash (idem
  consommation des sessions).

## Déploiement (Vercel)

`api/[[...route]].ts` est détecté comme fonction serverless Node ; le front Vite
se build dans `dist/`. Variables d'environnement (dashboard) :
`ANTHROPIC_API_KEY`, `PAYLUMO_MODEL`, `STRIPE_SECRET_KEY` (`sk_live_…`),
`PAYLUMO_PRICE_CENTS`, `ALLOWED_ORIGINS` (= URL de l'app), `MAX_PDF_MB`,
`RATE_LIMIT_PER_HOUR`.

**À faire hors code** : la vente en ligne impose des CGV + une politique de
remboursement accessibles (exigence Stripe).

## Référentiel 2026 — sources

Arrêté du 22 décembre 2025 (PMSS 4 005 € / PASS 48 060 €), barèmes URSSAF /
BOSS, « Chiffr'Agirc-Arrco 2026 », SMIC au 1er janvier (12,02 €) puis 1er juin
2026 (12,31 €). Taux centralisés dans `shared/data/`, à revérifier chaque année.

## Limites connues / suite

- Extracteur local calé sur le **format « bulletin clarifié »** (commun à SAP HCM
  France) ; à affiner sur de vrais bulletins SAP (`samples/`).
- PDF scannés non pris en charge (OCR prévu).
- Structured outputs : vérifier au premier appel Claude réel que l'API accepte le
  schéma JSON généré (champs `nullable`).
- À venir : build Android (Capacitor), iOS ; comparaison INSEE.

## Avertissement

Analyse **indicative** fondée sur des barèmes publics. Ne remplace pas l'avis du
service paie, d'un expert-comptable, de l'URSSAF ou de l'inspection du travail.
