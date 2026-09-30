import { afterAll, beforeAll, expect, test } from "bun:test";
import app from "../src/app.js";

let server;
let baseUrl;

beforeAll(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("GET /api/openapi.json returns the documented OpenAPI contract", async () => {
  const response = await fetch(`${baseUrl}/api/openapi.json`);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("application/json");

  const spec = await response.json();
  expect(spec.openapi).toBe("3.0.3");
  expect(spec.paths["/api/health"].get).toBeDefined();
  expect(spec.paths["/api/auth/register"].post).toBeDefined();
  expect(spec.paths["/api/auth/login"].post).toBeDefined();
  expect(spec.paths["/api/auth/me"].get.security).toEqual([{ bearerAuth: [] }]);
  expect(spec.paths["/api/jobs"].get).toBeDefined();
  const limitParameter = spec.paths["/api/jobs"].get.parameters.find(({ name }) => name === "limit");
  expect(limitParameter.schema.maximum).toBeUndefined();
  expect(limitParameter.description).toContain("capped at 50");
  expect(spec.paths["/api/jobs"].post.security).toEqual([{ bearerAuth: [] }]);
  expect(spec.paths["/api/jobs/mine"].get.security).toEqual([{ bearerAuth: [] }]);
  expect(spec.paths["/api/jobs/{id}"].get).toBeDefined();
  expect(spec.paths["/api/jobs/{id}"].put.security).toEqual([{ bearerAuth: [] }]);
  expect(spec.paths["/api/jobs/{id}"].delete.security).toEqual([{ bearerAuth: [] }]);

  const databaseOperations = [
    spec.paths["/api/auth/register"].post,
    spec.paths["/api/auth/login"].post,
    spec.paths["/api/auth/me"].get,
    spec.paths["/api/jobs"].get,
    spec.paths["/api/jobs"].post,
    spec.paths["/api/jobs/mine"].get,
    spec.paths["/api/jobs/{id}"].get,
    spec.paths["/api/jobs/{id}"].put,
    spec.paths["/api/jobs/{id}"].delete,
  ];
  expect(databaseOperations.every(({ responses }) => responses["500"])).toBe(true);
  expect(spec.components.schemas.JobUpdateRequest.anyOf).toEqual(
    [
      "title",
      "company",
      "location",
      "type",
      "description",
      "requirements",
      "salary_min",
      "salary_max",
      "is_active",
    ].map((field) => ({ required: [field] })),
  );

  const nonWhitespaceFields = [
    ["RegisterRequest", "name"],
    ["RegisterRequest", "password"],
    ["LoginRequest", "password"],
    ["JobCreateRequest", "title"],
    ["JobCreateRequest", "company"],
    ["JobCreateRequest", "description"],
    ["JobUpdateRequest", "title"],
    ["JobUpdateRequest", "company"],
    ["JobUpdateRequest", "description"],
  ];
  expect(
    nonWhitespaceFields.every(
      ([schema, field]) => spec.components.schemas[schema].properties[field].pattern === "\\S",
    ),
  ).toBe(true);
  expect(spec.paths["/api/jobs/{id}"].put.responses["403"].description).toBe(
    "Only recruiters can manage jobs they own",
  );
  expect(spec.paths["/api/jobs/{id}"].delete.responses["403"].description).toBe(
    "Only recruiters can manage jobs they own",
  );
  expect(spec.components.securitySchemes.bearerAuth).toMatchObject({
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });
});

test("GET /api/docs serves the interactive Swagger UI", async () => {
  const response = await fetch(`${baseUrl}/api/docs`);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/html");
  expect(await response.text()).toContain("swagger-ui");
});
