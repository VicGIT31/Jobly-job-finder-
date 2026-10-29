# Architecture de bureau Jobly

Pour l’utilisation quotidienne, consultez le [guide d’actualisation des offres](ACTUALISATION.md) et le [guide d’installation](delivery/INSTALLER.md).

Electron ouvre la même interface Next.js, compilée en production avec `output: standalone`. Son runtime Node inclus lance le backend avec `utilityProcess.fork` ; aucun Node système ni serveur de développement n’est utilisé. PostgreSQL 18.4 est fourni par les binaires de `embedded-postgres` et lancé sur une interface loopback et un port disponible. `pg_ctl stop -m fast -w` assure un arrêt propre sur macOS et Windows.

Meilisearch est aussi embarqué dans sa version native, validée par SHA-256 depuis le manifeste `desktop/meilisearch.json`, puis lancé sur loopback avec une clé générée à l’installation. En édition bureau, les interfaces communes utilisent ce même moteur de recherche, un coordinateur en mémoire pour les verrous et limites de requêtes, un stockage de CV sur disque et une boîte de messages locale. Les données métier et le schéma restent ceux de la web app. Les migrations existantes sont exécutées une fois, avec suivi de checksum, dans la base locale. Les paramètres, filtres d’URL de consultation, mots de passe hachés, candidatures et offres restent des données métier ordinaires.

La collecte reprend le pipeline existant : validation, France, stage/alternance, périmètre tech, spécialité, déduplication, fraîcheur, budgets réseau, erreurs explicites et respect des refus des sites. Le menu et l’écran Bureau déclenchent la collecte ; le backend effectue un cycle à l’ouverture, puis toutes les deux heures. Aucun scheduler système n’est installé. La fermeture arrête les processus. L’édition bureau ne purge pas définitivement les anciennes offres, pour protéger le suivi personnel. Elle expire les offres périmées.

Le backend n’écoute que sur `127.0.0.1`. Un jeton éphémère par lancement protège ses routes et un cookie HttpOnly est placé dans la session Electron persistante. Les opérations privilégiées valident l’émetteur IPC et sa frame principale. Les pages n’ont pas accès à Node, le renderer est sandboxé et le contexte isolé. Les fenêtres externes sont refusées ; seules les URLs HTTP(S) publiques sont ouvertes dans le navigateur système. Les liens Postuler passent par le backend pour conserver le suivi avant l’ouverture extérieure.

## Construction native

Prérequis développeur : Node 22.12+ (24 LTS recommandé), npm, système et architecture cibles. Aucun de ces prérequis ne concerne l’utilisateur de l’installateur.

```
npm ci
npm run desktop:dist
npm run desktop:smoke -- --fresh
npm run desktop:delivery
```

La préparation embarque le serveur tracé, les assets, les migrations, les polices locales et les binaires PostgreSQL de la plateforme. Le script refuse un binaire absent et exclut tous les `.env`. Aucun compte réel, clé API, CV ou dump de développement n’est inclus. Une éventuelle sauvegarde d’une installation existante est privée et livrée séparément.

Cibles configurées : macOS arm64, macOS x64, Windows x64 (NSIS). Chaque build doit être exécuté sur la plateforme et l’architecture correspondantes. Windows ARM natif et Linux ne sont pas fournis. Consultez `.github/workflows/desktop.yml` pour la matrice native. Les tests des exécutables utilisent un profil isolé et des données synthétiques jamais copiées dans les installateurs.

## Signature et notarisation

Le build local peut être produit sans certificat et reste alors non signé/non notarisé. La configuration de production est prête, mais les accès suivants sont nécessaires avant une publication de confiance :

- macOS : certificat **Developer ID Application** exporté en `.p12` via `CSC_LINK` et mot de passe `CSC_KEY_PASSWORD`, plus notarisation via `APPLE_API_KEY` (chemin du fichier `.p8`), `APPLE_API_KEY_ID` et `APPLE_API_ISSUER`, ou `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`. Les binaires PostgreSQL et dylibs sont inclus dans la signature du bundle. Vérifier ensuite `codesign --verify --deep --strict` et `spctl --assess` sur le build signé ; le workflow doit être exécuté avec ces secrets sur les tags de publication.
- Windows : certificat Authenticode avec accès à sa clé privée (PFX `WIN_CSC_LINK` et `WIN_CSC_KEY_PASSWORD`, ou fournisseur de signature configuré dans electron-builder). Le workflow accepte un PFX stocké comme secret base64. Une identité matérielle/cloud doit être branchée au fournisseur si le certificat impose ce mode. La signature doit être contrôlée sur Windows avec `Get-AuthenticodeSignature`.

Les certificats et secrets de signature sont utilisés uniquement par la CI de publication ; aucun ne doit entrer dans les assets. Ne pas désactiver Gatekeeper ni SmartScreen pour distribuer l’application. Il n’existe pas encore de lien public de téléchargement dans ce dépôt.

## Limites assumées

La recherche utilise Meilisearch et ses réglages existants ; le repli PostgreSQL en cas de panne conserve ses limites antérieures (rayon approximatif et tri par date). Les emails sont des messages locaux, et OAuth/Anthropic ne sont pas activés sans backend de confiance. La collecte ne peut garantir la couverture de tous les sites.

Les paramètres personnels et sauvegardes contiennent des données privées non chiffrées par l’application ; les protections du compte utilisateur et du disque du système s’appliquent. Les archives de sauvegarde ont un format validé, un plafond de taille, des chemins vérifiés, une restauration transactionnelle et une sauvegarde préalable. Les données d’une installation web ne sont pas modifiées par l’export ni l’import.

Références : [sécurité Electron](https://www.electronjs.org/docs/latest/tutorial/security/), [processus utilitaires](https://www.electronjs.org/docs/latest/api/utility-process), [contenu des applications](https://www.electron.build/v26/docs/contents/), [binaires PostgreSQL embarqués](https://github.com/leinelissen/embedded-postgres).
