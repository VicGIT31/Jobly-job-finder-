# Décisions techniques — 0.3.0

- Version mineure pré-1.0 : 0.2.0 → 0.3.0 ; aucun saut artificiel vers 1.6.0.
- Conserver Electron, Next.js standalone, PostgreSQL et Meilisearch embarqués, les protections loopback et l’isolation du renderer.
- Remplacer l’authentification par un profil local unique. Garder les anciennes tables comme support de migration compatible, sans écran ni mécanisme d’authentification actif. Sauvegarde avant conversion ; fusion prudente des relations et archivage des profils secondaires et CV.
- Ajouter les métadonnées des univers et métiers sans supprimer les offres antérieures. Distinguer date de publication connue, première détection et dernière vérification. Ne pas présenter un contrat, salaire, lieu ou télétravail absent comme une certitude.
- Connecteurs publics organisés par format (RSS Teamtailor, JSON-LD/HTML, flux publics) ; pas de clés personnelles obligatoires et pas de contournement des refus.
- Déduplication par URL canonique puis identité de poste et empreinte de contenu, avec conservation de la provenance. Même employeur seul ne suffit jamais à fusionner deux postes.
- Rayon calculé par distance géodésique, pas seulement une boîte rectangulaire. Localisation inconnue exclue d’un rayon strict et signalée dans la recherche nationale.
- Mesures et tests simulés séparés des collectes réelles. CI native pour Windows et les deux architectures Mac, sans prétendre à une exécution avant retour des jobs.

- Windows : démarrage via `pg_ctl`, qui crée le processus PostgreSQL avec un jeton Windows restreint. Le démarrage direct de `postgres.exe` refusait le parent administrateur de la CI ; aucune élévation, création de compte Windows ou désactivation de protection n’est nécessaire. Arrêt explicite du cluster à la fermeture, vérifié par refus de connexion au port précédent. Voir [pg_ctl officiel](https://www.postgresql.org/docs/18/app-pg-ctl.html) et [son implémentation Windows](https://github.com/postgres/postgres/blob/master/src/bin/pg_ctl/pg_ctl.c).

## Fusion des interfaces et des catalogues (2 novembre 2026)

- **Interface 0.2 conservée comme base** (accueil, facettes, cartes), enrichie des apports 0.3 : sans compte, provenance, suivi de la collecte. Le moteur de recherche V3 séparé est supprimé : une seule recherche (`server/search/query.ts`) sert tous les domaines.
- **Un seul classifieur** (`server/ingest/job-classifier.ts`), même méthode que les spécialités tech : rôle nommé dans l’intitulé, signaux forts (×3) et faibles (×1), texte de missions (`offerMissionText`), seuil de suffisance. Il rend le domaine, le métier, la spécialité tech, une confiance, les indices du classement et des attributs déduits du texte.
- **Périmètre par offre, pas par connecteur** : la tech reste en stage ou alternance ; commerce, communication, ASV et animalier acceptent tous les contrats. En cas de conflit entre un métier tech et un métier de vente, le contrat tranche : hors stage et alternance, la vente l’emporte.
- **Santé animale** : un vétérinaire n’est jamais un ASV. Le contexte de l’employeur (groupe ou clinique vétérinaire, association de protection animale) qualifie un intitulé générique, jamais seul. Un titre de vente reste de la vente (« vendeur conseil capacitaire »), retrouvé par l’attribut « Univers animalier ».
- **Classement explicable, sans fraîcheur de collecte** : nouveauté = date de publication si elle est connue, sinon date de première détection (moins pondérée). La dernière observation ne sert qu’à pénaliser une annonce qu’on ne revoit plus. La pertinence textuelle de Meilisearch est réintégrée.
- **Zone** : recherche nationale par défaut (mélange des domaines) ; un rayon de 30 km s’applique dès qu’une commune est choisie. La zone de collecte locale reste Toulouse tant qu’une autre commune n’est pas choisie.
- **Pages recruteurs** : les employeurs qui publient un flux ou des fiches structurées sont des sources du catalogue (formats Teamtailor RSS complété par sitemap, sitemap + JSON-LD, API REST WordPress, listes JSON-LD avec repli sur le texte de la fiche). Les cabinets indépendants sont découverts dans OpenStreetMap autour de la zone ; leur site n’est lu que si son `robots.txt` l’autorise, et les adresses issues d’OpenStreetMap sont refusées si elles visent le réseau local. Aucun job board dont les conditions interdisent la reproduction n’est collecté.
- **Reclassement des offres existantes** une fois par version du classifieur, au premier démarrage ; rien n’est supprimé.
