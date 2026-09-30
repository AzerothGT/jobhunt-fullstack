import { HttpError } from "../middleware/errorHandler.js";
import { isText, parseId } from "../middleware/validation.js";
import * as jobs from "../models/jobModel.js";

const TYPES = new Set(["full-time", "part-time", "contract", "internship"]);
const SORTS = new Set(["recent", "applicants"]);
const TYPE_MESSAGE = "type must be full-time, part-time, contract, or internship";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function parsePaging({ page = 1, limit = DEFAULT_LIMIT }) {
  const parsedPage = Number(page);
  const parsedLimit = Number(limit);

  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    throw new HttpError(400, "page must be a positive integer");
  }

  if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
    throw new HttpError(400, "limit must be a positive integer");
  }

  return { page: parsedPage, limit: Math.min(parsedLimit, MAX_LIMIT) };
}

function optionalText(value, field) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, `${field} must be text`);
  }

  return value.trim();
}

function optionalSalary(value, field) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const amount = Number(value);

  if (!Number.isInteger(amount) || amount < 0) {
    throw new HttpError(400, `${field} must be a whole number of at least 0`);
  }

  return amount;
}

function assertSalaryRange(min, max) {
  if (min !== null && max !== null && min > max) {
    throw new HttpError(400, "salary_min cannot be greater than salary_max");
  }
}

async function loadOwnJob(request) {
  const job = await jobs.findJobById(parseId(request.params.id));

  if (!job) {
    throw new HttpError(404, "Job not found");
  }

  if (job.recruiter_id !== request.user.id) {
    throw new HttpError(403, "You can only manage your own jobs");
  }

  return job;
}

export async function listJobs(request, response) {
  const { page, limit } = parsePaging(request.query);
  const { keyword, type, location, sort = "recent" } = request.query;

  if (type !== undefined && !TYPES.has(type)) {
    throw new HttpError(400, TYPE_MESSAGE);
  }

  if (!SORTS.has(sort)) {
    throw new HttpError(400, "sort must be recent or applicants");
  }

  const { data, total } = await jobs.findActiveJobs({ page, limit, keyword, type, location, sort });

  response.status(200).json({
    data,
    page,
    limit,
    total,
    total_pages: Math.ceil(total / limit),
  });
}

export async function getJob(request, response) {
  const job = await jobs.findJobById(parseId(request.params.id));

  if (!job) {
    throw new HttpError(404, "Job not found");
  }

  response.status(200).json({ job });
}

export async function listMyJobs(request, response) {
  response.status(200).json({ data: await jobs.findJobsByRecruiter(request.user.id) });
}

export async function createJob(request, response) {
  const body = request.body ?? {};

  if (!isText(body.title) || !isText(body.company) || !isText(body.description) || !isText(body.type)) {
    throw new HttpError(400, "title, company, type, and description are required");
  }

  if (!TYPES.has(body.type)) {
    throw new HttpError(400, TYPE_MESSAGE);
  }

  const salaryMin = optionalSalary(body.salary_min, "salary_min");
  const salaryMax = optionalSalary(body.salary_max, "salary_max");
  assertSalaryRange(salaryMin, salaryMax);

  const job = await jobs.createJob({
    recruiter_id: request.user.id,
    title: body.title.trim(),
    company: body.company.trim(),
    description: body.description.trim(),
    type: body.type,
    location: optionalText(body.location, "location"),
    requirements: optionalText(body.requirements, "requirements"),
    salary_min: salaryMin,
    salary_max: salaryMax,
  });

  response.status(201).json({ job });
}

export async function updateJob(request, response) {
  const existing = await loadOwnJob(request);
  const body = request.body ?? {};
  const fields = {};

  for (const field of ["title", "company", "description"]) {
    if (body[field] !== undefined) {
      if (!isText(body[field])) {
        throw new HttpError(400, `${field} cannot be empty`);
      }
      fields[field] = body[field].trim();
    }
  }

  if (body.type !== undefined) {
    if (!TYPES.has(body.type)) {
      throw new HttpError(400, TYPE_MESSAGE);
    }
    fields.type = body.type;
  }

  for (const field of ["location", "requirements"]) {
    if (body[field] !== undefined) {
      fields[field] = optionalText(body[field], field);
    }
  }

  for (const field of ["salary_min", "salary_max"]) {
    if (body[field] !== undefined) {
      fields[field] = optionalSalary(body[field], field);
    }
  }

  if (body.is_active !== undefined) {
    if (typeof body.is_active !== "boolean") {
      throw new HttpError(400, "is_active must be true or false");
    }
    fields.is_active = body.is_active ? 1 : 0;
  }

  if (Object.keys(fields).length === 0) {
    throw new HttpError(400, "Provide at least one field to update");
  }

  assertSalaryRange(
    "salary_min" in fields ? fields.salary_min : existing.salary_min,
    "salary_max" in fields ? fields.salary_max : existing.salary_max,
  );

  response.status(200).json({ job: await jobs.updateJob(existing.id, fields) });
}

export async function deleteJob(request, response) {
  const job = await loadOwnJob(request);
  await jobs.deleteJob(job.id);

  response.status(200).json({ message: "Job deleted" });
}
