import { Link } from 'react-router-dom'
import { formatSalary, jobTypeLabel } from '../utils/format.js'

export default function JobCard({ job, showApplicants = false }) {
  const salary = [formatSalary(job.salary_min), formatSalary(job.salary_max)].filter(Boolean)
  const salaryText = salary.length === 2 ? `${salary[0]} — ${salary[1]}` : salary[0]

  return (
    <article className="job-card">
      <div className="job-card-topline">
        <span className="job-type">{jobTypeLabel(job.type)}</span>
        {showApplicants && <span className="applicant-count">{job.applicant_count ?? 0} pelamar</span>}
      </div>
      <h2><Link to={`/jobs/${job.id}`}>{job.title}</Link></h2>
      <p className="job-company">{job.company}</p>
      <div className="job-card-bottom">
        <span>{job.location}</span>
        <span className="job-salary">{salaryText || 'Gaji dibicarakan'}</span>
      </div>

    </article>
  )
}
