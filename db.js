// db.js
const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = process.env.MONGO_URI;
if (!uri) {
  throw new Error("❌ MONGO_URI environment variable not set");
}

let client;
let db;

async function connectDB() {
  if (db) return db;

  try {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
      },
      // Add these options to fix SSL issues
      tls: true,
      tlsAllowInvalidCertificates: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      retryWrites: true,
      retryReads: true
    });

    await client.connect();
    
    // Ping to verify connection
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB Atlas");

    db = client.db("feedback");
    return db;
    
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  }
});

module.exports = connectDB;