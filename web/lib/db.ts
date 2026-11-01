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

export async function withTransaction<T>(operation: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
