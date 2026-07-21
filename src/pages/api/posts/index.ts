import type { NextApiRequest, NextApiResponse } from 'next'
import { getFirestore } from '@/lib/firebase-admin'

export interface AIPost {
  id: string
  title: string
  slug: string
  summary: string
  content: string
  category: 'gameplay' | 'hero_guide' | 'item_overview' | 'meta_analysis'
  tags: string[]
  heroId?: string
  itemId?: string
  eternalId?: string
  status: 'pending' | 'approved' | 'rejected'
  author: string
  seoKeywords?: string[]
  createdAt: string
  updatedAt?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { category, tag, heroId, itemId, limit = '50' } = req.query

  try {
    const db = getFirestore()
    let query: any = db.collection('ai_posts').where('status', '==', 'approved')

    if (category && typeof category === 'string' && category !== 'all') {
      query = query.where('category', '==', category)
    }

    if (heroId && typeof heroId === 'string') {
      query = query.where('heroId', '==', heroId)
    }

    if (itemId && typeof itemId === 'string') {
      query = query.where('itemId', '==', itemId)
    }

    const parsedLimit = parseInt(limit as string, 10) || 50
    query = query.limit(parsedLimit)

    const snap = await query.get()
    let posts: AIPost[] = snap.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // If tag filter is provided and not heroId/itemId direct filter
    if (tag && typeof tag === 'string') {
      const lowerTag = tag.toLowerCase()
      posts = posts.filter(
        (p) =>
          p.tags?.some((t) => t.toLowerCase().includes(lowerTag)) ||
          p.heroId?.toLowerCase() === lowerTag ||
          p.itemId?.toLowerCase() === lowerTag
      )
    }

    // Sort by createdAt descending
    posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return res.status(200).json({ success: true, posts })
  } catch (error: any) {
    console.error('Error fetching AI posts:', error)
    return res.status(500).json({ success: false, error: error.message || String(error) })
  }
}
