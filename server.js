// server.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const { ObjectId } = require("mongodb");
const connectDB = require("./db");

const app = express();
const PORT = process.env.PORT || 8080;

// Trust proxy for Digital Ocean App Platform
app.set('trust proxy', 1);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test DB connection endpoint
app.get("/api/test-db", async (req, res) => {
  try {
    const db = await connectDB();
    const collections = await db.listCollections().toArray();
    res.json({ 
      success: true, 
      message: "MongoDB connected",
      database: "feedback",
      collections: collections.map(c => c.name)
    });
  } catch (err) {
    console.error("❌ DB Test Error:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// ✅ Create feedback
app.post("/api/feedback", async (req, res) => {
  try {
    const { name, email, company, message, rating } = req.body;
    
    // Validation
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const db = await connectDB();
    const feedback = db.collection("BSI");

    const doc = {
      name: name || "Anonymous",
      email: email || "",
      company: company || "",
      message: message.trim(),
      rating: rating ? Number(rating) : null,
      createdAt: new Date()
    };

    const result = await feedback.insertOne(doc);
    console.log("✅ Feedback saved:", result.insertedId);
    
    res.status(201).json({ 
      success: true, 
      id: result.insertedId,
      message: "Feedback submitted successfully"
    });
  } catch (err) {
    console.error("❌ Error inserting feedback:", err);
    res.status(500).json({ error: "Failed to save feedback. Please try again." });
  }
});

// ✅ Get all feedback
app.get("/api/feedback", async (req, res) => {
  try {
    const db = await connectDB();
    const feedback = db.collection("BSI");

    const items = await feedback
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log(`📊 Fetched ${items.length} feedback items`);
    res.json(items);
  } catch (err) {
    console.error("❌ Error fetching feedback:", err);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

// ✅ Delete feedback
app.delete("/api/feedback/:id", async (req, res) => {
  try {
    // Validate ObjectId
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid feedback ID" });
    }

    const db = await connectDB();
    const feedback = db.collection("BSI");

    const result = await feedback.deleteOne({ 
      _id: new ObjectId(req.params.id) 
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    console.log(`🗑️ Deleted feedback: ${req.params.id}`);
    res.json({ success: true, message: "Feedback deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting feedback:", err);
    res.status(500).json({ error: "Failed to delete feedback" });
  }
});

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);
  res.status(500).json({ 
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});