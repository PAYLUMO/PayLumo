# PayLumo

Analyse de bulletin de paie français : décompose le salaire, explique chaque
cotisation et repère les erreurs potentielles en comparant les taux au **barème
légal 2026**.

- **Import PDF uniquement.** Lecture (IA, repli local) + analyse **sur le serveur** ;
  le PDF n'est pas conservé. Le résultat est mis en cache dans le navigateur.
- **Accès libre**, sans compte ni paiement (rate-limité par IP pour éviter les abus).
- Web responsive (PWA installable) ; app Android via Capacitor à venir, puis iOS.

## Démarrer

```bash
npm install
cp .env.example .env        # renseigner ANTHROPIC_API_KEY (npm run set-key)
npm run dev:all             # front (5173) + API (8787), Vite proxifie /api
```

`npm run dev` seul lance le front ; les appels `/api/*` échouent alors
proprement (« Serveur injoignable »).

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
| `npm run set-key` | écrit `ANTHROPIC_API_KEY` dans `.env` (saisie au clavier) |
| `npm run verify:claude` | appel réel à l'API sur un bulletin d'exemple |

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
  app.ts                app Hono : POST /api/analyze (PDF)
  dev.ts                serveur de dev local
api/[[...route]].ts     entrée serverless Vercel (délègue à server/app)
src/
  app/                  routes, layout, thème, store (Zustand)
  features/
    import/             ImportPage (choix → précontrôle → analyse) · precheck · requestAnalysis
    parsing/pdf.ts      câblage worker pdf.js (client) → délègue à shared/parsing/pdf-core
    comparator/         comparateur de salaire INSEE (gratuit, 100 % client)
    results/ explain/ history/ settings/
  lib/storage.ts        historique local (IndexedDB)
```

### Flux

```
PDF ─ précontrôle local (couche texte + mots-clés bulletin)
    └─ POST /api/analyze { pdf, fileName }
        1. extractWithClaude → (repli extract local)
        2. analyzePayslip  (déterministe)
        3. → StoredAnalysis   |   bulletin illisible → 422   |   panne → 502 retry
```

- **L'analyse est déterministe** — l'IA ne fait que *lire*.
- **Défensif** : champ peu fiable non contrôlé ; panne transitoire → réessai ;
  bulletin illisible (scan, mise en page inconnue) → 422.
- Re-consulter une analyse (Historique) ne repasse pas par le serveur.

## Contrôles (`shared/analysis/checks/`)

Taux salarial/patronal vs barème 2026, cohérence `base × taux = montant`,
assiette attendue (tranches / plafond), cotisation obligatoire manquante, ligne
inconnue, cohérence du brut, passage brut → net, net après PAS, prélèvement à la
source, SMIC, dépassement de plafond.

## Accès

- L'analyse (`POST /api/analyze`) est **libre d'accès**, sans compte ni code.
- Rate-limit par IP en mémoire (`RATE_LIMIT_PER_HOUR`, défaut 30) — pour la prod,
  brancher Vercel KV / Upstash.
- Stripe a été retiré (paiement à réintroduire plus tard si besoin).

## Déploiement (Vercel)

`api/[[...route]].ts` est détecté comme fonction serverless Node ; le front Vite
se build dans `dist/`. Variables d'environnement (dashboard) :
`ANTHROPIC_API_KEY`, `PAYLUMO_MODEL`,
`ALLOWED_ORIGINS` (= URL de l'app), `MAX_PDF_MB`, `RATE_LIMIT_PER_HOUR`.

## Référentiel 2026 — sources

Arrêté du 22 décembre 2025 (PMSS 4 005 € / PASS 48 060 €), barèmes URSSAF /
BOSS, « Chiffr'Agirc-Arrco 2026 », SMIC au 1er janvier (12,02 €) puis 1er juin
2026 (12,31 €). Taux centralisés dans `shared/data/`, à revérifier chaque année.

## Limites connues / suite

- Extracteur local calé sur le **format « bulletin clarifié »** (commun à SAP HCM
  France) ; à affiner sur de vrais bulletins SAP (`samples/`).
- PDF scannés non pris en charge (OCR prévu).
- Structured outputs Anthropic : schéma Zod `nullable` **vérifié** accepté par
  l'API (`npm run verify:claude`).
- À venir : réintroduction éventuelle du paiement ; build Android (Capacitor),
  iOS ; upgrade du comparateur INSEE (vrais jeux de données).

## Avertissement

Analyse **indicative** fondée sur des barèmes publics. Elle ne constitue pas un
conseil juridique, comptable ou fiscal ; pour toute précision, votre service paie
ou un expert-comptable est le bon interlocuteur.
