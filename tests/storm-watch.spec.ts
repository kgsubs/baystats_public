import { test, expect } from '@playwright/test'
import { stubApi, tropical } from './fixtures'

test.describe('Storm Watch', () => {
  test('an unavailable storm feed is not shown as green', async ({ page }) => {
    await stubApi(page)
    await page.route('**/api/tropical*', r =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'unavailable', activeSystems: [], nextUpdate: 'See NHC website', nhcUrl: 'https://www.nhc.noaa.gov', timestamp: new Date().toISOString() }),
      }))

    await page.goto('/?location=rodney-bay')

    const status = page.getByTestId('storm-status')
    await expect(status).toContainText(/unavailable/i)
    // The light-mode success background is #dcfce7 (rgb(220, 252, 231));
    // the unavailable state must use the warning background instead.
    await expect(status).not.toHaveCSS('background-color', 'rgb(220, 252, 231)')
    await expect(status).toHaveCSS('background-color', 'rgb(254, 243, 199)')
  })

  test('an active storm is rendered, not hidden behind a clear reading', async ({ page }) => {
    await stubApi(page)
    await page.route('**/api/tropical*', r =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'active',
          activeSystems: [{
            name: 'Test',
            category: 'Category 1 Hurricane',
            position: '14°N 61°W',
            distance: 120,
            bearing: 'E',
            windSpeed: { kts: 70, mph: 81 },
            movement: 'See NHC advisory',
            pressure: 'See NHC advisory',
            watches: [],
            advisoryUrl: 'https://www.nhc.noaa.gov',
          }],
          nextUpdate: '3:00 AM AST',
          nhcUrl: 'https://www.nhc.noaa.gov',
          timestamp: new Date().toISOString(),
        }),
      }))

    await page.goto('/?location=rodney-bay')

    await expect(page.getByTestId('storm-status')).toContainText(/1 Active System/i)
    await expect(page.getByText(/Test.*Category 1 Hurricane/)).toBeVisible()
    await expect(page.getByText(/120 nm E, 70 kt sustained/)).toBeVisible()
  })

  test('a clear reading is still shown as clear', async ({ page }) => {
    await stubApi(page)
    await page.goto('/?location=rodney-bay')
    await expect(page.getByTestId('storm-status')).toContainText(/No Active Systems/i)
    expect(tropical.status).toBe('clear')
  })

  test('a failed refetch does not leave a stale clear reading on screen', async ({ page }) => {
    await stubApi(page)
    await page.clock.install()
    await page.goto('/?location=rodney-bay')
    await expect(page.getByTestId('storm-status')).toContainText(/No Active Systems/i)

    // The next auto-refresh fails; the previously fetched "clear" reading
    // must not keep showing as if it were still current.
    await page.route('**/api/tropical*', r =>
      r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' }))

    // Fire the hook's 30-minute auto-refresh interval.
    await page.clock.fastForward('30:01')

    await expect(page.getByTestId('storm-status')).toContainText(/unavailable/i)
  })

  test('an outlook with no parsable text is reported as unavailable, not invented as clear', async ({ page }) => {
    await stubApi(page)
    await page.route('**/api/tropical*', r =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'clear',
          activeSystems: [],
          // No outlook items parsed out of the feed text.
          nextUpdate: '3:00 AM AST',
          nhcUrl: 'https://www.nhc.noaa.gov',
          timestamp: new Date().toISOString(),
        }),
      }))

    await page.goto('/?location=rodney-bay')

    await expect(page.getByText('Outlook unavailable, check NHC')).toBeVisible()
    await expect(page.getByText('No Development')).toHaveCount(0)
  })
})
