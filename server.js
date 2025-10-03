// server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const { connectDB, getDB } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // your HTML, JS, CSS

// Connect to DB before starting server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server listening on http://0.0.0.0:${PORT}`);
    });
}).catch(err => {
    console.error("Failed to connect to DB", err);
    process.exit(1);
});

// Routes
app.post("/api/feedback", async (req, res) => {
    try {
        const { name, email, company, message, rating } = req.body;

        if (!message || typeof message !== "string") {
            return res.status(400).json({ error: "Message is required" });
        }

        const feedbackDoc = {
            name: name || null,
            email: email || null,
            company: company || null,
            message: message,
            rating: rating ? Number(rating) : null,
            created_at: new Date()
        };

        const db = getDB();
        const result = await db.collection("BSI").insertOne(feedbackDoc);

        res.status(201).json({ success: true, id: result.insertedId });
    } catch (err) {
        console.error("POST /api/feedback error:", err);
        res.status(500).json({ error: "internal_server_error" });
    }
});

app.get("/api/admin/feedback", async (req, res) => {
    try {
        const db = getDB();
        const feedback = await db.collection("BSI").find({}).sort({ created_at: -1 }).toArray();
        res.json(feedback);
    } catch (err) {
        console.error("GET /api/admin/feedback error:", err);
        res.status(500).json({ error: "internal_server_error" });
    }
});

app.delete("/api/admin/feedback/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();

        const { ObjectId } = require("mongodb");
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: "invalid_id" });
        }

        await db.collection("BSI").deleteOne({ _id: new ObjectId(id) });
        res.json({ success: true });
    } catch (err) {
        console.error("DELETE /api/admin/feedback/:id error:", err);
        res.status(500).json({ error: "internal_server_error" });
    }
});
