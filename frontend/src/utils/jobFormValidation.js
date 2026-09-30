function optionalNumber(value) {
  if (value == null || String(value).trim() === '') return null
  return Number(value)
}

export function validateJobForm(values) {
  if (['title', 'company', 'description'].some((field) => !String(values[field] ?? '').trim())) {
    return 'Jabatan, perusahaan, dan deskripsi wajib diisi.'
  }

  const minimum = optionalNumber(values.salary_min)
  const maximum = optionalNumber(values.salary_max)
  if (minimum !== null && (!Number.isFinite(minimum) || minimum < 0)) return 'Gaji minimum harus berupa angka nol atau lebih.'
  if (maximum !== null && (!Number.isFinite(maximum) || maximum < 0)) return 'Gaji maksimum harus berupa angka nol atau lebih.'
  if (minimum !== null && maximum !== null && maximum < minimum) return 'Gaji maksimum tidak boleh lebih kecil dari gaji minimum.'
  return null
}
