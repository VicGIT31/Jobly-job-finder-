# Publication Jobly 0.4.1

La release [v0.4.1](https://github.com/VicGIT31/Internship-finders/releases/tag/v0.4.1) regroupe les ZIP et les installateurs vérifiés Windows x64 et macOS Apple Silicon. Le dépôt reste privé. Il faut un compte autorisé pour télécharger sur GitHub ; le fichier téléchargé peut ensuite être transmis directement à un ami.

Les exécutables sont des assets de Release, pas des fichiers ajoutés à Git. Les dossiers `release/`, `delivery/`, `.cache/`, `reports/`, les `.env` et les sauvegardes personnelles restent exclus du dépôt.

## Fichiers distribués

- `Jobly-0.4.1-win-x64.exe` : installation Windows par double-clic.
- `Jobly-0.4.1-win32-x64.zip` : installateur Windows, guide, commande PowerShell et preuves.
- `Jobly-0.4.1-mac-arm64.dmg` : installation Mac Apple Silicon.
- `Jobly-0.4.1-darwin-arm64.zip` : DMG, guide, commande shell et preuves.
- `SHA256SUMS.txt` : empreintes des quatre fichiers publiés.

Les paquets sont non signés. Ne pas désactiver les protections du système. La version Mac Intel n’est pas incluse tant qu’un build 0.4.1 propre à cette cible n’a pas été validé.

## Provenance

Le [build Windows natif](https://github.com/VicGIT31/Internship-finders/actions/runs/42486479883) a construit et testé le code au commit `003f1ef07af20de37f28070f46481e659b8a7743`, depuis la branche de construction dédiée. Le paquet Mac a été construit et testé localement. Les modifications de publication apportent la documentation, l’historique et les liens de téléchargement ; les exécutables correspondent au code applicatif déjà vérifié.

Chaque ZIP contient `build-manifest.json`, `verification.json`, `commande-verification.json` et `SHA256SUMS.txt`. Le manifeste et les deux preuves portent la même empreinte de sources pour leur plateforme. Le SHA-256 du véritable installateur a été contrôlé après téléchargement du ZIP Windows.

## Pour une prochaine livraison

1. Actualiser `package.json`, les guides générés et les documents de version.
2. Compiler sur chaque plateforme cible ; exécuter les tests d’installation puis la commande documentée contre le ZIP.
3. Assembler à nouveau la livraison pour y joindre la preuve de commande. Ne pas attribuer une ancienne preuve à un code modifié.
4. Publier les installateurs et ZIP de la version avec leurs SHA-256 dans une Release GitHub, puis mettre à jour le README.

L’installation conserve le dossier des données de l’utilisateur. Le programme n’installe pas automatiquement ses futures versions ; l’actualisation automatique concerne les offres.
