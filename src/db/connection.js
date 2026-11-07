const Database = require('better-sqlite3');
const config = require('../config');

const db = new Database(config.DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON'); // RESTRICT is the default, so no cascade deletes

const branches = config.BRANCHES.map((b) => `'${b}'`).join(',');
const statuses = config.STATUSES.map((s) => `'${s}'`).join(',');

db.exec(`
CREATE TABLE IF NOT EXISTS students (
  student_id INTEGER PRIMARY KEY AUTOINCREMENT,
  usn TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  branch TEXT NOT NULL CHECK (branch IN (${branches})),
  cgpa NUMERIC NOT NULL CHECK (cgpa >= 0 AND cgpa <= 10),
  active_backlogs INTEGER NOT NULL DEFAULT 0 CHECK (active_backlogs >= 0),
  cleared_backlogs INTEGER NOT NULL DEFAULT 0 CHECK (cleared_backlogs >= 0),
  has_accepted_offer INTEGER NOT NULL DEFAULT 0   -- derived, deliberate redundancy
);

CREATE TABLE IF NOT EXISTS companies (
  company_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('STUDENT','COMPANY','COORDINATOR')),
  student_id INTEGER REFERENCES students(student_id),
  company_id INTEGER REFERENCES companies(company_id),
  CHECK (
    (role = 'STUDENT'     AND student_id IS NOT NULL AND company_id IS NULL) OR
    (role = 'COMPANY'     AND company_id IS NOT NULL AND student_id IS NULL) OR
    (role = 'COORDINATOR' AND student_id IS NULL     AND company_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS job_listings (
  job_id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(company_id),
  role TEXT NOT NULL,
  season TEXT NOT NULL,
  min_cgpa NUMERIC NOT NULL CHECK (min_cgpa >= 0 AND min_cgpa <= 10),
  max_backlogs INTEGER NOT NULL CHECK (max_backlogs >= 0),
  drive_date TEXT,
  is_open INTEGER NOT NULL DEFAULT 1
);

-- No rows for a job means a pool drive: all branches are eligible.
CREATE TABLE IF NOT EXISTS job_allowed_branches (
  job_id INTEGER NOT NULL REFERENCES job_listings(job_id),
  branch TEXT NOT NULL CHECK (branch IN (${branches})),
  PRIMARY KEY (job_id, branch)
);

CREATE TABLE IF NOT EXISTS applications (
  application_id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(student_id),
  job_id INTEGER NOT NULL REFERENCES job_listings(job_id),
  status TEXT NOT NULL CHECK (status IN (${statuses})),
  applied_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (student_id, job_id)
);

CREATE TABLE IF NOT EXISTS interview_slots (
  slot_id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(application_id),
  round_number INTEGER NOT NULL CHECK (round_number >= 1),
  scheduled_at TEXT NOT NULL,
  venue TEXT NOT NULL,
  passed INTEGER,            -- NULL = result not recorded yet
  notes TEXT,
  UNIQUE (application_id, round_number)
);

CREATE TABLE IF NOT EXISTS offers (
  offer_id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL UNIQUE REFERENCES applications(application_id), -- 1 : 0..1
  package_lpa NUMERIC NOT NULL CHECK (package_lpa > 0),
  offer_letter_key TEXT NOT NULL UNIQUE,   -- unpredictable key into the file store
  is_accepted INTEGER NOT NULL DEFAULT 0   -- derived, deliberate redundancy
);

CREATE TABLE IF NOT EXISTS application_status_history (
  history_id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(application_id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by INTEGER NOT NULL REFERENCES users(user_id),
  changed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS eligibility_decisions (
  decision_id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(student_id),
  job_id INTEGER NOT NULL REFERENCES job_listings(job_id),
  eligible INTEGER NOT NULL,
  reason TEXT NOT NULL,
  failed_codes TEXT NOT NULL,   -- e.g. "R1,R2" or ""
  decided_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS consent_records (
  consent_id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(student_id),
  purpose TEXT NOT NULL,
  granted INTEGER NOT NULL,
  recorded_at TEXT NOT NULL
);
`);

module.exports = db;
