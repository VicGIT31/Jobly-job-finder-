# Marche à suivre — Jobly

Guide pas à pas pour lancer le site, activer toutes les sources d'offres et
exploiter le projet au quotidien.

---

## 1. Prérequis

- **Docker Desktop** installé et démarré (vérifier : `docker --version`).
- **Node.js 20+** et **npm** (uniquement pour le dev hors Docker et les scripts).
- Le dépôt cloné localement (toutes les commandes se lancent à sa racine).

---

## 2. Démarrage rapide (tout en Docker)

```bash
cp .env.example .env      # crée la config locale
docker compose up --build # build + lance app, postgres, redis, meilisearch, minio
```

- Site : http://localhost:3000
- Au démarrage, le worker **ingère automatiquement de vraies offres** (LinkedIn
  fonctionne sans clé). Les offres apparaissent en 1 à 2 minutes.
- Arrêter : `docker compose down` (les données sont conservées).
- Repartir de zéro (base vide) : `docker compose down -v` puis `docker compose up --build`.

> ℹ️ Les identifiants d'infrastructure (utilisateur PostgreSQL, MinIO, clé
> Meilisearch) sont restés `nextstep` : ce sont des noms techniques liés aux
> volumes Docker existants, les renommer aurait cassé la base en place.

### Comptes de démonstration (candidats)

| Rôle | Email              | Mot de passe |
| ---- | ------------------ | ------------ |
| User | camille@jobly.test | jobly123     |
| User | theo@jobly.test    | jobly123     |

### Compte administrateur

Le seed ne crée **aucun** compte admin (son mot de passe est public). Renseigne
`ADMIN_USERNAME` / `ADMIN_PASSWORD` (et éventuellement `ADMIN_EMAIL`) dans
`.env` — fichier **non versionné** — puis :

```bash
docker compose exec app npm run admin:create   # ou `npm run admin:create` hors Docker
```

Le provisionnement est aussi rejoué à chaque `docker compose up` si les
variables sont présentes. Connexion sur `/connexion` avec **l'email ou
l'identifiant**, puis console sur **`/admin`**.

---

## 3. Activer TOUTES les sources d'offres

Par défaut, seules **LinkedIn** et **The Muse** tournent (sans clé). Pour ajouter
**France Travail** (couverture nationale exhaustive) et **Indeed + Glassdoor**
(via JSearch), renseigne les clés gratuites dans `.env`.

### 3.a France Travail (le plus important — toutes les offres de France)

1. Créer un compte sur **https://francetravail.io** (gratuit).
2. Menu **« Mes applications »** → **« Créer une application »**.
3. Souscrire à l'API **« Offres d'emploi v2 »**.
4. Copier l'**identifiant client** et la **clé secrète** dans `.env` :
   ```
   FRANCE_TRAVAIL_CLIENT_ID=xxxxxxxx
   FRANCE_TRAVAIL_CLIENT_SECRET=xxxxxxxx
   ```

### 3.b Indeed + Glassdoor (via JSearch / RapidAPI)

1. Créer un compte sur **https://rapidapi.com** (gratuit).
2. S'abonner à l'API **JSearch** (plan _Basic_, gratuit ≈ 200 requêtes/mois) :
   https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
3. Copier la clé **X-RapidAPI-Key** dans `.env` :
   ```
   RAPIDAPI_KEY=xxxxxxxx
   ```

### 3.c Appliquer les clés

```bash
docker compose up -d --build app   # recharge l'app avec les nouvelles variables
docker compose exec app npm run ingest:now   # ingestion immédiate (sans attendre le cron)
```

> ⚠️ Indeed et Glassdoor **bloquent le scraping direct** (403 / captcha). JSearch
> est la voie légale : il agrège Google for Jobs et remonte leurs annonces avec
> le vrai lien de candidature.

---

## 4. Vérifier que tout fonctionne

```bash
# Nombre d'offres indexées
curl -s "http://localhost:3000/api/search?limit=1"

# Répartition par source
docker compose exec postgres psql -U nextstep -d nextstep -c \
  "SELECT \"sourceSite\", COUNT(*) FROM job_offers GROUP BY 1 ORDER BY 2 DESC;"
```

Sur le site : ouvrir une offre → **« Postuler »** ouvre le vrai lien de l'annonce
dans un **nouvel onglet**.

---

## 5. Fonctionnement automatique (rien à faire)

| Tâche              | Fréquence            | Effet                                                |
| ------------------ | -------------------- | ---------------------------------------------------- |
| `ingest-offers`    | 30 min + démarrage   | Récupère les nouvelles offres, déduplique, indexe    |
| `offer-freshness`  | toutes les heures    | Marque `EXPIRED` les offres disparues de leur source |
| `purge-old-offers` | tous les jours à 3 h | **Supprime** définitivement les offres de +2 mois    |
| `daily-alerts`     | tous les jours à 8 h | Envoie les alertes email des recherches sauvegardées |

Réglages dans `.env` : `INGESTION_INTERVAL_MINUTES` (fréquence du cron).
La durée de vie des offres et l'activation de l'ingestion se pilotent désormais
depuis **`/admin/parametres`** ; les variables `OFFER_FRESHNESS_DAYS` et
`OFFER_MAX_AGE_DAYS` ne servent plus que de valeurs de repli.

---

## 5.b La console d'administration

Tout se gère depuis **`/admin`** (réservé au rôle ADMIN) :

| Section             | Usage                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| Tableau de bord     | Indicateurs, derniers cycles d'ingestion, lancement manuel, ré-indexation   |
| Offres              | Bloquer durablement une offre, la supprimer                                 |
| Entreprises         | Mettre en avant sur l'accueil, supprimer                                    |
| Utilisateurs        | Rôle, suspension, validation d'email, mot de passe, suppression             |
| Sources & ingestion | Santé des connecteurs sur 24 h, journal offre par offre                     |
| SEO                 | Titres, description, canonique, indexation, `robots.txt`, vérifications     |
| Paramètres          | Accroche, contact, inscriptions, mode maintenance, durées de vie des offres |
| Journal             | Historique de toutes les actions d'administration                           |

> Le **mode maintenance** coupe le site pour les visiteurs mais laisse passer
> `/connexion` et `/admin` : on peut toujours se connecter pour le désactiver.

---

## 6. Développement hors Docker (optionnel)

```bash
npm install
docker compose up postgres redis meilisearch minio minio-init  # infra seule
npx prisma migrate dev
npm run db:seed        # comptes démo
npm run ingest:now     # vraies offres
npm run search:sync    # (ré)indexation Meilisearch
npm run dev            # app Next.js (http://localhost:3000)
npm run worker         # crons + ingestion auto
```

Qualité : `npm run test` (Vitest), `npm run lint` (ESLint), `npx tsc --noEmit`.

---

## 7. Commandes utiles

```bash
docker compose ps                      # état des conteneurs
docker compose logs -f app             # logs live (ingestion, crons)
docker compose exec app npm run ingest:now   # forcer une ingestion
docker compose down                    # arrêter
docker compose down -v                 # arrêter + effacer les données
```

---

## 8. Déploiement / commits

- Dépôt : le remote Git `origin` (branche `main`).
- **Norme de commit** : **1 commit par fichier**, avec préfixe
  **`MOD:`** (modifié), **`ADD:`** (ajouté), **`RM:`** (supprimé).
  Exemple : `ADD: src/server/ingest/sources/jsearch.ts — connecteur ...`
