# Mettre à jour Jobly sous Windows

Ce guide permet de remplacer une ancienne version par **Jobly 0.5.0**, avec une commande PowerShell. Vos favoris, recherches, candidatures et fichiers personnels restent dans votre profil local.

## 1. Télécharger le ZIP Windows

[Télécharger Jobly 0.5.0 pour Windows x64](https://github.com/VicGIT31/Internship-finders/releases/download/v0.5.0/Jobly-0.5.0-win32-x64.zip).

Enregistrez **Jobly-0.5.0-win32-x64.zip** dans le dossier **Downloads / Téléchargements de votre utilisateur**, en conservant ce nom. Ne le décompressez pas : la commande s’en charge.

Le dépôt GitHub est privé : utilisez un compte autorisé pour télécharger le ZIP, ou demandez à la personne qui vous partage Jobly de vous transmettre ce fichier. Les archives « Source code » ne sont pas des installateurs.

## 2. Copier-coller la commande PowerShell

Ouvrez le menu Démarrer, recherchez **Windows PowerShell**, puis ouvrez-le normalement. Aucun mode administrateur, Node.js ou Docker n’est nécessaire.

Copiez **tout le bloc suivant**, collez-le dans PowerShell, puis appuyez sur **Entrée** :

```powershell
$zip=Join-Path $HOME 'Downloads\Jobly-0.5.0-win32-x64.zip'; if(!(Test-Path -LiteralPath $zip)){throw 'Telechargez le ZIP Windows Jobly 0.5.0 dans Telechargements puis reessayez.'}; $work=Join-Path ([IO.Path]::GetTempPath()) ('Jobly-'+[guid]::NewGuid()); try { Expand-Archive -LiteralPath $zip -DestinationPath $work; $root=Join-Path $work 'Jobly-0.5.0-win32-x64'; $name='Jobly-0.5.0-win-x64.exe'; $setup=Join-Path $root ('installateurs\'+$name); $lines=@(Get-Content -LiteralPath (Join-Path $root 'SHA256SUMS.txt') | Where-Object { $_.EndsWith('  installateurs/'+$name) }); if($lines.Count -ne 1){throw 'Empreinte absente ou ambigue.'}; $want=($lines[0] -split '\s+')[0]; $sha=[Security.Cryptography.SHA256]::Create(); try{$actual=([BitConverter]::ToString($sha.ComputeHash([IO.File]::ReadAllBytes($setup)))).Replace('-','')}finally{$sha.Dispose()}; if($want -notmatch '^[a-fA-F0-9]{64}$' -or $actual -ine $want){throw 'Integrite incorrecte : installation annulee.'}; @(Get-Process -Name Jobly -ErrorAction SilentlyContinue) | Where-Object { $_.MainWindowHandle -ne 0 } | ForEach-Object { [void]$_.CloseMainWindow(); if(!$_.WaitForExit(15000)){throw 'Fermez Jobly puis relancez la commande.'} }; $dest=if($env:JOBLY_INSTALL_DIR){$env:JOBLY_INSTALL_DIR}else{Join-Path $env:LOCALAPPDATA 'Programs\Jobly'}; $p=Start-Process -FilePath $setup -ArgumentList @('/S',('/D='+$dest)) -Wait -PassThru; if($p.ExitCode -ne 0){throw ('Installation interrompue : '+$p.ExitCode)}; if($env:JOBLY_NO_LAUNCH -ne '1'){Start-Process -FilePath (Join-Path $dest 'Jobly.exe')}; Write-Host ('Jobly installee dans '+$dest) } finally { if(Test-Path -LiteralPath $work){Remove-Item -LiteralPath $work -Recurse -Force} }
```

La commande vérifie l’empreinte SHA-256 de l’installateur fourni dans le ZIP, demande à Jobly de se fermer proprement, installe la nouvelle version puis rouvre l’application. Elle installe par défaut dans `%LOCALAPPDATA%\Programs\Jobly`.

**Si vous aviez choisi un autre emplacement**, conservez-le pour la mise à jour. Avant de coller la commande ci-dessus, indiquez ce chemin dans la même fenêtre PowerShell, par exemple :

```powershell
$env:JOBLY_INSTALL_DIR = 'D:\Applications\Jobly'
```

Remplacez ce chemin par celui de votre installation actuelle.

## 3. Vérifier la mise à jour

Lorsque Jobly s’ouvre, vérifiez la version **0.5.0** dans le pied de page. La collecte des nouvelles offres reprend automatiquement ; le catalogue et vos données existantes restent accessibles pendant son actualisation.

La mise à jour du logiciel est distincte du bouton **Actualiser les offres**, qui renouvelle uniquement les annonces.

## En cas de problème

- **ZIP introuvable** : vérifiez son nom et son emplacement dans `$HOME\Downloads`. Un fichier renommé avec « (1) » doit retrouver son nom d’origine. Vous pouvez aussi remplacer uniquement le chemin défini au début par `$zip` si vos téléchargements sont dans un autre dossier.
- **Jobly ne se ferme pas** : fermez sa fenêtre, attendez quelques secondes puis relancez la commande.
- **Empreinte incorrecte ou ZIP illisible** : téléchargez à nouveau le ZIP officiel de cette version puis réessayez.
- **Windows affiche une protection** : vérifiez l’origine du fichier. La commande ne désactive ni les protections de Windows ni la stratégie d’exécution PowerShell.

Vos données sont dans **`%APPDATA%\Jobly`**, séparément de l’application. **Ne supprimez pas ce dossier pour effectuer une mise à jour.** Pour conserver une copie supplémentaire, utilisez **Bureau → Sauvegarder** dans Jobly avant la mise à jour.

La commande ci-dessus cible la version **0.5.0**. Pour une version ultérieure, utilisez le guide et la commande associés à sa Release.
