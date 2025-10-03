const express = require("express");
const path = require("path");
const { ObjectId } = require("mongodb");
const { connectDB } = require("./db");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // Serve static files

// POST /api/feedback — Create feedback
app.post("/api/feedback", async (req, res) => {
    try {
        const { name, email, company, message, rating } = req.body;
        if (!message) return res.status(400).json({ error: "Message is required" });

        const coll = await connectDB();
        const result = await coll.insertOne({
            name,
            email,
            company,
            message,
            rating: rating ? Number(rating) : null,
            created_at: new Date(),
        });

        res.status(201).json({ success: true, id: result.insertedId });
    } catch (err) {
        console.error("POST /api/feedback error:", err);
        res.status(500).json({ error: "internal_server_error" });
    }
});

// GET /api/admin/feedback — List all feedback
app.get("/api/admin/feedback", async (req, res) => {
    try {
        const coll = await connectDB();
        const feedback = await coll.find().sort({ created_at: -1 }).toArray();
        res.json(feedback);
    } catch (err) {
        console.error("GET /api/admin/feedback error:", err);
        res.status(500).json({ error: "internal_server_error" });
    }
});

// DELETE /api/admin/feedback/:id — Delete feedback
app.delete("/api/admin/feedback/:id", async (req, res) => {
    try {
        const coll = await connectDB();
        const id = req.params.id;

        if (!ObjectId.isValid(id)) return res.status(400).json({ error: "invalid_id" });

        const result = await coll.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "not_found" });
        }

        res.json({ success: true });
    } catch (err) {
        console.error("DELETE /api/admin/feedback/:id error:", err);
        res.status(500).json({ error: "internal_server_error" });
    }
});

// Fallback for frontend routes
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
