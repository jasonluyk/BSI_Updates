require("dotenv").config();
const express = require("express");
const path = require("path");
const connectDB = require("./db.js");
const { ObjectId } = require("mongodb");

const app = express();
app.use(express.json());

// Serve static HTML/CSS/JS
app.use(express.static(path.join(__dirname, "public")));

// =======================
// POST /api/feedback — Save feedback
// =======================
app.post("/api/feedback", async (req, res) => {
  try {
    const db = await connectDB();
    const feedbackCollection = db.collection("BSI");

    const payload = req.body;

    if (!payload.message || typeof payload.message !== "string") {
      return res.status(400).json({ error: "message_required" });
    }

    const feedback = {
      name: payload.name?.trim() || null,
      email: payload.email?.trim() || null,
      company: payload.company?.trim() || null,
      message: payload.message.trim(),
      rating: payload.rating !== undefined && payload.rating !== null ? Number(payload.rating) : null,
      created_at: new Date(),
    };

    const result = await feedbackCollection.insertOne(feedback);
    feedback._id = result.insertedId;

    res.status(201).json({ success: true, feedback });
  } catch (err) {
    console.error("POST /api/feedback error:", err);
    res.status(500).json({ error: "internal_server_error" });
  }
});

// =======================
// GET /api/admin/feedback — Get all feedback
// =======================
app.get("/api/admin/feedback", async (req, res) => {
  try {
    const db = await connectDB();
    const feedbackCollection = db.collection("BSI");

    const feedback = await feedbackCollection.find({}).sort({ created_at: -1 }).toArray();
    res.json(feedback);
  } catch (err) {
    console.error("GET /api/admin/feedback error:", err);
    res.status(500).json({ error: "internal_server_error" });
  }
});

// =======================
// DELETE /api/admin/feedback/:id — Delete one feedback
// =======================
app.delete("/api/admin/feedback/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const feedbackCollection = db.collection("BSI");

    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "invalid_id" });
    }

    const result = await feedbackCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "not_found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/feedback/:id error:", err);
    res.status(500).json({ error: "internal_server_error" });
  }
});

// =======================
// GET / — Serve index.html
// =======================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =======================
// Start Server
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
