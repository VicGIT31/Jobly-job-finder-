# Jobly — Job board étudiants & jeunes diplômés

> Agrégateur d'offres de **stage et d'alternance dans la tech en France**, construit avec Next.js 15.5.24, PostgreSQL, Meilisearch et Redis. Design sobre et épuré.
>
> **Particularité du modèle** : le site n'héberge aucune candidature. Les offres sont **collectées directement depuis les pages et flux publics**, sans fournisseur d’offres payant ni clé développeur ; le bouton « Postuler » redirige (302) vers le lien réel de l'annonce via `/go/:offerId`, en enregistrant le clic au passage.

## Démarrage rapide

```bash
cp .env.example .env
docker compose up
```

Le site est disponible sur [http://localhost:3000](http://localhost:3000). Au démarrage, le worker collecte de vraies offres depuis le catalogue public gratuit. Aucune clé de fournisseur d’offres n’est nécessaire. Deux comptes candidats de démonstration sont créés par le seed.

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
npm run dev        # app Next.js + worker automatique (2 h + démarrage)
```

## Collecte gratuite des offres

La collecte vise **les stages et alternances tech en France**. Elle utilise les
pages HTML, microdonnées schema.org, JSON-LD, sitemaps et flux JSON publics des
sites carrières. Les endpoints JSON restent des API au sens technique, mais
**aucun abonnement, clé de développeur ou intermédiaire payant n’est utilisé**.
JSearch et l’ancien connecteur OAuth France Travail ont été supprimés.

Le catalogue [`config/job-sources.json`](config/job-sources.json) référence les
**84 entrées, dont 83 activées et 80 entreprises**, dont Airbus, Thales, Decathlon,
Capgemini, Ubisoft, Sopra Steria, Renault, Sanofi, ALTEN et Wavestone.
APEC, HelloWork, Free-Work, LinkedIn invité et The Muse complètent
la collecte. France Travail utilise le flux anonyme de son site candidat.

**La couverture n’est pas exhaustive.** Une source peut refuser l’automatisation,
changer de format, avoir zéro stage tech actuellement, ou dépasser le budget de
pagination. Indeed est désactivé après un HTTP 403 observé ; WTTJ publie des
sitemaps mais certaines pages d’annonces peuvent aussi refuser l’accès.
Les blocages et résultats partiels sont signalés dans les rapports et le journal
admin. Aucun captcha, authentification ou refus HTTP n’est contourné.

```bash
npm run sources:list                          # catalogue + endpoints dérivés
npm run sources:check                         # accessibilité des endpoints
npm run sources:check -- --collect --sources airbus --limit 10
npm run collect:offers -- --sources airbus,thales,capgemini --limit 20 --pages 2
npm run sources:discover -- https://entreprise.fr/carrieres
npm run sources:expand -- --collect            # inventaire français, sans activation implicite
npm run alerts:import -- data/job-alerts        # véritables alertes email reçues (.eml)
npm run ingest:now                            # collecte + base + index
npm run ingest:file -- reports/collected-offers.json  # import sans recontacter les sources
```

`collect:offers` exporte des **offres réelles normalisées et dédupliquées** dans
`reports/collected-offers.json`, sans PostgreSQL, Redis ni Meilisearch. Il sert à
vérifier les connecteurs avant de remplir le site. `sources:check` sans
`--collect` vérifie seulement un endpoint, pas toute la chaîne de collecte.
`sources:discover` propose des entrées désactivées à vérifier, sans modifier
automatiquement le catalogue. Les rapports et caches ne sont pas versionnés.

Pour ajouter une entreprise, copier une entrée du même ATS, renseigner son URL
carrière réelle puis exécuter `sources:check --include-disabled --collect`.
`JOB_SOURCES_FILE` permet de remplacer le catalogue par un fichier personnel ;
`INGEST_SOURCES` limite le cycle à une sélection d’IDs ou de domaines historiques.
Voir [`SOURCES.md`](SOURCES.md) pour les endpoints et limites, et
[`ANALYSE_COLLECTE.md`](ANALYSE_COLLECTE.md) pour l’audit de l’architecture.
Les résultats publics sont limités aux **stages et alternances** ; les autres
contrats historiques sont conservés en base mais exclus. Voir
[`INTEGRATIONS_GRATUITES.md`](INTEGRATIONS_GRATUITES.md) pour l'extension française
et l'import gratuit d'alertes Indeed et des plateformes bloquées.

### Optimisation et suivi

- Espacement des départs de requêtes **réservé par hôte**, même dans un pool
  concurrent ; deux workers ne partent plus sur le même créneau.
- Retries bornés, respect de `Retry-After`, arrêt immédiat sur HTTP 401/403,
  disjoncteur sur rate-limit ; les offres déjà collectées sont conservées.
- Cache disque des réponses publiques : détails 4 h, sitemaps 1 h. Les recherches
  restent fraîches ; aucune réponse périmée ne sert de secours silencieux.
- Parallélisme limité, déduplication des URLs et sélection des slugs de sitemaps
  avant de télécharger les détails ; budgets de pages et d’offres par source.
- Verrou Redis commun au worker, à l’admin et au script pour éviter les doubles
  cycles ; indexation Meilisearch par lots de 100 offres.
- Un bilan par entreprise dans `ingest_runs`, avec collecte partielle signalée.

`npm run dev`, `npm start` et Docker lancent le site **avec son worker**.
`dev:web` et `start:web` servent au développement du frontend seul.
Le worker tourne toutes les **120 minutes** par défaut
(`INGESTION_INTERVAL_MINUTES`, minimum 5), et une fois au démarrage. Le cache
persiste dans un volume Docker. La purge à 60 jours et l’expiration après
7 jours sans observation conservent leur comportement existant.

La fraîcheur est contrôlée **au démarrage et toutes les 15 minutes**, même
pendant une collecte longue. La date limite `validThrough` des annonces est
conservée et respectée. Une annonce trop ancienne ou un ancien export ne peut
pas redevenir active à chaque import ; un extrait d'alerte ne rafraîchit pas
une fiche complète. Un catalogue employeur intégral permet d'expirer les
annonces disparues dès la fin de sa collecte. Les résultats partiels et les
chutes anormales de volume ne déclenchent pas ce retrait immédiat.

Les sitemaps trop grands sont parcourus par rotation persistante, avec une
part du budget réservée aux nouveautés. `INGEST_SOURCE_TIMEOUT_SECONDS`
borne le temps réseau de chaque source (900 secondes par défaut). Les tâches
Meilisearch sont suivies jusqu'à leur résultat ; un rapprochement horaire
répare l'index et retire ses documents orphelins.

```bash
npm run specialty:backfill -- --dry-run # prévisualisation détaillée, sans écriture
npm run specialty:backfill             # applique et réindexe les changements
npm run offers:audit                   # vérifie le périmètre des fiches actives
npm run offers:audit -- --apply        # corrections réversibles + rapport
npm run offers:refresh                 # expiration et réparation de l'index, sans purge
```

Les migrations doivent être appliquées avant de relancer le worker :
`npx prisma migrate deploy && npx prisma generate`. Voir
[`SCRAPING_AUDIT.md`](SCRAPING_AUDIT.md) pour l'audit et les vérifications.

### Classement par spécialité

Chaque offre est rangée dans une spécialité tech — **IA & Data, Cybersécurité,
Web, DevOps & Cloud, Software Engineering, Réseaux & Systèmes** — déduite du
titre et de la description (`ingest/classify.ts`). Le secteur remonté par les
sources vaut toujours « Tech / Informatique » : sans ce classement, aucun filtre
par métier n'était possible.

Le titre est décisif dès qu'il nomme un métier ; le corps ne sert qu'à
départager. Sous le seuil de confiance, l'offre reste `AUTRE` plutôt que d'être
mal rangée. Les titres IA/AI, les rôles data, SOC/GRC, backend et systèmes
sont reconnus explicitement. Les missions sont isolées de la présentation
de l’entreprise et des avantages pour limiter les faux classements. La
spécialité alimente le filtre de `/offres`, les facettes et les vignettes de la
page d'accueil. Après modification des règles : `npm run specialty:backfill`.

## Stack

| Domaine        | Choix                                                           |
| -------------- | --------------------------------------------------------------- |
| Frontend       | Next.js 15.5.24 (App Router), TypeScript strict, Tailwind CSS        |
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
│   └── ingest/sources/     # Collecteurs directs + catalogue d’entreprises (HTML, sitemaps, ATS publics)
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
4. **Indexation** dans Meilisearch par lots de 100 écritures.
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

| Commande                      | Effet                                               |
| ----------------------------- | --------------------------------------------------- |
| `npm run dev`                 | App Next.js + collecte automatique en développement |
| `npm run build`               | Build de production                                 |
| `npm run start` / `start:all` | App + worker (utilisé par Docker)                   |
| `npm run worker`              | Worker BullMQ seul (crons + ingestion)              |
| `npm run db:seed`             | Seed (2 comptes candidats de démonstration)         |
| `npm run admin:create`        | Provisionne l'administrateur depuis `.env`          |
| `npm run ingest:now`          | Ingestion manuelle des offres réelles               |
| `npm run collect:offers`      | Export réel sans infrastructure                     |
| `npm run sources:check`       | Diagnostic des endpoints publics                    |
| `npm run sources:discover`    | Propositions de sources depuis une page carrière    |
| `npm run search:sync`         | Ré-indexation complète Postgres → Meilisearch       |
| `npm run test`                | Tests Vitest                                        |
| `npm run lint`                | ESLint                                              |

## Tests

Les tests Vitest couvrent les zones critiques, dont les nouveaux collecteurs publics :

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
