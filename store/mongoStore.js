import { MongoClient } from 'mongodb';
import config from '../config.js';

const uri = config.mongoDb.uri;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
let database;
connect();
async function connect() {
  try {
    await client.connect();
    database = client.db();
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('Error connecting to MongoDB Atlas:', error);
  }
}

async function disconnect() {
  await client.close();
  console.log('Disconnected from MongoDB Atlas');
}

async function list(table) {
  
  const collection = database.collection(table);
  const result = await collection.find({}).toArray();
  return result;
}

async function get(table, id) {
  const collection = database.collection(table);
  const result = await collection.findOne({ id: id });
  return result;
}

async function upsert(table, data) {
  const collection = database.collection(table);
  const filter = { id: data.id };
  const options = { upsert: true };
  const result = await collection.replaceOne(filter, data, options);
  return result.modifiedCount || result.upsertedCount;
}

async function remove(table, id) {
  const collection = database.collection(table);
  const result = await collection.deleteOne({ _id: id });
  return result.deletedCount;
}

async function query(table, q) {
  const collection = database.collection(table);
  const result = await collection.find(q).toArray();
  return result;
}

export {
  connect,
  disconnect,
  list,
  get,
  upsert,
  remove,
  query,
};
