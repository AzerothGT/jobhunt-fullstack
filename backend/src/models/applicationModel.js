import sql from "../config/db.js";

export async function createApplication({ job_id, applicant_id, cover_letter }) {
  const result = await sql`
    INSERT INTO applications (job_id, applicant_id, cover_letter)
    VALUES (${job_id}, ${applicant_id}, ${cover_letter})
  `;

  return findApplicationById(result.lastInsertRowid);
}

export async function findApplicationsByApplicant(applicantId) {
  const rows = await sql`
    SELECT a.id, a.job_id, a.applicant_id, a.cover_letter, a.status, a.applied_at,
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
