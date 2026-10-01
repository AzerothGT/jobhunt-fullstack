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
const requestBody = (schemaName, required = true) => ({
  required,
  content: { "application/json": { schema: ref(schemaName) } },
});

const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Jobhunt API",
    version: "1.0.0",
    description: "Health, authentication, job, application, and recruiter endpoints.",
  },
  servers: [{ url: "/", description: "Current backend host" }],
  tags: [
    { name: "Health" },
    { name: "Authentication" },
    { name: "Jobs" },
    { name: "Applications" },
    { name: "Applicants" },
    { name: "Bookmarks" },
    { name: "Recruiter" },
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
          {
            name: "sort",
            in: "query",
            schema: { type: "string", enum: ["recent", "applicants"], default: "recent" },
          },
        ],
        responses: {
          "200": json("Paginated active jobs", ref("JobListResponse")),
          "400": error("Invalid pagination, job type, or sort"),
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
    "/api/jobs/{id}/applications": {
      post: {
        tags: ["Applications"],
        summary: "Apply to a job",
        security: bearer,
        parameters: [jobId],
        requestBody: {
          required: false,
          content: {
            "application/json": { schema: ref("ApplicationCreateRequest") },
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["full_name", "phone", "email", "cover_letter"],
                properties: {
                  full_name: { type: "string" },
                  phone: { type: "string" },
                  email: { type: "string", format: "email" },
                  website: { type: "string" },
                  portfolio_url: { type: "string" },
                  cover_letter: { type: "string" },
                  resume: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          "201": json("Application submitted", ref("ApplicationResponse")),
          "400": error("Invalid job ID or cover letter"),
          "401": error("Authentication required or token invalid"),
          "403": error("Only job seekers can apply to jobs"),
          "404": error("Job not found"),
          "409": error("Job is closed or the applicant has already applied"),
          "500": serverError(),
        },
      },
    },
    "/api/jobs/{id}/apply": {
      post: {
        tags: ["Applications"],
        summary: "Apply to a job",
        security: bearer,
        parameters: [jobId],
        requestBody: {
          required: false,
          content: {
            "application/json": { schema: ref("ApplicationCreateRequest") },
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["full_name", "phone", "email", "cover_letter"],
                properties: {
                  full_name: { type: "string" },
                  phone: { type: "string" },
                  email: { type: "string", format: "email" },
                  website: { type: "string" },
                  portfolio_url: { type: "string" },
                  cover_letter: { type: "string" },
                  resume: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          "201": json("Application submitted", ref("ApplicationResponse")),
          "400": error("Invalid job ID or cover letter"),
          "401": error("Authentication required or token invalid"),
          "403": error("Only job seekers can apply to jobs"),
          "404": error("Job not found"),
          "409": error("Job is closed or the applicant has already applied"),
          "500": serverError(),
        },
      },
    },
    "/api/applications/mine": {
      get: {
        tags: ["Applications"],
        summary: "List the authenticated job seeker's applications",
        security: bearer,
        responses: {
          "200": json("Applicant's applications", ref("ApplicationListResponse")),
          "401": error("Authentication required or token invalid"),
          "403": error("Only job seekers can list their applications"),
          "500": serverError(),
        },
      },
    },
    "/api/applications/{id}/resume": {
      get: {
        tags: ["Applications"],
        summary: "Download an applicant resume file",
        security: bearer,
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Positive application ID",
            schema: { type: "integer", minimum: 1 },
          },
        ],
        responses: {
          "200": {
            description: "Resume file bytes",
            content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } },
          },
          "400": error("Invalid application ID"),
          "401": error("Authentication required or token invalid"),
          "403": error("Only the owning recruiter or the applicant can download the resume"),
          "404": error("Application or resume not found"),
          "500": serverError(),
        },
      },
    },
    "/api/applications/{id}/status": {
      patch: {
        tags: ["Applications"],
        summary: "Update an application status",
        security: bearer,
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Positive application ID",
            schema: { type: "integer", minimum: 1 },
          },
        ],
        requestBody: requestBody("ApplicationStatusRequest"),
        responses: {
          "200": json("Application status updated", ref("ApplicationResponse")),
          "400": error("Invalid application ID or status"),
          "401": error("Authentication required or token invalid"),
          "403": error("Only the owning recruiter can manage this application"),
          "404": error("Application not found"),
          "500": serverError(),
        },
      },
    },
    "/api/applications/{id}": {
      put: {
        tags: ["Applications"],
        summary: "Update an application status",
        security: bearer,
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Positive application ID",
            schema: { type: "integer", minimum: 1 },
          },
        ],
        requestBody: requestBody("ApplicationStatusRequest"),
        responses: {
          "200": json("Application status updated", ref("ApplicationResponse")),
          "400": error("Invalid application ID or status"),
          "401": error("Authentication required or token invalid"),
          "403": error("Only the owning recruiter can manage this application"),
          "404": error("Application not found"),
          "500": serverError(),
        },
      },
    },
    "/api/applicants/mine": {
      get: {
        tags: ["Applicants"],
        summary: "List the authenticated job seeker's applications",
        security: bearer,
        responses: {
          "200": json("Applicant's applications", ref("ApplicationListResponse")),
          "401": error("Authentication required or token invalid"),
          "403": error("Only job seekers can list their applications"),
          "500": serverError(),
        },
      },
    },
    "/api/applicants/{id}": {
      put: {
        tags: ["Applicants"],
        summary: "Update an application status",
        security: bearer,
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Positive application ID",
            schema: { type: "integer", minimum: 1 },
          },
        ],
        requestBody: requestBody("ApplicationStatusRequest"),
        responses: {
          "200": json("Application status updated", ref("ApplicationResponse")),
          "400": error("Invalid application ID or status"),
          "401": error("Authentication required or token invalid"),
          "403": error("Only the owning recruiter can manage this application"),
          "404": error("Application not found"),
          "500": serverError(),
        },
      },
    },
    "/api/jobs/{id}/applicants": {
      get: {
        tags: ["Applications"],
        summary: "List applicants for a recruiter's job",
        security: bearer,
        parameters: [jobId],
        responses: {
          "200": json("Applicants for the job", ref("JobApplicantsResponse")),
          "400": error("Invalid job ID"),
          "401": error("Authentication required or token invalid"),
          "403": error("Only the owning recruiter can view these applicants"),
          "404": error("Job not found"),
          "500": serverError(),
        },
      },
    },
    "/api/jobs/{id}/bookmark": {
      parameters: [jobId],
      post: {
        tags: ["Bookmarks"],
        summary: "Bookmark a job",
        security: bearer,
        responses: {
          "200": json("Job already bookmarked", ref("BookmarkResponse")),
          "201": json("Job bookmarked", ref("BookmarkResponse")),
          "400": error("Invalid job ID"),
          "401": error("Authentication required or token invalid"),
          "403": error("Only job seekers can bookmark jobs"),
          "404": error("Job not found"),
          "500": serverError(),
        },
      },
      delete: {
        tags: ["Bookmarks"],
        summary: "Remove a job bookmark",
        security: bearer,
        responses: {
          "200": json("Bookmark removed", ref("Message")),
          "400": error("Invalid job ID"),
          "401": error("Authentication required or token invalid"),
          "403": error("Only job seekers can bookmark jobs"),
          "404": error("Bookmark not found"),
          "500": serverError(),
        },
      },
    },
    "/api/bookmarks/mine": {
      get: {
        tags: ["Bookmarks"],
        summary: "List the authenticated job seeker's bookmarked jobs",
        security: bearer,
        responses: {
          "200": json("Bookmarked jobs", ref("BookmarkListResponse")),
          "401": error("Authentication required or token invalid"),
          "403": error("Only job seekers can list their bookmarks"),
          "500": serverError(),
        },
      },
    },
    "/api/recruiter/dashboard": {
      get: {
        tags: ["Recruiter"],
        summary: "Get the recruiter dashboard summary",
        security: bearer,
        responses: {
          "200": json("Recruiter dashboard totals", ref("RecruiterDashboardResponse")),
          "401": error("Authentication required or token invalid"),
          "403": error("Only recruiters can view the dashboard"),
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
      Application: {
        type: "object",
        required: ["id", "job_id", "applicant_id", "cover_letter", "status", "applied_at"],
        properties: {
          id: { type: "integer" },
          job_id: { type: "integer" },
          applicant_id: { type: "integer" },
          cover_letter: { type: "string", nullable: true },
          full_name: { type: "string", nullable: true },
          phone: { type: "string", nullable: true },
          email: { type: "string", format: "email", nullable: true },
          website: { type: "string", nullable: true },
          portfolio_url: { type: "string", nullable: true },
          resume_name: { type: "string", nullable: true },
          resume_size: { type: "integer", minimum: 0, maximum: 12 * 1024 * 1024, nullable: true },
          resume_url: { type: "string", nullable: true },
          status: { type: "string", enum: ["pending", "reviewed", "rejected"] },
          applied_at: { type: "string", format: "date-time" },
        },
      },
      ApplicationCreateRequest: {
        type: "object",
        properties: {
          cover_letter: { type: "string", nullable: true },
          full_name: { type: "string", nullable: true },
          phone: { type: "string", nullable: true },
          email: { type: "string", format: "email", nullable: true },
          website: { type: "string", nullable: true },
          portfolio_url: { type: "string", nullable: true },
          resume_name: { type: "string", nullable: true },
          resume_size: { type: "integer", minimum: 0, maximum: 12 * 1024 * 1024, nullable: true },
        },
      },
      ApplicationStatusRequest: {
        type: "object",
        required: ["status"],
        properties: { status: { type: "string", enum: ["pending", "reviewed", "rejected"] } },
      },
      ApplicationResponse: {
        type: "object",
        required: ["application"],
        properties: { application: ref("Application") },
      },
      ApplicationJob: {
        type: "object",
        required: ["id", "title", "company", "location", "type", "is_active"],
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          company: { type: "string" },
          location: { type: "string", nullable: true },
          type: { type: "string", enum: ["full-time", "part-time", "contract", "internship"] },
          is_active: { type: "boolean" },
        },
      },
      ApplicationHistoryItem: {
        allOf: [
          ref("Application"),
          {
            type: "object",
            required: ["job"],
            properties: { job: ref("ApplicationJob") },
          },
        ],
      },
      ApplicationListResponse: {
        type: "object",
        required: ["data"],
        properties: { data: { type: "array", items: ref("ApplicationHistoryItem") } },
      },
      Applicant: {
        type: "object",
        required: ["id", "name", "email"],
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
        },
      },
      JobApplicant: {
        allOf: [
          ref("Application"),
          {
            type: "object",
            required: ["applicant"],
            properties: { applicant: ref("Applicant") },
          },
        ],
      },
      JobApplicantsResponse: {
        type: "object",
        required: ["data"],
        properties: { data: { type: "array", items: ref("JobApplicant") } },
      },
      RecruiterDashboardResponse: {
        type: "object",
        required: ["total_jobs", "total_applicants"],
        properties: {
          total_jobs: { type: "integer", minimum: 0 },
          total_applicants: { type: "integer", minimum: 0 },
        },
      },
      Bookmark: {
        type: "object",
        required: ["id", "user_id", "job_id", "created_at"],
        properties: {
          id: { type: "integer" },
          user_id: { type: "integer" },
          job_id: { type: "integer" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      BookmarkResponse: {
        type: "object",
        required: ["bookmark"],
        properties: { bookmark: ref("Bookmark") },
      },
      BookmarkListResponse: {
        type: "object",
        required: ["data"],
        properties: { data: { type: "array", items: ref("BookmarkedJob") } },
      },
      BookmarkedJob: {
        allOf: [
          ref("Job"),
          {
            type: "object",
            required: ["bookmark_id", "bookmarked_at"],
            properties: {
              bookmark_id: { type: "integer" },
              bookmarked_at: { type: "string", format: "date-time" },
            },
          },
        ],
      },
      CatalogJob: {
        allOf: [
          ref("Job"),
          {
            type: "object",
            required: ["applicant_count"],
            properties: { applicant_count: { type: "integer", minimum: 0 } },
          },
        ],
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
          data: { type: "array", items: ref("CatalogJob") },
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
