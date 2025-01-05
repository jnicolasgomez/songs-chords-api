// firestore.mjs
import { getFirestore } from "firebase-admin/firestore";

let db;
/**
 * Connects to Firestore using Firebase Admin SDK.
 */
export async function connect() {
  if (!db) {
    db = getFirestore(process.env.FIRESTORE_DATABASE_ID);
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
  let response = [];
  try {
    const snapshot = await db.collection(collection).get();
    response = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error(err);
  }
  return response;
}

/**
 * Lists all documents in a collection.
 * @param {string} collection - The collection name.
 * @returns {Promise<object[]>} - A list of documents.
 */
export async function listPublic(collection) {
  if (!db) throw new Error("Not connected to Firestore");
  let response = [];
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
 * @returns {Promise<object|null>} - The document data or null if not found.
 */
export async function get(collection, id) {
  if (!db) throw new Error("Not connected to Firestore");
  const doc = await db.collection(collection).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

/**
 * Gets a single document by UserId.
 * @param {string} collection - The collection name.
 * @param {string} uderId - The user ID.
 * @returns {Promise<object|null>} - The document data or null if not found.
 */
export async function byUserId(collection, userId) {
  if (!db) throw new Error("Not connected to Firestore");
  let response = [];
  try {
    response = await query(collection, [["user_id", "==", userId]]);
  } catch (err) {
    console.error(err);
  }
  return response;
}

/**
 * Creates or updates a document.
 * @param {string} collection - The collection name.
 * @param {string} id - The document ID.
 * @param {object} data - The document data.
 * @returns {Promise<void>}
 */
export async function upsert(collection, data) {
  if (!db) throw new Error("Not connected to Firestore");
  if (!data.id) {
    const docRef = await db.collection(collection).add(data);
    console.log(`Document ${docRef.id} created in ${collection}`);
    return { id: docRef.id };
  }
  await db.collection(collection).doc(data.id).set(data, { merge: true });
  console.log(`Document ${data.id} upserted in ${collection}`);
  return { id: data.id };
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
  const query = buildQuery(db, collection, conditions);
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Builds a Firestore query with dynamic conditions.
 * @param {object} db - Firestore database instance.
 * @param {string} collection - The collection name.
 * @param {Array} conditions - An array of conditions. Each condition is an array: [field, operator, value].
 * @returns {object} - A Firestore query object.
 */
function buildQuery(db, collection, conditions) {
  let queryRef = db.collection(collection);

  // Apply each condition to the query
  for (const [field, operator, value] of conditions) {
    queryRef = queryRef.where(field, operator, value);
  }
  return queryRef;
}
