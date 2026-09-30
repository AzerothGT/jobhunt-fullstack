export const JOB_TYPES = [
  ['full-time', 'Penuh waktu'],
  ['part-time', 'Paruh waktu'],
  ['contract', 'Kontrak'],
  ['internship', 'Magang'],
]

export function jobTypeLabel(type) {
  return JOB_TYPES.find(([value]) => value === type)?.[1] ?? type ?? 'Jenis kerja'
}

export function formatSalary(value) {
  if (value === null || value === undefined || value === '') return ''
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value))
}

export function formatDate(value) {
  if (!value) return 'Tanggal tidak tersedia'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Tanggal tidak tersedia'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(date)
}
