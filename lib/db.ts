import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'work-os.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

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

    CREATE TABLE IF NOT EXISTS captures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      tags TEXT DEFAULT '',
      status TEXT DEFAULT 'inbox' CHECK(status IN ('inbox','processed','archived')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      context TEXT DEFAULT '',
      decision TEXT NOT NULL,
      rationale TEXT DEFAULT '',
      alternatives TEXT DEFAULT '',
      stakeholders TEXT DEFAULT '[]',
      outcome TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      date TEXT DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      impact TEXT DEFAULT '',
      metric TEXT DEFAULT '',
      category TEXT DEFAULT 'general' CHECK(category IN ('leadership','financial','operational','strategic','team','general')),
      date TEXT DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS one_on_ones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stakeholder_id INTEGER REFERENCES stakeholders(id) ON DELETE SET NULL,
      stakeholder_name TEXT NOT NULL,
      date TEXT NOT NULL,
      agenda TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      my_commitments TEXT DEFAULT '[]',
      their_commitments TEXT DEFAULT '[]',
      themes TEXT DEFAULT '',
      next_agenda TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS okrs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      quarter TEXT NOT NULL,
      status TEXT DEFAULT 'on_track' CHECK(status IN ('on_track','at_risk','off_track','complete')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS key_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      okr_id INTEGER NOT NULL REFERENCES okrs(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      target TEXT DEFAULT '',
      current_value TEXT DEFAULT '',
      unit TEXT DEFAULT '',
      progress INTEGER DEFAULT 0,
      status TEXT DEFAULT 'on_track' CHECK(status IN ('on_track','at_risk','off_track','complete')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS financial_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      event_type TEXT DEFAULT 'deadline' CHECK(event_type IN ('deadline','meeting','review','report','close')),
      bd_day INTEGER,
      specific_date TEXT,
      recurring TEXT DEFAULT 'monthly' CHECK(recurring IN ('monthly','quarterly','annual','once')),
      notes TEXT DEFAULT '',
      color TEXT DEFAULT 'zinc',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'strategy',
      description TEXT DEFAULT '',
      content TEXT NOT NULL,
      tags TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS learnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      source TEXT DEFAULT '',
      source_type TEXT DEFAULT 'article' CHECK(source_type IN ('book','article','podcast','conversation','course','other')),
      key_takeaway TEXT DEFAULT '',
      action_item TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      date TEXT DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'not_started',
      notes TEXT DEFAULT '',
      stakeholder_id INTEGER REFERENCES stakeholders(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      is_complete INTEGER DEFAULT 0,
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stakeholder_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stakeholder_id INTEGER NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'not_started' CHECK(status IN ('not_started','in_progress','blocked','done')),
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS template_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      filename TEXT NOT NULL,
      category TEXT DEFAULT 'strategy',
      description TEXT DEFAULT '',
      mime_type TEXT DEFAULT 'application/octet-stream',
      file_size INTEGER DEFAULT 0,
      file_data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function seedDefaults(db: Database.Database) {
  // Add relationship column to one_on_ones if it doesn't exist yet
  try {
    db.exec(`ALTER TABLE one_on_ones ADD COLUMN relationship TEXT DEFAULT 'direct_report'`);
  } catch {
    // Column already exists — safe to ignore
  }

  // Add due_date to projects if not present
  try {
    db.exec(`ALTER TABLE projects ADD COLUMN due_date TEXT`);
  } catch { /* already exists */ }

  // Add due_date to project_items if not present
  try {
    db.exec(`ALTER TABLE project_items ADD COLUMN due_date TEXT`);
  } catch { /* already exists */ }

  // Migrate old template categories to new ones
  db.prepare(`UPDATE templates SET category = 'modeling' WHERE category = 'budget'`).run();
  db.prepare(`UPDATE templates SET category = 'strategy' WHERE category IN ('board','communication','meeting','hr','general')`).run();
  db.prepare(`UPDATE template_files SET category = 'modeling' WHERE category = 'budget'`).run();
  db.prepare(`UPDATE template_files SET category = 'strategy' WHERE category IN ('board','communication','meeting','hr','general')`).run();

  const count = db.prepare('SELECT COUNT(*) as c FROM stakeholders').get() as { c: number };
  if (count.c === 0) {
    const ins = db.prepare('INSERT INTO stakeholders (name, title, tier) VALUES (?, ?, ?)');
    ins.run('Dillon Rouse', 'Manager', 'primary');
    ins.run('Kenney Dinh', 'Direct Report', 'secondary');
    ins.run('CEO', 'Chief Executive Officer', 'primary');
    ins.run('CFO', 'Chief Financial Officer', 'primary');
    ins.run('Board', 'Board of Directors', 'primary');
    ins.run('VP Sales', 'VP of Sales', 'secondary');
    ins.run('VP Engineering', 'VP of Engineering', 'secondary');
  } else {
    // Add Kenney Dinh if not already present
    const kenney = db.prepare("SELECT id FROM stakeholders WHERE name = 'Kenney Dinh'").get();
    if (!kenney) {
      db.prepare('INSERT INTO stakeholders (name, title, tier) VALUES (?, ?, ?)').run('Kenney Dinh', 'Direct Report', 'secondary');
    }
  }

  const evCount = db.prepare('SELECT COUNT(*) as c FROM financial_events').get() as { c: number };
  if (evCount.c === 0) {
    const ins = db.prepare('INSERT INTO financial_events (title, event_type, bd_day, recurring, color) VALUES (?, ?, ?, ?, ?)');
    ins.run('Net Revenue Due', 'deadline', 5, 'monthly', 'blue');
    ins.run('S&B Submissions Due', 'deadline', 4, 'monthly', 'violet');
    ins.run('Other OPEX Due', 'deadline', 4, 'monthly', 'amber');
    ins.run('High Levels Ready', 'review', 6, 'monthly', 'emerald');
    ins.run('Flash Financial Report Distributed', 'report', 10, 'monthly', 'sky');
    ins.run('Full Financial Reviews Distributed', 'report', 20, 'monthly', 'indigo');
  }

  // Seed AP Accountant Approval dates
  const apCount = db.prepare("SELECT COUNT(*) as c FROM daily_focus WHERE title = 'AP Accountant Approvals'").get() as { c: number };
  if (apCount.c === 0) {
    const apInsert = db.prepare('INSERT INTO daily_focus (focus_date, title, order_index) VALUES (?, ?, 0)');
    const apDates = [
      '2026-04-01','2026-04-03','2026-04-06','2026-04-24',
      '2026-05-01','2026-05-04','2026-05-06','2026-05-22',
      '2026-06-01','2026-06-04','2026-06-05','2026-06-18',
      '2026-07-01','2026-07-06','2026-07-20','2026-07-27',
      '2026-08-03','2026-08-06','2026-08-07','2026-08-20',
      '2026-09-02','2026-09-04','2026-09-23','2026-09-25',
      '2026-10-02','2026-10-05','2026-10-07','2026-10-19',
      '2026-11-02','2026-11-05','2026-11-19','2026-11-23',
      '2026-12-03','2026-12-07','2026-12-17','2026-12-28',
    ];
    const insertAll = db.transaction(() => { for (const d of apDates) apInsert.run(d, 'AP Accountant Approvals'); });
    insertAll();
  }

  const tCount = db.prepare('SELECT COUNT(*) as c FROM templates').get() as { c: number };
  if (tCount.c === 0) {
    const ins = db.prepare('INSERT INTO templates (title, category, description, content) VALUES (?, ?, ?, ?)');
    ins.run(
      'Board Meeting Prep',
      'strategy',
      'Checklist and narrative structure for board meetings',
      `# Board Meeting Prep

## Pre-Meeting (1 week out)
- [ ] Draft financial narrative (performance vs. plan)
- [ ] Identify 2-3 key messages you want the board to leave with
- [ ] Prepare variance explanations (>5% off plan)
- [ ] Confirm deck is reviewed by CEO

## Financials Section Structure
1. Headline: revenue, EBITDA, cash — vs. plan and prior year
2. Drivers: what caused the variance (top 3)
3. Outlook: updated forecast with confidence level
4. Risks: top 2-3 with mitigation plans

## Questions to Anticipate
- Why did X miss plan?
- What's the path to Y?
- How does this compare to peers?
- What's the biggest risk to the year?

## Day-of Checklist
- [ ] Backup deck on USB + printed copies
- [ ] Arrive 30 min early
- [ ] Know the 3 numbers cold (no looking)
`
    );
    ins.run(
      'Weekly 1:1 with Boss',
      'strategy',
      'Standing agenda for weekly manager check-in',
      `# Weekly 1:1 Agenda

## My Updates (5 min)
- Top priority this week and status
- One thing I need from them
- One thing I want them to know

## Open Items / Follow-ups
- [ ] Item from last week
- [ ] Pending decision needed

## Strategic Topics
- Topic 1
- Topic 2

## My Asks
- Decision needed on:
- Visibility/air cover needed for:
- Feedback requested on:
`
    );
    ins.run(
      'Month-End Close Communication',
      'strategy',
      'Template for distributing month-end results',
      `# [Month] Financial Results — [YYYY]

**To:** Leadership Team
**From:** Finance

## Headline
[One sentence: beat/missed plan by X, driven by Y]

## Key Metrics
| Metric | Actual | Plan | Variance | Prior Year |
|--------|--------|------|----------|------------|
| Revenue | | | | |
| Gross Margin | | | | |
| EBITDA | | | | |

## What Drove Performance
**Positive:**
-

**Negative:**
-

## Updated Outlook
[One paragraph on revised FY forecast and confidence level]

## Actions / Decisions Needed
1.
`
    );
  }
}

export default getDb;
