import sql from "../config/db.js";

export async function createApplication({
  job_id,
  applicant_id,
  cover_letter,
  full_name,
  phone,
  email,
  website,
  portfolio_url,
  resume_name,
  resume_size,
  resume_mime,
  resume_data,
}) {
  const result = await sql`
    INSERT INTO applications
      (job_id, applicant_id, cover_letter, full_name, phone, email, website, portfolio_url, resume_name, resume_size, resume_mime, resume_data)
    VALUES
      (${job_id}, ${applicant_id}, ${cover_letter}, ${full_name}, ${phone}, ${email},
       ${website}, ${portfolio_url}, ${resume_name}, ${resume_size}, ${resume_mime}, ${resume_data})
  `;

  return findApplicationById(result.insertId ?? result.lastInsertRowid);
}

export function resumeUrlFor(application) {
  if (!application || !application.resume_name) return null;
  return `/api/applications/${application.id}/resume`;
}

export async function findApplicationsByApplicant(applicantId) {
  const rows = await sql`
    SELECT a.id, a.job_id, a.applicant_id, a.cover_letter, a.status, a.applied_at,
      a.full_name, a.phone, a.email AS application_email, a.website, a.portfolio_url,
      a.resume_name, a.resume_size,
      j.title AS job_title, j.company AS job_company, j.location AS job_location,
      j.type AS job_type, j.is_active AS job_is_active
    FROM applications AS a
    INNER JOIN jobs AS j ON j.id = a.job_id
    WHERE a.applicant_id = ${applicantId}
    ORDER BY a.applied_at DESC, a.id DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    job_id: row.job_id,
    applicant_id: row.applicant_id,
    cover_letter: row.cover_letter,
    status: row.status,
    applied_at: row.applied_at,
    full_name: row.full_name,
    phone: row.phone,
    email: row.application_email,
    website: row.website,
    portfolio_url: row.portfolio_url,
    resume_name: row.resume_name,
    resume_size: row.resume_size === null ? null : Number(row.resume_size),
    resume_url: row.resume_name ? `/api/applications/${row.id}/resume` : null,
    job: {
      id: row.job_id,
      title: row.job_title,
      company: row.job_company,
      location: row.job_location,
      type: row.job_type,
      is_active: Boolean(row.job_is_active),
    },
  }));
}

export async function findApplicationsByJob(jobId) {
  const rows = await sql`
    SELECT a.id, a.job_id, a.applicant_id, a.cover_letter, a.status, a.applied_at,
      a.full_name, a.phone, a.email AS application_email, a.website, a.portfolio_url,
      a.resume_name, a.resume_size,
      u.name AS applicant_name, u.email AS applicant_email
    FROM applications AS a
    INNER JOIN users AS u ON u.id = a.applicant_id
    WHERE a.job_id = ${jobId}
    ORDER BY a.applied_at DESC, a.id DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    job_id: row.job_id,
    applicant_id: row.applicant_id,
    cover_letter: row.cover_letter,
    status: row.status,
    applied_at: row.applied_at,
    full_name: row.full_name,
    phone: row.phone,
    email: row.application_email,
    website: row.website,
    portfolio_url: row.portfolio_url,
    resume_name: row.resume_name,
    resume_size: row.resume_size === null ? null : Number(row.resume_size),
    resume_url: row.resume_name ? `/api/applications/${row.id}/resume` : null,
    applicant: {
      id: row.applicant_id,
      name: row.applicant_name,
      email: row.applicant_email,
    },
  }));
}

export async function findApplicationById(id) {
  const [application] = await sql`
    SELECT a.id, a.job_id, a.applicant_id, a.cover_letter, a.status, a.applied_at,
      a.full_name, a.phone, a.email, a.website, a.portfolio_url, a.resume_name, a.resume_size,
      a.resume_mime, a.resume_data,
      j.recruiter_id
    FROM applications AS a
    INNER JOIN jobs AS j ON j.id = a.job_id
    WHERE a.id = ${id}
  `;

  return application;
}

export async function updateApplicationStatus(id, status) {
  await sql`UPDATE applications SET status = ${status} WHERE id = ${id}`;
}
