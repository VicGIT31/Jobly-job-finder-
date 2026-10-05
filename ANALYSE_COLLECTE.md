# Analyse du projet et passage à la collecte gratuite

Analyse et modifications du 5 octobre 2026.

Jobly utilise Next.js 15.5.24 / TypeScript, PostgreSQL via Prisma pour ses données,
Meilisearch pour la recherche avec secours PostgreSQL, Redis/BullMQ pour les
cycles et MinIO pour les CV. Le parcours public mène à la source originale via
`/go/{id}` ; le site ne reçoit pas la candidature externe. L'espace candidat
gère sauvegardes, offres masquées, candidatures, alertes, CV et scores. L'admin
gère les offres, entreprises, utilisateurs, sources et réglages.

Le dépôt avait aussi été étendu aux contrats internationaux. Cette demande
recentre les nouveaux imports automatiques sur les stages/alternances tech en
France, sans supprimer les données internationales existantes. La recherche
publique et les pages publiques excluent maintenant tous les contrats autres
que stage/alternance, y compris les CDI et les anciens temps pleins.

## Diagnostic initial

Plusieurs collecteurs gratuits existaient déjà. JSearch/OpenWeb Ninja était
l'intermédiaire nécessitant une clé et pouvant facturer les appels. France
Travail OAuth demandait un compte développeur, ce qui n'était pas en soi une
preuve de tarification payante. L'objectif implémenté est la collecte publique
sans clé ni abonnement. Les 119 tests existants passaient avant modification.

Les défauts observés étaient le throttle concurrent qui ne réservait pas ses
créneaux avant d'attendre, l'absence de cache des descriptions, l'indexation
une fois par offre, les imports qui pouvaient se chevaucher et les sources
inaccessibles marquées saines après avoir retourné zéro offre. Plusieurs boards
d'entreprises étaient obsolètes. Le lancement `dev`/`start` seul ne lançait pas
le worker, ses variables locales n'étaient pas chargées explicitement, le cron
`*/N` était inadapté à des intervalles de plus de 59 minutes et le bilan admin
de 24 h ne lisait que 40 cycles.

## Implémentation

Les connecteurs JSearch et France Travail OAuth sont supprimés. France Travail
utilise les pages candidat et le flux anonyme de son composant de descriptif.
The Muse reste sur son quota public, sans clé optionnelle.

Un catalogue JSON de 83 sources (83 activées, 80 entreprises) et des adaptateurs HTML/JSON-LD/microdonnées,
Workday, Greenhouse, Lever, Ashby et SmartRecruiters permettent la collecte
directe des entreprises. Le catalogue se remplace sans changement de code.
Les pays, rôles et contrats sont vérifiés ; les dates absentes ne sont pas
inventées par les nouveaux collecteurs. Les liens d'origine sont conservés.

La contrainte unique de déduplication et les blocages de modération sont
conservés. Les doublons rafraîchissent aussi leur description et leur
enrichissement. L'indexation est regroupée en lots de 100, y compris pour les
écritures déjà réussies quand une écriture suivante échoue.

Le cache disque a un nettoyage périodique à 5 000 fichiers et une limite de
8 Mo par réponse stockée. Ses écritures sont atomiques ; un filesystem
inaccessible n'empêche pas la collecte. Les réponses périmées ne servent pas
de succès. Les sitemaps `.gz` sont décompressés avant lecture.

Les requêtes sont espacées par hôte, les pools et budgets sont bornés, les
refus et résultats partiels sont signalés. Les pauses `Retry-After` longues
survivent au changement de cycle dans le processus. Un verrou Redis renouvelé
évite les imports simultanés du worker, de l'admin et du script.

Le site et son worker démarrent ensemble avec `npm run dev`, `npm start`,
`start:all` et Docker. La cadence est réglable, à 120 minutes par défaut, avec
une collecte au lancement. Les scripts autonomes permettent diagnostic,
découverte, diagnostic d'un inventaire français, export réel sans services et
import d'un export. Un connecteur `.eml` permet d'importer des alertes reçues
pour les sites bloqués ; il ne connecte pas automatiquement une boîte privée.

## Validation et limites

Le premier diagnostic a trouvé 23 endpoints accessibles sur 24 entrées.
L'extension a ajouté des boards publics vérifiés, décrits dans
[INTEGRATIONS_GRATUITES.md](INTEGRATIONS_GRATUITES.md). Indeed reste désactivé.
WTTJ a renvoyé un 403 sur des annonces
malgré ses sitemaps accessibles. Ces refus ne sont pas contournés.

Trois collectes limitées ont réuni **69 offres réelles distinctes**, importées
dans la base existante avec zéro rejet. Le lot supplémentaire de 167 offres
a ajouté 159 fiches et rafraîchi 8 doublons, sans rejet.
Les **172 tests automatisés passent**.
La seconde importation a produit
**69 rafraîchissements et zéro création**. Les tests couvrent pays et contrats,
titres commerciaux, pagination Workday, résultats partiels, microdonnées,
refus HTTP, throttle concurrent, cache et indexation par lots. TypeScript,
ESLint et le build de production sont également vérifiés. Les exports restent
dans `reports/`, hors Git.

Le catalogue n'est pas une liste de tous les recruteurs de France. La
découverte aide à l'étendre depuis une page carrière donnée ; elle ne trouve
pas tous les domaines d'Internet. Les budgets, titres ambigus, formats
changeants et blocages limitent la couverture. Le cache de détails de 4 h et
l'expiration à 7 jours ne garantissent pas une fraîcheur instantanée.

Les options externes de brouillon IA/email/authentification ne sont pas des
fournisseurs d'offres et ne sont pas requises. Les laisser sans clé permet
l'usage local décrit dans [API.md](API.md). Les changements n'ajoutent aucun
intermédiaire de scraping payant. Les documents CONTEXTE et l'étude
Europe/Asie sont conservés comme historiques, avec un renvoi vers cet état.
