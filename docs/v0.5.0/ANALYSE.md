# Jobly 0.5.0 — mise en œuvre de l'audit stages IA

Le [rapport initial](../audits/2026-11-09-stages-ia.md) décrit les défauts de 0.4.1. La [collecte actuelle](COLLECTE.md) décrit les corrections et la configuration.

## Architecture et décisions maintenues

L'interface et les routes serveur partagent une seule application Next.js/React en TypeScript. Prisma gère PostgreSQL ; Meilisearch fournit la recherche, avec un repli PostgreSQL. Les routes `/api/search`, `/api/cv` et `/go/[offerId]` servent respectivement la recherche, les CV et la redirection vers l'annonce d'origine. Les slugs identifient les pages lisibles ; les relations utilisent les identifiants internes. Ouvrir « Postuler » enregistre le suivi, sans soumettre une candidature à un site tiers.

Le [mode bureau](../../desktop/README.md) conserve Electron pour réutiliser le backend Node et le serveur Next.js standalone. PostgreSQL et Meilisearch sont embarqués. Redis/BullMQ et MinIO restent utilisés pour le développement web local ; le bureau les remplace par un coordinateur en mémoire et des fichiers privés locaux. Le profil est personnel, sans authentification ; les anciennes tables et migrations sont conservées pour les installations existantes. Les champs de pays et de contrats historiques restent lisibles même si les nouveaux collecteurs ciblent la France selon les règles de chaque métier.

Le pipeline commun dans `src/server/ingest/` valide les champs, normalise les contrats, classe le métier, vérifie les dates, déduplique et indexe les offres. La déduplication conserve l'identité de la fiche source : un employeur et un intitulé similaires ne suffisent pas à fusionner deux postes. Les contrôles de périmètre portent sur l'offre elle-même, pas sur le mot-clé qui a permis de la trouver. Les extraits d'alertes ne remplacent pas une description complète existante. L'indexation se fait par lots, attend le résultat des tâches Meilisearch et peut être réparée depuis la base.

Le suivi des candidatures, les rappels, les statistiques et les scores de correspondance fonctionnent sans IA. Le texte des CV PDF est extrait localement puis comparé lexicalement aux offres ; il n'est pas envoyé à un modèle pour ce score. Les brouillons utilisent l'interface `AiProvider` : gabarit déterministe sans clé, appel Anthropic facultatif en mode web. Le champ `isRealAi` distingue les deux ; une erreur du fournisseur n'est pas présentée comme un succès. La configuration des services web est regroupée dans le [README](../../README.md#développement-web-local).

Les règles de classement et de géographie actuelles s'appuient sur les décisions de [0.3.0](../v0.3.0/DECISIONS.md) puis sur les corrections décrites ci-dessous. Les anciennes études Europe/Asie et les mesures datées d'octobre restent dans [l'historique Git](https://github.com/VicGIT31/Internship-finders/tree/c6a7be1a03086788a3a52f9844958444f77e3857) ; elles ne définissent pas le périmètre actuel.

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
