// firestore.mjs
import { getFirestore } from "firebase-admin/firestore";

let db;
/**
 * Connects to Firestore using Firebase Admin SDK.
 */
export async function connect() {
  if (!db) {
    db = getFirestore();
    console.log("Connected to Firestore using Firebase Admin SDK");
  }
}

/**
 * Disconnects from Firestore by cleaning up resources.
 */
export async function disconnect() {
  db = null;
  console.log("Disconnected from Firestore");
}

/**
 * Lists all documents in a collection.
 * @param {string} collection - The collection name.
 * @returns {Promise<object[]>} - A list of documents.
 */
export async function list(collection) {
  if (!db) throw new Error("Not connected to Firestore");
  const snapshot = await db.collection(collection).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Gets a single document by ID.
 * @param {string} collection - The collection name.
 * @param {string} id - The document ID.
 * @returns {Promise<object|null>} - The document data or null if not found.
 */
export async function get(collection, id) {
  if (!db) throw new Error("Not connected to Firestore");
  const doc = await db.collection(collection).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

/**
 * Creates or updates a document.
 * @param {string} collection - The collection name.
 * @param {string} id - The document ID.
 * @param {object} data - The document data.
 * @returns {Promise<void>}
 */
export async function upsert(collection, id, data) {
  if (!db) throw new Error("Not connected to Firestore");
  await db.collection(collection).doc(id).set(data, { merge: true });
  console.log(`Document ${id} upserted in ${collection}`);
}

/**
 * Removes a document by ID.
 * @param {string} collection - The collection name.
 * @param {string} id - The document ID.
 * @returns {Promise<void>}
 */
export async function remove(collection, id) {
  if (!db) throw new Error("Not connected to Firestore");
  await db.collection(collection).doc(id).delete();
  console.log(`Document ${id} removed from ${collection}`);
}

/**
 * Queries documents in a collection.
 * @param {string} collection - The collection name.
 * @param {Array} conditions - An array of query conditions. Each condition is an array: [field, operator, value].
 * @returns {Promise<object[]>} - A list of matching documents.
 */
export async function query(collection, conditions) {
  if (!db) throw new Error("Not connected to Firestore");
  let queryRef = db.collection(collection);
  for (const [field, operator, value] of conditions) {
    queryRef = queryRef.where(field, operator, value);
  }
  const snapshot = await queryRef.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
