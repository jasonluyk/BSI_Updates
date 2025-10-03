require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

let collection;

async function connectDB() {
    if (!collection) {
        try {
            await client.connect();
            console.log("✅ Connected to MongoDB Atlas");
            const db = client.db("feedback"); // Database name
            collection = db.collection("BSI"); // Collection name
        } catch (err) {
            console.error("❌ MongoDB connection failed:", err);
        }
    }
    return collection;
}

module.exports = { connectDB };
