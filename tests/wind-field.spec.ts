import { test, expect } from '@playwright/test'
import { stubApi, windField } from './fixtures'
import { arrowTheta } from '../src/components/windfield'

test.describe('Wind on the Water', () => {
  test('arrows point downwind, not into the wind', () => {
    // ENE (67.5) must send arrows WSW: left and down in SVG coordinates.
    const theta = arrowTheta(67.5)
    expect(theta).toBe(157.5)
    expect(Math.cos((theta * Math.PI) / 180)).toBeLessThan(0)
    expect(Math.sin((theta * Math.PI) / 180)).toBeGreaterThan(0)
  })

  test('renders the map and both wind rows', async ({ page }) => {
    await stubApi(page)
    await page.goto('/?location=rodney-bay')
    await expect(page.getByText('Wind on the Water')).toBeVisible()
    await expect(page.getByText('Outside The Bay')).toBeVisible()
    await expect(page.getByText(/In The Anchorage/)).toBeVisible()
    await expect(page.locator('svg[role="img"]')).toBeVisible()
  })

  test('labels the anchorage figure as an estimate', async ({ page }) => {
    await stubApi(page)
    await page.goto('/?location=rodney-bay')
    await expect(page.getByText(/In The Anchorage . Est\./)).toBeVisible()
    await expect(page.getByText(/estimated from wind direction/i)).toBeVisible()
  })

  test('removes the map rather than faking it when the feed fails', async ({ page }) => {
    await stubApi(page)
    await page.route('**/api/wind-field*', r =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'error' }) }))
    await page.goto('/?location=rodney-bay')
    await expect(page.getByText('Wind Field Unavailable')).toBeVisible()
    await expect(page.locator('svg[role="img"]')).toHaveCount(0)
  })

  test('drops the green verdict once the anchorage blows over 20 kt', async ({ page }) => {
    await stubApi(page)
    await page.route('**/api/wind-field*', r => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ...windField, anchorage: { speedKt: 24, gustKt: 31, directionDeg: 67.5 } }),
    }))
    await page.goto('/?location=rodney-bay')
    await expect(page.getByText(/Gusts Reach The Anchorage/)).toBeVisible()
    await expect(page.getByText(/Lee Side Is Sheltered/)).toHaveCount(0)
  })
})
