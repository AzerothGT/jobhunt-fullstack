import sql from "../config/db.js";

const COLUMNS = `id, recruiter_id, title, company, location, type, description,
  requirements, salary_min, salary_max, is_active, created_at`;
const LIST_COLUMNS = `j.id, j.recruiter_id, j.title, j.company, j.location, j.type,
  j.description, j.requirements, j.salary_min, j.salary_max, j.is_active, j.created_at`;

function mapJob(row) {
  return row
    ? {
        ...row,
        is_active: Boolean(row.is_active),
        ...(row.applicant_count === undefined ? {} : { applicant_count: Number(row.applicant_count) }),
      }
    : undefined;
}

export async function createJob(job) {
  const result = await sql`
    INSERT INTO jobs
      (recruiter_id, title, company, location, type, description, requirements, salary_min, salary_max)
    VALUES
      (${job.recruiter_id}, ${job.title}, ${job.company}, ${job.location}, ${job.type},
       ${job.description}, ${job.requirements}, ${job.salary_min}, ${job.salary_max})
  `;

  return findJobById(result.lastInsertRowid);
}

export async function findJobById(id) {
  const [row] = await sql.unsafe(`SELECT ${COLUMNS} FROM jobs WHERE id = ?`, [id]);

  return mapJob(row);
}

export async function findActiveJobs({ page, limit, keyword, type, location, sort }) {
  const conditions = ["j.is_active = TRUE"];
  const filters = [];

  if (keyword) {
    conditions.push("(j.title LIKE ? OR j.company LIKE ?)");
    filters.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (type) {
    conditions.push("j.type = ?");
    filters.push(type);
  }

  if (location) {
    conditions.push("j.location LIKE ?");
    filters.push(`%${location}%`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const [{ total }] = await sql.unsafe(`SELECT COUNT(*) AS total FROM jobs AS j ${where}`, filters);
  const orderBy =
    sort === "applicants"
      ? "applicant_count DESC, j.created_at DESC, j.id DESC"
      : "j.created_at DESC, j.id DESC";
  const rows = await sql.unsafe(
    `SELECT ${LIST_COLUMNS},
      (SELECT COUNT(*) FROM applications AS a WHERE a.job_id = j.id) AS applicant_count
     FROM jobs AS j ${where}
     ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...filters, limit, (page - 1) * limit],
  );

  return { data: rows.map(mapJob), total: Number(total) };
}

export async function findJobsByRecruiter(recruiterId) {
  const rows = await sql.unsafe(
    `SELECT ${COLUMNS} FROM jobs WHERE recruiter_id = ? ORDER BY created_at DESC, id DESC`,
    [recruiterId],
  );

  return rows.map(mapJob);
}

export async function updateJob(id, fields) {
  const entries = Object.entries(fields);
  const assignments = entries.map(([column]) => `${column} = ?`).join(", ");

  await sql.unsafe(
    `UPDATE jobs SET ${assignments} WHERE id = ?`,
    [...entries.map(([, value]) => value), id],
  );

  return findJobById(id);
}

export async function deleteJob(id) {
  await sql`DELETE FROM jobs WHERE id = ${id}`;
}
