require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const bodyParser = require("body-parser");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public"))); // your HTML, CSS, JS files

// MongoDB Setup
const uri = process.env.MONGO_URI; // store MongoDB URI in environment variable
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
    }
});

let collection;

async function connectDB() {
    try {
        await client.connect();
        const db = client.db("feedback"); // your database name
        collection = db.collection("BSI"); // your collection name
        console.log("Connected to MongoDB Atlas");
    } catch (err) {
        console.error("MongoDB connection error:", err);
    }
}
connectDB();

// API Routes

// Submit feedback
app.post("/api/feedback", async (req, res) => {
    try {
        const { name, email, company, message, rating } = req.body;
        if (!message) return res.status(400).json({ error: "Message is required" });

        const feedback = {
            name: name || null,
            email: email || null,
            company: company || null,
            message,
            rating: rating ? Number(rating) : null,
            created_at: new Date()
        };

        const result = await collection.insertOne(feedback);
        res.json({ success: true, id: result.insertedId });
    } catch (err) {
        console.error("POST /api/feedback error:", err);
        res.status(500).json({ error: "internal_server_error" });
    }
});

// Get all feedback (admin)
app.get("/api/admin/feedback", async (req, res) => {
    try {
        const feedbackList = await collection.find({}).sort({ created_at: -1 }).toArray();
        res.json(feedbackList);
    } catch (err) {
        console.error("GET /api/admin/feedback error:", err);
        res.status(500).json({ error: "internal_server_error" });
    }
});

// Delete feedback
app.delete("/api/admin/feedback/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) return res.status(400).json({ error: "invalid_id" });

        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).json({ error: "not_found" });

        res.json({ success: true });
    } catch (err) {
        console.error("DELETE /api/admin/feedback/:id error:", err);
        res.status(500).json({ error: "internal_server_error" });
    }
});

// Serve HTML files
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));
app.get("/thankyou.html", (req, res) => res.sendFile(path.join(__dirname, "public", "thankyou.html")));

app.listen(PORT, () => console.log(`Server listening on http://0.0.0.0:${PORT}`));
