// // import { MongoClient, Db, Collection } from "mongodb";
// import config from "../../config";
// // import { IUpsertData } from "@/interfaces/mongoStore";  
// // const uri: string = config.mongoDb.uri;  
// // const client: MongoClient = new MongoClient(uri)
// // let database: Db | null = null;
// // connect();
// // async function connect(): Promise<void> {
// //   try {
// //     await client.connect();
// //     database = client.db();
// //     console.log("Connected to MongoDB Atlas");
// //   } catch (error) {
// //     console.error("Error connecting to MongoDB Atlas:", error);
// //   }
// // }
// // async function disconnect() {
// //   await client.close();
// //   console.log("Disconnected from MongoDB Atlas");
// // }
// // async function list(table: string): Promise<any[]> {
// //   if (!database) {
// //     throw new Error("Database connection is not established.");
// //   }
// //   const collection: Collection = database.collection(table);
// //   const result = await collection.find({}).toArray();
// //   return result;
// // }
// // async function get(table: string, id: string | number) {
// //   if (!database) {
// //     throw new Error("Database connection is not established.");
// //   }
// //   const collection: Collection = database.collection(table);
// //   const result = await collection.findOne({ id: id });
// //   return result;
// // }
// // async function upsert(table: string, data: IUpsertData) {
// //   if (!database) {
// //     throw new Error("Database connection is not established.");
// //   }
// //   const collection: Collection = database.collection(table);
// //   const filter = { id: data.id };
// //   const options = { upsert: true };
// //   const result = await collection.replaceOne(filter, data, options);
// //   return result.modifiedCount || result.upsertedCount;
// // }
// // async function remove(table: string, id: string | number) {
// //   if (!database) {
// //     throw new Error("Database connection is not established.");
// //   }
// //   const collection = database.collection(table);
// //   const result = await collection.deleteOne({ _id: id });
// //   return result.deletedCount;
// // }
// // async function query(table: string, q: any) {
// //   if (!database) {
// //     throw new Error("Database connection is not established.");
// //   }
// //   const collection: Collection = database.collection(table);
// //   const result = await collection.find(q).toArray();
// //   return result;
// // }
// // export { connect, disconnect, list, get, upsert, remove, query };
// import { MongoClient, Db, Collection, ObjectId } from "mongodb";
// import config from "@config";
// import { Song } from "@/songs/components/controller"; // Ensure Song type is imported
// const uri: string = config.mongoDb.uri;
// const client: MongoClient = new MongoClient(uri);
// let database: Db | null = null;
// connect();
// async function connect(): Promise<void> {
//   try {
//     await client.connect();
//     database = client.db();
//     console.log("Connected to MongoDB Atlas");
//   } catch (error) {
//     console.error("Error connecting to MongoDB Atlas:", error);
//   }
// }
// async function disconnect() {
//   await client.close();
//   console.log("Disconnected from MongoDB Atlas");
// }
// // Ensure that all the MongoDB data is mapped to the Song type
// async function list(table: string): Promise<Song[]> {
//   if (!database) {
//     throw new Error("Database connection is not established.");
//   }
//   const collection: Collection = database.collection(table);
//   const result = await collection.find({}).toArray();
//   return result.map(doc => ({
//     id: doc._id.toString(), // Convert ObjectId to string
//     user_uid: doc.user_uid,
//     private: doc.private,
//     // Map other fields as needed
//   }));
// }
// async function get(table: string, id: string | number): Promise<Song | null> {
//   if (!database) {
//     throw new Error("Database connection is not established.");
//   }
//   const collection: Collection = database.collection(table);
//   const result = await collection.findOne({ id: id });
//   if (result) {
//     return {
//       id: result._id.toString(), // Convert ObjectId to string
//       user_uid: result.user_uid,
//       private: result.private,
//       // Map other fields as needed
//     };
//   }
//   return null;
// }
// async function upsert(table: string, data: Song): Promise<void> {
//   if (!database) {
//     throw new Error("Database connection is not established.");
//   }
//   const collection: Collection = database.collection(table);
//   const filter = { id: data.id }; // Use the id directly for filtering
//   const options = { upsert: true };
//   await collection.replaceOne(filter, data, options);
// }
// async function remove(table: string, id: string | number) {
//   if (!database) {
//     throw new Error("Database connection is not established.");
//   }
//   const collection = database.collection(table);
//   const result = await collection.deleteOne({ _id: id });
//   return result.deletedCount;
// }
// async function query(table: string, q: any): Promise<Song[]> {
//   if (!database) {
//     throw new Error("Database connection is not established.");
//   }
//   const collection: Collection = database.collection(table);
//   const result = await collection.find(q).toArray();
//   return result.map(doc => ({
//     id: doc._id.toString(), // Convert ObjectId to string
//     user_uid: doc.user_uid,
//     private: doc.private,
//     // Map other fields as needed
//   }));
// }
// export { connect, disconnect, list, get, upsert, remove, query };
import { MongoClient, ObjectId } from "mongodb";
import config from "../../config";
const uri = config.mongoDb.uri;
const client = new MongoClient(uri);
let database = null;
connect();
async function connect() {
    try {
        await client.connect();
        database = client.db();
        console.log("Connected to MongoDB Atlas");
    }
    catch (error) {
        console.error("Error connecting to MongoDB Atlas:", error);
    }
}
async function disconnect() {
    await client.close();
    console.log("Disconnected from MongoDB Atlas");
}
// Ensure that all the MongoDB data is mapped to the Song type
async function list(table) {
    if (!database) {
        throw new Error("Database connection is not established.");
    }
    const collection = database.collection(table);
    const result = await collection.find({}).toArray();
    return result.map(doc => ({
        id: doc._id.toString(), // Convert ObjectId to string
        user_uid: doc.user_uid,
        private: doc.private,
        // Map other fields as needed
    }));
}
async function get(table, id) {
    if (!database) {
        throw new Error("Database connection is not established.");
    }
    const collection = database.collection(table);
    const result = await collection.findOne({ id: id });
    if (result) {
        return {
            id: result._id.toString(), // Convert ObjectId to string
            user_uid: result.user_uid,
            private: result.private,
            // Map other fields as needed
        };
    }
    return null;
}
async function upsert(table, data) {
    if (!database) {
        throw new Error("Database connection is not established.");
    }
    const collection = database.collection(table);
    const filter = { id: data.id }; // Use the id directly for filtering
    const options = { upsert: true };
    await collection.replaceOne(filter, data, options);
}
async function remove(table, id) {
    if (!database) {
        throw new Error("Database connection is not established.");
    }
    const collection = database.collection(table);
    // Ensure we are using ObjectId for the _id field
    const objectId = typeof id === 'string' || typeof id === 'number' ? new ObjectId(id) : id;
    const result = await collection.deleteOne({ _id: objectId });
    return result.deletedCount;
}
async function query(table, q) {
    if (!database) {
        throw new Error("Database connection is not established.");
    }
    const collection = database.collection(table);
    const result = await collection.find(q).toArray();
    return result.map(doc => ({
        id: doc._id.toString(), // Convert ObjectId to string
        user_uid: doc.user_uid,
        private: doc.private,
        // Map other fields as needed
    }));
}
export { connect, disconnect, list, get, upsert, remove, query };
