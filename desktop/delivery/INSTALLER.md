# Installer et lancer Jobly

Ce document est un guide. Il ne lance aucun programme d’installation.

## macOS

La distribution actuelle exige macOS 13 ou ultérieur.

1. Dézippez la livraison si nécessaire.
2. Dans `installateurs/`, choisissez le DMG correspondant : `arm64` pour Apple Silicon (M1, M2, M3, M4 et suivants), `x64` pour Intel. Le type de puce apparaît dans le menu Apple → À propos de ce Mac.
3. Double-cliquez sur le fichier `.dmg`.
4. Glissez **Jobly** dans **Applications**.
5. Éjectez le disque d’installation.
6. Lancez **Jobly** depuis Applications ou Launchpad.
7. Au premier lancement, créez votre compte local, ou importez votre sauvegarde depuis l’écran Bureau.

La livraison locale peut être non signée et non notarisée : consultez VERIFICATION.md. Si macOS refuse de l’ouvrir, utilisez une version signée/notarisée fournie par l’éditeur pour une installation de confiance. Il n’est pas demandé de désactiver Gatekeeper ou une protection du système. La préparation technique de la signature et de la notarisation est incluse dans le dépôt ; l’éditeur doit fournir son identité Apple Developer avant publication.

## Windows

1. Vérifiez qu’un véritable fichier `Jobly-…-win-x64.exe` figure dans `installateurs/`. S’il est absent, cette livraison ne contient pas encore de build Windows ; ne renommez pas le DMG.
2. Sur Windows 10/11 x64, double-cliquez sur l’installateur `.exe`.
3. Suivez l’assistant et choisissez le dossier d’installation. L’installation est propre à votre utilisateur et ne demande normalement pas de droits administrateur.
4. Ouvrez **Jobly** depuis le menu Démarrer ou le raccourci du Bureau.
5. Créez votre compte local ou importez une sauvegarde.

La compilation native Windows est automatisée dans le dépôt. Aucun résultat Windows n’est présenté comme testé si le build et les tests n’ont pas été exécutés. Sans certificat Authenticode, l’éditeur ne peut pas promettre un parcours sans avertissement SmartScreen. Ne désactivez pas SmartScreen ; utilisez une distribution de confiance signée par l’éditeur.

## Utilisation quotidienne

- Ouvrez Jobly depuis son icône. Le backend local démarre automatiquement.
- Les nouvelles offres arrivent progressivement. La première collecte peut durer plusieurs dizaines de minutes selon les sources ; les résultats déjà collectés restent consultables.
- **Fichier → Bureau et messages locaux** indique la progression et les erreurs par source.
- **Fichier → Actualiser les offres** démarre une collecte immédiate. Les filtres de la recherche continuent de s’appliquer après actualisation.
- Les raccourcis habituels copier/coller et sélectionner tout sont disponibles ; les formulaires de CV utilisent le sélecteur de fichiers natif.
- Fermez Jobly pour arrêter ses composants locaux. Les données restent sur disque.

## Vérifier un téléchargement

Ces commandes de contrôle sont facultatives pour l’utilisation, et ne sont pas un programme d’installation.

macOS, depuis le dossier de livraison :

```
shasum -a 256 -c SHA256SUMS.txt
```

Windows, PowerShell :

```
Get-FileHash .\installateurs\Jobly-0.2.0-win-x64.exe -Algorithm SHA256
```

Comparez le résultat à la ligne correspondante de SHA256SUMS.txt. Un hash garantit la cohérence avec ce manifeste ; l’authenticité de l’éditeur requiert sa signature et une source de téléchargement de confiance.

## Dépannage

**Fenêtre de préparation persistante ou démarrage impossible** : fermez Jobly, vérifiez l’espace disque disponible et relancez. Le menu Aide donne accès à `jobly.log`. Ne supprimez pas le dossier `postgres/` : il contient vos données.

**Aucune offre immédiatement** : connectez-vous à Internet, lancez une actualisation et consultez le dernier passage des sources. Un refus HTTP, une limite de débit ou une source sans stage actuel peut donner zéro résultat. Aucune collecte exhaustive n’est garantie.

**Hors connexion** : la consultation des données locales fonctionne, mais les offres ne sont plus mises à jour et les candidatures externes nécessitent Internet. Certains logos peuvent disparaître.

**Lien de réinitialisation** : ouvrez Bureau → Messages locaux. Les messages ne sont pas envoyés dans votre boîte email externe.

**Import** : attendez la fin de la collecte. L’application demande une confirmation et conserve une sauvegarde avant de remplacer les données locales. Relancez ensuite l’application. Les données de la web app d’origine restent intactes.

**Supprimer l’application** : déplacez Jobly dans la corbeille sur macOS, ou utilisez Paramètres → Applications sur Windows. Les données utilisateur restent conservées. Faites une sauvegarde avant toute suppression manuelle de ces données.
