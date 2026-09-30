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
  const headers = token
    ? authHeaders(token)
    : body === undefined
      ? undefined
      : { "Content-Type": "application/json" };

  return fetch(`${server.url}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function apply(jobId, token, body) {
  return send("POST", `/api/jobs/${jobId}/applications`, { token, body });
}

test("job seeker can apply once and sees the application in their history", async () => {
  const owner = await recruiter();
  const applicant = await seeker();
  const job = await createJob(server.url, owner.token);

  const first = await apply(job.id, applicant.token, { cover_letter: "I am interested." });
  expect(first.status).toBe(201);
  expect((await first.json()).application).toMatchObject({
    job_id: job.id,
    applicant_id: applicant.user.id,
    cover_letter: "I am interested.",
    status: "pending",
  });

  const duplicate = await apply(job.id, applicant.token);
  expect(duplicate.status).toBe(409);

  const history = await send("GET", "/api/applications/mine", { token: applicant.token });
  expect(history.status).toBe(200);
  expect((await history.json()).data).toMatchObject([
    { job: { id: job.id, title: "Backend Engineer" }, status: "pending" },
  ]);
});

test("application endpoint rejects anonymous users, recruiters, and missing jobs", async () => {
  const owner = await recruiter();
  const applicant = await seeker();
  const job = await createJob(server.url, owner.token);

  expect((await apply(job.id)).status).toBe(401);
  expect((await apply(job.id, owner.token)).status).toBe(403);
  expect((await apply(999999, applicant.token)).status).toBe(404);
});

test("job seeker cannot apply to an inactive job", async () => {
  const owner = await recruiter();
  const applicant = await seeker();
  const job = await createJob(server.url, owner.token);
  await send("PUT", `/api/jobs/${job.id}`, { token: owner.token, body: { is_active: false } });

  const response = await apply(job.id, applicant.token);

  expect(response.status).toBe(409);
});

test("only the owning recruiter can view applicants and update their status", async () => {
  const owner = await recruiter();
  const other = await recruiter();
  const applicant = await seeker();
  const job = await createJob(server.url, owner.token);
  const applicationResponse = await apply(job.id, applicant.token);
  const { application } = await applicationResponse.json();

  const ownList = await send("GET", `/api/jobs/${job.id}/applicants`, { token: owner.token });
  expect(ownList.status).toBe(200);
  expect((await ownList.json()).data[0]).toMatchObject({
    status: "pending",
    applicant: { id: applicant.user.id, email: applicant.user.email },
  });

  expect((await send("GET", `/api/jobs/${job.id}/applicants`, { token: other.token })).status).toBe(403);
  expect((await send("GET", `/api/jobs/${job.id}/applicants`, { token: applicant.token })).status).toBe(403);

  const updated = await send("PATCH", `/api/applications/${application.id}/status`, {
    token: owner.token,
    body: { status: "reviewed" },
  });
  expect(updated.status).toBe(200);
  expect((await updated.json()).application.status).toBe("reviewed");

  expect(
    (
      await send("PATCH", `/api/applications/${application.id}/status`, {
        token: owner.token,
        body: { status: "approved" },
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await send("PATCH", `/api/applications/${application.id}/status`, {
        token: other.token,
        body: { status: "rejected" },
      })
    ).status,
  ).toBe(403);
  expect((await send("PATCH", "/api/applications/999999/status", {
    token: owner.token,
    body: { status: "rejected" },
  })).status).toBe(404);
});

test("apply accepts wizard fields and exposes them to history and recruiter", async () => {
  const owner = await recruiter();
  const applicant = await seeker();
  const job = await createJob(server.url, owner.token);
  const body = {
    cover_letter: "Dear team, I am excited to apply.",
    full_name: "Rick Grimes",
    phone: "+62 89 580 618 4222",
    email: applicant.user.email,
    website: "rickgrimes.com",
    portfolio_url: "dribbble.com/rickgrimes",
    resume_name: "Sr. Web Designer Role - Rick.pdf",
    resume_size: 2 * 1024 * 1024,
  };

  const response = await apply(job.id, applicant.token, body);
  expect(response.status).toBe(201);
  expect((await response.json()).application).toMatchObject(body);

  const history = await send("GET", "/api/applications/mine", { token: applicant.token });
  expect(history.status).toBe(200);
  expect((await history.json()).data[0]).toMatchObject({
    full_name: "Rick Grimes",
    phone: "+62 89 580 618 4222",
    resume_name: "Sr. Web Designer Role - Rick.pdf",
    resume_size: 2 * 1024 * 1024,
  });

  const list = await send("GET", `/api/jobs/${job.id}/applicants`, { token: owner.token });
  expect(list.status).toBe(200);
  expect((await list.json()).data[0]).toMatchObject({
    full_name: "Rick Grimes",
    website: "rickgrimes.com",
    portfolio_url: "dribbble.com/rickgrimes",
  });
});

test("apply rejects invalid wizard fields", async () => {
  const owner = await recruiter();
  const applicant = await seeker();
  const job = await createJob(server.url, owner.token);

  expect((await apply(job.id, applicant.token, { resume_size: 20 * 1024 * 1024 })).status).toBe(400);
  expect((await apply(job.id, applicant.token, { resume_size: -5 })).status).toBe(400);
  expect((await apply(job.id, applicant.token, { phone: 628123 })).status).toBe(400);
  expect((await apply(job.id, applicant.token, { full_name: "  " })).status).toBe(400);
});

test("recruiter dashboard counts only their jobs and applications", async () => {
  const owner = await recruiter();
  const other = await recruiter();
  const applicantA = await seeker();
  const applicantB = await seeker();
  const ownedOpen = await createJob(server.url, owner.token, { title: "Open" });
  const ownedClosed = await createJob(server.url, owner.token, { title: "Closed" });
  const otherJob = await createJob(server.url, other.token, { title: "Other" });

  await apply(ownedOpen.id, applicantA.token);
  await apply(ownedOpen.id, applicantB.token);
  await apply(ownedClosed.id, applicantA.token);
  await apply(otherJob.id, applicantA.token);
  await send("PUT", `/api/jobs/${ownedClosed.id}`, { token: owner.token, body: { is_active: false } });

  const response = await send("GET", "/api/recruiter/dashboard", { token: owner.token });

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ total_jobs: 2, total_applicants: 3 });
  expect((await send("GET", "/api/recruiter/dashboard", { token: applicantA.token })).status).toBe(403);
  expect((await send("GET", "/api/recruiter/dashboard")).status).toBe(401);
});
