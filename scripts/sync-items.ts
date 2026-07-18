/**
 * Items Sync Script
 *
 * Fetches all items from Omeda.city API → derives tier → uploads to Firestore.
 * Downloads all item image assets to Firebase Storage.
 *
 * Tier derivation:
 *   Tier 1: price === total_price AND requirements is empty
 *   Tier 2: has requirements AND has build_paths
 *   Tier 3 (final): build_paths is empty or null
 *
 * Run: npm run sync:items
 */
import fetch from 'node-fetch'
import { getFirestore } from './firebase-admin.js'
import { downloadAndUploadAsset } from './asset-pipeline.js'

const OMEDA_BASE = 'https://omeda.city'

// ─── Types ───────────────────────────────────────────────────────────────────

interface OmedaItemEffect {
  name: string
  active: boolean
  condition: string | null
  cooldown: number | null
  menu_description: string
}

interface OmedaItem {
  id: number
  game_id: number
  name: string
  display_name: string
  slug: string
  image: string
  price: number
  total_price: number
  slot_type: string
  rarity: string
  aggression_type: string | null
  hero_class: string | null
  stats: Record<string, number>
  effects: OmedaItemEffect[]
  requirements: string[]
  build_paths: string[]
}

// ─── Tier derivation ──────────────────────────────────────────────────────────

function deriveTier(item: OmedaItem): 1 | 2 | 3 {
  const hasRequirements = Array.isArray(item.requirements) && item.requirements.length > 0
  const hasBuildPaths = Array.isArray(item.build_paths) && item.build_paths.length > 0

  if (!hasRequirements) return 1
  if (hasRequirements && hasBuildPaths) return 2
  return 3 // terminal item (no build paths = nothing builds from it)
}

function isFinalItem(item: OmedaItem): boolean {
  return deriveTier(item) === 3
}

function isFinalCrest(item: OmedaItem): boolean {
  return item.slot_type === 'Crest' && item.rarity === 'Legendary'
}

// ─── Main sync ────────────────────────────────────────────────────────────────

async function syncItems() {
  console.log('⚔️  Starting items sync from Omeda.city...\n')

  const res = await fetch(`${OMEDA_BASE}/items.json`)
  if (!res.ok) throw new Error(`Failed to fetch items: ${res.status}`)

  const items = (await res.json()) as OmedaItem[]
  console.log(`Found ${items.length} items\n`)

  const db = getFirestore()

  // Process in batches of 400 (Firestore batch limit is 500)
  const batchSize = 400
  let processed = 0
  let tier1 = 0, tier2 = 0, tier3 = 0

  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize)
    const batch = db.batch()

    for (const item of chunk) {
      console.log(`Processing: ${item.display_name} (${item.slug})`)

      // ── Download item icon
      let imageUrl = ''
      try {
        const hash = item.image?.replace('/assets/', '').replace('.webp', '')
        if (hash) {
          const asset = await downloadAndUploadAsset(hash, `items/${item.slug}.webp`)
          imageUrl = asset.firebaseUrl
        }
      } catch (err) {
        console.warn(`  ⚠ Failed to upload item image for ${item.slug}:`, err)
        imageUrl = `${OMEDA_BASE}${item.image}`
      }

      const tier = deriveTier(item)
      if (tier === 1) tier1++
      else if (tier === 2) tier2++
      else tier3++

      const itemDoc = {
        id: item.id,
        game_id: item.game_id,
        name: item.name,
        display_name: item.display_name,
        slug: item.slug,
        image_url: imageUrl,
        price: item.price,
        total_price: item.total_price,
        tier,
        is_final_item: isFinalItem(item),
        is_final_crest: isFinalCrest(item),
        slot_type: item.slot_type,
        rarity: item.rarity,
        aggression_type: item.aggression_type || null,
        hero_class: item.hero_class || null,
        stats: item.stats || {},
        effects: (item.effects || []).map((e) => ({
          name: e.name,
          active: e.active,
          condition: e.condition || null,
          cooldown: e.cooldown || null,
          menu_description: e.menu_description || '',
        })),
        requirements: item.requirements || [],
        build_paths: item.build_paths || [],
        last_updated: new Date().toISOString(),
        patch_version: 'latest',
      }

      const docRef = db.collection('items').doc(item.slug)
      batch.set(docRef, itemDoc, { merge: true })
      processed++
    }

    console.log(`\n💾 Committing batch ${Math.floor(i / batchSize) + 1}...`)
    await batch.commit()
  }

  console.log(`\n✅ Item sync complete.`)
  console.log(`   Total: ${processed} | Tier 1: ${tier1} | Tier 2: ${tier2} | Tier 3 (final): ${tier3}`)
}

syncItems().catch((err) => {
  console.error('❌ Item sync failed:', err)
  process.exit(1)
})
