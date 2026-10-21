# Audit collecte, renouvellement et classement — 21 octobre 2026

## Constats vérifiés

L'audit initial portait sur 7 016 fiches. Parmi les offres actives, 3 911
n'avaient pas été revues depuis plus de sept jours. Le worker traitait les
collectes longues et l'expiration avec un seul créneau BullMQ : un cycle
réseau pouvait retarder l'entretien du catalogue.

Les intitulés « Projet Assistant IA », « Développement d'Agents IA » et
« IA et PINNs pour la simulation numérique » se retrouvaient en cyber. Les
sigles IA/AI n'étaient pas des signaux forts, tandis que les présentations
institutionnelles des entreprises remplissaient le score cyber. Les missions
pouvaient commencer après les 2 500 caractères analysés.

HelloWork ne recherchait que les douze premiers mots-clés, excluant notamment
la cybersécurité. Les grands sitemaps relisaient leurs premières annonces à
chaque passage. Une réponse HTTP lisible mais sans liens pouvait être annoncée
comme une collecte vide réussie. Les mises à jour étaient comptées comme des
doublons et une tâche Meilisearch reçue n'était pas suivie jusqu'à son résultat.

## Changements

- Classement déterministe par métier explicite, puis par missions pour les
  titres hybrides. Extraction des missions indépendante du discours employeur,
  traitement du HTML et des retours à la ligne échappés. Reconnaissance IA/AI,
  data, SOC/GRC, systèmes, backend, DevSecOps et C#. Conservation d'AUTRE quand
  les indices ne suffisent pas ; scores et motif disponibles pour l'audit.
- Même extraction des missions pour vérifier le périmètre tech. Un poste de
  communication ne devient pas technique parce que son employeur parle d'IA.
- Conservation de `validThrough` dans une migration additive. Refus des dates
  incohérentes, des observations périmées, des annonces expirées et des dates
  de publication connues dépassant la durée de conservation configurée.
- Expiration au démarrage et toutes les quinze minutes, avec trois créneaux
  de traitement pour laisser l'entretien avancer pendant une collecte.
  Le critère de fraîcheur est revérifié à l'écriture pour préserver une offre
  mise à jour en parallèle. Indexation des expirations par lots de 500.
- Rapprochement des catalogues employeurs complets avec leurs URLs propres.
  Expiration des annonces disparues ; aucun retrait immédiat sur collecte
  partielle ou forte chute de volume. Le délai normal de fraîcheur reste actif.
- Rotation persistante des détails de grands sitemaps, avec un quart du budget
  réservé aux nouveautés. Budget réseau par source de quinze minutes par
  défaut, résultats partiels préservés et signalés. Les refus 401/403 et les
  limitations de débit continuent d'arrêter les requêtes.
- HelloWork parcourt tous les métiers du catalogue et signale les pages sans
  annonces lisibles. Free-Work déduplique les deux recherches de contrat et
  conserve le stage explicitement indiqué dans le titre.
- Attente du résultat des tâches Meilisearch, erreurs d'indexation visibles,
  réparation horaire par lots et retrait des documents orphelins.
- Un extrait d'alerte ne modifie ni le contenu, ni le contrat, ni les dates,
  ni le statut d'une offre complète déjà connue.

## Résultats sur les données locales

- 2 363 fiches reclassées, dont 219 de cyber vers IA/Data, archives comprises.
  Le contrôle suivant sur 7 051 fiches propose zéro reclassement supplémentaire.
- 3 437 offres non revues expirées lors du nettoyage ; zéro offre active
  dépassant le délai de fraîcheur lors du contrôle suivant. Les chiffres
  diffèrent du constat initial car une collecte a revu des offres entre-temps.
- Audit de périmètre appliqué : 232 postes supplémentaires retirés des résultats
  et deux contrats corrigés. Les fiches et les rapports sont conservés.
- Collecte réelle Airbus, Thales, Decathlon Digital, Sopra Steria et Wavestone :
  28 nouvelles offres sur ce cycle. Le catalogue Airbus a bougé pendant la
  pagination ; sa couverture incomplète interdit le retrait immédiat. Ce cas
  déclenche désormais aussi un avertissement explicite.
- Vérification réelle Free-Work : 13 offres distinctes exportées sans avertissement.
- API `/api/search` vérifiée avec le filtre IA et la recherche « Assistant IA » :
  les résultats utilisent Meilisearch et les fiches corrigées portent bien IA.
- Suite automatisée : 213 tests ; TypeScript, ESLint et build Next.js réussis.
- Comparaison intégrale après correction : 7 051 fiches en base et dans
  Meilisearch, aucun écart de spécialité ou de statut, 1 124 offres actives et
  aucune au-delà du délai de fraîcheur à cet instant. Ces volumes évoluent
  pendant les cycles suivants.

Les rapports détaillés sont dans `reports/`, ignoré par Git : état initial,
reclassements avec scores, audits de périmètre et export de validation.

## Entretien

Appliquer la migration avant de relancer les processus :

```sh
npx prisma migrate deploy
npx prisma generate
npm run dev
```

```sh
npm run specialty:backfill -- --dry-run
npm run specialty:backfill
npm run offers:audit
npm run offers:audit -- --apply
npm run offers:refresh
```

`offers:refresh` expire et répare l'index sans purge. Le reclassement produit un
rapport daté et protège les contenus modifiés en parallèle. `INGEST_SOURCES`
permet une collecte ciblée ; `INGEST_SOURCE_TIMEOUT_SECONDS` borne son budget
réseau. Une collecte ciblée n'expire pas les annonces des autres employeurs.

La couverture des 83 entrées activées n'est pas garantie : les vérifications
réelles ci-dessus ne constituent pas une validation individuelle de toutes
les sources. APEC refuse certains accès, LinkedIn peut limiter les requêtes,
et certains sites nécessitent un rendu dynamique. Ces cas restent visibles
dans les bilans ; aucun contournement n'a été ajouté. Le classement reste
heuristique et conserve une seule spécialité principale pour un poste hybride.

Références techniques primaires consultées :
[pagination SmartRecruiters](https://developers.smartrecruiters.com/docs/customer-overview),
[champs du Job Board Greenhouse](https://docs.greenhouse.io/job-board),
[tâches asynchrones Meilisearch](https://www.meilisearch.com/docs/capabilities/indexing/tasks_and_batches/async_operations).
