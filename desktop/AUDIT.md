# Audit et livraison — Jobly 0.3.0

## Origine

Base 0.2.0 : Next.js 15, React, Prisma/PostgreSQL, Meilisearch, pipeline d’ingestion tech stage/alternance, Auth.js et stockage S3 pour la version web ; Electron avec services embarqués pour le bureau. Historique réel : commit 9173159, sans tag de version. Le périmètre élargi justifie 0.3.0.

## Solution

Electron est conservé : il réutilise le serveur Next.js et les composants Node existants. Une migration vers Tauri ajouterait un deuxième runtime sans retirer le backend requis. Le paquet contient Electron, Next standalone, PostgreSQL 18.4 et Meilisearch 1.56. Les polices et l’icône existantes sont conservées.

Les processus locaux écoutent uniquement sur loopback. Le renderer est sandboxé et isolé, sans accès Node. Le backend est protégé par jeton éphémère et cookie HttpOnly. Les actions IPC vérifient leur émetteur. Les liens externes HTTP(S) sont ouverts dans le navigateur système. Les CV, préférences, sauvegardes et index vivent dans le dossier de données du système et ne sont jamais embarqués dans les distributions.

## Mode personnel

Connexion, inscription, récupération, vérification d’adresse et gestion des utilisateurs sont retirées. Le schéma historique reste pour migrer les relations, puis sert à un seul profil local. La migration regroupe favoris, recherches, notes et candidatures, archive les autres profils et références de CV, et efface les anciens moyens d’authentification. Une sauvegarde complète précède cette opération dans le lanceur de bureau.

## Recherche et sources

Deux univers : Commerce/Marketing et ASV. Classification par intitulé et synonymes, exclusion des vétérinaires et métiers enseignants, géographie exacte par Haversine, rayon 30 km, national explicite, informations inconnues conservées. Les offres enregistrent provenance, publication connue, détection et observation. Les regroupements intersites sont prudents ; ils ne fusionnent pas deux postes sur la seule base d’un employeur et d’un intitulé proches.

Les sources publiques sont isolées par connecteur, avec budgets, cache, limite de concurrence et états partiels. Aucune clé de source ni secret serveur n’est distribué. La disponibilité des sources HTML publiques n’est pas contractuelle. La collecte, les candidatures et certains enrichissements nécessitent Internet. Aucun backend distant Jobly n’est indispensable.

## Vérification et limites

Les mesures réelles, tests des exécutables et limites de chaque plateforme sont consignés dans les documents de release et VERIFICATION.md du ZIP. Les tests synthétiques des parcours sont distingués des mesures sur sources réelles. Sans certificats fournis, les exécutables ne sont pas signés par un éditeur reconnu et les DMG ne sont pas notarisés.

Le runtime se lance sans Node/npm/Docker dans son PATH ; cette vérification n’équivaut pas à l’installation manuelle sur une machine vierge. Une installation classique reste à contrôler sur les systèmes disposant de protections de téléchargement, particulièrement avant diffusion à un large public.
