-- Schema database Jobhunt.
-- Import: mysql -u root -p < backend/database/schema.sql

CREATE DATABASE IF NOT EXISTS jobhunt_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE jobhunt_db;

CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role       ENUM('job_seeker', 'recruiter') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS jobs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  recruiter_id INT NOT NULL,
  title        VARCHAR(200) NOT NULL,
  company      VARCHAR(150) NOT NULL,
  location     VARCHAR(150),
  type         ENUM('full-time', 'part-time', 'contract', 'internship') NOT NULL,
  description  TEXT NOT NULL,
  requirements TEXT,
  salary_min   INT,
  salary_max   INT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_jobs_recruiter FOREIGN KEY (recruiter_id) REFERENCES users (id) ON DELETE CASCADE,
  INDEX idx_jobs_recruiter (recruiter_id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS applications (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  job_id       INT NOT NULL,
  applicant_id INT NOT NULL,
  cover_letter TEXT,
  status       ENUM('pending', 'reviewed', 'rejected') NOT NULL DEFAULT 'pending',
  applied_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_applications_job FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE,
  CONSTRAINT fk_applications_applicant FOREIGN KEY (applicant_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT uq_applications_job_applicant UNIQUE (job_id, applicant_id),
  INDEX idx_applications_applicant (applicant_id)
) ENGINE = InnoDB;
