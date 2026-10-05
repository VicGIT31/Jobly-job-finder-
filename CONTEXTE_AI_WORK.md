> **Mise à jour 2026-10-05 :** ce document est un historique. Les connecteurs JSearch et France Travail OAuth ont été supprimés. Le cycle courant collecte gratuitement en France, sans clé fournisseur ; voir [SOURCES.md](SOURCES.md) et [ANALYSE_COLLECTE.md](ANALYSE_COLLECTE.md).

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

### 2.9 Analyse CV par mots-clés — spec §21 « Resume Analysis », sans IA

- `pdf-parse` ajouté comme dépendance pour extraire le texte des CV PDF déjà
  stockés (`cvKey`, jamais lus jusqu'ici). Nouveau champ `User.cvText`
  (migration `20260814112833_cv_text_extraction`), rempli à l'upload
  (`uploadCv` dans `server/account/actions.ts`), vidé à la suppression.
- **Bug de build trouvé et corrigé** : `pdf-parse` exécute un auto-test au
  chargement du module quand `module.parent` est absent
  (`if (!module.parent) { lit ./test/data/05-versions-space.pdf }`) — vrai
  sous le bundling webpack de Next.js, ce qui faisait planter
  `docker compose build` avec une erreur `ENOENT` sur un fichier de test
  absent de l'image. Contourné en important directement `pdf-parse/lib/pdf-parse.js`
  (l'implémentation interne, sans le garde-fou) plutôt que le point d'entrée
  public — déclaration de types ad hoc dans `src/types/pdf-parse.d.ts`
  puisque `@types/pdf-parse` ne couvre que le point d'entrée public.
- `src/server/cv/skills.ts` : vocabulaire contrôlé (~90 termes techniques)
  plutôt qu'extraction naïve de mots — cohérent avec l'exemple du spec
  (« Found: Product strategy, Figma, User research… », pas n'importe quel
  nom commun de la description).
- `src/server/cv/analyze.ts` : `computeCvMatch`, pure, testée (5 tests).
  **Bug trouvé par les tests avant tout déploiement** : une comparaison
  `.includes()` naïve faisait matcher le mot-clé "go" à l'intérieur de
  "rigoureuse" et "ui" dans des mots quelconques — corrigé avec une
  correspondance sur limite de mot (lookaround plutôt que `\b`, pour rester
  correct sur des mots-clés comme `c++`, `c#`, `.net` qui commencent/finissent
  par un caractère non alphanumérique).
- `null` si l'offre ne mentionne aucun mot-clé du vocabulaire contrôlé —
  jamais de score creux. `CvMatchCard` (page offre) n'affiche jamais de
  suggestion d'ajouter une compétence non détectée dans le CV (spec §21 :
  « NEVER invent experience »).
- **Vérifié en conditions réelles**, pas seulement en test unitaire : PDF
  généré via `cupsfilter` (texte → PDF), extraction confirmée dans le
  conteneur applicatif avec le vrai `pdf-parse` corrigé, `cvText` simulé en
  base sur le compte démo, carte de correspondance confirmée affichée sur
  une vraie page offre.

### 2.10 Export et suppression de compte (RGPD) — spec §45-46, §48-49

- `GET /api/mon-espace/export` : export JSON téléchargeable de tout ce que
  le candidat possède (profil, candidatures + historique de statut, offres
  sauvegardées/masquées, recherches sauvegardées, clics de candidature).
  N'inclut pas les offres elles-mêmes (donnée publique, pas personnelle),
  seulement le lien du candidat à ces offres. Vérifié en conditions réelles.
- `deleteAccount` (server action) : suppression immédiate et définitive,
  pas de période de grâce. Le CV (S3/MinIO) est supprimé explicitement
  avant la suppression du compte car il n'est pas couvert par les cascades
  Prisma ; tout le reste (candidatures, historique, offres sauvegardées/
  masquées, recherches, sessions) l'est via `onDelete: Cascade`. Les clics
  de candidature (`ApplyClick`) sont anonymisés (`onDelete: SetNull`)
  plutôt que supprimés, pour ne pas fausser les statistiques d'ingestion
  déjà agrégées.
- Page `/mon-espace/confidentialite`, bouton de suppression avec
  confirmation explicite (`window.confirm`), pas de case pré-cochée nulle
  part dans ce flux.

### 2.11 Passe de redesign UX/UI + recentrage éditorial Europe/France

Demande explicite et répétée de l'utilisateur (`/goal` : « redesign it to
make it look way better for the ux/ui », « focus on europe and france »).
**Correction du §1 ci-dessus** : cette session avait d'abord jugé qu'aucune
refonte n'était nécessaire — toujours vrai pour une refonte _complète_, mais
une vraie passe d'amélioration visuelle a été faite ici, dans les tokens
existants (pas de nouveau système de design, pas de nouvelle palette) :

- **`lucide-react` ajouté** (recommandé par le spec §53, absent jusqu'ici).
  Icônes ajoutées : nav `/mon-espace` (§ci-dessous), `OfferCard` (ville,
  télétravail, salaire, date), hero d'accueil (offres/entreprises/villes),
  `MatchScoreCard`/`CvMatchCard` (icônes de titre + barres de progression
  par facteur, remplaçant le texte seul).
- **Nav `/mon-espace` refaite** (`mon-espace-nav.tsx`, composant client
  pour `usePathname()`) : 8 liens texte plats sans indicateur de page
  active → icônes + libellés + état actif visible (`aria-current="page"`).
  Absence d'indicateur actif = vrai trou UX corrigé, pas juste cosmétique.
- **`OfferCard` retravaillée** : bouton "Postuler" devient un vrai bouton
  (pastille `cobalt-soft` → pleine couleur au survol de la carte) au lieu
  d'un lien texte ; icônes de métadonnées ; légère élévation au survol
  (`-translate-y-0.5`).
- **Accueil retravaillé** : halo `cobalt/10` discret derrière le hero
  (pas un dégradé plein écran — reste dans l'esprit "restrained gradients"
  du spec §35) ; stats du hero avec icônes ; nouvelle section **« Explorez
  l'Europe »** (`EUROPEAN_COUNTRIES` dans `search-params.ts`, 17 pays,
  affichés seulement si des offres existent) remplaçant le simple lien
  "offres à l'international" — France toujours en premier, lien vers
  `/offres?contrat=STAGE,ALTERNANCE` (seul moyen propre d'isoler les
  offres françaises, "FR" n'étant volontairement pas une option du filtre
  pays public). Répond directement à « focus on europe and france » sans
  toucher au positionnement stage/alternance de la promesse principale.
- **Bug trouvé en vérifiant en conditions réelles** (pas en test unitaire,
  ni en `tsc`) : le premier `Edit` en `replace_all` sur les en-têtes de
  `MatchScoreCard`/`CvMatchCard` n'a touché que 2 branches sur 3 — la
  troisième avait une indentation différente (retour au niveau racine du
  composant vs. imbriquée dans un `if`), donc une chaîne non identique que
  `replace_all` n'a pas matchée. Résultat avant correction : l'icône et la
  barre de progression n'apparaissaient jamais sur le cas réellement
  utile (un score calculé), seulement sur les états vides. Détecté en
  inspectant le HTML réellement servi après rebuild, pas en supposant que
  l'édition avait fonctionné partout — même leçon que les troncatures de
  ce fichier (§4) : vérifier, ne jamais supposer.
- **Non fait** : refonte visuelle complète (nouvelle palette, nouvelle
  typographie, nouveau layout) — toujours jugée disproportionnée par
  rapport à la maturité du design system existant, cohérent avec §66 du
  spec. Cette passe est une amélioration réelle et vérifiée, pas un
  changement d'identité visuelle.

---

### 2.12 Brouillon de réponse de candidature par IA — spec §19, §41, §56, §69

Première fonctionnalité IA réelle du produit, construite exactement selon
le motif imposé par le spec §69 (« build the abstraction, mock adapter for
dev, mark the required env var, never fake a success ») et repris du motif
`SourceConnector` déjà utilisé pour les connecteurs de sources d'offres :

- **`src/server/ai/provider.ts`** — interface `AiProvider` (`isEnabled()`,
  `isRealAi: boolean`, `generateApplicationAnswer()`) + `AiProviderError`.
  `isRealAi` existe précisément pour que l'UI ne puisse jamais étiqueter un
  gabarit comme « généré par IA » (spec §56, piège explicitement interdit).
- **`src/server/ai/mock-provider.ts`** — `MockProvider`, `isRealAi = false`,
  `isEnabled()` toujours vrai (repli garanti). Gabarit déterministe,
  n'utilise que les champs de profil explicitement fournis (headline,
  école, ville, spécialité) — jamais d'expérience ou de projet inventé.
  Termine toujours par `[Brouillon à personnaliser…]`. Couvert par
  `mock-provider.test.ts` (non-fabrication, adaptation du ton, avertissement
  de brouillon).
- **`src/server/ai/anthropic-provider.ts`** — `AnthropicProvider`,
  `isRealAi = true`. Appel `fetch` direct à l'API Messages d'Anthropic
  (pas de SDK — dépendance disproportionnée pour un seul appel), modèle
  `claude-haiku-4-5` (brouillon court et cadré, coût maîtrisé pour une
  fonctionnalité gratuite). Prompt système : interdiction absolue d'inventer
  expérience/compétence/diplôme non fournis. `isEnabled()` teste
  `ANTHROPIC_API_KEY`. Un appel réel qui échoue lève `AiProviderError` — pas
  de repli silencieux vers le mock quand le provider réel est actif
  (§69 : « do not pretend the external call succeeded »).
- **`src/server/ai/index.ts`** — `getAiProvider()`, sélecteur identique au
  motif des connecteurs de sources. Couvert par `index.test.ts` (repli sur
  `MockProvider` sans clé, sélection d'`AnthropicProvider` avec clé).
- **`src/server/ai/actions.ts`** — server action `generateApplicationAnswer`,
  motif `requireUserId` déjà utilisé dans `account/actions.ts`. Récupère le
  profil (`name`, `headline`, `school`, `city`, `targetSpecialty` → libellé
  via `SPECIALTY_LABELS`) et l'offre (`title`, `description` tronquée à 600
  caractères, `company.name`) depuis Prisma, appelle le provider sélectionné,
  retourne `{ ok, text, isRealAi, providerName }`.
- **`src/components/offers/ai-draft-panel.tsx`** — composant client
  (`useMutation`, motif identique à `HideOfferButton`), question + sélecteur
  de ton (concis/professionnel/enthousiaste/technique/naturel) + bouton +
  zone de résultat en lecture seule. Le libellé du résultat change
  explicitement selon `isRealAi` (« Brouillon généré par IA » vs « Brouillon
  gabarit (sans IA) »).
- **Intégration** : `src/app/offres/[slug]/page.tsx`, dans l'`<aside>`,
  juste après `CvMatchCard` — même emplacement/convention que
  `MatchScoreCard`/`CvMatchCard` (gate `isLoggedIn`, styles `card p-5`).
- **`ANTHROPIC_API_KEY`** ajoutée à `.env.example` (optionnelle, documentée).
  Aucune clé n'est configurée dans cet environnement : `getAiProvider()`
  retombe donc sur `MockProvider` en pratique ici — vérifié en lisant
  `process.env.ANTHROPIC_API_KEY` dans le conteneur `app` après rebuild
  (vide).
- **Vérifié** : `tsc --noEmit`, ESLint, Prettier, suite de tests complète
  (119 tests, dont les 6 nouveaux), `docker compose build app` réel (pas
  seulement `next dev`), page `/offres/[slug]` réellement servie après
  rebuild avec le panneau rendu à l'emplacement attendu (état déconnecté
  confirmé par `curl` sur une offre réelle). **Limite assumée** : le
  round-trip complet de la server action en tant qu'utilisateur connecté
  (auth + Prisma + génération) n'a pas été exercé via une vraie requête
  HTTP — reconstruire l'ID de server action Next.js à la main depuis le
  manifest buildé s'est révélé disproportionné pour cette vérification ;
  la couverture repose à la place sur la lecture de code (le motif
  `requireUserId`/Prisma est copié exact d'`account/actions.ts`, déjà en
  production) + les tests unitaires du provider + le build réel qui inclut
  la route.

---

### 2.13 Facette « Pays » en pastilles + copie Europe sur `/offres`

Suite directe du `/goal` actif (« focus on europe and france, redesign it
to make it look way better for the ux/ui »). Investigation préalable (fork
de recherche) : les drapeaux pays étaient déjà affichés sur `OfferCard` et
dans les libellés de la facette « Pays » (§2.8) — pas un trou fonctionnel.
Deux écarts réels trouvés et corrigés :

- **`src/components/offers/facet-panel.tsx`** — la facette « Pays » utilisait
  `FacetGroup` (liste de cases à cocher empilées), seule facette du haut du
  panneau dans ce style alors que « Spécialité » et « Grandes villes »
  utilisent des pastilles (`ticket`) avec drapeau + libellé + compteur.
  Remplacée par le même motif pastille, cohérent visuellement et avec le
  reste du panneau. Aucune nouvelle classe Tailwind.
- **`src/app/offres/page.tsx`** — le sous-titre et la meta `description` de
  la page de recherche (la principale surface de navigation du site) ne
  mentionnaient jamais le périmètre Europe malgré le filtre pays existant.
  Ajout d'une phrase courte (« Stage et alternance en France, plus des
  offres tech en Europe ») sans changer le titre H1 ni le positionnement
  principal.
- **`src/components/offers/search-client.tsx`** — icône `SearchX` ajoutée à
  l'état vide (`EmptyState`), qui n'avait aucune icône contrairement au
  reste des cartes/panneaux redessinés en §2.11.
- **Vérifié en conditions réelles** : `tsc --noEmit`, ESLint, Prettier,
  suite de tests complète (119 tests, inchangés — aucun test ne couvre le
  rendu de `FacetPanel`), `docker compose build app` réel, page `/offres`
  servie après rebuild avec la nouvelle copie et les pastilles pays
  affichant les vrais compteurs (🇺🇸 458, 🇬🇧 35, 🇩🇪 24, 🇪🇸 17…) confirmés
  par `curl`.

---

### 2.14 Drapeau pays sur la page de détail d'offre (cohérence avec `OfferCard`)

`OfferCard` affiche déjà un drapeau à côté de la ville pour toute offre hors
France (§2.8), mais la page de détail `/offres/[slug]` ne le faisait pas
alors qu'elle affiche la même info (ville, dans un `<span className="ticket">`).
Un·e utilisateur·rice cliquant depuis une carte avec drapeau atterrissait sur
une page de détail qui « perdait » l'indication pays. Corrigé en réutilisant
exactement le même motif (`COUNTRY_FLAGS[offer.countryCode] ?? "🌍"`, masqué
pour `FR`) dans `src/app/offres/[slug]/page.tsx`.

Vérification préalable (fork) : les pages entreprise (`entreprises/[slug]`,
`entreprises`) affichent leurs offres via `OfferCard`, donc pas de trou là.
`Company` n'a pas de champ pays (seulement `sector`/`size`/`website`) —
« pays d'implantation de l'entreprise » resterait une fonctionnalité dérivée
à part entière, pas une correction de cohérence, donc non traité ici.

Vérifié en conditions réelles : `tsc --noEmit`, ESLint, Prettier, suite de
tests complète (119 tests), `docker compose build app` réel, deux pages
d'offre réelles servies après rebuild — une offre Berlin (N26) affiche 🇩🇪,
une offre française n'affiche aucun drapeau (non-régression), confirmées
par `curl`.

---

### 2.15 Filtres repliables sur mobile — vrai trou UX, pas cosmétique

En vérifiant le comportement responsive de `search-client.tsx` (le layout
`grid lg:grid-cols-[260px_1fr]` ne collabore qu'à partir de `lg`), trouvé
que `FacetPanel` — désormais jusqu'à 9 groupes de filtres après §2.13 —
s'affichait intégralement empilé au-dessus des résultats sur mobile, sans
repli possible. Sur téléphone, il fallait faire défiler tout le panneau de
filtres avant d'atteindre la moindre offre à chaque visite de `/offres` —
probablement la majorité du trafic d'un site pour étudiants.

Corrigé avec un bouton bascule visible uniquement sous `lg` (`lg:hidden`),
icône `SlidersHorizontal` (déjà dans `lucide-react`, aucune nouvelle
dépendance), badge du nombre de filtres actifs, `aria-expanded`/
`aria-controls` corrects. Le panneau reste toujours visible sur desktop
(`hidden lg:block`, replié par défaut uniquement sous `lg`) : aucun
changement de comportement desktop.

Vérifié en conditions réelles : `tsc --noEmit`, ESLint, Prettier, suite de
tests complète (119 tests), `docker compose build app` réel, page `/offres`
servie après rebuild avec `aria-expanded="false"` et le panneau
effectivement `hidden lg:block` dans le HTML, confirmés par `curl`.

---

### 2.16 Pays de recrutement sur la page entreprise (dérivé, pas de champ ajouté)

Suite du point relevé par le fork en §2.13 (« Company n'a pas de champ
pays… fonctionnalité dérivée à part entière, à traiter séparément »).
`entreprises/[slug]/page.tsx` chargeait déjà toutes les offres actives de
l'entreprise (`getCompany`) — aucun changement de schéma ni de requête
nécessaire : les pays sont dérivés côté page (`new Set(offers.map(o =>
o.countryCode))`, France épinglée en premier si présente).

Affiché seulement si l'entreprise a des offres dans **plus d'un** pays
(`countries.length > 1`) — délibéré : ne pas ajouter de ligne à chaque
entreprise purement française (la majorité), seulement là où l'info a une
vraie valeur (ex. GitLab : 8 pays). Mêmes pastilles `ticket` + drapeaux que
partout ailleurs, aucune nouvelle classe.

Vérifié en conditions réelles : `tsc --noEmit`, ESLint, Prettier, suite de
tests complète (119 tests), `docker compose build app` réel, deux pages
entreprise réelles servies après rebuild — GitLab affiche ses 8 pays
(Émirats, Canada, Royaume-Uni, Inde, Japon, Singapour, États-Unis, "Autre /
non précisé"), une entreprise mono-pays n'affiche aucune ligne « Recrute en »
(non-régression), confirmées par `curl`.

---

### 2.17 Header/nav principale : état actif + menu mobile (vrai bug de débordement)

Fork d'audit sur le chrome persistant (header/footer, jamais touché
jusqu'ici) : `site-header.tsx` n'avait ni indicateur de page active (même
trou que `mon-espace-nav.tsx` avant sa refonte), ni menu mobile — la `nav`
était un simple `flex` sans `flex-wrap` ni repli, donc les liens
débordaient sur petit écran plutôt que de s'empiler. Pas juste cosmétique :
un vrai bug de layout sur mobile.

Extrait dans **`src/components/site-nav.tsx`** (nouveau composant client,
même motif que `mon-espace-nav.tsx` — `usePathname()` pour l'état actif,
`SiteHeader` reste un Server Component pour `auth()`) :

- Nav desktop inchangée visuellement (`hidden sm:flex`), avec
  `aria-current="page"` + fond `bg-cobalt` sur le lien actif.
- Bouton hamburger (`Menu`/`X` de `lucide-react`) visible uniquement sous
  `sm`, ouvre un panneau `absolute` avec les mêmes liens empilés + bascule
  de thème + bouton connexion/mon espace, fermeture au clic sur un lien.
- `ThemeToggle` déplacé de `SiteHeader` vers `SiteNav` (déjà un composant
  client) pour qu'il apparaisse dans les deux versions (desktop et menu
  mobile) sans dupliquer la logique.

Vérifié en conditions réelles : `tsc --noEmit`, ESLint, Prettier, suite de
tests complète (119 tests), `docker compose build app` réel, page réelle
servie après rebuild avec `aria-current="page"` sur le lien actif et le
bouton mobile (`aria-controls="menu-mobile"`, `aria-expanded="false"`)
confirmés par `curl`.

### 2.18 Score de correspondance sur les cartes d'offre (spec §11, §61-62)

Jusqu'ici le score de correspondance (`computeMatchScore`, §2.3) n'était
visible que sur la page de détail d'une offre — il fallait ouvrir chaque
offre une par une pour savoir si elle correspondait au profil. Réutilise
directement l'infrastructure existante, aucune nouvelle donnée nécessaire :

- **`src/server/match/score.ts`** — `scoreTier()` extrait de
  `match-score-card.tsx` (dupliqué) vers ce module, exporté et réutilisé par
  les deux composants qui l'affichent désormais.
- **`src/components/offers/offer-card.tsx`** — prop optionnelle
  `candidateProfile`; si fournie, calcule `computeMatchScore` avec les
  champs déjà présents sur `OfferDocument` (`educationLevel`, `specialty`,
  `city`, `remotePolicy`) et affiche un badge compact (`48% match`, couleur
  du palier) sous le badge de contrat. Rien n'est affiché sans profil.
- **`src/app/offres/page.tsx`** → **`search-client.tsx`** : le profil
  candidat est désormais chargé côté serveur (même motif que la page de
  détail) et transmis à chaque carte de résultat.
- **`src/app/offres/[slug]/page.tsx`** : le `candidateProfile` déjà chargé
  pour cette page est aussi transmis aux cartes de la section « Offres
  similaires » (auparavant sans score).

### 2.19 Bug critique corrigé : page offre en erreur 500 pour tout utilisateur connecté

**Trouvé en vérifiant §2.18 en conditions réelles, connecté** (login via le
flux credentials NextAuth réel — `camille@jobly.test`, cookie de session
signé réel, pas un raccourci) : `/offres/[slug]` renvoyait une erreur 500
pour **tout** utilisateur connecté, depuis l'introduction de `AiDraftPanel`
en §2.12 — jamais détecté avant car §2.12 n'avait été vérifié que côté
déconnecté.

Cause : `src/server/ai/actions.ts` (fichier `"use server"`) exportait aussi
`AI_TONES` et `AI_TONE_LABELS`, deux constantes. Un fichier `"use server"`
ne peut exporter que des fonctions async (Server Actions) — exporter une
constante casse au runtime dès qu'un composant client la consomme
réellement (`AI_TONES.map(...)` dans `AiDraftPanel` reçoit une référence
d'action sérialisée, pas le tableau, d'où `TypeError: u.map is not a
function`). Isolé par élimination : reproduction de `computeMatchScore` et
`computeCvMatch` en script Node isolé (aucune erreur), test avec/sans
authentification sur la même offre (200 déconnecté, 500 connecté) — pointait
vers le seul composant authentifié-only nouveau, `AiDraftPanel`.

Corrigé en déplaçant les deux constantes vers un nouveau module
**`src/server/ai/tones.ts`** (pas de directive `"use server"`), importé par
`ai-draft-panel.tsx` ; `actions.ts` n'exporte plus que la Server Action.

Vérifié en conditions réelles avec une vraie session authentifiée (login
credentials réel, pas de raccourci de base de données) : `/offres/[slug]`
`200` avec badge de match (`48% match`), panneau IA complet
(`Brouillon de réponse`, sélecteur de ton), `/offres` `200`, `/mon-espace`
`200`. Non-régression déconnectée confirmée (`200`, même offre, sans clé
ANTHROPIC_API_KEY donc `MockProvider`). `tsc --noEmit`, ESLint, Prettier,
suite de tests complète (119 tests), `docker compose build app` réel.

**Commité en un seul commit substantiel** (nav §2.17 + score sur cartes
§2.18 + correctif critique §2.19), conformément à la consigne utilisateur
sur le regroupement des commits (voir mémoire `feedback_commit_granularity`).

### 2.20 Bug SSR trouvé en marge de §2.19 : `/offres` affichait toujours le squelette de chargement

En creusant l'erreur 500 de §2.19 avec `curl` (sans JavaScript, donc HTML
strictement tel que servi par le serveur), remarqué que `/offres` — page
que le code commente explicitement « la première page est rendue côté
serveur (SEO + partage d'URL) » — affichait en réalité **toujours** le
squelette de chargement (`ResultsSkeleton`, `role="status"`) au premier
rendu, jamais les vraies offres, y compris pour un crawler ou tout client
sans JS. Sans lien avec §2.19 (aucune erreur, juste un rendu incorrect),
mais un vrai défaut SEO/UX passé inaperçu jusqu'ici car toutes les
vérifications précédentes de cette session sur `/offres` inspectaient soit
le panneau de filtres (`FacetPanel`, rendu directement depuis
`initialResult.facets`, jamais concerné), soit une autre page.

Cause : `useQuery` (TanStack Query) sans `initialData` — au tout premier
rendu, `isFetching` est vrai et `data` est `undefined` avant toute
requête, donc `showSkeleton = isFetching && !isPlaceholderData && !data`
est vrai même si `initialResult` (déjà chargé côté serveur) est
disponible.

Corrigé avec `initialData` scopé à la requête initiale exacte via un
`useRef` capturant `queryString` au montage : `initialData: queryString
=== initialQueryStringRef.current ? initialResult : undefined`. N'affecte
que le tout premier rendu — un changement de filtre produit un nouveau
`queryString` qui ne correspond plus à la ref, donc le comportement de
chargement pour les recherches suivantes est inchangé.

Vérifié en conditions réelles avec `curl` (sans JavaScript, donc test
strict du rendu serveur) : `/offres` sans filtre → 12 vraies cartes, aucun
squelette ; `/offres?pays=DE` → idem ; `/offres?page=2` → idem ; recherche
sans résultat → état vide correct, toujours sans squelette. `tsc --noEmit`,
ESLint, Prettier, suite de tests complète (119 tests), `docker compose
build app` réel.

**Non commité à ce stade** — regroupé pour un prochain commit substantiel
(voir mémoire `feedback_commit_granularity`).

### 2.21 Drapeau France sur l'accueil + logos manquants (demande utilisateur directe)

Trois demandes de l'utilisateur dans le même message : un bug visuel précis
(« the french logo is the european one »), deux clés API absentes, et une
étude des APIs de scraping d'offres/logos.

- **Bug drapeau (trouvé exact, corrigé)** : `src/app/page.tsx`, section
  « Explorez l'Europe ». `COUNTRY_FLAGS` exclut volontairement `FR` (choix
  délibéré ailleurs : pas de drapeau redondant sur chaque offre française,
  voir §2.8). Mais ici, sur la carte qui représente explicitement le pays
  « France » parmi d'autres, `COUNTRY_FLAGS["FR"] ?? "🇪🇺"` retombait donc
  sur le drapeau européen au lieu du drapeau français. Corrigé par un cas
  spécial `FR` avant le repli. Vérifié en direct (`curl`) : la carte France
  affiche maintenant 🇫🇷.
- **Clés « job offers » manquantes** : `FRANCE_TRAVAIL_CLIENT_ID/SECRET` et
  `JSEARCH_API_KEY` sont vides dans `.env` (confirmé par les logs
  d'ingestion : « désactivée, identifiants absents » pour les deux). Sans
  clé, Jobly tourne uniquement sur les sources sans authentification
  (Free-Work, APEC, LinkedIn invité, HelloWork, Arbetsförmedlingen, boards
  ATS, The Muse — d'où les ~1500 offres déjà en base). Ces deux clés
  restent la plus grosse source de volume manquante, notamment pour la
  France (France Travail est la source officielle exhaustive) — impossible
  à créer moi-même, ce sont des inscriptions développeur côté utilisateur
  (francetravail.io, openwebninja.com), déjà documentées dans
  `.env.example`.
- **Clé « company logo » manquante — recherche effectuée avant tout code**
  (fork avec WebSearch, pas de supposition) : **Clearbit Logo API, l'option
  gratuite historique sans clé, a fermé le 8 décembre 2025** après le
  rachat par HubSpot — bien que ce soit ce que j'aurais supposé sans
  vérifier. Alternatives actuelles avec clé gratuite : Logo.dev (500k
  req/mois, attribution obligatoire) et Brandfetch (500k req/mois, sans
  attribution — meilleure option gratuite). Sans clé utilisateur, mis en
  œuvre un repli immédiat gratuit et sans clé (favicon Google) pour les 10
  entreprises du connecteur ATS boards dont le domaine réel est connu et
  vérifié à la main (`src/server/ingest/sources/ats-boards.ts`) — ces
  offres n'avaient jamais de logo car ni Greenhouse, ni Lever, ni Ashby
  n'en fournissent (contrairement à France Travail, JSearch, LinkedIn, The
  Muse, Arbetsförmedlingen, Free-Work qui le font déjà). `teneo`
  volontairement exclu de la liste : plusieurs entreprises distinctes
  partagent ce nom, domaine ambigu — un mauvais domaine afficherait le
  logo d'une autre entreprise, pire que le monogramme neutre actuel.
  Étude complète (tableau comparatif, sources) : **`SOURCES_EUROPE_ASIA.md`
  §7 (nouveau)**.
- **Étude des APIs de scraping d'offres** : `SOURCES_EUROPE_ASIA.md`
  existait déjà et couvre substantiellement cette demande (Tier 3 = APIs
  publiques par ATS/entreprise, exactement « scraping sur le site de
  l'entreprise »). Pointé vers ce document plutôt que dupliqué la
  recherche ; complété avec la partie logos manquante (§7 ci-dessus).
- Vérifié en conditions réelles : `tsc --noEmit`, ESLint, Prettier, suite
  de tests complète (119 tests), `docker compose build app` réel,
  `npm run ingest:now` (cycle réel, pas de nouvelle offre — les 624 offres
  ATS déjà connues), backfill confirmé en base pour 7 entreprises
  (GitLab, N26, OpenAI, Notion, Ramp, Linear, Railway — Wise/Plaid/Lever
  n'ont actuellement aucune offre tech active sur leur board, rien à
  backfiller), URL de favicon vérifiée directement (`200 OK`,
  `image/png`) et rendu confirmé sur `/entreprises/gitlab`.

---

### 2.22 Bug stage/alternance corrigé (data + code), filtres catégorie entreprise, tri « Pertinence » réparé

Trois demandes directes de l'utilisateur (`/goal`) : filtres Fintech/Big
Tech/Deep Tech avec regroupement d'entreprises, correction du bug « je
filtre sur Stage, des alternances ressortent », amélioration du tri.

- **Bug stage/alternance — cause exacte trouvée, pas supposée** : 252 offres
  (in fine 290 avec la description en plus du titre) titrées « Alternance…
  » étaient stockées avec `contractType = STAGE`, toutes issues de
  HelloWork. `sources/hellowork.ts` consultait le champ structuré
  schema.org `employmentType` **avant** le texte du titre/description — or
  HelloWork expose « INTERN » aussi bien pour les stages que les
  alternances (schema.org n'a pas de valeur dédiée « apprentissage »),
  alors que le titre le dit explicitement dans l'immense majorité des
  annonces. Corrigé à trois niveaux : (1) priorité inversée dans le
  connecteur (texte d'abord) ; (2) `ingest.ts` reclasse désormais aussi
  `contractType` sur les doublons rafraîchis (même motif déjà en place
  pour `specialty`/`countryCode`, §2.7) — sans ça, la correction du
  connecteur n'aurait profité qu'aux nouvelles offres ; (3)
  `scripts/contract-backfill.ts` (`npm run contract:backfill`), corrige les
  offres déjà en base, exécuté réellement : **290 offres corrigées sur 460
  vérifiées**. Vérifié en conditions réelles : `select count(*) … where
contractType='STAGE' and title ilike '%alternance%'` → 0 (était 252),
  `curl /api/search?contrat=STAGE` → aucun titre « Alternance » dans les
  résultats.
- **Tri « Pertinence » réparé** : sans mot-clé de recherche (le cas le plus
  courant — cliquer un filtre sans rien taper), `sort` valait `undefined`
  en mode pertinence, donc aucun rang de tri ne départageait les ex æquo :
  ordre non déterministe, dépendant de l'ID interne Meilisearch. Corrigé en
  retombant sur `publishedAtTs:desc` dès qu'il n'y a pas de texte à
  comparer (`rankingRules` place `sort` après les règles de pertinence
  textuelle — voir `src/lib/meilisearch.ts` — donc avec un vrai mot-clé la
  pertinence textuelle reste prioritaire, seuls les ex æquo sont
  départagés par date). Vérifié : deux appels identiques à
  `/api/search?tri=pertinence` renvoient maintenant le même ordre.
- **Filtres catégorie d'entreprise (Fintech, Big Tech, Deep Tech, Grande
  distribution + les collections déjà existantes Licornes/Top 10 tech
  françaises)** : `company-collections.ts` existait déjà (vitrines de la
  page d'accueil, motif de correspondance par segment de slug) mais n'était
  utilisé nulle part comme filtre de recherche. Séparé en deux fichiers —
  `src/lib/company-collections.ts` (données statiques + `matchesMember`,
  sans `prisma`, importable côté client) et
  `src/server/companies/collections.ts` (`resolveCollections()` pour
  l'accueil + nouvelle `companySlugsForCollection()` pour la recherche) —
  pour que `facet-panel.tsx` (composant client) puisse importer les
  libellés/icônes sans tirer `prisma` dans le bundle navigateur. Nouveau
  paramètre `categorie` dans `search-params.ts`, traduit en filtre
  `companySlug IN […]` (Meilisearch et repli PostgreSQL — `companySlug` est
  déjà un attribut filtrable existant, aucun réindexage nécessaire).
  « GAFAM » renommé « Big Tech » et élargi (Netflix, Nvidia, Salesforce,
  Oracle, IBM, Adobe, Cisco). Entreprises des nouvelles collections
  choisies à partir de données réelles de la base (jamais devinées) :
  Fintech vérifié sur N26/Ramp/Plaid/Wise/BNP Paribas/Natixis (117 offres
  réelles), Deep Tech sur OpenAI/Dassault Systèmes/Safran (457 offres),
  Grande distribution sur Decathlon/Carrefour/Auchan/Veepee (25 offres).
  « Big Tech » (GAFAM) reste à 0 offre actuellement — collection valide,
  simplement aucune offre Google/Amazon/Apple/Meta/Microsoft en base pour
  l'instant, comportement attendu et vérifié sans erreur.
- Vérifié en conditions réelles pour l'ensemble : `tsc --noEmit`, ESLint,
  Prettier, suite de tests complète (119 tests), `docker compose build app`
  réel, `curl` sur chaque nouvelle catégorie (comptes et entreprises
  listées confirmés exacts), composition de filtres (`categorie=fintech&
contrat=STAGE` → 22 résultats, tous STAGE), valeur de catégorie invalide
  gérée sans erreur (200, filtre ignoré), page d'accueil et pages
  entreprise non régressées après le déplacement du fichier.

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
2. **IA réelle (spec §41) — abstraction + un cas d'usage faits (§2.12) ;
   reste non fait.** L'abstraction provider (spec §69) et le premier cas
   d'usage (brouillon de réponse de candidature) sont en production, avec
   repli honnête sans clé (§2.12). Toujours aucune clé configurée dans cet
   environnement. Cas d'usage encore non traités, dans l'ordre de valeur
   probable : parsing CV à l'upload (le CV est stocké et lu lexicalement
   depuis §2.9, mais jamais analysé par un modèle), résumé d'offre structuré
   (Résumé/Responsabilités/Requis), recherche en langage naturel. Ces trois
   peuvent réutiliser directement `AiProvider`/`getAiProvider()` — pas
   besoin de refaire l'abstraction.
3. **Extension navigateur + autofill** (spec §15-17) — gros morceau,
   nécessite un nouveau projet (Manifest V3) hors de ce repo Next.js.
4. **Analyse CV — fait (§2.9) ; tailoring — pas fait** (spec §21-22). La
   comparaison CV/offre par mots-clés (§21 « Resume Analysis ») est en
   production. Reste : « Tailor Resume » (§22, réécriture guidée de phrases
   du CV avec diff avant/après) — plus proche d'un besoin réel d'IA que la
   simple comparaison de mots-clés, à traiter avec §2 ci-dessous si une clé
   est ajoutée.
5. **Priority Score / effort estimate** (spec §61-62) — peut maintenant
   s'appuyer sur `computeMatchScore` (§2.3) + date de publication +
   éventuellement une estimation de complexité du formulaire externe (pas
   mesurable tant qu'il n'y a pas d'autofill réel).
6. **Compagnies pages enrichies, alertes multi-canal** (spec §31, §48-49) —
   RGPD export/delete fait (§2.10). Reste : pages entreprise enrichies
   (salaires, benefits, patterns de télétravail agrégés), alertes par
   canal autre qu'email.
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
  sans
