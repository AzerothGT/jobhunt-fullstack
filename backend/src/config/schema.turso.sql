-- Turso (SQLite/libSQL) schema. Source of truth for the hosted database.
-- Init: bun run db:init:turso (requires TURSO_DATABASE_URL + TURSO_AUTH_TOKEN)

CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('job_seeker', 'recruiter')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  recruiter_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title        VARCHAR(200) NOT NULL,
  company      VARCHAR(150) NOT NULL,
  location     VARCHAR(150),
  type         TEXT NOT NULL CHECK (type IN ('full-time', 'part-time', 'contract', 'internship')),
  description  TEXT NOT NULL,
  requirements TEXT,
  salary_min   INTEGER,
  salary_max   INTEGER,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_recruiter ON jobs (recruiter_id);

CREATE TABLE IF NOT EXISTS applications (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id       INTEGER NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  applicant_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  cover_letter TEXT,
  full_name    VARCHAR(100),
  phone        VARCHAR(40),
  email        VARCHAR(150),
  website      VARCHAR(255),
  portfolio_url VARCHAR(255),
  resume_name  VARCHAR(255),
  resume_size  INTEGER,
  resume_mime  VARCHAR(100),
  resume_data  BLOB,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'rejected')),
  applied_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (job_id, applicant_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_applicant ON applications (applicant_id);
