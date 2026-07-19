const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
});

const db = getFirestore();

async function main() {
  const snap = await db.collection('items').get();
  console.log('Total items:', snap.docs.length);
  for (const doc of snap.docs) {
    const data = doc.data();
    const stats = data.stats || {};
    for (const key of Object.keys(stats)) {
      if (key.includes('crit') || key.includes('chance')) {
        console.log(`Item: ${data.name} (${data.display_name}) -> stat key: "${key}" = ${stats[key]}`);
      }
    }
  }
}

main().catch(console.error);
