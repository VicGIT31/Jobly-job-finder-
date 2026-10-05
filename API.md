# Configuration locale et services — Jobly

La collecte d’offres n’utilise aucune clé de fournisseur externe. Les
connecteurs JSearch et France Travail OAuth ont été supprimés. Les anciennes
variables `JSEARCH_API_KEY`, `FRANCE_TRAVAIL_CLIENT_ID/SECRET` et `THEMUSE_API_KEY`
ne sont plus lues. Voir [SOURCES.md](SOURCES.md) pour les endpoints publics.

| Configuration                                           | Fonctionnement local                                                          |
| ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| PostgreSQL / `DATABASE_URL`                             | Base locale dans Docker                                                       |
| Redis / `REDIS_URL`                                     | Cache, verrous et planification locale                                        |
| Meilisearch / `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY` | Recherche locale ; la clé protège l’accès, sans abonnement                    |
| MinIO / `S3_*`                                          | Stockage local des CV                                                         |
| `AUTH_SECRET`                                           | Signature locale des sessions                                                 |
| `INGEST_API_KEY`                                        | Protection de l’import interne, sans service externe                          |
| `JOB_SOURCES_FILE`                                      | Catalogue de sources personnel, optionnel                                     |
| `INGEST_SOURCES`                                        | Sources sélectionnées, optionnel                                              |
| `INGESTION_INTERVAL_MINUTES`                            | 120 minutes par défaut                                                        |
| `INGEST_CACHE_DIR`                                      | Cache des réponses publiques                                                  |
| `JOB_ALERTS_DIR`                                        | Dossier local `.eml` pour les alertes reçues, sans connexion à une boîte mail |

Les routes `/api/search`, `/api/cv` et `/internal/ingest` appartiennent à
l’application. Elles servent la recherche, les comptes et les candidatures,
sans coût fournisseur.

Les autres fonctionnalités conservent leurs options existantes : connexion
Google/LinkedIn par OAuth, Anthropic pour un brouillon réellement généré par IA,
Resend pour l’envoi d’emails. Aucune de ces options n’est requise pour la collecte
gratuite. Par défaut, le brouillon est un gabarit local, les emails apparaissent
en console et la connexion par mot de passe fonctionne sans OAuth. Pour un usage
entièrement local, laisser ces clés externes vides et garder
`EMAIL_PROVIDER=console`.

Le géocodage et les favicons existants utilisent des flux gratuits sans clé ;
ils ne fournissent pas les offres. Les services PostgreSQL, Redis, Meilisearch
et MinIO sont auto-hébergés dans le Docker Compose du dépôt.
