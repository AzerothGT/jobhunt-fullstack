import sql from "../config/db.js";

export async function createBookmark({ user_id, job_id }) {
  const result = await sql`
    INSERT INTO bookmarks (user_id, job_id)
    VALUES (${user_id}, ${job_id})
  `;

  return findBookmarkById(result.insertId ?? result.lastInsertRowid);
}

export async function findBookmark(userId, jobId) {
  const [bookmark] = await sql`
    SELECT id, user_id, job_id, created_at FROM bookmarks
    WHERE user_id = ${userId} AND job_id = ${jobId}
  `;

  return bookmark;
}

export async function findBookmarkById(id) {
  const [bookmark] = await sql`
    SELECT id, user_id, job_id, created_at FROM bookmarks WHERE id = ${id}
  `;

  return bookmark;
}

export async function findBookmarksByUser(userId) {
  const rows = await sql`
    SELECT b.id AS bookmark_id, b.created_at AS bookmarked_at,
      j.id, j.recruiter_id, j.title, j.company, j.location, j.type,
      j.description, j.requirements, j.salary_min, j.salary_max,
      j.is_active, j.created_at
    FROM bookmarks AS b
    INNER JOIN jobs AS j ON j.id = b.job_id
    WHERE b.user_id = ${userId}
    ORDER BY b.created_at DESC, b.id DESC
  `;

  return rows.map((row) => ({
    bookmark_id: row.bookmark_id,
    bookmarked_at: row.bookmarked_at,
    id: row.id,
    recruiter_id: row.recruiter_id,
    title: row.title,
    company: row.company,
    location: row.location,
    type: row.type,
    description: row.description,
    requirements: row.requirements,
    salary_min: row.salary_min,
    salary_max: row.salary_max,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
  }));
}

export async function deleteBookmark(userId, jobId) {
  await sql`DELETE FROM bookmarks WHERE user_id = ${userId} AND job_id = ${jobId}`;
}
