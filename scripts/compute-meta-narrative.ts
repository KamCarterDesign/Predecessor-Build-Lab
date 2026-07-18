/**
 * Meta Narrative Generation Script
 *
 * Reads the latest meta snapshot, computes deltas from the previous one,
 * and generates human-readable narrative text using a template engine.
 * NO AI/LLM involved — pure statistics + string templates.
 *
 * Narratives are accumulated over time within the same patch window.
 * Stored in /meta_narratives/{patchVersion}.
 *
 * Run: npm run compute:narrative
 * Runs automatically every 24h via Cloud Functions cron.
 */
import { getFirestore } from './firebase-admin.js'

const WIN_RATE_RISE_THRESHOLD = 2.0  // % increase = "rising"
const WIN_RATE_DROP_THRESHOLD = -2.0 // % decrease = "falling"
const PICK_RATE_RISE_THRESHOLD = 1.5

interface MetaSnapshot {
  hero_win_rates: Record<string, number>
  hero_pick_rates: Record<string, number>
  hero_tier_movements: Record<string, { delta: number; current_rank: number; previous_rank: number }>
  trending_items: string[]
  computed_at: string
  patch_version?: string
}

// ─── Template engine ──────────────────────────────────────────────────────────

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? key))
}

const RISING_HERO_TEMPLATES = [
  '{hero} has seen a {delta}% increase in win rate this period, rising to {current_rate}%.',
  '{hero}\'s win rate has climbed {delta}% to {current_rate}%, making them a stronger pick.',
  '{hero} is trending upward with a {current_rate}% win rate, up {delta}% from last snapshot.',
]

const FALLING_HERO_TEMPLATES = [
  '{hero}\'s win rate has dropped {delta}% to {current_rate}%, suggesting reduced effectiveness.',
  '{hero} is underperforming this period, with win rate falling to {current_rate}% ({delta}%).',
]

const TRENDING_ITEM_TEMPLATES = [
  '{item} is appearing more frequently in top builds this period.',
  'Players are increasingly building {item} across multiple roles.',
]

function pickTemplate(templates: string[], index: number): string {
  return templates[index % templates.length]
}

// ─── Main computation ─────────────────────────────────────────────────────────

async function computeMetaNarrative() {
  console.log('📝 Computing meta narrative (stats-driven, no AI)...\n')

  const db = getFirestore()

  // Load the two most recent snapshots
  const snapshots = await db.collection('meta_snapshots')
    .orderBy('computed_at', 'desc')
    .limit(2)
    .get()

  if (snapshots.empty) {
    console.log('No meta snapshots found. Run compute:meta first.')
    return
  }

  const currentSnapshot = snapshots.docs[0].data() as MetaSnapshot
  const previousSnapshot = snapshots.docs.length > 1
    ? snapshots.docs[1].data() as MetaSnapshot
    : null

  const previousWinRates = previousSnapshot?.hero_win_rates ?? {}
  const previousPickRates = previousSnapshot?.hero_pick_rates ?? {}

  const currentWinRates = currentSnapshot.hero_win_rates
  const currentPickRates = currentSnapshot.hero_pick_rates

  const observations: string[] = []
  const risingHeroes: string[] = []
  const fallingHeroes: string[] = []

  let templateIndex = 0

  // ── Hero win rate deltas
  for (const [heroId, currentRate] of Object.entries(currentWinRates)) {
    const previousRate = previousWinRates[heroId] ?? currentRate
    const delta = parseFloat((currentRate - previousRate).toFixed(1))

    if (delta >= WIN_RATE_RISE_THRESHOLD) {
      risingHeroes.push(heroId)
      const text = fill(pickTemplate(RISING_HERO_TEMPLATES, templateIndex++), {
        hero: heroId,
        delta,
        current_rate: currentRate.toFixed(1),
      })
      observations.push(text)
    } else if (delta <= WIN_RATE_DROP_THRESHOLD) {
      fallingHeroes.push(heroId)
      const text = fill(pickTemplate(FALLING_HERO_TEMPLATES, templateIndex++), {
        hero: heroId,
        delta: Math.abs(delta),
        current_rate: currentRate.toFixed(1),
      })
      observations.push(text)
    }
  }

  // ── Pick rate changes
  for (const [heroId, currentRate] of Object.entries(currentPickRates)) {
    const previousRate = previousPickRates[heroId] ?? currentRate
    const delta = parseFloat((currentRate - previousRate).toFixed(1))
    if (delta >= PICK_RATE_RISE_THRESHOLD) {
      observations.push(
        fill('{hero} is being picked {delta}% more frequently than last period.', {
          hero: heroId,
          delta,
        })
      )
    }
  }

  // ── Trending items
  const trendingItems = currentSnapshot.trending_items ?? []
  for (let i = 0; i < Math.min(trendingItems.length, 5); i++) {
    const item = trendingItems[i]
    observations.push(
      fill(pickTemplate(TRENDING_ITEM_TEMPLATES, i), { item })
    )
  }

  // ── Build summary text
  const risingCount = risingHeroes.length
  const fallingCount = fallingHeroes.length

  let summary = 'The current meta shows '
  if (risingCount > 0 && fallingCount > 0) {
    summary += `${risingCount} hero${risingCount !== 1 ? 'es' : ''} rising and ${fallingCount} falling in win rate. `
  } else if (risingCount > 0) {
    summary += `${risingCount} hero${risingCount !== 1 ? 'es' : ''} trending upward. `
  } else if (fallingCount > 0) {
    summary += `${fallingCount} hero${fallingCount !== 1 ? 'es' : ''} trending downward. `
  } else {
    summary += 'relatively stable win rates across all heroes. '
  }

  if (trendingItems.length > 0) {
    summary += `${trendingItems[0]} is among the most picked items this period.`
  }

  // ── Store narrative
  const patchVersion = currentSnapshot.patch_version ?? 'latest'
  const narrativeRef = db.collection('meta_narratives').doc(patchVersion)

  const existingDoc = await narrativeRef.get()
  const existingObservations: string[] = existingDoc.exists
    ? (existingDoc.data()?.observations ?? [])
    : []

  // Merge new observations, avoiding duplicates
  const mergedObservations = [
    ...existingObservations,
    ...observations.filter((o) => !existingObservations.includes(o)),
  ]

  await narrativeRef.set({
    patch_version: patchVersion,
    summary,
    observations: mergedObservations,
    rising_heroes: risingHeroes,
    falling_heroes: fallingHeroes,
    trending_items: trendingItems.slice(0, 10),
    last_updated: new Date().toISOString(),
  }, { merge: true })

  console.log(`✅ Meta narrative updated for patch: ${patchVersion}`)
  console.log(`   Summary: ${summary}`)
  console.log(`   Observations added: ${observations.length}`)
  console.log(`   Total observations stored: ${mergedObservations.length}`)
}

computeMetaNarrative().catch((err) => {
  console.error('❌ Meta narrative computation failed:', err)
  process.exit(1)
})
