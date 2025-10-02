// server.js
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const fetch = require("node-fetch");

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'feedback.db');

const app = express();

// Middleware
app.use(helmet());
app.use(cors()); // adjust origin in production
app.use(express.json({ limit: '10kb' })); // parse JSON bodies
app.use(morgan('tiny'));


app.use(express.static(path.join(__dirname, 'public')));
// Serve static PDFs from /pdfs
const pdfsFolder = path.join(__dirname, 'pdfs');
app.use('/pdfs', express.static(pdfsFolder));

// --- Database setup (sqlite3 with promisified helpers) ---
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
  console.error('Failed to initialize DB:', err);
  process.exit(1);
});

// --- Helper validation ---
function validateFeedback(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') {
    errors.push('Invalid payload');
    return errors;
  }
  if (!payload.message || typeof payload.message !== 'string' || payload.message.trim().length < 3) {
    errors.push('message is required and must be at least 3 characters');
  }
  if (payload.name && (typeof payload.name !== 'string' || payload.name.length > 100)) {
    errors.push('name must be a string up to 100 chars');
  }
  if (payload.email && (typeof payload.email !== 'string' || payload.email.length > 254)) {
    errors.push('email must be a string up to 254 chars');
  }
  if (payload.rating !== undefined && payload.rating !== null) {
    const r = Number(payload.rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      errors.push('rating must be an integer between 1 and 5');
    }
  }
  return errors;
}

// --- API Endpoints ---

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Submit feedback
app.post('/api/feedback', async (req, res) => {
  try {
    const payload = req.body;
    const errors = validateFeedback(payload);
    if (errors.length) return res.status(400).json({ errors });

    const name = payload.name ? String(payload.name).trim() : null;
    const email = payload.email ? String(payload.email).trim() : null;
    const company = payload.company ? String(payload.company).trim() : null;  // ✅ capture company
    const message = String(payload.message).trim();
    const rating = payload.rating !== undefined ? Number(payload.rating) : null;
    const metadata = payload.metadata ? JSON.stringify(payload.metadata) : null;

    const insertSql = `
      INSERT INTO feedback (name, email, company, message, rating, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await dbRun(insertSql, [name, email, company, message, rating, metadata]);

    const row = await dbGet('SELECT last_insert_rowid() AS id');
    const insertedId = row ? row.id : null;

    const feedback = await dbGet('SELECT * FROM feedback WHERE id = ?', insertedId);

    res.status(201).json({ success: true, feedback });
  } catch (err) {
    console.error('POST /api/feedback error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});


// List feedback
app.post("/api/feedback", async (req, res) => {
    const { message } = req.body;

    if (!message) return res.status(400).json({ error: "Message required" });

    try {
        const response = await fetch(`http://${process.env.DROPLET_IP}:3001/feedback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });

        if (!response.ok) throw new Error("Failed to store feedback");

        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get single feedback
app.get('/api/feedback/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid_id' });

    const row = await dbGet(
      `SELECT id, name, email, message, rating, metadata, created_at FROM feedback WHERE id = ?`,
      [id]
    );
    if (!row) return res.status(404).json({ error: 'not_found' });

    let meta = null;
    try { meta = row.metadata ? JSON.parse(row.metadata) : null; } catch { meta = row.metadata; }
    row.metadata = meta;

    res.json({ feedback: row });
  } catch (err) {
    console.error('GET /api/feedback/:id error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Delete feedback (optional)
app.delete('/api/feedback/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid_id' });

    await dbRun('DELETE FROM feedback WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/feedback/:id error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Admin: get all feedback (same as GET /api/feedback but at /api/admin/feedback)
app.get('/api/admin/feedback', async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT id, name, email, message, rating, metadata, created_at
       FROM feedback
       ORDER BY created_at DESC, id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/admin/feedback error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Admin: delete feedback
app.delete('/api/admin/feedback/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid_id' });
    }

    await dbRun('DELETE FROM feedback WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/feedback/:id error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});



// ✅ Fixed: catch-all for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// Root info
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'internal_server_error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
