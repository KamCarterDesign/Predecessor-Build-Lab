import { db } from '../firebase-client';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';

export interface SavedBuild {
  id: string;
  name: string;
  description: string;
  heroSlug: string;
  heroName: string;
  role: string;
  items: string[];
  crest: string | null;
  eternal: string | null;
  updatedAt: string;
}

export const syncBuildsToCloud = async (uid: string, localBuilds: SavedBuild[]) => {
  try {
    const userBuildsRef = collection(db, 'users', uid, 'builds');
    
    // In a real app, we'd do a two-way sync based on updatedAt.
    // For now, we'll just push local builds to the cloud.
    for (const build of localBuilds) {
      const buildRef = doc(userBuildsRef, build.id);
      await setDoc(buildRef, build, { merge: true });
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
