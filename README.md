# Jobly — Job board étudiants & jeunes diplômés

> Agrégateur d'offres de **stage et d'alternance dans la tech en France**, construit avec Next.js 14, PostgreSQL, Meilisearch et Redis. Design sobre et épuré.
>
> **Particularité du modèle** : le site n'héberge aucune candidature. Les offres sont **ingérées en temps réel depuis des sources réelles** (France Travail, The Muse) ; le bouton « Postuler » redirige (302) vers le lien réel de l'annonce via `/go/:offerId`, en enregistrant le clic au passage.

## Démarrage rapide

```bash
cp .env.example .env
docker compose up
```

Le site est disponible sur [http://localhost:3000](http://localhost:3000). Au démarrage, le worker ingère automatiquement de vraies offres (The Muse fonctionne sans clé ; ajoutez vos identifiants France Travail pour la couverture complète — voir ci-dessous). Deux comptes candidats de démonstration sont créés par le seed.

### Comptes de démonstration

| Rôle | Email              | Mot de passe |
| ---- | ------------------ | ------------ |
| User | camille@jobly.test | jobly123     |
| User | theo@jobly.test    | jobly123     |

### Compte administrateur

Le seed **ne crée aucun compte ADMIN** : son mot de passe est public, il n'a rien
à faire dans une console d'administration. L'administrateur est provisionné hors
dépôt, à partir de variables d'environnement placées dans `.env` (non versionné) :

```bash
# dans .env — voir .env.example
ADMIN_USERNAME=…
ADMIN_PASSWORD=…
ADMIN_EMAIL=…          # optionnel, défaut <username>@jobly.local
```

```bash
npm run admin:create               # local
docker compose exec app npm run admin:create   # dans le conteneur
```

Le script est idempotent (relançable pour changer le mot de passe) et les mêmes
variables sont appliquées automatiquement au démarrage de `docker compose`.
La connexion accepte **l'email ou l'identifiant** ; la console est sur `/admin`.

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

| Source                         | Clé requise    | Couverture                                                    |
| ------------------------------ | -------------- | ------------------------------------------------------------- |
| **APEC**                       | Non            | ~1 400 alternances cadres, descriptions incluses (~218/cycle) |
| **HelloWork**                  | Non            | 1er job board généraliste FR, via JSON-LD (~456/cycle)        |
| **LinkedIn**                   | Non            | Endpoint invité public — stages + alternance tech FR          |
| **Free-Work**                  | Non            | 100 % tech FR, télétravail et compétences structurés          |
| **The Muse**                   | Non            | Repli — stages tech localisés en France                       |
| **France Travail** (Offres v2) | Oui (OAuth)    | Exhaustive France — codes ROME tech                           |
| **Indeed + Glassdoor**         | Oui (RapidAPI) | Google for Jobs, via JSearch                                  |

**~700 offres par cycle sans aucune clé.** Panorama complet du marché, sources
écartées et clés à fournir : **[`SOURCES.md`](SOURCES.md)**.

- **France Travail** : application gratuite sur [francetravail.io](https://francetravail.io),
  souscrire à « Offres d'emploi v2 » → `FRANCE_TRAVAIL_CLIENT_ID` / `_SECRET`.
- **Glassdoor** : clé gratuite [JSearch sur RapidAPI](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) → `RAPIDAPI_KEY`.

LinkedIn et HelloWork s'appuient sur des endpoints publics non contractuels : le
parsing est défensif et une source en échec (throttling, changement de HTML)
n'interrompt pas les autres. Quand un site publie ses offres au format
**schema.org `JobPosting`** (cas de HelloWork), le connecteur lit ce bloc plutôt
que le HTML : c'est un format standardisé, insensible aux refontes de maquette.

Ajouter une source = implémenter `SourceConnector` dans
`src/server/ingest/sources/` et l'enregistrer dans `run-ingestion.ts`.

### Robustesse du scraping

Tous les connecteurs passent par une couche HTTP commune
(`src/server/ingest/http.ts`) qui apporte :

- **retry avec backoff exponentiel + jitter**, et respect de l'en-tête `Retry-After` ;
- **throttle par hôte** (intervalle minimum entre deux requêtes) et **rotation
  d'User-Agent**, pour rester poli et éviter le bannissement ;
- un **disjoncteur par hôte** : après trois rate-limits, la source est coupée
  pour le reste du cycle et **rend les offres déjà collectées** au lieu de
  perdre le cycle entier ;
- un **pool de parallélisme borné** (`mapPool`) : les descriptions d'offres sont
  récupérées plusieurs de front, et les sources tournent en parallèle entre elles.

Les offres sont en plus **enrichies depuis leur texte** (`ingest/enrich.ts`) :
politique de télétravail, niveau d'études et type de contrat sont déduits du
titre et de la description — sans quoi ces facettes resteraient vides. Chaque
passage de connecteur est archivé dans `ingest_runs` et surveillé dans
`/admin/sources` (volume, durée, taux d'échec sur 24 h).

### Classement par spécialité

Chaque offre est rangée dans une spécialité tech — **IA & Data, Cybersécurité,
Web, DevOps & Cloud, Software Engineering, Réseaux & Systèmes** — déduite du
titre et de la description (`ingest/classify.ts`). Le secteur remonté par les
sources vaut toujours « Tech / Informatique » : sans ce classement, aucun filtre
par métier n'était possible.

Le titre est décisif dès qu'il nomme un métier ; le corps ne sert qu'à
départager. Sous le seuil de confiance, l'offre reste `AUTRE` plutôt que d'être
mal rangée — sur le corpus réel, **83 % des offres sont classées**. La
spécialité alimente le filtre de `/offres`, les facettes et les vignettes de la
page d'accueil. Après modification des règles : `npm run specialty:backfill`.

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

Chaque opération est tracée dans `ingest_logs` (visible dans `/admin/sources`).

## Console d'administration (`/admin`)

Réservée aux comptes de rôle `ADMIN` — le rôle est **revalidé en base** à chaque
rendu de page et à chaque action, jamais sur la seule foi du JWT.

| Section             | Ce qu'on y fait                                                                      |
| ------------------- | ------------------------------------------------------------------------------------ |
| Tableau de bord     | Indicateurs (offres, comptes, clics), derniers cycles d'ingestion, actions rapides   |
| Offres              | Recherche, blocage durable, suppression définitive (base + index)                    |
| Entreprises         | Mise en avant sur l'accueil, suppression (avec ses offres)                           |
| Utilisateurs        | Rôle, suspension, validation d'email, redéfinition du mot de passe, suppression      |
| Sources & ingestion | Santé des connecteurs sur 24 h, lancement manuel, ré-indexation, journal d'ingestion |
| SEO                 | Titres, description, mots-clés, canonique, indexation, `robots.txt`, vérifications   |
| Paramètres          | Accroche, contact, inscriptions ouvertes/fermées, mode maintenance, durées de vie    |
| Journal             | Audit de toutes les actions d'administration (qui, quoi, quand)                      |

Les réglages sont stockés dans `site_settings` (une ligne JSON par groupe) et
**alimentent réellement le rendu** : métadonnées de `app/layout.tsx`,
`robots.txt`, `sitemap.xml`, formulaire d'inscription, crons d'ingestion.
Une base sans réglages se comporte exactement comme avant (valeurs d'usine).

Deux garde-fous : le **dernier administrateur actif** ne peut être ni
rétrogradé, ni suspendu, ni supprimé ; et une offre bloquée en modération n'est
pas réactivée par le cycle d'ingestion suivant (`blockedAt`).

## Redirection « Postuler »

`GET /go/:offerId` :

1. Vérifie que l'offre est `ACTIVE` ;
2. Enregistre le clic dans `apply_clicks` (user si connecté, timestamp, referer) ;
3. Répond **302** vers `source_url`.

Offre expirée → page dédiée avec 6 offres similaires.

## Scripts

| Commande               | Effet                                         |
| ---------------------- | --------------------------------------------- |
| `npm run dev`          | App Next.js en développement                  |
| `npm run build`        | Build de production                           |
| `npm run start:all`    | App + worker (utilisé par Docker)             |
| `npm run worker`       | Worker BullMQ seul (crons + ingestion)        |
| `npm run db:seed`      | Seed (2 comptes candidats de démonstration)   |
| `npm run admin:create` | Provisionne l'administrateur depuis `.env`    |
| `npm run ingest:now`   | Ingestion manuelle des offres réelles         |
| `npm run search:sync`  | Ré-indexation complète Postgres → Meilisearch |
| `npm run test`         | Tests Vitest                                  |
| `npm run lint`         | ESLint                                        |

## Tests

50 tests Vitest couvrent les zones critiques :

- **Déduplication** (`src/server/ingest/dedup.test.ts`, `normalize.test.ts`) — normalisation accents/casse/ponctuation, hash stable, mapping des enums, rejets ;
- **Couche HTTP du scraping** (`src/server/ingest/http.test.ts`) — retries, 404 définitif, disjoncteur de rate-limit, bornes du pool de concurrence ;
- **Enrichissement** (`src/server/ingest/enrich.test.ts`) — déduction télétravail / niveau d'études / type de contrat ;
- **Redirection `/go/`** (`src/server/apply/redirect.test.ts`) — 302 vers la source, clic loggé (connecté et anonyme), offre expirée → page dédiée sans clic compté ;
- **Matching d'alertes** (`src/server/alerts/match.test.ts`) — mots-clés multi-termes insensibles aux accents, filtres combinés, salaires.

```bash
npm run test
```

## Marque

Le monogramme Jobly est un « J » dont la hampe est coiffée d'une flèche vers le
haut — la progression de carrière — sur un badge au dégradé indigo → violet.
Il est **interactif** (`src/components/brand/jobly-logo.tsx`) : le badge s'incline
vers le pointeur (parallaxe 3D), la flèche décolle en laissant une trace, les
lettres du wordmark se soulèvent en cascade et le point d'accent respire. Tout
est neutralisé par `prefers-reduced-motion`, et l'inclinaison n'est calculée que
sur pointeur fin (souris). Le même monogramme sert de favicon (`app/icon.svg`),
d'image Open Graph (`app/opengraph-image.tsx`) et d'emblème de la console admin.

## Design system — sobre & épuré

Fond blanc, encre neutre (`#171717`), un seul accent indigo (`#4F46E5`), gris de soutien pour les surfaces (`neutral-50`). Typographie unique (Inter) avec hiérarchie par la graisse, cards arrondies à bordure légère et ombre douce au survol, badges arrondis pour les contrats, boutons pleins/contours arrondis. Mode sombre neutre (`neutral-950` / `neutral-200`) avec bascule dans le header. Contrastes AA, focus visibles, navigation clavier complète, touch targets ≥ 44 px, `prefers-reduced-motion` respecté.

Voir `DECISIONS.md` pour les choix techniques documentés.
