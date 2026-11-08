# Vérifications 0.4.1

- 373 tests Vitest réussis dans 46 fichiers, contrôle TypeScript et lint réussis.
- 16 tests couvrent directement Barista : reconnaissance des intitulés et missions, exclusion des faux positifs, contrats, département 31 et rayons autour d’Agen/Bordeaux, intégration des flux employeurs.
- Collecte publique réelle : une offre CDD « Hôte Point de Vente - Barista » à Blagnac extraite avec les paramètres géographiques corrigés. Aucun résultat pertinent garanti à Agen/Bordeaux lors de ce contrôle borné. Les postes de barman sans preuve de travail du café restent écartés.
- Construction Windows lancée sur un runner natif du dépôt privé depuis une branche dédiée. La version Mac est reconstruite avec le même code applicatif.

Les preuves finales d’installation, d’exécution et de commande sont dans chaque ZIP : VERIFICATION.md, verification.json et commande-verification.json. Les données de test sont isolées et exclues de la livraison. La couverture des sites reste partielle.
