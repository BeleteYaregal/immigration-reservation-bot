const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../data/reservations.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and reliability
db.pragma('journal_mode = WAL');

// Initialize database schema
const initSchema = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      queue_code TEXT UNIQUE NOT NULL,
      telegram_id INTEGER NOT NULL,
      username TEXT,
      service_type TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      preferred_date TEXT NOT NULL,
      document_file_id TEXT,
      status TEXT DEFAULT 'PENDING',
      admin_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
    CREATE INDEX IF NOT EXISTS idx_reservations_telegram_id ON reservations(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_reservations_queue_code ON reservations(queue_code);
  `);
};

initSchema();

module.exports = db;
