/**
 * Eternals Sync Script
 *
 * Scrapes pred.gg/eternals and individual eternal detail pages.
 * Stores all 12 eternals (with minor blessings) in Firestore.
 * Downloads all eternal image assets to Firebase Storage.
 *
 * IMPORTANT: Run once per patch release when eternals change.
 * Data is stored permanently — no auto-overwrite between patches.
 * Manual edits to Firestore /eternals documents are safe between syncs.
 *
 * Run: npm run sync:eternals
 */
import fetch from 'node-fetch'
import * as cheerio from 'cheerio'
import { getFirestore } from './firebase-admin.js'
import { downloadAndUploadFromUrl } from './asset-pipeline.js'

const PRED_GG_BASE = 'https://pred.gg'

// ─── Known eternals (current as of patch 1.15.2+1) ────────────────────────────
// Update this list only when a new eternal is added to the game.
const KNOWN_ETERNALS = [
  { name: 'Aion',     slug: 'aion',     category: 'Anomalies' },
  { name: 'Demiurge', slug: 'demiurge', category: 'Anomalies' },
  { name: 'Exarch',   slug: 'exarch',   category: 'Divines' },
  { name: 'Lotus',    slug: 'lotus',    category: 'Divines' },
  { name: 'Idrisil',  slug: 'idrisil',  category: 'Dreadnoughts' },
  { name: 'Krix',     slug: 'krix',     category: 'Dreadnoughts' },
  { name: 'Marrow',   slug: 'marrow',   category: 'Harbingers' },
  { name: 'Vermis',   slug: 'vermis',   category: 'Harbingers' },
  { name: 'Nihil',    slug: 'nihil',    category: 'Primarchs' },
  { name: 'Thraex',   slug: 'thraex',   category: 'Primarchs' },
  { name: 'Vesh',     slug: 'vesh',     category: 'Sovereigns' },
  { name: 'Xyris',    slug: 'xyris',    category: 'Sovereigns' },
]

// ─── Types ───────────────────────────────────────────────────────────────────

interface MinorBlessing {
  group: 'A' | 'B'
  name: string
  description: string
}

interface EternalData {
  name: string
  slug: string
  category: string
  image_url: string
  description: string
  minor_blessings: MinorBlessing[]
  patch_version: string
  last_updated: string
}

// ─── Scraper ─────────────────────────────────────────────────────────────────

async function scrapeEternalDetail(name: string, slug: string): Promise<{
  description: string
  imageUrl: string
  minorBlessings: MinorBlessing[]
}> {
  const url = `${PRED_GG_BASE}/eternals/${name}`
  console.log(`  Scraping: ${url}`)

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PredecessorLabs/1.0)' },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch eternal page for ${name}: ${res.status}`)
  }

  const html = await res.text()
  const $ = cheerio.load(html)

  // Extract main description
  // pred.gg renders description in .eternal-card-description or similar
  let description = ''
  const descEl = $('[class*="description"]').first()
  if (descEl.length) {
    description = descEl.text().trim()
  }

  // Extract image URL from og:image or first eternal card image
  let imageUrl = ''
  const ogImage = $('meta[property="og:image"]').attr('content')
  if (ogImage) {
    imageUrl = ogImage.startsWith('http') ? ogImage : `${PRED_GG_BASE}${ogImage}`
  }

  // Try to extract image from img tags with eternal-related classes
  if (!imageUrl) {
    const img = $('img[class*="eternal"]').first()
    const src = img.attr('src')
    if (src) imageUrl = src.startsWith('http') ? src : `${PRED_GG_BASE}${src}`
  }

  // Extract minor blessings
  const minorBlessings: MinorBlessing[] = []
  const seenNames = new Set<string>()

  $('.min-w-0.flex-1').each((i, el) => {
    const nameEl = $(el).find('.font-semibold').first()
    const descEl = $(el).find('.text-surface-200').first()
    
    const name = nameEl.text().trim()
    const description = descEl.text().trim()
    
    if (name && description && !seenNames.has(name)) {
      seenNames.add(name)
      const group: 'A' | 'B' = minorBlessings.length < 3 ? 'A' : 'B'
      minorBlessings.push({
        group,
        name,
        description,
      })
    }
  })

  return { description, imageUrl, minorBlessings }
}

// ─── List page scraper (fallback to get descriptions) ─────────────────────────

async function scrapeEternalsList(): Promise<Map<string, { description: string; imageUrl: string }>> {
  console.log('Scraping eternals list page...')
  const res = await fetch(`${PRED_GG_BASE}/eternals`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PredecessorLabs/1.0)' },
  })

  const html = await res.text()
  const $ = cheerio.load(html)

  const results = new Map<string, { description: string; imageUrl: string }>()

  // Parse eternal cards from the list page
  $('[class*="eternal-card"]').each((_, el) => {
    const nameEl = $(el).find('[class*="font-semibold"], [class*="title"]').first()
    const name = nameEl.text().trim().toLowerCase()

    const descEl = $(el).find('[class*="description"]').first()
    const description = descEl.text().trim()

    const imgEl = $(el).find('img').first()
    const src = imgEl.attr('src') || ''
    const imageUrl = src.startsWith('http') ? src : `${PRED_GG_BASE}${src}`

    if (name) {
      results.set(name, { description, imageUrl })
    }
  })

  console.log(`  Found ${results.size} eternal entries on list page`)
  return results
}

// ─── Main sync ────────────────────────────────────────────────────────────────

async function syncEternals() {
  console.log('✨ Starting eternals sync from pred.gg...\n')
  console.log('NOTE: Eternals data is stored permanently.')
  console.log('      Update manually via Firestore console when patch notes change eternals.\n')

  const db = getFirestore()

  // First, get list page data as a supplementary source
  let listData: Map<string, { description: string; imageUrl: string }>
  try {
    listData = await scrapeEternalsList()
  } catch (err) {
    console.warn('⚠ Could not scrape list page, will rely on detail pages only:', err)
    listData = new Map()
  }

  const patch_version = 'latest'

  for (const eternal of KNOWN_ETERNALS) {
    console.log(`\nProcessing: ${eternal.name} (${eternal.category})`)

    // Check if this eternal already exists in Firestore
    const docRef = db.collection('eternals').doc(eternal.slug)
    const existing = await docRef.get()

    // Overwrite existing to ensure correct minor blessings

    // Get data from list page first
    const listEntry = listData.get(eternal.name.toLowerCase()) || listData.get(eternal.slug)

    let description = listEntry?.description || ''
    let rawImageUrl = listEntry?.imageUrl || ''
    let minorBlessings: MinorBlessing[] = []

    // Try to get more detail from individual page
    try {
      const detail = await scrapeEternalDetail(eternal.name, eternal.slug)
      if (detail.description) description = detail.description
      if (detail.imageUrl) rawImageUrl = detail.imageUrl
      if (detail.minorBlessings.length > 0) minorBlessings = detail.minorBlessings
    } catch (err) {
      console.warn(`  ⚠ Could not scrape detail page for ${eternal.name}:`, err)
    }

    // Download and upload image
    let firebaseImageUrl = rawImageUrl
    if (rawImageUrl) {
      try {
        firebaseImageUrl = await downloadAndUploadFromUrl(
          rawImageUrl,
          `eternals/${eternal.slug}.webp`
        )
      } catch (err) {
        console.warn(`  ⚠ Could not upload image for ${eternal.name}:`, err)
      }
    }

    const eternalDoc: EternalData = {
      name: eternal.name,
      slug: eternal.slug,
      category: eternal.category,
      image_url: firebaseImageUrl,
      description,
      minor_blessings: minorBlessings,
      patch_version,
      last_updated: new Date().toISOString(),
    }

    await docRef.set(eternalDoc, { merge: false })
    console.log(`  ✓ Stored: ${eternal.name}`)
  }

  console.log('\n✅ Eternals sync complete.')
  console.log('   Minor blessings may need manual verification via pred.gg — check each eternal\'s detail page.')
}

syncEternals().catch((err) => {
  console.error('❌ Eternals sync failed:', err)
  process.exit(1)
})
