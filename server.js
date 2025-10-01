// server.js
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'feedback.db');

const app = express();

// Middleware
app.use(helmet());
app.use(cors()); // adjust origin in production
app.use(express.json({ limit: '10kb' })); // parse JSON bodies
app.use(morgan('tiny'));

// Serve static PDFs from /pdfs
const pdfsFolder = path.join(__dirname, 'pdfs');
app.use('/pdfs', express.static(pdfsFolder, {
  // setCacheControl: true by default; adjust options if needed
}));

// --- Database setup (sqlite3 with promisified helpers) ---
const db = new sqlite3.Database(DB_PATH);
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

async function initDb() {
  // Create feedback table if it doesn't exist
  // id: integer primary key autoincrement
  // name, email optional, message required, rating optional integer 1-5, created_at timestamp
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      message TEXT NOT NULL,
      rating INTEGER,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await dbRun(createTableSql);
}

initDb().catch(err => {
  console.error('Failed to initialize DB:', err);
  process.exit(1);
});

// --- Helper validation ---
function validateFeedback(payload) {
  // payload: { name, email, message, rating, metadata }
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
    const message = String(payload.message).trim();
    const rating = payload.rating !== undefined ? Number(payload.rating) : null;
    // metadata can hold any additional JSON the client wants to attach (stringified)
    const metadata = payload.metadata ? JSON.stringify(payload.metadata) : null;

    const insertSql = `INSERT INTO feedback (name, email, message, rating, metadata) VALUES (?, ?, ?, ?, ?)`;
    const result = await dbRun(insertSql, [name, email, message, rating, metadata]);

    // sqlite3's run doesn't return lastID when promisified, so fetch last row via "last_insert_rowid()"
    const row = await dbGet('SELECT last_insert_rowid() AS id');
    const insertedId = row ? row.id : null;

    const feedback = await dbGet('SELECT * FROM feedback WHERE id = ?', insertedId);

    res.status(201).json({ success: true, feedback });
  } catch (err) {
    console.error('POST /api/feedback error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// List feedback (optionally ?limit= & ?offset=)
app.get('/api/feedback', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '100', 10) || 100, 1000);
    const offset = Math.max(parseInt(req.query.offset || '0', 10) || 0, 0);

    const rows = await dbAll(
      `SELECT id, name, email, message, rating, metadata, created_at
       FROM feedback
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // try to parse metadata JSON for each row
    const parsed = rows.map(r => {
      let meta = null;
      try { meta = r.metadata ? JSON.parse(r.metadata) : null; } catch (e) { meta = r.metadata; }
      return { ...r, metadata: meta };
    });

    res.json({ count: parsed.length, feedback: parsed });
  } catch (err) {
    console.error('GET /api/feedback error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Get single feedback by id
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
    try { meta = row.metadata ? JSON.parse(row.metadata) : null; } catch (e) { meta = row.metadata; }
    row.metadata = meta;

    res.json({ feedback: row });
  } catch (err) {
    console.error('GET /api/feedback/:id error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Simple delete endpoint (optional) - remove by id
app.delete('/api/feedback/:id', async (req, res) => {
  try {
    // NOTE: in production you should protect this route (auth)
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid_id' });

    const info = await dbRun('DELETE FROM feedback WHERE id = ?', [id]);
    // sqlite's run returns this but promisified may not; check if row exists:
    const row = await dbGet('SELECT COUNT(1) AS cnt FROM feedback WHERE id = ?', [id]);
    if (row && row.cnt === 0) {
      // was deleted (or didn't exist)
      return res.json({ success: true });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/feedback/:id error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Fallback 404 for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// Serve a simple index for root that explains routes (optional)
app.get('/', (req, res) => {
  res.type('text/plain').send(
`Feedback API
- POST /api/feedback    { name?, email?, message*, rating? (1-5), metadata? }
- GET  /api/feedback    list recent feedback
- GET  /api/feedback/:id
- Static PDFs served at /pdfs/<filename>.pdf
`
  );
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'internal_server_error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`PDFs served from: ${pdfsFolder} -> http://localhost:${PORT}/pdfs/<file.pdf>`);
});
