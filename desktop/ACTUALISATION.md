# Actualiser les offres — Jobly 0.3.0

La collecte démarre automatiquement à l’ouverture, puis toutes les deux heures pendant que Jobly reste ouvert. Le bouton **Actualiser** et le raccourci Cmd/Ctrl+Maj+R lancent aussi un cycle. Aucun compte ni clé API ne sont requis.

Les premiers lots sont consultables avant la fin du cycle. Les filtres interrogent le catalogue local : changer un contrat ne relance pas toutes les sources. Pour une autre commune, saisissez-la dans la recherche puis cliquez Actualiser ; les recherches locales France Travail/HelloWork utilisent cette commune au cycle suivant. La recherche nationale reste explicite et les collecteurs nationaux restent actifs.

**Actualisation & données** indique les sources sélectionnées, derniers passages, volumes, erreurs et couverture partielle. Une sélection vide active les collecteurs personnels fournis, pas l’ancien catalogue tech. Le retrait d’une source ne supprime pas vos favoris ni l’historique.

La date de publication est affichée uniquement lorsqu’elle est fournie par la source. La détection initiale et la dernière observation sont conservées séparément. Une offre ancienne peut être encore ouverte ; une observation récente n’est pas une nouvelle publication. Les publications connues de plus de 60 jours et échéances dépassées sont rejetées à l’ingestion. Une absence prolongée de vérification indique un état à revérifier ; un lien 404/410 ou une échéance passée peut établir l’expiration.

Le cache des pages de recherche est de 10 à 15 minutes ; celui des détails peut aller jusqu’à une heure. Actualiser ne contourne pas les limitations des fournisseurs. Les requêtes sont limitées par hôte, avec délais, budgets et respect des refus. Un passage partiel ne permet pas de conclure que les autres offres ont expiré.

Internet est nécessaire. Une source bloquée continue à être signalée, sans bloquer les autres. En cas de liste vide : vérifier l’univers et les filtres, attendre le premier cycle, puis élargir volontairement le rayon ou choisir la France. Les ASV sont rares localement et aucune offre n’est fabriquée pour remplir une liste.

Les données restent dans le dossier Jobly du profil système. Sauvegardez depuis Actualisation & données ; utilisez Réparer la recherche si les résultats semblent incohérents. Consultez [INSTALLER.md](delivery/INSTALLER.md) pour le dépannage et [SOURCES.md](../docs/v0.3.0/SOURCES.md) pour la couverture réelle.
