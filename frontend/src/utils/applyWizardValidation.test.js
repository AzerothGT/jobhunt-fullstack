import { expect, test } from 'bun:test'
import { MAX_RESUME_SIZE, validateApplyStep } from './applyWizardValidation.js'

const validPersonal = {
  full_name: 'Rick Grimes',
  phone: '+62 89 580 618 4222',
  email: 'hey@rickgrimes.com',
  website: 'rickgrimes.com',
  portfolio_url: 'dribbble.com/rickgrimes',
}

const validAdditional = {
  cover_letter: 'Dear team, I am excited to apply for this role.',
  resume_name: 'Sr. Web Designer Role - Rick.pdf',
  resume_size: 2 * 1024 * 1024,
}

test('accepts a complete personal step', () => {
  expect(validateApplyStep('personal', validPersonal)).toBeNull()
})

test('rejects blank required personal fields', () => {
  for (const field of ['full_name', 'phone', 'email']) {
    expect(validateApplyStep('personal', { ...validPersonal, [field]: '  ' })).not.toBeNull()
  }
})

test('rejects an invalid email', () => {
  expect(validateApplyStep('personal', { ...validPersonal, email: 'not-an-email' })).toContain('email')
})

test('accepts empty optional personal fields', () => {
  expect(validateApplyStep('personal', { ...validPersonal, website: '', portfolio_url: '' })).toBeNull()
})

test('rejects an empty cover letter', () => {
  expect(validateApplyStep('additional', { ...validAdditional, cover_letter: '  ' })).not.toBeNull()
})

test('rejects an oversized resume', () => {
  expect(validateApplyStep('additional', { ...validAdditional, resume_size: MAX_RESUME_SIZE + 1 })).toContain('12MB')
})

test('rejects a non-pdf/doc resume', () => {
  expect(validateApplyStep('additional', { ...validAdditional, resume_name: 'photo.png' })).toContain('PDF')
})

test('accepts additional step without a resume', () => {
  expect(validateApplyStep('additional', { ...validAdditional, resume_name: '', resume_size: '' })).toBeNull()
})
