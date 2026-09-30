import { test, expect } from '@playwright/test'
import { stubApi, weather } from './fixtures'

test.beforeEach(async ({ page }) => { await stubApi(page) })

test.describe('Dashboard', () => {
  test('opens without an account', async ({ page }) => {
    await page.goto('/?location=rodney-bay')
    await expect(page.getByText('Local Forecast')).toBeVisible()
    await expect(page.getByText('Marina Services')).toBeVisible()
  })

  test('the wind labeled KT is the knots figure from the stub, not a conversion', async ({ page }) => {
    await page.goto('/?location=rodney-bay')
    await expect(page.getByText(`WINDS ${weather.current.wind_speed} KT`)).toBeVisible()
  })

  test('shows no sign-in or account link', async ({ page }) => {
    await page.goto('/?location=rodney-bay')
    await expect(page.getByRole('link', { name: /sign in/i })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /^account$/i })).toHaveCount(0)
  })

  test('sign-in page lives at its own address', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  })

  test('the old sign-in address redirects to the dashboard', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/$/)
  })
})
