# API.md — toutes les clés API du projet, en un seul endroit

> Référence unique pour se souvenir de ce qui existe, ce qui est actif, et ce
> qui manque. Détail complet par source dans `SOURCES.md` (France) et
> `SOURCES_EUROPE_ASIA.md` (international + logos). Toutes les variables vont
> dans `.env` (non versionné) — jamais dans un fichier suivi par Git.

---

## Vue d'ensemble

| Clé                                                         | Sert à                                 | Statut                          | Où l'obtenir                                                            |
| ----------------------------------------------------------- | -------------------------------------- | ------------------------------- | ----------------------------------------------------------------------- |
| `FRANCE_TRAVAIL_CLIENT_ID` / `_SECRET`                      | Offres — source officielle France      | ⚠️ **Manquante — prioritaire**  | [francetravail.io](https://francetravail.io)                            |
| `JSEARCH_API_KEY`                                           | Offres — 41+ éditeurs (Indeed, WTTJ…)  | ⚠️ **Manquante — prioritaire**  | [openwebninja.com](https://www.openwebninja.com/api/jsearch)            |
| `THEMUSE_API_KEY`                                           | Offres — The Muse, quota plus élevé    | ⚪ Optionnelle (marche sans)    | [themuse.com/developers](https://www.themuse.com/developers/api/v2)     |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY`                          | Offres — multi-pays Europe/Asie/US     | 🔮 Pas encore codée             | [developer.adzuna.com](https://developer.adzuna.com)                    |
| `JOOBLE_API_KEY`                                            | Offres — 60+ pays, volume de repli     | 🔮 Pas encore codée             | [jooble.org/api/about](https://jooble.org/api/about)                    |
| `REED_API_KEY`                                              | Offres — Royaume-Uni                   | 🔮 Pas encore codée             | [reed.co.uk/developers](https://www.reed.co.uk/developers/Jobseeker)    |
| `TALENT_PUBLISHER_ID`                                       | Offres — flux XML Talent.com           | 🔮 Pas encore codée             | Programme partenaire (formulaire commercial)                            |
| `WORK24_API_KEY`                                            | Offres — Corée du Sud                  | 🔮 Pas encore codée             | [work24.go.kr](https://www.work24.go.kr) (en coréen)                    |
| `BRANDFETCH_API_KEY` **(nom à choisir à l'implémentation)** | Logos d'entreprise, meilleure qualité  | 🔮 Pas encore codée             | [brandfetch.com/developers](https://brandfetch.com/developers/logo-api) |
| `ANTHROPIC_API_KEY`                                         | IA — brouillon de réponse candidature  | ⚪ Optionnelle (repli honnête)  | [console.anthropic.com](https://console.anthropic.com)                  |
| `GOOGLE_CLIENT_ID` / `_SECRET`                              | Connexion "Se connecter avec Google"   | ⚪ Optionnelle (email/mdp OK)   | [console.cloud.google.com](https://console.cloud.google.com)            |
| `LINKEDIN_CLIENT_ID` / `_SECRET`                            | Connexion "Se connecter avec LinkedIn" | ⚪ Optionnelle (email/mdp OK)   | [linkedin.com/developers](https://www.linkedin.com/developers/apps)     |
| `RESEND_API_KEY`                                            | Emails transactionnels en production   | ⚪ Optionnelle (console en dev) | [resend.com](https://resend.com)                                        |

**Légende** : ✅ active et configurée · ⚠️ codée, il manque juste la clé · ⚪ optionnelle, le produit fonctionne sans (juste moins bien) · 🔮 fonctionnalité pas encore construite, la clé est le prérequis pour commencer.

---

## 1. Offres d'emploi

### 1.a Déjà actives, sans aucune clé

Ces sources tournent déjà et fournissent l'essentiel du volume actuel
(~1500 offres) : **Free-Work, APEC, LinkedIn (endpoint invité), HelloWork,
Arbetsförmedlingen (Suède), boards ATS génériques (Greenhouse/Lever/Ashby),
The Muse**. Rien à faire ici. Détail par source : `SOURCES.md` §2.

### 1.b Codées, en attente d'une clé — priorité n°1

| Variable(s)                                                  | Où l'obtenir                                                                                        | Coût                              | Gain                                                                         |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------- |
| `FRANCE_TRAVAIL_CLIENT_ID`<br>`FRANCE_TRAVAIL_CLIENT_SECRET` | [francetravail.io](https://francetravail.io) → créer une appli → souscrire à « Offres d'emploi v2 » | Gratuit                           | **Le plus gros gain possible** : source officielle exhaustive pour la France |
| `JSEARCH_API_KEY`                                            | [openwebninja.com](https://www.openwebninja.com), en-tête `X-API-Key`                               | Gratuit (payant au-delà du quota) | 41+ éditeurs en un appel : Indeed, Glassdoor, WTTJ, JobTeaser, Meteojob…     |

### 1.c Pas encore codées — clé à fournir pour que je construise le connecteur

| Variable(s)                         | Couverture                                                           | Où l'obtenir                                                                 | Coût                       |
| ----------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------- |
| `ADZUNA_APP_ID`<br>`ADZUNA_APP_KEY` | UK, DE, FR, ES, IT, NL, PL, AT + Inde, Singapour, Canada, Australie… | [developer.adzuna.com](https://developer.adzuna.com)                         | Gratuit, ~1000 appels/mois |
| `JOOBLE_API_KEY`                    | 60+ pays, généraliste                                                | [jooble.org/api/about](https://jooble.org/api/about)                         | Gratuit sur demande        |
| `REED_API_KEY`                      | Royaume-Uni uniquement                                               | [reed.co.uk/developers](https://www.reed.co.uk/developers/Jobseeker)         | Gratuit                    |
| `TALENT_PUBLISHER_ID`               | Flux XML, volume junior important                                    | Programme partenaire (formulaire commercial)                                 | Gratuit après validation   |
| `WORK24_API_KEY`                    | Corée du Sud, très détaillée                                         | [work24.go.kr](https://www.work24.go.kr) ou data.go.kr (interface en coréen) | Gratuit                    |

**EURES** (portail UE/EEE, ~3M offres) : pas d'API publique tierce confirmée
lors de la recherche — contacter le helpdesk EURES avant d'y investir du
temps. Détail : `SOURCES_EUROPE_ASIA.md` §2.

> Donne-moi une clé de cette section et j'implémente le connecteur
> correspondant — le squelette (`SourceConnector` + couche HTTP durcie) rend
> chaque ajout rapide.

---

## 2. Logos d'entreprise

Aucune clé configurée aujourd'hui. **Clearbit, l'option gratuite historique
sans clé, a fermé le 8 décembre 2025** (rachat HubSpot) — ne plus la
chercher. Repli actuel : favicon Google (gratuit, sans clé, qualité modeste),
câblé uniquement pour les 10 entreprises du connecteur ATS boards dont le
domaine est vérifié à la main.

| Variable (nom indicatif)        | Où l'obtenir                                                            | Coût                                                 | Avantage                                   |
| ------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------ |
| `BRANDFETCH_API_KEY`            | [brandfetch.com/developers](https://brandfetch.com/developers/logo-api) | Gratuit, 500k req/mois, **sans attribution requise** | Meilleure option gratuite des deux         |
| `LOGODEV_API_KEY` (alternative) | [logo.dev](https://www.logo.dev)                                        | Gratuit, 500k req/mois, attribution obligatoire      | Chemin de migration direct depuis Clearbit |

Détail complet (tableau comparatif, ce qui est déjà câblé) :
`SOURCES_EUROPE_ASIA.md` §7.

---

## 3. IA

| Variable            | Sert à                                          | Sans clé                                                              | Où l'obtenir                                           |
| ------------------- | ----------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| `ANTHROPIC_API_KEY` | Brouillon de réponse de candidature (IA réelle) | Gabarit déterministe sans IA, jamais présenté comme « généré par IA » | [console.anthropic.com](https://console.anthropic.com) |

---

## 4. Connexion (auth sociale)

Optionnelles : la connexion email + mot de passe fonctionne déjà sans elles.

| Variables                                        | Où l'obtenir                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`<br>`GOOGLE_CLIENT_SECRET`     | [console.cloud.google.com](https://console.cloud.google.com) → identifiants OAuth 2.0 |
| `LINKEDIN_CLIENT_ID`<br>`LINKEDIN_CLIENT_SECRET` | [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps)              |

---

## 5. Emails transactionnels

| Variable         | Sert à                                      | Sans clé                                     | Où l'obtenir                     |
| ---------------- | ------------------------------------------- | -------------------------------------------- | -------------------------------- |
| `RESEND_API_KEY` | Envoi réel (réinitialisation mdp, alertes…) | `EMAIL_PROVIDER=console` : emails en log dev | [resend.com](https://resend.com) |

---

## 6. Hors périmètre de ce fichier

Infrastructure locale/self-hosted, pas des APIs tierces à « retenir » :
`DATABASE_URL` (PostgreSQL), `REDIS_URL`, `MEILISEARCH_API_KEY`,
`S3_ENDPOINT`/`S3_ACCESS_KEY`/`S3_SECRET_KEY` (MinIO), `AUTH_SECRET`,
`INGEST_API_KEY`, et les identifiants du compte admin
(`ADMIN_USERNAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD`). Toutes documentées avec
leur valeur par défaut dans `.env.example`.
