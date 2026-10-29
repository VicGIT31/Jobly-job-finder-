# Actualiser les offres dans Jobly

## Lancer une collecte

1. Ouvrez l’application Jobly et connectez l’ordinateur à Internet.
2. Choisissez **Fichier → Actualiser les offres**, ou utilisez **⌘⇧R** sur macOS et **Ctrl+Maj+R** sur Windows.
3. Consultez **Fichier → Bureau et messages locaux** pour suivre la collecte, les volumes récupérés et les erreurs des sources.
4. Laissez Jobly ouvert pendant le traitement. Les résultats arrivent progressivement ; un cycle complet peut prendre plusieurs dizaines de minutes, voire davantage selon les sources et les budgets réseau.

Le bouton **Actualiser les offres** de l’écran Bureau déclenche le même traitement. Si une collecte est déjà en cours, attendez sa fin ou utilisez **Arrêter la collecte**. Les résultats déjà traités restent conservés.

Une collecte automatique est demandée à l’ouverture, puis toutes les deux heures tant que l’application reste ouverte, lorsque les cycles automatiques sont activés. Fermer Jobly arrête ses composants et la collecte. Les cycles automatiques peuvent être suspendus depuis **Admin → Paramètres**.

## Comprendre les dates et les résultats

La date visible sur une offre est sa **date de publication sur le site d’origine**. Elle ne devient pas la date du jour lorsque Jobly revérifie l’annonce. Une offre publiée la semaine précédente peut donc rester disponible et avoir été vérifiée aujourd’hui.

Une collecte peut créer de nouvelles offres, mettre à jour des offres existantes ou confirmer qu’une annonce connue est toujours présente. Un bilan avec zéro création ne signifie pas nécessairement un échec. Consultez également les offres récupérées, les mises à jour et les éventuels avertissements.

La recherche conserve ses filtres et se réactualise toutes les minutes lorsqu’elle est visible. Pour afficher la page à nouveau immédiatement, utilisez **Affichage → Recharger**. Retirez les filtres trop restrictifs si les nouvelles offres ne correspondent pas à la recherche courante.

## Choisir les sources

Sur l’écran Bureau, ouvrez **Sources de la collecte**, sélectionnez les sites souhaités puis cliquez sur **Enregistrer les sources**. La sélection s’applique aux prochains cycles et persiste entre les lancements. Une sélection vide active toutes les sources disponibles du catalogue. Les critères France, stage/alternance et périmètre tech restent appliqués par le pipeline.

## Résoudre les problèmes courants

- **Pas de nouvelles offres** : vérifiez Internet, les sources sélectionnées, les filtres et les bilans. Une source peut n’avoir aucune nouvelle annonce correspondant au périmètre.
- **HTTP 403 ou 401** : le site refuse l’accès automatisé. Relancer ne garantit pas de lever ce blocage ; aucun contournement n’est effectué.
- **HTTP 429** : le site limite le débit. Jobly respecte les délais et les garde-fous du connecteur.
- **Collecte partielle ou budget atteint** : seuls les résultats déjà récupérés sont conservés ; cela ne prouve pas que tout le catalogue a été parcouru.
- **Données présentes mais recherche incohérente** : utilisez **Réparer la recherche** sur l’écran Bureau. Cela reconstruit l’index depuis la base locale, sans contacter les sites ni inventer de nouvelles offres.
- **Service local indisponible** : fermez puis relancez Jobly. Le menu **Aide → Afficher les données et le journal** donne accès à `jobly.log`. Ne supprimez pas le dossier de données.

La collecte dépend de sites externes dont la disponibilité et les formats évoluent. Jobly ne peut pas garantir une couverture exhaustive ni l’ajout de nouvelles offres à chaque cycle.
