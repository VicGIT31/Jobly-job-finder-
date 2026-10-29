# Jobly — application de bureau

Jobly recherche des stages et alternances tech en France. Son interface, ses filtres, les favoris, le suivi de candidatures, le profil et le CV reprennent ceux de la web app.

## Installer l’application

Ouvrez **DEMARRER.html** en double-cliquant dessus, ou suivez **INSTALLER.md**.

Parcours : télécharger le ZIP de livraison → dézipper → ouvrir l’installateur dans `installateurs/` → lancer **Jobly** depuis son icône.

Seuls les installateurs réellement produits sont présents. Consultez `VERIFICATION.md` pour les plateformes et contrôles effectués. Aucun lien de publication n’est inventé.

Aucun terminal, Node.js, Docker, PostgreSQL, Redis ou environnement de développement à installer pour utiliser un installateur fourni. Le backend de production, PostgreSQL et Meilisearch sont embarqués. Le moteur de recherche conserve les facettes, le tri, la géolocalisation et la tolérance aux fautes de la web app.

Internet est nécessaire pour récupérer les nouvelles offres, géocoder une nouvelle ville et ouvrir une candidature sur le site d’origine. Les données déjà stockées sont consultables hors connexion. Certains logos distants peuvent manquer hors connexion. Les sites sources peuvent bloquer ou limiter la collecte ; leur état est visible dans **Fichier → Bureau et messages locaux**.

La collecte se lance à l’ouverture puis toutes les deux heures **pendant que Jobly reste ouvert**. La fermeture arrête le backend et la base. Aucune tâche ne reste installée en arrière-plan.

## Vos données

Au premier lancement, créez un compte local avec votre nom, votre email et un mot de passe. Ce compte est administrateur de votre installation locale. Les messages de confirmation, de réinitialisation et d’alerte sont déposés dans la boîte locale, sans envoi extérieur. Google/LinkedIn OAuth, Resend et l’IA Anthropic demandent normalement des secrets serveur : ils ne sont pas embarqués. La connexion par mot de passe et les brouillons déterministes restent disponibles.

Emplacements : macOS `~/Library/Application Support/Jobly/` ; Windows `%APPDATA%\Jobly\`. La désinstallation ne supprime pas ces données. Utilisez **Sauvegarder** pour exporter une archive `.jobly` contenant les données et les CV. Ces sauvegardes contiennent des informations personnelles : gardez-les privées. Elles ne sont pas chiffrées. Les messages locaux restent dans `mail/` et peuvent être copiés séparément.

Pour reprendre les données d’une web app existante, son propriétaire peut produire une sauvegarde compatible avec `npm run desktop:export-web -- /chemin/sauvegarde.jobly` depuis le dépôt configuré, puis l’importer dans l’application. L’ancienne base n’est ni remplacée ni supprimée. Aucun compte, CV ou secret de l’installation de développement n’est fourni avec les installateurs.

## Intégrité et dépannage

`SHA256SUMS.txt` contient les empreintes des installateurs fournis. Les instructions de vérification figurent dans INSTALLER.md. Consultez également la rubrique Dépannage de DEMARRER.html et le journal `jobly.log`, accessible dans le menu Aide.

## Compiler depuis le code source — développeurs uniquement

Le ZIP de livraison est distinct du code source. La compilation nécessite le dépôt, Node.js 22.12+ (Node 24 LTS recommandé), npm et les outils de build du système. Elle se fait sur chaque OS/architecture cible :

```
npm ci
npm run desktop:dist
npm run desktop:delivery
```

La configuration `electron-builder.cjs` produit un DMG macOS ou un installateur NSIS Windows x64. macOS Intel et Apple Silicon sont construits séparément sur leurs machines respectives. Windows ARM natif et Linux ne sont pas configurés. Le workflow `.github/workflows/desktop.yml` automatise les builds natifs et leurs tests. Les certificats ne sont pas nécessaires au développement mais le sont pour une publication de confiance ; détails dans `desktop/README.md` du dépôt.
