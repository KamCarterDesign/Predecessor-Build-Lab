/**
 * One-time script to grant Firebase Admin custom claims to your account.
 *
 * Usage:
 *   npx tsx scripts/set-admin.ts your-email@example.com
 *
 * After running, the user must sign out and back in for the claims to take effect.
 */
import { getAuth } from 'firebase-admin/auth'
import './firebase-admin'

async function makeAdmin(userEmail: string) {
  if (!userEmail) {
    console.error('Usage: npx tsx scripts/set-admin.ts <email>')
    process.exit(1)
  }

  try {
    const user = await getAuth().getUserByEmail(userEmail)
    await getAuth().setCustomUserClaims(user.uid, { admin: true })
    console.log(`✅ Successfully granted Admin role to ${userEmail} (UID: ${user.uid})`)
    console.log('⚠️  The user must sign out and back in for the new claims to take effect.')
  } catch (error: any) {
    console.error(`❌ Failed to set admin claims: ${error.message}`)
    process.exit(1)
  }
}

const email = process.argv[2]
makeAdmin(email)
