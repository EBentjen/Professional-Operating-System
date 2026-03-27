import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'work-os.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  // Ensure data directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);
  seedDefaults(db);

  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS weeks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL UNIQUE,
      week_end TEXT NOT NULL,
      theme TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stakeholders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      title TEXT,
      tier TEXT DEFAULT 'secondary' CHECK(tier IN ('primary', 'secondary')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS priorities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_id INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      outcome TEXT NOT NULL,
      why_it_matters TEXT NOT NULL DEFAULT '',
      status TEXT DEFAULT 'not_started' CHECK(status IN ('not_started','in_progress','blocked','done')),
      impact TEXT DEFAULT 'high' CHECK(impact IN ('high','medium','low')),
      deadline TEXT,
      blocked_reason TEXT,
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS priority_stakeholders (
      priority_id INTEGER NOT NULL REFERENCES priorities(id) ON DELETE CASCADE,
      stakeholder_id INTEGER NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
      relationship TEXT,
      PRIMARY KEY (priority_id, stakeholder_id)
    );

    CREATE TABLE IF NOT EXISTS deliverables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      priority_id INTEGER NOT NULL REFERENCES priorities(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      due_date TEXT,
      status TEXT DEFAULT 'not_started' CHECK(status IN ('not_started','in_progress','blocked','done')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS follow_ups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      priority_id INTEGER REFERENCES priorities(id) ON DELETE SET NULL,
      stakeholder_id INTEGER REFERENCES stakeholders(id) ON DELETE SET NULL,
      description TEXT NOT NULL,
      due_date TEXT,
      is_complete INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_focus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      focus_date TEXT NOT NULL,
      priority_id INTEGER REFERENCES priorities(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      notes TEXT,
      is_complete INTEGER DEFAULT 0,
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      priority_id INTEGER REFERENCES priorities(id) ON DELETE SET NULL,
      week_id INTEGER REFERENCES weeks(id) ON DELETE SET NULL,
      key_question TEXT NOT NULL,
      takeaway TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      executive_summary TEXT,
      talking_points TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS weekly_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_id INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE UNIQUE,
      accomplished TEXT NOT NULL DEFAULT '',
      slipped TEXT NOT NULL DEFAULT '',
      time_analysis TEXT NOT NULL DEFAULT '',
      patterns TEXT NOT NULL DEFAULT '',
      next_week_focus TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function seedDefaults(db: Database.Database) {
  // Seed default stakeholders if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM stakeholders').get() as { c: number };
  if (count.c > 0) return;

  const insertStakeholder = db.prepare(
    'INSERT INTO stakeholders (name, title, tier) VALUES (?, ?, ?)'
  );
  insertStakeholder.run('CEO', 'Chief Executive Officer', 'primary');
  insertStakeholder.run('CFO', 'Chief Financial Officer', 'primary');
  insertStakeholder.run('VP Finance', 'VP of Finance', 'primary');
  insertStakeholder.run('Board', 'Board of Directors', 'primary');
  insertStakeholder.run('VP Sales', 'VP of Sales', 'secondary');
  insertStakeholder.run('VP Engineering', 'VP of Engineering', 'secondary');
}

export default getDb;
