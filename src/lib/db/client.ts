import { readFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { defaultPricing } from "@/lib/pricing/defaults";
import { defaultTemplates } from "@/lib/template-defaults";
import { hashPassword } from "@/lib/passwords";
import { newId } from "@/lib/ids";

export type Sql = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

export type Database = {
  query: Sql;
  transaction: <T>(fn: (query: Sql) => Promise<T>) => Promise<T>;
};

const globalForDb = globalThis as unknown as {
  efaDb?: Database;
  efaDbReady?: Promise<Database>;
};

export async function getDb() {
  if (!globalForDb.efaDb) {
    globalForDb.efaDbReady ??= openDatabase();
    globalForDb.efaDb = await globalForDb.efaDbReady;
  }
  return globalForDb.efaDb;
}

export function resetDbForTests() {
  globalForDb.efaDb = undefined;
  globalForDb.efaDbReady = undefined;
}

async function openDatabase(): Promise<Database> {
  const database = process.env.DATABASE_URL?.startsWith("postgres")
    ? await openPostgres()
    : await openPglite();
  await migrate(database);
  await seed(database);
  return database;
}

async function openPglite(): Promise<Database> {
  const dir = process.env.PGDATA_DIR || path.join(process.cwd(), "data", "pglite");
  mkdirSync(dir, { recursive: true });
  const db = new PGlite(dir);
  await db.waitReady;
  const enqueue = queue();
  const query: Sql = (text, params = []) =>
    enqueue(async () => {
      const result = params.length ? await db.query(text, params) : await db.query(text);
      return result.rows as Record<string, unknown>[];
    });
  return {
    query,
    transaction: (fn) =>
      enqueue(async () => {
        await db.exec("BEGIN");
        const inner: Sql = async (text, params = []) => {
          const result = params.length ? await db.query(text, params) : await db.query(text);
          return result.rows as Record<string, unknown>[];
        };
        try {
          const value = await fn(inner);
          await db.exec("COMMIT");
          return value;
        } catch (error) {
          await db.exec("ROLLBACK");
          throw error;
        }
      }),
  };
}

async function openPostgres(): Promise<Database> {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const query: Sql = async (text, params = []) => {
    const result = await pool.query(text, params);
    return result.rows as Record<string, unknown>[];
  };
  return {
    query,
    transaction: async (fn) => {
      const client = await pool.connect();
      const inner: Sql = async (text, params = []) => {
        const result = await client.query(text, params);
        return result.rows as Record<string, unknown>[];
      };
      try {
        await client.query("BEGIN");
        const value = await fn(inner);
        await client.query("COMMIT");
        return value;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

function queue() {
  let chain = Promise.resolve();
  return function enqueue<T>(fn: () => Promise<T>) {
    const run = chain.then(fn, fn);
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}

async function migrate(database: Database) {
  const file = readFileSync(path.join(process.cwd(), "src/lib/db/schema.sql"), "utf8");
  const statements = file
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await database.query(statement);
  }
}

async function seed(database: Database) {
  const existing = await database.query(`SELECT id FROM pricing_config LIMIT 1`);
  if (!existing[0]) {
    await database.query(
      `INSERT INTO pricing_config (id, version, config_json, updated_by) VALUES ($1, 1, $2, $3)`,
      [newId(), JSON.stringify(defaultPricing), "seed"],
    );
  }
  for (const template of defaultTemplates) {
    await database.query(
      `INSERT INTO message_templates (code, channel, subject, body) VALUES ($1,$2,$3,$4) ON CONFLICT (code, channel) DO NOTHING`,
      [template.code, template.channel, template.subject, template.body],
    );
  }
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    const admin = await database.query(`SELECT id FROM admin_users WHERE email = $1`, [email]);
    if (!admin[0]) {
      await database.query(
        `INSERT INTO admin_users (id, email, name, password_hash, role) VALUES ($1,$2,$3,$4,$5)`,
        [newId(), email, "Dispatch", await hashPassword(password), "admin"],
      );
    }
  }
}
