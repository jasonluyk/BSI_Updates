// db.js
const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("❌ MONGO_URI environment variable not set");
  throw new Error("MONGO_URI environment variable not set");
}

let client;
let db;
let isConnecting = false;

async function connectDB() {
  // Return existing connection if available
  if (db) {
    return db;
  }

  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return connectDB();
  }

  isConnecting = true;

  try {
    console.log("🔄 Connecting to MongoDB Atlas...");
    
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
      },
      // SSL/TLS Configuration
      ssl: true,
      tls: true,
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false,
      
      // Connection pool settings
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      
      // Timeout settings
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      serverSelectionTimeoutMS: 30000,
      
      // Retry settings
      retryWrites: true,
      retryReads: true,
      
      // Additional options
      w: 'majority',
      journal: true,
      
      // Compression
      compressors: ['zlib']
    });

    await client.connect();
    
    // Verify connection with ping
    await client.db("admin").command({ ping: 1 });
    
    console.log("✅ Successfully connected to MongoDB Atlas");

    db = client.db("feedback");
    isConnecting = false;
    return db;
    
  } catch (error) {
    isConnecting = false;
    console.error("❌ MongoDB connection error:", error.name);
    console.error("❌ Error message:", error.message);
    
    // Provide specific error messages
    if (error.message.includes('bad auth')) {
      console.error("❌ Authentication failed - check username/password in MONGO_URI");
    } else if (error.message.includes('ENOTFOUND')) {
      console.error("❌ Could not resolve MongoDB hostname - check MONGO_URI format");
    } else if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
      console.error("❌ Connection timeout - check MongoDB Atlas IP whitelist");
    } else if (error.message.includes('SSL') || error.message.includes('TLS')) {
      console.error("❌ SSL/TLS error - this may be a MongoDB Atlas certificate issue");
    }
    
    throw error;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (client) {
    console.log('🔄 Closing MongoDB connection...');
    await client.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  }
});

process.on('SIGTERM', async () => {
  if (client) {
    console.log('🔄 Closing MongoDB connection...');
    await client.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  }
});

module.exports = connectDB;