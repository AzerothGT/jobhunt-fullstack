import { HttpError } from "../middleware/errorHandler.js";
import { isText, parseId } from "../middleware/validation.js";
import * as applications from "../models/applicationModel.js";
import * as jobs from "../models/jobModel.js";

const STATUSES = new Set(["pending", "reviewed", "rejected"]);
const DUPLICATE_ENTRY = 1062;

function withoutRecruiterId(application) {
  const { recruiter_id: _recruiterId, ...safeApplication } = application;
  return safeApplication;
}

export async function applyToJob(request, response) {
  const job = await jobs.findJobById(parseId(request.params.id));

  if (!job) {
    throw new HttpError(404, "Job not found");
  }

  if (!job.is_active) {
    throw new HttpError(409, "This job is no longer accepting applications");
  }

  const coverLetter = request.body?.cover_letter;
  if (coverLetter !== undefined && coverLetter !== null && typeof coverLetter !== "string") {
    throw new HttpError(400, "cover_letter must be text");
  }

  try {
    const application = await applications.createApplication({
      job_id: job.id,
      applicant_id: request.user.id,
      cover_letter: isText(coverLetter) ? coverLetter.trim() : null,
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
