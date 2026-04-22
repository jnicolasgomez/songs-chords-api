import { MongoClient, ObjectId} from "mongodb";
import type { Document, Db, Collection, Filter, WithId} from 'mongodb'
import config from "../../config.js";
import { chunkArray } from "../utils/array.ts";
import logger from "../utils/logger.ts";
import { StoreCache } from "./cache.ts";

const uri: string = config.mongoDb.uri;
const client: MongoClient = new MongoClient(uri);
let database: Db | undefined;
const cache = new StoreCache("mongo");

connect();

async function connect(): Promise<void> {
  try {
    await client.connect();
    database = client.db();
    logger.info("Connected to MongoDB Atlas");
  } catch (error) {
    logger.error("Error connecting to MongoDB Atlas", { error: String(error) });
  }
}

async function disconnect(): Promise<void> {
  await client.close();
  logger.info("Disconnected from MongoDB Atlas");
}

async function list<T extends Document = Document>(table: string, fields?: string[]): Promise<T[]> {
  if (!database) {
    throw new Error("Database not connected");
  }
  const cacheKey = `${table}:list:${fields?.join(',') ?? ''}`;
  const cached = cache.get<T[]>(cacheKey);
  if (cached) return cached;

  const collection: Collection<T> = database.collection<T>(table);
  let dbQuery = collection.find({});
  if (fields && fields.length > 0) {
    const projection: Record<string, 1> = {};
    fields.forEach(field => { projection[field] = 1; });
    dbQuery = dbQuery.project(projection);
  }
  const result: WithId<T>[] = await dbQuery.toArray();
  cache.set(cacheKey, result as T[]);
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
  const { _id, ...dataWithoutId } = data as any;
  const result = await collection.replaceOne(filter, dataWithoutId as unknown as T, options);
  cache.invalidate(table);
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
  cache.invalidate(table);
  return result.deletedCount;
}

async function query<T extends Document = Document>(table: string, q: Filter<T>): Promise<T[]> {
  if (!database) {
    throw new Error("Database not connected");
  }
  const cacheKey = `${table}:query:${JSON.stringify(q)}`;
  const cached = cache.get<T[]>(cacheKey);
  if (cached) return cached;

  const collection: Collection<T> = database.collection<T>(table);
  const result: WithId<T>[] = await collection.find(q).toArray();
  cache.set(cacheKey, result as T[]);
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

async function sharedWithUser<T extends Document = Document>(table: string, userId: string): Promise<T[]> {
  return query<T>(table, { shared_with: userId } as unknown as Filter<T>);
}

async function ping(): Promise<boolean> {
  try {
    await client.db().command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

export { connect, disconnect, list, get, upsert, remove, query, byUserId, listPublic, byIdsArray, sharedWithUser, ping };

