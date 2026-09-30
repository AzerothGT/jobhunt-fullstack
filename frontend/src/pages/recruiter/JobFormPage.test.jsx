import { expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import JobFormPage from './JobFormPage.jsx'

function renderForm(path, route, mode) {
  return renderToString(
    createElement(
      MemoryRouter,
      { initialEntries: [path] },
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: route,
          element: createElement(JobFormPage, { mode }),
        }),
      ),
    ),
  )
}

test('renders location as optional and retains the Remote datalist option', () => {
  const markup = renderForm('/jobs/create', '/jobs/create', 'create')

  expect(markup).not.toContain('Lokasi <span class="required-mark">*</span>')
  expect(markup).not.toMatch(/<input id="location"[^>]*\srequired=/)
  expect(markup).toContain('<datalist id="job-location-options"><option value="Remote"></option></datalist>')
})

test('renders the create job form under a router', () => {
  expect(renderForm('/jobs/create', '/jobs/create', 'create')).toContain('Pasang lowongan.')
})

test('renders the edit job loading state under a router', () => {
  expect(renderForm('/jobs/42/edit', '/jobs/:id/edit', 'edit')).toContain('Memuat lowongan')
})
