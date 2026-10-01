import { expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SavedJobsPage from './SavedJobsPage.jsx'

function renderPage() {
  return renderToString(
    createElement(
      MemoryRouter,
      { initialEntries: ['/bookmarks'] },
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: '/bookmarks',
          element: createElement(SavedJobsPage),
        }),
      ),
    ),
  )
}

test('renders the saved jobs heading', () => {
  const markup = renderPage()

  expect(markup).toContain('Lowongan tersimpan.')
  expect(markup).toContain('Koleksi pribadi')
})

test('renders the loading state on first paint', () => {
  expect(renderPage()).toContain('Memuat simpanan')
})
