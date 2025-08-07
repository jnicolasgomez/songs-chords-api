// firestore.ts
import { getFirestore, Query, WriteBatch, CollectionReference } from "firebase-admin/firestore";
import type { Firestore, DocumentData, WhereFilterOp } from '@google-cloud/firestore';
import { chunkArray } from "../utils/array.js";
import type { Song } from "../songs/types/types.js";

let db: Firestore | null = null;

/**
 * Connects to Firestore using Firebase Admin SDK.
 */
export async function connect(): Promise<void> {
  if (!db) {
    const dbId = process.env.FIRESTORE_DATABASE_ID || "(default)";
    db = getFirestore(dbId);
    console.log("Connected to db Firestore using Firebase Admin SDK");
  }
}

/**
 * Disconnects from Firestore by cleaning up resources.
 */
export async function disconnect(): Promise<void> {
  db = null;
  console.log("Disconnected from Firestore");
}

/**
 * Lists all documents in a collection.
 * @param {string} collection - The collection name.
 * @returns {Promise<Song[]>} - A list of documents.
 */
export async function list(collection: string): Promise<Song[]> {
  await connect();
  let response: Song[] = [];
  try {
    const snapshot = await db!.collection(collection).get();
    response = snapshot.docs.map((doc) => {
      return { id: doc.id, ...doc.data() } as Song;
    });
  } catch (err) {
    console.error(err);
  }
  return response;
}

/**
 * Lists all documents in a collection.
 * @param {string} collection - The collection name.
 * @returns {Promise<DocumentData[]>} - A list of documents.
 */
export async function listPublic(collection: string): Promise<Song[]> {
  await connect();
  let response: Song[] = [];
  try {
    response = await query(collection, [
      ["public", "in", ["true", true, null]],
    ]);

  } catch (err) {
    console.error(err);
  }
  return response;
}

/**
 * Gets a single document by ID.
 * @param {string} collection - The collection name.
 * @param {string} id - The document ID.
 * @returns {Promise<Song|null>} - The document data or null if not found.
 */
export async function get(collection: string, id: string): Promise<Song | null> {
  await connect();
  const doc = await db!.collection(collection).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } as Song: null;
}

/**
 * Gets documents by UserId.
 * @param {string} collection - The collection name.
 * @param {string} userId - The user ID.
 * @returns {Promise<Song[]>} - The document data array.
 */
export async function byUserId(collection: string, userId: string): Promise<Song[]> {
  await connect();
  let response: DocumentData[] = [];
  try {
    response = await query(collection, [["user_id", "==", userId]]);
  } catch (err) {
    console.error(err);
  }
  return response as Song[];
}

/**
 * Gets documents by array of IDs.
 * @param {string} collection - The collection name.
 * @param {string[]} idsArray - Array of document IDs.
 * @returns {Promise<Song[]>} - The document data array.
 */
export async function byIdsArray(collection: string, idsArray: string[]): Promise<Song[]> {
  await connect();
  let response: Song[] = [];
  try {
    response = await queryLargeDocumentIdArray(collection, idsArray);
  } catch (err) {
    console.error(err);
  }
  return response;
}

async function queryLargeDocumentIdArray(collection: string, ids: string[]): Promise<Song[]> {
  const idChunks = chunkArray(ids, 10); // Split into chunks of 10
  const results: Song[] = [];

  for (const chunk of idChunks) {
    const docs = await query(collection, [["__name__", "in", chunk]]);
    results.push(...docs);
  }

  return results;
}

/**
 * Creates or updates a document.
 * @param {string} collection - The collection name.
 * @param {Song} data - The document data.
 * @returns {Promise<{id: string}>}
 */
export async function upsert(collection: string, data: Song): Promise<{id: string}> {
  await connect();
  if (!data.id) {
    const docRef = await db!.collection(collection).add({
      ...data,
      id: null // temporary null value that will be updated
    });
    // Update the document with its ID
    await docRef.update({ id: docRef.id });
    console.log(`Document ${docRef.id} created in ${collection}`);
    return { id: docRef.id };
  }
  await db!.collection(collection).doc(data.id).set({
    ...data,
    id: data.id
  }, { merge: true });
  console.log(`Document ${data.id} upserted in ${collection}`);
  return { id: data.id };
}

/**
 * Removes a document by ID.
 * @param {string} collection - The collection name.
 * @param {string} id - The document ID.
 * @returns {Promise<void>}
 */
export async function remove(collection: string, id: string): Promise<void> {
  await connect();
  await db!.collection(collection).doc(id).delete();
  console.log(`Document ${id} removed from ${collection}`);
}

type QueryCondition = [string, string, any];

/**
 * Queries documents in a collection.
 * @param {string} collection - The collection name.
 * @param {QueryCondition[]} conditions - An array of query conditions. Each condition is an array: [field, operator, value].
 * @returns {Promise<Song[]>} - A list of matching documents.
 */
export async function query(collection: string, conditions: QueryCondition[]): Promise<Song[]> {
  if (!db) throw new Error("Not connected to Firestore");
  const query = buildQuery(db, collection, conditions);
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => {
    return { id: doc.id, ...doc.data() } as Song;
  });
}

/**
 * Builds a Firestore query with dynamic conditions.
 * @param {Firestore} db - Firestore database instance.
 * @param {string} collection - The collection name.
 * @param {QueryCondition[]} conditions - An array of conditions. Each condition is an array: [field, operator, value].
 * @returns {Query} - A Firestore query object.
 */
function buildQuery(db: Firestore, collection: string, conditions: QueryCondition[]): Query<DocumentData, DocumentData> {
  let queryRef : Query<DocumentData, DocumentData> = db.collection(collection);

  // Apply each condition to the query
  for (const [field, operator, value] of conditions) {
    queryRef = queryRef.where(field, operator as WhereFilterOp, value);
  }
  return queryRef;
}

/**
 * Creates a new batch object.
 * @returns {Promise<WriteBatch>} - A Firestore batch object.
 */
export async function batch(): Promise<WriteBatch> {
  await connect();
  if (!db) throw new Error("Not connected to Firestore");
  return db.batch();
}

export function collection(collectionName: string): CollectionReference<DocumentData> {
  if (!db) throw new Error("Not connected to Firestore");
  return db.collection(collectionName);
}
