# Historique des versions

## 0.5.0 — Stages IA et collecte progressive

Option B mise en œuvre : correction commune/campus et réparation du catalogue, lieux secondaires, thèmes IA complémentaires sans changer les métiers principaux, missions indexées, collecte par lots et rotation persistante, sources IA servies dès le départ avec les autres métiers. Découverte des liens officiels et adaptateurs Workable/Inria.

Option C intégrée par l’accès Tavily officiel sans clé (plafond local 10/jour, 300/mois), avec repli automatique vers B ; clé personnelle facultative. Suivi complet du cycle et filtre cinq jours sans suppression. Migration compatible des données locales et sauvegarde des implantations.

Voir [collecte et configuration](docs/v0.5.0/COLLECTE.md) et [vérifications](docs/v0.5.0/VERIFICATIONS.md).


## 0.4.1 — 8 novembre 2026

- Installateur Windows x64 construit et testé sur un runner natif : installation NSIS, fonctionnement et commande PowerShell utilisant le ZIP validés.
- Paquet Mac Apple Silicon mis à jour et testé avec le même périmètre fonctionnel.
- Domaine Café & barista : Haute-Garonne entière, Toulouse, Agen et Bordeaux ; tous les contrats reconnus. 24 requêtes géographiques générées et filtre des localisations.
- Extension Assurance/BTS Assurance, banque, finance, comptabilité, audit et investissement dans toute la France, en stage et alternance ; 52 recherches nationales générées.
- Découverte autonome persistante des recruteurs, sept familles d’ATS, vérification des flux, reprises différées et contrôles réseau des URLs découvertes.
- Import/export, classement, filtres, fraîcheur, navigation et suivi des sources adaptés aux nouveaux métiers.
- Guides et commandes issus d’un modèle unique ; manifeste d’empreinte des sources et preuves d’installation associées aux ZIP.
- 373 tests unitaires et 13 contrôles de l’exécutable sur chacune des plateformes Windows x64 et macOS arm64. Paquets non signés ; couverture des offres partielle.

Téléchargements et documentation : [version 0.4.1](https://github.com/VicGIT31/Internship-finders/releases/tag/v0.4.1), [vérifications](docs/v0.4.1/VERIFICATIONS.md).

## 0.4.0 — étape de développement

Découverte automatique des sources, domaine Assurance/finance national, pipeline et scripts de collecte étendus, sécurisation des URLs publiques et premiers paquets macOS. Intégrée dans la livraison 0.4.1 ; voir [l’analyse](docs/v0.4.0/ANALYSE.md).


## 0.3.0 — historique, publication non finalisée à cette étape

Application personnelle sans compte qui **fusionne l’interface et le catalogue des versions 0.1/0.2 (tech, stages et alternances) avec les nouveaux métiers** : commerce, marketing, communication, auxiliaires vétérinaires (ASV) et métiers animaliers. Une seule recherche, une seule ingestion, un seul classement.

- **Classement unifié** (`job-classifier.ts`), même méthode que les spécialités tech : rôle nommé dans l’intitulé, signaux forts/faibles, texte de missions, seuil de suffisance. Pour la santé animale, le contexte de l’employeur qualifie un intitulé générique sans jamais l’inventer ; trois familles (ASV, accueil et gestion de clinique, soins animaliers/refuges) et des attributs déduits du texte.
- **Recherche unifiée** : domaines mélangés, métier ou spécialité, expérience, détails de l’annonce, rayon exact, repli PostgreSQL ; classement explicable fondé sur la date de publication (ou de première détection), jamais sur la date de dernière collecte.
- **Interface 0.2 conservée** (accueil, facettes, cartes) avec les apports 0.3 : sans compte, provenance multi-sources, suivi de la collecte, hors connexion, derniers résultats conservés en cas d’erreur.
- **Sources** : groupes et employeurs de la santé animale (IVC Evidensia, Fovéa, Univet, Argos, SPA, Fondation Brigitte Bardot, ENVT, Beauval, Maxi Zoo), requêtes communication, vente et soins animaliers, découverte des cabinets autour de la zone. Respect de `robots.txt` pour les pages d’employeurs.
- **Corrections** : « manager » n’est plus un indice de poste senior ; la fraîcheur ne dépend plus de la dernière collecte ; l’assertion « Postuler » des tests natifs attend l’événement au lieu d’un délai fixe. Les commandes d’installation macOS et Windows avec contrôle SHA-256 sont incluses dans les guides. La publication des deux installateurs attend une dernière matrice Windows verte et les artefacts CI associés.

## 0.2.0 — 29 octobre 2026

Application de bureau Electron, PostgreSQL et Meilisearch embarqués, CV locaux, boîte locale, sauvegardes/import, guides et CI native. DMG Apple Silicon construit et testé localement ; Windows et Mac Intel configurés mais non construits dans cette session. Authentification et périmètre stage/alternance tech encore présents.

## 0.1.0 — historique du dépôt

Application web Jobly, agrégation et classement de stages/alternances tech, favoris, suivi et administration. Voir les commits du dépôt pour l’historique détaillé.
