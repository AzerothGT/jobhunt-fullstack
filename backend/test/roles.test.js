import { afterAll, beforeEach, expect, test } from "bun:test";
import { authHeaders, createJob, registerUser, resetDatabase, startServer } from "./helpers.js";

const server = await startServer();

beforeEach(resetDatabase);

afterAll(async () => {
  await server.close();
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

test("register and login expose the held roles", async () => {
  const seeker = await registerUser(server.url, { role: "job_seeker" });
  expect(seeker.user.roles).toEqual(["job_seeker"]);

  const login = await (
    await fetch(`${server.url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: seeker.user.email, password: seeker.password }),
    })
  ).json();
  expect(login.user.roles).toEqual(["job_seeker"]);

  const me = await (
    await fetch(`${server.url}/api/auth/me`, { headers: authHeaders(seeker.token) })
  ).json();
  expect(me.user.roles).toEqual(["job_seeker"]);
  expect(me.user.role).toBe("job_seeker");
});

test("same account can enable and switch to the recruiter role", async () => {
  const seeker = await registerUser(server.url, { role: "job_seeker" });

  expect((await send("POST", "/api/auth/switch", { token: seeker.token, body: { role: "recruiter" } })).status).toBe(403);

  const added = await send("POST", "/api/auth/roles", { token: seeker.token, body: { role: "recruiter" } });
  expect(added.status).toBe(200);
  expect((await added.json()).roles.sort()).toEqual(["job_seeker", "recruiter"]);

  const switched = await send("POST", "/api/auth/switch", { token: seeker.token, body: { role: "recruiter" } });
  expect(switched.status).toBe(200);
  const { token, user } = await switched.json();
  expect(user.role).toBe("recruiter");
  expect(user.roles.sort()).toEqual(["job_seeker", "recruiter"]);

  const owner = await registerUser(server.url, { role: "recruiter" });
  const job = await createJob(server.url, token);
  expect(job.recruiter_id).toBe(user.id);
  expect((await send("GET", `/api/jobs/${job.id}/applicants`, { token })).status).toBe(200);
  expect((await send("GET", "/api/applications/mine", { token: owner.token })).status).toBe(403);

  const back = await send("POST", "/api/auth/switch", { token, body: { role: "job_seeker" } });
  expect(back.status).toBe(200);
  expect((await back.json()).user.role).toBe("job_seeker");
});

test("role endpoints validate input and auth", async () => {
  const seeker = await registerUser(server.url, { role: "job_seeker" });

  expect((await send("POST", "/api/auth/roles")).status).toBe(401);
  expect((await send("POST", "/api/auth/switch")).status).toBe(401);
  expect((await send("POST", "/api/auth/roles", { token: seeker.token, body: { role: "admin" } })).status).toBe(400);
  expect((await send("POST", "/api/auth/switch", { token: seeker.token, body: {} })).status).toBe(400);
});
