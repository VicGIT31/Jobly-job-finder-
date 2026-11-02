# Installer Jobly 0.3.0 par copier-coller

## Installation par une commande à copier-coller

Téléchargez d’abord **le ZIP de livraison de votre système dans Téléchargements**, sans le renommer. Ne choisissez pas le ZIP « Source code ». Le dépôt GitHub est privé : le téléchargement se fait depuis votre navigateur connecté et autorisé. Ces commandes utilisent ensuite le ZIP local ; aucun jeton GitHub ni clé API n’est demandé.

**macOS — ouvrez Terminal, collez cette ligne, puis appuyez sur Entrée.** Elle choisit Apple Silicon ou Intel, vérifie SHA-256, copie Jobly dans Applications (ou votre dossier Applications personnel si nécessaire), puis la lance.

```bash
/bin/bash -c 'a=x64; [ "$(/usr/sbin/sysctl -n hw.optional.arm64 2>/dev/null)" = 1 ] && a=arm64; z="$HOME/Downloads/Jobly-0.3.0-darwin-$a.zip"; [ -f "$z" ] || { printf "%s\n" "Téléchargez le ZIP Jobly 0.3.0 pour votre Mac dans Téléchargements, puis réessayez."; exit 1; }; d=$(mktemp -d); /usr/bin/ditto -x -k "$z" "$d" && /bin/bash "$d/Jobly-0.3.0-darwin-$a/INSTALLER-macOS.sh"; r=$?; rm -rf "$d"; exit "$r"'
```

**Windows x64 — ouvrez PowerShell, collez cette ligne, puis appuyez sur Entrée.** Elle vérifie SHA-256, ferme proprement Jobly si nécessaire, lance l’installation pour votre utilisateur puis ouvre l’application.

```powershell
$zip=Join-Path $HOME 'Downloads\Jobly-0.3.0-win32-x64.zip'; if(!(Test-Path -LiteralPath $zip)){throw 'Telechargez le ZIP Windows Jobly 0.3.0 dans Telechargements puis reessayez.'}; $work=Join-Path ([IO.Path]::GetTempPath()) ('Jobly-'+[guid]::NewGuid()); try { Expand-Archive -LiteralPath $zip -DestinationPath $work; $root=Join-Path $work 'Jobly-0.3.0-win32-x64'; $name='Jobly-0.3.0-win-x64.exe'; $setup=Join-Path $root ('installateurs\'+$name); $lines=@(Get-Content -LiteralPath (Join-Path $root 'SHA256SUMS.txt') | Where-Object { $_.EndsWith('  installateurs/'+$name) }); if($lines.Count -ne 1){throw 'Empreinte absente ou ambigue.'}; $want=($lines[0] -split '\s+')[0]; if($want -notmatch '^[a-fA-F0-9]{64}$' -or (Get-FileHash -LiteralPath $setup -Algorithm SHA256).Hash -ine $want){throw 'Integrite incorrecte : installation annulee.'}; @(Get-Process -Name Jobly -ErrorAction SilentlyContinue) | Where-Object { $_.MainWindowHandle -ne 0 } | ForEach-Object { [void]$_.CloseMainWindow(); if(!$_.WaitForExit(15000)){throw 'Fermez Jobly puis relancez la commande.'} }; $dest=if($env:JOBLY_INSTALL_DIR){$env:JOBLY_INSTALL_DIR}else{Join-Path $env:LOCALAPPDATA 'Programs\Jobly'}; $p=Start-Process -FilePath $setup -ArgumentList @('/S',('/D='+$dest)) -Wait -PassThru; if($p.ExitCode -ne 0){throw ('Installation interrompue : '+$p.ExitCode)}; if($env:JOBLY_NO_LAUNCH -ne '1'){Start-Process -FilePath (Join-Path $dest 'Jobly.exe')}; Write-Host ('Jobly installee dans '+$dest) } finally { if(Test-Path -LiteralPath $work){Remove-Item -LiteralPath $work -Recurse -Force} }
```

Les commandes conservent le dossier des données et ne modifient pas Gatekeeper, SmartScreen, l’antivirus ou la politique d’exécution PowerShell. Une distribution non signée peut néanmoins être refusée par les protections du système ; consultez le dépannage. Aucun terminal n’est nécessaire ensuite au quotidien. Si votre navigateur enregistre ailleurs que dans Téléchargements, déplacez-y le ZIP avant de coller la commande.

