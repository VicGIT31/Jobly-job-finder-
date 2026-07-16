# NextStep — Job board étudiants & jeunes diplômés

> Clone fonctionnel de JobTeaser avec un design original « Ink & Signal », construit avec Next.js 14, PostgreSQL, Meilisearch et Redis.
>
> **Particularité du modèle** : le site n'héberge aucune candidature. Chaque offre provient d'un scraping externe — le bouton « Postuler » redirige (302) vers le site source via `/go/:offerId`, en enregistrant le clic au passage.

## Démarrage rapide

```bash
cp .env.example .env
docker compose up
```

Le site est disponible sur [http://localhost:3000](http://localhost:3000) avec la base seedée (60+ offres, 15 entreprises, 3 comptes de test).

### Comptes de démonstration

| Rôle  | Email                  | Mot de passe |
| ----- | ---------------------- | ------------ |
| Admin | admin@nextstep.test    | nextstep123  |
| User  | camille@nextstep.test  | nextstep123  |
| User  | theo@nextstep.test     | nextstep123  |

### Développement local (sans Docker pour l'app)

```bash
npm install
docker compose up postgres redis meilisearch minio minio-init  # infra seule
npx prisma migrate dev
npm run db:seed
npm run search:sync
npm run dev        # app Next.js
npm run worker     # crons BullMQ (fraîcheur des offres + alertes email)
```

## Stack

| Domaine        | Choix                                                          |
| -------------- | -------------------------------------------------------------- |
| Frontend       | Next.js 14 (App Router), TypeScript strict, Tailwind CSS       |
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
├── components/             # UI (design system "Ink & Signal")
├── lib/                    # Prisma, Redis, Meilisearch, S3, emails, utils
├── server/                 # Logique métier (ingestion, recherche, alertes)
└── workers/                # Crons BullMQ (fraîcheur, alertes)
```

## Le pipeline d'ingestion

Le scraping lui-même est hors scope. L'ingestion se fait via :

```
POST /internal/ingest
Header: x-api-key: $INGEST_API_KEY
Body: { "sourceSite": "...", "offers": [ { titre, entreprise, ville, ... } ] }
```

1. **Normalisation** des champs bruts (titres, villes, types de contrat).
2. **Déduplication** par hash SHA-256 sur `titre + entreprise + ville` normalisés (`dedup_hash` unique en base). Un doublon met à jour `last_seen_at` et est loggé `DUPLICATE`.
3. **Indexation** dans Meilisearch à chaque écriture.
4. **Expiration** : un cron BullMQ marque `EXPIRED` toute offre non revue depuis `OFFER_FRESHNESS_DAYS` jours.

Chaque opération est tracée dans `ingest_logs` (visible dans `/admin`).

## Redirection « Postuler »

`GET /go/:offerId` :

1. Vérifie que l'offre est `ACTIVE` ;
2. Enregistre le clic dans `apply_clicks` (user si connecté, timestamp, referer) ;
3. Répond **302** vers `source_url`.

Offre expirée → page dédiée avec 6 offres similaires.

## Scripts

| Commande              | Effet                                            |
| --------------------- | ------------------------------------------------ |
| `npm run dev`         | App Next.js en développement                     |
| `npm run build`       | Build de production                              |
| `npm run start:all`   | App + worker (utilisé par Docker)                |
| `npm run worker`      | Worker BullMQ seul (crons)                       |
| `npm run db:seed`     | Seed (60+ offres, 15 entreprises, 3 users)       |
| `npm run search:sync` | Ré-indexation complète Postgres → Meilisearch    |
| `npm run test`        | Tests Vitest                                     |
| `npm run lint`        | ESLint                                           |

## Design system — « Ink & Signal »

Direction éditoriale façon presse papier moderne : fond papier chaud `#FAF7F2`, encre `#141414`, accent cobalt `#2743F0`, jaune signal `#FFD84D` en surlignage marqueur. Serif à personnalité pour les titres (Fraunces), grotesque neutre pour le corps (Inter). Angles vifs, filets 1px, ombres dures sans blur. Contrastes AA, navigation clavier complète, `prefers-reduced-motion` respecté.

Voir `DECISIONS.md` pour les choix techniques documentés.
