import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required");
}

const schemaPath = new URL("../src/config/schema.turso.sql", import.meta.url);
const schema = await readFile(schemaPath, "utf8");
const statements = schema
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

const client = createClient({ url, authToken });
for (const statement of statements) {
  await client.execute(statement);
}
client.close();
console.log(`Applied ${statements.length} statements to Turso.`);
