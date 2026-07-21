import type { NextApiRequest, NextApiResponse } from 'next'
import { getFirestore } from '@/lib/firebase-admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  // Optional API Key header security check
  const apiKey = req.headers['x-api-key'] || req.query.apiKey
  const expectedKey = process.env.N8N_WEBHOOK_SECRET || 'predecessor_n8n_secret'

  // If secret is explicitly configured, enforce matching key; otherwise accept incoming post
  if (process.env.N8N_WEBHOOK_SECRET && apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid x-api-key header' })
  }

  try {
    const {
      title,
      content,
      summary,
      category = 'gameplay',
      tags = [],
      heroId,
      itemId,
      eternalId,
      author = 'Predecessor AI Content Engine',
      seoKeywords = [],
    } = req.body

    if (!title || !content) {
      return res.status(400).json({
        error: 'Invalid payload. "title" and "content" are required fields.',
        receivedPayload: req.body,
      })
    }

    // Generate SEO friendly slug
    const cleanSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const id = `${cleanSlug}-${Date.now().toString(36)}`

    // Extract snippet if summary not provided
    const postSummary = summary || content.slice(0, 180).replace(/[#*`]/g, '') + '...'

    // Normalized tags array with default taxonomy fallback
    let parsedTags = Array.isArray(tags)
      ? tags
      : typeof tags === 'string'
      ? tags.split(',').map((t: string) => t.trim())
      : []

    if (parsedTags.length === 0) {
      parsedTags = ['Guide', 'Gameplay']
    }

    if (heroId && !parsedTags.some(t => t.toLowerCase() === heroId.toLowerCase())) {
      parsedTags.push(heroId.charAt(0).toUpperCase() + heroId.slice(1))
    }

    const newPostDoc = {
      id,
      title,
      slug: id,
      summary: postSummary,
      content,
      category,
      tags: parsedTags,
      heroId: heroId || null,
      itemId: itemId || null,
      eternalId: eternalId || null,
      status: 'pending', // Auto-queued for Admin approval
      author,
      seoKeywords: Array.isArray(seoKeywords) ? seoKeywords : [],
      createdAt: new Date().toISOString(),
      source: 'n8n_ai_webhook',
    }

    const db = getFirestore()
    await db.collection('ai_posts').doc(id).set(newPostDoc)

    return res.status(201).json({
      success: true,
      message: 'AI Post created successfully and queued for admin review!',
      postId: id,
      status: 'pending',
      reviewUrl: '/admin?tab=ai_posts',
    })
  } catch (error: any) {
    console.error('Error processing n8n webhook post:', error)
    return res.status(500).json({ success: false, error: error.message || String(error) })
  }
}
