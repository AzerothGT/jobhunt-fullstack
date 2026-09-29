import { afterAll, beforeEach, expect, test } from "bun:test";
import sql from "../src/config/db.js";
import { authHeaders, registerUser, resetDatabase, startServer } from "./helpers.js";

const server = await startServer();

beforeEach(resetDatabase);

afterAll(async () => {
  await server.close();
});

function post(path, body, token) {
  return fetch(`${server.url}${path}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

test("POST /api/auth/register creates a user and returns a token", async () => {
  const response = await post("/api/auth/register", {
    name: "Rina",
    email: "rina@test.local",
    password: "password123",
    role: "recruiter",
  });

  expect(response.status).toBe(201);

  const body = await response.json();
  expect(body.token).toBeString();
  expect(body.user).toMatchObject({
    name: "Rina",
    email: "rina@test.local",
    role: "recruiter",
  });
  expect(body.user.id).toBeNumber();
  expect(body.user.password).toBeUndefined();
});

test("POST /api/auth/register stores the password as a bcrypt hash", async () => {
  await post("/api/auth/register", {
    name: "Rina",
    email: "rina@test.local",
    password: "password123",
    role: "recruiter",
  });

  const [user] = await sql`SELECT password FROM users WHERE email = ${"rina@test.local"}`;
  expect(user.password).toStartWith("$2");
  expect(user.password).not.toBe("password123");
  expect(await Bun.password.verify("password123", user.password)).toBe(true);
});

test("POST /api/auth/register rejects a duplicate email", async () => {
  const payload = {
    name: "Rina",
    email: "duplicate@test.local",
    password: "password123",
    role: "recruiter",
  };
  await post("/api/auth/register", payload);

  const response = await post("/api/auth/register", payload);

  expect(response.status).toBe(409);
  expect((await response.json()).error).toBeString();
});

test("POST /api/auth/register rejects missing fields", async () => {
  const response = await post("/api/auth/register", { email: "nobody@test.local" });

  expect(response.status).toBe(400);
});

test("POST /api/auth/register rejects an unknown role", async () => {
  const response = await post("/api/auth/register", {
    name: "Rina",
    email: "rina@test.local",
    password: "password123",
    role: "admin",
  });

  expect(response.status).toBe(400);
});

test("POST /api/auth/register rejects a short password", async () => {
  const response = await post("/api/auth/register", {
    name: "Rina",
    email: "rina@test.local",
    password: "short",
    role: "recruiter",
  });

  expect(response.status).toBe(400);
});

test("POST /api/auth/login returns a token for valid credentials", async () => {
  const user = await registerUser(server.url, { email: "login@test.local" });

  const response = await post("/api/auth/login", {
    email: "login@test.local",
    password: user.password,
  });

  expect(response.status).toBe(200);

  const body = await response.json();
  expect(body.token).toBeString();
  expect(body.user.email).toBe("login@test.local");
  expect(body.user.password).toBeUndefined();
});

test("POST /api/auth/login rejects a wrong password", async () => {
  await registerUser(server.url, { email: "login@test.local" });

  const response = await post("/api/auth/login", {
    email: "login@test.local",
    password: "wrong-password",
  });

  expect(response.status).toBe(401);
});

test("POST /api/auth/login rejects an unknown email", async () => {
  const response = await post("/api/auth/login", {
    email: "ghost@test.local",
    password: "password123",
  });

  expect(response.status).toBe(401);
});

test("GET /api/auth/me returns the signed in user", async () => {
  const { token, user } = await registerUser(server.url, { name: "Budi" });

  const response = await fetch(`${server.url}/api/auth/me`, { headers: authHeaders(token) });

  expect(response.status).toBe(200);

  const body = await response.json();
  expect(body.user).toMatchObject({ id: user.id, name: "Budi", role: "job_seeker" });
  expect(body.user.password).toBeUndefined();
});

test("GET /api/auth/me rejects a missing token", async () => {
  const response = await fetch(`${server.url}/api/auth/me`);

  expect(response.status).toBe(401);
});

test("GET /api/auth/me rejects a malformed token", async () => {
  const response = await fetch(`${server.url}/api/auth/me`, {
    headers: authHeaders("not-a-real-token"),
  });

  expect(response.status).toBe(401);
});
