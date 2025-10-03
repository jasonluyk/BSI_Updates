// server.js
const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { promisify } = require("util");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "feedback.db");

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10kb" }));
app.use(morgan("tiny"));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/pdfs", express.static(path.join(__dirname, "pdfs")));

// --- Database setup ---
const db = new sqlite3.Database(DB_PATH);
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

async function initDb() {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      company TEXT,
      message TEXT NOT NULL,
      rating INTEGER,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await dbRun(createTableSql);
  console.log("SQLite DB initialized at:", DB_PATH);
}
initDb().catch(err => {
  console.error("Failed to initialize DB:", err);
  process.exit(1);
});

// --- Validation ---
function validateFeedback(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object") {
    errors.push("Invalid payload");
  }
  if (!payload.message || payload.message.trim().length < 3) {
    errors.push("Message is required (min 3 characters)");
  }
  if (payload.name && payload.name.length > 100) {
    errors.push("Name max length is 100");
  }
  if (payload.email && payload.email.length > 254) {
    errors.push("Email max length is 254");
  }
  if (payload.rating !== undefined && payload.rating !== null) {
    const r = Number(payload.rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      errors.push("Rating must be integer between 1-5");
    }
  }
  return errors;
}

// --- Routes ---

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Submit feedback
app.post("/api/feedback", async (req, res) => {
  try {
    const payload = req.body;
    const errors = validateFeedback(payload);
    if (errors.length) return res.status(400).json({ errors });

    const name = payload.name?.trim() || null;
    const email = payload.email?.trim() || null;
    const company = payload.company?.trim() || null;
    const message = payload.message.trim();
    const rating = payload.rating ? Number(payload.rating) : null;
    const metadata = payload.metadata ? JSON.stringify(payload.metadata) : null;

    const insertSql = `
      INSERT INTO feedback (name, email, company, message, rating, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await dbRun(insertSql, [name, email, company, message, rating, metadata]);

    const row = await dbGet("SELECT last_insert_rowid() AS id");
    const insertedId = row?.id;
    const feedback = await dbGet("SELECT * FROM feedback WHERE id = ?", insertedId);

    return res.status(201).json({ success: true, feedback });
  } catch (err) {
    console.error("POST /api/feedback error:", err);
    res.status(500).json({ error: "internal_server_error" });
  }
});

// Get single feedback
app.get("/api/feedback/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "invalid_id" });

    const row = await dbGet(
      "SELECT id, name, email, message, rating, metadata, created_at FROM feedback WHERE id = ?",
      [id]
    );
    if (!row) return res.status(404).json({ error: "not_found" });

    row.metadata = row.metadata ? JSON.parse(row.metadata) : null;
    res.json({ feedback: row });
  } catch (err) {
    console.error("GET /api/feedback/:id error:", err);
    res.status(500).json({ error: "internal_server_error" });
  }
});

// Admin — list all feedback
app.get("/api/admin/feedback", async (req, res) => {
  try {
    const rows = await dbAll(
      "SELECT id, name, email, message, rating, metadata, created_at FROM feedback ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/admin/feedback error:", err);
    res.status(500).json({ error: "internal_server_error" });
  }
});

// Admin — delete feedback
app.delete("/api/admin/feedback/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "invalid_id" });

    await dbRun("DELETE FROM feedback WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/feedback/:id error:", err);
    res.status(500).json({ error: "internal_server_error" });
  }
});

// Catch-all API 404
app.use("/api", (req, res) => {
  res.status(404).json({ error: "not_found" });
});

// Root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
