# Vérifications — 0.3.0

État au 2 novembre 2026 : les trois installateurs natifs sont construits et testés ; validation des commandes copiables et publication en cours. Ne pas interpréter une compilation configurée comme un installateur testé.

## État initial mesuré

Base personnelle 0.2.0 observée sans mutation : 8 293 offres stockées, 1 840 actives ; quatre intitulés commerce/marketing et aucun ASV parmi les données existantes. Le pipeline antérieur rejetait les CDI/CDD et métiers non tech. Compte obligatoire pour les favoris, aucun rayon 30 km. Rapport privé `reports/v0.3.0/baseline.json`.

## Collecte réelle après corrections

`node --import tsx scripts/verify-personal-sources.ts --cold`, 2 novembre 2026. Cache public vide, réseau de la machine de développement, quatre connecteurs simultanés, budget trois minutes par source. Pas de fixture. Le benchmark filtre les publications connues de plus de 60 jours et les échéances dépassées.

- Premier lot accepté : **1,65 s** (AniCura national ; cela n’est pas le délai du premier résultat commercial local).
- Cycle de collecte et contrôle de liens : **161,96 s**.
- **472 liens d’offres distincts**, avant regroupement intersites. Volumes détaillés dans SOURCES.md.
- **28 contrôles de liens**, tous HTTP 200, titre retrouvé dans la page, aucun avis d’expiration détecté. Échantillon opportuniste de deux annonces par connecteur non vide ; recouvrements possibles, pas un audit de tous les liens.

| Recherche réelle | Résultats distincts par lien avant regroupement |
|---|---:|
| Commerce, Toulouse 30 km | 83 |
| Marketing, Toulouse 30 km | 43 |
| ASV, Toulouse 30 km | 1 |
| ASV, France entière | 90 |
| Commerce/marketing, Lyon 30 km | 9 |
| Marketing, Paris 30 km | 15 |

Ces nombres proviennent d’un export normalisé des réponses réelles. Les résultats finaux de l’application peuvent diminuer après regroupement intersites et vérifications de disponibilité. Les recherches nationales sont partielles et le nombre local d’ASV est faible ; aucun élargissement silencieux n’est effectué.

## Contrôles de développement réussis

258 tests métier à ce stade : univers, synonymes, exclusion des vétérinaires et enseignants, communes voisines, distance exacte, inconnues de salaire/publication/télétravail, repli PostgreSQL, recherche nationale, formats RSS/JSON-LD, déduplication conservatrice et fonctions historiques. Fixtures simulées pour les tests unitaires.

`npm run lint` : réussi sans avertissement ESLint. `npm run build` : compilation et types réussis avec Next.js 15.5.28 ; runtime de production standalone généré. Les avertissements de dépréciation de `next lint` et de configuration Vite ne signalent pas un échec des contrôles.

## Exécutables, migration et revue visuelle

DMG macOS arm64 construit localement. Première exécution empaquetée : accès direct sans compte, recherche Meilisearch et univers, favoris/recherches, presse-papiers ; débordement de navigation observé à 768 px puis corrigé. Captures 390 et 768 px ouvertes et examinées. Rejeu complet empaqueté macOS arm64 réussi : presse-papiers, recherche, favoris, recherches sauvegardées, CV, candidature, restauration, ancien accès redirigé, erreur réseau, hors connexion, persistance et arrêt. Revue 390/768/1440 px, fiche, erreur et profil importé : captures effectivement ouvertes et examinées.

Migration réelle 0.2.0 → 0.3.0 réussie avec les deux exécutables successifs et un profil synthétique isolé : deux utilisateurs → un profil ; trois lignes de favoris → deux favoris distincts, deux recherches, deux candidatures (conflit conservé en entrée manuelle), deux historiques et deux CV accessibles. Sauvegarde avant migration contrôlée.

Parcours réseau réel dans l’exécutable : recherche ouverte en 2,08 s, premier résultat local en 46,57 s, premier favori enregistré en 46,99 s ; recherche enregistrée et lien de candidature ouvert sans envoyer de formulaire. Cycle de 147,25 s, 467 offres actives (379 Commerce/Marketing, 88 ASV), dont une offre regroupée entre deux sources. Requêtes finales Meilisearch entre 4,9 et 10,6 ms sur six scénarios, après collecte, une mesure par scénario. Il s’agit du candidat avant les dernières corrections de pertinence ; leur rejeu final et les installations natives Windows/Intel sont en cours.

Aucune identité Developer ID locale et aucun secret de signature dans le dépôt GitHub. Signature éditeur, notarisation macOS et Authenticode Windows non disponibles sans certificats et accès Apple. Les preuves et ZIP préciseront leur état réel. Aucun contournement global des protections système n’est proposé.

## Limites et preuves

Les rapports de travail et données personnelles restent dans `reports/` et `.cache/`, ignorés par Git. Les ZIP ne doivent contenir que les guides, installateurs, empreintes et preuves assainies. Les exécutables sont testés avec PATH sans Node/npm/Docker, sur des machines qui possèdent néanmoins ces outils ; une machine vierge et un parcours humain Gatekeeper/SmartScreen ne sont pas équivalents à ces tests.

## Échantillon de pertinence relu

21 annonces publiques issues de six scénarios, sélection déterministe parmi les dix premières de chaque export, recouvrements supprimés : intitulé, entreprise, localisation, contrat, qualification et extrait de missions examinés. 17 correspondances directes ; trois postes voisins à examiner (études de marché des talents, alternance publiée par un organisme de formation, achats/category management). Un testeur de logiciels Marketing/CRM était un faux positif et a été exclu par correction du référentiel. Le category management orienté achats est désormais classé en distribution. Cet échantillon restreint n’est pas une estimation statistique de précision globale.

La déduplication retire les recouvrements d’URL et regroupe les répliques très proches entre hôtes distincts, sans fusionner deux réquisitions d’un même site. Un regroupement intersite a été réellement obtenu. Des doublons résiduels restent possibles : 18 groupes à intitulé/employeur/commune identiques dans l’export initial, qui ne suffisent pas à prouver l’identité d’un poste. La conservation prudente des postes distincts prime sur l’annonce d’un taux nul artificiel.

## Validation finale du paquet et mise à jour réelle

Dernier paquet installé testé sur macOS 26.6.2 arm64 : ouverture en 4,59 s, favori synthétique en 5,29 s, parcours complets réussis et refus de connexion au port PostgreSQL après fermeture. Le DMG a été vérifié, monté en lecture seule, copié puis éjecté avant lancement.

Rejeu des sources dans le paquet installé définitif avec profil personnel neuf et cache public réutilisé : fenêtre en 2,27 s, premier résultat local en 8,37 s et premier favori en 8,79 s ; cycle de 38,09 s. 466 offres actives (378 Commerce/Marketing, 88 ASV), une offre regroupant deux sources. Six recherches : commerce Toulouse 83 ; marketing Toulouse 43 ; ASV Toulouse 1 ; ASV France 88 ; commerce Lyon 7 ; marketing Paris 12. Durées des requêtes 3,6–10,9 ms. Le cache est explicitement différent de l’essai à froid : ces deux délais ne prouvent pas à eux seuls un gain algorithmique causal.

Mise à jour réelle dans `/Applications/Jobly.app` effectuée, avec copie privée préalable de l’ancien programme et des données, puis sauvegarde automatique `avant-0.3.0.jobly`. Les cinq anciens profils sont devenus un profil sans mot de passe. Les 8 317 identifiants d’offres préexistants sont tous conservés, ainsi que les recherches, candidatures, notes et historiques présents avant migration. De nouvelles offres et actions personnelles peuvent s’y ajouter ; aucune donnée privée n’est intégrée aux livraisons.

CI native [41459620221](https://github.com/VicGIT31/Internship-finders/actions/runs/41459620221), commit `805eea5` : macOS 15 arm64, macOS 15 Intel x64 et Windows Server 2025 x64 ont tous réussi compilation, exécution de l’installateur puis tests de l’exécutable installé. Le refus PostgreSQL du parent Windows administrateur a été corrigé par `pg_ctl` ; arrêt et relancement du cluster testés. Windows 10/11 n’ont pas fait l’objet d’un essai manuel sur poste vierge.

## Commandes d’installation copiables

Ajoutées au README, INSTALLER.md et DEMARRER.html, avec boutons de copie et scripts de livraison. Téléchargement préalable du ZIP via le navigateur autorisé nécessaire, car le dépôt est privé. Aucun lien public inventé, jeton demandé, `ExecutionPolicy Bypass`, suppression de quarantaine ou désactivation de protection.

Commande macOS exécutée sur le ZIP réel et application résultante testée avec les mêmes parcours. Contrôle SHA-256 et version du bundle avant installation. Les deux boutons HTML copient exactement leur commande dans Chromium, avec autorisation du presse-papiers ; le bloc reste sélectionnable en cas de refus. PowerShell est en cours de validation native dans la dernière matrice de livraison.
