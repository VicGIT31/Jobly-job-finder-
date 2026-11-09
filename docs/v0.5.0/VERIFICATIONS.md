# Vérifications 0.5.0

## Contrôles de développement

Les tests existants et les nouveaux tests couvrent notamment les thèmes IA hybrides, l'exclusion des stages juridiques d'un employeur IA, les lieux secondaires, Workable, Inria, l'enregistrement progressif, l'ordonnancement et les quotas du complément de recherche. **399 tests réussis dans 50 fichiers**, TypeScript sans erreur et lint sans avertissement.

## Sources publiques — 9 novembre 2026

Test de découverte autonome dans un état isolé, sans ingestion dans le profil personnel : Mistral AI, Hugging Face et Inria sont identifiés depuis des liens officiels. Les adaptateurs retenus récupèrent trois stages français Mistral AI et huit stages de recherche Inria ; Hugging Face ne fournit pas de stage correspondant lors du contrôle. Les contrats juridiques sont écartés. La première passe a aussi permis de corriger le plafond de taille du flux Ashby et l'extraction des sous-sections de missions.

Le mode Tavily officiel sans clé a répondu HTTP 200 avec des résultats réels. Cela confirme son fonctionnement à cet instant, pas une disponibilité ou un quota garantis. Le premier lot du sondage isolé est apparu en environ 18 secondes, et les lectures principales ont pris environ 33 secondes ; ces durées n'incluent pas un cycle complet du logiciel sur toutes les sources.

Les données détaillées de diagnostic restent dans `reports/`, ignoré par Git. Les résultats de marché sont des instantanés et ne démontrent pas l'exhaustivité de la collecte.

## Exécutables et commande d’installation

La [matrice native GitHub Actions](https://github.com/VicGIT31/Internship-finders/actions/runs/42638328603) a terminé avec succès pour Windows x64, Mac Apple Silicon et Mac Intel, sur le commit applicatif `38ebde6`. Chaque plateforme a exécuté 15 vérifications fonctionnelles sur l’installateur produit, puis les mêmes parcours après la commande d’installation documentée.

Les contrôles incluent la réparation d’un ancien campus Thales, les sujets IA hybrides conservant leur spécialité principale, les lieux secondaires dans un rayon, les autres domaines, les favoris, les recherches sauvegardées, le CV, les candidatures, le Bureau, le mode hors connexion, la sauvegarde/restauration et le redémarrage. Les données de test sont synthétiques et isolées.

Le Mac Apple Silicon a aussi été construit et testé localement, puis le ZIP a été installé via sa commande. Les captures du Bureau ont été ouvertes et examinées à 390, 768 et 1440 px sur Mac, et à 390/1440 px sur Windows. Les assertions d’absence de débordement ont passé aux trois largeurs. Cela ne constitue pas un audit complet d’accessibilité ni un parcours humain Gatekeeper/SmartScreen sur une machine vierge.

Les ZIP Windows et Intel ont été téléchargés et leurs installateurs extraits. Les SHA-256 correspondent aux manifestes inclus ; les preuves fonctionnelles et de commande correspondent à l’empreinte de leur build.

- Sources Mac : `d28d2cdfdfd349b9d4a574d52c67d729c91cce90b43a7b45482bde2cac312dac`.
- Sources Windows : `c20eedd6520891c4bb3aa646b8198c270c6f6408ab0f86113f5c15971f04a71b`.

La différence est expliquée et reproduite par un checkout CRLF suivi de la régénération des guides : la simulation locale obtient exactement l’empreinte Windows. Ce n’est pas une différence d’algorithme.

## Installation existante

L’application Mac installée a été mise à jour en 0.5.0. Une sauvegarde privée complète des données utiles a été créée après correction d’une erreur de copie (dossier cible précréé), en conservant la base et les fichiers personnels et en excluant les index/caches reconstructibles et anciens paquets d’installation. Aucune purge définitive n’a été exécutée.

Sur la copie de l’ancien catalogue, les 31 fiches Thales IA portant un lieu toulousain et sans coordonnées sont toutes résolues dans le rayon de 30 km. La réparation effective dans l’installation a ensuite été confirmée en lecture seule : les 31 fiches sont géolocalisées et le marqueur de reclassification 0.5.0 est appliqué. Les données personnelles contrôlées sont conservées.

Le contrôle de collecte sans ingestion valide trois stages Mistral ; le catalogue personnel en conserve deux après application de sa règle globale d’âge de publication (60 jours). Les huit stages de recherche Inria apparaissent dans le catalogue. Les seuils de publication restent ceux documentés ; un endpoint accessible n’implique pas que tous ses résultats passent tous les filtres.
