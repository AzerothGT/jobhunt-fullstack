export const MAX_RESUME_SIZE = 12 * 1024 * 1024
const RESUME_PATTERN = /\.(pdf|doc|docx)$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function blank(value) {
  return String(value ?? '').trim() === ''
}

function validatePersonal(values) {
  for (const field of ['full_name', 'phone', 'email']) {
    if (blank(values[field])) return 'Nama lengkap, nomor telepon, dan email wajib diisi.'
  }
  if (!EMAIL_PATTERN.test(String(values.email).trim())) return 'Format email tidak valid.'
  return null
}

function validateAdditional(values) {
  if (blank(values.cover_letter)) return 'Cover letter wajib diisi.'
  const resumeName = String(values.resume_name ?? '').trim()
  const resumeSize = values.resume_size === '' || values.resume_size == null ? null : Number(values.resume_size)
  if (resumeName === '' && resumeSize === null) return null
  if (resumeName === '' || resumeSize === null) return 'Nama dan ukuran file resume harus diisi bersamaan.'
  if (!RESUME_PATTERN.test(resumeName)) return 'Resume harus berformat PDF, DOC, atau DOCX.'
  if (!Number.isInteger(resumeSize) || resumeSize < 0) return 'Ukuran resume tidak valid.'
  if (resumeSize > MAX_RESUME_SIZE) return 'Resume maksimal 12MB (pdf, doc, docx).'
  return null
}

export function validateApplyStep(step, values) {
  if (step === 'personal') return validatePersonal(values)
  if (step === 'additional') return validateAdditional(values)
  return null
}
