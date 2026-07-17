# NextStep — Job board étudiants & jeunes diplômés

> Agrégateur d'offres de **stage et d'alternance dans la tech en France**, construit avec Next.js 14, PostgreSQL, Meilisearch et Redis. Design sobre et épuré.
>
> **Particularité du modèle** : le site n'héberge aucune candidature. Les offres sont **ingérées en temps réel depuis des sources réelles** (France Travail, The Muse) ; le bouton « Postuler » redirige (302) vers le lien réel de l'annonce via `/go/:offerId`, en enregistrant le clic au passage.

## Démarrage rapide

```bash
cp .env.example .env
docker compose up
```

Le site est disponible sur [http://localhost:3000](http://localhost:3000). Au démarrage, le worker ingère automatiquement de vraies offres (The Muse fonctionne sans clé ; ajoutez vos identifiants France Travail pour la couverture complète — voir ci-dessous). Trois comptes de démonstration sont créés par le seed.

### Comptes de démonstration

| Rôle  | Email                 | Mot de passe |
| ----- | --------------------- | ------------ |
| Admin | admin@nextstep.test   | nextstep123  |
| User  | camille@nextstep.test | nextstep123  |
| User  | theo@nextstep.test    | nextstep123  |

### Développement local (sans Docker pour l'app)

```bash
npm install
docker compose up postgres redis meilisearch minio minio-init  # infra seule
npx prisma migrate dev
npm run db:seed
npm run ingest:now # ingère de vraies offres tout de suite (ou attendre le worker)
npm run search:sync
npm run dev        # app Next.js
npm run worker     # crons BullMQ (ingestion 30 min + fraîcheur + alertes)
```

## Ingestion des offres réelles

Les offres proviennent de connecteurs branchés sur le pipeline commun
(`processIngest` : normalisation, déduplication SHA-256, **rejet de tout ce qui
n'est pas stage/alternance**, indexation Meilisearch). Chaque connecteur balaie
une large liste de métiers tech (`TECH_KEYWORDS`) croisée avec « stage » et
« alternance » pour maximiser le volume. Chaque offre pointe vers **le lien réel
de l'annonce** sur sa source.

**Automatisation temps réel** : un cron BullMQ relance l'ingestion toutes les
30 min (`INGESTION_INTERVAL_MINUTES`) plus une passe au démarrage du worker ; un
cron quotidien **supprime définitivement** (base + index) les offres publiées il
y a plus de 2 mois (`OFFER_MAX_AGE_DAYS`), et un cron horaire marque `EXPIRED`
les offres qui ont disparu de leur source. Lancement manuel : `npm run ingest:now`.

| Source                         | Clé requise    | Couverture                                               |
| ------------------------------ | -------------- | -------------------------------------------------------- |
| **LinkedIn**                   | Non            | Endpoint invité public — stages + alternance tech FR     |
| **Indeed**                     | Non            | Recherche publique fr.indeed.com — stages + alternance   |
| **France Travail** (Offres v2) | Oui (OAuth)    | Exhaustive France — codes ROME tech                      |
| **Glassdoor** (via JSearch)    | Oui (RapidAPI) | Google for Jobs, éditeur Glassdoor                        |
| **The Muse**                   | Non            | Repli — stages tech localisés en France                  |

- **France Travail** : application gratuite sur [francetravail.io](https://francetravail.io),
  souscrire à « Offres d'emploi v2 » → `FRANCE_TRAVAIL_CLIENT_ID` / `_SECRET`.
- **Glassdoor** : clé gratuite [JSearch sur RapidAPI](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) → `RAPIDAPI_KEY`.

LinkedIn et Indeed s'appuient sur des endpoints publics non contractuels : le
parsing est défensif et une source en échec (throttling, changement de HTML)
n'interrompt pas les autres.

Ajouter une source = implémenter `SourceConnector` dans
`src/server/ingest/sources/` et l'enregistrer dans `run-ingestion.ts`.

## Stack

| Domaine        | Choix                                                           |
| -------------- | --------------------------------------------------------------- |
| Frontend       | Next.js 14 (App Router), TypeScript strict, Tailwind CSS        |
| Data-fetching  | TanStack Query (client) + Server Components, filtres URL (nuqs) |
| Backend        | Route handlers Next.js (voir `DECISIONS.md`)                    |
| Base           | PostgreSQL + Prisma                                             |
| Recherche      | Meilisearch (facettes, typo-tolérance, géo-recherche)           |
| Cache / queues | Redis + BullMQ                                                  |
| Auth           | Auth.js — credentials + OAuth Google & LinkedIn                 |
| Fichiers       | S3-compatible (MinIO en dev), upload CV PDF ≤ 5 Mo              |
| Emails         | Abstraction provider — Resend en prod, console en dev           |
| Tests          | Vitest (dédup, redirection `/go/`, matching d'alertes)          |

## Architecture

```
src/
├── app/                    # Pages (App Router) + route handlers
│   ├── (public)/           # Accueil, /offres, /entreprises, pages système
│   ├── (auth)/             # Connexion, inscription, reset password
│   ├── mon-espace/         # Espace candidat
│   ├── admin/              # Back-office admin
│   ├── go/[offerId]/       # Redirection "Postuler" (302 + tracking)
│   └── internal/ingest/    # API d'ingestion (protégée par clé API)
├── components/             # UI (design sobre & épuré)
├── lib/                    # Prisma, Redis, Meilisearch, S3, emails, utils
├── server/                 # Logique métier
│   └── ingest/sources/     # Connecteurs de scraping (LinkedIn, Indeed, France Travail, Glassdoor, The Muse)
└── workers/                # Crons BullMQ (ingestion, fraîcheur, purge, alertes)
```

## Le pipeline d'ingestion

Les connecteurs (`src/server/ingest/sources/`) récupèrent les offres réelles et
les poussent dans `processIngest`. Une API interne reste disponible pour pousser
des offres manuellement :

```
POST /internal/ingest
Header: x-api-key: $INGEST_API_KEY
Body: { "sourceSite": "...", "offers": [ { titre, entreprise, ville, ... } ] }
```

1. **Normalisation** des champs bruts (titres, villes, types de contrat).
2. **Rejet hors périmètre** : tout ce qui n'est pas stage/alternance est refusé et loggé.
3. **Déduplication** par hash SHA-256 sur `titre + entreprise + ville` normalisés (`dedup_hash` unique en base). Un doublon met à jour `last_seen_at` et est loggé `DUPLICATE`.
4. **Indexation** dans Meilisearch à chaque écriture.
5. **Expiration** : un cron horaire marque `EXPIRED` toute offre non revue depuis `OFFER_FRESHNESS_DAYS` jours.
6. **Purge** : un cron quotidien supprime définitivement les offres de plus de `OFFER_MAX_AGE_DAYS` jours (2 mois).

Chaque opération est tracée dans `ingest_logs` (visible dans `/admin`).

## Redirection « Postuler »

`GET /go/:offerId` :

1. Vérifie que l'offre est `ACTIVE` ;
2. Enregistre le clic dans `apply_clicks` (user si connecté, timestamp, referer) ;
3. Répond **302** vers `source_url`.

Offre expirée → page dédiée avec 6 offres similaires.

## Scripts

| Commande              | Effet                                         |
| --------------------- | --------------------------------------------- |
| `npm run dev`         | App Next.js en développement                  |
| `npm run build`       | Build de production                           |
| `npm run start:all`   | App + worker (utilisé par Docker)             |
| `npm run worker`      | Worker BullMQ seul (crons + ingestion)        |
| `npm run db:seed`     | Seed (3 comptes de démonstration)             |
| `npm run ingest:now`  | Ingestion manuelle des offres réelles         |
| `npm run search:sync` | Ré-indexation complète Postgres → Meilisearch |
| `npm run test`        | Tests Vitest                                  |
| `npm run lint`        | ESLint                                        |

## Tests

30 tests Vitest couvrent les trois zones critiques :

- **Déduplication** (`src/server/ingest/dedup.test.ts`, `normalize.test.ts`) — normalisation accents/casse/ponctuation, hash stable, mapping des enums, rejets ;
- **Redirection `/go/`** (`src/server/apply/redirect.test.ts`) — 302 vers la source, clic loggé (connecté et anonyme), offre expirée → page dédiée sans clic compté ;
- **Matching d'alertes** (`src/server/alerts/match.test.ts`) — mots-clés multi-termes insensibles aux accents, filtres combinés, salaires.

```bash
npm run test
```

## Design system — sobre & épuré

Fond blanc, encre neutre (`#171717`), un seul accent indigo (`#4F46E5`), gris de soutien pour les surfaces (`neutral-50`). Typographie unique (Inter) avec hiérarchie par la graisse, cards arrondies à bordure légère et ombre douce au survol, badges arrondis pour les contrats, boutons pleins/contours arrondis. Mode sombre neutre (`neutral-950` / `neutral-200`) avec bascule dans le header. Contrastes AA, focus visibles, navigation clavier complète, touch targets ≥ 44 px, `prefers-reduced-motion` respecté.

Voir `DECISIONS.md` pour les choix techniques documentés.
