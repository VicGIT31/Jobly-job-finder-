# Sources d'offres — cartographie du marché et état dans Jobly

> Panorama des sites de recrutement pertinents pour un développeur en France,
> et état de leur intégration dans Jobly. Chaque « ✅ testé » a été vérifié en
> conditions réelles (appel effectif, volume mesuré), pas supposé.

---

## 1. Le top 10 pour un développeur en France

Classement par utilité réelle pour un profil dev cherchant un stage ou une
alternance : volume d'offres tech, qualité du ciblage, et fraîcheur.

| #   | Site                                | Pourquoi il compte                                                                              | État dans Jobly                  |
| --- | ----------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------- |
| 1   | **France Travail** (ex-Pôle Emploi) | Source officielle, la plus exhaustive de France. Codes ROME tech, toutes tailles d'entreprises. | 🔑 Code prêt — **clé requise**   |
| 2   | **LinkedIn**                        | Le réflexe n°1 des recruteurs tech. Offres récentes, entreprises tech et start-up.              | ✅ **Actif, sans clé**           |
| 3   | **Indeed**                          | Premier agrégateur mondial en trafic ; couvre les PME et ESN absentes d'ailleurs.               | 🔑 Via JSearch — **clé requise** |
| 4   | **HelloWork** (ex-RegionsJob)       | Premier job board généraliste **français** en volume, très bien maillé en région.               | ✅ **Actif, sans clé**           |
| 5   | **APEC**                            | Référence du marché cadre. ~1 400 alternances, descriptions complètes.                          | ✅ **Actif, sans clé**           |
| 6   | **Welcome to the Jungle**           | La vitrine des start-up et scale-up françaises, très prisée des jeunes devs.                    | ⛔ Bloqué (voir §3)              |
| 7   | **Glassdoor**                       | Offres + salaires et avis, utile pour arbitrer entre deux postes.                               | 🔑 Via JSearch — **clé requise** |
| 8   | **JobTeaser**                       | Le réseau des écoles : stages et alternances ciblés étudiants.                                  | ⛔ Bloqué (voir §3)              |
| 9   | **Free-Work** (ex-Freelance-Info)   | 100 % tech, métadonnées riches (télétravail, compétences, salaire).                             | ✅ **Actif, sans clé**           |
| 10  | **Talent.com**                      | Gros agrégateur, forte présence sur les postes juniors.                                         | 🔑 Partenariat requis (voir §4)  |

---

## 2. Sources intégrées et vérifiées

| Connecteur             | Fichier                     | Clé     | Volume mesuré / cycle  | Méthode                                                                                                      |
| ---------------------- | --------------------------- | ------- | ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| **APEC**               | `sources/apec.ts`           | Non     | **218 offres en 6 s**  | API JSON du moteur de recherche (POST). Descriptions incluses dans les résultats — aucune requête de détail. |
| **HelloWork**          | `sources/hellowork.ts`      | Non     | **456 offres en 55 s** | Pages publiques + **JSON-LD `JobPosting`** (le format que lit Google for Jobs).                              |
| **LinkedIn**           | `sources/linkedin.ts`       | Non     | ~20-60 (rate-limité)   | Endpoint invité `jobs-guest`, recherche et descriptions alternées par lots.                                  |
| **Free-Work**          | `sources/free-work.ts`      | Non     | **20 offres**          | API publique API Platform, filtrée sur la France.                                                            |
| **The Muse**           | `sources/themuse.ts`        | Non     | ~0-5                   | API publique, faible volume France. Repli historique.                                                        |
| **France Travail**     | `sources/france-travail.ts` | **Oui** | —                      | API officielle « Offres d'emploi v2 », codes ROME tech.                                                      |
| **Indeed + Glassdoor** | `sources/jsearch.ts`        | **Oui** | —                      | Via JSearch (Google for Jobs), attribution par offre.                                                        |

**Total sans aucune clé : ~700 offres par cycle**, contre ~50 auparavant.

> **Pourquoi le JSON-LD** : HelloWork et beaucoup d'autres publient leurs offres
> au format schema.org pour être indexés par Google for Jobs. C'est un format
> **standardisé et stable**, là où le HTML change à chaque refonte. L'extracteur
> partagé (`ingest/jsonld.ts`) rend ces connecteurs résistants aux redesigns et
> permet d'en ajouter un nouveau en quelques dizaines de lignes.

---

## 3. Sources écartées, et pourquoi

Ces sites ont été **testés** ; ils ne sont pas intégrés pour des raisons
techniques ou juridiques, pas par oubli.

| Site                      | Constat                                                                              | Décision                                               |
| ------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| **Welcome to the Jungle** | Recherche servie par Algolia avec une clé chiffrée côté serveur, non réutilisable.   | Écarté. Nécessiterait leur API partenaire.             |
| **JobTeaser**             | Contenu derrière authentification école/étudiant.                                    | Écarté. Contourner l'auth serait abusif.               |
| **Indeed (direct)**       | 403 systématique sur les requêtes serveur.                                           | Écarté au profit de **JSearch**, la voie légale.       |
| **Glassdoor (direct)**    | 403 + captcha.                                                                       | Idem : passe par **JSearch**.                          |
| **Iquesta**               | Testé : les filtres de recherche sont ignorés, ~6 offres quelle que soit la requête. | Écarté — volume trop faible pour la fragilité induite. |
| **Monster / Cadremploi**  | Redirigent vers des plateformes partenaires, faible volume tech junior propre.       | Non prioritaire.                                       |
| **Stack Overflow Jobs**   | Service fermé.                                                                       | Sans objet.                                            |

---

## 4. Clés API à fournir pour aller plus loin

Voici exactement ce qu'il me faut pour activer les sources restantes. **À
déposer dans `.env`** (non versionné) — aucune clé ne doit être collée ici ni
dans un fichier suivi par Git.

### 4.1 Déjà codé, en attente de clé

| Source                 | Variables                                                    | Où l'obtenir                                                                                        | Coût                    | Gain attendu                                                                                  |
| ---------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| **France Travail**     | `FRANCE_TRAVAIL_CLIENT_ID`<br>`FRANCE_TRAVAIL_CLIENT_SECRET` | [francetravail.io](https://francetravail.io) → créer une appli → souscrire à « Offres d'emploi v2 » | Gratuit                 | **Le plus gros gain possible** : couverture nationale exhaustive, plusieurs milliers d'offres |
| **Indeed + Glassdoor** | `RAPIDAPI_KEY`                                               | [JSearch sur RapidAPI](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) → plan _Basic_       | Gratuit (~200 req/mois) | Ouvre les deux plus gros agrégateurs mondiaux                                                 |

### 4.2 À coder si tu fournis la clé

| Source         | Variables                           | Où l'obtenir                                         | Coût                        | Gain attendu                                                |
| -------------- | ----------------------------------- | ---------------------------------------------------- | --------------------------- | ----------------------------------------------------------- |
| **Adzuna**     | `ADZUNA_APP_ID`<br>`ADZUNA_APP_KEY` | [developer.adzuna.com](https://developer.adzuna.com) | Gratuit (1 000 appels/mois) | Agrégateur multi-sources avec API propre et bien documentée |
| **Jooble**     | `JOOBLE_API_KEY`                    | [jooble.org/api/about](https://jooble.org/api/about) | Gratuit sur demande         | Agrégateur international, bonne couverture FR               |
| **Talent.com** | `TALENT_PUBLISHER_ID`               | Programme partenaire (formulaire commercial)         | Gratuit après validation    | Flux XML complet, volume junior important                   |

> Donne-moi la ou les clés et j'implémente le connecteur correspondant dans la
> foulée — le squelette (`SourceConnector` + couche HTTP durcie + extracteur
> JSON-LD) rend chaque ajout rapide.

---

## 5. Comment ajouter une source

1. Créer `src/server/ingest/sources/<nom>.ts` implémentant `SourceConnector`
   (`isEnabled()` + `fetchOffers()`).
2. Utiliser la couche HTTP commune (`ingest/http.ts`) : retries, backoff,
   throttle par hôte et disjoncteur sont gérés pour vous.
3. Si le site publie du schema.org, utiliser `ingest/jsonld.ts` plutôt que des
   expressions régulières sur le HTML.
4. Enregistrer le connecteur dans `run-ingestion.ts`.
5. Le reste est automatique : normalisation, rejet hors périmètre
   (stage/alternance uniquement), déduplication, **classement par spécialité**,
   géocodage et indexation.
