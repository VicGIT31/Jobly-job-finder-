# Jobly 0.5.0 — mise en œuvre de l'audit stages IA

Le [rapport initial](../audits/2026-11-09-stages-ia.md) décrit les défauts de 0.4.1. La [collecte actuelle](COLLECTE.md) décrit les corrections et la configuration.

## Changements livrés

- Lieux Workday : commune prioritaire, campus conservé, géocodage commun, réparation des anciennes fiches et lieux français secondaires.
- Thèmes IA complémentaires et recherche bilingue contrôlée ; missions indexées en entier dans la limite définie, sans réaffecter tous les métiers à IA.
- Enregistrement/indexation des lots pendant les sources compatibles ; reprise de pagination Workday et rotation des recherches tech.
- Quatre créneaux partagés équitablement ; critères finance, assurance, commerce, ASV et barista conservés.
- Découverte depuis des sites officiels et validation des liens réels ; adaptateurs Workable et Inria ; premières offres dans le cycle de découverte.
- Complément Tavily officiel sans clé, borné et désactivable, avec repli automatique. Aucune clé tierce trouvée sur GitHub n'est utilisée.
- Suivi des sources du cycle, vraies dates d'exécution, sauvegarde/restauration des nouvelles données, filtre cinq jours réversible.

## Données et compatibilité

Migration `20261109160000_ai_collection` : tags persistants, libellé de site et table `offer_locations`, fin/cycle des passages de collecte. Les archives anciennes restent importables avec les valeurs par défaut des nouvelles colonnes. Les sauvegardes nouvelles incluent les implantations ; les CV, favoris et candidatures restent locaux.

Le cache des flux découverts conserve ses limites de taille et de réseau. Les validations JSON ATS peuvent lire jusqu'à 8 Mo, car le flux Mistral complet dépassait le plafond de découverte HTML de 2 Mo. Les pages HTML gardent leur plafond et les contrôles DNS/robots existants.

Le filtre de spécialité IA conserve les fiches historiquement classées IA et ajoute les sujets hybrides porteurs du thème IA/ML. Une recherche textuelle entière IA/AI vise le thème IA/ML plus précis ; Data/BI reste disponible séparément. La pertinence n'est pas une preuve qu'un stage convient au candidat.

Les [vérifications](VERIFICATIONS.md) distinguent tests sur fixtures, sources publiques et installateurs natifs. Le programme ne fait pas de candidature automatique.
