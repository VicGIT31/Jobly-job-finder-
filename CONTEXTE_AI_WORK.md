# CONTEXTE_AI_WORK.md — Session IA du 2026-08-14

> Complète `CONTEXTE.md` (à lire en premier pour l'état général du projet).
> Ce document couvre uniquement le travail de cette session : upgrade de
> Jobly vers la vision « AI job platform Europe & Asie » décrite dans
> `europe_asia_ai_job_platform_mvp_prompt.md` (le cahier des charges complet,
> ~69 sections, fourni par l'utilisateur — non exécuté en entier, voir §3).

---

## 1. Ce qui a été décidé au départ (important pour la suite)

Le cahier des charges (`europe_asia_ai_job_platform_mvp_prompt.md`) demande un
**pivot complet** : passer d'un agrégateur français stage/alternance à une
plateforme multi-pays (Europe + Asie), multi-devises, avec IA (parsing CV,
matching sémantique, copilote), extension de navigateur, autofill, etc.

**Décision validée avec l'utilisateur** : ne pas faire un pivot brutal.
Construire des **tranches P0 réelles et complètes** (schéma + logique +
UI + tests, jamais de maquette) au-dessus du produit existant, une par une,
en gardant Jobly fonctionnel à chaque étape. C'est ce qui a été fait.

Aucune clé IA (OpenAI/Anthropic/etc.) n'est configurée dans `.env` : tout ce
qui a été construit est **déterministe, sans appel IA**. Les fonctionnalités
qui nécessitent réellement un LLM (résumé d'offre, réponses de candidature,
recherche en langage naturel) n'ont **pas** été commencées — voir §4.

---

## 2. Fonctionnalités livrées cette session

Toutes testées en local (`docker compose up --build`) avec de vraies offres
scrapées et les comptes démo (`camille@jobly.test` / `theo@jobly.test`,
mdp `jobly123`).

### 2.1 Suivi de candidature (Application Tracker) — spec §23-27, P0

- Modèles `Application` + `ApplicationStatusHistory` (migration
  `20260814085349_application_tracker`).
- `src/server/applications/tracker.ts` : `syncApplicationOnApply` — au clic
  « Postuler » (`/go/:offerId`), crée/upgrade automatiquement l'entrée de
  suivi. Ne régresse jamais un statut déjà avancé (`nextStatusOnApply`, testé).
- `src/server/applications/actions.ts` : ajout manuel, changement de statut,
  notes, suppression — server actions classiques (`"use server"`), pas d'API
  REST (suit le pattern déjà en place dans `server/account/actions.ts`).
- UI : `/mon-espace/candidatures` — Kanban (`src/components/applications/
  application-board.tsx`) avec drag-and-drop natif HTML5 + `<select>`
  accessible en secours, notes auto-sauvegardées, ajout manuel, colonnes
  Refusées/Retirées repliées. **Vue Liste** ajoutée ensuite (toggle
  Tableau/Liste, filtre texte + statut) — spec §24.
- Bouton « Déjà postulé·e ? » sur la page offre
  (`src/components/applications/already-applied-button.tsx`) pour les
  candidatures faites hors du flux `/go`.

### 2.2 Rappels de relance (Follow-up) — spec §28 (sans IA)

- `src/lib/follow-up.ts` : seuils par statut (APPLIED 7j, ASSESSMENT 5j,
  INTERVIEW 3j), calculés sur le **dernier changement de statut**
  (`ApplicationStatusHistory`, pas `updatedAt` qui bouge aussi sur une note).
- Bandeau d'alerte sur le tableau + badge par carte.

### 2.3 Score de correspondance transparent (Match Score) — spec §11, différenciateur clé

- Deux champs candidat ajoutés à `User` : `educationLevel`, `targetSpecialty`
  (nullables, jamais devinés — migration
  `20260814091140_candidate_match_preferences`). Formulaire dans
  `/mon-espace` (« Préférences de correspondance »).
- `src/server/match/score.ts` : `computeMatchScore` — 3 facteurs (formation,
  spécialité, localisation), **chacun compté uniquement si le candidat a
  renseigné la préférence correspondante**. Aucun facteur applicable →
  `null` (pas de faux pourcentage). 12 tests couvrant chaque branche.
- Affiché sur la page offre (`MatchScoreCard`) avec le détail justificatif,
  jamais présenté comme une décision de l'employeur.

### 2.4 Masquer une offre (Hide) — spec §8-9, P0 « save/hide »

- Modèle `HiddenOffer` (même forme que `SavedOffer`) — migration
  `20260814103041_hidden_offers`.
- Route `POST/DELETE /api/offres/:offerId/masquage`, bouton
  `HideOfferButton` sur la page offre, page `/mon-espace/masquees` pour
  réafficher.
- **Exclusion des résultats de recherche** : `src/server/offers/
  hidden-filter.ts` (`excludeHiddenOffers`, pure + testée), appliqué **après**
  `searchOffers()` dans `/offres/page.tsx` (SSR) et `/api/search/route.ts`
  (fetch client). Volontairement **pas** injecté dans
  `src/server/search/query.ts` : ce moteur (Meilisearch + repli PostgreSQL,
  facettes, géo) est un système partagé et finement réglé — voir
  `DECISIONS.md`. Limite connue documentée en commentaire dans
  `hidden-filter.ts` : filtrer après pagination peut rendre une page avec
  moins de résultats que `PAGE_SIZE`, et `totalHits` n'est pas recalculé.
  Acceptable au volume actuel ; à corriger proprement (filtre au niveau
  Meilisearch/SQL) si le nombre d'offres masquées par utilisateur grandit.

---

## 3. Ce qui N'A PAS été fait (le reste du cahier des charges)

Le cahier des charges complet est dans `europe_asia_ai_job_platform_mvp_prompt.md`
(racine du repo). Grandes masses non commencées, par ordre de priorité P0
probable :

1. **Europe + Asie multi-pays** (spec §2, §32-33) — Jobly reste 100 % France
   stage/alternance. C'est le changement le plus lourd : modèle de données
   (pays, devises, autorisation de travail), ingestion multi-sources
   internationales, UI de localisation. **Ne pas commencer sans en discuter
   avec l'utilisateur** — c'est un changement d'identité produit, pas une
   feature.
2. **IA réelle** (spec §41) — aucune clé configurée. Si on l'ajoute :
   construire une couche d'abstraction provider (spec §69 : « build the
   abstraction, mock adapter for dev, mark the required env var, never fake
   a success »). Cas d'usage prioritaires : parsing CV à l'upload (le CV est
   stocké mais jamais lu), recherche en langage naturel, résumé d'offre
   structuré (Résumé/Responsabilités/Requis), réponses de candidature.
3. **Extension navigateur + autofill** (spec §15-17) — gros morceau,
   nécessite un nouveau projet (Manifest V3) hors de ce repo Next.js.
4. **Analyse CV / tailoring** (spec §21-22) — nécessite d'extraire le texte
   du PDF (`pdf-parse` ou équivalent) puis comparaison de mots-clés avec la
   description de poste. Faisable sans IA pour une V1 (comparaison lexicale
   simple, dans l'esprit de `computeMatchScore`).
5. **Priority Score / effort estimate** (spec §61-62) — peut maintenant
   s'appuyer sur `computeMatchScore` (§2.3 ci-dessus) + date de publication +
   éventuellement une estimation de complexité du formulaire externe (pas
   mesurable tant qu'il n'y a pas d'autofill réel).
6. **Insights / analytics candidat** (spec §29) — funnel Saved→Applied→
   Interview→Offer calculable dès maintenant à partir d'`Application` +
   `ApplicationStatusHistory` (déjà en base). Bonne prochaine tranche P0,
   ne nécessite aucune nouvelle donnée.
7. **Compagnies pages enrichies, alertes multi-canal, RGPD export/delete
   dédié** (spec §31, §45-46, §48-49) — l'export/suppression RGPD n'existe
   pas encore en tant que tel (pas de bouton « Télécharger mes données » /
   « Supprimer mon compte » dans `/mon-espace`).

---

## 4. Repères techniques pour reprendre sans se perdre

- **Pas de Node/npm en local sur cette machine.** Toute commande npm/prisma
  passe par un conteneur jetable relié au réseau docker-compose existant :
  ```bash
  docker run --rm \
    --network internship-finders_default \
    -v "$(pwd)":/app -w /app \
    -e DATABASE_URL="postgresql://nextstep:nextstep@postgres:5432/nextstep?schema=public" \
    node:20-alpine \
    sh -c "npx prisma migrate dev --name ma_migration --skip-seed"
  ```
  (nécessite que `docker compose up -d postgres` tourne déjà). Même pattern
  pour `tsc --noEmit`, `npm run lint`, `npm run test`, `npx prettier --write`.
- **Relancer l'app après un changement de code** : `docker compose up -d
  --build app` (rebuild l'image, réapplique les migrations via
  `prisma migrate deploy` au démarrage, réindexe Meilisearch). Le stack
  complet (postgres/redis/meilisearch/minio) n'a pas besoin d'être relancé.
- **Convention de commit du projet** (`CONTEXTE.md` §7) : 1 commit par
  fichier, préfixes `MOD:`/`ADD:`/`RM:`, messages en français. Cette session
  a été committée en ~10 commits groupés par fonctionnalité (demande
  explicite de l'utilisateur), pas 1-par-fichier — voir le log git pour le
  détail exact des commits de cette session.
- **Tests** : 98 tests passent (`npm run test`), tous les nouveaux modules
  purs (`follow-up.ts`, `score.ts`, `tracker.ts` côté logique,
  `hidden-filter.ts`) sont testés unitairement sans dépendance DB, dans
  l'esprit de `src/server/apply/redirect.ts` (déjà présent avant cette
  session).
- **Design** : aucune nouvelle classe Tailwind custom — tout réutilise les
  tokens existants (`card`, `btn-cobalt`, `btn-outline`, `stamp`, `ticket`,
  `input-ink`, couleurs `ink`/`cobalt`/`surface`). Continuer dans cet esprit
  plutôt que d'introduire un nouveau système visuel.
