# Jobly 0.3.0

## Version 0.4.1 : Windows et Barista

Les installateurs natifs se livrent dans un ZIP avec une commande d'installation. La collecte publique n'utilise aucune clé API externe. Le nouveau domaine Café & barista couvre la Haute-Garonne (Toulouse et l'ensemble du département), Agen et Bordeaux à 30 km, avec tous les contrats.

- [Fonctionnement et périmètre](docs/v0.4.1/ANALYSE.md)
- [Commande d'installation](desktop/delivery/COMMANDES.md)


## Version 0.4.0 : découverte autonome et assurance/finance

La découverte des sources publiques avance automatiquement à chaque collecte, sans clé API. Les stages et alternances assurance, banque, finance, comptabilité, audit et investissement disposent d’un domaine et de recherches nationales dédiés, dont BTS Assurance.

- [Analyse du projet et changements](docs/v0.4.0/ANALYSE.md)
- [Fonctionnement, commandes et limites de collecte](docs/v0.4.0/COLLECTE.md)
- [Installation depuis le ZIP en une commande](desktop/delivery/COMMANDES.md)


Application personnelle de recherche d’emploi qui réunit, dans une seule recherche, **la tech (stages et alternances)**, **le commerce, le marketing et la communication**, et **les auxiliaires vétérinaires (ASV) et métiers animaliers** (tous contrats). Recherche directe, sans compte ni clé API. France entière par défaut ; commune et rayon (5 à 100 km) au choix, la zone de collecte locale étant Toulouse tant qu’une autre commune n’est pas choisie.

## Installer l’application

Le parcours utilisateur est : **télécharger le ZIP de votre système → dézipper → ouvrir l’installateur dans `installateurs/` → lancer Jobly depuis son icône**.

Les ZIP de livraison contiennent `DEMARRER.html`, `INSTALLER.md`, les véritables installateurs, leurs empreintes SHA-256 et un rapport propre à la plateforme. Le code source de GitHub n’est pas un installateur. Le statut réel des fichiers construits et publiés est tenu dans [les vérifications](docs/v0.3.0/VERIFICATIONS.md). Aucun téléchargement n’est annoncé avant sa construction.

- macOS Apple Silicon : cible arm64, `.dmg`.
- macOS Intel : cible x64, `.dmg`, compilation et tests natifs dans la CI.
- Windows 10/11 64 bits : x64, installateur `.exe` NSIS, compilation et tests sous Windows dans la CI.
- Windows ARM natif et Linux : distributions non fournies.

Sans certificat Developer ID et notarisation Apple ou certificat Authenticode Windows, les paquets restent non signés par un éditeur reconnu. Voir [INSTALLER.md](desktop/delivery/INSTALLER.md) et [la préparation de signature](desktop/README.md). Ne désactivez pas les protections du système.

## Utiliser Jobly

1. Ouvrez l’accueil ou la recherche : tous les domaines sont mélangés. Affinez par **Domaine** (Tech, Commerce/marketing/communication, ASV et animalier) et par **Métier** (spécialités tech, familles de métiers, accueil de clinique, soins animaliers et refuges).
2. Saisissez une commune française et ajustez le rayon, ou laissez vide pour une recherche nationale.
3. Recherchez un intitulé, une entreprise ou un synonyme (« ASV », « auxiliaire vétérinaire », « veterinary nurse »). Les filtres interrogent le catalogue local, sans nouvelle collecte complète ; les « détails de l’annonce » (débutant accepté, urgences, équine, refuge…) sont déduits du texte et à vérifier.
4. Enregistrez vos favoris et recherches ; « Postuler » ouvre le site d’origine dans votre navigateur. Un clic est ajouté au suivi personnel ; il ne prouve pas qu’une candidature a été envoyée.
5. « Actualiser » complète le catalogue. Pour une nouvelle ville, cette action adapte les collecteurs locaux France Travail et HelloWork et la découverte des cabinets vétérinaires voisins. Les collecteurs nationaux restent actifs. La collecte reprend à l’ouverture puis toutes les deux heures tant que Jobly est ouvert.

**Internet est nécessaire pour collecter des offres, géolocaliser les communes hors référentiel embarqué, charger certains logos et candidater.** Le catalogue déjà collecté, les favoris, recherches, notes et CV restent locaux. Aucun backend distant Jobly n’est nécessaire. Une première collecte peut prendre plusieurs minutes ; les premiers lots sont affichés avant la fin du cycle. La couverture n’est jamais exhaustive.

Une date de publication inconnue est affichée comme telle. La dernière vérification est distincte de la publication. Les offres expirées ne figurent plus dans la recherche active. Les inconnues de salaire ou qualification ne sont pas des incompatibilités certaines. Les distances sont calculées à vol d’oiseau, généralement depuis le centre des communes.

## Données et mise à jour

macOS : `~/Library/Application Support/Jobly/`. Windows : `%APPDATA%\Jobly\`. L’installation de la nouvelle application conserve ce dossier. Une sauvegarde privée `avant-0.3.0.jobly` précède la migration des données 0.2.x.

Les anciens comptes deviennent un seul profil local ; favoris, recherches, candidatures et notes sont regroupés. Les profils secondaires et références de CV sont consultables dans **Mon espace → Confidentialité → Données importées**. Les fichiers absents de la sauvegarde d’origine ne peuvent pas être reconstitués. Aucun ancien mot de passe n’est nécessaire après migration. Le schéma historique des utilisateurs reste uniquement comme support interne de compatibilité ; les services de connexion, inscription, récupération et sessions sont retirés.

**Actualisation & données** permet de sauvegarder, restaurer, régler les sources et réparer l’index. Les sauvegardes contiennent des informations privées, non chiffrées par l’application.

## Développer et compiler depuis les sources

Cette section concerne les développeurs, pas l’usage quotidien. Prérequis : Node 24 LTS, npm, système et processeur cibles. Les composants de production sont inclus par Electron ; Docker n’est pas nécessaire pour le paquet de bureau.

```sh
npm ci
npm test
npm run lint
npm run desktop:dist -- --publish never
npm run desktop:smoke -- --fresh
npm run desktop:delivery
```

`release/` reçoit les paquets natifs ; `delivery/` les ZIP, guides et empreintes. Le build embarque Next.js en production, PostgreSQL et Meilisearch. Il exclut les `.env`, certificats, dumps et fichiers personnels. La matrice native se trouve dans [.github/workflows/desktop.yml](.github/workflows/desktop.yml). `JOBLY_TEST_NETWORK=1 npm run desktop:smoke -- --fresh` ajoute une vérification réseau réelle séparée des fixtures synthétiques.

Pour un développement web local : configurez les services de `.env.example`, migrez Prisma, puis utilisez `npm run dev`. Cette version **personnelle sans authentification ne doit pas être exposée sur Internet**. Les commandes web écoutent par défaut sur loopback. Le backend empaqueté est protégé par un jeton éphémère local et n’expose aucun secret de source.

## Documents de reprise

- [Vision et périmètre](docs/v0.3.0/VISION.md), [plan priorisé et acceptation](docs/v0.3.0/PLAN.md).
- [Décisions techniques](docs/v0.3.0/DECISIONS.md), [inventaire des sources et limites](docs/v0.3.0/SOURCES.md).
- [Résultats de vérification](docs/v0.3.0/VERIFICATIONS.md), [historique](CHANGELOG.md).
- [Architecture et signature](desktop/README.md), [actualisation et dépannage](desktop/ACTUALISATION.md).

Les documents historiques `CONTEXTE_AI_WORK.md` et `SOURCES_*.md` décrivent les versions précédentes ; les documents 0.3.0 et le code courant font foi. Le catalogue tech et les sources des versions 0.1 et 0.2 sont de nouveau actifs : la 0.3.0 fusionne leur interface avec les nouveaux métiers.

<!-- COMMANDES-INSTALLATION -->
## Installation par une commande à copier-coller

Téléchargez d’abord **le ZIP de livraison de votre système dans Téléchargements**, sans le renommer. Ne choisissez pas le ZIP « Source code ». Le dépôt GitHub est privé : le téléchargement se fait depuis votre navigateur connecté et autorisé. Ces commandes utilisent ensuite le ZIP local ; aucun jeton GitHub ni clé API n’est demandé.

**macOS — ouvrez Terminal, collez cette ligne, puis appuyez sur Entrée.** Elle choisit Apple Silicon ou Intel, vérifie SHA-256, copie Jobly dans Applications (ou votre dossier Applications personnel si nécessaire), puis la lance.

```bash
/bin/bash -c 'a=x64; [ "$(/usr/sbin/sysctl -n hw.optional.arm64 2>/dev/null)" = 1 ] && a=arm64; z="$HOME/Downloads/Jobly-0.3.0-darwin-$a.zip"; [ -f "$z" ] || { printf "%s\n" "Téléchargez le ZIP Jobly 0.3.0 pour votre Mac dans Téléchargements, puis réessayez."; exit 1; }; d=$(mktemp -d); /usr/bin/ditto -x -k "$z" "$d" && /bin/bash "$d/Jobly-0.3.0-darwin-$a/INSTALLER-macOS.sh"; r=$?; rm -rf "$d"; exit "$r"'
```

**Windows x64 — ouvrez PowerShell, collez cette ligne, puis appuyez sur Entrée.** Elle vérifie SHA-256, ferme proprement Jobly si nécessaire, lance l’installation pour votre utilisateur puis ouvre l’application.

```powershell
$zip=Join-Path $HOME 'Downloads\Jobly-0.3.0-win32-x64.zip'; if(!(Test-Path -LiteralPath $zip)){throw 'Telechargez le ZIP Windows Jobly 0.3.0 dans Telechargements puis reessayez.'}; $work=Join-Path ([IO.Path]::GetTempPath()) ('Jobly-'+[guid]::NewGuid()); try { Expand-Archive -LiteralPath $zip -DestinationPath $work; $root=Join-Path $work 'Jobly-0.3.0-win32-x64'; $name='Jobly-0.3.0-win-x64.exe'; $setup=Join-Path $root ('installateurs\'+$name); $lines=@(Get-Content -LiteralPath (Join-Path $root 'SHA256SUMS.txt') | Where-Object { $_.EndsWith('  installateurs/'+$name) }); if($lines.Count -ne 1){throw 'Empreinte absente ou ambigue.'}; $want=($lines[0] -split '\s+')[0]; $sha=[Security.Cryptography.SHA256]::Create(); try{$actual=([BitConverter]::ToString($sha.ComputeHash([IO.File]::ReadAllBytes($setup)))).Replace('-','')}finally{$sha.Dispose()}; if($want -notmatch '^[a-fA-F0-9]{64}$' -or $actual -ine $want){throw 'Integrite incorrecte : installation annulee.'}; @(Get-Process -Name Jobly -ErrorAction SilentlyContinue) | Where-Object { $_.MainWindowHandle -ne 0 } | ForEach-Object { [void]$_.CloseMainWindow(); if(!$_.WaitForExit(15000)){throw 'Fermez Jobly puis relancez la commande.'} }; $dest=if($env:JOBLY_INSTALL_DIR){$env:JOBLY_INSTALL_DIR}else{Join-Path $env:LOCALAPPDATA 'Programs\Jobly'}; $p=Start-Process -FilePath $setup -ArgumentList @('/S',('/D='+$dest)) -Wait -PassThru; if($p.ExitCode -ne 0){throw ('Installation interrompue : '+$p.ExitCode)}; if($env:JOBLY_NO_LAUNCH -ne '1'){Start-Process -FilePath (Join-Path $dest 'Jobly.exe')}; Write-Host ('Jobly installee dans '+$dest) } finally { if(Test-Path -LiteralPath $work){Remove-Item -LiteralPath $work -Recurse -Force} }
```

Les commandes conservent le dossier des données et ne modifient pas Gatekeeper, SmartScreen, l’antivirus ou la politique d’exécution PowerShell. Une distribution non signée peut néanmoins être refusée par les protections du système ; consultez le dépannage. Aucun terminal n’est nécessaire ensuite au quotidien. Si votre navigateur enregistre ailleurs que dans Téléchargements, déplacez-y le ZIP avant de coller la commande.
