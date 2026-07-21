import { getFirestore } from './firebase-admin.js'

async function checkIkra() {
  const db = getFirestore()
  const doc = await db.collection('heroes').doc('ikra').get()
  if (doc.exists) {
    console.log(JSON.stringify(doc.data(), null, 2))
  } else {
    console.log('Ikra not found in heroes collection.')
  }
}

checkIkra().catch(console.error)
