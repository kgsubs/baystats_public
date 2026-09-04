import { test, expect } from '@playwright/test'
import { stubApi } from './fixtures'

test.describe('Resilience', () => {
  test('a malformed feed shows a message instead of a blank page', async ({ page }) => {
    await stubApi(page)
    // The storm feed answering with an unexpected shape used to throw during
    // render and leave the visitor looking at nothing at all.
    await page.route('**/api/tropical*', r =>
      r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))

    await page.goto('/?location=rodney-bay')

    await expect(page.getByText(/conditions are unavailable/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /reload/i })).toBeVisible()
    expect((await page.locator('body').innerText()).trim().length).toBeGreaterThan(0)
  })
})
