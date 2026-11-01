import { Pool, type QueryResultRow } from "pg";

type GlobalWithPool = typeof globalThis & { geointelPool?: Pool };
const globalWithPool = globalThis as GlobalWithPool;

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured for the server");
  }

  if (!globalWithPool.geointelPool) {
    globalWithPool.geointelPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      application_name: "geointel-web",
    });
  }

  return globalWithPool.geointelPool;
}

export async function query<T extends QueryResultRow>(
  sql: string,
  values: readonly unknown[] = [],
) {
  return getPool().query<T>(sql, [...values]);
}
