import app from "../src/app.js";
import sql from "../src/config/db.js";

process.env.JWT_SECRET ||= "test-only-secret";

export async function startServer() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));

  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

export async function resetDatabase() {
  await sql`DELETE FROM applications`;
  await sql`DELETE FROM jobs`;
  await sql`DELETE FROM users`;
}

export async function registerUser(url, overrides = {}) {
  const body = {
    name: "Test User",
    email: `user${Bun.randomUUIDv7()}@test.local`,
    password: "password123",
    role: "job_seeker",
    ...overrides,
  };

  const response = await fetch(`${url}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`register failed: ${response.status} ${await response.text()}`);
  }

  return { ...(await response.json()), password: body.password };
}

export function authHeaders(token) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export async function createJob(url, token, overrides = {}) {
  const response = await fetch(`${url}/api/jobs`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      title: "Backend Engineer",
      company: "Acme",
      location: "Jakarta",
      type: "full-time",
      description: "Build APIs",
      ...overrides,
    }),
  });

  if (!response.ok) {
    throw new Error(`create job failed: ${response.status} ${await response.text()}`);
  }

  return (await response.json()).job;
}
