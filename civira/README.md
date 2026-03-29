# Civira - Transparent Public Recruitment System

Civira is a hiring platform built with **React.js + Express.js + MySQL**.

## Implemented Features

- Organization can open jobs with keyword-based criteria.
- Applicants can browse open jobs and submit applications without an organization account.
- Applicants can upload PDF, DOCX, or TXT resumes and the system extracts keyword signals from the document.
- Applicants can track application progress using candidate code and email.
- Candidates receive **random anonymous codes**.
- Candidates are ranked using:
  - qualification score,
  - experience years,
  - keyword match against job criteria.
- Top 10 candidates are short-listed per job.
- Each organization supports a maximum of **5 user accounts** (admin + panelists) under one organization account.
- Panelists submit scores independently.
- Final winner is selected based on **highest aggregated panel score**.
- Audit logs are stored for activity tracking.
- JWT authentication secures protected endpoints.
- Credentials can be sent using the free-tier **Resend Email API**.
- CV text can be rated out of 10 using free-tier **Groq AI API** with local fallback.

## Project Structure

- `server/` Express API + MySQL schema
- `client/` React (Vite) frontend

## Backend Setup

1. Create MySQL database and tables:
   - Run `server/database/schema.sql` in MySQL.
2. Configure environment:
   - Copy `server/.env.example` to `server/.env` and fill values.
3. Install packages and run:

```bash
cd server
npm install
npm run dev
```

Backend base URL: `http://localhost:5000/api`

## Demo Seed Data (Quick Start)

If you want a ready-to-test dataset (organization + 5 users + job + candidates + shortlist + scores):

1. Make sure `server/.env` has valid MySQL credentials.
2. Run one command from `server`:

```bash
npm run seed
```

This command runs:
- `database/schema.sql` (creates DB/tables if missing)
- `database/seed.sql` (loads demo organization/users/job/candidates/scores)

The seed file resets existing rows in main tables before inserting demo data.

### Demo Credentials

- `admin@civira.demo` / `Admin@123`
- `panel1@civira.demo` / `Panel1@123`
- `panel2@civira.demo` / `Panel2@123`
- `panel3@civira.demo` / `Panel3@123`
- `panel4@civira.demo` / `Panel4@123`

Use `Job ID = 1` in the frontend forms for shortlist and scoring tests.

## How It Works

1. **Organization account and users**
   - Admin registers the organization.
   - Organization can have up to 5 users (admin + panelists), each with different ID/password.
   - Login returns JWT; protected APIs require `Authorization: Bearer <token>`.

2. **Job creation with criteria**
   - Admin opens a job and provides criteria keywords (for example: `sql`, `compliance`, `public health`).

3. **Candidate intake and anonymization**
   - Candidates are added to a job.
   - System assigns a random `candidate_code` to reduce bias in evaluation.
   - Applicant resume uploads are parsed to enrich the candidate keyword profile before ranking.

4. **Ranking and top-10 shortlist**
   - Ranking formula combines qualification, experience, and keyword match:

$$
\text{FinalScore} = 0.45 \times \text{QualificationScore} + 0.25 \times \text{ExperienceScore} + 0.30 \times \text{KeywordMatchScore}
$$

   - API sorts all candidates by this score and stores only top 10 in `shortlists`.

5. **Independent panel scoring**
   - Each panelist submits score independently for shortlisted candidates.
   - One row per `(candidate, panelist)` is stored in `panel_scores`.

6. **Final selection**
   - System aggregates panel scores (`SUM`) and selects the highest total score as the winner.

7. **Audit trail**
   - Major actions (registration, job creation, shortlist generation, panel scoring, login, applicant submission) are stored in `audit_logs` for traceability.

## Frontend Setup

1. Configure frontend env:
   - Copy `client/.env.example` to `client/.env`.
2. Install packages and run:

```bash
cd client
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Main API Endpoints

### Auth
- `POST /api/auth/register-organization`
- `POST /api/auth/login`
- `POST /api/auth/panelists` (admin only)

### Jobs
- `POST /api/jobs`
- `GET /api/jobs`
- `GET /api/jobs/public`

### Candidates
- `POST /api/candidates`
- `POST /api/candidates/apply`
- `POST /api/candidates/track`
- `GET /api/audit` (admin only)

### AI
- `POST /api/ai/rate-cv` (body: `{ cvText, jobKeywords }`)

## Notes

- API controllers include comments explaining what each endpoint does.
- For CV AI rating, set `GROQ_API_KEY` in `server/.env` (free key from Groq console).
- For production, hash strong passwords, use HTTPS, rotate JWT secrets, and validate input with a schema validator.
