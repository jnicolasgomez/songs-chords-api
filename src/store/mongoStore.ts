import { MongoClient, Db, Collection } from "mongodb";
import config from "@config";  
import { IUpsertData } from "@/interfaces/mongoStore";  


const uri: string = config.mongoDb.uri;  
const client: MongoClient = new MongoClient(uri)
let database: Db | null = null;
connect();
async function connect(): Promise<void> {
  try {
    await client.connect();
    database = client.db();
    console.log("Connected to MongoDB Atlas");
  } catch (error) {
    console.error("Error connecting to MongoDB Atlas:", error);
  }
}

async function disconnect() {
  await client.close();
  console.log("Disconnected from MongoDB Atlas");
}

async function list(table: string): Promise<any[]> {
  if (!database) {
    throw new Error("Database connection is not established.");
  }

  const collection: Collection = database.collection(table);
  const result = await collection.find({}).toArray();
  return result;
}

async function get(table: string, id: string | number) {
  if (!database) {
    throw new Error("Database connection is not established.");
  }
  const collection: Collection = database.collection(table);
  const result = await collection.findOne({ id: id });
  return result;
}

async function upsert(table: string, data: IUpsertData) {
  if (!database) {
    throw new Error("Database connection is not established.");
  }
  const collection: Collection = database.collection(table);
  const filter = { id: data.id };
  const options = { upsert: true };
  const result = await collection.replaceOne(filter, data, options);
  return result.modifiedCount || result.upsertedCount;
}

async function remove(table: string, id: string | number) {
  if (!database) {
    throw new Error("Database connection is not established.");
  }

  const collection = database.collection(table);
  const result = await collection.deleteOne({ _id: id });
  return result.deletedCount;
}

async function query(table: string, q: any) {
  if (!database) {
    throw new Error("Database connection is not established.");
  }

  const collection: Collection = database.collection(table);
  const result = await collection.find(q).toArray();
  return result;
}

export { connect, disconnect, list, get, upsert, remove, query };
