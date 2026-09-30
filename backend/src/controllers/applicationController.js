import { HttpError } from "../middleware/errorHandler.js";
import { isText, parseId } from "../middleware/validation.js";
import * as applications from "../models/applicationModel.js";
import * as jobs from "../models/jobModel.js";

const STATUSES = new Set(["pending", "reviewed", "rejected"]);
const DUPLICATE_ENTRY = 1062;
const MAX_RESUME_SIZE = 12 * 1024 * 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESUME_EXTENSIONS = new Set([".pdf", ".doc", ".docx"]);
const RESUME_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function wizardText(value, field, { rejectBlank = false } = {}) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, `${field} must be text`);
  }

  const text = value.trim();

  if (rejectBlank && text === "") {
    throw new HttpError(400, `${field} cannot be empty`);
  }

  return text === "" ? null : text;
}

function wizardFileSize(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const size = Number(value);

  if (!Number.isInteger(size) || size < 0) {
    throw new HttpError(400, "resume_size must be a whole number of at least 0");
  }

  if (size > MAX_RESUME_SIZE) {
    throw new HttpError(400, "resume file is too large (max 12MB)");
  }

  return size;
}

function withoutRecruiterId(application) {
  const { recruiter_id: _recruiterId, resume_data: _resumeData, ...safeApplication } = application;
  return { ...safeApplication, resume_url: applications.resumeUrlFor(application) };
}

function resumeExtension(fileName) {
  const index = String(fileName).lastIndexOf(".");
  return index < 0 ? "" : String(fileName).slice(index).toLowerCase();
}

function validateResumeFile(file) {
  if (!RESUME_EXTENSIONS.has(resumeExtension(file.originalname ?? ""))) {
    throw new HttpError(400, "resume must be a PDF, DOC, or DOCX file");
  }

  if (file.mimetype && file.mimetype !== "application/octet-stream" && !RESUME_MIME_TYPES.has(file.mimetype)) {
    throw new HttpError(400, "resume must be a PDF, DOC, or DOCX file");
  }

  if (file.size > MAX_RESUME_SIZE) {
    throw new HttpError(400, "resume file is too large (max 12MB)");
  }
}

function toDownloadBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string") return Buffer.from(value, "latin1");
  return Buffer.from(value);
}

export async function applyToJob(request, response) {
  const job = await jobs.findJobById(parseId(request.params.id));

  if (!job) {
    throw new HttpError(404, "Job not found");
  }

  if (!job.is_active) {
    throw new HttpError(409, "This job is no longer accepting applications");
  }

  const body = request.body ?? {};
  const isMultipart = String(request.headers["content-type"] ?? "").includes("multipart/form-data");
  // Wizard mode: multipart apply forms always use the full contract. JSON keeps the
  // legacy minimal apply (cover letter only) working unless wizard identity fields
  // are present, in which case the full contract applies as well.
  const isWizard =
    isMultipart ||
    request.file !== undefined ||
    body.full_name !== undefined ||
    body.phone !== undefined ||
    body.email !== undefined;

  const coverLetter = body.cover_letter;
  if (coverLetter !== undefined && coverLetter !== null && typeof coverLetter !== "string") {
    throw new HttpError(400, "cover_letter must be text");
  }

  const fullName = wizardText(body.full_name, "full_name", { rejectBlank: true });
  const phone = wizardText(body.phone, "phone");
  const email = wizardText(body.email, "email");
  const website = wizardText(body.website, "website");
  const portfolioUrl = wizardText(body.portfolio_url, "portfolio_url");

  if (email !== null && !EMAIL_PATTERN.test(email)) {
    throw new HttpError(400, "email must be a valid email address");
  }

  const letter = isText(coverLetter) ? coverLetter.trim() : null;

  if (isWizard) {
    if (!isText(fullName)) throw new HttpError(400, "full_name is required");
    if (!isText(phone)) throw new HttpError(400, "phone is required");
    if (!isText(email)) throw new HttpError(400, "email is required");
    if (!isText(letter)) throw new HttpError(400, "cover_letter is required");
  }

  let resumeName = wizardText(body.resume_name, "resume_name");
  let resumeSize = wizardFileSize(body.resume_size);
  let resumeMime = null;
  let resumeData = null;

  if (request.file) {
    validateResumeFile(request.file);
    resumeName = request.file.originalname;
    resumeSize = request.file.size;
    resumeMime = request.file.mimetype;
    resumeData = request.file.buffer;
  }

  try {
    const application = await applications.createApplication({
      job_id: job.id,
      applicant_id: request.user.id,
      cover_letter: letter,
      full_name: fullName,
      phone,
      email,
      website,
      portfolio_url: portfolioUrl,
      resume_name: resumeName,
      resume_size: resumeSize,
      resume_mime: resumeMime,
      resume_data: resumeData,
    });

    response.status(201).json({ application: withoutRecruiterId(application) });
  } catch (error) {
    if (error.errno === DUPLICATE_ENTRY) {
      throw new HttpError(409, "You have already applied to this job");
    }
    throw error;
  }
}

export async function listMyApplications(request, response) {
  response.status(200).json({
    data: await applications.findApplicationsByApplicant(request.user.id),
  });
}

export async function downloadResume(request, response) {
  const id = parseId(request.params.id, "application id");
  const application = await applications.findApplicationById(id);

  if (!application) {
    throw new HttpError(404, "Application not found");
  }

  const isOwner = application.recruiter_id === request.user.id;
  const isApplicant = application.applicant_id === request.user.id;
  if (!isOwner && !isApplicant) {
    throw new HttpError(403, "You can only download resumes for applications you own");
  }

  if (!application.resume_name || !application.resume_data) {
    throw new HttpError(404, "Resume not found");
  }

  const data = toDownloadBuffer(application.resume_data);
  const safeName = String(application.resume_name).replace(/"/g, "");
  response.setHeader("Content-Type", application.resume_mime ?? "application/octet-stream");
  response.setHeader("Content-Length", String(data.length));
  response.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
  response.status(200).send(data);
}

export async function listJobApplicants(request, response) {
  const job = await jobs.findJobById(parseId(request.params.id));

  if (!job) {
    throw new HttpError(404, "Job not found");
  }

  if (job.recruiter_id !== request.user.id) {
    throw new HttpError(403, "You can only view applicants for your own jobs");
  }

  response.status(200).json({ data: await applications.findApplicationsByJob(job.id) });
}

export async function updateApplicationStatus(request, response) {
  const id = parseId(request.params.id, "application id");
  const { status } = request.body ?? {};

  if (!STATUSES.has(status)) {
    throw new HttpError(400, "status must be pending, reviewed, or rejected");
  }

  const application = await applications.findApplicationById(id);

  if (!application) {
    throw new HttpError(404, "Application not found");
  }

  if (application.recruiter_id !== request.user.id) {
    throw new HttpError(403, "You can only manage applications for your own jobs");
  }

  await applications.updateApplicationStatus(id, status);
  const updated = await applications.findApplicationById(id);
  response.status(200).json({ application: withoutRecruiterId(updated) });
}
