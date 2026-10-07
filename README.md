# Cyber Gym — suivi musculation

PWA de suivi de musculation construite à partir des maquettes « Suivi musculation » : séance du jour, séance en cours, programmes, historique et progression.

- **Front** : Vue 3, vue-router, Vite, `vite-plugin-pwa` (installable, fonctionne hors ligne)
- **Back** : Node ≥ 20, Express 5
- **Base** : [PGlite](https://pglite.dev) embarqué par défaut (Postgres en WASM, fichiers dans `server/data/`), ou **PostgreSQL** via `DATABASE_URL`

## Démarrage

```bash
npm install
npm run db:demo   # optionnel : 8 semaines d'historique de démo sur le compte de test (serveur arrêté)
npm run dev       # API sur :3000 + Vite sur :5173
```

Ouvrir http://localhost:5173 et se connecter (ou créer un compte). Au premier lancement, la base est migrée et le compte de test est créé.

### Compte de test (local uniquement)

| E-mail                | Mot de passe    |
| --------------------- | --------------- |
| `test@cybergym.local` | `cybergym-test` |

Créé au démarrage du serveur quand `NODE_ENV` ≠ `production` ; un bouton « Compte de test (local) » remplit le formulaire de connexion en dev. En production il n'est jamais créé, et la connexion comme la réinitialisation sont refusées pour cette adresse même si elle existait en base. Les identifiants sont définis dans `server/src/accounts.js`.

### Production

```bash
npm run build
npm start         # Express sert l'API et la PWA compilée sur :3000
```

| Variable        | Rôle                                                                | Défaut          |
| --------------- | ------------------------------------------------------------------- | --------------- |
| `DATABASE_URL`  | Utilise PostgreSQL au lieu de PGlite (`postgres://user:pass@host/db`) | —               |
| `PGLITE_DIR`    | Dossier des données PGlite (relatif à `server/`)                    | `data/pgdata`   |
| `PORT` / `HOST` | Écoute du serveur                                                   | `3000` / `127.0.0.1` |
| `API_PORT`      | Port de l'API en dev (utilisé aussi par le proxy Vite)              | `3000`          |
| `DEMO=1`        | Génère l'historique de démo du compte de test au démarrage s'il n'a aucune séance (hors production) | — |
| `OWNER_EMAIL`   | Compte qui reçoit les données créées avant l'arrivée des comptes (voir « Comptes ») | compte de test hors production |
| `APP_URL`       | URL publique utilisée dans le lien « mot de passe oublié »          | origine de la requête |
| `SMTP_HOST`     | Relais SMTP (Brevo : `smtp-relay.brevo.com`) ; sans lui, le lien « mot de passe oublié » est écrit dans les logs | — |
| `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | Port (587 STARTTLS, 465 TLS) et identifiants du relais | `587` |
| `MAIL_FROM`     | Expéditeur (adresse d'un domaine authentifié chez Brevo)             | `Cyber Gym <no-reply@localhost>` |

> PGlite n'accepte qu'un processus à la fois sur un même dossier : arrêter le serveur avant `npm run db:demo`.
> Pour installer la PWA sur un téléphone, elle doit être servie en HTTPS (reverse proxy type Caddy/Traefik).

## Déploiement (Docker, gym.jibhey.fr)

Production : **https://gym.jibhey.fr**, sur le VPS `jibhey.fr`, avec les mêmes conventions que les autres apps du serveur.

- `Dockerfile` en deux étapes : build de la PWA, puis image Node 24 qui lance l'API Express (elle sert aussi la PWA). Healthcheck sur `/api/health`.
- `docker-compose.yml` : conteneur `cyber-gym`, exposé uniquement sur `127.0.0.1:4320`, relié au réseau Docker `infra` pour joindre le Postgres partagé (`/srv/postgres`, base `cybergym`).
- Caddy (`/etc/caddy/sites/cyber-gym.caddy`) : HTTPS automatique, en-têtes de sécurité, CSP, compression, puis reverse proxy vers le conteneur.
- Sauvegardes : la base `cybergym` est incluse dans le dump nocturne existant (`/srv/backups/backup.sh`, 3 h 15, 14 jours).

```bash
scripts/server-setup.sh   # une seule fois (idempotent) : dossier, base + rôle, .env, site Caddy
./deploy.sh               # rsync des sources → docker compose up -d --build → vérification HTTPS
```

Sur le serveur, les fichiers sont dans `/srv/apps/cyber-gym`. Le `.env`, avec le mot de passe de base généré sur place, ne quitte jamais le serveur. Logs : `ssh jibhey.fr docker logs -f cyber-gym`.

En production, ajouter au `.env` du serveur `OWNER_EMAIL` (rattachement des données existantes), `APP_URL=https://gym.jibhey.fr` et le relais Brevo (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`), le même que holyspoon.

## Comptes

- **Inscription** (nom, e-mail, mot de passe ≥ 8 caractères) sans activation par e-mail : le compte est utilisable immédiatement, avec son propre catalogue d'exercices et le programme Push / Pull / Legs de départ.
- **Connexion** : session par cookie `HttpOnly`, `SameSite=Lax` (`Secure` en production), valable 90 jours. Mots de passe hachés avec scrypt (module `crypto` de Node). Tentatives limitées par IP sur connexion, inscription et oubli.
- **Mot de passe oublié** : lien à usage unique valable 1 h, envoyé par e-mail (relais SMTP Brevo) ; la réponse est identique que l'adresse existe ou non. En local sans SMTP, le lien est affiché dans les logs et proposé directement à l'écran. Un nouveau mot de passe déconnecte tous les appareils.
- **Profil** (`/profil`, icône en haut de « Aujourd'hui ») : nom, e-mail, changement de mot de passe (déconnecte les autres appareils), déconnexion (vide la file hors-ligne et le cache d'API de l'appareil).
- **Cloisonnement** : exercices, presets et séances portent un `user_id` ; chaque route de l'API filtre sur le compte connecté.
- **Données existantes** : la migration `003_users.sql` laisse les données d'avant les comptes sans propriétaire (invisibles), puis elles sont rattachées au compte `OWNER_EMAIL` — dès sa création, ou au démarrage s'il existe déjà. Hors production, à défaut d'`OWNER_EMAIL`, c'est le compte de test qui les reçoit. Tant que des données attendent, l'adresse propriétaire ne peut pas être prise par un changement d'e-mail ; créer le compte propriétaire juste après le déploiement.

## Fonctionnalités

- **Aujourd'hui** : preset prévu pour le jour (ou le prochain), choix d'un autre preset ou d'une **séance libre** (exercices choisis dans le catalogue), semaine en cours, dernière séance, reprise d'une séance en cours.
- **Séance en cours** : charges pré-remplies depuis la dernière séance, colonne « Préc. », validation série par série, une charge modifiée se propage aux séries suivantes, ajout de série, **ajout / remplacement / retrait d'exercices en cours de séance**, minuteur de repos (+30 s / passer, vibration et bip), détection de record, écran maintenu allumé (Wake Lock).
- **Presets de séance** (« séances types ») : jour, couleur, icône, exercices choisis dans le catalogue avec séries × rép. et repos ; création, édition, duplication, suppression, ou création depuis une séance réalisée (« Enregistrer comme preset » dans l'historique).
- **Catalogue d'exercices** (`/exercices`) : ~40 exercices de base classés par groupe musculaire, recherche, création / renommage / suppression (si inutilisé). Le sélecteur d'exercices (recherche, filtre par muscle, « Fréquents », multi-sélection, création à la volée) est partagé par les presets, la séance libre et la séance en cours.
- **Historique** : regroupé par semaine, durée, volume, records ; détail série par série.
- **Partage d'une séance** (icône en haut du détail, ou « Partager ma séance ») : carte image 1080 × 1350 générée sur l'appareil (titre, durée, volume, séries, records, meilleure série par exercice), envoyée par le menu de partage natif du téléphone ; sur ordinateur, l'image est copiée dans le presse-papiers, ou enregistrée à défaut. Rien n'est publié côté serveur.
- **Progression** : par exercice, meilleure série, courbe de charge, 1RM estimé (Epley), dernier volume.
- **Hors ligne** : l'app et les dernières données consultées sont en cache (service worker). Pendant une séance, les séries validées sans réseau partent dans une file locale, rejouée au retour de la connexion (écritures idempotentes, id générés côté client).

## Design system

Catalogue visuel : **`/design-system`** (lien en bas de l'écran Programmes).

- `client/src/styles/tokens.css` — tokens en 3 couches :
  1. primitives (`--cg-violet`, `--cg-green`…),
  2. rôles sémantiques (`--color-surface`, `--color-action`, `--color-text-muted`…),
  3. échelles : typographie fluide (`--fs-display-*` en `clamp()`), espacements, rayons, tailles de cible (`--tap: 44px`), halos néon, zones sûres (`env(safe-area-inset-*)`).
- Accents : `.accent-violet | pink | cyan | green | yellow` définissent `--accent` / `--rgb-accent`, repris par tous les composants (une couleur par séance type).
- `client/src/ds/` — composants `Cg*` : `CgButton`, `CgCard`, `CgListRow`, `CgIconTile`, `CgBadge`, `CgChip`, `CgStat`, `CgWeekStrip`, `CgSegments`, `CgNumberField`, `CgLineChart`, `CgDialog` (feuille du bas défilante), `CgSearchField`, `CgChipRow`, `CgBottomNav`, champs de formulaire, etc.
- Polices auto-hébergées (Barlow / Barlow Condensed, sous-ensemble latin) pour fonctionner hors ligne.

### Petits écrans (jusqu'à 279 px)

- Gouttière, tailles de titres, tuiles et hauteurs de ligne fluides (`clamp()` sur `vw`).
- Container queries sur les composants denses : le tableau des séries masque la colonne « Préc. » sous 330 px de large (remplacée par un résumé « Dernière fois »), la bande de la semaine se resserre, l'éditeur passe le repos à la ligne.
- Barre de navigation compactée sous 300 px, statistiques sur une colonne, titres longs qui passent à la ligne au lieu de déborder.
- Cibles tactiles ≥ 44 px, champs ≥ 16 px (pas de zoom iOS), aucun défilement horizontal vérifié sur tous les écrans à 279 px.

## Structure

```
client/                Vue 3 + Vite + PWA
  src/ds/              design system (composants Cg*)
  src/styles/          tokens.css, base.css
  src/views/           écrans
  src/lib/             api (+ file hors ligne), format (fr-FR), icônes, minuteur
server/
  migrations/          SQL versionné (appliqué au démarrage)
  src/db.js            adaptateur PGlite / PostgreSQL
  src/routes/          templates, sessions/sets, progression
  src/seed.js          catalogue + programme de départ
  src/demo.js          historique de démo
```

## API

| Méthode | Route | |
| --- | --- | --- |
| GET / POST / PUT / DELETE | `/api/exercises[/:id]` | catalogue (`muscle`, `icon` ; suppression refusée si utilisé) |
| GET | `/api/templates`, `/api/templates/:id` | presets |
| POST / PUT / DELETE | `/api/templates[/:id]` | édition (`exercises: [{ exerciseId, sets, reps, restSeconds }]`) |
| POST | `/api/templates/:id/duplicate`, `/api/sessions/:id/template` | dupliquer un preset, preset depuis une séance |
| GET | `/api/sessions?from&to&limit`, `/api/sessions/active`, `/api/sessions/:id` | séances |
| POST | `/api/sessions` `{ templateId }` ou `{ exercises }` | démarrer depuis un preset ou en séance libre (409 si une séance est en cours) |
| POST | `/api/sessions/:id/exercises` `{ exerciseId, sets, reps, restSeconds, replaceId? }` | ajouter / remplacer un exercice |
| DELETE | `/api/session-exercises/:id` | retirer un exercice de la séance |
| PATCH | `/api/sessions/:id` `{ endedAt }` | terminer (retire les séries non validées) |
| PUT / DELETE | `/api/sets/:id` | upsert idempotent d'une série |
| GET | `/api/progression`, `/api/progression/:exerciseId` | progression |
