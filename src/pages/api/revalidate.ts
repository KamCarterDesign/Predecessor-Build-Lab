import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyAdminToken } from '@/lib/admin-auth'

/**
 * On-Demand Revalidation endpoint.
 * Triggers static page regeneration when game data changes (e.g., after a patch sync).
 *
 * Usage:
 *   POST /api/revalidate
 *   Headers: Authorization: Bearer <admin-token>
 *   Body: { "paths": ["/"] }
 *
 * Or via secret key (for use in sync scripts):
 *   POST /api/revalidate?secret=<REVALIDATION_SECRET>
 *   Body: { "paths": ["/"] }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Allow authentication via either admin token or a shared secret key
  const secretKey = req.query.secret || req.headers['x-revalidation-secret']
  const expectedSecret = process.env.REVALIDATION_SECRET

  if (expectedSecret && secretKey === expectedSecret) {
    // Authenticated via secret key (for sync scripts)
  } else {
    // Fall back to admin token verification
    try {
      await verifyAdminToken(req)
    } catch (err: any) {
      return res.status(err.statusCode || 401).json({ error: err.message })
    }
  }

  const { paths = ['/'] } = req.body

  try {
    const revalidated: string[] = []

    for (const path of paths) {
      if (typeof path === 'string' && path.startsWith('/')) {
        await res.revalidate(path)
        revalidated.push(path)
      }
    }

    return res.status(200).json({
      success: true,
      revalidated,
      message: `Successfully revalidated ${revalidated.length} path(s).`,
    })
  } catch (error: any) {
    console.error('Revalidation error:', error)
    return res.status(500).json({ error: error.message || 'Revalidation failed' })
  }
}
