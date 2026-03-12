CREATE DATABASE IF NOT EXISTS civira_db;
USE civira_db;

CREATE TABLE IF NOT EXISTS organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_name VARCHAR(120) NOT NULL,
  account_code VARCHAR(30) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  user_code VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'panelist') NOT NULL DEFAULT 'panelist',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  criteria_keywords JSON NOT NULL,
  status ENUM('open', 'closed') DEFAULT 'open',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

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