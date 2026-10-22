# ImmoFilter

Système de déduplication d'annonces immobilières. Reçoit les alertes mail de plateformes (SeLoger, LeBonCoin, Bien'ici, PAP…), déduplique, et forwarde uniquement les nouveaux biens par mail. Une interface web Next.js (lecture seule) permet de parcourir les annonces et de consulter des statistiques.

## Stack

- **Runtime** : Node.js (ESM, pas CommonJS)
- **Language** : TypeScript strict (`"strict": true`, pas de `any`)
- **ORM** : Drizzle ORM avec PostgreSQL
- **Mail** : IMAP via `imapflow`, SMTP via `nodemailer`
- **HTML parsing** : `cheerio`
- **Scheduling** : `node-cron` (toutes les 30 minutes)
- **Containerisation** : Docker Compose (worker + postgres)
- **Tests** : Vitest
- **Monorepo** : npm workspaces (`packages/db`, `worker`, `web`), lockfile unique à la racine
- **Web** : Next.js 15 (App Router, Server Components), Tailwind CSS v4, Recharts, Zod

## Architecture

```
immofilter/
├── package.json                  # workspaces racine + package-lock.json unique
├── tsconfig.base.json            # options TS strictes partagées
├── docker-compose.yml            # postgres + worker + web
├── .dockerignore                 # contexte de build = racine du repo
├── packages/
│   └── db/                       # @immofilter/db : partagé par worker et web
│       ├── drizzle.config.ts
│       └── src/
│           ├── schema.ts         # schéma Drizzle (table listings + index)
│           ├── client.ts         # getDb() : connexion paresseuse, singleton
│           ├── listing.ts        # type Listing normalisé
│           └── index.ts
├── worker/
│   ├── Dockerfile
│   ├── src/
│   │   ├── index.ts              # entrypoint, scheduler cron
│   │   ├── imap/client.ts        # connexion IMAP, fetch nouveaux mails
│   │   ├── parsers/              # base.ts, registry.ts, un fichier par plateforme
│   │   ├── dedup/engine.ts       # déduplication URL exacte + hash flou
│   │   ├── notify/mailer.ts      # envoi SMTP vers boîte perso
│   │   └── save/handler.ts       # traitement des mails SAVE:<id>
│   └── tests/
│       ├── parsers/              # un fichier de test par parser
│       └── dedup.test.ts
├── web/
│   ├── Dockerfile
│   ├── next.config.ts            # output standalone
│   ├── src/
│   │   ├── app/                  # listings/page.tsx, stats/page.tsx, layout.tsx
│   │   ├── components/           # cartes, filtres, pagination, charts/
│   │   └── lib/
│   │       ├── filter-options.ts # constantes partagées client/serveur (sans dépendance DB)
│   │       ├── filters.ts        # parseListingFilters (Zod) + buildWhere/buildOrderBy
│   │       ├── format.ts
│   │       └── queries/          # requêtes Drizzle (listings.ts, stats.ts)
│   └── tests/filters.test.ts
├── .env.example
└── .gitignore
```

## Commandes

Depuis la racine :

- `npm install` : installe tous les workspaces
- `npm run build` : compile `@immofilter/db`, puis worker et web
- `npm run test` : lance Vitest dans tous les workspaces
- `npm run db:push` : applique le schéma Drizzle (`drizzle-kit push`)
- `npm run dev -w worker` : worker en mode watch (tsx)
- `npm run dev -w web` : interface web en mode dev (recompile `@immofilter/db` avant)
- `npm run lint -w worker` : ESLint ; `npm run lint -w web` : `tsc --noEmit`
- `docker compose up -d` : lance la stack complète
- `docker compose logs -f worker` / `docker compose logs -f web` : logs

`@immofilter/db` est consommé compilé (`dist/`) : après une modification du schéma, relancer `npm run build -w @immofilter/db`.

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
- Exports nommés uniquement, pas de `export default` — seule exception : les fichiers imposés par Next.js (`page.tsx`, `layout.tsx`, `next.config.ts`, `postcss.config.mjs`)
- Accès DB toujours via `getDb()` appelé dans la fonction (jamais au chargement du module) pour que `next build` fonctionne sans `DATABASE_URL`
- Web : ne jamais importer `@immofilter/db` (ni `lib/filters.ts`) depuis un Client Component — les constantes partagées vont dans `lib/filter-options.ts`
- Web : l'état des filtres vit dans l'URL (`searchParams`), les pages sont `force-dynamic`
- Gestion d'erreurs : chaque étape du pipeline (IMAP fetch, parse, dedup, notify) doit catcher ses erreurs individuellement et logger sans interrompre le traitement des autres mails
- Les credentials sont dans `.env`, jamais hardcodés, jamais commités
- Les mails HTML bruts parsés en erreur doivent être loggés dans un dossier `/data/failed/` pour debug des changements de template

## Docker

- Les containers `worker` et `web` utilisent `node:22-alpine`, construits depuis la racine du repo (`context: .`)
- Le container `web` tourne en mode `standalone` et n'écoute que sur `127.0.0.1:3800` : l'exposition publique et l'authentification sont gérées par le reverse proxy du VPS (pas d'auth dans l'app)
- PostgreSQL n'est publié que sur `127.0.0.1:5432`
- Le container `postgres` utilise `postgres:16-alpine` avec un volume persistant
- Le `.env` est monté via `env_file` dans le compose, pas copié dans l'image
- Le worker ne tourne pas en daemon : `node-cron` gère le scheduling en interne

## Contexte projet

Ce projet tourne sur un VPS (Debian 13) aux côtés d'autres services. Le PostgreSQL peut être mutualisé (DB séparée `immofilter`) ou isolé dans son propre container selon la config. Le mail dédié est un compte Gmail ou domaine perso accessible en IMAP.
