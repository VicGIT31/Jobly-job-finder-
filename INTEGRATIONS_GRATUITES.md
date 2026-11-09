# Indeed, autres plateformes et sites carrière

> Document historique. Voir l'[audit du 9 novembre 2026](docs/audits/2026-11-09-stages-ia.md)
> pour les limites actuelles, les stages IA et les accès API revérifiés.
> L'API officielle France Travail est désormais signalée en accès restreint ;
> une inscription ne garantit pas l'obtention immédiate d'identifiants.

Vérification du 5 octobre 2026. Jobly conserve les offres dans sa base locale,
affiche leur fiche et redirige vers **l'annonce exacte** avec le bouton Postuler.
Le périmètre public est limité à **STAGE / ALTERNANCE**, y compris pour les
anciennes données ; les CDI, temps plein et autres contrats sont exclus des
recherches, facettes, accueil, entreprises, suggestions et liens publics.

## Collecte directe des entreprises

Le catalogue contient **84 entrées, dont 83 activées et 80 entreprises**.
Il complète les cinq connecteurs historiques gratuits. Les nouveaux endpoints
ont été testés avec des requêtes publiques ; certaines entreprises n'ont
actuellement aucune offre correspondant au filtre tech / étudiant / France.
Les candidats qui répondent vide ne sont pas activés : certains ATS répondent
200 avec zéro annonce même pour un slug inexistant.

Parmi les ajouts : Renault Group, Sanofi, Valeo, Michelin, Daher, Accenture,
ALTEN, Devoteam, Talan, Assystem, Bosch, Eurofins, Wavestone, Sia, Veolia,
Scaleway, Doctrine, Aircall, Mirakl, Shift Technology, Pigment et Lifen.
Le lot limité de validation a produit 167 offres, avec **159 créations et
8 rafraîchissements de doublons**, sans rejet. Il ne mesure pas tout le marché.
Les budgets et rapports signalent une couverture partielle lorsqu'une limite
de pages ou d'offres est atteinte.

```bash
npm run sources:expand -- --output reports/france-career-expansion.json
npm run sources:expand -- --collect --sources pigment-lever,wavestone1-smartrecruiters
npm run sources:check -- --collect --sources renault-group,sanofi --limit 10 --pages 2
```

L'inventaire `config/france-career-candidates.json` contient les pistes testées,
désactivées par défaut. Un endpoint valide ne garantit pas un poste en France.
Le pays et le contrat sont confirmés dans les annonces ; le mot « early-stage »
d'une startup et la mention d'une ancienne expérience de stage ne suffisent pas.

## Indeed et alertes email gratuites

Les essais ont renvoyé **403** sur la recherche Indeed et **404** sur l'ancien
flux RSS. La documentation développeur actuelle ne donne pas d'accès public
gratuit à une recherche exhaustive de ses offres. Indeed permet de recevoir
des [alertes email](https://support.indeed.com/hc/en-us/articles/204488890-Starting-Stopping-and-Managing-Job-Alerts)
depuis un compte personnel.

Jobly peut importer ces alertes, ainsi que celles de LinkedIn, HelloWork, WTTJ,
APEC, France Travail et JobTeaser, sans appeler de fournisseur payant :

1. Créer les alertes souhaitées dans ses comptes : stage / alternance,
   informatique, développement, data ou cybersécurité, France / Paris.
2. Exporter les emails reçus au format `.eml` dans `data/job-alerts/`, ou utiliser
   une règle locale de messagerie pour les y déposer. Aucun accès à une boîte
   Gmail ou Outlook n'est configuré automatiquement par ce projet.
3. Le worker relit ce dossier au lancement et à chaque cycle (2 h par défaut).
   Un import ponctuel est également possible :

```bash
npm run alerts:import -- data/job-alerts --export reports/email-offers.json
npm run alerts:import -- data/job-alerts
```

`JOB_ALERTS_DIR` remplace le dossier en lancement local. Docker monte
`./data/job-alerts` en lecture seule. Si `INGEST_SOURCES` est utilisé, ajouter
`local-job-alerts` à sa sélection. Les emails et exports sont ignorés par Git.

Le parseur MIME gère notamment HTML, quoted-printable et base64. Il ne charge
ni pixels ni images, ne suit pas les redirections réseau et retire les
paramètres de suivi. Il n'accepte que des liens d'annonces identifiables,
avec titre, entreprise et lieu présents dans le message. Les messages trop
anciens (7 jours), sans date ou incomplets sont ignorés. Les formats réels des
alertes peuvent varier : **les tests utilisent des fixtures, aucun email
personnel réel n'a encore été fourni pour valider son modèle**. Les champs
manquants sont signalés, jamais inventés.

La fiche indique que la description est un extrait d'alerte. Un extrait
ne remplace pas une description complète déjà collectée. La date du mail
n'est pas présentée comme la date de publication de l'offre. Un email ne
prouve pas que le poste est encore ouvert ; la disponibilité finale se vérifie
sur l'annonce d'origine. Le dossier seul ne crée pas d'alertes et ne synchronise
pas une boîte privée : l'arrivée des `.eml` reste à configurer dans le client mail.

## Clés gratuites et GitHub

Il existe des accès développeur avec ses **propres** identifiants, par exemple
[France Travail](https://www.data.gouv.fr/dataservices/api-offres-demploi) ou
[Adzuna](https://developer.adzuna.com/). Ils ne sont pas nécessaires ici.
Une clé trouvée dans un dépôt public n'est pas automatiquement une clé de
développeur librement réutilisable.

Le dépôt open source [JobSpy](https://github.com/speedyapply/JobSpy) a été
examiné. Son intégration Indeed emploie une clé embarquée destinée à un client
mobile ; ce n'est pas une autorisation individuelle de développeur donnée par
Indeed. Aucune clé de ce dépôt n'est copiée ou utilisée dans Jobly. La licence
du code ne donne pas l'accès au service tiers.

## Exécution et compte admin

```bash
docker compose up --build -d
```

Le worker et le site démarrent ensemble. Les identifiants admin sont stockés
dans le `.env` local, non versionné, et provisionnés par `admin:ensure`.
L'interface est sur `http://localhost:3000` et la console sur `/admin`.
Le collecteur n'utilise pas les cookies du compte administrateur pour les
sites tiers. La couverture dépend des endpoints publics accessibles et
n'est pas exhaustive.
