// server.js
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const path = require("path");
const { ObjectId } = require("mongodb");
const connectDB = require("./db");

const app = express();
const PORT = process.env.PORT || 8080;

app.set('trust proxy', 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Login endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const db = await connectDB();
    const users = db.collection("users");
    
    const user = await users.findOne({ username });
    
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.userId = user._id;
    req.session.username = user.username;
    
    res.json({ success: true, message: "Logged in successfully" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Logout endpoint
app.post("/api/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Check auth status
app.get("/api/auth/check", (req, res) => {
  if (req.session && req.session.userId) {
    res.json({ authenticated: true, username: req.session.username });
  } else {
    res.json({ authenticated: false });
  }
});

// Create feedback (public)
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
    console.error("Error inserting feedback:", err);
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

// Get all feedback (protected)
app.get("/api/feedback", requireAuth, async (req, res) => {
  try {
    const db = await connectDB();
    const feedback = db.collection("BSI");

    const items = await feedback
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    
    res.json(items);
  } catch (err) {
    console.error("Error fetching feedback:", err);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

// Delete feedback (protected)
app.delete("/api/feedback/:id", requireAuth, async (req, res) => {
  try {
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

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting feedback:", err);
    res.status(500).json({ error: "Failed to delete feedback" });
  }
});

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Serve login page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Serve admin page (will check auth client-side)
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});