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

test("job seeker can bookmark, list, and remove a job", async () => {
  const owner = await recruiter();
  const seekerUser = await seeker();
  const job = await createJob(server.url, owner.token);

  const created = await send("POST", `/api/jobs/${job.id}/bookmark`, { token: seekerUser.token });
  expect(created.status).toBe(201);
  expect((await created.json()).bookmark).toMatchObject({
    job_id: job.id,
    user_id: seekerUser.user.id,
  });

  const repeat = await send("POST", `/api/jobs/${job.id}/bookmark`, { token: seekerUser.token });
  expect(repeat.status).toBe(200);

  const list = await send("GET", "/api/bookmarks/mine", { token: seekerUser.token });
  expect(list.status).toBe(200);
  expect((await list.json()).data).toMatchObject([{ id: job.id, title: "Backend Engineer" }]);

  const removed = await send("DELETE", `/api/jobs/${job.id}/bookmark`, { token: seekerUser.token });
  expect(removed.status).toBe(200);

  const gone = await send("GET", "/api/bookmarks/mine", { token: seekerUser.token });
  expect((await gone.json()).data).toEqual([]);
  expect((await send("DELETE", `/api/jobs/${job.id}/bookmark`, { token: seekerUser.token })).status).toBe(404);
});

test("bookmark endpoints enforce auth, role, and job existence", async () => {
  const owner = await recruiter();
  const seekerUser = await seeker();
  const job = await createJob(server.url, owner.token);

  expect((await send("POST", `/api/jobs/${job.id}/bookmark`)).status).toBe(401);
  expect((await send("POST", `/api/jobs/${job.id}/bookmark`, { token: owner.token })).status).toBe(403);
  expect((await send("POST", "/api/jobs/999999/bookmark", { token: seekerUser.token })).status).toBe(404);
  expect((await send("GET", "/api/bookmarks/mine")).status).toBe(401);
  expect((await send("GET", "/api/bookmarks/mine", { token: owner.token })).status).toBe(403);
});

test("deleting a job or user removes related bookmarks", async () => {
  const owner = await recruiter();
  const seekerUser = await seeker();
  const job = await createJob(server.url, owner.token);
  await send("POST", `/api/jobs/${job.id}/bookmark`, { token: seekerUser.token });

  await sql`DELETE FROM jobs WHERE id = ${job.id}`;
  expect((await sql`SELECT id FROM bookmarks WHERE job_id = ${job.id}`).length).toBe(0);

  const other = await createJob(server.url, owner.token);
  await send("POST", `/api/jobs/${other.id}/bookmark`, { token: seekerUser.token });
  await sql`DELETE FROM users WHERE id = ${seekerUser.user.id}`;
  expect((await sql`SELECT id FROM bookmarks WHERE user_id = ${seekerUser.user.id}`).length).toBe(0);
});
