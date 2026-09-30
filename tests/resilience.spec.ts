import { test, expect } from '@playwright/test'
import { stubApi } from './fixtures'

test.describe('Resilience', () => {
  test('a malformed feed breaks only its own card, not the page', async ({ page }) => {
    await stubApi(page)
    // The storm feed answering with an unexpected shape used to throw during
    // render and take the whole page down with it. Each dashboard card now
    // has its own error boundary, so only that card should be affected.
    await page.route('**/api/tropical*', r =>
      r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))

    await page.goto('/?location=rodney-bay')

    await expect(page.getByText(/this card could not be read/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /reload/i })).toBeVisible()
    // The rest of the dashboard still rendered.
    await expect(page.getByText('Local Forecast')).toBeVisible()
    await expect(page.getByText('Marina Services')).toBeVisible()
  })
})
