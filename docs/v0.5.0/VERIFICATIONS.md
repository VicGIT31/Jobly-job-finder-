# Vérifications 0.5.0

## Contrôles de développement

Les tests existants et les nouveaux tests couvrent notamment les thèmes IA hybrides, l'exclusion des stages juridiques d'un employeur IA, les lieux secondaires, Workable, Inria, l'enregistrement progressif, l'ordonnancement et les quotas du complément de recherche. Les résultats définitifs et les preuves natives seront ajoutés après l'exécution des contrôles.

## Sources publiques — 9 novembre 2026

Test de découverte autonome dans un état isolé, sans ingestion dans le profil personnel : Mistral AI, Hugging Face et Inria sont identifiés depuis des liens officiels. Les adaptateurs retenus récupèrent trois stages français Mistral AI et huit stages de recherche Inria ; Hugging Face ne fournit pas de stage correspondant lors du contrôle. Les contrats juridiques sont écartés. La première passe a aussi permis de corriger le plafond de taille du flux Ashby et l'extraction des sous-sections de missions.

Le mode Tavily officiel sans clé a répondu HTTP 200 avec des résultats réels. Cela confirme son fonctionnement à cet instant, pas une disponibilité ou un quota garantis. Le premier lot du sondage isolé est apparu en environ 18 secondes, et les lectures principales ont pris environ 33 secondes ; ces durées n'incluent pas un cycle complet du logiciel sur toutes les sources.

Les données détaillées de diagnostic restent dans `reports/`, ignoré par Git. Les résultats de marché sont des instantanés et ne démontrent pas l'exhaustivité de la collecte.
