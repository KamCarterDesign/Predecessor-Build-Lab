import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  console.warn('Missing NEXT_PUBLIC_FIREBASE_API_KEY. Did you forget to add your environment variables to Vercel?');
}

const app = getApps().length > 0 ? getApp() : initializeApp({
  ...firebaseConfig,
  // Provide a dummy key during server-side build if missing, to prevent build crashes.
  // The client will still need the real key from environment variables.
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'dummy-key-for-build',
});

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
