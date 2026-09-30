import { createClient } from "@libsql/client";
import mysql from "mysql2/promise";

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

function normalizeRow(columns, row) {
  if (!Array.isArray(row)) return row;
  const mapped = {};
  for (let index = 0; index < columns.length; index += 1) {
    mapped[columns[index]] = row[index];
  }
  return mapped;
}

function createTursoDb() {
  const client = createClient({ url: tursoUrl, authToken: tursoToken });
  // Enforce foreign keys (CASCADE rules) for this connection.
  const pragma = client.execute("PRAGMA foreign_keys = ON").catch(() => null);

  async function run(statement, parameters) {
    await pragma;
    const result = await client.execute({ sql: statement, args: parameters ?? [] });
    return result;
  }

  async function sql(strings, ...values) {
    const statement = buildQuery(strings);
    const result = await run(statement, values);
    if (isInsert(statement)) {
      const id = Number(result.lastInsertRowid);
      return { insertId: id, lastInsertRowid: id };
    }
    return (result.rows ?? []).map((row) => normalizeRow(result.columns, row));
  }

  sql.unsafe = async (query, params = []) => {
    const result = await run(query, params ?? []);
    if (isInsert(query)) return { insertId: Number(result.lastInsertRowid), lastInsertRowid: Number(result.lastInsertRowid) };
    return (result.rows ?? []).map((row) => normalizeRow(result.columns, row));
  };

  sql.close = () => client.close();
  return sql;
}

function isInsert(query) {
  return /^\s*insert\b/i.test(query);
}

function createMysqlDb() {
  const hostname = process.env.DB_HOST ?? "localhost";
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

  const pool = mysql.createPool({
    host: hostname,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME ?? "jobhunt_db",
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_LIMIT ?? 5),
    ssl: resolveMysqlSsl(isLocalHost),
  });

  async function sql(strings, ...values) {
    const [rows] = await pool.execute(buildQuery(strings), values);
    return rows;
  }

  sql.unsafe = async (query, params = []) => {
    const [rows] = await pool.execute(query, params ?? []);
    return rows;
  };

  sql.close = () => pool.end();
  return sql;
}

function resolveMysqlSsl(isLocalHost) {
  if (isLocalHost) return undefined;
  if (process.env.DB_SSL_DISABLED === "true") return undefined;
  // Managed MySQL hosts expect TLS; skip chain verification unless strict mode is on.
  return { rejectUnauthorized: process.env.DB_SSL_STRICT === "true" };
}

function buildQuery(strings) {
  let text = strings[0];
  for (let index = 1; index < strings.length; index += 1) {
    text += `?${strings[index]}`;
  }
  return text;
}

const sql = tursoUrl ? createTursoDb() : createMysqlDb();

export default sql;
