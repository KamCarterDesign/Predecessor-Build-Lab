import type { NextApiRequest, NextApiResponse } from 'next';
import { getFirestore } from 'firebase-admin/firestore';
import '@/lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { build, authorId, authorName } = req.body;

  if (!build || !build.id) {
    return res.status(400).json({ error: 'Missing build data' });
  }

  try {
    const db = getFirestore();
    const buildRef = db.collection('shared_builds').doc(build.id);
    
    await buildRef.set({
      ...build,
      authorId: authorId || 'anonymous',
      authorName: authorName || 'Anonymous',
      sharedAt: new Date().toISOString(),
      views: 0
    });

    res.status(200).json({ success: true, url: `/builds/${build.id}` });
  } catch (err: any) {
    console.error('Error sharing build:', err);
    res.status(500).json({ error: err.message });
  }
}
