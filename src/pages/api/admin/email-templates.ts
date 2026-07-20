import { NextApiRequest, NextApiResponse } from 'next'
import { getFirestore } from '@/lib/firebase-admin'

const DEFAULT_TEMPLATES = [
  {
    id: 'account_confirmation',
    name: 'Account Confirmation',
    subject: 'Welcome to Predecessor Labs — Account Confirmation',
    body: `<h2>Welcome to Predecessor Labs!</h2>\n<p>Hello {{email}},</p>\n<p>Thank you for creating your account on Predecessor Labs. Your account is active and ready to save custom hero theorycrafting specifications, synergy calculations, and matchup builds.</p>\n<p>Best regards,<br>The Predecessor Labs Team</p>`,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'password_reset',
    name: 'Password Reset Notification',
    subject: 'Predecessor Labs — Password Reset Request',
    body: `<h2>Password Reset Request</h2>\n<p>Hello {{email}},</p>\n<p>We received a request to reset your password. If you requested this change, please follow your email link to proceed.</p>\n<p>If you did not request a password reset, you can safely ignore this notice.</p>`,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'patch_announcement',
    name: 'Patch & Meta Announcement',
    subject: 'Predecessor Labs — New Meta Update & Features',
    body: `<h2>New Patch & Meta Insights!</h2>\n<p>Hello {{email}},</p>\n<p>A new patch has landed! Check out the latest hero win rates, item synergy shifts, and updated build specs on Predecessor Labs.</p>`,
    updatedAt: new Date().toISOString(),
  },
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = getFirestore()

    if (req.method === 'GET') {
      const snap = await db.collection('email_templates').get()

      if (snap.empty) {
        // Seed default email templates
        const batch = db.batch()
        for (const t of DEFAULT_TEMPLATES) {
          const docRef = db.collection('email_templates').doc(t.id)
          batch.set(docRef, t)
        }
        await batch.commit()
        return res.status(200).json({ templates: DEFAULT_TEMPLATES })
      }

      const templates = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }))
      return res.status(200).json({ templates })
    }

    if (req.method === 'POST') {
      const { id, name, subject, body } = req.body

      if (!id || !name || !subject || !body) {
        return res.status(400).json({ error: 'Missing required fields (id, name, subject, body)' })
      }

      const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      const templateData = {
        id: cleanId,
        name,
        subject,
        body,
        updatedAt: new Date().toISOString(),
      }

      await db.collection('email_templates').doc(cleanId).set(templateData, { merge: true })
      return res.status(200).json({ success: true, template: templateData })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Email templates API error:', error)
    return res.status(500).json({ error: error.message || 'Server error' })
  }
}
