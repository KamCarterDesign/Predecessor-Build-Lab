/**
 * Patch Notes Sync Script
 *
 * Scrapes patch notes from the official Predecessor site using Playwright,
 * extracts titles, dates, excerpts, links and images, and upserts them
 * to the Firestore /patch_notes collection.
 *
 * Run: npm run sync:patches
 */
import { chromium } from 'playwright'
import { getFirestore } from './firebase-admin.js'

// Initialize Firestore
const db = getFirestore()

interface PatchNoteItem {
  id: string
  title: string
  link: string
  date: string
  excerpt: string
  image_url: string
  released_at: string
}

function parseReleaseDate(dateStr: string): string {
  const clean = dateStr.trim().toLowerCase()
  if (clean === 'today') {
    return new Date().toISOString()
  }
  if (clean === 'yesterday') {
    return new Date(Date.now() - 86400000).toISOString()
  }
  
  const parsed = Date.parse(dateStr)
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString()
  }
  return new Date().toISOString() // Fallback
}

async function scrapePatchNotes(): Promise<PatchNoteItem[]> {
  const items: PatchNoteItem[] = []
  console.log('Launching browser to scrape Predecessor patch notes...')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  
  try {
    console.log('Navigating to Predecessor patch notes page...')
    await page.goto('https://www.predecessorgame.com/en-US/news/patch-notes', { waitUntil: 'domcontentloaded' })
    
    const loadMoreBtn = page.locator('button:has-text("Load More News")')
    
    let clicks = 0
    while (await loadMoreBtn.isVisible()) {
      const disabled = await loadMoreBtn.getAttribute('disabled')
      if (disabled !== null) {
        console.log('Load More button is disabled.')
        break
      }
      console.log(`Clicking Load More News #${clicks + 1}...`)
      await loadMoreBtn.click()
      await page.waitForTimeout(1000) // Wait 1 second for items to load
      clicks++
      if (clicks > 25) { // Safety limit to avoid infinite loops
        console.log('Reached safety limit of clicks.')
        break
      }
    }
    
    console.log('Extracting patch notes elements...')
    const cards = page.locator('div.group.text-pg-dark-blue')
    const count = await cards.count()
    console.log(`Found ${count} total patch note cards in DOM.`)
    
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      const rawTitle = await card.locator('h3').textContent()
      const rawLink = await card.locator('a').first().getAttribute('href')
      const rawDate = await card.locator('p.text-sm').textContent()
      const rawExcerpt = await card.locator('p.line-clamp-3').textContent()
      const rawImgUrl = await card.locator('img').getAttribute('src')
      
      const title = rawTitle?.trim() || ''
      const linkPath = rawLink?.trim() || ''
      const date = rawDate?.trim() || ''
      const excerpt = rawExcerpt?.trim() || ''
      const image_url = rawImgUrl?.trim() || ''
      
      if (!title || !linkPath) continue
      
      const fullLink = linkPath.startsWith('http') ? linkPath : `https://www.predecessorgame.com${linkPath}`
      
      // Extract slug for id
      const slug = linkPath.split('/').pop() || Buffer.from(fullLink).toString('base64').replace(/=/g, '').slice(-20)
      
      const released_at = parseReleaseDate(date)
      
      items.push({
        id: slug,
        title,
        link: fullLink,
        date,
        excerpt,
        image_url,
        released_at
      })
    }
  } catch (err) {
    console.error('Error during scraping:', err)
  } finally {
    await browser.close()
  }
  
  return items
}

async function run() {
  const scrapedItems = await scrapePatchNotes()
  
  if (scrapedItems.length === 0) {
    console.log('No patch notes scraped. Aborting Firestore sync.')
    return
  }
  
  console.log(`Fetched ${scrapedItems.length} patch notes. Updating Firestore...`)
  
  // Incremental upsert in batches
  const batch = db.batch()
  let addedCount = 0
  
  for (const item of scrapedItems) {
    const docRef = db.collection('patch_notes').doc(item.id)
    batch.set(docRef, item, { merge: true })
    addedCount++
  }
  
  await batch.commit()
  console.log(`Firestore update completed. Upserted ${addedCount} patch notes!`)
}

run().catch((err) => {
  console.error('Fatal sync script error:', err)
  process.exit(1)
})
