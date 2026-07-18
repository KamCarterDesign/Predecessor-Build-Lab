import { initializeApp, cert, getApp, getApps, App } from 'firebase-admin/app'
import { getFirestore as firestore } from 'firebase-admin/firestore'
import { getStorage as storage } from 'firebase-admin/storage'

let app: App

export function getFirebaseAdmin(): App {
  if (app) return app

  if (getApps().length > 0) {
    app = getApp()
    return app
  }

  if (!process.env.FIREBASE_PROJECT_ID) {
    throw new Error(
      'Missing Firebase credentials.'
    )
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  })

  return app
}

export function getFirestore() {
  getFirebaseAdmin()
  return firestore()
}

export function getStorage() {
  getFirebaseAdmin()
  return storage()
}
