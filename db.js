// db.js
const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = process.env.MONGO_URI; // set in App Platform / .env
if (!uri) {
  throw new Error("❌ MONGO_URI environment variable not set");
}

let client;
let db;

async function connectDB() {
  if (db) return db;

  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true
    }
  });

  await client.connect();
  console.log("✅ Connected to MongoDB Atlas");

  db = client.db("feedback"); // your DB name
  return db;
}

module.exports = connectDB;
