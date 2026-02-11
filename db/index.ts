// Use this file for both local and production Postgres development
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isProduction = process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Many managed Postgres providers (Neon/Render/etc.) require TLS.
  // `rejectUnauthorized: false` avoids CA issues on PaaS; acceptable for demo deployments.
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});

// Create session table if it doesn't exist
pool.query(`
  CREATE TABLE IF NOT EXISTS session (
    sid varchar PRIMARY KEY,
    sess json NOT NULL,
    expire timestamp(6) NOT NULL
  );

  CREATE INDEX IF NOT EXISTS IDX_session_expire ON session(expire);
`).catch(err => {
  console.log('Session table creation error (may already exist):', err.message);
});

export const db = drizzle(pool, { schema });