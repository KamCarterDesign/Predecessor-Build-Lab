import type { NextApiRequest, NextApiResponse } from 'next'
import { getFirestore } from '@/lib/firebase-admin'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://predecessorbuildlab.com'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = getFirestore()

    // Fetch approved AI posts for sitemap
    const postsSnap = await db.collection('ai_posts')
      .where('status', '==', 'approved')
      .get()

    const posts = postsSnap.docs.map((doc) => ({
      slug: doc.data().slug || doc.id,
      updatedAt: doc.data().updatedAt || doc.data().createdAt || new Date().toISOString(),
    }))

    // Fetch shared builds for sitemap
    const buildsSnap = await db.collection('shared_builds')
      .orderBy('views', 'desc')
      .limit(500)
      .get()

    const builds = buildsSnap.docs.map((doc) => ({
      id: doc.id,
      updatedAt: doc.data().updatedAt || doc.data().createdAt || new Date().toISOString(),
    }))

    // Build XML sitemap
    const urls: Array<{ loc: string; lastmod?: string; changefreq: string; priority: string }> = [
      // Static pages
      { loc: SITE_URL, lastmod: new Date().toISOString(), changefreq: 'daily', priority: '1.0' },

      // AI Posts / Guides
      ...posts.map((post) => ({
        loc: `${SITE_URL}/posts/${post.slug}`,
        lastmod: post.updatedAt,
        changefreq: 'weekly',
        priority: '0.8',
      })),

      // Shared Builds
      ...builds.map((build) => ({
        loc: `${SITE_URL}/builds/${build.id}`,
        lastmod: build.updatedAt,
        changefreq: 'monthly',
        priority: '0.6',
      })),
    ]

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>${url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : ''}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

    res.setHeader('Content-Type', 'application/xml')
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).send(xml)
  } catch (error: any) {
    console.error('Sitemap generation error:', error)
    return res.status(500).json({ error: 'Failed to generate sitemap' })
  }
}
