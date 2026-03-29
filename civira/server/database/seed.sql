USE civira_db;

-- Demo reset block (optional): clears current data so IDs are predictable for demo usage.
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE panel_scores;
TRUNCATE TABLE shortlists;
TRUNCATE TABLE candidates;
TRUNCATE TABLE jobs;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE users;
TRUNCATE TABLE organizations;
TRUNCATE TABLE applicants;
SET FOREIGN_KEY_CHECKS = 1;

-- Organization demo account
INSERT INTO organizations (id, organization_name, account_code, created_at)
VALUES (1, 'Civira Demo Organization', 'ORG-DEMO2026', NOW());

-- 5 users under one organization: 1 admin + 4 panelists (different IDs and passwords)
INSERT INTO users (id, organization_id, user_code, full_name, email, password_hash, role, created_at) VALUES
(1, 1, 'ADM-DEMO01', 'Demo Admin', 'admin@civira.demo', '$2a$10$WeAkdA7Q90TJ9WBpj8F96usXZNGF7HMSGFSSDObuMaOdwy6xtoUtO', 'admin', NOW()),
(2, 1, 'PNL-DEMO01', 'Panelist One', 'panel1@civira.demo', '$2a$10$Z62YP.I914KC2Nzp7auHhejkIEGHckMCPmBkaqSm80fvPWvg9fUBe', 'panelist', NOW()),
(3, 1, 'PNL-DEMO02', 'Panelist Two', 'panel2@civira.demo', '$2a$10$xNXb03ZzyYRRJkSmVd/6dudeVP..GL.bzaTx2plVZVmom3ffReGZu', 'panelist', NOW()),
(4, 1, 'PNL-DEMO03', 'Panelist Three', 'panel3@civira.demo', '$2a$10$Lw5Gc5Yi9qHYgpMb4WkO2.zx0TQ23S83GRfWmtFayFa3.tPZAiG8e', 'panelist', NOW()),
(5, 1, 'PNL-DEMO04', 'Panelist Four', 'panel4@civira.demo', '$2a$10$g9ChaX70QtttALTOjlGtYuUsPvpRFGghO69NtCXAbMNSu6JBVQa96', 'panelist', NOW());

-- Demo job with criteria keywords
INSERT INTO jobs (id, organization_id, title, description, criteria_keywords, application_deadline, status, created_by, created_at)
VALUES
(
  1,
  1,
  'Public Health Data Officer',
  'Coordinate health service datasets, reporting, and compliance analytics.',
  JSON_ARRAY('data analysis', 'public health', 'reporting', 'compliance', 'sql', 'excel'),
  DATE_ADD(CURDATE(), INTERVAL 21 DAY),
  'open',
  1,
  NOW()
);

-- 12 candidates to demonstrate ranking and top 10 shortlist generation
INSERT INTO candidates (id, job_id, candidate_code, full_name, email, qualification_score, experience_years, profile_keywords, created_at) VALUES
(1, 1, 'CND-DM1001', 'Asha N.', 'asha.demo@mail.com', 8.9, 5, JSON_ARRAY('data analysis', 'public health', 'sql', 'excel', 'reporting'), NOW()),
(2, 1, 'CND-DM1002', 'Brian K.', 'brian.demo@mail.com', 8.0, 4, JSON_ARRAY('public health', 'compliance', 'reporting', 'excel'), NOW()),
(3, 1, 'CND-DM1003', 'Clara M.', 'clara.demo@mail.com', 9.2, 6, JSON_ARRAY('data analysis', 'sql', 'python', 'reporting', 'public health'), NOW()),
(4, 1, 'CND-DM1004', 'David O.', 'david.demo@mail.com', 7.6, 3, JSON_ARRAY('excel', 'reporting', 'communications'), NOW()),
(5, 1, 'CND-DM1005', 'Esther P.', 'esther.demo@mail.com', 8.5, 7, JSON_ARRAY('public health', 'compliance', 'sql', 'data analysis'), NOW()),
(6, 1, 'CND-DM1006', 'Faith R.', 'faith.demo@mail.com', 7.8, 5, JSON_ARRAY('excel', 'compliance', 'reporting', 'public health'), NOW()),
(7, 1, 'CND-DM1007', 'George T.', 'george.demo@mail.com', 9.0, 8, JSON_ARRAY('data analysis', 'sql', 'compliance', 'public health', 'reporting'), NOW()),
(8, 1, 'CND-DM1008', 'Hellen U.', 'hellen.demo@mail.com', 8.1, 4, JSON_ARRAY('excel', 'data analysis', 'reporting', 'public health'), NOW()),
(9, 1, 'CND-DM1009', 'Ian V.', 'ian.demo@mail.com', 8.7, 6, JSON_ARRAY('sql', 'data analysis', 'reporting', 'compliance'), NOW()),
(10, 1, 'CND-DM1010', 'Jane W.', 'jane.demo@mail.com', 7.9, 4, JSON_ARRAY('public health', 'excel', 'communications'), NOW()),
(11, 1, 'CND-DM1011', 'Kevin X.', 'kevin.demo@mail.com', 8.6, 5, JSON_ARRAY('sql', 'excel', 'reporting', 'public health', 'compliance'), NOW()),
(12, 1, 'CND-DM1012', 'Linda Y.', 'linda.demo@mail.com', 7.4, 2, JSON_ARRAY('excel', 'admin', 'reporting'), NOW());

-- Stored top 10 shortlist (example snapshot)
INSERT INTO shortlists (id, job_id, candidate_id, rank_position, ranking_score) VALUES
(1, 1, 7, 1, 91.700),
(2, 1, 3, 2, 89.900),
(3, 1, 1, 3, 88.050),
(4, 1, 5, 4, 86.950),
(5, 1, 9, 5, 84.650),
(6, 1, 11, 6, 83.900),
(7, 1, 2, 7, 81.550),
(8, 1, 8, 8, 79.600),
(9, 1, 6, 9, 78.900),
(10, 1, 4, 10, 75.400);

-- Independent panel scores by 4 panelists; highest aggregate should be candidate 7 in this sample
INSERT INTO panel_scores (job_id, candidate_id, panelist_id, score, notes, created_at) VALUES
(1, 7, 2, 92, 'Strong fit', NOW()),
(1, 7, 3, 90, 'Excellent analytics', NOW()),
(1, 7, 4, 94, 'Great leadership', NOW()),
(1, 7, 5, 91, 'High confidence', NOW()),

(1, 3, 2, 89, 'Good match', NOW()),
(1, 3, 3, 88, 'Strong technical profile', NOW()),
(1, 3, 4, 90, 'Very good', NOW()),
(1, 3, 5, 87, 'Consistent performance', NOW()),

(1, 1, 2, 86, 'Good shortlist candidate', NOW()),
(1, 1, 3, 87, 'Solid interview', NOW()),
(1, 1, 4, 85, 'Meets criteria', NOW()),
(1, 1, 5, 84, 'Reliable', NOW());

-- Demo applicant accounts for self-service registration testing
INSERT INTO applicants (id, full_name, email, password_hash, phone, location, experience_level, skills, created_at) VALUES
(1, 'Demo Applicant', 'demo.applicant@civira.demo', '$2a$10$vvhwRTsdaidjX8avDLBm5OsV5tzpvw7cAEPw/4nuXrwWUb9t7f0qy', '555-0001', 'New York, NY', 'entry', JSON_ARRAY('data analysis', 'excel', 'reporting'), NOW()),
(2, 'Senior Applicant', 'demo.senior@civira.demo', '$2a$10$vvhwRTsdaidjX8avDLBm5OsV5tzpvw7cAEPw/4nuXrwWUb9t7f0qy', '555-0002', 'San Francisco, CA', 'senior', JSON_ARRAY('sql', 'data analysis', 'public health', 'compliance'), NOW());

-- Audit records for demonstration
INSERT INTO audit_logs (organization_id, actor_user_id, action, target_type, target_id, details, created_at) VALUES
(1, 1, 'ORGANIZATION_REGISTERED', 'organization', 1, JSON_OBJECT('seed', true), NOW()),
(1, 1, 'JOB_CREATED', 'job', 1, JSON_OBJECT('title', 'Public Health Data Officer'), NOW()),
(1, 1, 'CANDIDATES_SHORTLISTED', 'job', 1, JSON_OBJECT('shortlistedCount', 10), NOW());

-- Demo login credentials:
-- Organization users:
-- admin@civira.demo  / Admin@123
-- panel1@civira.demo / Panel1@123
-- panel2@civira.demo / Panel2@123
-- panel3@civira.demo / Panel3@123
-- panel4@civira.demo / Panel4@123
-- Applicant accounts:
-- demo.applicant@civira.demo / appli@123 (Entry level)
-- demo.senior@civira.demo     / appli@123 (Senior level)
