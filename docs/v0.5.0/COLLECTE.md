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
