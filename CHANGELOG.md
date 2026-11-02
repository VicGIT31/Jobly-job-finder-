# Historique des versions

## 0.3.0 — candidate, publication en attente

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
