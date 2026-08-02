# CONTEXTE — Jobly (état du projet & mémoire de travail)

> Document d'orientation destiné à reprendre le projet immédiatement, avec tout
> le contexte des décisions et de l'architecture. À lire en premier.

---

## 1. Qu'est-ce que Jobly

Agrégateur d'offres de **stage et d'alternance dans la tech en France**.
Le site **n'héberge aucune candidature** : chaque offre vient d'une source réelle
et le bouton « Postuler » redirige (302) vers le **lien réel de l'annonce**, en
enregistrant le clic. Design **sobre et épuré** (fond blanc, accent indigo).

- **Chemin local** : le dossier où le dépôt est cloné
- **Dépôt** : le remote Git `origin` (branche `main`)

---

## 2. Stack technique

| Domaine        | Choix                                                           |
| -------------- | --------------------------------------------------------------- |
| Frontend       | Next.js 14 (App Router), TypeScript strict, Tailwind CSS        |
| Data-fetching  | TanStack Query (client) + Server Components, filtres URL (nuqs) |
| Base           | PostgreSQL + Prisma                                             |
| Recherche      | Meilisearch (facettes, typo, géo)                               |
| Cache / queues | Redis + BullMQ                                                  |
| Auth           | Auth.js (credentials bcrypt + OAuth Google/LinkedIn, JWT)       |
| Fichiers       | S3-compatible (MinIO en dev), CV PDF ≤ 5 Mo (magic number)      |
| Emails         | Provider abstrait (console en dev, Resend en prod)              |
| Tests          | Vitest (51 tests)                                               |
| Conteneurs     | docker-compose : app, postgres, redis, meilisearch, minio       |

---

## 3. Le système d'ingestion (cœur du projet)

Tout passe par **`src/server/ingest/`**.

### Pipeline commun — `ingest.ts` → `processIngest(sourceSite, rawOffers[])`

1. **Normalisation** (`normalize.ts`) : titres, villes, mapping des contrats.
2. **Rejet hors périmètre** : tout ce qui n'est PAS stage/alternance est refusé
   (CDI, CDD, VIE…) et loggé — c'est la garantie « stage/alternance uniquement ».
3. **Déduplication** : hash SHA-256 de `titre+entreprise+ville` (`dedup_hash`
   unique en base). Un doublon rafraîchit `last_seen_at`.
4. **Indexation Meilisearch** à chaque écriture.
5. **Attribution par offre** : `RawOffer.sourceSite` optionnel prime sur le
   sourceSite du connecteur (utile pour l'agrégateur JSearch multi-sites).

### Connecteurs — `src/server/ingest/sources/`

Interface `SourceConnector` (`types.ts`) : `isEnabled()` + `fetchOffers()`.
Enregistrés dans **`run-ingestion.ts`** (orchestrateur).

| Fichier             | Source                 | Clé requise    | Statut / notes                                                                                                                                                                                          |
| ------------------- | ---------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `linkedin.ts`       | LinkedIn               | **Non**        | ✅ Marche. Endpoint public « invité » (jobs-guest). Recherche et descriptions **alternées par lots** (`QUERY_BATCH`) : un rate-limit en cours de cycle ne fait plus perdre les offres déjà construites. |
| `france-travail.ts` | France Travail v2      | Oui (OAuth)    | Prêt. Source officielle exhaustive, codes ROME tech. Vars `FRANCE_TRAVAIL_CLIENT_ID/SECRET`.                                                                                                            |
| `jsearch.ts`        | **Indeed + Glassdoor** | Oui (RapidAPI) | Prêt. Via JSearch/Google for Jobs. Attribution par offre (`indeed.com`/`glassdoor.fr`). Var `RAPIDAPI_KEY`.                                                                                             |
| `themuse.ts`        | The Muse               | Non            | ✅ Marche mais volume FR faible (~1). Repli keyless.                                                                                                                                                    |
| `geocode.ts`        | —                      | —              | Géocodage villes FR → lat/lng (recherche géo).                                                                                                                                                          |
| `types.ts`          | —                      | —              | `SourceConnector`, `TECH_KEYWORDS` (24 métiers), `techQueries()`.                                                                                                                                       |

> **Décision clé** : Indeed et Glassdoor **bloquent le scraping direct** (vérifié :
> Indeed 403 depuis le conteneur, Glassdoor 403+captcha). Un connecteur Indeed
> direct a été tenté puis **abandonné** (renvoyait 0). La voie légale retenue est
> **JSearch** (agrège Google for Jobs, inclut Indeed + Glassdoor avec vrais liens).
> WTTJ : clé Algolia chiffrée côté serveur, non réutilisable. JobTeaser : auth-gated.

### Automatisation — `src/workers/index.ts` (BullMQ)

- `ingest-offers` : **toutes les 30 min** + **au démarrage** du worker.
- `offer-freshness` : horaire → `EXPIRED` si non revue depuis `OFFER_FRESHNESS_DAYS`.
- `purge-old-offers` : quotidien 3 h → **suppression définitive** (base + index)
  des offres publiées il y a plus de `OFFER_MAX_AGE_DAYS` jours (60 = 2 mois).
  Logique dans `freshness.ts` → `purgeOldOffers()`.
- `daily-alerts` : 8 h → alertes email.

Lancement manuel : `npm run ingest:now` (script `scripts/ingest-now.ts`).

---

## 4. Redirection « Postuler »

- `GET /go/:offerId` (`src/app/go/[offerId]/route.ts`) : vérifie que l'offre est
  ACTIVE, enregistre le clic (`apply_clicks`), répond **302** vers `sourceUrl`
  (le **vrai lien de l'annonce**). Offre expirée → page dédiée + 6 similaires.
- **Nouvel onglet** : le bouton « Postuler » a `target="_blank"` **sur les cartes**
  (`components/offers/offer-card.tsx`) **et sur la page détail** (`app/offres/[slug]/page.tsx`).

---

## 5. Design (« sobre & épuré »)

Fond blanc `#FFF`, encre `#171717`, **un seul accent indigo `#4F46E5`**, gris
`neutral-50` pour les surfaces. Police unique **Inter**. Cards arrondies à bordure
légère + ombre douce au survol, badges arrondis pour les contrats, header sticky,
hero centré. Mode sombre neutre (`neutral-950/200`) avec bascule. Tokens dans
`tailwind.config.ts` + `src/app/globals.css` (classes `.card`, `.btn-cobalt`,
`.btn-outline`, `.stamp`, `.ticket`, `.input-ink`). Ancien thème « Ink & Signal »
(papier/jaune/serif Fraunces) **supprimé**.

---

## 6. Historique des livraisons (sessions passées)

1. **Dockerisation** : 1er build fonctionnel. Corrigés : migration Prisma initiale
   manquante, `package-lock.json` désync (régénéré avec le npm de l'image),
   `.dockerignore` ajouté.
2. **Périmètre stage/alternance** : rejet CDI/CDD/VIE à l'ingestion (+ test),
   facettes/copie limitées à stage+alternance.
3. **Refonte design** sobre/blanc (voir §5).
4. **Fin des 404 « Postuler »** : les offres pointent vers le vrai lien.
5. **Scraper d'offres réelles** : connecteurs + pipeline + crons (voir §3).
   Seed réduit aux 3 comptes démo (plus aucune offre fictive).
6. **Indeed + Glassdoor** via JSearch, **volume maximisé** (`TECH_KEYWORDS`),
   **purge +2 mois**, **redirections en nouvel onglet**.
7. **Renommage en Jobly + marque** : logo interactif (monogramme « J »-flèche,
   parallaxe au pointeur), favicon, image Open Graph, palette de marque.
8. **Scraping durci** : couche HTTP commune (`ingest/http.ts` — retry/backoff,
   throttle et disjoncteur par hôte, pool borné), enrichissement des offres
   (`ingest/enrich.ts`), sources en parallèle, bilans archivés (`ingest_runs`).
9. **Console d'administration complète** (`/admin`) : tableau de bord, offres,
   entreprises, utilisateurs, sources, SEO, paramètres, journal d'audit.
   Compte admin provisionné **hors dépôt** (`npm run admin:create` ← `.env`).

---

## 7. Conventions de travail (IMPORTANT pour la suite)

- **Langue** : réponses et commits en **français**.
- **Commits** : **1 commit par fichier**, préfixes **`MOD:`** / **`ADD:`** / **`RM:`**
  suivis du chemin et d'une courte description. Ex :
  `MOD: src/workers/index.ts — cron quotidien de purge des offres de +2 mois`.
- **Qualité avant commit** : `npx tsc --noEmit`, `npm run lint`, `npm run test`
  doivent passer ; `npx prettier --write` sur les fichiers touchés.
- **Vérification** : reconstruire (`docker compose up -d --build app`), surveiller
  les logs d'ingestion, tester les pages et la redirection avant de conclure.

---

## 8. État actuel & limites connues

- ✅ Site opérationnel, **~118 vraies offres** LinkedIn indexées (le corpus grandit
  à chaque cycle de 30 min).
- ⏳ **France Travail** et **Indeed/Glassdoor (JSearch)** : code prêt, **inactifs
  tant que les clés `.env` ne sont pas renseignées** (voir `MARCHE_A_SUIVRE.md` §3).
- ⚠️ LinkedIn et JSearch reposent sur des endpoints **non contractuels** : parsing
  défensif, échec propre par source. Un changement de HTML LinkedIn peut casser le
  connecteur → à surveiller.
- ⚠️ LinkedIn rate-limite au-delà de ~70 requêtes/cycle. Le disjoncteur de
  `ingest/http.ts` coupe désormais l'hôte proprement et **conserve les offres
  déjà collectées** ; la couverture massive vient toujours de France Travail.
- ✅ Migrations `20260802103000_admin_panel_and_ingest_runs` et
  `20260802104500_offer_moderation_block` **appliquées et vérifiées** en local.
- ✅ Compte administrateur provisionné via `npm run admin:create` (identifiants
  dans `.env`, non versionné) ; l'ancien compte de démonstration
  `admin@nextstep.test` (mot de passe public) a été **rétrogradé en USER** —
  il ouvrait sinon la console d'administration.
- ⚠️ **LinkedIn rate-limite plus tôt qu'avant** (~20-30 requêtes/cycle observées).
  Le connecteur alterne désormais recherche et descriptions par lots de 4
  requêtes (`QUERY_BATCH`) : un cycle coupé rend quand même des offres complètes
  (mesuré : 0 offre avant le correctif, 15 après, sur un cycle coupé).
- ℹ️ Les identifiants d'infrastructure (PostgreSQL, MinIO, Meilisearch) sont
  restés `nextstep` : renommer aurait cassé les volumes Docker existants.
  Seule la marque visible a été renommée en Jobly.

---

## 9. Points d'entrée code (raccourcis)

- Ingestion : `src/server/ingest/` (pipeline `ingest.ts`, sources `sources/`,
  orchestrateur `run-ingestion.ts`, crons `src/workers/index.ts`).
- Redirection : `src/app/go/[offerId]/route.ts` + `src/server/apply/redirect.ts`.
- Recherche : `src/server/search/` + `src/app/api/search/route.ts` + `src/components/offers/`.
- Design & marque : `tailwind.config.ts`, `src/app/globals.css`,
  `src/components/brand/jobly-logo.tsx`, `src/app/icon.svg`, `src/app/opengraph-image.tsx`.
- Administration : `src/app/admin/`, `src/server/admin/` (`guard.ts`, `audit.ts`,
  `actions.ts`), réglages `src/lib/settings.ts`, composants `src/components/admin/`.
- Compte admin : `scripts/create-admin.ts` (identifiants dans `.env`, jamais versionnés).
- Config env : `.env.example`, `docker-compose.yml`.
- Docs : `README.md`, `MARCHE_A_SUIVRE.md`, `CONTEXTE.md`, `DECISIONS.md`.
