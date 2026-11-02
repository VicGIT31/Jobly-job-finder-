# Inventaire des sources — 0.3.0

Vérification réelle du 2 novembre 2026, cache vide, France, intitulés Commerce/Marketing ou ASV, publication connue dans les 60 derniers jours et échéance non dépassée. Les valeurs sont un instantané de collecte, pas une promesse de volume futur. Les lignes France Travail/HelloWork sont plusieurs recherches d’un même fournisseur, pas des fournisseurs indépendants.

| Connecteur | Accès public réellement testé | Offres acceptées dans ce passage | Limites |
|---|---|---:|---|
| AniCura France | [RSS Teamtailor](https://emplois.anicura.fr/jobs.rss) | 9 | ASV France ; exclusions par publication ancienne ; flux périodique |
| France Travail commerce Toulouse | [Recherche candidat](https://candidat.francetravail.fr/offres/recherche?motsCles=commercial&lieux=31555&rayon=100) et descriptif public du site | 40 | Deux pages ; périmètre collecté 100 km, filtrage local strict ensuite |
| France Travail marketing Toulouse | Site candidat public | 34 | Deux pages, publication souvent inconnue ; modification non utilisée comme publication |
| France Travail ASV Toulouse | Site candidat public | 3 | Localisations précises filtrées ensuite : trois collectées à 100 km ne signifient pas trois à 30 km |
| Mon Véto | [Pages carrières et JobPosting](https://www.recrutement-monveto.com/recherche/) | 2 | Description du contenu principal si absente du JSON-LD ; pages publiques partielles |
| Sevetys | [Carrières ASV / JobPosting](https://nous-rejoindre.sevetys.fr/offres/?poste%5B%5D=asv) | 13 | Expirations et dates anciennes exclues ; pas tous les postes vétérinaires |
| JYSK France | [Posting API employeur](https://api.smartrecruiters.com/v1/companies/JYSK/postings?country=fr) | 49 | France uniquement, 160 détails maximum par cycle ; autres fonctions exclues |
| METRO France | [Posting API employeur](https://api.smartrecruiters.com/v1/companies/METROMAKRO/postings?country=fr) | 108 | France et métiers pertinents, 160 détails maximum |
| France Travail ASV France | Recherche nationale du site candidat | 33 | Deux pages ; recouvre partiellement la recherche locale |
| France Travail marketing France | Recherche nationale du site candidat | 36 | Deux pages ; couverture nationale partielle |
| France Travail commerce France | Recherche nationale du site candidat | 20 | Pagination publique non exhaustive ; ne pas prétendre à tout France Travail |
| HelloWork commerce Toulouse | [Recherche publique](https://www.hellowork.com/fr-fr/emploi/recherche.html?k=commercial&l=Toulouse-31000&ray=100), JSON-LD | 60 | Deux pages, 60 détails maximum ; type MIME JSON-LD encodé pris en charge |
| HelloWork marketing Toulouse | Recherche publique et JSON-LD | 38 | Deux pages ; classement du métier par intitulé |
| HelloWork ASV France | Recherche publique nationale et JSON-LD | 33 | Certains détails sans données structurées lisibles, signalés |
| Argos | [Carrières du groupe](https://groupe.argos-veterinaire.com/nous-rejoindre/) | 0 | Liens trouvés, mais aucun détail JobPosting exploitable dans ce passage ; source signalée comme partielle |

Total : **472 liens d’offres distincts**, avant regroupement intersites par identité/contenu ; somme des lignes supérieure à ce total à cause des recouvrements entre recherches. Sept fournisseurs ont donné au moins une offre : AniCura, France Travail, Mon Véto, Sevetys, JYSK, METRO, HelloWork. Argos ne compte pas comme couverture obtenue.

## Contrat technique et précautions

Les connecteurs essentiels utilisent uniquement les réponses anonymes réellement obtenues, sans clé personnelle. Le [format RSS Teamtailor](https://support.teamtailor.com/en/articles/11171756-rss-feed-how-to-guide) et les [endpoints SmartRecruiters](https://developers.smartrecruiters.com/docs/endpoints) sont documentés par leurs éditeurs. Seules les publications publiques sont demandées ; aucune lecture de postes internes, compte ou jeton d’entreprise n’est utilisée.

Les interfaces HTML et descriptifs anonymes France Travail ne sont pas une API partenaire contractuelle. Leur disponibilité et leur format peuvent changer. Une éventuelle API partenaire nécessiterait un backend de confiance et ses identifiants ; elle n’est pas annoncée comme intégrée dans cette version. Aucun CAPTCHA, connexion, interdiction HTTP ou limitation n’est contourné. Les 403/429, budgets, délais et passages partiels sont consignés.

Recherche : cache 10 min ; RSS 15 min ; détails jusqu’à 1 h ; géocodage public 30 jours. Concurrence globale de quatre connecteurs, pools de détails limités à trois, délais par hôte et budget de trois minutes par source. Source suivante dès qu’un créneau se libère. Aucune collecte intégrale pour un simple changement de filtre.

Le lieu de collecte local suit la commune choisie lors d’une actualisation explicite ; Toulouse reste la valeur initiale. Les collecteurs nationaux échantillonnent les pages accessibles, ils ne couvrent pas exhaustivement toutes les villes.

## Référentiel géographique

Les communes de Haute-Garonne et leurs centres sont embarqués depuis [l’API officielle des communes](https://geo.api.gouv.fr/decoupage-administratif/communes), téléchargement du 2 novembre 2026 : `https://geo.api.gouv.fr/departements/31/communes?fields=nom,code,codesPostaux,centre`. Les autres communes françaises sont résolues via cette API publique, si une correspondance exacte est trouvée. Une localisation vague n’est pas assimilée à Toulouse. Les distances indiquées restent des approximations de position basées généralement sur le centre communal.

## Sources étudiées et non promises

Les agrégateurs et recruteurs spécialisés ASV (notamment VetoJob), les pages de cliniques et réseaux, les offres PDF et les réseaux sociaux peuvent compléter la recherche manuelle. Aucun accès structuré stable n’a été validé ici pour ces services : ils ne sont pas comptés comme intégrés. Une page « nous recrutons régulièrement » n’est pas transformée en offre active. Les flux ou sites sans accès public exploitable ne reçoivent pas de faux résultats de substitution.

L’ancien catalogue tech est conservé dans le dépôt et peut être sélectionné explicitement pour compatibilité ; il n’est pas inclus dans le cycle personnel par défaut.
