import type { NextApiRequest, NextApiResponse } from 'next'
import { getFirestore } from '@/lib/firebase-admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { source = 'all', limit = '20', lastTimestamp } = req.query

  try {
    const db = getFirestore()
    let query: any = db.collection('feed_items').orderBy('timestamp', 'desc')

    if (source !== 'all') {
      query = query.where('source', '==', source)
    }

    if (lastTimestamp) {
      query = query.startAfter(lastTimestamp as string)
    }

    const parsedLimit = parseInt(limit as string, 10)
    query = query.limit(parsedLimit)

    const snap = await query.get()
    const items = snap.docs.map((doc: any) => doc.data())

    return res.status(200).json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching feed items:', error)
    return res.status(500).json({ success: false, error: error.message || String(error) })
  }
}
