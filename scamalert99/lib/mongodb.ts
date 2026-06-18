import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "scamshield_ai";

type MongoCache = {
  client?: MongoClient;
  promise?: Promise<MongoClient>;
};

declare global {
  var mongoCache: MongoCache | undefined;
}

const cache = globalThis.mongoCache ?? {};
globalThis.mongoCache = cache;

export async function getMongoClient(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (cache.client) {
    return cache.client;
  }

  if (!cache.promise) {
    cache.promise = new MongoClient(uri, {
      appName: "ScamShield AI"
    }).connect();
  }

  cache.client = await cache.promise;
  return cache.client;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbName);
}
