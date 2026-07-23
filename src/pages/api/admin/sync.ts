import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyAdminToken } from '@/lib/admin-auth'
import { exec } from 'child_process'
import util from 'util'

const execPromise = util.promisify(exec)

/** Mapping of action names to their corresponding npm scripts */
const SYNC_ACTIONS: Record<string, string> = {
  sync_heroes: 'npm run sync:heroes',
  sync_items: 'npm run sync:items',
  sync_eternals: 'npm run sync:eternals',
  sync_matches: 'npm run sync:matches',
  sync_feed: 'npm run sync:feed',
  sync_patches: 'npm run sync:patches',
  sync_stats: 'npm run sync:stats',
  compute_synergy: 'npm run compute:synergy',
  compute_meta: 'npm run compute:meta',
  compute_narrative: 'npm run compute:narrative',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Require admin authentication
  try {
    await verifyAdminToken(req)
  } catch (err: any) {
    const status = err.statusCode || 401
    return res.status(status).json({ error: err.message })
  }

  const { action } = req.body
  const command = SYNC_ACTIONS[action]

  if (!command) {
    return res.status(400).json({ error: `Invalid action: ${action}` })
  }

  try {
    const { stdout } = await execPromise(command)
    return res.status(200).json({ success: true, output: stdout })
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || String(error) })
  }
}
