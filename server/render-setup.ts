import "dotenv/config";
import { spawnSync } from "node:child_process";
import { Client } from "pg";

function run(command: string, args: string[], env?: NodeJS.ProcessEnv) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: env ?? process.env,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function isTruthy(value: string | undefined) {
  if (!value) return false;
  return ["1", "true", "yes", "y", "on"].includes(value.toLowerCase());
}

async function getUserCount(): Promise<number | null> {
  if (!process.env.DATABASE_URL) return null;

  const isProduction = process.env.NODE_ENV === "production";

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    const res = await client.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM users");
    return Number(res.rows[0]?.count ?? 0);
  } catch {
    return null;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function main() {
  const shouldMigrate = isTruthy(process.env.AUTO_DB_SETUP);
  const shouldSeed = isTruthy(process.env.AUTO_SEED);
  const forceSeed = isTruthy(process.env.FORCE_SEED);

  if (!shouldMigrate && !shouldSeed) {
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set for AUTO_DB_SETUP/AUTO_SEED");
  }

  console.log("\n[render-setup] Running database setup...");

  if (shouldMigrate) {
    console.log("[render-setup] Applying migrations (drizzle-kit migrate)...");
    run("npx", ["drizzle-kit", "migrate", "--config=./drizzle.config.ts"]);
  }

  if (shouldSeed) {
    const userCount = await getUserCount();
    if (!forceSeed && userCount && userCount > 0) {
      console.log(`[render-setup] Skipping seed (users already exist: ${userCount}). Set FORCE_SEED=1 to reseed.`);
      return;
    }

    console.log("[render-setup] Seeding demo data...");
    run(
      "npx",
      ["tsx", "db/seed.ts"],
      {
        ...process.env,
        DEMO_SEED_RESET: "1",
      },
    );
  }
}

main().catch((err) => {
  console.error("[render-setup] Failed:", err);
  process.exit(1);
});
