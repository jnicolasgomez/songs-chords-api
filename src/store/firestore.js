// firestore.mjs
import { getFirestore } from "firebase-admin/firestore";
import { chunkArray } from "../utils/array.js";

let db;

/**
 * Connects to Firestore using Firebase Admin SDK.
 */
export async function connect() {
  if (!db) {
    const dbId = process.env.FIRESTORE_DATABASE_ID || "(default)";
    db = getFirestore(dbId);
    console.log(`Connecting to Firestore database ${dbId}...`);
    console.log("Connected to db Firestore using Firebase Admin SDK");
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
  await connect();
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
  await connect();
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
  await connect();
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
  await connect();
  let response = [];
  try {
    response = await query(collection, [["user_id", "==", userId]]);
  } catch (err) {
    console.error(err);
  }
  return response;
}

/**
 * Gets a single document by UserId.
 * @param {string} collection - The collection name.
 * @param {string} uderId - The user ID.
 * @returns {Promise<object|null>} - The document data or null if not found.
 */
export async function byIdsArray(collection, idsArray) {
  await connect();
  let response = [];
  try {
    response = await queryLargeDocumentIdArray(collection, idsArray);
  } catch (err) {
    console.error(err);
  }
  return response;
}

async function queryLargeDocumentIdArray(collection, ids) {
  const idChunks = chunkArray(ids, 10); // Split into chunks of 10
  const results = [];

  for (const chunk of idChunks) {
    const docs = await query(collection, [["__name__", "in", chunk]]);
    results.push(...docs);
  }

  return results;
}

/**
 * Creates or updates a document.
 * @param {string} collection - The collection name.
 * @param {string} id - The document ID.
 * @param {object} data - The document data.
 * @returns {Promise<void>}
 */
export async function upsert(collection, data) {
  await connect();
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
  await connect();
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

/**
 * Creates a new batch object.
 * @returns {object} - A Firestore batch object.
 */
export async function batch() {
  await connect();
  if (!db) throw new Error("Not connected to Firestore");
  return db.batch();
}

export function collection(collection) {
  return db.collection(collection);
}
