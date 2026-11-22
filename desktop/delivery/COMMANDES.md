# Installer Jobly 0.6.2

## Installation par une commande à copier-coller

Téléchargez le ZIP de votre système dans **Téléchargements**. Ces commandes installent le paquet local pour votre utilisateur, vérifient son SHA-256 et ouvrent Jobly. Aucun Node.js, Docker, compte ou clé API n’est nécessaire.

**macOS · Apple Silicon ou Intel**

```bash
/bin/bash -c 'a=x64; [ "$(/usr/sbin/sysctl -n hw.optional.arm64 2>/dev/null)" = 1 ] && a=arm64; z="$HOME/Downloads/Jobly-0.6.2-darwin-$a.zip"; [ -f "$z" ] || { printf "%s\n" "Téléchargez le ZIP Jobly 0.6.2 pour votre Mac dans Téléchargements, puis réessayez."; exit 1; }; d=$(mktemp -d); /usr/bin/ditto -x -k "$z" "$d" && /bin/bash "$d/Jobly-0.6.2-darwin-$a/INSTALLER-macOS.sh"; r=$?; rm -rf "$d"; exit "$r"'
```

**Windows x64 · PowerShell**

```powershell
$zip=Join-Path $HOME 'Downloads\Jobly-0.6.2-win32-x64.zip'; if(!(Test-Path -LiteralPath $zip)){throw 'Telechargez le ZIP Windows Jobly 0.6.2 dans Telechargements puis reessayez.'}; $work=Join-Path ([IO.Path]::GetTempPath()) ('Jobly-'+[guid]::NewGuid()); try { Expand-Archive -LiteralPath $zip -DestinationPath $work; $root=Join-Path $work 'Jobly-0.6.2-win32-x64'; $name='Jobly-0.6.2-win-x64.exe'; $setup=Join-Path $root ('installateurs\'+$name); $lines=@(Get-Content -LiteralPath (Join-Path $root 'SHA256SUMS.txt') | Where-Object { $_.EndsWith('  installateurs/'+$name) }); if($lines.Count -ne 1){throw 'Empreinte absente ou ambigue.'}; $want=($lines[0] -split '\s+')[0]; $sha=[Security.Cryptography.SHA256]::Create(); try{$actual=([BitConverter]::ToString($sha.ComputeHash([IO.File]::ReadAllBytes($setup)))).Replace('-','')}finally{$sha.Dispose()}; if($want -notmatch '^[a-fA-F0-9]{64}$' -or $actual -ine $want){throw 'Integrite incorrecte : installation annulee.'}; @(Get-Process -Name Jobly -ErrorAction SilentlyContinue) | Where-Object { $_.MainWindowHandle -ne 0 } | ForEach-Object { [void]$_.CloseMainWindow(); if(!$_.WaitForExit(15000)){throw 'Fermez Jobly puis relancez la commande.'} }; $dest=if($env:JOBLY_INSTALL_DIR){$env:JOBLY_INSTALL_DIR}else{Join-Path $env:LOCALAPPDATA 'Programs\Jobly'}; $p=Start-Process -FilePath $setup -ArgumentList @('/S',('/D='+$dest)) -Wait -PassThru; if($p.ExitCode -ne 0){throw ('Installation interrompue : '+$p.ExitCode)}; if($env:JOBLY_NO_LAUNCH -ne '1'){Start-Process -FilePath (Join-Path $dest 'Jobly.exe')}; Write-Host ('Jobly installee dans '+$dest) } finally { if(Test-Path -LiteralPath $work){Remove-Item -LiteralPath $work -Recurse -Force} }
```

Les données personnelles sont conservées lors des mises à jour. Les protections du système restent actives ; une signature éditeur reconnue nécessite les certificats de publication.
