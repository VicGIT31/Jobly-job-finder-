# Jobly

Application de bureau de recherche d’emploi en France. Chaque installation dispose d’un profil local indépendant. Le catalogue couvre tous les secteurs et se remplit progressivement à partir des sources accessibles.

## Version 0.6.2

Au premier lancement, renseignez votre prénom et votre nom, puis choisissez comment classer les annonces ambiguës. Ce choix est modifiable depuis le menu Assistant.

| Option | Disponibilité |
| --- | --- |
| GitHub Copilot | Connectez votre propre compte GitHub dans le navigateur. Jobly affiche les modèles autorisés par votre formule et les règles de votre compte, dont Claude, Gemini, Grok et les modèles OpenAI lorsque GitHub les propose. [Catalogue GitHub](https://docs.github.com/en/copilot/reference/ai-models/supported-models) |
| Ollama | Lancez Ollama sur le même ordinateur. Jobly détecte les modèles conversationnels téléchargés, dont ceux de Mistral, Qwen, Llama et Gemma. [Documentation Ollama](https://docs.ollama.com/) |
| Sans IA | La collecte et le classement par règles restent disponibles. Jobly reprend également ce classement lorsque l’assistant sélectionné est indisponible ou atteint son budget local. |

Le collecteur national parcourt le répertoire public France Travail par département et métier, outre-mer compris, et reprend sa rotation au cycle suivant. Category Manager possède un filtre dédié et une source complémentaire HelloWork. La couverture effective dépend des sources accessibles et des lots parcourus.

Jobly ne demande aucune clé API. Il envoie uniquement de courts extraits d’annonces au modèle sélectionné. Un abonnement Claude, Gemini, Grok, Mistral ou ChatGPT pris directement auprès de son éditeur ne peut pas servir à connecter Copilot.

Voir [l’audit de la version 0.6.2](docs/audits/2026-11-23-audit-jobly.md) pour les vérifications et les priorités avant une diffusion large.

## Télécharger et installer

La [version 0.5.0](https://github.com/VicGIT31/Internship-finders/releases/tag/v0.5.0) contient les véritables installateurs et les ZIP avec guide, empreintes SHA-256 et preuves de vérification.

| Système | Installation directe | ZIP avec guide et commande |
| --- | --- | --- |
| Windows x64 | [Installateur .exe](https://github.com/VicGIT31/Internship-finders/releases/download/v0.5.0/Jobly-0.5.0-win-x64.exe) | [ZIP Windows](https://github.com/VicGIT31/Internship-finders/releases/download/v0.5.0/Jobly-0.5.0-win32-x64.zip) |
| macOS Apple Silicon | [Installateur .dmg](https://github.com/VicGIT31/Internship-finders/releases/download/v0.5.0/Jobly-0.5.0-mac-arm64.dmg) | [ZIP Mac](https://github.com/VicGIT31/Internship-finders/releases/download/v0.5.0/Jobly-0.5.0-darwin-arm64.zip) |
| macOS Intel | [Installateur .dmg](https://github.com/VicGIT31/Internship-finders/releases/download/v0.5.0/Jobly-0.5.0-mac-x64.dmg) | [ZIP Mac Intel](https://github.com/VicGIT31/Internship-finders/releases/download/v0.5.0/Jobly-0.5.0-darwin-x64.zip) |

**Déjà installé sous Windows ?** Suivez le [guide de mise à jour par commande PowerShell](docs/MISE_A_JOUR_WINDOWS.md).

Les installateurs et les ZIP de livraison sont disponibles dans les Releases GitHub lorsqu’une version est publiée. Les archives automatiques « Source code » contiennent les sources destinées au développement.

Pour une installation classique, ouvrez le `.exe` sous Windows, ou le `.dmg` sur Mac puis copiez Jobly dans Applications. Aucun Node.js, npm, Docker, PostgreSQL ou Meilisearch à installer séparément. Les paquets sont non signés ; les protections de Windows et macOS restent actives. Les plateformes effectivement validées sont détaillées dans les preuves de livraison.

## Métiers et territoires de la version 0.5.0

| Domaine | Contrats | Territoire de collecte |
| --- | --- | --- |
| Tech et informatique | Stages et alternances | France |
| Assurance, BTS Assurance, banque, finance, comptabilité, audit et investissement | Stages et alternances | France |
| Commerce, vente, marketing et communication | Tous les contrats reconnus | France et sources locales |
| Auxiliaires vétérinaires et métiers animaliers | Tous les contrats reconnus | France et sources locales |
| Café et barista | CDI, CDD, intérim, temps partiel, stages, alternances et autres contrats reconnus | Toute la Haute-Garonne ; Agen et Bordeaux à 30 km |

La finance utilise 52 combinaisons de recherche nationales générées automatiquement. Barista utilise 24 combinaisons de recherche entre termes, zones et fournisseurs. Ce sont des requêtes de collecte, pas un nombre garanti d’offres. Une offre réelle de barista en CDD à Blagnac a été récupérée lors du contrôle réseau.

## Utiliser l’application

1. Ouvrez l’accueil ou le catalogue, puis choisissez un domaine ou un métier. Les raccourcis Assurance/finance et Barista permettent d’explorer leurs offres sans imposer Toulouse comme ville de recherche.
2. Saisissez une commune et un rayon pour limiter la recherche géographique ; sans ville, la recherche est nationale. Les filtres s’appliquent au catalogue disponible.
3. Enregistrez les offres et les recherches. Le bouton « Postuler » ouvre l’annonce d’origine et crée une entrée dans le suivi ; il ne prouve pas qu’une candidature a été envoyée.
4. Utilisez « Actualiser » ou le Bureau pour suivre la collecte, sélectionner les sources, sauvegarder les données et réparer l’index.

La collecte démarre à l’ouverture puis toutes les deux heures tant que l’application est ouverte. Les premiers résultats sont accessibles pendant le cycle. Une connexion Internet est nécessaire pour les nouvelles offres, certaines coordonnées et certains logos. Le catalogue déjà collecté et les données personnelles restent consultables localement.

## Pourquoi l’actualisation peut prendre 30 minutes ou plus

Les offres déjà enregistrées sont disponibles immédiatement. Les nouvelles arrivent par lots pendant la collecte : **prévoir plusieurs dizaines de minutes, environ 30 minutes comme ordre de grandeur, parfois plus d’une heure** pour un passage large. Ce n’est ni une durée fixe ni la garantie que toutes les offres d’Internet seront répertoriées.

L’algorithme parcourt les sources sélectionnées avec **quatre collecteurs en parallèle**, lit les listes puis les fiches, vérifie le métier, le contrat, le pays et les dates, déduplique les offres et les ajoute à la recherche. Les appels sont espacés par site pour respecter ses limites ; les délais réseau, reprises et gros catalogues rallongent le cycle. Au contrôle local du 8 novembre, un passage Airbus a pris environ **6 minutes**, Thales **12 minutes** et Capgemini **3 minutes**.

La collecte ne se limite pas à France Travail. Les sources IA, les autres métiers, la découverte et les employeurs directs alternent dès le début du cycle. Gardez l’application ouverte et consultez **Bureau → Suivi du cycle** pour distinguer attente, lecture et résultat partiel. Détails : [fonctionnement et délais](docs/v0.5.0/COLLECTE.md#délais-et-suivi).

## Découverte automatique des recruteurs

La découverte conserve sa progression entre les lancements. Elle part des sources connues, de sites d’employeurs mentionnés dans les annonces et d’annuaires publics. Elle suit les liens carrières, reconnaît sept familles d’ATS — Workday, Greenhouse, Lever, Ashby, SmartRecruiters, Recruitee et Teamtailor — et vérifie les flux avant activation.

Les pages structurées JobPosting et les sitemaps complètent les flux. Les limites par hôte, les budgets, robots.txt, les refus d’accès et les reprises différées sont respectés. Une panne d’un annuaire ou un HTTP 403 n’est pas contourné. La couverture reste partielle : aucun algorithme ne garantit toutes les entreprises et toutes les offres publiées sur Internet.

Détails : [analyse du projet](docs/v0.5.0/ANALYSE.md) et [fonctionnement et commandes de collecte](docs/v0.5.0/COLLECTE.md).

## Mise à jour et sauvegardes

L’installation d’une nouvelle version conserve les données personnelles : `~/Library/Application Support/Jobly/` sur Mac et `%APPDATA%\Jobly\` sur Windows. Une mise à jour de l’application ne demande pas de supprimer ce dossier. Le menu Actualisation & données permet une sauvegarde et une restauration.

Les sauvegardes contiennent des informations privées et ne sont pas chiffrées par l’application. Elles ne font pas partie des fichiers distribués. Le cache de découverte est distinct des sauvegardes et peut être reconstruit.

L’actualisation des offres est automatique ; la mise à jour du programme se fait en installant la nouvelle version. Aucun mécanisme de mise à jour automatique du binaire n’est activé.

## Vérifications de la livraison 0.5.0 publiée sur GitHub

- 399 tests Vitest dans 50 fichiers ; contrôle TypeScript et lint réussis.
- Windows x64 : compilation native, installation NSIS, 13 contrôles d’exécutable et commande PowerShell sur le véritable ZIP réussis. [Build Windows](https://github.com/VicGIT31/Internship-finders/actions/runs/42486479883).
- macOS arm64 : installation du DMG, 13 contrôles d’exécutable et commande d’installation depuis le ZIP réussis.
- Captures à 390, 768 et 1440 px ouvertes et examinées sur les deux plateformes ; recherche, favoris, CV, candidature, sauvegarde/restauration et persistance vérifiés avec des données synthétiques isolées.

Les empreintes et preuves propres à chaque plateforme sont incluses dans son ZIP. Les détails et limites sont dans [VERIFICATIONS.md](docs/v0.5.0/VERIFICATIONS.md). Les tests sur runners et machines de développement ne constituent pas un contrôle sur toutes les configurations ni une validation exhaustive de l’accessibilité.

## Développer et construire

Prérequis développeur : Node 24 LTS, npm, système et architecture cibles. Ils ne sont pas requis pour utiliser l’installateur.

```sh
npm ci
npm test
npm run lint
npm run desktop:dist -- --publish never
npm run desktop:install-test
npm run desktop:delivery
npm run desktop:command-test
npm run desktop:delivery
```

`release/` reçoit les installateurs ; `delivery/` les ZIP. Le serveur Next.js de production, PostgreSQL et Meilisearch sont embarqués. Le build exclut les `.env`, certificats et données privées. Les secrets des services locaux sont générés sur l’ordinateur à l’installation ; aucune clé API externe n’est fournie ni nécessaire à la collecte.

Le [workflow natif](.github/workflows/desktop.yml) permet une construction Windows seule ou la matrice complète. La publication des paquets vérifiés se fait dans les Releases GitHub ; les fichiers binaires ne sont pas ajoutés à l’historique Git.

Pour une compilation personnelle non commerciale uniquement, récupérez le [DevKit ChatGPT](https://github.com/openai/sign-in-with-chatgpt-devkit/tree/0a36fefeb913055c8c7a1a29b63d82b96b2e841a) dans un dossier séparé. Lancez la commande de build avec `JOBLY_PERSONAL_CHATGPT=1` et `JOBLY_CHATGPT_DEVKIT_DIR` défini au chemin absolu de ce dossier. Le code du DevKit est absent du dépôt et du paquet standard.

Pour le développement web local, utilisez `.env.example` et les services associés. Cette édition personnelle sans authentification doit rester sur loopback ; le backend empaqueté est protégé par un jeton éphémère local.

### Développement web local

Le [Docker Compose](docker-compose.yml) fournit PostgreSQL, Redis, Meilisearch et MinIO. `docker compose up --build` démarre aussi l'application et son worker, applique les migrations, prépare le profil personnel et synchronise la recherche. Le site est accessible sur `http://127.0.0.1:3000`. `docker compose down` arrête les services en conservant leurs volumes.

Pour exécuter Node.js sur l'hôte, démarrez seulement les services d'infrastructure, puis renseignez un `.env` local à partir de [.env.example](.env.example). Si ce fichier existe déjà, conservez-le. Les identifiants PostgreSQL, MinIO et Meilisearch doivent correspondre à ceux des services ; les valeurs d'exemple `.env.example` et Docker Compose ne sont pas toutes identiques.

```sh
docker compose up -d postgres redis meilisearch minio minio-init
npm ci
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Le seed prépare uniquement le profil personnel, sans compte de démonstration ni offre fictive. `npm run dev` et `npm start` lancent déjà Next.js et le worker BullMQ : ne lancez pas un deuxième worker. `dev:web` et `start:web` servent aux vérifications du serveur seul. Les commandes de diagnostic et de réparation sont documentées dans [COLLECTE.md](docs/v0.5.0/COLLECTE.md#commandes-de-diagnostic-et-de-maintenance).

| Configuration web locale | Usage |
| --- | --- |
| `DATABASE_URL`, `REDIS_URL` | Données PostgreSQL, verrous et tâches BullMQ |
| `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY` | Recherche et protection de l'index local |
| `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET_CV` | Stockage des CV dans MinIO ; le bureau utilise ses fichiers locaux |
| `INGEST_API_KEY` | Protection de la route d'ingestion de développement |
| `INGESTION_INTERVAL_MINUTES`, `INGEST_SOURCE_TIMEOUT_SECONDS` | Intervalle des cycles et budget réseau par source |
| `INGEST_SOURCES`, `JOB_SOURCES_FILE`, `INGEST_CACHE_DIR`, `JOB_ALERTS_DIR` | Sélection des sources, catalogue personnalisé, cache et alertes `.eml` |
| `EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY` | Emails en console par défaut ; Resend facultatif en mode web |
| `ANTHROPIC_API_KEY` | Brouillons IA facultatifs en mode web ; sans clé, gabarit local explicitement identifié |

Le mode personnel n'utilise ni OAuth, ni mot de passe administrateur, ni `AUTH_SECRET`. Les anciens connecteurs JSearch et France Travail OAuth ne sont plus actifs. La collecte directe ne nécessite pas leurs clés. Le complément de découverte Tavily a sa [configuration distincte](docs/v0.5.0/COLLECTE.md#désactiver-ou-configurer-le-complément).

## Documentation

- [Audit des stages IA, diagnostic Thales et solutions proposées (9 novembre)](docs/audits/2026-11-09-stages-ia.md)
- [Analyse et architecture actuelles](docs/v0.5.0/ANALYSE.md)
- [Collecte automatique et scripts](docs/v0.5.0/COLLECTE.md)
- [Vérifications Windows et Mac](docs/v0.5.0/VERIFICATIONS.md)
- [Publication et mise à jour des installateurs](docs/v0.5.0/PUBLICATION.md)
- [Guide d’installation](desktop/delivery/INSTALLER.md) et [historique des versions](CHANGELOG.md)
- [Architecture du bureau, sécurité et construction native](desktop/README.md)

Les documents 0.3.0, 0.4.0, 0.4.1 et les audits datés décrivent leurs versions respectives. Le code et les documents 0.5.0 font foi pour la version actuelle.

Les anciens documents de contexte, guides web, audits d'octobre et cahier des charges Europe/Asie ont été retirés de l'arborescence courante après consolidation des informations utiles ici, dans l'analyse actuelle et dans le guide de collecte. Ils restent consultables dans [l'état historique du dépôt](https://github.com/VicGIT31/Internship-finders/tree/c6a7be1a03086788a3a52f9844958444f77e3857) ; ce cahier des charges décrit des intentions anciennes, pas des fonctionnalités garanties.

<!-- COMMANDES-INSTALLATION -->
## Installation de la version publiée 0.5.0 par une commande à copier-coller

Téléchargez le ZIP de votre système dans **Téléchargements**. Ces commandes installent le paquet local pour votre utilisateur, vérifient son SHA-256 et ouvrent Jobly. Aucun Node.js, Docker, compte ou clé API n’est nécessaire.

**macOS · Apple Silicon ou Intel**

```bash
/bin/bash -c 'a=x64; [ "$(/usr/sbin/sysctl -n hw.optional.arm64 2>/dev/null)" = 1 ] && a=arm64; z="$HOME/Downloads/Jobly-0.5.0-darwin-$a.zip"; [ -f "$z" ] || { printf "%s\n" "Téléchargez le ZIP Jobly 0.5.0 pour votre Mac dans Téléchargements, puis réessayez."; exit 1; }; d=$(mktemp -d); /usr/bin/ditto -x -k "$z" "$d" && /bin/bash "$d/Jobly-0.5.0-darwin-$a/INSTALLER-macOS.sh"; r=$?; rm -rf "$d"; exit "$r"'
```

**Windows x64 · PowerShell**

```powershell
$zip=Join-Path $HOME 'Downloads\Jobly-0.5.0-win32-x64.zip'; if(!(Test-Path -LiteralPath $zip)){throw 'Telechargez le ZIP Windows Jobly 0.5.0 dans Telechargements puis reessayez.'}; $work=Join-Path ([IO.Path]::GetTempPath()) ('Jobly-'+[guid]::NewGuid()); try { Expand-Archive -LiteralPath $zip -DestinationPath $work; $root=Join-Path $work 'Jobly-0.5.0-win32-x64'; $name='Jobly-0.5.0-win-x64.exe'; $setup=Join-Path $root ('installateurs\'+$name); $lines=@(Get-Content -LiteralPath (Join-Path $root 'SHA256SUMS.txt') | Where-Object { $_.EndsWith('  installateurs/'+$name) }); if($lines.Count -ne 1){throw 'Empreinte absente ou ambigue.'}; $want=($lines[0] -split '\s+')[0]; $sha=[Security.Cryptography.SHA256]::Create(); try{$actual=([BitConverter]::ToString($sha.ComputeHash([IO.File]::ReadAllBytes($setup)))).Replace('-','')}finally{$sha.Dispose()}; if($want -notmatch '^[a-fA-F0-9]{64}$' -or $actual -ine $want){throw 'Integrite incorrecte : installation annulee.'}; @(Get-Process -Name Jobly -ErrorAction SilentlyContinue) | Where-Object { $_.MainWindowHandle -ne 0 } | ForEach-Object { [void]$_.CloseMainWindow(); if(!$_.WaitForExit(15000)){throw 'Fermez Jobly puis relancez la commande.'} }; $dest=if($env:JOBLY_INSTALL_DIR){$env:JOBLY_INSTALL_DIR}else{Join-Path $env:LOCALAPPDATA 'Programs\Jobly'}; $p=Start-Process -FilePath $setup -ArgumentList @('/S',('/D='+$dest)) -Wait -PassThru; if($p.ExitCode -ne 0){throw ('Installation interrompue : '+$p.ExitCode)}; if($env:JOBLY_NO_LAUNCH -ne '1'){Start-Process -FilePath (Join-Path $dest 'Jobly.exe')}; Write-Host ('Jobly installee dans '+$dest) } finally { if(Test-Path -LiteralPath $work){Remove-Item -LiteralPath $work -Recurse -Force} }
```

Les données personnelles sont conservées lors des mises à jour. Les protections du système restent actives ; une signature éditeur reconnue nécessite les certificats de publication.
