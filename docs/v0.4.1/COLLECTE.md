# Collecte autonome sans clé

L'installation de bureau ne demande aucune configuration de fournisseur. Une connexion Internet suffit à lancer les sources publiques ; le catalogue déjà présent reste consultable hors connexion. Les sources qui demandent des identifiants ne sont pas nécessaires à ce circuit.

La découverte automatique est activée par défaut. La source se sélectionne dans le Bureau comme les autres connecteurs. En mode serveur, `JOB_DISCOVERY_ENABLED=0` la désactive. Les sélections explicites de sources sont respectées : une sélection restrictive n'inclut pas implicitement tous les futurs employeurs.

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
