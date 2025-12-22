import { MongoClient, ObjectId} from "mongodb";
import type { Document, Db, Collection, Filter, WithId} from 'mongodb'
import config from "../../config.js";
import { chunkArray } from "../utils/array.js";

const uri: string = config.mongoDb.uri;
const client: MongoClient = new MongoClient(uri);
let database: Db | undefined;

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

async function disconnect(): Promise<void> {
  await client.close();
  console.log("Disconnected from MongoDB Atlas");
}

async function list<T extends Document = Document>(table: string, fields?: string[]): Promise<T[]> {
  if (!database) {
    throw new Error("Database not connected");
  }
  const collection: Collection<T> = database.collection<T>(table);
  let query = collection.find({});
  if (fields && fields.length > 0) {
    const projection: Record<string, 1> = {};
    fields.forEach(field => {
      projection[field] = 1;
    });
    query = query.project(projection);
  }
  const result: WithId<T>[] = await query.toArray();
  return result as T[];
}

async function get<T extends Document = Document>(table: string, id: string, fields?: string[]): Promise<T | null> {
  if (!database) {
    throw new Error("Database not connected");
  }
  const collection: Collection<T> = database.collection<T>(table);
  const filter = { id: id } as unknown as Filter<T>;
  let options: { projection?: Record<string, 1> } = {};
  if (fields && fields.length > 0) {
    const projection: Record<string, 1> = {};
    fields.forEach(field => {
      projection[field] = 1;
    });
    options.projection = projection;
  }
  const result: WithId<T> | null = await collection.findOne(filter, options);
  return result as T | null;
}

async function upsert<T extends Document = Document>(table: string, data: T & { id: string }): Promise<{id: string}> {
  if (!database) {
    throw new Error("Database not connected");
  }
  const collection: Collection<T> = database.collection<T>(table);
  const filter: Filter<T> = { id: data.id } as unknown as Filter<T>;
  const options = { upsert: true };
  const result = await collection.replaceOne(filter, data, options);
  return { id: data.id };
}

async function remove(table: string, id: string): Promise<number> {
  if (!database) {
    throw new Error("Database not connected");
  }
  const collection = database.collection(table);
  // Try to convert string id to ObjectId if it's a valid ObjectId format
  const filter = ObjectId.isValid(id) && id.length === 24
    ? { _id: new ObjectId(id) }
    : { _id: id as unknown as ObjectId };
  const result = await collection.deleteOne(filter);
  return result.deletedCount;
}

async function query<T extends Document = Document>(table: string, q: Filter<T>): Promise<T[]> {
  if (!database) {
    throw new Error("Database not connected");
  }
  const collection: Collection<T> = database.collection<T>(table);
  const result: WithId<T>[] = await collection.find(q).toArray();
  return result as T[];
}

async function byUserId<T extends Document = Document>(table: string, userId: string): Promise<T[]> {
  if (!database) {
    throw new Error("Database not connected");
  }
  const collection: Collection<T> = database.collection<T>(table);
  const result: WithId<T>[] = await collection.find({ user_id: userId } as unknown as Filter<T>).toArray();
  return result as T[];
}

async function listPublic<T extends Document = Document>(table: string, fields?: string[]): Promise<T[]> {
  if (!database) {
    throw new Error("Database not connected");
  }
  const collection: Collection<T> = database.collection<T>(table);
  let query = collection.find({ 
    $or: [
      { public: "true" },
      { public: true },
      { public: null },
      { public: { $exists: false } }
    ]
  } as unknown as Filter<T>);
  if (fields && fields.length > 0) {
    const projection: Record<string, 1> = {};
    fields.forEach(field => {
      projection[field] = 1;
    });
    query = query.project(projection);
  }
  const result: WithId<T>[] = await query.toArray();
  return result as T[];
}

async function byIdsArray<T extends Document = Document>(table: string, idsArray: string[], fields?: string[]): Promise<T[]> {
  if (!database) {
    throw new Error("Database not connected");
  }
  const collection: Collection<T> = database.collection<T>(table);
  
  // MongoDB has a limit of 1000 items in $in queries, so we chunk if needed
  const idChunks = chunkArray(idsArray, 1000);
  const results: T[] = [];
  
  for (const chunk of idChunks) {
    let query = collection.find({ id: { $in: chunk } } as unknown as Filter<T>);
    if (fields && fields.length > 0) {
      const projection: Record<string, 1> = {};
      fields.forEach(field => {
        projection[field] = 1;
      });
      query = query.project(projection);
    }
    const chunkResults: WithId<T>[] = await query.toArray();
    results.push(...(chunkResults as T[]));
  }
  
  return results;
}

export { connect, disconnect, list, get, upsert, remove, query, byUserId, listPublic, byIdsArray };

