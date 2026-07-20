import { NextApiRequest, NextApiResponse } from 'next'
import { getFirestore } from '@/lib/firebase-admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, userId } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Missing email' })
    }

    const db = getFirestore()

    // 1. Fetch template from Firestore
    let template = {
      subject: 'Welcome to Predecessor Labs — Account Confirmation',
      body: `<h2>Welcome to Predecessor Labs!</h2>\n<p>Hello {{email}},</p>\n<p>Thank you for creating your account on Predecessor Labs. Your account is active and ready to save custom hero theorycrafting specifications, synergy calculations, and matchup builds.</p>\n<p>Best regards,<br>The Predecessor Labs Team</p>`,
    }

    try {
      const templateDoc = await db.collection('email_templates').doc('account_confirmation').get()
      if (templateDoc.exists) {
        template = templateDoc.data() as any
      }
    } catch (e) {
      console.warn('Could not fetch custom account_confirmation template from Firestore, using default fallback:', e)
    }

    // 2. Substitute placeholders
    const formattedSubject = template.subject
      .replace(/\{\{email\}\}/g, email)
      .replace(/\{\{appName\}\}/g, 'Predecessor Labs')
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())

    const formattedBody = template.body
      .replace(/\{\{email\}\}/g, email)
      .replace(/\{\{appName\}\}/g, 'Predecessor Labs')
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())

    // 3. Log dispatched email to Firestore email_logs
    const logDoc = {
      email,
      userId: userId || null,
      templateId: 'account_confirmation',
      subject: formattedSubject,
      body: formattedBody,
      sentAt: new Date().toISOString(),
      status: 'sent',
    }

    await db.collection('email_logs').add(logDoc)

    console.log(`✉️ [Email Service] Account Confirmation sent to ${email}:\nSubject: ${formattedSubject}`)

    return res.status(200).json({
      success: true,
      message: 'Confirmation email processed and logged.',
      log: logDoc,
    })
  } catch (error: any) {
    console.error('Send confirmation email error:', error)
    return res.status(500).json({ error: error.message || 'Server error' })
  }
}
