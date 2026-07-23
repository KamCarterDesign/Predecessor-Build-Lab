import type { NextApiRequest, NextApiResponse } from 'next'
import { getFirestore } from '@/lib/firebase-admin'

const DEFAULT_SETTINGS = {
  featuredPostIds: [],
  customCtaText: 'SAVE BUILD FOR LATER',
  customCtaUrl: '',
  featuredVideos: [
    {
      id: 'vid-1',
      title: 'TwinBlast 1.0 Itemization & Max DPS Guide',
      videoId: '5qap5aO4i9A',
      channelTitle: 'Predecessor Hub'
    },
    {
      id: 'vid-2',
      title: 'V0.18 Meta Analysis: Midlane Dominance',
      videoId: 'dQw4w9WgXcQ',
      channelTitle: 'Meta Analyst'
    },
    {
      id: 'vid-3',
      title: 'The Invisible Menace: Kallari Gank Routes',
      videoId: 'L_LUpnjgPso',
      channelTitle: 'Jungle Academy'
    }
  ]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = getFirestore()
    const docRef = db.collection('site_config').doc('home_settings')

    if (req.method === 'GET') {
      const docSnap = await docRef.get()
      if (!docSnap.exists) {
        return res.status(200).json({ success: true, settings: DEFAULT_SETTINGS })
      }
      return res.status(200).json({ success: true, settings: { ...DEFAULT_SETTINGS, ...docSnap.data() } })
    }

    if (req.method === 'POST') {
      const { settings } = req.body
      if (!settings) {
        return res.status(400).json({ error: 'Missing settings object' })
      }

      await docRef.set({
        ...settings,
        updatedAt: new Date().toISOString()
      }, { merge: true })

      return res.status(200).json({ success: true, message: 'Home settings saved successfully' })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Error in /api/home/settings:', error)
    return res.status(500).json({ success: false, error: error.message || String(error) })
  }
}
