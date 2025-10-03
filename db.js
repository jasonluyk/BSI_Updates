const { MongoClient, ServerApiVersion } = require("mongodb");

let client;
let db;

async function connectDB() {
  if (db) return db;

  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("Missing MONGO_URI environment variable");

  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  await client.connect();
  db = client.db("feedback_db"); // Database name in MongoDB Atlas
  console.log("Connected to MongoDB Atlas");

  return db;
}

module.exports = connectDB;
