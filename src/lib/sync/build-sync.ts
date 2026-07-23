import { db } from '../firebase-client';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';

export interface SavedBuild {
  id: string;
  name: string;
  description: string;
  heroSlug: string;
  heroName: string;
  role: string;
  level?: number;
  items: string[];
  crest: string | null;
  eternal: string | null;
  augment?: string | null;
  gold?: number;
  
  // Hero B specs if duel build:
  heroBSlug?: string;
  heroBName?: string;
  roleB?: string;
  levelB?: number;
  itemsB?: string[];
  crestB?: string | null;
  eternalB?: string | null;
  augmentB?: string | null;
  goldB?: number;
  totalGold?: number;

  createdAt?: string;
  updatedAt: string;
}

export const FREE_BUILD_LIMIT = 25;
export const PREMIUM_BUILD_LIMIT = 100;

export const saveCloudBuild = async (uid: string, build: SavedBuild) => {
  try {
    const buildRef = doc(db, 'users', uid, 'builds', build.id);
    // Sanitize object to remove undefined values for Firestore
    const cleanedBuild = JSON.parse(JSON.stringify(build));
    await setDoc(buildRef, cleanedBuild, { merge: true });
  } catch (error) {
    console.error('Error saving cloud build:', error);
  }
};

export const syncBuildsToCloud = async (uid: string, localBuilds: SavedBuild[], maxLimit: number = FREE_BUILD_LIMIT) => {
  try {
    const userBuildsRef = collection(db, 'users', uid, 'builds');
    const buildsToSync = localBuilds.slice(0, maxLimit);
    for (const build of buildsToSync) {
      const buildRef = doc(userBuildsRef, build.id);
      const cleanedBuild = JSON.parse(JSON.stringify(build));
      await setDoc(buildRef, cleanedBuild, { merge: true });
    }
  } catch (error) {
    console.error('Error syncing builds to cloud:', error);
  }
};

export const fetchCloudBuilds = async (uid: string): Promise<SavedBuild[]> => {
  try {
    const userBuildsRef = collection(db, 'users', uid, 'builds');
    const q = query(userBuildsRef, orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as SavedBuild);
  } catch (error) {
    console.error('Error fetching cloud builds:', error);
    return [];
  }
};

export const deleteCloudBuild = async (uid: string, buildId: string) => {
  try {
    await deleteDoc(doc(db, 'users', uid, 'builds', buildId));
  } catch (error) {
    console.error('Error deleting cloud build:', error);
  }
};

