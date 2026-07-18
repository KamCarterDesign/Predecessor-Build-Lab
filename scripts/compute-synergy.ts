/**
 * Hero-Item Synergy Computation Script
 *
 * Reads ingested match data from Firestore /matches.
 * Computes win rate per (heroSlug, itemSlug) pair.
 * Stores synergy scores in /meta_snapshots/{date}.item_synergies.
 *
 * Run: npm run compute:synergy
 */
import { getFirestore } from './firebase-admin.js'

interface MatchParticipant {
  hero_id?: string | number
  hero_slug?: string
  team?: string
  inventory_data?: number[] | null
  [key: string]: any
}

interface RawMatch {
  id: string
  ingested_at: string
  winning_team?: string
  players?: MatchParticipant[]
  participants?: MatchParticipant[]
  [key: string]: unknown
}

interface SynergyAccumulator {
  wins: number
  total: number
}

type SynergyMap = Map<string, SynergyAccumulator>

function isWin(participant: MatchParticipant, match: RawMatch): boolean {
  if (typeof participant.won === 'boolean') return participant.won
  if (participant.result === 'win' || participant.result === 'victory') return true
  if (participant.team && match.winning_team) {
    return participant.team.toLowerCase() === match.winning_team.toLowerCase()
  }
  return false
}

async function computeSynergy() {
  console.log('🔗 Computing hero-item synergy scores...\n')

  const db = getFirestore()

  // 1. Build a map of game_id -> slug for all items in Firestore
  console.log('Loading items from Firestore for mapping...')
  const itemsSnapshot = await db.collection('items').get()
  const gameIdToSlugMap = new Map<number, string>()
  const idToSlugMap = new Map<number, string>()
  
  for (const doc of itemsSnapshot.docs) {
    const item = doc.data()
    if (item.game_id && item.slug) {
      gameIdToSlugMap.set(Number(item.game_id), item.slug)
    }
    if (item.id && item.slug) {
      idToSlugMap.set(Number(item.id), item.slug)
    }
  }
  console.log(`Loaded ${gameIdToSlugMap.size} item game_id maps.`)

  // 2. Build a map of hero_id -> slug for all heroes in Firestore
  console.log('Loading heroes from Firestore for mapping...')
  const heroesSnapshot = await db.collection('heroes').get()
  const heroIdToSlugMap = new Map<number, string>()
  for (const doc of heroesSnapshot.docs) {
    const hero = doc.data()
    if (hero.id && hero.slug) {
      heroIdToSlugMap.set(Number(hero.id), hero.slug)
    }
  }
  console.log(`Loaded ${heroIdToSlugMap.size} hero maps.`)

  // Helper to resolve hero slug
  const getHeroSlug = (participant: MatchParticipant): string | null => {
    if (participant.hero_slug) return participant.hero_slug
    if (participant.hero_id) {
      const id = Number(participant.hero_id)
      return heroIdToSlugMap.get(id) || String(id)
    }
    return null
  }

  // Helper to resolve item slugs from inventory_data
  const getItemSlugs = (participant: MatchParticipant): string[] => {
    const ids = participant.inventory_data || []
    return ids
      .map((id) => gameIdToSlugMap.get(Number(id)) || idToSlugMap.get(Number(id)) || null)
      .filter((slug): slug is string => !!slug)
  }

  // 3. Load all matches in batches
  const synergyMap: SynergyMap = new Map()
  let matchCount = 0

  const matchesRef = db.collection('matches').orderBy('ingested_at', 'desc').limit(50000)
  const snapshot = await matchesRef.get()

  console.log(`Processing ${snapshot.size} matches...`)

  for (const doc of snapshot.docs) {
    const match = doc.data() as RawMatch
    const participants = match.players || match.participants || []

    for (const participant of participants) {
      const heroSlug = getHeroSlug(participant)
      if (!heroSlug) continue

      const itemSlugs = getItemSlugs(participant)
      const won = isWin(participant, match)

      for (const itemSlug of itemSlugs) {
        const key = `${heroSlug}:${itemSlug}`
        const existing = synergyMap.get(key) || { wins: 0, total: 0 }
        synergyMap.set(key, {
          wins: existing.wins + (won ? 1 : 0),
          total: existing.total + 1,
        })
      }
    }

    matchCount++
  }

  console.log(`Processed ${matchCount} matches. Computing scores for ${synergyMap.size} hero-item pairs...`)

  // Compute synergy scores
  const itemSynergies: Record<string, { win_rate: number; sample_size: number; synergy_score: number }> = {}

  for (const [key, { wins, total }] of synergyMap.entries()) {
    if (total < 2) continue // Skip pairs with very low samples (changed from 5 to 2 to get data for small dev set)
    const win_rate = wins / total
    const synergy_score = win_rate * Math.log(total + 1)
    itemSynergies[key] = {
      win_rate: Math.round(win_rate * 1000) / 10, // e.g. 54.3 (%)
      sample_size: total,
      synergy_score: Math.round(synergy_score * 1000) / 1000,
    }
  }

  // Store in today's meta snapshot
  const dateKey = new Date().toISOString().slice(0, 10)
  const snapshotRef = db.collection('meta_snapshots').doc(dateKey)

  await snapshotRef.set({ item_synergies: itemSynergies, synergy_computed_at: new Date().toISOString() }, { merge: true })

  console.log(`\n✅ Synergy scores computed for ${Object.keys(itemSynergies).length} pairs (min 2 matches).`)
  console.log(`   Stored in meta_snapshots/${dateKey}`)
}

computeSynergy().catch((err) => {
  console.error('❌ Synergy computation failed:', err)
  process.exit(1)
})
