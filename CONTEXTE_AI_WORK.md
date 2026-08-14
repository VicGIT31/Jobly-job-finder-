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

**Sur la refonte visuelle (spec §35-38)** : évaluée, jugée **non nécessaire**
pour l'instant. Le design system actuel (`globals.css`, `tailwind.config.ts`
— fond blanc, encre neutre, accent indigo unique, cartes sobres, espacement
8px, pas de dégradés/glassmorphism/sparkles) correspond déjà à ce que le
cahier des charges demande (« Linear + Notion + Stripe, plus chaleureux »,
§35 « éviter dégradés violets excessifs, glassmorphism, clutter »). Toutes
les features de cette session (tracker, insights, masquer une offre…)
réutilisent ces tokens existants sans rien ajouter. Refaire le design
maintenant irait à l'encontre de l'instruction explicite du spec (§66) :
« Do not spend days perfecting the landing page while the core job-search
loop is broken » — la priorité reste les fonctionnalités manquantes (§3),
pas l'esthétique d'un système déjà cohérent. À revisiter seulement si le
pivot multi-pays change la structure de l'information (ex. sélecteur de
pays/devise dans le header) au point de casser la mise en page actuelle.

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
- UI : `/mon-espace/candidatures` — Kanban
  (`src/components/applications/application-board.tsx`) avec drag-and-drop
  natif HTML5 + `<select>`
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
- **Exclusion des résultats de recherche** :
  `src/server/offers/hidden-filter.ts` (`excludeHiddenOffers`, pure +
  testée), appliqué **après**
  `searchOffers()` dans `/offres/page.tsx` (SSR) et `/api/search/route.ts`
  (fetch client). Volontairement **pas** injecté dans
  `src/server/search/query.ts` : ce moteur (Meilisearch + repli PostgreSQL,
  facettes, géo) est un système partagé et finement réglé — voir
  `DECISIONS.md`. Limite connue documentée en commentaire dans
  `hidden-filter.ts` : filtrer après pagination peut rendre une page avec
  moins de résultats que `PAGE_SIZE`, et `totalHits` n'est pas recalculé.
  Acceptable au volume actuel ; à corriger proprement (filtre au niveau
  Meilisearch/SQL) si le nombre d'offres masquées par utilisateur grandit.

### 2.5 Vue Liste du suivi de candidature — spec §24

Bascule Tableau/Liste sur `/mon-espace/candidatures` (même composant
`application-board.tsx`), avec filtre texte (entreprise/poste) et filtre par
statut. Colonnes limitées à ce que le modèle `Application` contient
réellement (Entreprise, Poste, Statut, Postulé) — le spec liste aussi
Location/Salaire/Resume/Source, non stockés sur `Application` aujourd'hui
(la localisation/salaire vivent sur `JobOffer`, pas dupliqués sur la
candidature). À enrichir si ces colonnes deviennent nécessaires.

### 2.6 Insights (funnel de candidature) — spec §29, sans IA

- `src/server/insights/compute.ts` : `computeInsights`, pure et testée (5
  tests). Funnel **Postulé → Réponse obtenue → Entretien → Offre** calculé
  sur `ApplicationStatusHistory` (« a atteint ce statut au moins une fois »,
  pas le statut courant — une candidature `REJECTED` qui est passée par
  `INTERVIEW` compte toujours dans l'étape Entretien).
- `hasEnoughData` (seuil : 3 candidatures postulées minimum) respecte
  l'instruction du spec « Only display conclusions when there is enough
  data » — en dessous du seuil, la page affiche un état vide plutôt que des
  taux basés sur un échantillon non significatif.
- Page `/mon-espace/insights` : cette semaine (candidatures/entretiens/
  offres), entonnoir en barres, taux de réponse et taux d'entretien.
- Non fait : « Applications by country/role/source », « best-performing
  resume », « median time to response » (spec §29) — demanderait soit plus
  de données structurées (source par candidature déjà disponible via
  `sourceUrl`/offre liée, à agréger), soit le multi-pays (§3.1) pour avoir
  un axe pays pertinent.

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
   feature. **La recherche de sources est faite** : voir
   `SOURCES_EUROPE_ASIA.md` (APIs officielles par pays, agrégateurs
   multi-pays, adaptateurs ATS publics, plan d'implémentation par ordre de
   priorité). Rien de ce document n'est encore intégré ni testé en
   conditions réelles — c'est un plan de recherche, pas du code.
2. **IA réelle** (spec §41) — aucune clé configurée. Si on l'ajoute :
   construire une couche d'abstraction provider (spec §69 : « build the
   abstraction, mock adapter for dev, mark the required env var, never fake
   a success »). Cas d'usage prioritaires : parsing CV à l'upload (le CV est
   stocké mais jamais lu), recherche en langage naturel, résumé d'offre
   structuré (Résumé/Responsabilités/Requis), réponses de candidature.
3. **Ex
