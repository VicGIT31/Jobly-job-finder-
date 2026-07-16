# DECISIONS.md — Choix techniques documentés

## Backend : route handlers Next.js (pas de NestJS séparé)

Un seul déploiement, types partagés bout en bout avec le front, et l'App Router couvre tous les besoins (API routes, middleware, SSR). Un NestJS séparé n'apporterait ici que de la complexité d'infrastructure sans gain fonctionnel à cette échelle.

## Auth : Auth.js (next-auth v5)

Intégration native App Router + adaptateur Prisma officiel. Credentials (email/password bcrypt) + OAuth Google et LinkedIn. Sessions JWT (pas de table session requise pour credentials, compatible middleware edge).

## Déduplication

Hash SHA-256 de `normalize(titre) | normalize(entreprise) | normalize(ville)` où `normalize` = minuscules, suppression des accents (NFD), suppression de la ponctuation, espaces réduits. Contrainte `UNIQUE` en base sur `dedup_hash` = garantie forte même en cas de concurrence ; le code capture la violation P2002 comme un doublon.

## Sync Meilisearch

Sync à l'écriture (create/update/expire) via un module `search/sync.ts` appelé dans le pipeline d'ingestion et les mutations admin — plus simple et plus fiable qu'un CDC. Un script `search:sync` fait la ré-indexation complète (seed, récupération après incident).

## Recherche géo « à moins de X km »

Les offres portent `lat/lng` (villes françaises géocodées dans le seed). Meilisearch `_geoRadius` sur l'index `job_offers`.

## Emails

Interface `EmailProvider` avec deux implémentations : `ConsoleEmailProvider` (dev — log dans stdout) et `ResendEmailProvider` (prod). Sélection par `EMAIL_PROVIDER`.

## Stockage CV

Interface `FileStorage` (put/getSignedUrl/delete) avec implémentation S3 SDK v3 pointée sur MinIO en dev. Validation côté serveur : PDF uniquement, 5 Mo max (vérification du magic number `%PDF`).

## Rate limiting

Fenêtre glissante Redis (INCR + EXPIRE) sur `/internal/ingest` et `/go/:offerId` pour absorber les abus sans dépendance supplémentaire.

## IDs vs slugs

Slugs uniques pour les URLs publiques SEO (`/offres/[slug]`, `/entreprises/[slug]`), cuid interne pour les relations. `/go/:offerId` utilise l'id (non-SEO, volontairement opaque).
