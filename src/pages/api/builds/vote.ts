import type { NextApiRequest, NextApiResponse } from 'next';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import '@/lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { buildId, direction, uid } = req.body;

  if (!buildId || !direction || !uid) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const db = getFirestore();
    const buildRef = db.collection('shared_builds').doc(buildId);

    // Simplistic voting logic for prototype
    // In a real app, track the uid in a subcollection to prevent multiple votes
    await buildRef.update({
      score: FieldValue.increment(direction === 'up' ? 1 : -1)
    });

    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error voting on build:', err);
    res.status(500).json({ error: err.message });
  }
}
