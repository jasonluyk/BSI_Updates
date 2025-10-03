// server.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const { ObjectId } = require("mongodb");
const connectDB = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ✅ Create feedback
app.post("/api/feedback", async (req, res) => {
  try {
    const { name, email, company, message, rating } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const db = await connectDB();
    const feedback = db.collection("BSI");

    const doc = {
      name: name || "Anonymous",
      email: email || "",
      company: company || "",
      message,
      rating: rating ? Number(rating) : null,
      createdAt: new Date()
    };

    const result = await feedback.insertOne(doc);
    res.json({ success: true, id: result.insertedId });
  } catch (err) {
    console.error("❌ Error inserting feedback:", err);
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

// ✅ Get all feedback
app.get("/api/feedback", async (req, res) => {
  try {
    const db = await connectDB();
    const feedback = db.collection("BSI");

    const items = await feedback.find({}).sort({ createdAt: -1 }).toArray();
    res.json(items);
  } catch (err) {
    console.error("❌ Error fetching feedback:", err);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

// ✅ Delete feedback
app.delete("/api/feedback/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const feedback = db.collection("BSI");

    const result = await feedback.deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error deleting feedback:", err);
    res.status(500).json({ error: "Failed to delete feedback" });
  }
});

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
