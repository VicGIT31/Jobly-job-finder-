# Installer et démarrer Jobly 0.4.1

## Choisir votre téléchargement

Téléchargez le ZIP de livraison correspondant à votre ordinateur. Le ZIP du code source proposé par GitHub n’est pas une application prête à installer. Dézippez la livraison, puis ouvrez `installateurs/`. `VERIFICATION.md` énumère les fichiers réellement inclus et les systèmes testés.

## macOS

1. Menu Apple → À propos de ce Mac : « Puce Apple » signifie **arm64**, « Processeur Intel » signifie **x64**.
2. Ouvrez le fichier `Jobly-0.4.0-mac-arm64.dmg` ou `Jobly-0.4.0-mac-x64.dmg` présent dans `installateurs/`.
3. Dans la fenêtre du disque, faites glisser **Jobly vers Applications**. Si vous mettez à jour, quittez d’abord l’ancienne application et remplacez son fichier dans Applications.
4. Éjectez le disque puis ouvrez **Applications → Jobly**. Ajoutez son icône au Dock si souhaité.
5. La recherche s’ouvre directement. Aucun compte, terminal ou serveur à lancer.

Si macOS ne peut pas vérifier l’éditeur, vérifiez l’origine et l’empreinte du téléchargement. Pour un paquet non notarisé dont vous avez vérifié la provenance, utilisez le parcours ponctuel proposé par macOS dans Réglages Système → Confidentialité et sécurité, si disponible. Si le système refuse le paquet, utilisez une distribution signée et notarisée lorsqu’elle est fournie. Ne désactivez pas Gatekeeper et ne retirez pas les attributs de quarantaine en masse.

## Windows

1. Utilisez Windows 10 ou 11 **64 bits x64**.
2. Ouvrez `Jobly-0.4.0-win-x64.exe` dans `installateurs/`.
3. Choisissez la langue, le dossier et les raccourcis dans l’assistant, puis terminez l’installation.
4. Lancez Jobly depuis le menu Démarrer ou son icône de bureau. Aucun Node.js, Docker ou terminal nécessaire.

Un paquet non signé peut afficher un avertissement d’éditeur inconnu. Vérifiez la source et l’empreinte avant toute décision. Si la politique de votre système bloque l’installateur, utilisez un fichier signé lorsqu’il est fourni ; ne désactivez pas SmartScreen ou l’antivirus. Windows ARM n’est pas une cible native vérifiée.

## Les dix premières minutes

Choisissez Commerce & marketing ou Auxiliaires vétérinaires. Toulouse et 30 km sont les valeurs initiales. Lancez une recherche, affinez éventuellement les filtres, puis enregistrez un favori et ouvrez « Postuler ». « Toute la France » élargit explicitement la zone. Les résultats se complètent pendant la collecte ; une absence d’ASV à proximité peut refléter la couverture ou le marché réel.

Internet est nécessaire à l’actualisation, aux candidatures, à certains logos et au géocodage distant. Les données déjà collectées restent disponibles localement. L’application n’est pas un moteur couvrant toutes les offres d’Internet et ne fonctionne pas entièrement hors ligne.

## Mise à jour et sauvegarde

Quittez Jobly, installez la nouvelle version au même emplacement, puis relancez-la. Vos données restent dans `~/Library/Application Support/Jobly/` (macOS) ou `%APPDATA%\Jobly\` (Windows), séparément de l’application. Ne supprimez pas ce dossier.

Avant migration 0.2.x → 0.3.0, une sauvegarde privée `avant-0.3.0.jobly` est créée automatiquement. Les anciens profils sont regroupés sans écran de connexion. Les données secondaires archivées sont consultables dans Mon espace → Confidentialité. Pour une sauvegarde manuelle, ouvrez **Actualisation & données → Sauvegarder**. Ne partagez pas votre sauvegarde : elle contient vos données personnelles.

Il n’y a pas de mise à jour automatique de l’exécutable dans cette version : téléchargez et installez la nouvelle distribution. « Actualiser » met à jour les offres.

## Dépannage

- **Aucune offre** : attendez les premiers lots et regardez Actualisation & données. Vérifiez le métier, le contrat et la zone ; élargissez volontairement à 100 km ou à la France. Une commune non résolue n’est jamais remplacée silencieusement par Toulouse.
- **Offres anciennes** : cliquez Actualiser. Consultez la date de publication, lorsqu’elle est connue, et la dernière vérification. Les sources peuvent échouer ou ne pas exposer de date de publication. Une vérification récente n’implique pas une publication récente.
- **Nouvelle ville** : saisissez le nom officiel dans la recherche puis cliquez Actualiser pour adapter les collecteurs locaux. Les filtres seuls interrogent le catalogue sans collecte intégrale.
- **Source indisponible** : les autres sources continuent. Les erreurs et collectes partielles figurent dans Actualisation & données. Aucun compte personnel ni clé API n’est requis pour les sources fournies.
- **Démarrage impossible** : quittez puis relancez. Aide → Journal de diagnostic donne `jobly.log`. Vérifiez l’espace disque, les droits d’écriture du dossier de données et l’architecture téléchargée.
- **Recherche incohérente** : Actualisation & données → Réparer la recherche. Vos favoris ne sont pas supprimés.
- **CV importé introuvable** : si le fichier n’était pas dans la sauvegarde d’origine, réimportez le PDF depuis Profil & CV.
- **Lien de candidature fermé** : une annonce peut changer entre deux vérifications. Consultez sa fiche et une autre source si disponible.

## Contrôle facultatif de l’intégrité

Les empreintes exactes sont dans `SHA256SUMS.txt`. Cette opération nécessite un terminal mais reste facultative pour l’usage quotidien.

macOS, depuis le dossier dézippé : `shasum -a 256 -c SHA256SUMS.txt`.
Windows PowerShell : `Get-FileHash .\installateurs\Jobly-0.4.0-win-x64.exe -Algorithm SHA256`, puis comparez avec `SHA256SUMS.txt`.

## Compilation depuis le code source

Elle concerne uniquement les développeurs. Node 24 LTS, npm et la plateforme cible sont nécessaires. Dans le dépôt : `npm ci`, `npm run desktop:dist -- --publish never`, `npm run desktop:smoke -- --fresh`, `npm run desktop:delivery`. La CI construit chaque cible nativement. Un fichier Markdown ou HTML de ce guide ne compile et n’installe rien.

<!-- COMMANDES-INSTALLATION -->
## Installation par une commande à copier-coller

Téléchargez le ZIP de votre système dans **Téléchargements**. Ces commandes installent le paquet local pour votre utilisateur, vérifient son SHA-256 et ouvrent Jobly. Aucun Node.js, Docker, compte ou clé API n’est nécessaire.

**macOS · Apple Silicon ou Intel**

```bash
/bin/bash -c 'a=x64; [ "$(/usr/sbin/sysctl -n hw.optional.arm64 2>/dev/null)" = 1 ] && a=arm64; z="$HOME/Downloads/Jobly-0.4.1-darwin-$a.zip"; [ -f "$z" ] || { printf "%s\n" "Téléchargez le ZIP Jobly 0.4.1 pour votre Mac dans Téléchargements, puis réessayez."; exit 1; }; d=$(mktemp -d); /usr/bin/ditto -x -k "$z" "$d" && /bin/bash "$d/Jobly-0.4.1-darwin-$a/INSTALLER-macOS.sh"; r=$?; rm -rf "$d"; exit "$r"'
```

**Windows x64 · PowerShell**

```powershell
$zip=Join-Path $HOME 'Downloads\Jobly-0.4.1-win32-x64.zip'; if(!(Test-Path -LiteralPath $zip)){throw 'Telechargez le ZIP Windows Jobly 0.4.1 dans Telechargements puis reessayez.'}; $work=Join-Path ([IO.Path]::GetTempPath()) ('Jobly-'+[guid]::NewGuid()); try { Expand-Archive -LiteralPath $zip -DestinationPath $work; $root=Join-Path $work 'Jobly-0.4.1-win32-x64'; $name='Jobly-0.4.1-win-x64.exe'; $setup=Join-Path $root ('installateurs\'+$name); $lines=@(Get-Content -LiteralPath (Join-Path $root 'SHA256SUMS.txt') | Where-Object { $_.EndsWith('  installateurs/'+$name) }); if($lines.Count -ne 1){throw 'Empreinte absente ou ambigue.'}; $want=($lines[0] -split '\s+')[0]; $sha=[Security.Cryptography.SHA256]::Create(); try{$actual=([BitConverter]::ToString($sha.ComputeHash([IO.File]::ReadAllBytes($setup)))).Replace('-','')}finally{$sha.Dispose()}; if($want -notmatch '^[a-fA-F0-9]{64}$' -or $actual -ine $want){throw 'Integrite incorrecte : installation annulee.'}; @(Get-Process -Name Jobly -ErrorAction SilentlyContinue) | Where-Object { $_.MainWindowHandle -ne 0 } | ForEach-Object { [void]$_.CloseMainWindow(); if(!$_.WaitForExit(15000)){throw 'Fermez Jobly puis relancez la commande.'} }; $dest=if($env:JOBLY_INSTALL_DIR){$env:JOBLY_INSTALL_DIR}else{Join-Path $env:LOCALAPPDATA 'Programs\Jobly'}; $p=Start-Process -FilePath $setup -ArgumentList @('/S',('/D='+$dest)) -Wait -PassThru; if($p.ExitCode -ne 0){throw ('Installation interrompue : '+$p.ExitCode)}; if($env:JOBLY_NO_LAUNCH -ne '1'){Start-Process -FilePath (Join-Path $dest 'Jobly.exe')}; Write-Host ('Jobly installee dans '+$dest) } finally { if(Test-Path -LiteralPath $work){Remove-Item -LiteralPath $work -Recurse -Force} }
```

Les données personnelles sont conservées lors des mises à jour. Les protections du système restent actives ; une signature éditeur reconnue nécessite les certificats de publication.
