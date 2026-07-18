/**
 * Hero Statistics Sync Script
 *
 * Fetches aggregated win/pick rate data from Omeda.city dashboard endpoint.
 * Stores per-hero statistics keyed by time frame.
 *
 * Run: npm run sync:stats
 * Runs automatically every 12h via Cloud Functions cron.
 */
import fetch from 'node-fetch'
import { getFirestore } from './firebase-admin.js'

const OMEDA_BASE = 'https://omeda.city'

const TIME_FRAMES = ['1W', '1M'] as const
const GAME_MODES = ['ranked', 'normal'] as const

interface HeroStat {
  hero_id: number | string
  wins: number
  losses: number
  win_rate: number
  pick_rate?: number
  ban_rate?: number
  games_played?: number
  [key: string]: unknown
}

async function syncHeroStatistics() {
  console.log('📊 Starting hero statistics sync...\n')

  const db = getFirestore()
  const timestamp = new Date().toISOString()
  const dateKey = timestamp.slice(0, 10) // YYYY-MM-DD

  for (const timeFrame of TIME_FRAMES) {
    for (const gameMode of GAME_MODES) {
      console.log(`  Fetching: time_frame=${timeFrame} game_mode=${gameMode}`)

      const params = new URLSearchParams({
        time_frame: timeFrame,
        game_mode: gameMode,
      })

      const url = `${OMEDA_BASE}/dashboard/hero_statistics.json?${params.toString()}`

      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'PredecessorLabs/1.0' },
        })

        if (!res.ok) {
          console.warn(`  ⚠ ${res.status} for ${timeFrame}/${gameMode}`)
          continue
        }

        const data = await res.json() as any

        const stats = Array.isArray(data) ? data : (data.hero_statistics || data.data || [])

        const docId = `${dateKey}_${timeFrame}_${gameMode}`
        await db.collection('hero_statistics').doc(docId).set({
          time_frame: timeFrame,
          game_mode: gameMode,
          stats,
          fetched_at: timestamp,
        })

        console.log(`  ✓ Stored ${stats.length} hero stats for ${timeFrame}/${gameMode}`)
      } catch (err) {
        console.warn(`  ⚠ Failed for ${timeFrame}/${gameMode}:`, err)
      }

      await new Promise((r) => setTimeout(r, 300))
    }
  }

  console.log('\n✅ Hero statistics sync complete.')
}

syncHeroStatistics().catch((err) => {
  console.error('❌ Hero statistics sync failed:', err)
  process.exit(1)
})
