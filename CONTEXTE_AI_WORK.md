# CONTEXTE_AI_WORK.md — Session IA du 2026-08-14

> Complète `CONTEXTE.md` (à lire en premier pour l'état général du projet).
> Ce document couvre uniquement le travail de cette session : upgrade de
> Jobly vers la vision « AI job platform Europe & Asie » décrite dans
> `europe_asia_ai_job_platform_mvp_prompt.md` (le cahier des charges complet,
> ~69 sections, fourni par l'utilisateur — non exécuté en entier, voir §3).
>
> **Correctif 2026-08-14 (plus tard dans la session)** : une édition
> précédente de ce fichier avait accidentellement tronqué tout le contenu à
> partir de la fin du §2.7 (§3 et §4 perdus, y compris dans le commit
> poussé sur `origin/main`). Reconstruit ici en entier — voir §2.8 pour ce
> qui a été ajouté depuis, et le commit qui corrige celui-ci.

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
recherche en langage naturel) n'ont **pas** été commencées — voir §3.

**Sur la refonte visuelle (spec §35-38)** : évaluée, jugée **non nécessaire**
en tant que refonte globale. Le design system actuel (`globals.css`,
`tailwind.config.ts` — fond blanc, encre neutre, accent indigo unique, cartes
sobres, espacement 8px, pas de dégradés/glassmorphism/sparkles) correspond
déjà à ce que le cahier des charges demande (« Linear + Notion + Stripe, plus
chaleureux », §35 « éviter dégradés violets excessifs, glassmorphism,
clutter »). Toutes les features de cette session réutilisent ces tokens
existants sans rien ajouter de nouveau visuellement, à une exception près :
§2.8 ajoute un filtre pays et un lien homepage, additifs, dans le système
existant — toujours pas une refonte.

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
  natif HTML5 + `<select>` accessible en secours, notes auto-sauvegardées,
  ajout manuel, colonnes Refusées/Retirées repliées. **Vue Liste** ajoutée
  ensuite (toggle Tableau/Liste, filtre texte + statut) — spec §24.
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
  testée), appliqué **après** `searchOffers()` dans `/offres/page.tsx` (SSR)
  et `/api/search/route.ts` (fetch client). Volontairement **pas** injecté
  dans `src/server/search/query.ts` : ce moteur (Meilisearch + repli
  PostgreSQL, facettes, géo) est un système partagé et finement réglé — voir
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
  `sourceUrl`/offre liée, à agréger), soit d'exploiter le pays des offres
  (maintenant disponible, voir §2.7-2.8) pour un axe pays pertinent.

### 2.7 Premières sources internationales réelles — spec §13, §32-33, §54

**Le changement le plus significatif de cette session.** Jusqu'ici Jobly
n'ingérait que du stage/alternance français. Deux connecteurs internationaux
réels sont maintenant actifs, testés en conditions réelles (premier cycle :
96 + 566 offres créées) :

- **`sources/arbetsformedlingen.ts`** (Suède) — API officielle JobTech
  (`jobsearch.api.jobtechdev.se`), gratuite, sans clé. Filtre tech par
  `occupation_field` officiel de la taxonomie JobTech plutôt que par
  mots-clés.
- **`sources/ats-boards.ts`** — connecteur générique Greenhouse/Lever/Ashby
  (spec §13 : « Support adapters for major ATS ecosystems »). Sept
  entreprises vérifiées au premier cycle (GitLab, Teneo, Lever, Plaid,
  Notion, OpenAI, Ramp), étendu à 11 dans la foulée (§2.8) — couvre des
  dizaines de pays sans code supplémentaire : ajouter un pays = ajouter une
  ligne dans `BOARDS`, pas un nouveau connecteur.

**Changement de périmètre, fait proprement plutôt que silencieusement** :
Jobly rejetait auparavant tout ce qui n'était pas stage/alternance
(`ACCEPTED_CONTRACTS` dans `normalize.ts`), un choix produit délibéré et
documenté (`CONTEXTE.md`). Plutôt que de changer ce défaut global (ce qui
aurait changé le comportement des 7 connecteurs français existants),
`normalizeOffer`/`processIngest` acceptent maintenant un paramètre
`acceptedContracts` optionnel : absent → comportement historique inchangé
(stage/alternance uniquement) ; fourni par un connecteur → périmètre plus
large (`FULL_TIME`, `PART_TIME`, `CONTRACT`, `FREELANCE` ajoutés à l'enum
`ContractType`). Les deux nouveaux connecteurs déclarent leur propre
`acceptedContracts` ; les 7 connecteurs français n'ont pas changé une ligne
de comportement (vérifié à plusieurs reprises : toujours 515 STAGE + 197
ALTERNANCE après activation puis ré-exécution des nouvelles sources).

Autres changements additifs qui accompagnent ceci :

- `JobOffer.countryCode` (ISO 3166-1 alpha-2, `@default("FR")`) — migration
  `20260814105742_international_contract_types_and_country`.
- Drapeau pays sur `OfferCard` quand `countryCode !== "FR"`
  (`COUNTRY_FLAGS` dans `search-params.ts`).
- `html-to-text.ts` extrait de `themuse.ts` (dupliqué sinon dans
  `ats-boards.ts`) — petit refactor de nettoyage au passage.

### 2.8 Filtre pays, plus de sources ATS, auto-correction du pays détecté

Suite directe du §2.7, dans la même session :

- **Filtre « Pays » dans l'UI de recherche** (`facet-panel.tsx` +
  `search-client.tsx` + `search-params.ts` + `query.ts`) : paramètre `pays`
  ajouté au même schéma/pattern que `specialite`/`contrat` (facette
  Meilisearch + repli PostgreSQL `groupBy`), coché/décoché comme les autres
  facettes, retiré via les puces de filtres actifs. `CONTRACT_TYPES` public
  étendu de `["STAGE","ALTERNANCE"]` à `["STAGE","ALTERNANCE","FULL_TIME",
"PART_TIME","CONTRACT","FREELANCE"]` : les offres internationales sont
  maintenant filtrables par type de contrat depuis l'interface, pas
  seulement trouvables par mot-clé.
- **`sources/ats-boards.ts` étendu** de 7 à 11 entreprises : ajout de N26
  (Berlin, fintech) et Wise (Londres, fintech) sur Greenhouse — les deux
  premières entreprises réellement basées en Europe de la liste, pas
  seulement des entreprises US avec des postes remote — plus Linear et
  Railway sur Ashby.
- **Bug trouvé et corrigé en vérifiant en conditions réelles** :
  `guessCountryFromLocation` ne reconnaissait que "Ville, Pays" (dernier
  segment = nom de pays). Or Greenhouse renvoie souvent juste "Berlin" sans
  suffixe pays (observé sur N26/Wise) → tout tombait dans `"XX"` (pays non
  résolu). Ajout de `CITY_TO_ISO`, une table de repli grandes villes tech
  (Berlin, Barcelona, Singapour, Bangalore, Tokyo, Dubaï…) → `XX` est passé
  de 67 à 22 offres sur ~1450 après correction. **Deuxième bug lié, plus
  subtil** : `processIngest` ne mettait à jour `countryCode` que sur les
  offres nouvellement créées, jamais sur les doublons rafraîchis — une
  correction de l'heuristique de détection ne se serait donc jamais
  répercutée sur les offres déjà en base. Ajouté à la branche de mise à jour
  dans `ingest.ts` ; vérifié qu'un second cycle corrige bien rétroactivement
  les offres déjà ingérées (DE : 0 → 23, ES : 0 → 17 après correction, sans
  réingestion complète).
- **Lien homepage additif** : `src/app/page.tsx` affiche désormais, sous les
  statistiques du hero (seulement si `internationalCount > 0`), « N offres à
  l'international » pointant vers `/offres?contrat=FULL_TIME,PART_TIME,
CONTRACT,FREELANCE`. Décision : pas de changement de la promesse
  principale du site (toujours centrée stage/alternance France en premier),
  juste une porte d'entrée honnête vers ce qui existe maintenant en plus.
  Ce n'est **pas** une refonte — un seul bloc conditionnel ajouté, aucune
  section existante modifiée.

Résultat vérifié après ces deux rounds (`SELECT "countryCode", COUNT(*)
FROM job_offers WHERE "sourceSite" = 'ats-boards' GROUP BY 1`) : US 458,
GB 35, IN 29, DE 23, XX 22, ES 17, SG 11, IE 9, JP 8, KR 4, AU 3, FR 3,
CA 3, AE 2 — 16 pays, filtrables en direct depuis `/offres`.

---

## 3. Ce qui N'A PAS été fait (le reste du cahier des charges)

Le cahier des charges complet est dans `europe_asia_ai_job_platform_mvp_prompt.md`
(racine du repo). Grandes masses non commencées, par ordre de priorité P0
probable :

1. **Europe + Asie multi-pays — ingestion démarrée, présentation produit non
   tranchée** (spec §2, §32-33). Techniquement : ingestion réelle active
   (§2.7-2.8, ~660 offres, 16 pays, filtrables). Mais Jobly reste
   identitairement un produit « stage/alternance France » en surface : pas
   de devises/salaires internationaux, pas d'autorisation de travail, copie
   du site et branding inchangés (un seul lien additif ajouté en §2.8).
   L'ingestion technique est additive et sans risque ; **la présentation du
   produit comme plateforme multi-pays reste une décision à valider avec
   l'utilisateur** avant d'aller plus loin (changement de positionnement,
   pas juste de code). `SOURCES_EUROPE_ASIA.md` reste la carte pour la
   suite des sources (EURES, Allemagne officielle, Corée, Adzuna, Reed,
   Jooble…).
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
   s'appuyer sur `computeMatchScore` (§2.3) + date de publication +
   éventuellement une estimation de complexité du formulaire externe (pas
   mesurable tant qu'il n'y a pas d'autofill réel).
6. **Compagnies pages enrichies, alertes multi-canal, RGPD export/delete
   dédié** (spec §31, §45-46, §48-49) — l'export/suppression RGPD n'existe
   pas encore en tant que tel (pas de bouton « Télécharger mes données » /
   « Supprimer mon compte » dans `/mon-espace`).
7. **Salaires/devises/autorisation de travail sur les offres
   internationales** (spec §5-6) — aucun de ces champs n'existe encore sur
   `JobOffer` pour les offres non françaises ; `salaryMin`/`salaryMax` sont
   en euros implicites partout dans l'UI actuelle (`formatSalary` dans
   `offer-card.tsx`), pas encore multi-devises.

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
- **Forcer une ingestion immédiate** (sans attendre le cron 30 min) :
  `docker compose exec -T app npm run ingest:now`, puis
  `docker compose exec -T app npm run search:sync` pour répercuter dans
  Meilisearch immédiatement plutôt que d'attendre la sync automatique.
- **Push vers GitHub** : le remote `origin` est configuré en SSH
  (`git@github.com:...`) mais aucune clé SSH n'est disponible sur cette
  machine — `git push` échoue avec `Permission denied (publickey)`. Utiliser
  le credential helper de `gh` (authentifié) sur une URL HTTPS explicite,
  sans toucher à la config git globale :
  ```bash
  git -c credential.helper='!gh auth git-credential' \
    push https://github.com/VicGIT31/Internship-finders.git main
  ```
  Puis pour resynchroniser la ref de suivi locale (`git push` sur une URL
  explicite ne le fait pas automatiquement) :
  ```bash
  git -c credential.helper='!gh auth git-credential' \
    -c url."https://github.com/".insteadOf="git@github.com:" \
    fetch origin main
  ```
- **Identité des commits** : les commits de cette session sont tous
  attribués à `VicD <183367904+VicGIT31@users.noreply.github.com>` (email
  noreply GitHub lié au compte `VicGIT31`), fixé explicitement via
  `--author`/`GIT_COMMITTER_*` par commit plutôt que via `git config`
  (jamais modifié durablement sur cette machine, à la demande de
  l'utilisateur).
- **Convention de commit du projet** (`CONTEXTE.md` §7) : 1 commit par
  fichier, préfixes `MOD:`/`ADD:`/`RM:`, messages en français. Cette
  session a été committée en commits groupés par fonctionnalité (demande
  explicite de l'utilisateur : « 10 commits » pour le premier lot), pas
  1-par-fichier — voir le log git pour le détail exact.
- **Tests** : 108 tests passent (`npm run test`), tous les nouveaux modules
  purs (`follow-up.ts`, `score.ts`, `tracker.ts` côté logique,
  `hidden-filter.ts`, `insights/compute.ts`) sont testés unitairement sans
  dépendance DB, dans l'esprit de `src/server/apply/redirect.ts` (déjà
  présent avant cette session). Les connecteurs eux-mêmes (`arbetsformedlingen.ts`,
  `ats-boards.ts`) n'ont pas de tests unitaires — vérifiés uniquement en
  conditions réelles (curl direct + cycles d'ingestion complets). À corriger
  si ces connecteurs deviennent critiques : au minimum tester
  `guessCountryFromLocation`/`inferJobTechContractKey` en isolation.
- **Édition de ce fichier** : en cas de gros ajout, préférer relire
  l'intégralité du fichier avant un `Edit` avec un `old_string` long — une
  édition précédente dans cette session a tronqué silencieusement tout le
  contenu après le point d'insertion (voir l'avertissement en tête de
  fichier). `Write` (réécriture complète) est plus sûr pour les révisions
  substantielles de ce document.
- **Design** : aucune nouvelle classe Tailwind custom cette session — tout
  réutilise les tokens existants (`card`, `btn-cobalt`, `btn-outline`,
  `stamp`, `ticket`, `input-ink`, couleurs `ink`/`cobalt`/`surface`).
  Continuer dans cet esprit plutôt que d'introduire un nouveau système
  visuel.
