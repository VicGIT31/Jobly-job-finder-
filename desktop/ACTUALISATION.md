# Actualiser les offres — Jobly 0.5.0

La collecte démarre à l’ouverture puis est déclenchée toutes les deux heures tant que Jobly est ouvert. **Actualiser** et Cmd/Ctrl+Maj+R permettent aussi de la demander. Un cycle déjà actif n’est pas doublé. Aucun compte ni clé API ne sont requis.

## Combien de temps attendre ?

Le catalogue déjà enregistré reste consultable immédiatement. Les nouvelles offres apparaissent par lots. Pour un passage large, prévoyez plusieurs dizaines de minutes : **environ 30 minutes est un ordre de grandeur, avec des dépassements possibles d’une heure** selon le volume, la connexion et les sites. Ce délai ne garantit pas que toutes les offres ont été répertoriées.

Quatre collecteurs travaillent en parallèle. Chacun doit parcourir les listes et parfois des centaines de fiches, puis vérifier le pays, le métier, le contrat, les dates et les doublons avant l’indexation. Les requêtes sont espacées par hôte, les réponses lentes et reprises rallongent le parcours. Lors d’un contrôle local, Airbus a pris environ 6 minutes, Thales 12 minutes et Capgemini 3 minutes pour un passage ; ces durées varient et ne s’additionnent pas directement.

## France Travail et sites recruteurs

La collecte ne se limite pas à France Travail. Le catalogue employeurs contient notamment Airbus et Thales ; d’autres connecteurs lisent directement les sites de recrutement, flux publics et sitemaps. L’ordonnancement alterne les sources IA prioritaires, les autres métiers, la découverte et les employeurs directs. Les lots Workday, HelloWork et LinkedIn sont enregistrés pendant leur lecture ; il n’est plus nécessaire d’attendre la fin de ces sources pour consulter leurs premiers résultats.

Dans **Bureau → Sources de la collecte**, une sélection vide active **toutes les sources activées du catalogue, y compris les employeurs**. Une sélection explicite limite les prochains cycles aux sources choisies. Les filtres métier, contrat et ville interrogent les offres déjà collectées ; ils ne relancent pas tous les sites. Les recherches finance restent nationales et Barista couvre la Haute-Garonne, Agen et Bordeaux selon le périmètre documenté.

## Suivre l’avancement

Gardez l’application ouverte. **Bureau → Suivi du cycle** affiche toutes les sources en attente, en cours, terminées, partielles ou indisponibles, ainsi que leurs lots traités. **Derniers passages des sources** : les 20 passages récents indiquent les sites traités, volumes et avertissements. Cette liste n’est pas un inventaire complet du cycle. Une source bloquée ou limitée est signalée et les résultats partiels sont conservés. L’absence d’une offre dans une collecte partielle ne prouve pas son expiration.

Le cache évite certaines relectures mais ne contourne pas les limitations des fournisseurs. La publication, la détection et la dernière observation sont distinctes ; les inconnues ne sont pas remplacées par des dates ou qualifications inventées. La couverture reste partielle et aucune offre n’est fabriquée pour remplir une liste.

Les données restent dans le profil local. Utilisez **Sauvegarder** pour créer une archive privée et **Réparer la recherche** si l’index semble incohérent. Voir [COLLECTE.md](../docs/v0.5.0/COLLECTE.md) pour l’analyse des sources, l’ordre et les délais, et [INSTALLER.md](delivery/INSTALLER.md) pour l’installation.

## Stages IA et découverte élargie

Les noms de campus sont distingués des communes ; les anciennes offres sans coordonnées sont réparées lors de la réindexation. Les thèmes LLM, NLP, vision et MLOps complètent la spécialité principale : un sujet IA + cyber reste aussi dans la cybersécurité. Les implantations françaises secondaires sont prises en compte. Le filtre « 5 derniers jours » est réversible et ne supprime aucune offre.

La découverte suit automatiquement les liens carrière de sites officiels et lit notamment les flux Workable et les stages Inria. Un complément de recherche Tavily utilise son accès officiel gratuit sans clé, limité localement à 10 requêtes par jour et 300 par mois. Les plafonds du fournisseur peuvent être inférieurs ; un refus met ce complément en pause, sans arrêter les collecteurs directs. Une clé Tavily personnelle est facultative. Voir [la configuration](../docs/v0.5.0/COLLECTE.md).
