# Publication 0.5.0

Les installateurs sont construits depuis le même code et une empreinte des sources. La matrice GitHub Actions exécute les tests, le build natif, l'installation de l'artefact produit, puis la commande d'installation documentée. Un ZIP n'est vérifié que lorsque ses preuves portent l'empreinte de son build.

La Release doit contenir les installateurs, ZIP, commandes et SHA-256 des plateformes effectivement validées. Voir [VERIFICATIONS.md](VERIFICATIONS.md) pour le résultat final des contrôles. Les données privées et les clés personnelles ne sont pas des artefacts de livraison.

Une mise à jour du logiciel conserve le profil local. L'actualisation des annonces est automatique ; le remplacement de l'exécutable reste explicite. Les signatures éditeur dépendent des certificats disponibles, sans suppression des protections du système.
