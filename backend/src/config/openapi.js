const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (description, schema) => ({
  description,
  content: { "application/json": { schema } },
});
const error = (description = "Request failed") => json(description, ref("Error"));
const serverError = () => error("Internal server error");
const bearer = [{ bearerAuth: [] }];
const jobId = {
  name: "id",
  in: "path",
  required: true,
  description: "Positive job ID",
  schema: { type: "integer", minimum: 1 },
};
const requestBody = (schemaName) => ({
  required: true,
  content: { "application/json": { schema: ref(schemaName) } },
});

const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Jobhunt API",
    version: "1.0.0",
    description: "Health, authentication, and job listing endpoints.",
  },
  servers: [{ url: "/", description: "Current backend host" }],
  tags: [
    { name: "Health" },
    { name: "Authentication" },
    { name: "Jobs" },
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Check API health",
        responses: {
          "200": json("API is healthy", {
            type: "object",
            required: ["status"],
            properties: { status: { type: "string", example: "ok" } },
          }),
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register a user",
        requestBody: requestBody("RegisterRequest"),
        responses: {
          "201": json("User created and token issued", ref("AuthResponse")),
          "400": error("Invalid input"),
          "409": error("Email is already registered"),
          "500": serverError(),
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Sign in",
        requestBody: requestBody("LoginRequest"),
        responses: {
          "200": json("Credentials accepted and token issued", ref("AuthResponse")),
          "400": error("Missing email or password"),
          "401": error("Invalid email or password"),
          "500": serverError(),
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get the authenticated user",
        security: bearer,
        responses: {
          "200": json("Authenticated user", {
            type: "object",
            required: ["user"],
            properties: { user: ref("User") },
          }),
          "401": error("Authentication required or token invalid"),
          "500": serverError(),
        },
      },
    },
    "/api/jobs": {
      get: {
        tags: ["Jobs"],
        summary: "List active jobs",
        description: "Keyword searches title, company, and description; location is a substring filter.",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            description: "Values above 50 are capped at 50.",
            schema: { type: "integer", minimum: 1, default: 10 },
          },
          { name: "keyword", in: "query", schema: { type: "string" } },
          {
            name: "type",
            in: "query",
            schema: {
              type: "string",
              enum: ["full-time", "part-time", "contract", "internship"],
            },
          },
          { name: "location", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": json("Paginated active jobs", ref("JobListResponse")),
          "400": error("Invalid pagination or job type"),
          "500": serverError(),
        },
      },
      post: {
        tags: ["Jobs"],
        summary: "Create a job as a recruiter",
        security: bearer,
        requestBody: requestBody("JobCreateRequest"),
        responses: {
          "201": json("Job created", {
            type: "object",
            required: ["job"],
            properties: { job: ref("Job") },
          }),
          "400": error("Invalid job fields"),
          "401": error("Authentication required or token invalid"),
          "403": error("Only recruiters can create jobs"),
          "500": serverError(),
        },
      },
    },
    "/api/jobs/mine": {
      get: {
        tags: ["Jobs"],
        summary: "List jobs owned by the authenticated recruiter",
        description: "Includes inactive jobs.",
        security: bearer,
        responses: {
          "200": json("Recruiter's jobs", ref("JobList")),
          "401": error("Authentication required or token invalid"),
          "403": error("Only recruiters can list their jobs"),
          "500": serverError(),
        },
      },
    },
    "/api/jobs/{id}": {
      parameters: [jobId],
      get: {
        tags: ["Jobs"],
        summary: "Get a job by ID",
        description: "Returns the job by ID, including inactive jobs.",
        responses: {
          "200": json("Job found", {
            type: "object",
            required: ["job"],
            properties: { job: ref("Job") },
          }),
          "400": error("Invalid job ID"),
          "404": error("Job not found"),
          "500": serverError(),
        },
      },
      put: {
        tags: ["Jobs"],
        summary: "Update a job owned by the authenticated recruiter",
        security: bearer,
        requestBody: requestBody("JobUpdateRequest"),
        responses: {
          "200": json("Job updated", {
            type: "object",
            required: ["job"],
            properties: { job: ref("Job") },
          }),
          "400": error("Invalid update fields"),
          "401": error("Authentication required or token invalid"),
          "403": error("Only recruiters can manage jobs they own"),
          "404": error("Job not found"),
          "500": serverError(),
        },
      },
      delete: {
        tags: ["Jobs"],
        summary: "Delete a job owned by the authenticated recruiter",
        security: bearer,
        responses: {
          "200": json("Job deleted", ref("Message")),
          "400": error("Invalid job ID"),
          "401": error("Authentication required or token invalid"),
          "403": error("Only recruiters can manage jobs they own"),
          "404": error("Job not found"),
          "500": serverError(),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: { error: { type: "string" } },
      },
      User: {
        type: "object",
        required: ["id", "name", "email", "role", "created_at"],
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["job_seeker", "recruiter"] },
          created_at: { type: "string", format: "date-time" },
        },
      },
      AuthResponse: {
        type: "object",
        required: ["token", "user"],
        properties: { token: { type: "string" }, user: ref("User") },
      },
      RegisterRequest: {
        type: "object",
        required: ["name", "email", "password", "role"],
        properties: {
          name: { type: "string", minLength: 1, pattern: "\\S" },
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8, pattern: "\\S" },
          role: { type: "string", enum: ["job_seeker", "recruiter"] },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 1, pattern: "\\S" },
        },
      },
      Job: {
        type: "object",
        required: [
          "id",
          "recruiter_id",
          "title",
          "company",
          "location",
          "type",
          "description",
          "requirements",
          "salary_min",
          "salary_max",
          "is_active",
          "created_at",
        ],
        properties: {
          id: { type: "integer" },
          recruiter_id: { type: "integer" },
          title: { type: "string" },
          company: { type: "string" },
          location: { type: "string", nullable: true },
          type: {
            type: "string",
            enum: ["full-time", "part-time", "contract", "internship"],
          },
          description: { type: "string" },
          requirements: { type: "string", nullable: true },
          salary_min: { type: "integer", nullable: true },
          salary_max: { type: "integer", nullable: true },
          is_active: { type: "boolean" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      JobCreateRequest: {
        type: "object",
        required: ["title", "company", "type", "description"],
        properties: {
          title: { type: "string", minLength: 1, pattern: "\\S" },
          company: { type: "string", minLength: 1, pattern: "\\S" },
          location: { type: "string", nullable: true },
          type: {
            type: "string",
            enum: ["full-time", "part-time", "contract", "internship"],
          },
          description: { type: "string", minLength: 1, pattern: "\\S" },
          requirements: { type: "string", nullable: true },
          salary_min: { type: "integer", minimum: 0, nullable: true },
          salary_max: { type: "integer", minimum: 0, nullable: true },
        },
      },
      JobUpdateRequest: {
        type: "object",
        anyOf: [
          { required: ["title"] },
          { required: ["company"] },
          { required: ["location"] },
          { required: ["type"] },
          { required: ["description"] },
          { required: ["requirements"] },
          { required: ["salary_min"] },
          { required: ["salary_max"] },
          { required: ["is_active"] },
        ],
        properties: {
          title: { type: "string", minLength: 1, pattern: "\\S" },
          company: { type: "string", minLength: 1, pattern: "\\S" },
          location: { type: "string", nullable: true },
          type: {
            type: "string",
            enum: ["full-time", "part-time", "contract", "internship"],
          },
          description: { type: "string", minLength: 1, pattern: "\\S" },
          requirements: { type: "string", nullable: true },
          salary_min: { type: "integer", minimum: 0, nullable: true },
          salary_max: { type: "integer", minimum: 0, nullable: true },
          is_active: { type: "boolean" },
        },
      },
      JobList: {
        type: "object",
        required: ["data"],
        properties: { data: { type: "array", items: ref("Job") } },
      },
      JobListResponse: {
        type: "object",
        required: ["data", "page", "limit", "total", "total_pages"],
        properties: {
          data: { type: "array", items: ref("Job") },
          page: { type: "integer" },
          limit: { type: "integer" },
          total: { type: "integer" },
          total_pages: { type: "integer" },
        },
      },
      Message: {
        type: "object",
        required: ["message"],
        properties: { message: { type: "string" } },
      },
    },
  },
};

export default openApiSpec;
