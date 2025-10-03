// db.js
const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGO_URI;

if (!uri) {
    console.error("❌ MONGO_URI is missing in .env");
    process.exit(1);
}

const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

let db;

async function connectDB() {
    try {
        await client.connect();
        console.log("✅ Connected to MongoDB Atlas");
        db = client.db("feedback"); // <-- your DB name
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
    }
}

function getDB() {
    if (!db) {
        throw new Error("Database not initialized");
    }
    return db;
}

module.exports = { connectDB, getDB };
