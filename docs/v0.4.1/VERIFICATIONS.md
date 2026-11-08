# Vérifications 0.4.1

- 373 tests Vitest réussis dans 46 fichiers, contrôle TypeScript et lint réussis.
- 16 tests couvrent directement Barista : reconnaissance des intitulés et missions, exclusion des faux positifs, contrats, département 31 et rayons autour d’Agen/Bordeaux, intégration des flux employeurs.
- Collecte publique réelle : une offre CDD « Hôte Point de Vente - Barista » à Blagnac extraite avec les paramètres géographiques corrigés. Aucun résultat pertinent garanti à Agen/Bordeaux lors de ce contrôle borné. Les postes de barman sans preuve de travail du café restent écartés.
- Windows x64 : construction, installation NSIS, lancement de l’application et installation depuis le ZIP par la commande PowerShell réussis sur un runner Windows natif. 13 contrôles d’exécutable réussis.
- macOS arm64 : construction, installation du DMG, 13 contrôles d’exécutable et installation par la commande du ZIP réussis.
- Captures Barista à 390, 768 et 1440 px ouvertes et examinées sur les deux plateformes ; contrôles de débordement réussis.
- ZIP Windows téléchargé localement, cohérence des manifestes et preuves vérifiée ; empreinte SHA-256 du véritable .exe contrôlée.
- Build Windows : https://github.com/VicGIT31/Internship-finders/actions/runs/42486479883 ; commit 003f1ef07af20de37f28070f46481e659b8a7743, branche dédiée sans modification de main.
- Les deux installateurs sont non signés. La machine Windows est un runner de développement/CI ; aucune machine vierge ni validation exhaustive de l’accessibilité n’a été utilisée.

Les preuves finales d’installation, d’exécution et de commande sont dans chaque ZIP : VERIFICATION.md, verification.json et commande-verification.json. Les données de test sont isolées et exclues de la livraison. La couverture des sites reste partielle.
