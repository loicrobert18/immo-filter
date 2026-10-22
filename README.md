# ImmoFilter

Filtre et déduplique les alertes mail immobilières (SeLoger, LeBonCoin, Bien'ici, PAP). Le worker surveille une boite mail via IMAP, extrait les annonces des emails HTML, déduplique en base PostgreSQL, et forwarde uniquement les nouveaux biens par notification mail.

Une interface web (Next.js) permet de parcourir toutes les annonces en base avec filtres (ville, plateforme, prix, surface, pieces, periode, recherche texte), tri et pagination, ainsi qu'un tableau de bord de statistiques (volumes par jour et par plateforme, prix median au m² par ville).

## Fonctionnement

```
Boite mail IMAP         Worker (cron 30min)           Boite perso
    |                        |                            |
    |--- fetch non lus ----->|                            |
    |                        |-- parse HTML (cheerio) --> |
    |                        |-- dedup (URL + hash) ----> |
    |                        |-- insert PostgreSQL -----> |
    |                        |-- notification SMTP ------>|
    |<-- marquer lus --------|                            |
```

### Deduplication

Deux niveaux pour eviter les doublons, y compris cross-plateforme :

1. **URL exacte** : si l'URL de l'annonce existe deja en base, c'est un doublon
2. **Hash flou** : `sha256(ville + surface + pieces + floor(prix/1000))` -- tolere une difference de prix de +/-999 EUR entre plateformes

### Parsers

Chaque plateforme a son parser dedie qui implemente l'interface `BaseParser`. Le registry route automatiquement par le header `From:` du mail. Ajouter une plateforme = creer un fichier dans `parsers/` et l'enregistrer dans le registry.

Plateformes supportees :
- SeLoger (`@alertes.seloger.com`)
- LeBonCoin (`@leboncoin.fr`) *- parser a affiner avec de vrais mails*
- Bien'ici (`@bienici.com`) *- parser a affiner avec de vrais mails*
- PAP (`@pap.fr`) *- parser a affiner avec de vrais mails*

## Installation

### Prerequis

- Node.js >= 20
- Docker et Docker Compose
- Un compte mail accessible en IMAP (Gmail recommande)

### Setup

```bash
# Installer tous les workspaces (depuis la racine)
npm install

# Configurer les credentials
cp .env.example .env
# Editer .env avec vos identifiants (voir section Configuration)

# Lancer PostgreSQL
docker compose up -d postgres

# Compiler le package DB partage et creer la table + index en base
npm run build -w @immofilter/db
npm run db:push

# Lancer le worker
npm run dev -w worker

# Lancer l'interface web (http://localhost:3800)
npm run dev -w web
```

## Configuration

Copier `.env.example` en `.env` a la racine du projet et remplir :

### IMAP (lecture des mails entrants)

| Variable | Description |
|---|---|
| `IMAP_HOST` | Serveur IMAP (`imap.gmail.com` pour Gmail) |
| `IMAP_PORT` | Port IMAP, generalement `993` (SSL) |
| `IMAP_USER` | Adresse email complete du compte |
| `IMAP_PASSWORD` | Mot de passe d'application (pas le mot de passe du compte) |

### SMTP (envoi des notifications)

| Variable | Description |
|---|---|
| `SMTP_HOST` | Serveur SMTP (`smtp.gmail.com` pour Gmail) |
| `SMTP_PORT` | Port SMTP : `587` (STARTTLS) ou `465` (SSL) |
| `SMTP_USER` | Adresse email pour l'envoi |
| `SMTP_PASSWORD` | Mot de passe d'application |

### Notification

| Variable | Description |
|---|---|
| `NOTIFY_FROM` | Adresse expediteur (doit correspondre a `SMTP_USER` ou etre un alias autorise) |
| `NOTIFY_TO` | Adresse qui recoit les notifications |

### PostgreSQL

| Variable | Description |
|---|---|
| `DATABASE_URL` | Chaine de connexion PostgreSQL. Valeur par defaut du docker-compose : `postgresql://immofilter:immofilter@localhost:5432/immofilter` |

> **Gmail** : il faut activer l'IMAP dans les parametres Gmail et generer un mot de passe d'application (Securite > Verification en deux etapes > Mots de passe des applications).

## Commandes

```bash
# Depuis la racine
npm run build                     # Compile db, worker et web
npm run test                      # Tests (Vitest) de tous les workspaces
npm run db:push                   # Applique le schema Drizzle
npm run dev -w worker             # Worker en mode watch (tsx)
npm run dev -w web                # Interface web en mode dev
npm run lint -w worker            # ESLint

docker compose up -d              # Lance la stack complete (postgres + worker + web)
docker compose up -d postgres     # PostgreSQL seul
docker compose logs -f worker     # Logs du worker
docker compose logs -f web        # Logs de l'interface web
```

## Interface web et reverse proxy

Le container `web` n'ecoute que sur `127.0.0.1:3800` et n'a pas d'authentification : il doit etre expose via le reverse proxy du VPS, qui gere HTTPS et le controle d'acces. Exemple avec Caddy :

```caddy
immo.example.com {
    basic_auth {
        # Generer le hash avec : caddy hash-password
        moi $2a$14$...
    }
    reverse_proxy 127.0.0.1:3800
}
```

Ou avec Nginx :

```nginx
location / {
    auth_basic           "ImmoFilter";
    auth_basic_user_file /etc/nginx/.htpasswd-immofilter;
    proxy_pass           http://127.0.0.1:3800;
    proxy_set_header     Host $host;
    proxy_set_header     X-Forwarded-Proto $scheme;
}
```

## Stack technique

- **Runtime** : Node.js 22 (ESM)
- **Language** : TypeScript strict
- **ORM** : Drizzle ORM + PostgreSQL 16
- **Mail** : IMAP via `imapflow`, SMTP via `nodemailer`
- **HTML parsing** : `cheerio`
- **Scheduling** : `node-cron` (toutes les 30 minutes)
- **Interface web** : Next.js 15 (App Router), Tailwind CSS, Recharts
- **Monorepo** : npm workspaces (`packages/db` partage entre worker et web)
- **Containerisation** : Docker Compose
- **Tests** : Vitest
