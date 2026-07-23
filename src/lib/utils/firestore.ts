/**
 * Firestore serialization utility.
 * Replaces the repeated JSON.parse(JSON.stringify(...)) pattern
 * used across SSR handlers to strip Firestore Timestamp objects.
 */
export function serializeFirestoreData<T = any>(data: T): T {
  return JSON.parse(JSON.stringify(data))
}

/**
 * Serialize an array of Firestore document snapshots into plain objects.
 */
export function serializeDocSnapshots(docs: any[]): any[] {
  return docs.map((doc) => serializeFirestoreData(doc.data()))
}

/**
 * Serialize a single Firestore document snapshot, including its ID.
 */
export function serializeDocWithId(doc: any): any {
  return { id: doc.id, ...serializeFirestoreData(doc.data()) }
}
