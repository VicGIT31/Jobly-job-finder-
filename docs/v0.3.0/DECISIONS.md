# Décisions techniques — 0.3.0

- Version mineure pré-1.0 : 0.2.0 → 0.3.0 ; aucun saut artificiel vers 1.6.0.
- Conserver Electron, Next.js standalone, PostgreSQL et Meilisearch embarqués, les protections loopback et l’isolation du renderer.
- Remplacer l’authentification par un profil local unique. Garder les anciennes tables comme support de migration compatible, sans écran ni mécanisme d’authentification actif. Sauvegarde avant conversion ; fusion prudente des relations et archivage des profils secondaires et CV.
- Ajouter les métadonnées des univers et métiers sans supprimer les offres antérieures. Distinguer date de publication connue, première détection et dernière vérification. Ne pas présenter un contrat, salaire, lieu ou télétravail absent comme une certitude.
- Connecteurs publics organisés par format (RSS Teamtailor, JSON-LD/HTML, flux publics) ; pas de clés personnelles obligatoires et pas de contournement des refus.
- Déduplication par URL canonique puis identité de poste et empreinte de contenu, avec conservation de la provenance. Même employeur seul ne suffit jamais à fusionner deux postes.
- Rayon calculé par distance géodésique, pas seulement une boîte rectangulaire. Localisation inconnue exclue d’un rayon strict et signalée dans la recherche nationale.
- Mesures et tests simulés séparés des collectes réelles. CI native pour Windows et les deux architectures Mac, sans prétendre à une exécution avant retour des jobs.
