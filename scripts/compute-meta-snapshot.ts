/**
 * Meta Snapshot Computation Script
 *
 * Reads hero_statistics from Firestore, computes deltas from previous snapshot,
 * derives trending heroes, trending items, popular builds, and tier movements.
 * Stores result in /meta_snapshots/{date}.
 *
 * Run: npm run compute:meta
 * Runs automatically every 24h via Cloud Functions cron.
 */
import { getFirestore } from './firebase-admin.js'
import fetch from 'node-fetch'

const OMEDA_BASE = 'https://omeda.city'

interface HeroStatEntry {
  hero_id: string | number
  wins?: number
  losses?: number
  win_rate?: number
  pick_rate?: number
  ban_rate?: number
  games_played?: number
}

interface BuildEntry {
  hero_id?: string | number
  hero_slug?: string
  role?: string
  items?: Array<{ slug?: string; name?: string }>
  [key: string]: unknown
}

async function computeMetaSnapshot() {
  console.log('📈 Computing meta snapshot...\n')

  const db = getFirestore()
  const dateKey = new Date().toISOString().slice(0, 10)

  // ── 1. Fetch current hero statistics
  console.log('Fetching hero statistics...')
  const statsRes = await fetch(
    `${OMEDA_BASE}/dashboard/hero_statistics.json?time_frame=1W&game_mode=ranked`,
    { headers: { 'User-Agent': 'PredecessorLabs/1.0' } }
  )

  let currentStats: HeroStatEntry[] = []
  if (statsRes.ok) {
    const data = await statsRes.json() as any
    currentStats = Array.isArray(data) ? data : (data.hero_statistics || data.data || [])
  }

  // ── 2. Get previous snapshot for delta computation
  const previousDates = await db.collection('meta_snapshots')
    .orderBy('computed_at', 'desc')
    .limit(2)
    .get()

  const previousSnapshot = previousDates.docs.length > 0
    ? previousDates.docs[0].data()
    : null

  const previousWinRates: Record<string, number> = previousSnapshot?.hero_win_rates ?? {}
  const previousPickRates: Record<string, number> = previousSnapshot?.hero_pick_rates ?? {}

  // ── 3. Build current win/pick rate maps
  const heroWinRates: Record<string, number> = {}
  const heroPickRates: Record<string, number> = {}
  const heroBanRates: Record<string, number> = {}

  for (const stat of currentStats) {
    const id = String(stat.hero_id)
    const winRate = stat.win_rate ?? (stat as any).winrate
    const pickRate = stat.pick_rate ?? (stat as any).pickrate
    const banRate = stat.ban_rate ?? (stat as any).banrate
    if (winRate != null) heroWinRates[id] = winRate
    if (pickRate != null) heroPickRates[id] = pickRate
    if (banRate != null) heroBanRates[id] = banRate
  }

  // ── 4. Compute tier movements (rank by win rate)
  const ranked = Object.entries(heroWinRates).sort(([, a], [, b]) => b - a)
  const previousRanked = Object.entries(previousWinRates).sort(([, a], [, b]) => b - a)

  const currentRankMap: Record<string, number> = {}
  ranked.forEach(([id], i) => { currentRankMap[id] = i + 1 })

  const previousRankMap: Record<string, number> = {}
  previousRanked.forEach(([id], i) => { previousRankMap[id] = i + 1 })

  const heroTierMovements: Record<string, { current_rank: number; previous_rank: number; delta: number }> = {}
  for (const [id, rank] of Object.entries(currentRankMap)) {
    const prev = previousRankMap[id] ?? rank
    heroTierMovements[id] = {
      current_rank: rank,
      previous_rank: prev,
      delta: prev - rank, // positive = moved up
    }
  }

  // ── 5. Fetch popular builds
  console.log('Fetching popular builds...')
  const popularBuilds: Record<string, BuildEntry[]> = {}

  try {
    const buildsRes = await fetch(
      `${OMEDA_BASE}/builds.json?filter[order]=popular&per_page=100`,
      { headers: { 'User-Agent': 'PredecessorLabs/1.0' } }
    )

    if (buildsRes.ok) {
      const buildsData = await buildsRes.json() as BuildEntry[] | { data?: BuildEntry[] }
      const builds = Array.isArray(buildsData) ? buildsData : buildsData.data ?? []

      for (const build of builds) {
        const heroId = String(build.hero_id || build.hero_slug || '')
        if (!heroId) continue
        if (!popularBuilds[heroId]) popularBuilds[heroId] = []
        if (popularBuilds[heroId].length < 3) {
          popularBuilds[heroId].push(build)
        }
      }
    }
  } catch (err) {
    console.warn('⚠ Could not fetch popular builds:', err)
  }

  // ── 6. Derive trending items from popular builds delta
  const trendingItems: string[] = []
  
  // Load item maps from Firestore
  console.log('Loading items from Firestore for trending computation...')
  const itemsSnapshot = await db.collection('items').get()
  const itemIdToSlug = new Map<number, string>()
  for (const doc of itemsSnapshot.docs) {
    const item = doc.data()
    if (item.id && item.slug) itemIdToSlug.set(Number(item.id), item.slug)
    if (item.game_id && item.slug) itemIdToSlug.set(Number(item.game_id), item.slug)
  }

  const itemFrequency: Record<string, number> = {}
  for (const heroBuilds of Object.values(popularBuilds)) {
    for (const build of heroBuilds) {
      const itemIds = [
        (build as any).crest_id,
        (build as any).item1_id,
        (build as any).item2_id,
        (build as any).item3_id,
        (build as any).item4_id,
        (build as any).item5_id,
        (build as any).item6_id
      ].filter(Boolean)

      for (const id of itemIds) {
        const slug = itemIdToSlug.get(Number(id))
        if (slug) {
          itemFrequency[slug] = (itemFrequency[slug] ?? 0) + 1
        }
      }
    }
  }
  const sortedItems = Object.entries(itemFrequency).sort(([, a], [, b]) => b - a)
  trendingItems.push(...sortedItems.slice(0, 20).map(([slug]) => slug))

  // ── 7. Write meta snapshot
  const snapshot = {
    hero_win_rates: heroWinRates,
    hero_pick_rates: heroPickRates,
    hero_ban_rates: heroBanRates,
    hero_tier_movements: heroTierMovements,
    popular_builds: popularBuilds,
    trending_items: trendingItems,
    computed_at: new Date().toISOString(),
    patch_version: 'latest',
  }

  await db.collection('meta_snapshots').doc(dateKey).set(snapshot, { merge: true })
  console.log(`\n✅ Meta snapshot stored at meta_snapshots/${dateKey}`)
  console.log(`   Heroes tracked: ${Object.keys(heroWinRates).length}`)
  console.log(`   Popular builds: ${Object.keys(popularBuilds).length} heroes`)
  console.log(`   Trending items: ${trendingItems.length}`)
}

computeMetaSnapshot().catch((err) => {
  console.error('❌ Meta snapshot computation failed:', err)
  process.exit(1)
})
