import { test, expect } from '@playwright/test'
import { stubApi } from './fixtures'

test.describe('Locations', () => {
  test('offers a coming-soon signup for a location that is not live yet', async ({ page }) => {
    await stubApi(page)
    await page.goto('/?location=rodney-bay')
    await page.getByText('Rodney Bay', { exact: false }).first().click()
    const soon = page.locator('text=SOON').first()
    await expect(soon).toBeVisible()
    await soon.click()
    await expect(page.getByText(/is coming soon/i)).toBeVisible()
    await expect(page.getByPlaceholder('captain@boat.com')).toBeVisible()
    await expect(page.getByText(/free at launch/i)).toBeVisible()
  })
})
