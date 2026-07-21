import { db } from '../firebase-client'
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore'

export interface SavedPost {
  id: string
  title: string
  slug: string
  summary: string
  category: string
  tags: string[]
  author: string
  heroId?: string
  itemId?: string
  createdAt: string
  savedAt: string
}

export const FREE_POST_LIMIT = 25
export const PREMIUM_POST_LIMIT = 100

export const saveCloudPost = async (uid: string, post: SavedPost) => {
  try {
    const postRef = doc(db, 'users', uid, 'saved_posts', post.id)
    const cleanedPost = JSON.parse(JSON.stringify(post))
    await setDoc(postRef, cleanedPost, { merge: true })
  } catch (error) {
    console.error('Error saving cloud post:', error)
  }
}

export const syncPostsToCloud = async (uid: string, localPosts: SavedPost[], maxLimit: number = FREE_POST_LIMIT) => {
  try {
    const userPostsRef = collection(db, 'users', uid, 'saved_posts')
    const postsToSync = localPosts.slice(0, maxLimit)
    for (const post of postsToSync) {
      const postRef = doc(userPostsRef, post.id)
      const cleanedPost = JSON.parse(JSON.stringify(post))
      await setDoc(postRef, cleanedPost, { merge: true })
    }
  } catch (error) {
    console.error('Error syncing posts to cloud:', error)
  }
}

export const fetchCloudPosts = async (uid: string): Promise<SavedPost[]> => {
  try {
    const userPostsRef = collection(db, 'users', uid, 'saved_posts')
    const q = query(userPostsRef, orderBy('savedAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => d.data() as SavedPost)
  } catch (error) {
    console.error('Error fetching cloud posts:', error)
    return []
  }
}

export const deleteCloudPost = async (uid: string, postId: string) => {
  try {
    await deleteDoc(doc(db, 'users', uid, 'saved_posts', postId))
  } catch (error) {
    console.error('Error deleting cloud post:', error)
  }
}
