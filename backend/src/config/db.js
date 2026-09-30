import mysql from "mysql2/promise";

const hostname = process.env.DB_HOST ?? "localhost";
const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

function resolveSsl() {
  if (isLocalHost) return undefined;
  if (process.env.DB_SSL_DISABLED === "true") return undefined;
  // Managed MySQL hosts expect TLS; skip chain verification unless strict mode is on.
  return { rejectUnauthorized: process.env.DB_SSL_STRICT === "true" };
}

const pool = mysql.createPool({
  host: hostname,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME ?? "jobhunt_db",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT ?? 5),
  ssl: resolveSsl(),
});

function buildQuery(strings) {
  let text = strings[0];
  for (let index = 1; index < strings.length; index += 1) {
    text += `?${strings[index]}`;
  }
  return text;
}

async function sql(strings, ...values) {
  const [rows] = await pool.execute(buildQuery(strings), values);
  return rows;
}

sql.unsafe = async (query, params = []) => {
  const [rows] = await pool.execute(query, params ?? []);
  return rows;
};

sql.close = () => pool.end();

export default sql;
