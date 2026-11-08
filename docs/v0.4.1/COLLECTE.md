# Collecte autonome sans clé

L'installation de bureau ne demande aucune configuration de fournisseur. Une connexion Internet suffit à lancer les sources publiques ; le catalogue déjà présent reste consultable hors connexion. Les sources qui demandent des identifiants ne sont pas nécessaires à ce circuit.

La découverte automatique est activée par défaut. La source se sélectionne dans le Bureau comme les autres connecteurs. En mode serveur, `JOB_DISCOVERY_ENABLED=0` la désactive. Les sélections explicites de sources sont respectées : une sélection restrictive n'inclut pas implicitement tous les futurs employeurs.

## Sources, ordre et délais

**Non : Jobly n’a pas été limité à France Travail.** Le catalogue contient toujours les connecteurs employeurs (Airbus, Thales, Capgemini, etc.), les autres sites d’offres et la découverte automatique. Au contrôle local du 8 novembre 2026, aucune sélection ne restreignait la collecte à France Travail. La base contenait notamment **225 offres actives d’Airbus, 577 de Thales et 118 de Capgemini**, avec leurs URLs de sites recruteurs. Ces nombres sont une photographie de contrôle, pas des volumes garantis. Crédit Agricole ne dispose pas actuellement d’un connecteur dédié vérifié dans le catalogue fourni ; une offre portant son nom et trouvée via un agrégateur ne prouve pas une collecte directe de son site.

### L’algorithme en quatre étapes

1. Charger les sources activées et la sélection du Bureau : sources locales/généralistes, recherches Barista et finance, pages recruteurs, autres connecteurs, découverte puis catalogue employeurs. Une sélection explicite peut réduire ce périmètre ; une sélection vide inclut tout le catalogue activé.
2. Lire les listes paginées, flux publics et sitemaps, puis les fiches nécessaires, avec quatre collecteurs en parallèle et des appels espacés par hôte.
3. Contrôler la France, les métiers/contrats suivis, les dates et les doublons ; conserver la provenance. Les offres valides sont enregistrées et indexées par lots, sans attendre tous les sites.
4. Conserver la progression et les résultats partiels ; la découverte validée enrichit les cycles suivants. Les refus d’accès et limites de temps sont signalés.

### Quel délai attendre ?

- **Catalogue existant :** consultable immédiatement, même pendant un nouveau cycle.
- **Premières nouvelles offres :** dès la fin des premiers lots, généralement en quelques minutes si les sites répondent.
- **Passage large :** prévoir plusieurs dizaines de minutes ; **environ 30 minutes est un ordre de grandeur, pas une borne**. Un gros volume, des sites lents ou des reprises peuvent porter le cycle à plus d’une heure. Aucun délai ne garantit l’exhaustivité.
- **Passages suivants :** le cache peut réduire le temps de lecture, mais la disponibilité des sites et les contrôles restent déterminants.

La collecte comprend notamment 52 combinaisons de recherche finance et 24 Barista, en plus des autres sources. Elles sont placées avant le catalogue employeurs dans la file actuelle : les sources directes restent actives mais peuvent commencer plus tard. Les quatre créneaux sont partagés entre tous les connecteurs ; plusieurs requêtes vers le même hôte restent espacées, même si elles proviennent de collecteurs différents.

| Dernier passage observé le 8 novembre | Fiches récupérées avant traitement commun | Durée approximative du passage |
| --- | ---: | ---: |
| Airbus | 258 | 6 min |
| Thales | 610 | 12 min |
| Capgemini | 119 | 3 min |

Ces durées incluent la lecture et le traitement du connecteur ; elles ne s’additionnent pas directement puisque quatre collecteurs tournent en parallèle. Un seul grand employeur peut nécessiter des centaines de lectures de fiches. Les connecteurs employeurs espacent normalement les requêtes d’au moins 750 ms par hôte. Les budgets par source sont habituellement de 3 minutes pour les connecteurs personnels et de 15 minutes pour les autres, avec arrêt coopératif et conservation des résultats partiels ; ce ne sont pas des budgets pour le cycle entier. Les descriptions peuvent être réutilisées depuis un cache valide, puis les offres sont normalisées, classées, dédupliquées et indexées.

Dans **Bureau → Derniers passages des sources**, vérifiez les sites déjà passés, les volumes et les avertissements. La liste montre les 20 passages les plus récents, pas nécessairement toutes les sources du cycle. Laissez Jobly ouvert pour poursuivre le travail. Un déclenchement est prévu toutes les deux heures tant que l’application est ouverte ; si un cycle est encore actif, un second cycle n’est pas lancé en parallèle. Les filtres de recherche interrogent le catalogue local et ne déclenchent pas une nouvelle collecte complète.

## Scripts de collecte

Depuis le dépôt :

```bash
npm run sources:discover
npm run sources:discover -- --max-pages 100 --output reports/discovery.json
npm run sources:discover -- --no-directory
```

Une URL d'amorce supplémentaire peut être fournie, mais elle n'est pas obligatoire. Il n'est pas nécessaire de créer des fiches entreprise une à une. La CLI et l'application utilisent le même moteur.

`JOB_DISCOVERY_FILE` choisit le fichier d'état. Par défaut il se trouve sous `INGEST_CACHE_DIR/discovery/state.json`, ou `.cache/jobly/discovery/state.json` en développement. Dans l'application il est dans le cache du profil utilisateur, conservé lors des mises à jour. Les sauvegardes de données personnelles n'incluent pas le cache de découverte : après restauration sur un autre ordinateur, la découverte repart de ses amorces.

Le rapport conserve les pages inspectées, sources ajoutées, offres rencontrées, avertissements et échecs HTTP. Une source vide, inaccessible, interdite ou d'un format inconnu n'est jamais présentée comme une collecte exhaustive réussie. Un endpoint employeur validé peut ne proposer aucun stage dans les domaines recherchés.

Le catalogue additionnel est chargé automatiquement au cycle suivant, dédupliqué par endpoint avec le catalogue embarqué. Les sources HTML utilisent les listings/sitemaps réellement publiés ; les intégrations ATS utilisent leurs flux publics. Les API non publiques et les sites imposant une authentification ne sont pas contournés.

Pour exporter les offres sans base de données :

```bash
npm run collect:offers -- --sources hellowork-finance-stage-bts-assurance --output reports/assurance.json
```

Le résultat dépend de l'accès autorisé par le site au moment de l'appel. Importer ensuite un export passe par les mêmes règles métier, contrat et pays :

```bash
npm run ingest:file -- reports/assurance.json
```

Pour produire un ZIP natif depuis le code :

```bash
npm ci
npm run desktop:dist -- --publish never
npm run desktop:install-test
npm run desktop:delivery
npm run desktop:command-test
npm run desktop:delivery
```

La compilation nécessite l'outillage de développement ; l'utilisateur final installe uniquement le ZIP correspondant à sa plateforme avec la ligne du fichier COMMANDES.md. Les paquets Windows et macOS Intel se construisent et se testent sur leurs runners natifs de la CI.
