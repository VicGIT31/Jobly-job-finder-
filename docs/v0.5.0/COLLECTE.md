# Collecte et recherche — Jobly 0.5.0

Les options B et C de l'audit du 9 novembre sont intégrées. Le programme fonctionne sans compte tiers ni clé à fournir. Le catalogue reste partiel : un site inaccessible, une limite ou un contrat hors périmètre ne sont pas une offre inventée.

## Fonctionnement

1. Le catalogue conserve les sources existantes, leurs critères et leurs sélections. La planification alterne les sources IA prioritaires, les autres métiers, la découverte et les employeurs directs, avec quatre créneaux et les limites par hôte existantes.
2. Workday, les flux employeurs, HelloWork et LinkedIn transmettent leurs lots au pipeline pendant la collecte. Chaque lot est normalisé, dédupliqué, enregistré puis indexé avant la fin du connecteur. Les connecteurs historiques sans transmission progressive restent compatibles.
3. Workday sauvegarde la prochaine page traitable ; un passage interrompu reprend après un contrôle de la première page. Une reprise partielle n'est jamais déclarée catalogue complet. Les mots-clés IA et historiques alternent et tournent entre les cycles, au lieu de commencer toujours par le développement web.
4. La découverte part de sites officiels, suit leurs liens carrière et identifie les ATS, sans deviner leurs slugs. Elle ajoute Workable et les stages de recherche Inria aux plateformes existantes. Les premières offres des sources nouvellement validées sont lues dans le même cycle (quatre sources, 100 offres et quatre pages maximum pour ce premier passage). Un quart du budget de découverte reste disponible aux pistes ordinaires lorsqu'elles sont dues.
5. Les communes sont distinguées des campus Workday. Le géocodage des communes est mis en cache ; une URL Workday officielle peut fournir une commune quand le champ ne donne qu'un nom de campus. Un lieu indéterminé reste indéterminé. Les implantations françaises secondaires sont conservées et prises en compte dans le rayon des deux moteurs de recherche.
6. Les thèmes IA, LLM, NLP, vision, MLOps, IA embarquée et Data/BI complètent la spécialité principale. Le filtre IA retrouve donc aussi un sujet logiciel/IA ou cyber/IA. Les requêtes entières « IA », « AI », « LLM », etc. utilisent ces thèmes. Data/BI reste distinct du thème IA/ML. Les missions et jusqu'à 16 000 caractères de description sont indexés. Les stages juridiques d'une entreprise IA ne deviennent pas des stages techniques pour cette seule raison.
7. Les favoris, candidatures, CV et autres domaines restent conservés. La première réparation de l'index applique la migration de classement et de géolocalisation aux anciennes fiches. Les anciennes offres hors périmètre sont retirées des résultats actifs sans suppression des lignes ou de l'historique.

Le contrat TECH et FINANCE reste Stage/Alternance ; les autres univers gardent leurs règles. Barista conserve la Haute-Garonne et les rayons d'Agen/Bordeaux. Le filtre « 5 derniers jours » est facultatif et réversible : il n'entraîne aucune suppression. Publication, détection et dernière observation restent distinctes. Une absence de vérification de sept jours devient incertaine ; une fermeture/échéance confirmée peut expirer la fiche.

## Délais et suivi

Le catalogue existant est consultable immédiatement. Les lots deviennent visibles pendant les sources compatibles, avec un premier lot utile souvent bien avant leur fin. Le passage global peut toujours durer plusieurs dizaines de minutes, davantage si des catalogues sont volumineux ou bloqués. L'application doit rester ouverte pour avancer.

Bureau → **Suivi du cycle** affiche l'ensemble des sources en attente, en cours, terminées, partielles, indisponibles ou interrompues. Les derniers passages archivés conservent un véritable début, une fin et un identifiant de cycle. Les vieux débuts d'exécution ont été corrigés à partir de leur durée connue.

Le cache GET évite des relectures pendant sa durée de validité (détails ATS généralement quatre heures). Ce n'est pas une garantie de vérification réseau à l'instant de l'affichage. Une suppression par absence exige un catalogue complet fiable ; une collecte partielle ne fait pas disparaître tout un employeur.

## Option C sans clé : accès officiel Tavily

La documentation officielle et son dépôt GitHub proposent un mode gratuit **keyless** pour `/search`. Jobly utilise le header `X-Tavily-Access-Mode: keyless`, sans identifiant emprunté. Un test public le 9 novembre a répondu HTTP 200 avec de vrais résultats.

- Deux recherches `basic` maximum par cycle.
- Plafond **local** sans clé : 10 tentatives/jour et 300/mois. Le fournisseur applique également ses limites, non garanties par ces plafonds locaux.
- Seules les URLs sont des pistes de découverte. Les extraits ne deviennent pas des offres ; les sites d'origine sont contrôlés par le crawler et les règles habituelles.
- Un refus ou une réponse inexploitable suspend le complément 24 h. Le compteur persiste sur disque, réserve chaque tentative avant l'appel et ne relance pas automatiquement les requêtes facturables.
- La collecte directe B continue même sans le fournisseur. Un compteur corrompu suspend les appels pour ne pas perdre la maîtrise du quota.
- Les requêtes concernent uniquement des termes de recherche d'emploi fixes. Aucun CV, profil, note ou candidature n'est envoyé.

Références vérifiées le 9 novembre 2026 : [accès sans clé](https://docs.tavily.com/documentation/keyless), [dépôt officiel](https://github.com/tavily-ai/tavily-js), [crédits avec clé personnelle](https://docs.tavily.com/documentation/api-credits).

### Désactiver ou configurer le complément

Dans l'application, **Bureau → Dossier de données** ouvre le profil. Un fichier `search-api.json` à sa racine peut désactiver C :

```json
{ "enabled": false }
```

Le supprimer restaure le mode sans clé. Pour utiliser sa propre clé gratuite créée sur [Tavily](https://app.tavily.com/), le même fichier peut contenir :

```json
{
  "provider": "tavily",
  "apiKey": "REMPLACER_PAR_VOTRE_CLE_PERSONNELLE",
  "dailyLimit": 20,
  "monthlyLimit": 600
}
```

Ce fichier est local, n'est pas publié sur GitHub et n'est pas inclus dans les sauvegardes métier. Le quota d'une clé est partagé entre les installations qui l'utilisent ; le compteur local ne remplace pas celui du compte fournisseur. Le mode gratuit avec clé annonce 1 000 crédits mensuels, sans carte ; les conditions du compte font foi.

Pour configurer depuis les sources : `npm run discovery:configure` demande la clé localement puis écrit le fichier du profil Windows/Mac. Node.js n'est nécessaire que pour cette commande de développement facultative, jamais pour utiliser l'exécutable. `--output chemin` permet de choisir un autre fichier.

En mode web, `TAVILY_API_KEY` ou `JOBLY_DISCOVERY_CONFIG` configurent la clé ; `JOBLY_SEARCH_DISCOVERY=0` désactive C. Le bureau utilise son fichier de profil et n'hérite pas des secrets arbitraires du shell.

## Limites et points non promis

Les annuaires et amorces ne recensent pas tous les recruteurs français. Les documents PDF de laboratoires ne sont pas automatiquement transformés en offres. Les ATS non reconnus peuvent exiger un adaptateur ; les sites refusant l'accès ne sont pas contournés. Il n'y a ni couverture exhaustive, ni gain exponentiel démontré, ni classement sémantique par modèle local dans cette version.

Les flux Workable utilisant un lien générique `/j/...` ne permettent pas un retrait par préfixe propre à l'employeur : ils suivent la fraîcheur et les vérifications disponibles. Les lieux secondaires ambigus ne reçoivent pas de coordonnées inventées. Le rapprochement intersites reste conservateur afin de préserver des sujets de stage distincts.

## Catalogues et ajout de sources

`config/job-sources.json` contient le catalogue employeurs ; `config/personal-sources.json` les recherches personnelles. Les modules finance et barista génèrent leurs recherches dédiées. APEC, HelloWork, Free-Work, LinkedIn invité, The Muse et les alertes locales complètent ces sources. `src/server/ingest/sources/index.ts` assemble les connecteurs actifs. Les anciens connecteurs suédois et ATS internationaux non enregistrés ont été retirés ; les adaptateurs ATS du catalogue courant sont conservés.

Les formats pris en charge comprennent Workday, Greenhouse, Lever, Ashby, SmartRecruiters, Recruitee, Teamtailor, Workable, Inria et les pages HTML/sitemaps avec données structurées. Les endpoints et budgets effectifs sont définis dans le catalogue et `sources/public-boards.ts`. Une entrée activée ou un endpoint HTTP 200 ne garantit ni une collecte complète, ni une offre correspondant au métier et au contrat recherchés.

`JOB_SOURCES_FILE` remplace le catalogue employeurs embarqué ; les définitions découvertes validées peuvent toujours le compléter. `INGEST_SOURCES` sélectionne des identifiants connus (par exemple `airbus`, `thales`, `hellowork.com`, `local-job-alerts`). Sans sélection, toutes les sources activées sont proposées. Sur le bureau, la sélection persistante de **Bureau → Sources de la collecte** s'applique aussi.

Pour ajouter un employeur, partez de son site carrière officiel, vérifiez les liens trouvés et testez les détails d'une offre avant activation. Les pistes de `config/france-career-candidates.json` ne sont pas activées par le seul fait qu'un endpoint répond. `maxPages`, `maxOffers`, `maxSitemaps` et les requêtes bornent chaque connecteur.

## Commandes de diagnostic et de maintenance

Depuis les sources, avec les dépendances installées et la configuration locale préparée :

```sh
npm run sources:list
npm run sources:check -- --sources airbus,thales --collect --limit 10 --pages 2
npm run collect:offers -- --sources airbus,thales --limit 20 --pages 2
npm run sources:discover -- https://entreprise.fr/carrieres
npm run sources:expand -- --output reports/france-career-expansion.json
```

`sources:list` et `sources:check` portent sur le catalogue employeurs ; `collect:offers` utilise l'ensemble des connecteurs sélectionnés et exporte par défaut `reports/collected-offers.json` sans importer dans la base. La découverte manuelle produit des propositions dans `reports/discovered-sources.json`, à vérifier avant activation. `sources:check --include-disabled --collect --sources identifiant` permet de tester une entrée désactivée ajoutée à son catalogue de travail.

Les commandes suivantes modifient la base locale ou l'index :

```sh
npm run ingest:now
npm run ingest:file -- reports/collected-offers.json
npm run search:sync
npm run offers:refresh
```

`search:sync` reconstruit l'index depuis PostgreSQL. `offers:refresh` applique les règles de fraîcheur et répare la recherche, sans purge définitive. Pour auditer ou corriger les anciennes classifications :

```sh
npm run offers:audit
npm run specialty:backfill -- --dry-run
```

Après examen des rapports et sauvegarde, `offers:audit -- --apply` et `specialty:backfill` appliquent leurs corrections. `geo:backfill` et `contract:backfill` restent disponibles pour les anciennes données ; ils ne sont pas requis pour démarrer l'application. Les rapports sont écrits dans `reports/`, ignoré par Git.

En mode web, le worker collecte au démarrage puis toutes les deux heures par défaut, entretient la fraîcheur toutes les quinze minutes, réconcilie la recherche chaque heure, traite les alertes à 8 h et lance la purge des vieilles offres à 3 h. Les paramètres de durée de vie se règlent dans `/admin/parametres`. La purge préserve les offres associées à des favoris, masquages ou candidatures. Le bureau ne lance pas cette purge définitive : il conserve les données personnelles et applique la fraîcheur lors de son entretien. Une source partielle ne justifie pas le retrait de tout son catalogue.

## Alertes email locales

Les emails d'alertes peuvent être exportés au format `.eml` dans `data/job-alerts/` ou le dossier défini par `JOB_ALERTS_DIR`. L'arrivée des fichiers reste à organiser dans le client mail : Jobly ne se connecte pas à une boîte Gmail ou Outlook et ne crée pas d'alertes chez un fournisseur. Docker monte le dossier en lecture seule. Si une sélection explicite de sources est utilisée, inclure `local-job-alerts` pour le traitement automatique.

```sh
npm run alerts:import -- data/job-alerts --export reports/email-offers.json
npm run alerts:import -- data/job-alerts
```

La première commande exporte pour inspection ; la seconde importe dans la base. Le parseur utilise le contenu des messages sans charger leurs pixels, images ou redirections. Les champs absents ne sont pas inventés, la date du mail ne devient pas une date de publication et une alerte ne prouve pas que le poste est encore ouvert. Les formats tiers peuvent varier : les tests sur messages synthétiques ne valident pas chaque modèle réel d'alerte. Les emails et exports restent hors Git.
