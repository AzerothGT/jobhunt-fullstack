import { afterAll, beforeEach, expect, test } from "bun:test";
import { authHeaders, createJob, registerUser, resetDatabase, startServer } from "./helpers.js";

const server = await startServer();

beforeEach(resetDatabase);

afterAll(async () => {
  await server.close();
});

const recruiter = () => registerUser(server.url, { role: "recruiter" });
const seeker = () => registerUser(server.url, { role: "job_seeker" });

function pdfFile(name = "resume.pdf", size = 1024) {
  return new File([new Uint8Array(size)], name, { type: "application/pdf" });
}

function applyWizard(jobId, token, fields = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }

  return fetch(`${server.url}/api/jobs/${jobId}/applications`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
}

const validWizard = (overrides = {}) => ({
  full_name: "Rick Grimes",
  phone: "+62 89580618422",
  email: "hey@rickgrimes.com",
  website: "rickgrimes.com",
  portfolio_url: "dribbble.com/rickgrimes",
  cover_letter: "Dear team, I am excited to apply for this role.",
  resume: pdfFile(),
  ...overrides,
});

test("apply wizard accepts personal, cover letter, and resume file", async () => {
  const owner = await recruiter();
  const applicant = await seeker();
  const job = await createJob(server.url, owner.token);

  const response = await applyWizard(job.id, applicant.token, validWizard());
  expect(response.status).toBe(201);

  const { application } = await response.json();
  expect(application).toMatchObject({
    job_id: job.id,
    applicant_id: applicant.user.id,
    full_name: "Rick Grimes",
    phone: "+62 89580618422",
    email: "hey@rickgrimes.com",
    website: "rickgrimes.com",
    portfolio_url: "dribbble.com/rickgrimes",
    cover_letter: "Dear team, I am excited to apply for this role.",
    status: "pending",
  });
  expect(application.resume_name).toBe("resume.pdf");
  expect(application.resume_size).toBe(1024);
  expect(typeof application.resume_url).toBe("string");
});

test("apply wizard rejects missing required fields", async () => {
  const owner = await recruiter();
  const applicant = await seeker();
  const job = await createJob(server.url, owner.token);

  for (const field of ["full_name", "phone", "email", "cover_letter"]) {
    const fields = validWizard();
    delete fields[field];
    const response = await applyWizard(job.id, applicant.token, fields);
    expect(response.status).toBe(400);
  }
});

test("apply wizard rejects invalid email and oversized or disallowed resume", async () => {
  const owner = await recruiter();
  const applicant = await seeker();
  const job = await createJob(server.url, owner.token);

  const badEmail = await applyWizard(job.id, applicant.token, validWizard({ email: "not-an-email" }));
  expect(badEmail.status).toBe(400);

  const tooBig = await applyWizard(
    job.id,
    applicant.token,
    validWizard({ resume: pdfFile("big.pdf", 13 * 1024 * 1024) }),
  );
  expect([400, 413]).toContain(tooBig.status);

  const badType = await applyWizard(
    job.id,
    applicant.token,
    validWizard({ resume: new File(["x"], "photo.png", { type: "image/png" }) }),
  );
  expect(badType.status).toBe(400);
});

test("apply wizard works without optional website, portfolio, and resume", async () => {
  const owner = await recruiter();
  const applicant = await seeker();
  const job = await createJob(server.url, owner.token);

  const fields = validWizard();
  delete fields.website;
  delete fields.portfolio_url;
  delete fields.resume;

  const response = await applyWizard(job.id, applicant.token, fields);
  expect(response.status).toBe(201);
  expect((await response.json()).application.resume_url).toBeNull();
});

test("owning recruiter can download the applicant resume", async () => {
  const owner = await recruiter();
  const other = await recruiter();
  const applicant = await seeker();
  const job = await createJob(server.url, owner.token);

  const created = await applyWizard(job.id, applicant.token, validWizard());
  const { application } = await created.json();

  const download = await fetch(`${server.url}/api/applications/${application.id}/resume`, {
    headers: authHeaders(owner.token),
  });
  expect(download.status).toBe(200);
  expect(download.headers.get("content-type")).toContain("application/pdf");

  const forbidden = await fetch(`${server.url}/api/applications/${application.id}/resume`, {
    headers: authHeaders(other.token),
  });
  expect(forbidden.status).toBe(403);
});
