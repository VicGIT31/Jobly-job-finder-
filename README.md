# Jobly 0.5.0

Application personnelle de recherche d’emploi, sans compte ni clé API à configurer. Les offres, favoris, recherches, candidatures, notes et CV restent sur votre ordinateur. Internet sert à actualiser les offres et à ouvrir les candidatures sur les sites d’origine.

## Télécharger et installer

La [version 0.5.0](https://github.com/VicGIT31/Internship-finders/releases/tag/v0.5.0) contient les véritables installateurs et les ZIP avec guide, empreintes SHA-256 et preuves de vérification.

| Système | Installation directe | ZIP avec guide et commande |
| --- | --- | --- |
| Windows x64 | [Installateur .exe](https://github.com/VicGIT31/Internship-finders/releases/download/v0.5.0/Jobly-0.5.0-win-x64.exe) | [ZIP Windows](https://github.com/VicGIT31/Internship-finders/releases/download/v0.5.0/Jobly-0.5.0-win32-x64.zip) |
| macOS Apple Silicon | [Installateur .dmg](https://github.com/VicGIT31/Internship-finders/releases/download/v0.5.0/Jobly-0.5.0-mac-arm64.dmg) | [ZIP Mac](https://github.com/VicGIT31/Internship-finders/releases/download/v0.5.0/Jobly-0.5.0-darwin-arm64.zip) |
| macOS Intel | [Installateur .dmg](https://github.com/VicGIT31/Internship-finders/releases/download/v0.5.0/Jobly-0.5.0-mac-x64.dmg) | [ZIP Mac Intel](https://github.com/VicGIT31/Internship-finders/releases/download/v0.5.0/Jobly-0.5.0-darwin-x64.zip) |

**Déjà installé sous Windows ?** Suivez le [guide de mise à jour par commande PowerShell](docs/MISE_A_JOUR_WINDOWS.md).

Le dépôt reste privé : le téléchargement sur GitHub demande un compte autorisé. Vous pouvez ensuite transmettre le ZIP ou l’installateur à votre ami. Les archives automatiques « Source code » sont destinées au développement et n’installent pas l’application.

Pour une installation classique, ouvrez le `.exe` sous Windows, ou le `.dmg` sur Mac puis copiez Jobly dans Applications. Aucun Node.js, npm, Docker, PostgreSQL ou Meilisearch à installer séparément. Les paquets sont non signés ; les protections de Windows et macOS restent actives. Les plateformes effectivement validées sont détaillées dans les preuves de livraison.

## Métiers et territoires

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
2. Saisissez une commune et un rayon pour limiter la recherche géographique ; sans ville, la recherche est nationale. Les baristas collectés restent limités aux territoires indiqués ci-dessus.
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

## Vérifications de cette livraison

- 373 tests Vitest dans 46 fichiers ; contrôle TypeScript et lint réussis.
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

Pour le développement web local, utilisez `.env.example` et les services associés. Cette édition personnelle sans authentification doit rester sur loopback ; le backend empaqueté est protégé par un jeton éphémère local.

## Documentation

- [Audit des stages IA, diagnostic Thales et solutions proposées (9 novembre)](docs/audits/2026-11-09-stages-ia.md)
- [Analyse et architecture actuelles](docs/v0.5.0/ANALYSE.md)
- [Collecte automatique et scripts](docs/v0.5.0/COLLECTE.md)
- [Vérifications Windows et Mac](docs/v0.5.0/VERIFICATIONS.md)
- [Publication et mise à jour des installateurs](docs/v0.5.0/PUBLICATION.md)
- [Guide d’installation](desktop/delivery/INSTALLER.md) et [historique des versions](CHANGELOG.md)

Les documents 0.3.0, 0.4.0, 0.4.1 et les audits datés décrivent leurs versions respectives. Le code et les documents 0.5.0 font foi pour la version actuelle.

<!-- COMMANDES-INSTALLATION -->
## Installation par une commande à copier-coller

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
