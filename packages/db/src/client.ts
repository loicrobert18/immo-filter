import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export type Database = PostgresJsDatabase<typeof schema>;

// Cached on globalThis so Next.js dev HMR does not open a new pool on each reload
const globalForDb = globalThis as typeof globalThis & { __immofilterDb?: Database };

export function getDb(): Database {
  if (globalForDb.__immofilterDb) return globalForDb.__immofilterDb;

  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const db = drizzle(postgres(connectionString), { schema });
  globalForDb.__immofilterDb = db;
  return db;
}
