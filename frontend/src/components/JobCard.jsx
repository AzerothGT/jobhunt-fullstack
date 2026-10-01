import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { formatSalary, jobTypeLabel } from '../utils/format.js'

export default function JobCard({ job, showApplicants = false }) {
  const salary = [formatSalary(job.salary_min), formatSalary(job.salary_max)].filter(Boolean)
  const salaryText = salary.length === 2 ? `${salary[0]} — ${salary[1]}` : salary[0]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{jobTypeLabel(job.type)}</Badge>
          {showApplicants && <Badge variant="outline">{job.applicant_count ?? 0} pelamar</Badge>}
        </div>
        <CardTitle className="text-xl">
          <Link to={`/jobs/${job.id}`} className="hover:underline">{job.title}</Link>
        </CardTitle>
        <CardDescription>{job.company}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{job.location}</span>
        <span className="font-medium text-foreground">{salaryText || 'Gaji dibicarakan'}</span>
      </CardContent>
      <CardFooter>
        <Link to={`/jobs/${job.id}`} className="text-sm font-medium text-primary hover:underline">
          Lihat detail
        </Link>
      </CardFooter>
    </Card>
  )
}
