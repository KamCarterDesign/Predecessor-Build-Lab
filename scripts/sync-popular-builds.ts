/**
 * Popular Builds Sync Script
 *
 * Scrapes pred.gg hero pages to extract the most popular/highest-winrate build
 * per hero (items, crest, eternal). Stores the result as a `popular_build` field
 * on each hero's Firestore document.
 *
 * Data extracted per hero:
 *   - Core items (top 3 in build order)
 *   - 4th, 5th, 6th most popular items
 *   - Most popular crest
 *   - Most popular eternal
 *   - Core build win rate & match count
 *
 * Run: npm run sync:popular-builds
 * Recommended cadence: once per week (or after major patches)
 */
import fetch from 'node-fetch'
import * as cheerio from 'cheerio'
import { getFirestore } from './firebase-admin.js'

const PRED_GG_BASE = 'https://pred.gg'
const DELAY_MS = 500 // Rate-limit delay between hero pages

// ─── Types ───────────────────────────────────────────────────────────────────

interface PopularBuild {
  item_slugs: string[]     // up to 6 item slugs in build order
  crest_slug: string | null
  eternal_slug: string | null
  win_rate: number | null
  match_count: number | null
  scraped_at: string
}

// ─── HTML Parsing Helpers ────────────────────────────────────────────────────

/**
 * Extract item slug from a pred.gg item link href.
 * E.g. "/items/overlord?version=155" → "overlord"
 */
function extractItemSlug(href: string): string | null {
  const match = href.match(/\/items\/([a-z0-9-]+)/)
  return match ? match[1] : null
}

/**
 * Extract eternal slug from a pred.gg eternal link href.
 * E.g. "/eternals/Thraex" → "thraex"
 */
function extractEternalSlug(href: string): string | null {
  const match = href.match(/\/eternals\/([A-Za-z0-9-]+)/)
  return match ? match[1].toLowerCase() : null
}

/**
 * Parse a winrate string like "53.57%" → 53.57
 */
function parseWinRate(text: string): number | null {
  const match = text.match(/([\d.]+)%/)
  return match ? parseFloat(match[1]) : null
}

/**
 * Parse a match count string like "3362 Matches" → 3362
 */
function parseMatchCount(text: string): number | null {
  const match = text.match(/([\d,]+)\s*Match/)
  return match ? parseInt(match[1].replace(/,/g, ''), 10) : null
}

// ─── Scraper ─────────────────────────────────────────────────────────────────

async function scrapeHeroBuild(heroSlug: string): Promise<PopularBuild | null> {
  const url = `${PRED_GG_BASE}/heroes/${heroSlug}`
  console.log(`  Fetching: ${url}`)

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PredecessorLabs/1.0)' },
  })

  if (!res.ok) {
    console.warn(`  ⚠ ${res.status} for ${heroSlug}`)
    return null
  }

  const html = await res.text()
  const $ = cheerio.load(html)

  // ── Extract Core Items (top 3-item build path) ────────────────────────────
  // The core items section contains item links in a row connected by arrows.
  // We look for the section with "Core Items" header, then get all item links within it.
  const coreItems: string[] = []
  let coreWinRate: number | null = null
  let coreMatchCount: number | null = null

  // Find all sections with hr-title headers
  $('span.hr-title').each((_, headerEl) => {
    const headerText = $(headerEl).text().trim().toLowerCase()

    if (headerText === 'core items') {
      const container = $(headerEl).parent()
      // Core items are displayed as linked images in a row
      container.find('a[href*="/items/"]').each((_, linkEl) => {
        const href = $(linkEl).attr('href') || ''
        const slug = extractItemSlug(href)
        if (slug && !coreItems.includes(slug)) {
          coreItems.push(slug)
        }
      })

      // Extract winrate and match count from the core build stats
      const statsText = container.text()
      coreWinRate = parseWinRate(statsText)
      coreMatchCount = parseMatchCount(statsText)
    }
  })

  // ── Extract 4th, 5th, 6th Items ───────────────────────────────────────────
  // Each section has a header like "Fourth Items", "Fifth Items", "Sixth Items"
  // We take the first (most popular/highest match count) item from each
  const slotItems: Record<string, string | null> = {
    'fourth items': null,
    'fifth items': null,
    'sixth items': null,
  }

  $('span.hr-title').each((_, headerEl) => {
    const headerText = $(headerEl).text().trim().toLowerCase()

    if (headerText in slotItems) {
      const container = $(headerEl).parent()
      // The first item link in build-recommendation-row is the most popular
      const firstLink = container.find('a[href*="/items/"]').first()
      if (firstLink.length) {
        const href = firstLink.attr('href') || ''
        slotItems[headerText] = extractItemSlug(href)
      }
    }
  })

  // ── Extract Most Popular Crest ────────────────────────────────────────────
  let crestSlug: string | null = null

  $('span.hr-title').each((_, headerEl) => {
    const headerText = $(headerEl).text().trim().toLowerCase()

    if (headerText === 'crests') {
      const container = $(headerEl).parent()
      const firstLink = container.find('a[href*="/items/"]').first()
      if (firstLink.length) {
        const href = firstLink.attr('href') || ''
        crestSlug = extractItemSlug(href)
      }
    }
  })

  // ── Extract Most Popular Eternal ──────────────────────────────────────────
  let eternalSlug: string | null = null

  $('span.hr-title').each((_, headerEl) => {
    const headerText = $(headerEl).text().trim().toLowerCase()

    if (headerText === 'eternals') {
      const container = $(headerEl).parent()
      const firstLink = container.find('a[href*="/eternals/"]').first()
      if (firstLink.length) {
        const href = firstLink.attr('href') || ''
        eternalSlug = extractEternalSlug(href)
      }
    }
  })

  // ── Assemble the build ────────────────────────────────────────────────────
  // Combine core items + slot items, deduplicating
  const allItems = [...coreItems]
  for (const key of ['fourth items', 'fifth items', 'sixth items']) {
    const slug = slotItems[key]
    if (slug && !allItems.includes(slug)) {
      allItems.push(slug)
    }
  }

  // Only return a build if we found at least some items
  if (allItems.length === 0 && !crestSlug && !eternalSlug) {
    console.warn(`  ⚠ No build data found for ${heroSlug}`)
    return null
  }

  return {
    item_slugs: allItems.slice(0, 6),
    crest_slug: crestSlug,
    eternal_slug: eternalSlug,
    win_rate: coreWinRate,
    match_count: coreMatchCount,
    scraped_at: new Date().toISOString(),
  }
}

// ─── Main sync ────────────────────────────────────────────────────────────────

async function syncPopularBuilds() {
  console.log('📊 Starting popular builds sync from pred.gg...\n')

  const db = getFirestore()

  // Get all hero slugs from Firestore
  const heroesSnap = await db.collection('heroes').get()
  const heroSlugs: string[] = heroesSnap.docs.map(doc => doc.id)

  console.log(`Found ${heroSlugs.length} heroes in Firestore\n`)

  // Also get all known item slugs for validation
  const itemsSnap = await db.collection('items').get()
  const knownItemSlugs = new Set(itemsSnap.docs.map(doc => doc.id))

  let synced = 0
  let failed = 0

  for (const slug of heroSlugs) {
    try {
      const build = await scrapeHeroBuild(slug)

      if (build) {
        // Validate item slugs against known items
        const unknownItems = build.item_slugs.filter(s => !knownItemSlugs.has(s))
        if (unknownItems.length > 0) {
          console.warn(`  ⚠ Unknown item slugs for ${slug}: ${unknownItems.join(', ')}`)
        }

        // Merge into hero document
        await db.collection('heroes').doc(slug).update({
          popular_build: build,
        })

        const itemNames = build.item_slugs.join(', ')
        console.log(`  ✓ ${slug}: [${itemNames}] | Crest: ${build.crest_slug} | Eternal: ${build.eternal_slug} | WR: ${build.win_rate}% (${build.match_count} matches)`)
        synced++
      } else {
        failed++
      }
    } catch (err) {
      console.warn(`  ⚠ Failed to process ${slug}:`, err)
      failed++
    }

    // Rate limit
    await new Promise(r => setTimeout(r, DELAY_MS))
  }

  console.log(`\n✅ Popular builds sync complete.`)
  console.log(`   Synced: ${synced} | Failed: ${failed} | Total: ${heroSlugs.length}`)
}

syncPopularBuilds().catch((err) => {
  console.error('❌ Popular builds sync failed:', err)
  process.exit(1)
})
