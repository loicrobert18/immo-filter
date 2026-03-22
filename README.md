# ImmoFilter

Filtre et déduplique les alertes mail immobilières (SeLoger, LeBonCoin, Bien'ici, PAP). Le worker surveille une boite mail via IMAP, extrait les annonces des emails HTML, déduplique en base PostgreSQL, et forwarde uniquement les nouveaux biens par notification mail.

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
# Cloner et installer
cd worker && npm install

# Configurer les credentials
cp .env.example .env
# Editer .env avec vos identifiants (voir section Configuration)

# Lancer PostgreSQL
docker compose up -d postgres

# Creer la table en base
cd worker && npx drizzle-kit push

# Lancer le worker
npm run dev
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
# Depuis worker/
npm run dev       # Worker en mode watch (tsx)
npm run build     # Compile TypeScript
npm run start     # Lance le worker compile
npm run test      # Lance les tests (Vitest)
npm run lint      # ESLint

# Depuis la racine
docker compose up -d              # Lance la stack complete
docker compose up -d postgres     # PostgreSQL seul
docker compose logs -f worker     # Logs du worker
```

## Stack technique

- **Runtime** : Node.js 22 (ESM)
- **Language** : TypeScript strict
- **ORM** : Drizzle ORM + PostgreSQL 16
- **Mail** : IMAP via `imapflow`, SMTP via `nodemailer`
- **HTML parsing** : `cheerio`
- **Scheduling** : `node-cron` (toutes les 30 minutes)
- **Containerisation** : Docker Compose
- **Tests** : Vitest
