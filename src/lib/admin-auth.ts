import type { NextApiRequest } from 'next'
import { getAuth } from 'firebase-admin/auth'
import { getFirebaseAdmin } from './firebase-admin'

/**
 * Verifies that an incoming API request carries a valid Firebase ID Token
 * with the `admin` custom claim set to `true`.
 *
 * Usage in API routes:
 * ```ts
 * const decoded = await verifyAdminToken(req)
 * // decoded.uid, decoded.email, etc. are available
 * ```
 *
 * Throws an error with a descriptive message if:
 * - The Authorization header is missing or malformed
 * - The token is invalid or expired
 * - The token does not carry `admin: true`
 */
export async function verifyAdminToken(req: NextApiRequest) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Unauthorized: Missing or malformed Authorization header')
    ;(error as any).statusCode = 401
    throw error
  }

  const token = authHeader.split('Bearer ')[1]
  if (!token) {
    const error = new Error('Unauthorized: Empty token')
    ;(error as any).statusCode = 401
    throw error
  }

  // Ensure Firebase Admin is initialized
  getFirebaseAdmin()

  try {
    const decodedToken = await getAuth().verifyIdToken(token)

    if (!decodedToken.admin) {
      const error = new Error('Forbidden: Admin role required')
      ;(error as any).statusCode = 403
      throw error
    }

    return decodedToken
  } catch (err: any) {
    if (err.statusCode) throw err
    const error = new Error(`Unauthorized: ${err.message || 'Invalid token'}`)
    ;(error as any).statusCode = 401
    throw error
  }
}
