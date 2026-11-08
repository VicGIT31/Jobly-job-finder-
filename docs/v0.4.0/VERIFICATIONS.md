# Vérifications Jobly 0.4.0

- 357 tests réussis dans 45 fichiers Vitest.
- TypeScript sans erreur et lint sans avertissement ni erreur.
- Build Next.js de production et paquet Electron macOS arm64 réussis.
- DMG vérifié, monté en lecture seule, copié dans un dossier de test puis exécuté avec un profil isolé.
- Test de la commande documentée contre le véritable ZIP réussi, sans modifier les protections système.
- Les deux preuves portent la même empreinte de sources que le manifeste embarqué : 08e49b78ffbfd1a96a3e90dec8571f5d453ea96bf2f67cf37aabcf83c5052a90.
- Recherche finance nationale et famille BTS Assurance testées dans l’exécutable avec une fixture synthétique à Niort, exclue de la livraison.
- Recherche, favoris, recherche sauvegardée, candidature, CV PDF, sauvegarde/restauration, raccourci clavier, copier-coller, mode hors connexion, fermeture et persistance au redémarrage vérifiés.
- Captures mobile 390 px, tablette 768 px et desktop 1440 px produites et ouvertes pour revue ; pied de page corrigé après revue puis paquet reconstruit et retesté. Aucun débordement horizontal détecté dans les vues testées.
- Réseau réel : un flux Teamtailor découvert automatiquement sur un lot de 50 pages ; deux fiches BTS Assurance extraites de HelloWork. Les annuaires externes étaient indisponibles et certains sites ont refusé l’accès.

## Limites

Seul macOS Apple Silicon est empaqueté et testé ici. Windows x64 et macOS Intel restent configurés dans la CI, sans preuve d’exécution produite pendant cette intervention. Le paquet macOS local est sans signature Developer ID ni notarisation faute de certificat disponible. Les protections de macOS restent actives.

Les contrôles portent sur une machine de développement, avec PATH privé de Node/npm/Docker pour le lancement de l’application ; aucune machine vierge ni validation exhaustive de l’accessibilité n’a été utilisée. La couverture des sites et offres reste partielle.

Les preuves automatiques détaillées se trouvent dans reports/desktop, reports/installer et reports/command-install. Le ZIP comprend VERIFICATION.md, verification.json et commande-verification.json.
