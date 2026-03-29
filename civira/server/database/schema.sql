CREATE DATABASE IF NOT EXISTS civira_db;
USE civira_db;

CREATE TABLE IF NOT EXISTS organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_name VARCHAR(120) NOT NULL,
  account_code VARCHAR(30) UNIQUE NOT NULL,
  email VARCHAR(190) NOT NULL,
  supervisor_name VARCHAR(120),
  supervisor_email VARCHAR(190),
  supervisor_phone VARCHAR(20),
  organization_logo_file_name VARCHAR(255),
  organization_logo_mime_type VARCHAR(120),
  organization_logo_blob LONGBLOB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organization table migrations
SET @org_email_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizations' AND COLUMN_NAME = 'email'
);
SET @org_email_sql = IF(
  @org_email_exists = 0,
  'ALTER TABLE organizations ADD COLUMN email VARCHAR(190)',
  'SELECT 1'
);
PREPARE org_email_stmt FROM @org_email_sql;
EXECUTE org_email_stmt;
DEALLOCATE PREPARE org_email_stmt;

SET @org_supervisor_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizations' AND COLUMN_NAME = 'supervisor_name'
);
SET @org_supervisor_sql = IF(
  @org_supervisor_exists = 0,
  'ALTER TABLE organizations ADD COLUMN supervisor_name VARCHAR(120), ADD COLUMN supervisor_email VARCHAR(190), ADD COLUMN supervisor_phone VARCHAR(20)',
  'SELECT 1'
);
PREPARE org_supervisor_stmt FROM @org_supervisor_sql;
EXECUTE org_supervisor_stmt;
DEALLOCATE PREPARE org_supervisor_stmt;

SET @org_logo_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizations' AND COLUMN_NAME = 'organization_logo_file_name'
);
SET @org_logo_sql = IF(
  @org_logo_exists = 0,
  'ALTER TABLE organizations ADD COLUMN organization_logo_file_name VARCHAR(255), ADD COLUMN organization_logo_mime_type VARCHAR(120), ADD COLUMN organization_logo_blob LONGBLOB',
  'SELECT 1'
);
PREPARE org_logo_stmt FROM @org_logo_sql;
EXECUTE org_logo_stmt;
DEALLOCATE PREPARE org_logo_stmt;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  user_code VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'panelist') NOT NULL DEFAULT 'panelist',
  profile_bio TEXT,
  experience_text TEXT,
  skills JSON,
  cv_file_name VARCHAR(255),
  cv_mime_type VARCHAR(120),
  cv_blob LONGBLOB,
  profile_photo_file_name VARCHAR(255),
  profile_photo_mime_type VARCHAR(120),
  profile_photo_blob LONGBLOB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

SET @users_profile_photo_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_photo_file_name'
);
SET @users_profile_photo_sql = IF(
  @users_profile_photo_exists = 0,
  'ALTER TABLE users ADD COLUMN profile_photo_file_name VARCHAR(255), ADD COLUMN profile_photo_mime_type VARCHAR(120), ADD COLUMN profile_photo_blob LONGBLOB',
  'SELECT 1'
);
PREPARE users_profile_photo_stmt FROM @users_profile_photo_sql;
EXECUTE users_profile_photo_stmt;
DEALLOCATE PREPARE users_profile_photo_stmt;

SET @users_profile_bio_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_bio'
);
SET @users_profile_bio_sql = IF(
  @users_profile_bio_exists = 0,
  'ALTER TABLE users ADD COLUMN profile_bio TEXT',
  'SELECT 1'
);
PREPARE users_profile_bio_stmt FROM @users_profile_bio_sql;
EXECUTE users_profile_bio_stmt;
DEALLOCATE PREPARE users_profile_bio_stmt;

SET @users_experience_text_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'experience_text'
);
SET @users_experience_text_sql = IF(
  @users_experience_text_exists = 0,
  'ALTER TABLE users ADD COLUMN experience_text TEXT',
  'SELECT 1'
);
PREPARE users_experience_text_stmt FROM @users_experience_text_sql;
EXECUTE users_experience_text_stmt;
DEALLOCATE PREPARE users_experience_text_stmt;

SET @users_skills_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'skills'
);
SET @users_skills_sql = IF(
  @users_skills_exists = 0,
  'ALTER TABLE users ADD COLUMN skills JSON',
  'SELECT 1'
);
PREPARE users_skills_stmt FROM @users_skills_sql;
EXECUTE users_skills_stmt;
DEALLOCATE PREPARE users_skills_stmt;

SET @users_cv_file_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'cv_file_name'
);
SET @users_cv_file_sql = IF(
  @users_cv_file_exists = 0,
  'ALTER TABLE users ADD COLUMN cv_file_name VARCHAR(255)',
  'SELECT 1'
);
PREPARE users_cv_file_stmt FROM @users_cv_file_sql;
EXECUTE users_cv_file_stmt;
DEALLOCATE PREPARE users_cv_file_stmt;

SET @users_cv_mime_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'cv_mime_type'
);
SET @users_cv_mime_sql = IF(
  @users_cv_mime_exists = 0,
  'ALTER TABLE users ADD COLUMN cv_mime_type VARCHAR(120)',
  'SELECT 1'
);
PREPARE users_cv_mime_stmt FROM @users_cv_mime_sql;
EXECUTE users_cv_mime_stmt;
DEALLOCATE PREPARE users_cv_mime_stmt;

SET @users_cv_blob_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'cv_blob'
);
SET @users_cv_blob_sql = IF(
  @users_cv_blob_exists = 0,
  'ALTER TABLE users ADD COLUMN cv_blob LONGBLOB',
  'SELECT 1'
);
PREPARE users_cv_blob_stmt FROM @users_cv_blob_sql;
EXECUTE users_cv_blob_stmt;
DEALLOCATE PREPARE users_cv_blob_stmt;

CREATE TABLE IF NOT EXISTS jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  criteria_keywords JSON NOT NULL,
  application_deadline DATE,
  status ENUM('open', 'closed') DEFAULT 'open',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

SET @jobs_deadline_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'jobs' AND COLUMN_NAME = 'application_deadline'
);
SET @jobs_deadline_sql = IF(
  @jobs_deadline_exists = 0,
  'ALTER TABLE jobs ADD COLUMN application_deadline DATE',
  'SELECT 1'
);
PREPARE jobs_deadline_stmt FROM @jobs_deadline_sql;
EXECUTE jobs_deadline_stmt;
DEALLOCATE PREPARE jobs_deadline_stmt;

CREATE TABLE IF NOT EXISTS applicants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  location VARCHAR(120),
  experience_level ENUM('entry', 'mid', 'senior', 'executive') DEFAULT 'entry',
  skills JSON,
  resume_file_name VARCHAR(255),
  resume_mime_type VARCHAR(120),
  resume_blob LONGBLOB,
  profile_photo_file_name VARCHAR(255),
  profile_photo_mime_type VARCHAR(120),
  profile_photo_blob LONGBLOB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SET @resume_file_name_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applicants' AND COLUMN_NAME = 'resume_file_name'
);
SET @resume_file_name_sql = IF(
  @resume_file_name_exists = 0,
  'ALTER TABLE applicants ADD COLUMN resume_file_name VARCHAR(255)',
  'SELECT 1'
);
PREPARE resume_file_name_stmt FROM @resume_file_name_sql;
EXECUTE resume_file_name_stmt;
DEALLOCATE PREPARE resume_file_name_stmt;

SET @resume_mime_type_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applicants' AND COLUMN_NAME = 'resume_mime_type'
);
SET @resume_mime_type_sql = IF(
  @resume_mime_type_exists = 0,
  'ALTER TABLE applicants ADD COLUMN resume_mime_type VARCHAR(120)',
  'SELECT 1'
);
PREPARE resume_mime_type_stmt FROM @resume_mime_type_sql;
EXECUTE resume_mime_type_stmt;
DEALLOCATE PREPARE resume_mime_type_stmt;

SET @resume_blob_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applicants' AND COLUMN_NAME = 'resume_blob'
);
SET @resume_blob_sql = IF(
  @resume_blob_exists = 0,
  'ALTER TABLE applicants ADD COLUMN resume_blob LONGBLOB',
  'SELECT 1'
);
PREPARE resume_blob_stmt FROM @resume_blob_sql;
EXECUTE resume_blob_stmt;
DEALLOCATE PREPARE resume_blob_stmt;

SET @applicants_profile_photo_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applicants' AND COLUMN_NAME = 'profile_photo_file_name'
);
SET @applicants_profile_photo_sql = IF(
  @applicants_profile_photo_exists = 0,
  'ALTER TABLE applicants ADD COLUMN profile_photo_file_name VARCHAR(255), ADD COLUMN profile_photo_mime_type VARCHAR(120), ADD COLUMN profile_photo_blob LONGBLOB',
  'SELECT 1'
);
PREPARE applicants_profile_photo_stmt FROM @applicants_profile_photo_sql;
EXECUTE applicants_profile_photo_stmt;
DEALLOCATE PREPARE applicants_profile_photo_stmt;

CREATE TABLE IF NOT EXISTS candidates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  applicant_id INT,
  candidate_code VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  qualification_score DECIMAL(5,2) NOT NULL,
  experience_years DECIMAL(5,2) NOT NULL,
  profile_keywords JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (applicant_id) REFERENCES applicants(id)
);

CREATE TABLE IF NOT EXISTS shortlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  candidate_id INT NOT NULL,
  rank_position INT NOT NULL,
  ranking_score DECIMAL(8,3) NOT NULL,
  UNIQUE KEY uniq_shortlist (job_id, candidate_id),
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS panel_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  candidate_id INT NOT NULL,
  panelist_id INT NOT NULL,
  score DECIMAL(6,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_score (candidate_id, panelist_id),
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id),
  FOREIGN KEY (panelist_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT,
  actor_user_id INT,
  action VARCHAR(200) NOT NULL,
  target_type VARCHAR(80),
  target_id INT,
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS verification_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  purpose VARCHAR(80) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_verification_lookup (email, purpose, consumed_at, expires_at)
);

SET @candidates_status_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'candidates' AND COLUMN_NAME = 'application_status'
);
SET @candidates_status_sql = IF(
  @candidates_status_exists = 0,
  "ALTER TABLE candidates ADD COLUMN application_status ENUM('submitted', 'shortlisted', 'not_shortlisted', 'interview_invited', 'interviewed') NOT NULL DEFAULT 'submitted'",
  'SELECT 1'
);
PREPARE candidates_status_stmt FROM @candidates_status_sql;
EXECUTE candidates_status_stmt;
DEALLOCATE PREPARE candidates_status_stmt;

CREATE TABLE IF NOT EXISTS interview_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  organization_id INT NOT NULL,
  interview_date DATE NOT NULL,
  status ENUM('scheduled', 'in_progress', 'completed') NOT NULL DEFAULT 'scheduled',
  random_seed VARCHAR(64),
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  UNIQUE KEY uniq_job_session (job_id),
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS interview_invites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  interview_session_id INT NOT NULL,
  job_id INT NOT NULL,
  candidate_id INT NOT NULL,
  random_order INT NOT NULL,
  invite_status ENUM('pending', 'sent', 'drawn', 'interviewed') NOT NULL DEFAULT 'pending',
  invited_at TIMESTAMP NULL,
  drawn_at TIMESTAMP NULL,
  interviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_session_candidate (interview_session_id, candidate_id),
  UNIQUE KEY uniq_session_order (interview_session_id, random_order),
  FOREIGN KEY (interview_session_id) REFERENCES interview_sessions(id),
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);


SELECT * from civira_db.candidates;
SELECT * from civira_db.applicants;
SELECT * from civira_db.users;
SELECT * from civira_db.jobs;
SELECT * from civira_db.organizations;
SELECT * from civira_db.panel_scores;
SELECT * from civira_db.shortlists;
SELECT * FROM civira_db.audit_logs;

show TABLEs;