/**
 * Match Data Sync Script
 *
 * Cursor-paginated ingestion of match data from Omeda.city.
 * Only fetches matches newer than the last stored cursor.
 * Stores raw match data in Firestore /matches/{matchId}.
 *
 * Run: npm run sync:matches
 * Runs automatically every 12h via Cloud Functions cron.
 */
import fetch from 'node-fetch'
import { getFirestore } from './firebase-admin.js'

const OMEDA_BASE = 'https://omeda.city'
const PER_PAGE = 100 // max allowed
const CURSOR_DOC = 'sync_state/match_cursor'

interface OmedaMatch {
  id: string | number
  [key: string]: unknown
}

interface MatchesResponse {
  data?: OmedaMatch[]
  meta?: {
    next_cursor?: string
    has_more?: boolean
  }
  // Some responses return array directly
  [key: string]: unknown
}

async function getLastCursor(db: FirebaseFirestore.Firestore): Promise<string | null> {
  const doc = await db.doc(CURSOR_DOC).get()
  return doc.exists ? (doc.data()?.cursor as string) ?? null : null
}

async function saveLastCursor(db: FirebaseFirestore.Firestore, cursor: string): Promise<void> {
  await db.doc(CURSOR_DOC).set({ cursor, updated_at: new Date().toISOString() }, { merge: true })
}

async function syncMatches() {
  console.log('🎮 Starting match data sync from Omeda.city...\n')

  const db = getFirestore()
  const lastCursor = await getLastCursor(db)

  console.log(lastCursor ? `  Resuming from cursor: ${lastCursor}` : '  Starting fresh (no prior cursor)')

  let cursor: string | null = lastCursor
  let totalIngested = 0
  let page = 0
  let hasMore = true
  const MAX_PAGES = 5

  while (hasMore && page < MAX_PAGES) {
    page++

    const params = new URLSearchParams({ per_page: String(PER_PAGE) })
    if (cursor) params.append('cursor', cursor)

    const url = `${OMEDA_BASE}/matches.json?${params.toString()}`
    console.log(`  Fetching page ${page}: ${url}`)

    const res = await fetch(url, {
      headers: { 'User-Agent': 'PredecessorLabs/1.0' },
    })

    if (!res.ok) {
      console.error(`  ✗ Failed to fetch matches: ${res.status} ${res.statusText}`)
      break
    }

    const body = await res.json() as MatchesResponse

    // Handle both array and paginated object responses
    let matches: OmedaMatch[] = []
    let nextCursor: string | undefined

    if (Array.isArray(body)) {
      matches = body as OmedaMatch[]
      hasMore = matches.length === PER_PAGE
    } else if (body.data) {
      matches = body.data
      nextCursor = body.meta?.next_cursor
      hasMore = body.meta?.has_more ?? false
    } else if (body.matches && Array.isArray(body.matches)) {
      matches = body.matches
      nextCursor = body.cursor as string | undefined
      hasMore = matches.length === PER_PAGE && !!nextCursor
    } else {
      console.warn('  ⚠ Unexpected response shape:', Object.keys(body))
      break
    }

    if (matches.length === 0) {
      console.log('  No new matches found.')
      break
    }

    // Write batch to Firestore
    const batchSize = 400
    for (let i = 0; i < matches.length; i += batchSize) {
      const chunk = matches.slice(i, i + batchSize)
      const batch = db.batch()

      for (const match of chunk) {
        const matchId = String(match.id)
        const docRef = db.collection('matches').doc(matchId)
        batch.set(docRef, {
          ...match,
          ingested_at: new Date().toISOString(),
        }, { merge: false })
      }

      await batch.commit()
    }

    totalIngested += matches.length
    console.log(`  ✓ Page ${page}: ${matches.length} matches ingested (total: ${totalIngested})`)

    // Advance cursor
    if (nextCursor) {
      cursor = nextCursor
    } else if (matches.length > 0 && !hasMore) {
      // If no explicit cursor, we've reached the end
      break
    }

    // Rate limit protection
    await new Promise((r) => setTimeout(r, 250))
  }

  // Save the latest cursor for next run
  if (cursor && cursor !== lastCursor) {
    await saveLastCursor(db, cursor)
    console.log(`\n  Cursor saved: ${cursor}`)
  }

  console.log(`\n✅ Match sync complete. Total ingested this run: ${totalIngested}`)
}

syncMatches().catch((err) => {
  console.error('❌ Match sync failed:', err)
  process.exit(1)
})
