import { afterAll, beforeEach, expect, test } from "bun:test";

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
    headers: authHeaders(token),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("POST /api/jobs lets a recruiter post a job", async () => {
  const { token, user } = await recruiter();

  const response = await send("POST", "/api/jobs", {
    token,
    body: {
      title: "Backend Engineer",
      company: "Acme",
      location: "Jakarta",
      type: "full-time",
      description: "Build APIs",
      requirements: "Node.js",
      salary_min: 8000000,
      salary_max: 12000000,
    },
  });

  expect(response.status).toBe(201);

  const { job } = await response.json();
  expect(job).toMatchObject({
    title: "Backend Engineer",
    company: "Acme",
    type: "full-time",
    recruiter_id: user.id,
    is_active: true,
  });
  expect(job.id).toBeNumber();
});

test("POST /api/jobs rejects a job seeker", async () => {
  const { token } = await seeker();

  const response = await send("POST", "/api/jobs", { token, body: { title: "X" } });

  expect(response.status).toBe(403);
});

test("POST /api/jobs rejects an anonymous request", async () => {
  const response = await send("POST", "/api/jobs", { body: { title: "X" } });

  expect(response.status).toBe(401);
});

test("POST /api/jobs rejects missing required fields", async () => {
  const { token } = await recruiter();

  const response = await send("POST", "/api/jobs", { token, body: { title: "Only a title" } });

  expect(response.status).toBe(400);
});

test("POST /api/jobs rejects an unknown job type", async () => {
  const { token } = await recruiter();

  const response = await send("POST", "/api/jobs", {
    token,
    body: {
      title: "Backend Engineer",
      company: "Acme",
      type: "freelance",
      description: "Build APIs",
    },
  });

  expect(response.status).toBe(400);
});

test("POST /api/jobs rejects a salary range that is inverted", async () => {
  const { token } = await recruiter();

  const response = await send("POST", "/api/jobs", {
    token,
    body: {
      title: "Backend Engineer",
      company: "Acme",
      type: "full-time",
      description: "Build APIs",
      salary_min: 9000000,
      salary_max: 5000000,
    },
  });

  expect(response.status).toBe(400);
});

test("GET /api/jobs returns active jobs in a pagination envelope", async () => {
  const { token } = await recruiter();
  await createJob(server.url, token, { title: "One" });
  await createJob(server.url, token, { title: "Two" });

  const response = await fetch(`${server.url}/api/jobs`);

  expect(response.status).toBe(200);

  const body = await response.json();
  expect(body).toMatchObject({ page: 1, limit: 10, total: 2, total_pages: 1 });
  expect(body.data).toHaveLength(2);
  expect(body.data[0].title).toBe("Two");
});

test("GET /api/jobs hides jobs that are closed", async () => {
  const { token } = await recruiter();
  const open = await createJob(server.url, token, { title: "Open" });
  const closed = await createJob(server.url, token, { title: "Closed" });
  await send("PUT", `/api/jobs/${closed.id}`, { token, body: { is_active: false } });

  const body = await (await fetch(`${server.url}/api/jobs`)).json();

  expect(body.total).toBe(1);
  expect(body.data[0].id).toBe(open.id);
});

test("GET /api/jobs sorts by applicant count and returns per-job counts", async () => {
  const { token } = await recruiter();
  const popular = await createJob(server.url, token, { title: "Popular" });
  const recent = await createJob(server.url, token, { title: "Recent" });
  const closed = await createJob(server.url, token, { title: "Closed" });
  const applicantA = await seeker();
  const applicantB = await seeker();

  await send("POST", `/api/jobs/${popular.id}/applications`, { token: applicantA.token, body: {} });
  await send("POST", `/api/jobs/${popular.id}/applications`, { token: applicantB.token, body: {} });
  await send("POST", `/api/jobs/${recent.id}/applications`, { token: applicantA.token, body: {} });
  await send("POST", `/api/jobs/${closed.id}/applications`, { token: applicantA.token, body: {} });
  await send("PUT", `/api/jobs/${closed.id}`, { token, body: { is_active: false } });

  const recentFirst = await (await fetch(`${server.url}/api/jobs`)).json();
  const popularFirst = await (await fetch(`${server.url}/api/jobs?sort=applicants`)).json();

  expect(recentFirst.data.map((job) => job.title)).toEqual(["Recent", "Popular"]);
  expect(popularFirst.data.map((job) => [job.title, job.applicant_count])).toEqual([
    ["Popular", 2],
    ["Recent", 1],
  ]);
  expect((await fetch(`${server.url}/api/jobs?sort=invalid`)).status).toBe(400);
});

test("GET /api/jobs filters by keyword across title and company", async () => {
  const { token } = await recruiter();
  await createJob(server.url, token, { title: "Frontend Engineer", company: "Acme" });
  await createJob(server.url, token, { title: "Data Analyst", company: "Globex" });
  await createJob(server.url, token, {
    title: "Designer",
    company: "Initech",
    description: "frontend work",
  });

  const byTitle = await (await fetch(`${server.url}/api/jobs?keyword=frontend`)).json();
  const byCompany = await (await fetch(`${server.url}/api/jobs?keyword=globex`)).json();
  const byDescription = await (await fetch(`${server.url}/api/jobs?keyword=work`)).json();

  expect(byTitle.data).toHaveLength(1);
  expect(byTitle.data[0].title).toBe("Frontend Engineer");
  expect(byCompany.data).toHaveLength(1);
  expect(byCompany.data[0].company).toBe("Globex");
  expect(byDescription.total).toBe(0);
});

test("GET /api/jobs filters by type and location", async () => {
  const { token } = await recruiter();
  await createJob(server.url, token, { type: "internship", location: "Bandung" });
  await createJob(server.url, token, { type: "full-time", location: "Jakarta" });

  const byType = await (await fetch(`${server.url}/api/jobs?type=internship`)).json();
  const byLocation = await (await fetch(`${server.url}/api/jobs?location=jakarta`)).json();

  expect(byType.data).toHaveLength(1);
  expect(byType.data[0].type).toBe("internship");
  expect(byLocation.data).toHaveLength(1);
  expect(byLocation.data[0].location).toBe("Jakarta");
});

test("GET /api/jobs paginates results", async () => {
  const { token } = await recruiter();
  await createJob(server.url, token, { title: "First" });
  await createJob(server.url, token, { title: "Second" });
  await createJob(server.url, token, { title: "Third" });

  const page1 = await (await fetch(`${server.url}/api/jobs?page=1&limit=2`)).json();
  const page2 = await (await fetch(`${server.url}/api/jobs?page=2&limit=2`)).json();

  expect(page1.data).toHaveLength(2);
  expect(page2.data).toHaveLength(1);
  expect(page2).toMatchObject({ page: 2, limit: 2, total: 3, total_pages: 2 });
});

test("GET /api/jobs rejects an invalid page", async () => {
  const response = await fetch(`${server.url}/api/jobs?page=0`);

  expect(response.status).toBe(400);
});

test("GET /api/jobs/:id returns one job", async () => {
  const { token } = await recruiter();
  const job = await createJob(server.url, token, { title: "Detail" });

  const response = await fetch(`${server.url}/api/jobs/${job.id}`);

  expect(response.status).toBe(200);
  expect((await response.json()).job).toMatchObject({ id: job.id, title: "Detail" });
});

test("GET /api/jobs/:id returns 404 for an unknown job", async () => {
  const response = await fetch(`${server.url}/api/jobs/999999`);

  expect(response.status).toBe(404);
});

test("GET /api/jobs/mine returns only the jobs of the signed in recruiter", async () => {
  const mine = await recruiter();
  const other = await recruiter();
  const ownJob = await createJob(server.url, mine.token, { title: "Mine" });
  await createJob(server.url, other.token, { title: "Theirs" });

  const response = await send("GET", "/api/jobs/mine", { token: mine.token });

  expect(response.status).toBe(200);

  const { data } = await response.json();
  expect(data).toHaveLength(1);
  expect(data[0].id).toBe(ownJob.id);
});

test("GET /api/jobs/mine includes jobs that are closed", async () => {
  const { token } = await recruiter();
  const job = await createJob(server.url, token);
  await send("PUT", `/api/jobs/${job.id}`, { token, body: { is_active: false } });

  const { data } = await (await send("GET", "/api/jobs/mine", { token })).json();

  expect(data).toHaveLength(1);
  expect(data[0].is_active).toBe(false);
});

test("GET /api/jobs/mine rejects a job seeker", async () => {
  const { token } = await seeker();

  const response = await send("GET", "/api/jobs/mine", { token });

  expect(response.status).toBe(403);
});

test("PUT /api/jobs/:id updates only the supplied fields", async () => {
  const { token } = await recruiter();
  const job = await createJob(server.url, token, { title: "Before", company: "Acme" });

  const response = await send("PUT", `/api/jobs/${job.id}`, {
    token,
    body: { title: "After" },
  });

  expect(response.status).toBe(200);
  expect((await response.json()).job).toMatchObject({ title: "After", company: "Acme" });
});

test("PUT /api/jobs/:id rejects a job owned by another recruiter", async () => {
  const owner = await recruiter();
  const intruder = await recruiter();
  const job = await createJob(server.url, owner.token);

  const response = await send("PUT", `/api/jobs/${job.id}`, {
    token: intruder.token,
    body: { title: "Hijacked" },
  });

  expect(response.status).toBe(403);
});

test("PUT /api/jobs/:id rejects an empty update", async () => {
  const { token } = await recruiter();
  const job = await createJob(server.url, token);

  const response = await send("PUT", `/api/jobs/${job.id}`, { token, body: {} });

  expect(response.status).toBe(400);
});

test("DELETE /api/jobs/:id removes a job owned by the recruiter", async () => {
  const { token } = await recruiter();
  const job = await createJob(server.url, token);

  const response = await send("DELETE", `/api/jobs/${job.id}`, { token });

  expect(response.status).toBe(200);
  expect((await fetch(`${server.url}/api/jobs/${job.id}`)).status).toBe(404);
});

test("DELETE /api/jobs/:id rejects a job owned by another recruiter", async () => {
  const owner = await recruiter();
  const intruder = await recruiter();
  const job = await createJob(server.url, owner.token);

  const response = await send("DELETE", `/api/jobs/${job.id}`, { token: intruder.token });

  expect(response.status).toBe(403);
  expect((await fetch(`${server.url}/api/jobs/${job.id}`)).status).toBe(200);
});
