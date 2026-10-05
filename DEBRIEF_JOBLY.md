# Jobly — débrief du 5 octobre 2026

Jobly démarre localement avec son serveur et son worker. Le catalogue public vise les stages et alternances tech en France. Le bouton **Postuler** renvoie vers la fiche précise du site source. Les fournisseurs payants ou avec clé de collecte ont été retirés du circuit actif ; les endpoints JSON publics sans authentification restent utilisés lorsque les sites les exposent.

## Problèmes corrigés

- **CDI importés depuis une recherche « stage »** : le filtre de recherche d’un site ne prouve pas le contrat d’une annonce. Les collecteurs vérifient désormais le titre, les métadonnées et la description, avec rejet des preuves explicites de CDI. La recherche publique, ses facettes, les pages d’offres et les redirections imposent aussi stage/alternance. Le pipeline central rejette les imports non tech, étrangers ou hors contrat.
- **Pagination Workday interrompue** : certaines pages Airbus renvoient `total: 0` après la première. Le collecteur conserve le total initial, applique les facettes France + étudiant/apprenti et lit les détails de toutes les annonces de ce catalogue, sans sélection par mot-clé.
- **Offres manquantes dans les sitemaps** : les slugs ne sont plus utilisés comme preuve du métier ou du contrat. Les pages candidates sont lues avant le filtrage. Decathlon Digital dispose aussi d’un catalogue Greenhouse distinct du recrutement magasin.
- **Descriptions illisibles** : le HTML échappé Greenhouse est décodé, les balises retirées et les paragraphes/listes conservés. Les termes anglais `Apprentice` et `Apprenticeship` sont reconnus.
- **Faux positifs métier** : vente, merchandising, communication et RH ne deviennent plus « tech » à cause du mot digital, d’un outil bureautique ou de la présentation d’une entreprise. Le tri reste une règle heuristique : les métiers hybrides peuvent nécessiter une revue humaine.
- **Déduplication trop agressive** : deux annonces de même titre/ville avec des URL différentes sont conservées. L’identité repose sur la fiche source, avec normalisation des paramètres de suivi et des identifiants Workday/LinkedIn. Un même poste publié sur plusieurs plateformes peut encore apparaître plusieurs fois si aucun identifiant commun n’est disponible.
- **Collecte manuelle et lente** : lancement immédiat du worker, cycle toutes les 120 minutes, quatre sources en parallèle, cadence par hôte, retries limités, respect de Retry-After, cache persistant des détails publics, verrou Redis partagé et indexation Meilisearch par lots. Les refus d’accès sont signalés dans l’admin.
- **Résultats limités par l’index** : plafond Meilisearch porté de 1 000 à 50 000 résultats. Les budgets réseau restent bornés et toute limite atteinte est annoncée comme couverture partielle.
- **Connexion et interface** : connexion admin dirigée vers `/admin`, boutons OAuth affichés seulement lorsqu’ils sont configurés, erreurs de recherche explicites avec nouvelle tentative, nouveau logo SVG et favicon, nouvel accueil avec recherche/raccourcis, cartes d’offres et descriptions plus lisibles. Les menus, favoris et candidatures existants sont conservés.
- **Dépendances vulnérables** : passage à Next.js 15.5.24 et Auth.js beta.32, adaptation des paramètres et headers asynchrones, correctifs PostCSS/nanoid/deepmerge-ts. L’audit `npm audit --omit=dev` signale zéro vulnérabilité connue après mise à jour. Cela ne constitue pas un audit de sécurité exhaustif ; l’outillage de développement présente encore des avis npm.

## Couverture réellement contrôlée

Le catalogue contient **84 entrées, 83 activées, 80 entreprises distinctes**. Une source activée n’est pas nécessairement accessible ni porteuse d’offres ciblées. Les sources générales historiques s’ajoutent au catalogue entreprises.

| Catalogue | Annonces parcourues | Détails lus | Offres tech étudiantes retenues dans l’export |
|---|---:|---:|---:|
| Airbus France étudiant | 201 | 201 | 85 |
| Thales France étudiant | 105 | 105 | 93 |
| Ubisoft France | 119 | 45 | 10 |
| Sopra Steria France | 972 | 160 | 139 |
| ALTEN France | 702 | 84 | 76 |
| Wavestone France | 249 | 159 | 137 |
| Decathlon sitemap | 914 URL uniques | 914 | 1 |
| Decathlon Digital | 80 | 80 | 7 |

Les compteurs correspondent aux exports de validation, pas à une promesse de volume constant ni au nombre total d’une entreprise dans Jobly, qui peut aussi recevoir ses annonces depuis LinkedIn. SmartRecruiters expose les types de contrat dans ses listes : les détails des postes étudiants sont lus pour contrôler les missions. Onze pages du sitemap Decathlon ne contiennent plus de JobPosting exploitable ; le collecteur le signale et ne fabrique pas leurs fiches.

Rapports locaux, non versionnés : `reports/airbus-thales-complete-students.json`, `reports/smartrecruiters-complete-france.json`, `reports/decathlon-complete-france.json`. Des imports réels ont été effectués dans PostgreSQL et Meilisearch. Les mêmes URL actualisent les fiches existantes.

Le premier audit a retiré des résultats **177 fiches** et corrigé **16 contrats**, puis un deuxième passage a retiré **8 fiches supplémentaires**. Les anciennes fiches sont conservées comme expirées, avec sauvegardes `reports/scope-audit-*.json` ; ce ne sont pas des suppressions définitives. Le dernier contrôle effectué après la relance fait foi pour les corrections supplémentaires.

## Limites de collecte et solutions gratuites

- **Indeed** refuse actuellement la collecte directe (HTTP 403). Jobly accepte des alertes `.eml` déposées dans `data/job-alerts` : lecture locale des métadonnées, filtrage et lien exact vers Indeed, sans images ni pixels de suivi. Aucun email réel n’a été fourni : le parseur a été testé avec fixtures, mais la chaîne complète reste à valider avec une véritable alerte. Ce n’est pas une collecte exhaustive d’Indeed et aucune boîte mail n’est connectée.
- **LinkedIn** est collecté depuis les pages invitées accessibles, avec vérification de l’emploi et pagination plus large. Les quotas, refus et limites de pages sont respectés. Le site ne fournit pas de total public garantissant l’exhaustivité de ces recherches ; Jobly ne prétend donc pas couvrir toutes ses offres.
- Certaines autres pages publiques (notamment des fiches Welcome to the Jungle) bloquent l’accès ou changent leur rendu. Ces échecs restent visibles ; un résultat zéro en échec n’est pas présenté comme un catalogue vide vérifié.
- Des APIs gratuites existent, par exemple France Travail avec un compte développeur personnel. Une clé présente dans un dépôt public n’accorde pas le droit de l’utiliser. Aucune clé tierce trouvée sur GitHub n’a été réutilisée.
- L’accès à une page publique n’implique pas une autorisation de redistribution exhaustive. Les connecteurs utilisent les accès publics disponibles et ne contournent ni authentification, ni captcha, ni blocage.
- Les descriptions d’alertes email sont des extraits, pas des fiches complètes. Une alerte ne remplace jamais une description complète déjà enregistrée. Les annonces expirent après la période de fraîcheur configurée ; une fermeture peut prendre jusqu’au prochain contrôle/à l’expiration pour être reflétée.

Sources : [API Job Board Greenhouse](https://docs.greenhouse.io/job-board.html), [endpoints SmartRecruiters](https://developers.smartrecruiters.com/docs/endpoints), [Indeed — alertes emploi](https://support.indeed.com/hc/en-us/articles/204488890-Starting-Stopping-and-Managing-Job-Alerts), [API France Travail](https://www.data.gouv.fr/dataservices/api-offres-demploi), [carrières Decathlon Digital](https://digital.decathlon.net/jobs).

## Utilisation locale

```sh
docker compose up -d --build
npm run sources:list
npm run collect:offers -- --sources airbus,thales,decathlon,decathlon-digital --output reports/offers.json
npm run ingest:file -- reports/offers.json
npm run offers:audit
```

`npm run offers:audit -- --apply` applique les corrections réversibles après génération d’une sauvegarde. Le `.env` local configure les scripts et le compte admin, sans être versionné. Les services Docker sont liés à `127.0.0.1` et les volumes existants sont conservés. Connexion : `http://localhost:3000/connexion`, console : `/admin`, suivi : `/admin/sources`.

## Vérifications

- **172 tests** sur **26 fichiers** passent, dont pagination Workday, filtre public anti-CDI, rejet des imports hors périmètre, non-remplacement des descriptions complètes par des alertes et HTML Greenhouse échappé.
- TypeScript strict et ESLint : réussis. Build Docker de production : réussi sur Next.js 15.5.24 ; les messages Prisma concernant la base factice pendant la précompilation ne bloquent pas le build.
- Migrations déployées, génération Prisma et mise à jour de l’admin réussies.
- Contrôle HTTP local : authentification Victor avec rôle ADMIN, dashboard 200, accueil/offres/entreprises 200, recherche publique limitée aux deux contrats, seul provider `credentials` exposé.
- La vérification visuelle dans Chrome est effectuée après le dernier déploiement et sa portée est rapportée à la remise. Aucune conformité accessibilité complète n’est revendiquée.
