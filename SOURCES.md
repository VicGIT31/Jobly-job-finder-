# Sources publiques gratuites — Jobly

État vérifié le **5 octobre 2026**. Périmètre : stages et alternances tech en
France, collectés directement en local. **Aucune clé de fournisseur d’offres,
aucun abonnement de scraping.** JSearch et France Travail OAuth sont retirés.
Les anciens secrets de collecte éventuellement présents dans `.env` ne sont
plus lus. Un endpoint JSON reste une API au sens technique : ici il s’agit des
flux publics gratuits des sites, pas d’un fournisseur facturé.

## Catalogue

[`config/job-sources.json`](config/job-sources.json) contient **84 entrées,
dont 83 activées et 80 entreprises**. Le catalogue initial (Airbus, Thales,
Decathlon, Capgemini, Ubisoft, Sopra Steria, etc.) est complété par Renault,
Sanofi, Valeo, Michelin, Daher, Accenture, ALTEN, Wavestone, Devoteam, Talan,
Assystem, Eurofins, Veolia, Scaleway, Doctrine, Aircall, Pigment et d'autres.

Les endpoints ajoutés ont été vérifiés avec des réponses publiques non vides.
Cela ne garantit ni la présence actuelle d'un stage tech en France, ni la
réussite de chaque page de détail. Indeed reste désactivé après un HTTP 403
observé. WTTJ publie des sitemaps accessibles, mais a aussi renvoyé un HTTP 403
sur des annonces pendant la collecte d'essai.

Les 5 connecteurs historiques gratuits complètent la liste : APEC, HelloWork,
Free-Work, LinkedIn invité et The Muse. Le dossier optionnel `.eml` permet
l'import d'alertes reçues ; aucune boîte mail privée n'est connectée.
La source suédoise et l'ancien catalogue ATS international restent dans le
dépôt, hors du cycle France actuel. Tous les résultats publics sont limités
aux contrats stage/alternance. Les CDI et temps pleins historiques sont exclus.
Voir [INTEGRATIONS_GRATUITES.md](INTEGRATIONS_GRATUITES.md) pour les vérifications,
les alertes Indeed et l'inventaire français reproductible.

## Endpoints utilisés

| Source / format | Recherche publique                                                                    | Détails                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Airbus          | `POST https://ag.wd3.myworkdayjobs.com/wday/cxs/ag/Airbus/jobs`                       | `GET …/wday/cxs/ag/Airbus/job/{chemin}`                                                                      |
| Thales          | `POST https://thales.wd3.myworkdayjobs.com/wday/cxs/thales/Careers/jobs`              | `GET …/wday/cxs/thales/Careers/job/{chemin}`                                                                 |
| Decathlon       | `GET https://joinus.decathlon.fr/sitemap.xml`                                         | `/fr/annonce/{id-slug}` : JSON-LD                                                                            |
| Capgemini       | `/search/?q=stage&locale=fr_FR&startrow=0` et `q=alternance`                          | `/job/{slug}/{id}/` : microdonnées schema.org                                                                |
| France Travail  | `https://candidat.francetravail.fr/offres/recherche`                                  | Configuration `/ihm-descriptifoffre/configuration.json`, puis flux anonyme `/api-descriptifoffre/offre/{id}` |
| WTTJ            | `https://www.welcometothejungle.com/sitemaps/index.xml.gz` et sitemaps `job-listings` | `/fr/companies/{entreprise}/jobs/{slug}` : vérifier l’accès réel                                             |
| Greenhouse      | `https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true`                 | Description incluse                                                                                          |
| Lever           | `https://api.lever.co/v0/postings/{slug}?mode=json`                                   | Description incluse                                                                                          |
| Ashby           | `https://api.ashbyhq.com/posting-api/job-board/{slug}`                                | Description incluse                                                                                          |
| SmartRecruiters | `https://api.smartrecruiters.com/v1/companies/{slug}/postings`                        | `…/postings/{id}`                                                                                            |
| Deezer          | `https://deezer.teamtailor.com/jobs`                                                  | `/jobs/{id-slug}` : JSON-LD                                                                                  |
| APEC            | `POST https://www.apec.fr/cms/webservices/rechercheOffre`                             | Description dans la recherche                                                                                |
| HelloWork       | `/fr-fr/emploi/recherche.html`                                                        | `/fr-fr/emplois/{id}.html` : JSON-LD                                                                         |
| Free-Work       | `https://www.free-work.com/api/job_postings`                                          | Description dans les résultats                                                                               |
| LinkedIn invité | `/jobs-guest/jobs/api/seeMoreJobPostings/search`                                      | `/jobs-guest/jobs/api/jobPosting/{id}`                                                                       |
| The Muse        | `https://www.themuse.com/api/public/jobs`                                             | Description dans les résultats                                                                               |

Workday reçoit `{limit:20,offset:0,searchText:"stage",appliedFacets:{}}`. Le filtre
France est découvert dans les facettes retournées, puis la pagination repart à
zéro. Le pays est confirmé dans le détail. Les URL réellement publiées sont
conservées. Aucun identifiant de filtre n’est deviné ou figé.

Les slugs de boards diffèrent parfois du nom commercial : `Ubisoft2` et
`SopraSteria1`, par exemple. Alan, Back Market, Pennylane et Ledger utilisent
désormais Ashby ; Deezer utilise Teamtailor. Leurs anciens boards Lever ne sont
plus utilisés. Ces migrations ont été vérifiées pendant le travail.

## Commandes

```bash
npm run sources:list
npm run sources:check -- --output reports/all-source-health.json
npm run sources:check -- --collect --sources airbus,thales --limit 10 --pages 2
npm run collect:offers -- --sources airbus,thales,capgemini --limit 20 --pages 2
npm run ingest:file -- reports/collected-offers.json
npm run ingest:now
```

Sans `--collect`, le diagnostic vérifie seulement l’endpoint de départ.
`collect:offers` exporte les offres réelles normalisées et dédupliquées, sans
PostgreSQL, Redis ni Meilisearch. `ingest:file` importe cet export sans rappeler
les sites. Les résultats partiels incluent leurs avertissements ; un échec de
source donne un code de sortie 1.

Les premiers exports ont fourni **69 offres distinctes importées** : Airbus 6,
Thales 10, Capgemini 8, Ubisoft/Sopra Steria 15, Alan/Back Market 16, France
Travail 13, Deezer 1. Ce sont des petits lots de validation, pas une estimation
du marché. Decathlon n’a fourni aucune offre correspondant au filtre dans
l’essai ; cela ne prouve pas l’absence de stages tech dans cette entreprise.

## Étendre la couverture

```bash
npm run sources:discover -- https://entreprise.fr/carrieres
```

Le script repère les liens ATS et les sitemaps publiés, puis propose des entrées
désactivées dans `reports/discovered-sources.json`. Compléter les informations,
vérifier avec `--include-disabled --collect`, puis activer dans le catalogue.
Il ne scanne pas tous les domaines d’Internet. `JOB_SOURCES_FILE` remplace le
catalogue par un fichier local. `INGEST_SOURCES` sélectionne des IDs du catalogue
ou domaines historiques (`apec.fr`, `hellowork.com`, `free-work.com`,
`linkedin.com`, `themuse.com`).

Les budgets `maxPages`, `maxOffers`, `maxSitemaps`, les requêtes et la pagination
sont réglables par source. Le cache conserve les détails 4 h et les sitemaps
1 h ; les recherches sont relues à chaque cycle. Au plus 4 sources tournent
simultanément, avec de petits pools de détails et un espacement par hôte. Une
source terminée laisse immédiatement sa place à la suivante.

## Automatisation et limites

`npm run dev`, `npm start` et Docker lancent le site avec son worker. Celui-ci
collecte au démarrage et toutes les **120 minutes** par défaut. Redis empêche
les doubles cycles ; Meilisearch reçoit les écritures par lots de 100.

La couverture n’est pas exhaustive : le catalogue et la pagination sont bornés,
les slugs ambigus peuvent manquer, des sites peuvent bloquer l’automatisation
ou changer de format. Les descriptions absentes, pays étrangers/inconnus et
contrats hors périmètre sont écartés. Les nouveaux collecteurs ne fabriquent
pas de date de publication.

Une offre disparue peut rester en cache 4 h, puis être expirée après 7 jours
sans observation. La purge existante à 60 jours demeure. Un 401/403 coupe
l’hôte pour le cycle ; un `Retry-After` long conserve la pause entre cycles
dans le processus. Aucun captcha, proxy ou session privée n’est utilisé pour
contourner un refus. Les blocages et budgets atteints sont signalés dans les
rapports et dans la console admin.

Sources officielles consultées : [Airbus](https://www.airbus.com/en/careers),
[Thales](https://careers.thalesgroup.com/global/en/),
[Decathlon](https://joinus.decathlon.fr/fr/annonces),
[Capgemini](https://careers.capgemini.com/search/?q=stage&locale=fr_FR),
[Alan](https://alan.com/en/careers),
[Back Market](https://www.backmarket.com/en-us/careers/home),
[Ledger](https://careers.ledger.com/), [Deezer](https://www.deezerjobs.com/en/).
