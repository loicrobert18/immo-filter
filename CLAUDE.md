# ImmoFilter

Système de déduplication d'annonces immobilières. Reçoit les alertes mail de plateformes (SeLoger, LeBonCoin, Bien'ici, PAP…), déduplique, et forwarde uniquement les nouveaux biens par mail. Plusieurs recherches peuvent être suivies en parallèle (ex. une par ville), chacune identifiée par un tag. Une interface web Next.js permet de parcourir les annonces, de consulter des statistiques et de gérer les recherches.

## Stack

- **Runtime** : Node.js (ESM, pas CommonJS)
- **Language** : TypeScript strict (`"strict": true`, pas de `any`)
- **ORM** : Drizzle ORM avec PostgreSQL
- **Mail** : IMAP via `imapflow`, SMTP via `nodemailer`
- **HTML parsing** : `cheerio`
- **Scheduling** : `node-cron` (tous les jours à 8 h, plus une exécution au démarrage)
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
│           ├── schema.ts         # schéma Drizzle (listings, searches, listing_searches, settings)
│           ├── settings.ts       # getSettings() (ligne unique ou valeurs par défaut), resolveNotifyTo()
│           ├── client.ts         # getDb() : connexion paresseuse, singleton
│           ├── listing.ts        # types Listing normalisé et SearchTag
│           └── index.ts
├── worker/
│   ├── Dockerfile
│   ├── src/
│   │   ├── index.ts              # entrypoint, scheduler cron
│   │   ├── imap/client.ts        # connexion IMAP, fetch nouveaux mails
│   │   ├── imap/alias.ts         # extraction du tag depuis l'alias +tag des destinataires
│   │   ├── searches/resolver.ts  # index tag → id de recherche
│   │   ├── parsers/              # base.ts, registry.ts, un fichier par plateforme
│   │   ├── dedup/engine.ts       # déduplication URL exacte + hash flou
│   │   ├── notify/mailer.ts      # envoi SMTP vers boîte perso, mails groupés par recherche
│   │   └── save/handler.ts       # traitement des mails SAVE:<id>
│   └── tests/
│       ├── parsers/              # un fichier de test par parser
│       ├── alias.test.ts
│       ├── notify.test.ts
│       └── dedup.test.ts
├── web/
│   ├── Dockerfile
│   ├── next.config.ts            # output standalone
│   ├── src/
│   │   ├── app/                  # listings/, stats/, searches/ (CRUD des recherches), settings/, layout.tsx
│   │   ├── components/           # cartes, filtres, pagination, charts/
│   │   └── lib/
│   │       ├── filter-options.ts # constantes partagées client/serveur (sans dépendance DB)
│   │       ├── filters.ts        # parseListingFilters (Zod) + buildWhere/buildOrderBy
│   │       ├── search-schema.ts  # validation Zod d'une recherche + aliasAddress (sans dépendance DB)
│   │       ├── search-form-state.ts # état du formulaire, importable côté client (sans Zod)
│   │       ├── settings-schema.ts / settings-form-state.ts # même découpage pour la configuration
│   │       ├── actions/          # Server Actions (searches.ts, settings.ts)
│   │       ├── format.ts
│   │       └── queries/          # requêtes Drizzle (listings.ts, stats.ts, searches.ts)
│   └── tests/                    # filters.test.ts, search-schema.test.ts
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

### Recherches multiples (tag = alias mail)

- Une recherche = une ligne `searches` (`tag` unique, `label` affiché). Son adresse d'alerte est `IMAP_USER` avec l'alias `+tag` (ex. `moi+lyon@gmail.com`), à renseigner comme e-mail lors de la création de l'alerte sur la plateforme.
- Le worker lit l'alias dans `To`, `Cc`, `Delivered-To` et `X-Original-To` (`imap/alias.ts`), puis rattache les annonces du mail à la recherche via la table de liaison `listing_searches` (N-N).
- La déduplication reste globale : un doublon reçu par un autre alias n'est pas renotifié mais gagne le tag de cette recherche.
- Sans alias, ou avec un alias inconnu (warning loggé), l'annonce est stockée et notifiée sans tag : « Non classé ».
- Les notifications sont regroupées par recherche (« Non classé » en dernier), par lots de 5, avec le label dans le sujet (`ImmoFilter [Lyon] : …`).
- Supprimer une recherche supprime ses liaisons (`ON DELETE CASCADE`), jamais les annonces. Changer un tag change l'adresse d'alerte.
- Filtre web `?search=<tag>`, ou `?search=_none` (`UNCLASSIFIED_SEARCH`) pour les non classées.

### Configuration (page `/settings`)

- Table `settings` à ligne unique (`id = 1`, contrainte `CHECK`), créée au premier enregistrement ; sans ligne, `getSettings()` renvoie `DEFAULT_SETTINGS`.
- `notificationsEnabled = false` : le worker relève, déduplique et stocke, mais n'envoie aucun mail d'annonces (les mails `SAVE:` restent traités).
- À la réactivation, `notificationsResumedAt` passe à maintenant : les annonces détectées avant ne sont jamais envoyées (`getUnnotifiedListings(since)`).
- `notifyTo` remplace `NOTIFY_TO` s'il est renseigné (annonces et mails sauvegardés). Si les réglages ne peuvent pas être lus, le worker n'envoie pas d'annonces ce passage-là.

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
  searchId?: number | null;   // contexte d'ingestion (alias du mail), stocké dans listing_searches
  searches?: SearchTag[];     // recherches liées, chargées pour la notification
}
```

## Conventions

- Noms de fichiers : `kebab-case`
- Exports nommés uniquement, pas de `export default` — seule exception : les fichiers imposés par Next.js (`page.tsx`, `layout.tsx`, `next.config.ts`, `postcss.config.mjs`)
- Accès DB toujours via `getDb()` appelé dans la fonction (jamais au chargement du module) pour que `next build` fonctionne sans `DATABASE_URL`
- Web : ne jamais importer `@immofilter/db` (ni `lib/filters.ts`) depuis un Client Component — les constantes partagées vont dans `lib/filter-options.ts`
- Web : l'état des filtres vit dans l'URL (`searchParams`), les pages sont `force-dynamic`
- Web : les seules écritures en base sont les Server Actions de `lib/actions/` (recherches et configuration) ; les annonces restent en lecture seule. Un Client Component peut importer une Server Action, mais pas le module `@immofilter/db` lui-même
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
