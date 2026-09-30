import { expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ApplyWizardPage from './ApplyWizardPage.jsx'
import AuthProvider from '../hooks/AuthProvider.jsx'

function renderWizard(path) {
  return renderToString(
    createElement(
      MemoryRouter,
      { initialEntries: [path] },
      createElement(
        AuthProvider,
        null,
        createElement(
          Routes,
          null,
          createElement(Route, {
            path: '/jobs/:id/apply',
            element: createElement(ApplyWizardPage),
          }),
        ),
      ),
    ),
  )
}

test('renders the three wizard steps', () => {
  const markup = renderWizard('/jobs/1/apply')

  expect(markup).toContain('Personal')
  expect(markup).toContain('Additional')
  expect(markup).toContain('Review')
})

test('renders personal fields with required marks', () => {
  const markup = renderWizard('/jobs/1/apply')

  expect(markup).toContain('Full name')
  expect(markup).toContain('Phone number')
  expect(markup).toContain('Email address')
  expect(markup).toContain('required-mark')
})

test('renders a continue action', () => {
  const markup = renderWizard('/jobs/1/apply')

  expect(markup).toContain('Continue')
})
