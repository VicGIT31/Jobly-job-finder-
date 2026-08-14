# SOURCES_EUROPE_ASIA.md — sources d'offres pour l'extension Europe + Asie

> Complète `SOURCES.md` (France uniquement, sources **testées en conditions
> réelles**). Ce document couvre le marché **hors France** requis par
> `europe_asia_ai_job_platform_mvp_prompt.md` (§13, §32-33). Contrairement à
> `SOURCES.md`, rien ici n'a encore été appelé en conditions réelles depuis
> Jobly — chaque entrée est marquée **🔎 recherché** (documentation/tiers
> vérifiés le 2026-08-14) ou **✅ testé** une fois intégré. Ne jamais
> présenter une entrée 🔎 comme si elle était ✅.
>
> Voir `CONTEXTE_AI_WORK.md` §3.1 : le multi-pays est le plus gros morceau
> non commencé du cahier des charges. Ce document est le point de départ
> pour le construire sans partir de zéro sur la recherche de sources.

---

## 0. Comment lire ce document

Quatre niveaux, du moins cher (en code et en argent) au plus cher :

- **Tier 0** — déjà câblé dans Jobly, extension par paramètre plutôt que
  nouveau connecteur.
- **Tier 1** — APIs publiques d'agences pour l'emploi officielles : gratuites,
  légales, exhaustives sur leur pays, mais une par pays.
- **Tier 2** — agrégateurs multi-pays avec clé développeur (freemium/payant).
- **Tier 3** — APIs publiques des ATS (Greenhouse, Lever, Ashby…) : gratuites,
  légales, mais une requête par entreprise suivie, pas par pays.
- **Tier 4** — job boards régionaux dominants **sans API publique** :
  candidats à surveiller, **pas à scraper sans revue juridique** (cohérent
  avec la prudence déjà actée pour WTTJ/Indeed/Glassdoor dans `SOURCES.md`).

---

## 1. Tier 0 — extension de ce qui existe déjà

### 1.a `sources/jsearch.ts` (Google for Jobs, déjà actif)

JSearch republie Google for Jobs, qui agrège LinkedIn, Indeed, Glassdoor,
ZipRecruiter, Monster et des dizaines d'éditeurs locaux **dans la plupart
des pays où Google for Jobs est disponible** — la documentation publique ne
liste pas un tableau de couverture pays par pays explicite, à vérifier
directement avec `support@openwebninja.com` ou en testant un paramètre
`country`/`gl` sur quelques marchés cibles (UK, DE, SG, JP, AE) avant de
généraliser. Le connecteur actuel est câblé pour la France (`techQueries()`
dans `sources/types.ts`) : **le plus gros gain immédiat est probablement
d'ajouter des requêtes paramétrées par pays/ville cible plutôt que d'écrire
de nouveaux connecteurs.**

### 1.b `sources/linkedin.ts` (endpoint invité, déjà actif)

L'endpoint public `jobs-guest` utilisé aujourd'hui accepte des paramètres de
localisation. Étendre `techQueries()` avec des villes européennes/asiatiques
(Londres, Berlin, Amsterdam, Singapour, Dubaï…) est un changement de
configuration, pas une nouvelle intégration — mais le disjoncteur de rate
limit (`ingest/http.ts`) devra être surveillé de près : LinkedIn limite déjà
à ~20-30 requêtes/cycle pour la France seule (voir `CONTEXTE.md` §8).

---

## 2. Tier 1 — APIs officielles par pays (légales, gratuites, exhaustives)

| Pays                   | Source                                                 | Auth                                                                | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🇩🇪 Allemagne           | **Bundesagentur für Arbeit — Jobsuche API**            | Aucune (endpoint public, pas de compte)                             | Pas d'API _officiellement_ documentée par la BA, mais un endpoint public stable, largement utilisé et documenté par la communauté (wrapper [`bundesAPI/jobsuche-api`](https://github.com/bundesAPI/jobsuche-api) sur GitHub). Retourne titre, employeur, ville, métier, dates. Équivalent direct de notre connecteur France Travail pour le marché DACH.                                                                                                                                                                                                                                                                                                                                                             |
| 🇸🇪 Suède               | **JobTech / Arbetsförmedlingen — JobSearch API**       | Aucune                                                              | **Officielle**, gouvernementale, gratuite, sans clé. ~45 000+ offres actives, recherche plein texte, filtres municipalité/région/métier. Doc : [arbetsformedlingen.se/.../apis-and-open-data](https://arbetsformedlingen.se/other-languages/english-engelska/about-the-website/apis-and-open-data). Le meilleur rapport effort/couverture de ce document.                                                                                                                                                                                                                                                                                                                                                            |
| 🇸🇬 Singapour           | **MyCareersFuture (GovTech)**                          | À vérifier (endpoint public repéré, conditions d'usage à confirmer) | `api.mycareersfuture.gov.sg/v2/jobs`, pagination 100/page, ~90 000 offres actives, salaire obligatoire, compétences structurées, UEN entreprise. Portail officiel GovTech remplaçant l'ancien « Jobs Bank ».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 🇰🇷 Corée du Sud        | **Work24 / 워크넷 (공공데이터포털)**                   | Clé requise (inscription sur data.go.kr ou work24.go.kr)            | API gouvernementale officielle, XML, filtres très riches (région, contrat, salaire, niveau d'études, dual system). Bureaucratie d'inscription en coréen — prévoir plus de friction que les autres sources de ce tableau.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 🇪🇺 UE/EEE (transverse) | **EURES**                                              | **Pas d'API publique tierce confirmée**                             | ~3M offres, 5000 employeurs, agrège les agences nationales de tous les pays UE/EEE + Suisse — en théorie la source la plus stratégique pour le positionnement « Europe native » du cahier des charges. Mais aucune documentation développeur publique trouvée lors de cette recherche ; seuls des scrapers tiers (Apify) existent, et un flux d'export existe côté agences nationales (ex. [`navikt/pam-eures-stilling-eksport`](https://github.com/navikt/pam-eures-stilling-eksport) pour la Norvège) sans qu'on sache s'il est ouvert aux tiers. **Action concrète : contacter le helpdesk EURES (eures.europa.eu/eures-services/help-and-support_en) pour demander un accès API avant d'investir du temps ici.** |
| 🇬🇧 Royaume-Uni         | _(pas d'agence publique équivalente à France Travail)_ | —                                                                   | Le gouvernement UK n'expose pas d'API publique de son service « Find a Job ». Utiliser Reed (Tier 2) et JSearch (Tier 0) pour ce marché.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

---

## 3. Tier 2 — agrégateurs multi-pays avec clé développeur

| Source     | Couverture                                                                                                                                                                | Auth / coût                                                                                          | Notes                                                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Adzuna** | 16-18 pays : UK, Allemagne, France, Espagne, Italie, Pays-Bas, Pologne, Autriche + hors Europe (Inde, Singapour, Canada, Australie, Brésil, Mexique, Afrique du Sud, USA) | `app_id` + `app_key` gratuits sur inscription, ~1000 appels/mois en free tier, palier payant au-delà | Le meilleur rapport couverture Europe+Asie/un seul compte de ce document. Endpoints salaire/marché (`/histogram`, `/top_companies`, `/geodata`) utiles pour de futures features Insights.      |
| **Jooble** | 60+ pays, couverture mondiale généraliste                                                                                                                                 | Clé gratuite via formulaire ([jooble.org/api/about](https://jooble.org/api/about))                   | POST unique, réponse structurée mais descriptions tronquées et peu de filtres structurés au-delà mots-clés/localisation. À traiter comme repli de volume plutôt que source de qualité premium. |
| **Reed**   | Royaume-Uni uniquement                                                                                                                                                    | Clé gratuite ([reed.co.uk/developers](https://www.reed.co.uk/developers/Jobseeker))                  | Marché UK spécifiquement fort (le job board généraliste le plus utilisé du pays). À activer en priorité si le Royaume-Uni est un marché de lancement Europe.                                   |

---

## 4. Tier 3 — APIs publiques des ATS (par entreprise, tous pays)

Exactement l'architecture d'adaptateurs recommandée par le cahier des
charges (§13). Contrairement aux tiers précédents, ces APIs ne se
requêtent pas « par pays » mais **par entreprise suivie** (`board_token` /
`clientname` / slug) — il faut construire une liste d'entreprises
européennes/asiatiques cibles (ex. via Crunchbase, listes de licornes déjà
présentes dans `src/lib/company-collections.ts`) puis interroger leur board
individuellement. Toutes publiques, sans authentification pour la lecture :

| ATS                 | Endpoint                                                                                                                                             | Notes                                                                                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Greenhouse**      | `GET boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true`                                                                             | Le plus répandu chez les scale-ups tech. Pas de rate limit publié — poller par cycle (ex. toutes les 30 min, cohérent avec le cron existant), pas à chaque vue de page. |
| **Lever**           | `GET api.lever.co/v0/postings/{clientname}?mode=json`                                                                                                | Filtrable par `team`, `department`, `location`, `commitment`.                                                                                                           |
| **Ashby**           | `GET api.ashbyhq.com/posting-api/job-board/{clientname}?includeCompensation=true`                                                                    | Pas de recherche/filtre sur cet endpoint, retourne tout le board.                                                                                                       |
| **SmartRecruiters** | API de posting publique confirmée par plusieurs agrégateurs tiers, endpoint exact à vérifier sur `developers.smartrecruiters.com` avant intégration. | Fréquent chez les entreprises DACH/Nordics.                                                                                                                             |
| **Teamtailor**      | Flux JSON public par « career site », endpoint exact à vérifier par entreprise (`{company}.teamtailor.com`).                                         | **Très pertinent pour les startups scandinaves/néerlandaises**, où Teamtailor domine largement Greenhouse/Lever.                                                        |
| **Workable**        | Déjà dans le champ « Support des adaptateurs ATS » du cahier des charges (§13), endpoint public par entreprise à documenter à l'intégration.         |                                                                                                                                                                         |

> Ces cinq adaptateurs correspondent presque exactement à la liste `Section
13` du cahier des charges (« Greenhouse, Lever, Workday, Ashby,
> SmartRecruiters, Teamtailor, Workable… »). Workday n'a pas d'API de lecture
> publique équivalente (postings derrière des portails candidats propres à
> chaque client) — à traiter au cas par cas, pas en adaptateur générique.

---

## 5. Tier 4 — dominants régionaux sans API publique (à ne pas scraper sans revue)

Repérés comme incontournables sur leur marché mais **sans API publique
confirmée** lors de cette recherche. Cohérent avec la prudence déjà actée
pour WTTJ/Indeed/Glassdoor dans `SOURCES.md` §3 : ne pas scraper le HTML
directement sans revue légale (CGU, robots.txt, RGPD le cas échéant), et
chercher d'abord si JSearch (Tier 0) les republie déjà.

| Marché                              | Sites dominants sans API publique | Piste de contournement légale                                                                                                                                                                           |
| ----------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DACH (Allemagne/Autriche/Suisse)    | StepStone, Xing                   | JSearch les republie peut-être déjà (à vérifier) ; sinon Bundesagentur (Tier 1) couvre une bonne partie du volume officiel allemand.                                                                    |
| Golfe (UAE/Arabie Saoudite/Qatar)   | Bayt.com, GulfTalent              | Couverture Google for Jobs plus faible dans le Golfe qu'en Europe — JSearch à tester en premier, sans garantie.                                                                                         |
| Asie du Sud-Est (SG/MY/ID/TH/VN/PH) | JobStreet / SEEK Asia             | Idem, tester JSearch avant tout scraping direct.                                                                                                                                                        |
| Inde                                | Naukri.com                        | LinkedIn (Tier 0, endpoint invité) et JSearch couvrent probablement une partie du marché indien sans contournement supplémentaire.                                                                      |
| Japon                               | Mynavi, Rikunabi                  | Le Japon a un équivalent public de France Travail (ハローワーク, Hello Work) — non recherché en détail dans cette session, bon candidat pour la prochaine itération de ce document.                     |
| Suisse (emploi public)              | —                                 | `job-room.ch` (SECO, service public suisse de l'emploi) mentionné dans plusieurs recherches tierces comme ayant une API — **non vérifié dans cette session**, à confirmer avant d'y consacrer du temps. |

---

## 6. Recommandation d'implémentation (ordre suggéré)

Priorité par rapport gain de couverture / effort d'intégration, dans
l'esprit de la Phase 4 du cahier des charges (§66, « Job ingestion +
normalisation ») :

1. **Étendre `sources/jsearch.ts`** avec des requêtes par pays cible
   (paramètre déjà supporté par l'API, juste une extension de
   `techQueries()`/`TECH_KEYWORDS`) — zéro nouveau connecteur, résultat le
   plus rapide.
2. **Nouveau connecteur `sources/arbetsformedlingen.ts` (Suède)** — API
   officielle, sans clé, la plus simple à intégrer de tout ce document.
   Bon premier vrai connecteur international, sert de modèle pour les
   suivants.
3. **Nouveau connecteur `sources/bundesagentur.ts` (Allemagne)** — même
   niveau de simplicité, plus gros marché européen.
4. **Adaptateurs ATS génériques (Greenhouse/Lever/Ashby)** — un seul
   connecteur paramétrable par liste d'entreprises (`companyId` en config),
   réutilisable pour tous les pays simultanément. Bénéficie directement de
   `src/lib/company-collections.ts` déjà en place.
5. **Adzuna** — dès qu'une clé est disponible (formulaire gratuit), couvre
   d'un coup UK + plusieurs pays EU + Inde + Singapour.
6. **Reed (UK)** et **MyCareersFuture (Singapour)** — si ces marchés
   deviennent prioritaires spécifiquement, sources officielles/quasi-
   officielles dédiées à chacun.

**Clés à demander à l'utilisateur avant de coder les étapes 5-6** (même
format que la section « Clés API à fournir » de `SOURCES.md`) :

- `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` — [developer.adzuna.com](https://developer.adzuna.com)
- `REED_API_KEY` — [reed.co.uk/developers](https://www.reed.co.uk/developers)
- `WORK24_API_KEY` (Corée) — inscription sur work24.go.kr, en coréen

Aucune clé n'est requise pour les étapes 1-4.

---

## 7. Sources de cette recherche (2026-08-14, non vérifiées en conditions réelles)

- [EURES Job Mobility Portal](https://eures.europa.eu/index_en)
- [bundesAPI/jobsuche-api (GitHub)](https://github.com/bundesAPI/jobsuche-api)
- [Arbetsförmedlingen — APIs and open data](https://arbetsformedlingen.se/other-languages/english-engelska/about-the-website/apis-and-open-data)
- [Adzuna for Developers](https://developer.adzuna.com)
- [Jooble API](https://jooble.org/api/about)
- [고용24 Open API](https://www.work24.go.kr/cm/e/a/0110/selectOpenApiSvcInfo.do)
- [공공데이터포털 — 워크넷 채용정보](https://www.data.go.kr/data/3038225/openapi.do)
- [MyCareersFuture — GovTech Singapore](https://www.tech.gov.sg/products-and-services/for-citizens/employment/mycareersfuture/)
- [Reed.co.uk for Developers](https://www.reed.co.uk/developers/Jobseeker)
- [Greenhouse Job Board API](https://developers.greenhouse.io/job-board.html)
- [Lever Developer — Postings API](https://hire.lever.co/developer/support)
- [Ashby Jobs API](https://jobfeedapi.com/ats/ashby-jobs-api/)
- [JSearch — OpenWeb Ninja](https://www.openwebninja.com/api/jsearch)
