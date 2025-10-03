require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // your HTML, CSS, JS

// MongoDB Atlas setup
const uri = process.env.MONGO_URI; // stored in App Platform environment variables
const client = new MongoClient(uri, {
    serverApi: { version: "1" },
});

let collection;

async function connectDB() {
    try {
        await client.connect();
        collection = client.db("feedback").collection("BSI");
        console.log("✅ Connected to MongoDB Atlas");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    }
}

connectDB();

// Routes

// Get all feedback for admin
app.get("/api/admin/feedback", async (req, res) => {
    try {
        const feedback = await collection.find({}).sort({ created_at: -1 }).toArray();
        res.json(feedback);
    } catch (err) {
        console.error("GET /api/admin/feedback error:", err);
        res.status(500).json({ error: "internal_server_error" });
    }
});

// Post new feedback
app.post("/api/feedback", async (req, res) => {
    try {
        const { name, email, company, message, rating } = req.body;

        if (!message || typeof message !== "string" || message.trim() === "") {
            return res.status(400).json({ error: "message_required" });
        }

        const newFeedback = {
            name: name || null,
            email: email || null,
            company: company || null,
            message: message.trim(),
            rating: rating ? Number(rating) : null,
            created_at: new Date(),
        };

        await collection.insertOne(newFeedback);
        res.status(201).json({ success: true });
    } catch (err) {
        console.error("POST /api/feedback error:", err);
        res.status(500).json({ error: "internal_server_error" });
    }
});

// Delete feedback
app.delete("/api/admin/feedback/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const ObjectId = require("mongodb").ObjectId;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: "invalid_id" });
        }

        const result = await collection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "feedback_not_found" });
        }

        res.json({ success: true });
    } catch (err) {
        console.error("DELETE /api/admin/feedback/:id error:", err);
        res.status(500).json({ error: "internal_server_error" });
    }
});

// Fallback route
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`);
});
