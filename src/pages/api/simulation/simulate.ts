import type { NextApiRequest, NextApiResponse } from 'next'
import { getFirestore } from '@/lib/firebase-admin'
import { calculateBuildStats, HeroDoc, ItemDoc, EternalDoc } from '@/lib/simulation/engine'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { heroSlug, level, itemSlugs, crestSlug, eternalSlug } = req.body

  if (!heroSlug || typeof level !== 'number') {
    return res.status(400).json({ error: 'Missing required parameters: heroSlug, level' })
  }

  try {
    const db = getFirestore()

    // 1. Fetch Hero
    const heroSnap = await db.collection('heroes').doc(heroSlug).get()
    if (!heroSnap.exists) {
      return res.status(404).json({ error: `Hero not found: ${heroSlug}` })
    }
    const hero = heroSnap.data() as HeroDoc

    // 2. Fetch Items
    const items: ItemDoc[] = []
    if (Array.isArray(itemSlugs) && itemSlugs.length > 0) {
      const itemSnaps = await Promise.all(
        itemSlugs.map((slug) => db.collection('items').doc(slug).get())
      )
      for (const snap of itemSnaps) {
        if (snap.exists) {
          items.push(snap.data() as ItemDoc)
        }
      }
    }

    // 3. Fetch Crest
    let crest: ItemDoc | null = null
    if (crestSlug) {
      const crestSnap = await db.collection('items').doc(crestSlug).get()
      if (crestSnap.exists) {
        crest = crestSnap.data() as ItemDoc
      }
    }

    // 4. Fetch Eternal
    let eternal: EternalDoc | null = null
    if (eternalSlug) {
      const eternalSnap = await db.collection('eternals').doc(eternalSlug).get()
      if (eternalSnap.exists) {
        eternal = eternalSnap.data() as EternalDoc
      }
    }

    // 5. Fetch Synergy scores from current meta snapshot if available
    const synergies: Record<string, { avg_win_rate: number; sample_size: number }> = {}
    try {
      const metaSnaps = await db.collection('meta_snapshots').orderBy('computed_at', 'desc').limit(1).get()
      if (!metaSnaps.empty) {
        const metaData = metaSnaps.docs[0].data()
        if (metaData.item_synergies) {
          Object.assign(synergies, metaData.item_synergies)
        }
      }
    } catch (e) {
      console.warn('Could not load meta synergies for confidence rating:', e)
    }

    // 6. Run simulation engine
    const analysis = calculateBuildStats(hero, level, items, crest, eternal, {
      synergies,
    })

    return res.status(200).json({ success: true, analysis })
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || String(error) })
  }
}
