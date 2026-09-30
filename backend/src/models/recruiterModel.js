import sql from "../config/db.js";

export async function findDashboardSummary(recruiterId) {
  const [summary] = await sql`
    SELECT COUNT(DISTINCT j.id) AS total_jobs, COUNT(a.id) AS total_applicants
    FROM jobs AS j
    LEFT JOIN applications AS a ON a.job_id = j.id
    WHERE j.recruiter_id = ${recruiterId}
  `;

  return {
    total_jobs: Number(summary.total_jobs),
    total_applicants: Number(summary.total_applicants),
  };
}
