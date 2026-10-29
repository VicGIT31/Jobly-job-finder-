# Analyse et validation de Jobly bureau

## Périmètre analysé

Le projet est une application Next.js App Router (React, TypeScript, Tailwind), avec authentification Auth.js/Prisma, stockage métier PostgreSQL, recherche Meilisearch, tâches BullMQ/Redis et CV sur S3/MinIO. Les connecteurs collectent des sources publiques puis normalisent les contrats, dédupliquent, classent les spécialités, contrôlent le périmètre tech et France, gèrent l’expiration et synchronisent l’index. L’interface possède des filtres combinables, favoris, offres masquées, suivi de candidatures, profil/CV, alertes, insights et administration.

L’analyse a couvert les points de lancement/build, les migrations et modèles, l’authentification, le stockage, les adaptateurs de recherche, les workers, les points d’entrée de collecte, le catalogue, les budgets et verrous, les emails, les actions utilisateur et l’interface de recherche. Les connecteurs bénéficiaient déjà d’une suite de tests : ils n’ont pas été réécrits. L’analyse ne constitue pas une certification exhaustive de chaque source externe ni un audit de sécurité indépendant.

## Choix d’architecture

Electron réutilise directement l’interface et le serveur Next.js de production. Il embarque PostgreSQL et Meilisearch natifs. Le stockage bureau des CV et la boîte de messages locale remplacent les services nécessitant des secrets serveur. Les verrous et limites utilisent un coordinateur en mémoire dans l’unique backend local. Le scheduler appartient au cycle de vie de l’application. La version web reste disponible avec ses adaptateurs Redis/S3 habituels.

Les polices de marque sont désormais locales : la compilation ne dépend plus de Google Fonts. Les caches de collecte et les données de développement sont explicitement exclus du serveur tracé et de la préparation des paquets. Le backend est protégé sur loopback et le renderer Electron reste isolé et sandboxé. Les liens Postuler suivent le parcours de suivi avant ouverture dans le navigateur système.

## Vérifications locales du 29 octobre 2026

- macOS Apple Silicon, Darwin 25.6, architecture arm64. Le DMG a été construit, contrôlé par `hdiutil verify`, monté et son bundle copié dans `/Applications/Jobly.app`. Les tests ont ensuite lancé cet exemplaire installé.
- 218 tests automatisés réussis dans 33 fichiers. TypeScript et ESLint réussis ; compilation de production Next.js réussie.
- Exécutable lancé depuis la racine en lecture seule (condition de lancement Finder), avec un PATH ne contenant ni Node/npm ni Docker. Les outils restent installés sur la machine ; une machine vierge n’a pas été testée. Les services Docker Jobly ont été arrêtés avant le test du DMG installé.
- Création de compte, connexion, filtres combinés (contrat, spécialité, ville, télétravail, niveau), recherche Meilisearch, favoris, alerte, CV PDF privé, boîte locale de réinitialisation, choix de sources et sauvegarde/restauration vérifiés.
- Raccourci de recherche et collage depuis le presse-papiers système vérifiés. Le parcours Postuler enregistre le suivi puis demande l’ouverture du navigateur système ; cette ouverture a été interceptée par l’automatisation pour éviter une navigation externe pendant le test.
- Arrêt du serveur et de PostgreSQL puis persistance de la session, des favoris, des filtres, des sources et du CV après relancement vérifiés.
- Collecte réelle Free-Work : 12 offres récupérées et créées, sans erreur dans le bilan du cycle vérifié. Ce contrôle n’est pas une validation de toutes les autres sources.
- État hors connexion vérifié. Captures desktop, petite fenêtre, tablette 768 px et mobile 390 px générées et effectivement ouvertes. Correction des champs du premier lancement après revue ; absence de débordement horizontal contrôlée sur les vues testées. Cela ne remplace pas un audit complet d’accessibilité.
- Aucun fichier `.env`, aucune archive privée `.jobly`, et aucune correspondance avec les secrets de développement contrôlés dans les ressources de l’application installée.

Les preuves détaillées sont dans `reports/desktop/` (non versionné), notamment `verification.json`, `network.json`, `dmg-verification.txt` et les captures PNG. Les tests emploient un profil isolé et des données synthétiques, exclus des distributions.

## Données existantes

Une archive privée compatible est conservée dans `.cache/Jobly-donnees-existantes.jobly`, séparée de la livraison publique. Elle contient les 7 546 offres et 5 comptes de la base existante. Un ancien CV est référencé par cette base mais absent du bucket source ; sa référence et un avertissement sont conservés dans l’archive, mais aucun fichier ne peut être inventé. L’archive a été importée et vérifiée dans le profil local de l’application installée : 7 546 offres, 5 comptes et 1 333 entreprises. La base d’origine reste conservée.

## Ce qui reste à vérifier avant publication générale

Windows x64 et macOS Intel sont configurés dans la matrice de compilation native, mais aucun build ou test de ces systèmes n’a été exécuté dans cette session macOS arm64. Il n’y a pas d’EXE Windows ni de DMG Intel présenté comme disponible. Windows ARM natif et Linux ne sont pas des cibles préparées.

Le DMG local n’est pas signé Developer ID ni notarisé. Pour une distribution macOS de confiance, fournir le certificat Apple et les accès de notarisation documentés dans README.md, puis construire et contrôler la version signée. Pour Windows, fournir une identité Authenticode et vérifier l’installateur sur Windows. Aucune désactivation de Gatekeeper ou SmartScreen n’est prescrite.

L’usage hors ligne couvre les données locales ; l’actualisation, les candidatures, certains logos et le géocodage de nouvelles villes nécessitent Internet. Les emails sont des messages locaux et les services OAuth/IA à secret serveur ne sont pas distribués. La couverture exhaustive des sites externes n’est pas garantie.
