import { afterAll, beforeEach, expect, test } from "bun:test";
import sql from "../src/config/db.js";
import { authHeaders, createJob, registerUser, resetDatabase, startServer } from "./helpers.js";

const server = await startServer();

beforeEach(resetDatabase);

afterAll(async () => {
  await server.close();
});

const recruiter = () => registerUser(server.url, { role: "recruiter" });
const seeker = () => registerUser(server.url, { role: "job_seeker" });

test("spec: backend .env exposes the required configuration keys", async () => {
  const example = await Bun.file(new URL("../.env.example", import.meta.url)).text();
  const keys = new Set(
    example.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => line.split("=")[0]),
  );
  for (const key of [
    "PORT", "DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD",
    "DB_NAME", "JWT_SECRET", "JWT_EXPIRES_IN", "FRONTEND_URL",
  ]) {
    expect(keys.has(key)).toBe(true);
  }
});

function send(method, path, { token, body } = {}) {
  return fetch(`${server.url}${path}`, {
    method,
    headers: token
      ? authHeaders(token)
      : body === undefined
        ? undefined
        : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("spec schema has the required tables, columns, and constraints", async () => {
  if (process.env.TURSO_DATABASE_URL) {
    await expectTursoSchema();
    return;
  }
  await expectMysqlSchema();
});

async function expectTursoSchema() {
  const tables = await sql`SELECT name FROM sqlite_master WHERE type = 'table'`;
  const names = new Set(tables.map((row) => row.name));
  for (const table of ["users", "jobs", "applications"]) {
    expect(names.has(table)).toBe(true);
  }

  const columnsByTable = {};
  for (const table of ["users", "jobs", "applications"]) {
    const info = await sql.unsafe(`PRAGMA table_info(${table})`);
    columnsByTable[table] = new Set(info.map((row) => row.name));
  }
  for (const column of ["id", "name", "email", "password", "role", "created_at"]) {
    expect(columnsByTable.users.has(column)).toBe(true);
  }
  for (const column of [
    "id", "recruiter_id", "title", "company", "location", "type",
    "description", "requirements", "salary_min", "salary_max", "is_active", "created_at",
  ]) {
    expect(columnsByTable.jobs.has(column)).toBe(true);
  }
  for (const column of ["id", "job_id", "applicant_id", "cover_letter", "status", "applied_at"]) {
    expect(columnsByTable.applications.has(column)).toBe(true);
  }

  const indexes = await sql.unsafe("PRAGMA index_list(applications)");
  const uniquePair = [];
  for (const index of indexes.filter((row) => row.unique)) {
    const parts = await sql.unsafe(`PRAGMA index_info(${index.name})`);
    uniquePair.push(parts.map((row) => row.name).sort().join(","));
  }
  expect(uniquePair).toContain("applicant_id,job_id");

  const foreignKeys = await sql.unsafe("PRAGMA foreign_key_list(applications)");
  const cascades = foreignKeys.filter((row) => String(row.on_delete).toUpperCase() === "CASCADE");
  expect(cascades.map((row) => row.table).sort()).toEqual(["jobs", "users"]);
}

async function expectMysqlSchema() {
  const columns = await sql`
    SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
  `;
  const byTable = new Map();
  for (const { table_name, column_name } of columns) {
    if (!byTable.has(table_name)) byTable.set(table_name, new Set());
    byTable.get(table_name).add(column_name);
  }

  for (const column of ["id", "name", "email", "password", "role", "created_at"]) {
    expect(byTable.get("users").has(column)).toBe(true);
  }
  for (const column of [
    "id", "recruiter_id", "title", "company", "location", "type",
    "description", "requirements", "salary_min", "salary_max", "is_active", "created_at",
  ]) {
    expect(byTable.get("jobs").has(column)).toBe(true);
  }
  for (const column of ["id", "job_id", "applicant_id", "cover_letter", "status", "applied_at"]) {
    expect(byTable.get("applications").has(column)).toBe(true);
  }

  const unique = await sql`
    SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applications'
      AND NON_UNIQUE = 0 AND INDEX_NAME != 'PRIMARY'
      AND COLUMN_NAME IN ('job_id', 'applicant_id')
  `;
  expect(Number(unique[0].total) >= 2).toBe(true);
}

test("spec: POST /api/jobs/:id/apply lamaran pekerjaan", async () => {
  const owner = await recruiter();
  const applicant = await seeker();
  const job = await createJob(server.url, owner.token);

  const first = await send("POST", `/api/jobs/${job.id}/apply`, {
    token: applicant.token,
    body: { cover_letter: "Saya tertarik." },
  });
  expect(first.status).toBe(201);
  expect((await first.json()).application).toMatchObject({
    job_id: job.id,
    applicant_id: applicant.user.id,
    cover_letter: "Saya tertarik.",
    status: "pending",
  });

  expect((await send("POST", `/api/jobs/${job.id}/apply`, { token: applicant.token })).status).toBe(409);
  expect((await send("POST", `/api/jobs/${job.id}/apply`)).status).toBe(401);
  expect((await send("POST", `/api/jobs/${job.id}/apply`, { token: owner.token })).status).toBe(403);
  expect((await send("POST", "/api/jobs/999999/apply", { token: applicant.token })).status).toBe(404);
});

test("spec: PUT /api/applications/:id update status lamaran", async () => {
  const owner = await recruiter();
  const other = await recruiter();
  const applicant = await seeker();
  const job = await createJob(server.url, owner.token);
  const created = await send("POST", `/api/jobs/${job.id}/apply`, { token: applicant.token });
  const { application } = await created.json();

  const updated = await send("PUT", `/api/applications/${application.id}`, {
    token: owner.token,
    body: { status: "reviewed" },
  });
  expect(updated.status).toBe(200);
  expect((await updated.json()).application.status).toBe("reviewed");

  expect(
    (await send("PUT", `/api/applications/${application.id}`, { token: owner.token, body: { status: "hired" } })).status,
  ).toBe(400);
  expect(
    (await send("PUT", `/api/applications/${application.id}`, { token: other.token, body: { status: "rejected" } })).status,
  ).toBe(403);
  expect(
    (await send("PUT", "/api/applications/999999", { token: owner.token, body: { status: "rejected" } })).status,
  ).toBe(404);
});

test("spec: ON DELETE CASCADE ikut menghapus data terkait", async () => {
  const owner = await recruiter();
  const applicant = await seeker();
  const job = await createJob(server.url, owner.token);
  await send("POST", `/api/jobs/${job.id}/apply`, { token: applicant.token });

  await sql`DELETE FROM users WHERE id = ${owner.user.id}`;

  expect((await sql`SELECT id FROM jobs WHERE id = ${job.id}`).length).toBe(0);
  expect((await sql`SELECT id FROM applications WHERE job_id = ${job.id}`).length).toBe(0);
});

test("applicants alias mirrors applications mine and status update", async () => {
  const owner = await recruiter();
  const other = await recruiter();
  const applicant = await seeker();
  const job = await createJob(server.url, owner.token);
  const created = await send("POST", `/api/jobs/${job.id}/apply`, { token: applicant.token });
  const { application } = await created.json();

  const mine = await send("GET", "/api/applicants/mine", { token: applicant.token });
  expect(mine.status).toBe(200);
  expect((await mine.json()).data).toMatchObject([{ job_id: job.id, status: "pending" }]);
  expect((await send("GET", "/api/applicants/mine")).status).toBe(401);
  expect((await send("GET", "/api/applicants/mine", { token: owner.token })).status).toBe(403);

  const updated = await send("PUT", `/api/applicants/${application.id}`, {
    token: owner.token,
    body: { status: "reviewed" },
  });
  expect(updated.status).toBe(200);
  expect((await updated.json()).application.status).toBe("reviewed");
  expect(
    (await send("PUT", `/api/applicants/${application.id}`, { token: other.token, body: { status: "rejected" } })).status,
  ).toBe(403);
  expect(
    (await send("PUT", "/api/applicants/999999", { token: owner.token, body: { status: "rejected" } })).status,
  ).toBe(404);
});
