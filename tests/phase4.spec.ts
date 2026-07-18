import { test, expect } from '@playwright/test'

test.describe('Predecessor Labs - Phase 4 E2E Discovery Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local server
    await page.goto('http://localhost:3000')
  });

  test('1. Verify Global Search functionality', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search heroes, items, abilities"]')
    await expect(searchInput).toBeVisible()
    
    // Type search query
    await searchInput.fill('Terra')
    
    // Check search results overlay popup matches "Fighter"
    const overlayResult = page.locator('text=Fighter').first()
    await expect(overlayResult).toBeVisible()
    
    // Click result and verify navigation to Library Detail view
    await overlayResult.click()
    await expect(page.locator('text=Terra Detail')).toBeVisible()
    await expect(page.locator('text=Interactive Stats Slider')).toBeVisible()
  })

  test('2. Verify Feed tab content and Featured placement', async ({ page }) => {
    // Navigate to Feed tab
    await page.click('button:has-text("Feed")')
    
    // Check Feed header
    await expect(page.locator('text=Predecessor Content Feed')).toBeVisible()
    
    // Verify presence of at least one feed card (Reddit or Official)
    const feedCards = page.locator('div:has-text("Read Full Post")').first()
    await expect(feedCards).toBeVisible()
    
    // Verify Official / Reddit badges exist
    const badges = page.locator('span:has-text("Official Announcement"), span:has-text("Reddit")')
    await expect(badges.first()).toBeVisible()

    // Test feature toggle button presence
    const featureBtn = page.locator('button:has-text("Feature Content"), button:has-text("Unfeature")')
    await expect(featureBtn.first()).toBeVisible()
  })

  test('3. Verify Meta Tracker tab and import to Lab', async ({ page }) => {
    // Navigate to Meta tab
    await page.click('button:has-text("Meta")')
    
    // Verify sections
    await expect(page.locator('text=Patch Meta Narrative Summary')).toBeVisible()
    await expect(page.locator('text=Rising Heroes')).toBeVisible()
    await expect(page.locator('text=Trending Items')).toBeVisible()

    // Verify popular reference build entry exists
    const labImportBtn = page.locator('button:has-text("Open in Lab")')
    await expect(labImportBtn.first()).toBeVisible()
  })

  test('4. Verify Library sub-sections and level slider', async ({ page }) => {
    // Navigate to Library tab
    await page.click('button:has-text("Library")')
    
    // Click items tab in library
    await page.click('button:has-text("items")')
    // Click on the first item image/card to show detail
    await page.locator('img[alt]').first().click()
    await expect(page.locator('text=Detail').first()).toBeVisible()

    // Sub-navigate to Eternals
    await page.click('button:has-text("eternals")')
    await page.locator('h4').first().click()
    await expect(page.locator('text=Passive').first()).toBeVisible()

    // Sub-navigate to Patches
    await page.click('button:has-text("patches")')
    await expect(page.locator('text=Predecessor Patch Notes History')).toBeVisible()
  })
})
