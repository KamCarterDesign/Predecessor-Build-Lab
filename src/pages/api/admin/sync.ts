import type { NextApiRequest, NextApiResponse } from 'next'
import { getFirestore } from '@/lib/firebase-admin'
import { exec } from 'child_process'
import util from 'util'

const execPromise = util.promisify(exec)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(450).json({ error: 'Method not allowed' })
  }

  const { action } = req.body

  try {
    let output = ''
    switch (action) {
      case 'sync_heroes':
        const { stdout: sh } = await execPromise('npm run sync:heroes')
        output = sh
        break
      case 'sync_items':
        const { stdout: si } = await execPromise('npm run sync:items')
        output = si
        break
      case 'sync_eternals':
        const { stdout: se } = await execPromise('npm run sync:eternals')
        output = se
        break
      case 'sync_matches':
        const { stdout: sm } = await execPromise('npm run sync:matches')
        output = sm
        break
      case 'sync_feed':
        const { stdout: sf } = await execPromise('npm run sync:feed')
        output = sf
        break
      case 'sync_stats':
        const { stdout: ss } = await execPromise('npm run sync:stats')
        output = ss
        break
      case 'compute_synergy':
        const { stdout: cs } = await execPromise('npm run compute:synergy')
        output = cs
        break
      case 'compute_meta':
        const { stdout: cm } = await execPromise('npm run compute:meta')
        output = cm
        break
      case 'compute_narrative':
        const { stdout: cn } = await execPromise('npm run compute:narrative')
        output = cn
        break
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }

    return res.status(200).json({ success: true, output })
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || String(error) })
  }
}
