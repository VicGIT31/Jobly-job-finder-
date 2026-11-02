# Réalisation priorisée — 0.3.0

État initial : commit `9173159`, version 0.2.0, 218 tests documentés, aucun tag de version local. Collecte limitée à France + tech + stage/alternance ; recherche sans Commerce/ASV ; authentification encore obligatoire pour les données personnelles. DMG arm64 local existant ; Windows/Intel auparavant seulement configurés.

| Priorité | Travail | Acceptation | État |
|---|---|---|---|
| P0 | Audit et mesures initiales | Architecture et limites consignées, baseline réelle | Réalisé |
| P0 | Profil personnel et migration | Recherche immédiate, zéro écran de connexion ; données antérieures conservées | Réalisé et vérifié |
| P0 | Référentiel métiers et métadonnées | ASV exclut les vétérinaires ; contrats et inconnues corrects | Réalisé et vérifié |
| P0 | Sources réelles et collecte progressive | Sources indépendantes, premier lot rapide et provenance enregistrée | Réalisé et vérifié |
| P0 | Recherche et géographie | Toulouse 30 km, distances exactes, national explicite, synonymes | Réalisé et vérifié |
| P1 | Classement, doublons et liens | Explications, regroupement prudent et statuts vérifiables | Réalisé et vérifié |
| P1 | Interface personnelle | Favoris/recherches/suivi sans compte, états lisibles, responsive revu | Réalisé et vérifié |
| P1 | Vérifications réelles | Six scénarios, délais, volumes, échantillon et liens consignés | Réalisé et vérifié |
| P1 | Paquets natifs et mise à jour | DMG/EXE correspondant au même commit, persistance après mise à jour, ZIP vérifié par cible | Builds et tests réussis sur plusieurs commits ; artefact Windows final non disponible, matrices récentes incomplètes |
| P1 | Documentation et release | Version, notes, ZIP, commit, tag, publication et liens réels | Guides et commandes poussés ; aucun tag/release créé tant que le ZIP Windows n’est pas validé |

Les résultats et blocages sont suivis dans VERIFICATIONS.md ; les choix dans DECISIONS.md et les sources dans SOURCES.md. Ne cocher une tâche qu’après le contrôle indiqué.
