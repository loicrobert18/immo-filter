# ImmoFilter

Système de déduplication d'annonces immobilières. Reçoit les alertes mail de plateformes (SeLoger, LeBonCoin, Bien'ici, PAP…), déduplique, et forwarde uniquement les nouveaux biens par mail.

## Stack

- **Runtime** : Node.js (ESM, pas CommonJS)
- **Language** : TypeScript strict (`"strict": true`, pas de `any`)
- **ORM** : Drizzle ORM avec PostgreSQL
- **Mail** : IMAP via `imapflow`, SMTP via `nodemailer`
- **HTML parsing** : `cheerio`
- **Scheduling** : `node-cron` (toutes les 30 minutes)
- **Containerisation** : Docker Compose (worker + postgres)
- **Tests** : Vitest

## Architecture

```
immofilter/
├── docker-compose.yml
├── worker/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts              # entrypoint, scheduler cron
│   │   ├── imap/
│   │   │   └── client.ts         # connexion IMAP, fetch nouveaux mails
│   │   ├── parsers/
│   │   │   ├── base.ts           # interface BaseParser (Protocol pattern)
│   │   │   ├── registry.ts       # ParserRegistry : route From → parser
│   │   │   ├── seloger.ts
│   │   │   ├── leboncoin.ts
│   │   │   ├── bienici.ts
│   │   │   └── pap.ts
│   │   ├── dedup/
│   │   │   └── engine.ts         # déduplication URL exacte + hash flou
│   │   ├── notify/
│   │   │   └── mailer.ts         # envoi SMTP vers boîte perso
│   │   ├── db/
│   │   │   ├── schema.ts         # schéma Drizzle (table listings)
│   │   │   └── client.ts         # connexion PostgreSQL
│   │   └── types/
│   │       └── listing.ts        # type Listing normalisé
│   └── tests/
│       ├── parsers/              # un fichier de test par parser
│       └── dedup.test.ts
├── .env.example
└── .gitignore
```

## Commandes

- `npm run dev` : lance le worker en mode watch (tsx)
- `npm run build` : compile TypeScript
- `npm run start` : lance le worker compilé
- `npm run test` : lance Vitest
- `npm run lint` : ESLint
- `docker compose up -d` : lance la stack complète
- `docker compose logs -f worker` : logs du worker

## Design patterns critiques

### Parser abstraction (Strategy pattern)

Chaque plateforme a un parser dédié. Tous implémentent la même interface :

```typescript
interface BaseParser {
  platform: string;
  senderPatterns: string[];  // ex: ["@seloger.com", "@notifications.seloger.com"]
  parse(html: string): Listing[];
}
```

Le `ParserRegistry` route automatiquement par le header `From:` du mail. Ajouter une plateforme = créer un fichier dans `parsers/` et l'enregistrer dans le registry. Aucune modification ailleurs.

### Déduplication (2 niveaux)

1. **URL exacte** : si l'URL de l'annonce existe déjà en base → doublon
2. **Hash flou** : `sha256(city + surface + rooms + Math.floor(price / 1000))` — couvre le cross-plateforme avec tolérance ±999€ sur le prix

### Type Listing normalisé

```typescript
interface Listing {
  url: string;
  price: number | null;
  surface: number | null;
  rooms: number | null;
  city: string | null;
  address: string | null;
  platform: string;
  dedupHash: string;
  detectedAt: Date;
}
```

## Conventions

- Noms de fichiers : `kebab-case`
- Exports nommés uniquement, pas de `export default`
- Gestion d'erreurs : chaque étape du pipeline (IMAP fetch, parse, dedup, notify) doit catcher ses erreurs individuellement et logger sans interrompre le traitement des autres mails
- Les credentials sont dans `.env`, jamais hardcodés, jamais commités
- Les mails HTML bruts parsés en erreur doivent être loggés dans un dossier `/data/failed/` pour debug des changements de template

## Docker

- Le container `worker` utilise `node:22-alpine`
- Le container `postgres` utilise `postgres:16-alpine` avec un volume persistant
- Le `.env` est monté via `env_file` dans le compose, pas copié dans l'image
- Le worker ne tourne pas en daemon : `node-cron` gère le scheduling en interne

## Contexte projet

Ce projet tourne sur un VPS Hetzner (Debian 13, US) aux côtés d'autres services. Le PostgreSQL peut être mutualisé (DB séparée `immofilter`) ou isolé dans son propre container selon la config. Le mail dédié est un compte Gmail ou domaine perso accessible en IMAP.
