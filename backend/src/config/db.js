import { SQL } from "bun";

const sql = new SQL({
  adapter: "mysql",
  hostname: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME ?? "jobhunt_db",
});

export default sql;
