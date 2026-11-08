# Jobly 0.4.0 — analyse du projet et changements

## Architecture examinée

L'application Next.js/React utilise PostgreSQL et Prisma pour les offres, entreprises, candidatures, favoris, recherches sauvegardées et journaux de collecte. Meilisearch fournit la recherche avec un repli PostgreSQL. En mode serveur, BullMQ/Redis planifient la collecte ; en mode bureau, Electron orchestre le serveur local, PostgreSQL embarqué et Meilisearch, sans installation séparée de Node.js ou Docker. Les données restent dans le profil de l'utilisateur.

Le circuit principal est : connecteurs → offres brutes → normalisation du contrat, lieu et formation → classification métier → contrôle du périmètre → déduplication et provenance → indexation → recherche, favoris et candidatures. Les budgets, le throttle par hôte, Retry-After, les disjoncteurs et les journaux existaient déjà et ont été conservés.

## Problèmes identifiés

| Observation | Conséquence | Correction |
| --- | --- | --- |
| La découverte exigeait une URL fournie et produisait des propositions désactivées | Extension surtout manuelle du catalogue | Frontier persistante et validation des flux avant activation automatique |
| Les boards employeurs et plusieurs scripts rejetaient tous les métiers non tech | Ajouter un endpoint finance ne produisait pas d'offres visibles | Extension des constructeurs d'offres, du pipeline, de l'export, de l'import et de l'audit de périmètre |
| Finance et assurance étaient absents du vocabulaire et des familles de filtres | BTS Assurance et stages comptables classés hors périmètre | Domaine FINANCE et six familles de métiers |
| Les recherches généralistes s'arrêtaient aux premières pages | Les cycles répétaient la même petite fenêtre | Pagination progressive et curseur des détails pour les nouvelles sources nationales |
| Une découverte réseau suit des URLs issues de données externes | Risque d'accès au réseau local ou de redirection vers un hôte interne | Validation de l'URL, contrôle des adresses DNS et revalidation des redirections |
| Lecture HTTP et décompression sans plafond explicite | Une réponse énorme peut immobiliser l'exécutable | Lecture en flux bornée et plafond de décompression |
| Commandes d'installation dupliquées dans plusieurs fichiers | Divergence possible entre version, guide et commande testée | Modèle unique et génération des guides avant la compilation/livraison |
| Une ancienne preuve de même version pouvait être jointe à un nouveau paquet | Résultat de test attribué au mauvais code | Empreinte des sources, manifeste embarqué et contrôle de cohérence avant livraison |

## Découverte automatique

La source « Découverte automatique des recruteurs » fait avancer le travail à chaque cycle. Elle est sélectionnable comme les autres dans le Bureau. Aucun moteur de recherche payant ni navigateur automatisé n'est requis.

Les amorces viennent du catalogue existant, de l'inventaire de candidats déjà fourni avec le projet, des sites d'employeurs mentionnés dans les JobPosting et des annuaires publics. Wikidata est interrogé par pages d'entreprises françaises ; OpenStreetMap constitue un repli pour les établissements des secteurs suivis. Le second parcourt successivement les types node/way/relation par identifiants. Ces annuaires ne recensent pas toutes les entreprises françaises.

Le crawler suit les liens carrières pertinents et les intégrations ATS présentes dans le HTML ou les iframes. Il n'invente pas de sous-domaines, ne teste pas des milliers de slugs et n'exécute pas les scripts des sites. Il reconnaît Workday, Greenhouse, Lever, Ashby, SmartRecruiters, Recruitee et Teamtailor. Pour les pages classiques, il exploite JobPosting et les sitemaps publiés. Les pages HTML sont soumises à robots.txt. Un refus d'accès ne déclenche aucun contournement.

Un ATS n'est ajouté qu'après réception d'un tableau non vide d'annonces plausibles ; un site HTML doit publier au moins un JobPosting. Cela prouve un format exploitable, pas la présence garantie d'un stage pertinent aujourd'hui. Les offres passent ensuite les mêmes contrôles métier, contrat et pays que les autres connecteurs. Les nouveaux connecteurs sont disponibles dès le cycle suivant ; des offres JobPosting rencontrées pendant la découverte peuvent être ingérées immédiatement.

L'état enregistre les URLs, preuves, dates de vérification, pages dues et tentatives échouées. Les reprises sont différées de 1 à 30 jours selon les échecs. Les validations de plus de 30 jours ne sont plus chargées comme sources actives sans nouvelle vérification. La progression est écrite par remplacement atomique, y compris lorsque le budget de temps est atteint. Un état corrompu est conservé et signalé ; le catalogue embarqué reste utilisable.

Les limites sont explicites : 24 pages par cycle automatique, profondeur 3, 10 000 URLs en frontier, 2 000 sources découvertes, quatre détails maximum par page de découverte et budgets propres aux connecteurs. Elles protègent les sites et la machine. La collecte complète de chaque site ne peut pas être promise.

## Assurance, banque et finance

Six familles sont disponibles : assurance/BTS Assurance, banque, finance/contrôle de gestion, comptabilité, audit/risques/conformité, marchés financiers/investissement. Le titre décide en priorité ; un développeur chez un assureur reste tech et une fonction marketing assurance reste commerce. « Assurance qualité » n'est pas assimilé à l'assurance financière. Aucun accès à un modèle d'IA n'est nécessaire.

Treize termes de recherche génèrent automatiquement les combinaisons stage/alternance sur France Travail et HelloWork : 52 sources nationales, indépendantes du lieu personnel. Elles complètent les offres employeurs des ATS. Les nouvelles recherches parcourent jusqu'à huit pages par cycle et conservent leur progression. Une requête sans résultat ne prouve pas l'absence de stages en France.

La règle de périmètre est conservée pour les univers existants : tech en stage/alternance ; commerce, marketing et métiers animaliers selon leurs contrats existants. Le nouveau domaine finance est en stage/alternance. Il inclut les annonces adaptées à un BTS sans garantir qu'une annonce soit accessible à ce diplôme : les formations mentionnées restent consultables. Les communes françaises ne sont pas limitées aux grandes villes lorsqu'un pays FR est explicitement publié.

Les filtres, raccourcis, cartes d'accueil, recherche, import/export, fraîcheur, vérification de liens et version de reclassement utilisent le domaine ajouté. Le stockage des univers/familles étant textuel, aucune nouvelle migration d'enum PostgreSQL n'est nécessaire.

## Installation et livraison

La version devient 0.4.0. Le ZIP contient l'installateur natif, le guide, la commande, les empreintes SHA-256, le manifeste de compilation et les résultats de vérification disponibles. Les commandes existantes installent pour l'utilisateur, vérifient le fichier et lancent l'application. Leur génération dépend désormais de package.json et d'un modèle unique.

Le manifeste lie le paquet à l'empreinte du code et des ressources. L'assemblage refuse un code changé depuis la compilation ou un installateur antérieur à celle-ci. Une preuve de test n'est marquée valide que si sa version, sa plateforme, son architecture et son empreinte correspondent.

Les builds macOS arm64, macOS x64 et Windows x64 restent séparés, avec la CI native existante. Un Mac Apple Silicon ne permet pas de valider une installation Windows. La signature et la notarisation restent conditionnées aux certificats de publication. Aucun secret personnel n'est inclus dans les paquets.

## Validation et limites observées

Les tests couvrent notamment les familles finance, les exclusions de faux positifs, la recherche nationale, le parcours annuaire → entreprise → ATS → catalogue persistant, la reprise, robots.txt, les domaines internes, les redirections et la taille des réponses. Le test d'exécutable inclut un stage BTS Assurance synthétique isolé à Niort, le filtre national et des captures aux largeurs 390, 768 et 1440 pixels.

Un essai réseau borné de 50 pages a découvert et validé automatiquement le flux Teamtailor de Deezer. Les annuaires externes étaient indisponibles pendant cet essai ; certains sites renvoyaient HTTP 403. Ce résultat valide le suivi des liens et la découverte ATS en conditions réelles, pas une couverture de toutes les entreprises ni la collecte de toutes les offres finance. Un essai ciblé des requêtes BTS Assurance a aussi extrait deux annonces publiques HelloWork à Vincennes ; France Travail n’a renvoyé aucun lien exploitable sur ce test. La vérification a révélé que le champ INTERN peut couvrir l’apprentissage : une mention explicite de contrat d’apprentissage est désormais prise en compte avant de conclure à un stage. Les rapports réseau locaux sont dans reports/, exclus du ZIP.

Les résultats effectifs de compilation, d'installation et d'exécution sont décrits dans VERIFICATIONS.md et dans les preuves fournies avec la livraison. Les offres synthétiques de test ne sont pas intégrées au catalogue distribué.
