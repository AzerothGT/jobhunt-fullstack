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

test("OpenAPI documents application, recruiter, and catalog operations", async () => {
  const response = await fetch(`${baseUrl}/api/openapi.json`);
  const spec = await response.json();
  const operations = [
    ["/api/jobs/{id}/applications", "post"],
    ["/api/applications/mine", "get"],
    ["/api/applications/{id}/status", "patch"],
    ["/api/jobs/{id}/applicants", "get"],
    ["/api/recruiter/dashboard", "get"],
  ].map(([path, method]) => spec.paths[path]?.[method]);

  expect(operations.every(Boolean)).toBe(true);
  for (const operation of operations) {
    expect(operation.security).toEqual([{ bearerAuth: [] }]);
  }

  const createApplication = spec.paths["/api/jobs/{id}/applications"].post;
  expect(createApplication.requestBody.required).toBe(false);
  expect(createApplication.requestBody.content["application/json"].schema).toEqual({
    $ref: "#/components/schemas/ApplicationCreateRequest",
  });
  expect(createApplication.responses["201"].content["application/json"].schema).toEqual({
    $ref: "#/components/schemas/ApplicationResponse",
  });

  expect(spec.components.schemas.ApplicationCreateRequest.properties.cover_letter).toMatchObject({
    type: "string",
    nullable: true,
  });
  expect(
    Object.keys(spec.components.schemas.ApplicationCreateRequest.properties).sort(),
  ).toEqual(
    [
      "cover_letter",
      "email",
      "full_name",
      "phone",
      "portfolio_url",
      "resume_name",
      "resume_size",
      "website",
    ].sort(),
  );
  expect(spec.components.schemas.Application.properties.resume_size).toMatchObject({
    type: "integer",
    minimum: 0,
    maximum: 12 * 1024 * 1024,
    nullable: true,
  });

  const updateStatus = spec.paths["/api/applications/{id}/status"].patch;
  expect(updateStatus.requestBody.content["application/json"].schema).toEqual({
    $ref: "#/components/schemas/ApplicationStatusRequest",
  });
  expect(spec.components.schemas.ApplicationStatusRequest.properties.status.enum).toEqual([
    "pending",
    "reviewed",
    "rejected",
  ]);
  expect(updateStatus.responses["200"].content["application/json"].schema).toEqual({
    $ref: "#/components/schemas/ApplicationResponse",
  });

  expect(
    spec.paths["/api/applications/mine"].get.responses["200"].content[
      "application/json"
    ].schema,
  ).toEqual({ $ref: "#/components/schemas/ApplicationListResponse" });
  expect(
    spec.paths["/api/jobs/{id}/applicants"].get.responses["200"].content[
      "application/json"
    ].schema,
  ).toEqual({ $ref: "#/components/schemas/JobApplicantsResponse" });

  const dashboard = spec.paths["/api/recruiter/dashboard"].get.responses["200"].content[
    "application/json"
  ].schema;
  expect(dashboard).toEqual({ $ref: "#/components/schemas/RecruiterDashboardResponse" });
  expect(spec.components.schemas.RecruiterDashboardResponse.required).toEqual([
    "total_jobs",
    "total_applicants",
  ]);

  const operationsWithExpectedResponses = [
    [createApplication, ["201", "400", "401", "403", "404", "409", "500"]],
    [spec.paths["/api/applications/mine"].get, ["200", "401", "403", "500"]],
    [updateStatus, ["200", "400", "401", "403", "404", "500"]],
    [spec.paths["/api/jobs/{id}/applicants"].get, ["200", "400", "401", "403", "404", "500"]],
    [spec.paths["/api/recruiter/dashboard"].get, ["200", "401", "403", "500"]],
  ];
  for (const [operation, expectedStatuses] of operationsWithExpectedResponses) {
    expect(Object.keys(operation.responses).sort()).toEqual(expectedStatuses.sort());
  }

  const jobs = spec.paths["/api/jobs"].get;
  expect(jobs.parameters.find(({ name }) => name === "sort").schema.enum).toEqual([
    "recent",
    "applicants",
  ]);
  expect(jobs.responses["400"].description).toContain("sort");
  const catalogJob = spec.components.schemas.CatalogJob.allOf[1];
  expect(catalogJob.required).toContain("applicant_count");
  expect(catalogJob.properties.applicant_count).toMatchObject({ type: "integer", minimum: 0 });
  expect(
    jobs.responses["200"].content["application/json"].schema,
  ).toEqual({ $ref: "#/components/schemas/JobListResponse" });
  expect(spec.components.schemas.JobListResponse.properties.data.items).toEqual({
    $ref: "#/components/schemas/CatalogJob",
  });
});

test("GET /api/docs serves the interactive Swagger UI", async () => {
  const response = await fetch(`${baseUrl}/api/docs`);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/html");
  expect(await response.text()).toContain("swagger-ui");
});
