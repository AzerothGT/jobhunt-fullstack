import { expect, test } from 'bun:test'
import { validateJobForm } from './jobFormValidation.js'

const validValues = {
  title: 'Product Designer',
  company: 'Acme',
  location: 'Jakarta',
  description: 'Design useful things.',
  salary_min: '',
  salary_max: '',
}

test('rejects whitespace-only required fields', () => {
  for (const field of ['title', 'company', 'description']) {
    expect(validateJobForm({ ...validValues, [field]: ' \n\t' })).not.toBeNull()
  }
})

test('accepts an empty location', () => {
  expect(validateJobForm({ ...validValues, location: '' })).toBeNull()
})

test('rejects a maximum salary below the minimum', () => {
  expect(validateJobForm({ ...validValues, salary_min: '900', salary_max: '500' })).toContain('maksimum')
})
